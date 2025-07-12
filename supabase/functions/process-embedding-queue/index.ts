import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Disable JWT verification for internal processing
export const config = {
  auth: {
    verifyJWT: false
  }
}

// Define CORS headers directly
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, Content-Type, Authorization, x-client-info, X-Debug-Request-ID, Accept',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface QueueEntry {
  id: string
  entity_id: string
  entity_type: string
  status: string
  priority: number
  attempts: number
  max_attempts: number
  error: string | null
  created_at: string
  updated_at: string
}

/**
 * Process pending entries in the embedding queue - V3 SIMPLIFIED
 * This function automatically processes 128-dimension vector updates
 * Handles both user preference changes and match detail changes
 */
async function processQueue(batchSize: number = 10): Promise<{
  processed: number
  failed: number
  skipped: number
  errors: string[]
}> {
  const results = {
    processed: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[]
  }

  try {
    // Get pending queue entries, prioritized by priority and creation time
    const { data: queueEntries, error: queueError } = await supabase
      .from('embedding_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', 3) // Don't retry entries that have failed 3 times
      .order('priority', { ascending: false }) // Higher priority first
      .order('created_at', { ascending: true }) // Older entries first
      .limit(batchSize)

    if (queueError) {
      throw new Error(`Failed to fetch queue entries: ${queueError.message}`)
    }

    if (!queueEntries || queueEntries.length === 0) {
      console.log('No pending queue entries found')
      return results
    }

    console.log(`Processing ${queueEntries.length} queue entries...`)

    // Process each queue entry
    for (const entry of queueEntries) {
      try {
        console.log(`Processing ${entry.entity_type} ${entry.entity_id} (attempt ${entry.attempts + 1})`)

        // Update status to processing
        await supabase
          .from('embedding_queue')
          .update({ 
            status: 'processing',
            attempts: entry.attempts + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', entry.id)

        if (entry.entity_type === 'user_v3') {
          // Process user embedding with v3 function
          const { data: response, error: functionError } = await supabase.functions.invoke(
            'generate-user-vectors-v3',
            {
              body: { userId: entry.entity_id }
            }
          )

        } else if (entry.entity_type === 'user') {
          // Legacy user processing - redirect to v3
          const { data: response, error: functionError } = await supabase.functions.invoke(
            'generate-user-vectors-v3',
            {
              body: { userId: entry.entity_id }
            }
          )

          if (functionError) {
            throw new Error(`Edge function error: ${functionError.message}`)
          }

          if (!response?.success) {
            throw new Error(`Edge function returned error: ${response?.error || 'Unknown error'}`)
          }

          // Mark as completed
          await supabase
            .from('embedding_queue')
            .update({ 
              status: 'completed',
              error: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', entry.id)

          results.processed++
          console.log(`Successfully processed user ${entry.entity_id}`)

        } else if (entry.entity_type === 'match_v3') {
          // Process match embedding with v3 function
          const { data: response, error: functionError } = await supabase.functions.invoke(
            'generate-match-vectors-v3',
            {
              body: { matchId: entry.entity_id }
            }
          )

        } else if (entry.entity_type === 'match') {
          // Legacy match processing - redirect to v3
          const { data: response, error: functionError } = await supabase.functions.invoke(
            'generate-match-vectors-v3',
            {
              body: { matchId: entry.entity_id }
            }
          )

          if (functionError) {
            throw new Error(`Edge function error: ${functionError.message}`)
          }

          if (!response?.success) {
            throw new Error(`Edge function returned error: ${response?.error || 'Unknown error'}`)
          }

          // Mark as completed
          await supabase
            .from('embedding_queue')
            .update({
              status: 'completed',
              error: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', entry.id)

          results.processed++
          console.log(`Successfully processed match ${entry.entity_id}`)

        } else {
          // Unknown entity type
          await supabase
            .from('embedding_queue')
            .update({ 
              status: 'failed',
              error: `Unknown entity type: ${entry.entity_type}`,
              updated_at: new Date().toISOString()
            })
            .eq('id', entry.id)

          results.skipped++
          console.log(`Skipped unknown entity type: ${entry.entity_type}`)
        }

      } catch (error) {
        console.error(`Error processing queue entry ${entry.id}:`, error)
        
        const errorMessage = error.message || 'Unknown error'
        results.errors.push(`Entry ${entry.id}: ${errorMessage}`)

        // Check if we should retry or mark as failed
        const shouldRetry = entry.attempts + 1 < entry.max_attempts
        const newStatus = shouldRetry ? 'pending' : 'failed'

        await supabase
          .from('embedding_queue')
          .update({ 
            status: newStatus,
            error: errorMessage,
            updated_at: new Date().toISOString()
          })
          .eq('id', entry.id)

        if (shouldRetry) {
          console.log(`Will retry entry ${entry.id} (attempt ${entry.attempts + 1}/${entry.max_attempts})`)
        } else {
          console.log(`Marking entry ${entry.id} as failed after ${entry.attempts + 1} attempts`)
          results.failed++
        }
      }
    }

  } catch (error) {
    console.error('Error in processQueue:', error)
    results.errors.push(`Queue processing error: ${error.message}`)
  }

  return results
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { batchSize = 10, dryRun = false } = await req.json().catch(() => ({}))

    console.log(`Starting embedding queue processing (batchSize: ${batchSize}, dryRun: ${dryRun})`)

    if (dryRun) {
      // Just check what would be processed without actually processing
      const { data: queueEntries, error: queueError } = await supabase
        .from('embedding_queue')
        .select('*')
        .eq('status', 'pending')
        .lt('attempts', 3)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(batchSize)

      if (queueError) {
        throw new Error(`Failed to fetch queue entries: ${queueError.message}`)
      }

      return new Response(
        JSON.stringify({
          message: 'Dry run completed',
          pendingEntries: queueEntries?.length || 0,
          entries: queueEntries?.map(entry => ({
            id: entry.id,
            entity_type: entry.entity_type,
            entity_id: entry.entity_id,
            attempts: entry.attempts,
            created_at: entry.created_at
          })) || []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process the queue
    const results = await processQueue(batchSize)

    const response = {
      message: 'Queue processing completed',
      results: {
        processed: results.processed,
        failed: results.failed,
        skipped: results.skipped,
        totalErrors: results.errors.length
      },
      errors: results.errors,
      timestamp: new Date().toISOString()
    }

    console.log('Queue processing results:', response.results)

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in process-embedding-queue function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
