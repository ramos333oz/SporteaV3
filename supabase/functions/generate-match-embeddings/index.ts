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

// Process a single match to generate and store its embedding
const processMatch = async (match: any, supabase: any) => {
  try {
    // Skip if the match already has an embedding
    if (match.characteristic_vector) {
      console.log(`Match ${match.id} already has an embedding, skipping...`)
      return
    }
    
    // Get sport details
    const { data: sport } = await supabase
      .from('sports')
      .select('name')
      .eq('id', match.sport_id)
      .single()
    
    // Get location details
    const { data: location } = await supabase
      .from('locations')
      .select('name, address')
      .eq('id', match.location_id)
      .single()
    
    // Create a textual representation of the match for embedding
    const matchText = `
      Title: ${match.title || ''}
      Sport: ${sport?.name || ''}
      Skill Level: ${match.skill_level || 'Intermediate'}
      Location: ${location?.name || ''} ${location?.address || ''}
      Description: ${match.description || ''}
      Max Participants: ${match.max_participants || ''}
      Duration: ${match.duration_minutes || ''} minutes
    `.trim()
    
    console.log(`Generating embedding for match ${match.id}`)
    
    // Generate the embedding
    const embedding = await generateEmbedding(matchText)
    
    // Update the match with the embedding
    const { error } = await supabase
      .from('matches')
      .update({ characteristic_vector: embedding })
      .eq('id', match.id)
    
    if (error) {
      console.error(`Error updating match ${match.id}:`, error)
      return
    }
    
    console.log(`Successfully updated embedding for match ${match.id}`)
  } catch (error) {
    console.error(`Error processing match ${match.id}:`, error)
  }
}

// Process matches without embeddings
const processMatches = async (supabase: any) => {
  try {
    // Get matches without embeddings
    const { data: matches, error } = await supabase
      .from('matches')
      .select('id, title, sport_id, location_id, description, skill_level, max_participants, duration_minutes')
      .is('characteristic_vector', null)
      .limit(10) // Process in batches to avoid timeouts
    
    if (error) {
      console.error('Error fetching matches:', error)
      return { processed: 0, error: error.message }
    }
    
    if (!matches || matches.length === 0) {
      console.log('No matches to process')
      return { processed: 0 }
    }
    
    // Process each match
    await Promise.all(matches.map(match => processMatch(match, supabase)))
    
    return { processed: matches.length }
  } catch (error) {
    console.error('Error in processMatches:', error)
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
    const { matchId } = requestData
    
    let result
    
    // If a specific match ID is provided, process only that match
    if (matchId) {
      const { data: match, error } = await supabase
        .from('matches')
        .select('id, title, sport_id, location_id, description, skill_level, max_participants, duration_minutes, characteristic_vector')
        .eq('id', matchId)
        .single()
      
      if (error) {
        return new Response(
          JSON.stringify({ error: `Error fetching match ${matchId}: ${error.message}` }),
          { headers: { 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      
      await processMatch(match, supabase)
      result = { processed: 1, matchId }
    } else {
      // Process multiple matches
      result = await processMatches(supabase)
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
