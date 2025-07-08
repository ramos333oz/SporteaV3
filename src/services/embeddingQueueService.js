import { supabase } from './supabase';

/**
 * Service for processing the embedding queue
 * This handles automatic vector updates when user preferences change
 */
class EmbeddingQueueService {
  constructor() {
    this.isProcessing = false;
    this.processingInterval = null;
  }

  /**
   * Process pending entries in the embedding queue
   */
  async processQueue(batchSize = 5) {
    if (this.isProcessing) {
      console.log('Queue processing already in progress');
      return { message: 'Already processing', processed: 0 };
    }

    this.isProcessing = true;
    const results = {
      processed: 0,
      failed: 0,
      errors: []
    };

    try {
      console.log('Starting embedding queue processing...');

      // Get pending queue entries
      const { data: queueEntries, error: queueError } = await supabase
        .from('embedding_queue')
        .select('*')
        .eq('status', 'pending')
        .lt('attempts', 3)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(batchSize);

      if (queueError) {
        throw new Error(`Failed to fetch queue entries: ${queueError.message}`);
      }

      if (!queueEntries || queueEntries.length === 0) {
        console.log('No pending queue entries found');
        return results;
      }

      console.log(`Processing ${queueEntries.length} queue entries...`);

      // Process each entry
      for (const entry of queueEntries) {
        try {
          console.log(`Processing ${entry.entity_type} ${entry.entity_id}`);

          // Update status to processing
          await supabase
            .from('embedding_queue')
            .update({ 
              status: 'processing',
              attempts: entry.attempts + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', entry.id);

          if (entry.entity_type === 'user') {
            // Process user embedding by calling the edge function
            const { data: response, error: functionError } = await supabase.functions.invoke(
              'generate-user-embeddings-v2',
              {
                body: { userId: entry.entity_id }
              }
            );

            if (functionError) {
              throw new Error(`Edge function error: ${functionError.message}`);
            }

            // Check if the response indicates success
            if (response && (response.success || response.message?.includes('successfully'))) {
              // Mark as completed
              await supabase
                .from('embedding_queue')
                .update({ 
                  status: 'completed',
                  error: null,
                  updated_at: new Date().toISOString()
                })
                .eq('id', entry.id);

              results.processed++;
              console.log(`Successfully processed user ${entry.entity_id}`);
            } else {
              throw new Error(`Edge function returned unexpected response: ${JSON.stringify(response)}`);
            }

          } else if (entry.entity_type === 'match') {
            // Process match embedding
            const { data: response, error: functionError } = await supabase.functions.invoke(
              'generate-match-embeddings',
              {
                body: { matchId: entry.entity_id }
              }
            );

            if (functionError) {
              throw new Error(`Edge function error: ${functionError.message}`);
            }

            // Mark as completed
            await supabase
              .from('embedding_queue')
              .update({ 
                status: 'completed',
                error: null,
                updated_at: new Date().toISOString()
              })
              .eq('id', entry.id);

            results.processed++;
            console.log(`Successfully processed match ${entry.entity_id}`);

          } else {
            // Unknown entity type
            await supabase
              .from('embedding_queue')
              .update({ 
                status: 'failed',
                error: `Unknown entity type: ${entry.entity_type}`,
                updated_at: new Date().toISOString()
              })
              .eq('id', entry.id);

            console.log(`Skipped unknown entity type: ${entry.entity_type}`);
          }

        } catch (error) {
          console.error(`Error processing queue entry ${entry.id}:`, error);
          
          const errorMessage = error.message || 'Unknown error';
          results.errors.push(`Entry ${entry.id}: ${errorMessage}`);

          // Check if we should retry or mark as failed
          const shouldRetry = entry.attempts + 1 < entry.max_attempts;
          const newStatus = shouldRetry ? 'pending' : 'failed';

          await supabase
            .from('embedding_queue')
            .update({ 
              status: newStatus,
              error: errorMessage,
              updated_at: new Date().toISOString()
            })
            .eq('id', entry.id);

          if (!shouldRetry) {
            results.failed++;
          }
        }
      }

    } catch (error) {
      console.error('Error in processQueue:', error);
      results.errors.push(`Queue processing error: ${error.message}`);
    } finally {
      this.isProcessing = false;
    }

    console.log('Queue processing completed:', results);
    return results;
  }

  /**
   * Start automatic queue processing
   */
  startAutoProcessing(intervalMs = 30000) { // 30 seconds
    if (this.processingInterval) {
      console.log('Auto processing already started');
      return;
    }

    console.log(`Starting automatic queue processing every ${intervalMs}ms`);
    
    this.processingInterval = setInterval(async () => {
      try {
        await this.processQueue();
      } catch (error) {
        console.error('Error in auto queue processing:', error);
      }
    }, intervalMs);

    // Process immediately
    this.processQueue().catch(error => {
      console.error('Error in initial queue processing:', error);
    });
  }

  /**
   * Stop automatic queue processing
   */
  stopAutoProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('Stopped automatic queue processing');
    }
  }

  /**
   * Check queue status
   */
  async getQueueStatus() {
    try {
      const { data: queueStats, error } = await supabase
        .from('embedding_queue')
        .select('status')
        .then(({ data, error }) => {
          if (error) return { data: null, error };
          
          const stats = {
            pending: 0,
            processing: 0,
            completed: 0,
            failed: 0,
            total: data?.length || 0
          };

          data?.forEach(entry => {
            stats[entry.status] = (stats[entry.status] || 0) + 1;
          });

          return { data: stats, error: null };
        });

      if (error) {
        throw new Error(`Failed to get queue status: ${error.message}`);
      }

      return queueStats;
    } catch (error) {
      console.error('Error getting queue status:', error);
      return null;
    }
  }

  /**
   * Manually trigger vector update for a specific user
   */
  async triggerUserVectorUpdate(userId) {
    try {
      console.log(`Manually triggering vector update for user: ${userId}`);

      // Add or update queue entry
      const { error: queueError } = await supabase
        .from('embedding_queue')
        .upsert({
          entity_id: userId,
          entity_type: 'user',
          status: 'pending',
          priority: 10, // High priority for manual triggers
          attempts: 0,
          error: null
        }, {
          onConflict: 'entity_id,entity_type'
        });

      if (queueError) {
        throw new Error(`Failed to queue user vector update: ${queueError.message}`);
      }

      // Process the queue immediately
      const results = await this.processQueue(1);
      
      return {
        success: true,
        message: `Vector update triggered for user ${userId}`,
        processed: results.processed,
        errors: results.errors
      };

    } catch (error) {
      console.error('Error triggering user vector update:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const embeddingQueueService = new EmbeddingQueueService();

export default embeddingQueueService;
