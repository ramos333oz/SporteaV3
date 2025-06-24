import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DatabaseMatch {
  id: string;
  title: string;
  sport_id: string;
  location_id: string;
  start_time: string;
  end_time: string;
  max_participants: number;
  skill_level: string;
  description: string;
  host_id: string;
  status: string;
  sports: {
    id: string;
    name: string;
  };
  locations: {
    id: string;
    name: string;
    image_url: string;
  };
  current_participants: number;
}

interface RecommendationResult {
  match: DatabaseMatch;
  score: number;
  final_score: number;
  explanation: string;
  direct_preference: {
    score: number;
    breakdown: {
      sports_score: number;
      venue_score: number;
      schedule_score: number;
    };
  };
  collaborative_filtering: {
    score: number;
  };
  activity_based: {
    score: number;
  };
  score_breakdown: {
    direct_preference: number;
    collaborative_filtering: number;
    activity_based: number;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { userId, limit = 10, offset = 0 } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get user preferences and vector
    const { data: userPreferences, error: preferencesError } = await supabaseClient
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (preferencesError) {
      console.error('Error fetching user preferences:', preferencesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user preferences' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get user vector for collaborative filtering
    const { data: userVector, error: vectorError } = await supabaseClient
      .from('users')
      .select('preference_vector')
      .eq('id', userId)
      .single();

    if (vectorError) {
      console.error('Error fetching user vector:', vectorError);
    }

    // Get matches the user has already joined
    const { data: userParticipations, error: participationError } = await supabaseClient
      .from('participants')
      .select('match_id')
      .eq('user_id', userId)
      .in('status', ['confirmed', 'pending']);

    if (participationError) {
      console.error('Error fetching user participations:', participationError);
    }

    const joinedMatchIds = userParticipations?.map((p: any) => p.match_id) || [];

    // Build the query for available matches
    let matchQuery = supabaseClient
      .from('matches')
      .select(`
        id,
        title,
        sport_id,
        location_id,
        start_time,
        end_time,
        max_participants,
        skill_level,
        description,
        host_id,
        status,
        sports:sport_id (
          id,
          name
        ),
        locations:location_id (
          id,
          name,
          image_url
        )
      `)
      .eq('status', 'upcoming')
      .neq('host_id', userId) // Don't recommend user's own matches
      .gte('start_time', new Date().toISOString());

    // Only add the joined matches filter if there are joined matches
    if (joinedMatchIds.length > 0) {
      matchQuery = matchQuery.not('id', 'in', `(${joinedMatchIds.join(',')})`);
    }

    const { data: matches, error: matchesError } = await matchQuery
      .order('start_time', { ascending: true })
      .limit(50); // Get more matches to filter from

    if (matchesError) {
      console.error('Error fetching matches:', matchesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch matches' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!matches || matches.length === 0) {
      return new Response(
        JSON.stringify({ 
          recommendations: [], 
          count: 0, 
          algorithm: 'complete-combined-recommendations' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get participant counts for each match
    const matchIds = matches.map((m: any) => m.id);
    const { data: participantCounts, error: participantError } = await supabaseClient
      .from('participants')
      .select('match_id')
      .in('match_id', matchIds)
      .eq('status', 'confirmed');

    if (participantError) {
      console.error('Error fetching participant counts:', participantError);
    }

    // Count participants per match
    const participantCountMap = new Map();
    if (participantCounts) {
      participantCounts.forEach((p: any) => {
        const count = participantCountMap.get(p.match_id) || 0;
        participantCountMap.set(p.match_id, count + 1);
      });
    }

    // Add participant counts to matches
    const matchesWithParticipants: DatabaseMatch[] = matches.map((match: any) => ({
      ...match,
      current_participants: participantCountMap.get(match.id) || 0
    }));

    // Calculate recommendations using the 45/35/20 weighting system
    const recommendations: RecommendationResult[] = [];

    for (const match of matchesWithParticipants) {
      // 1. Direct Preference Matching (35% weight)
      let directPreferenceScore = 0;

      // Sport preference - check if user has this sport in their sport_preferences
      const userSports = userPreferences.sport_preferences?.map((sport: any) => sport.name) || [];
      const matchSportName = match.sports?.name;
      if (matchSportName && userSports.includes(matchSportName)) {
        directPreferenceScore += 0.4;
      }

      // Location preference - check if user has this location in their location_preferences
      if (userPreferences.location_preferences?.includes(match.location_id)) {
        directPreferenceScore += 0.3;
      }

      // Time preference - check available days and hours
      const matchDate = new Date(match.start_time);
      const matchDay = matchDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const matchHour = matchDate.getHours();

      // Check if user is available on this day
      const userAvailableDays = userPreferences.time_preferences?.days || [];
      let timeScore = 0;
      if (userAvailableDays.includes(matchDay)) {
        timeScore += 0.2; // Base score for day availability

        // Check if user has specific hour preferences
        const userAvailableHours = userPreferences.time_preferences?.hours || [];
        if (userAvailableHours.length === 0 || userAvailableHours.includes(matchHour)) {
          timeScore += 0.1; // Additional score for hour availability
        }
      }
      directPreferenceScore += timeScore;

      // 2. Vector Embedding Collaborative Filtering (45% weight)
      let collaborativeScore = 0.5; // Default score if no vector available

      if (userVector?.preference_vector) {
        try {
          // Find similar users using vector similarity (cosine distance)
          const { data: similarUsers, error: similarUsersError } = await supabaseClient
            .from('users')
            .select('id, preference_vector')
            .neq('id', userId)
            .not('preference_vector', 'is', null)
            .order('preference_vector <=> ' + JSON.stringify(userVector.preference_vector))
            .limit(10); // Get top 10 similar users

          if (!similarUsersError && similarUsers && similarUsers.length > 0) {
            // Get match interactions from similar users (participants who joined matches)
            const similarUserIds = similarUsers.map((u: any) => u.id);
            const { data: similarUserInteractions, error: interactionsError } = await supabaseClient
              .from('participants')
              .select('user_id, match_id, status')
              .in('user_id', similarUserIds)
              .eq('status', 'confirmed')
              .eq('match_id', match.id);

            if (!interactionsError && similarUserInteractions) {
              // Calculate collaborative score based on similar users' interactions
              const interactionCount = similarUserInteractions.length;
              const totalSimilarUsers = similarUsers.length;

              // Base collaborative score from similar users' interactions
              const interactionRatio = interactionCount / totalSimilarUsers;
              collaborativeScore = Math.min(0.3 + (interactionRatio * 0.7), 1.0);

              // Boost score if similar users have joined this specific match
              if (interactionCount > 0) {
                collaborativeScore = Math.min(collaborativeScore + 0.2, 1.0);
              }
            }
          }

          // Fallback: Use sport preference similarity if no interaction data
          if (collaborativeScore === 0.5) {
            const userSports = userPreferences.sport_preferences?.map((sport: any) => sport.name) || [];
            const matchSportName = match.sports?.name;
            const sportPreferenceStrength = (matchSportName && userSports.includes(matchSportName)) ? 0.8 : 0.4;
            const userActivityLevel = userPreferences.time_preferences?.days?.length || 3;
            const activityBonus = Math.min(userActivityLevel / 7, 0.3);
            collaborativeScore = Math.min(sportPreferenceStrength + activityBonus, 1.0);
          }
        } catch (error) {
          console.error('Error in collaborative filtering:', error);
          // Fallback to simple calculation
          const userSports = userPreferences.sport_preferences?.map((sport: any) => sport.name) || [];
          const matchSportName = match.sports?.name;
          const sportPreferenceStrength = (matchSportName && userSports.includes(matchSportName)) ? 0.8 : 0.4;
          collaborativeScore = sportPreferenceStrength;
        }
      }

      // 3. Activity-based Scoring (20% weight)
      let activityScore = 0;

      // Match popularity (optimal participation level gets highest score)
      const participantRatio = match.current_participants / match.max_participants;
      if (participantRatio >= 0.3 && participantRatio <= 0.7) {
        // Sweet spot: not too empty, not too full
        activityScore += 0.4;
      } else if (participantRatio < 0.3) {
        // New matches or less popular - moderate score
        activityScore += 0.2;
      } else if (participantRatio < 1.0) {
        // Almost full but still joinable - good score
        activityScore += 0.3;
      }

      // Recency bonus (matches happening soon get higher priority)
      const hoursUntilMatch = (new Date(match.start_time).getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntilMatch < 6) {
        // Very soon - highest urgency
        activityScore += 0.3;
      } else if (hoursUntilMatch < 24) {
        // Today - high priority
        activityScore += 0.2;
      } else if (hoursUntilMatch < 72) {
        // This week - moderate priority
        activityScore += 0.1;
      }

      // Skill level matching bonus
      const userSkillLevel = userPreferences.sport_preferences?.find((sport: any) =>
        sport.name === match.sports?.name)?.level || 'Beginner';
      if (userSkillLevel === match.skill_level) {
        activityScore += 0.2;
      }

      // Availability bonus (ensure match is joinable)
      if (match.current_participants < match.max_participants) {
        activityScore += 0.1;
      }

      // Cap the activity score at 1.0
      activityScore = Math.min(activityScore, 1.0);

      // Calculate final weighted score
      const finalScore = (
        directPreferenceScore * 0.35 +
        collaborativeScore * 0.45 +
        activityScore * 0.20
      );

      // Only include matches with reasonable scores
      if (finalScore > 0.3) {
        // Create detailed breakdown for frontend display
        const userSports = userPreferences.sport_preferences?.map((sport: any) => sport.name) || [];
        const matchSportName = match.sports?.name;
        const sportMatch = (matchSportName && userSports.includes(matchSportName)) ? 0.8 : 0.2;
        const locationMatch = userPreferences.location_preferences?.includes(match.location_id) ? 0.7 : 0.3;

        // Time match calculation
        const matchDate = new Date(match.start_time);
        const matchDay = matchDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const matchHour = matchDate.getHours();
        const userAvailableDays = userPreferences.time_preferences?.days || [];
        const userAvailableHours = userPreferences.time_preferences?.hours || [];
        const timeMatch = (userAvailableDays.includes(matchDay) &&
                          (userAvailableHours.length === 0 || userAvailableHours.includes(matchHour))) ? 0.6 : 0.2;

        recommendations.push({
          match,
          score: finalScore,
          final_score: finalScore,
          explanation: finalScore > 0.7
            ? "Great match - matches your preferences, based on your experience with this sport"
            : finalScore > 0.5
            ? "Good match - aligns with some of your preferences"
            : "Potential match - might be interesting to try",
          direct_preference: {
            score: directPreferenceScore,
            breakdown: {
              sports_score: sportMatch,
              venue_score: locationMatch,
              schedule_score: timeMatch
            }
          },
          collaborative_filtering: {
            score: collaborativeScore
          },
          activity_based: {
            score: activityScore
          },
          score_breakdown: {
            direct_preference: directPreferenceScore * 0.35,
            collaborative_filtering: collaborativeScore * 0.45,
            activity_based: activityScore * 0.20
          }
        });
      }
    }

    // Sort by final score and apply pagination
    recommendations.sort((a, b) => b.final_score - a.final_score);
    const paginatedRecommendations = recommendations.slice(offset, offset + limit);

    return new Response(
      JSON.stringify({
        recommendations: paginatedRecommendations,
        count: paginatedRecommendations.length,
        algorithm: 'complete-combined-recommendations'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in combined-recommendations function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
