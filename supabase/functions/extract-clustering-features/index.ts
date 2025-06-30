import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface UserFeatures {
  user_id: string;
  feedback_frequency: number;
  satisfaction_rate: number;
  response_time_avg: number;
  engagement_level: number;
  algorithm_preference: number[];
  match_type_preferences: number[];
  time_based_patterns: number[];
  recommendation_acceptance_rate: number;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, timeRange = 30 } = await req.json();
    
    // Calculate date range (default: last 30 days)
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - timeRange * 24 * 60 * 60 * 1000);

    console.log(`Extracting features for ${userId ? 'user ' + userId : 'all users'} from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Get feedback data with user and match information
    let query = supabase
      .from('recommendation_feedback')
      .select(`
        user_id,
        match_id,
        feedback_type,
        final_score,
        algorithm_scores,
        recommendation_data,
        created_at,
        updated_at,
        matches:match_id(
          id,
          sports(name),
          start_time,
          skill_level
        )
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: feedbackData, error: feedbackError } = await query;

    if (feedbackError) {
      throw new Error(`Error fetching feedback data: ${feedbackError.message}`);
    }

    if (!feedbackData || feedbackData.length === 0) {
      return new Response(
        JSON.stringify({ 
          features: [],
          message: 'No feedback data found for the specified criteria'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Group feedback by user
    const userFeedbackMap = new Map<string, any[]>();
    feedbackData.forEach(feedback => {
      if (!userFeedbackMap.has(feedback.user_id)) {
        userFeedbackMap.set(feedback.user_id, []);
      }
      userFeedbackMap.get(feedback.user_id)!.push(feedback);
    });

    // Extract features for each user
    const userFeatures: UserFeatures[] = [];

    for (const [userId, userFeedback] of userFeedbackMap) {
      const features = await extractUserFeatures(userId, userFeedback, timeRange);
      if (features) {
        userFeatures.push(features);
      }
    }

    console.log(`Extracted features for ${userFeatures.length} users`);

    return new Response(
      JSON.stringify({ 
        features: userFeatures,
        totalUsers: userFeatures.length,
        timeRange,
        extractedAt: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in extract-clustering-features:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to extract clustering features'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function extractUserFeatures(userId: string, userFeedback: any[], timeRangeDays: number): Promise<UserFeatures | null> {
  try {
    const totalFeedback = userFeedback.length;
    if (totalFeedback === 0) return null;

    // 1. Feedback frequency (feedback per week)
    const feedbackFrequency = (totalFeedback / timeRangeDays) * 7;

    // 2. Satisfaction rate (positive feedback ratio)
    const positiveFeedback = userFeedback.filter(f => f.feedback_type === 'liked').length;
    const satisfactionRate = positiveFeedback / totalFeedback;

    // 3. Response time average (time between recommendation and feedback)
    let totalResponseTime = 0;
    let validResponseTimes = 0;
    
    userFeedback.forEach(feedback => {
      if (feedback.created_at && feedback.updated_at) {
        const responseTime = new Date(feedback.updated_at).getTime() - new Date(feedback.created_at).getTime();
        if (responseTime > 0) {
          totalResponseTime += responseTime;
          validResponseTimes++;
        }
      }
    });
    
    const responseTimeAvg = validResponseTimes > 0 ? 
      (totalResponseTime / validResponseTimes) / (1000 * 60 * 60) : // Convert to hours
      24; // Default 24 hours if no valid response times

    // 4. Engagement level (total interactions normalized)
    const engagementLevel = Math.min(totalFeedback / 10, 1); // Normalize to 0-1, cap at 10 feedback items

    // 5. Algorithm preference (which algorithms get positive feedback)
    const algorithmPreference = [0, 0, 0]; // [direct_preference, collaborative_filtering, activity_based]
    const algorithmCounts = [0, 0, 0];
    
    userFeedback.forEach(feedback => {
      if (feedback.algorithm_scores) {
        const scores = feedback.algorithm_scores;
        const isPositive = feedback.feedback_type === 'liked' ? 1 : 0;
        
        if (scores.direct_preference !== undefined) {
          algorithmPreference[0] += isPositive;
          algorithmCounts[0]++;
        }
        if (scores.collaborative_filtering !== undefined) {
          algorithmPreference[1] += isPositive;
          algorithmCounts[1]++;
        }
        if (scores.activity_based !== undefined) {
          algorithmPreference[2] += isPositive;
          algorithmCounts[2]++;
        }
      }
    });

    // Normalize algorithm preferences
    for (let i = 0; i < 3; i++) {
      algorithmPreference[i] = algorithmCounts[i] > 0 ? algorithmPreference[i] / algorithmCounts[i] : 0.5;
    }

    // 6. Match type preferences (sport categories)
    const sportPreferences = new Map<string, { positive: number, total: number }>();
    
    userFeedback.forEach(feedback => {
      if (feedback.matches?.sports?.name) {
        const sport = feedback.matches.sports.name;
        if (!sportPreferences.has(sport)) {
          sportPreferences.set(sport, { positive: 0, total: 0 });
        }
        const pref = sportPreferences.get(sport)!;
        pref.total++;
        if (feedback.feedback_type === 'liked') {
          pref.positive++;
        }
      }
    });

    // Convert to normalized array (top 5 sports)
    const matchTypePreferences = Array.from(sportPreferences.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([_, pref]) => pref.total > 0 ? pref.positive / pref.total : 0.5);
    
    // Pad with 0.5 if less than 5 sports
    while (matchTypePreferences.length < 5) {
      matchTypePreferences.push(0.5);
    }

    // 7. Time-based patterns (hour of day preferences)
    const hourPreferences = new Array(24).fill(0);
    const hourCounts = new Array(24).fill(0);
    
    userFeedback.forEach(feedback => {
      if (feedback.created_at) {
        const hour = new Date(feedback.created_at).getHours();
        hourCounts[hour]++;
        if (feedback.feedback_type === 'liked') {
          hourPreferences[hour]++;
        }
      }
    });

    // Normalize and group into 4 time periods (6-hour blocks)
    const timeBasedPatterns = [0, 0, 0, 0]; // [morning, afternoon, evening, night]
    const timeCounts = [0, 0, 0, 0];
    
    for (let hour = 0; hour < 24; hour++) {
      const periodIndex = Math.floor(hour / 6);
      timeBasedPatterns[periodIndex] += hourPreferences[hour];
      timeCounts[periodIndex] += hourCounts[hour];
    }
    
    for (let i = 0; i < 4; i++) {
      timeBasedPatterns[i] = timeCounts[i] > 0 ? timeBasedPatterns[i] / timeCounts[i] : 0.5;
    }

    // 8. Recommendation acceptance rate (assuming final_score > 0.7 means accepted)
    const acceptedRecommendations = userFeedback.filter(f => 
      f.final_score && f.final_score > 0.7 && f.feedback_type === 'liked'
    ).length;
    const recommendationAcceptanceRate = totalFeedback > 0 ? acceptedRecommendations / totalFeedback : 0;

    return {
      user_id: userId,
      feedback_frequency: Math.min(feedbackFrequency, 10), // Cap at 10 per week
      satisfaction_rate: satisfactionRate,
      response_time_avg: Math.min(responseTimeAvg, 168), // Cap at 1 week
      engagement_level: engagementLevel,
      algorithm_preference: algorithmPreference,
      match_type_preferences: matchTypePreferences,
      time_based_patterns: timeBasedPatterns,
      recommendation_acceptance_rate: recommendationAcceptanceRate
    };

  } catch (error) {
    console.error(`Error extracting features for user ${userId}:`, error);
    return null;
  }
}
