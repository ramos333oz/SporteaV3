// Test script to debug the enhanced-weighted-recommendations edge function
const SUPABASE_URL = 'https://fcwwuiitsghknsvnsrxp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjd3d1aWl0c2doa25zdm5zcnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2NjI4MTgsImV4cCI6MjA2MzIzODgxOH0.5IkK_9D4FZU3z_4Kpm7pRJu8rIKfKleIpxMbyr-YoBA';
const OMAR_USER_ID = 'a7ed4757-5983-4112-967f-b678430248f9';

async function testEnhancedRecommendations() {
  console.log('=== Testing Enhanced Weighted Recommendations Edge Function ===');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/enhanced-weighted-recommendations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        userId: OMAR_USER_ID,
        limit: 10,
        offset: 0,
        minSimilarity: 0.01
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Response body:', responseText);

    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log('Parsed response:', JSON.stringify(data, null, 2));
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError);
      }
    } else {
      console.error('Edge function returned error status:', response.status);
    }

  } catch (error) {
    console.error('Error calling edge function:', error);
  }
}

testEnhancedRecommendations();
