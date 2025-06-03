// Follow this setup guide to integrate the Deno runtime into your application:
// https://deno.land/manual/examples/deploy_supabase_edge

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.24.0'
import { env } from '@xenova/transformers'
import { pipeline } from '@xenova/transformers'

// Configure transformers.js for Deno
env.useBrowserCache = false

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// Create embedding function
const generateEmbedding = async (text: string) => {
  // Initialize the pipeline
  const pipe = await pipeline('feature-extraction', 'Supabase/gte-small')
  
  // Generate embedding
  const output = await pipe(text, {
    pooling: 'mean',
    normalize: true,
  })
  
  // Extract the embedding data
  return Array.from(output.data)
}

// Process a single user to generate and store preference embedding
const processUser = async (user: any, supabase: any) => {
  try {
    // Get user's match participation history
    const { data: participations, error: participationsError } = await supabase
      .from('participants')
      .select(`
        match_id,
        matches (
          id,
          title,
          sport_id,
          sports (name),
          location_id,
          locations (name, address),
          skill_level,
          start_time
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (participationsError) {
      console.error(`Error fetching participations for user ${user.id}:`, participationsError)
      return
    }

    // Get user's hosted matches
    const { data: hostedMatches, error: hostedError } = await supabase
      .from('matches')
      .select(`
        id,
        title,
        sport_id,
        sports (name),
        location_id,
        locations (name, address),
        skill_level,
        start_time
      `)
      .eq('host_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (hostedError) {
      console.error(`Error fetching hosted matches for user ${user.id}:`, hostedError)
      return
    }
    
    // Get user's interactions
    const { data: interactions, error: interactionsError } = await supabase
      .from('user_interactions')
      .select(`
        interaction_type,
        match_id,
        matches (
          id,
          title,
          sport_id,
          sports (name),
          location_id,
          skill_level
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)

    if (interactionsError) {
      console.error(`Error fetching interactions for user ${user.id}:`, interactionsError)
      return
    }
    
    // Get user's sport preferences from profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('favorite_sports, skill_level, preferred_locations')
      .eq('user_id', user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      console.error(`Error fetching profile for user ${user.id}:`, profileError)
      // We'll continue even if profile is not found
    }
    
    // Compile user data into a comprehensive text representation
    let userText = `User ${user.id}\n`
    
    // Add profile preferences if available
    if (profile) {
      userText += `Favorite Sports: ${profile.favorite_sports || ''}\n`
      userText += `Skill Level: ${profile.skill_level || ''}\n`
      userText += `Preferred Locations: ${profile.preferred_locations || ''}\n`
    }
    
    // Add participated matches data
    if (participations && participations.length > 0) {
      userText += 'Participated in matches:\n'
      participations.forEach((participation: any) => {
        const match = participation.matches
        if (match) {
          userText += `- ${match.title || 'Untitled'} (${match.sports?.name || 'Unknown sport'})\n`
          userText += `  Location: ${match.locations?.name || 'Unknown location'}\n`
          userText += `  Skill Level: ${match.skill_level || 'Intermediate'}\n`
        }
      })
    }
    
    // Add hosted matches data
    if (hostedMatches && hostedMatches.length > 0) {
      userText += 'Hosted matches:\n'
      hostedMatches.forEach((match: any) => {
        userText += `- ${match.title || 'Untitled'} (${match.sports?.name || 'Unknown sport'})\n`
        userText += `  Location: ${match.locations?.name || 'Unknown location'}\n`
        userText += `  Skill Level: ${match.skill_level || 'Intermediate'}\n`
      })
    }
    
    // Add interaction data
    if (interactions && interactions.length > 0) {
      userText += 'Recent interactions:\n'
      interactions.forEach((interaction: any) => {
        const match = interaction.matches
        if (match) {
          userText += `- ${interaction.interaction_type} with ${match.title || 'Untitled'} (${match.sports?.name || 'Unknown sport'})\n`
        }
      })
    }
    
    console.log(`Generating preference embedding for user ${user.id}`)
    
    // Generate the embedding
    const embedding = await generateEmbedding(userText)
    
    // Update the user with the preference embedding
    const { error: updateError } = await supabase
      .from('users')
      .update({ preference_vector: embedding })
      .eq('id', user.id)
    
    if (updateError) {
      console.error(`Error updating user ${user.id}:`, updateError)
      return
    }
    
    console.log(`Successfully updated preference embedding for user ${user.id}`)
  } catch (error) {
    console.error(`Error processing user ${user.id}:`, error)
  }
}

// Process users without preference embeddings
const processUsers = async (supabase: any) => {
  try {
    // Get users without preference embeddings
    const { data: users, error } = await supabase
      .from('users')
      .select('id')
      .is('preference_vector', null)
      .limit(5) // Process in small batches to avoid timeouts
    
    if (error) {
      console.error('Error fetching users:', error)
      return { processed: 0, error: error.message }
    }
    
    if (!users || users.length === 0) {
      console.log('No users to process')
      return { processed: 0 }
    }
    
    // Process each user
    for (const user of users) {
      await processUser(user, supabase)
    }
    
    return { processed: users.length }
  } catch (error) {
    console.error('Error in processUsers:', error)
    return { processed: 0, error: error.message }
  }
}

// Handle HTTP requests
Deno.serve(async (req) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { headers: { 'Content-Type': 'application/json' }, status: 405 }
      )
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get request data (optional parameters)
    const requestData = await req.json().catch(() => ({}))
    const { userId } = requestData
    
    let result
    
    // If a specific user ID is provided, process only that user
    if (userId) {
      const { data: user, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single()
      
      if (error) {
        return new Response(
          JSON.stringify({ error: `Error fetching user ${userId}: ${error.message}` }),
          { headers: { 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      
      await processUser(user, supabase)
      result = { processed: 1, userId }
    } else {
      // Process multiple users
      result = await processUsers(supabase)
    }
    
    return new Response(
      JSON.stringify(result),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
