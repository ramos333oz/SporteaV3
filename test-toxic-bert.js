// Test script to verify toxic-bert integration
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fcwwuiitsghknsvnsrxp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjd3d1aWl0c2doa25zdm5zcnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2NjI4MTgsImV4cCI6MjA2MzIzODgxOH0.5IkK_9D4FZU3z_4Kpm7pRJu8rIKfKleIpxMbyr-YoBA'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testToxicBert() {
  console.log('🧪 Testing toxic-bert integration...')
  
  // Test with explicit profanity that should trigger toxic-bert
  const testContent = {
    title: "F*** this stupid game",
    description: "This is f***ing bullsh*t! All you b*tches are worthless pieces of sh*t."
  }
  
  try {
    console.log('📤 Calling moderate-match-content edge function...')
    
    const { data, error } = await supabase.functions.invoke('moderate-match-content', {
      body: {
        title: testContent.title,
        description: testContent.description,
        matchId: 'test-123'
      }
    })
    
    if (error) {
      console.error('❌ Edge function error:', error)
      return
    }
    
    console.log('✅ Edge function response:', JSON.stringify(data, null, 2))
    
    // Check if toxic-bert was used
    if (data.model_used && data.model_used.includes('toxic-bert')) {
      console.log('🎉 SUCCESS: toxic-bert is working!')
    } else if (data.model_used === 'rule-based-fallback') {
      console.log('⚠️  Still using rule-based fallback. Checking why...')
    }
    
  } catch (err) {
    console.error('💥 Test failed:', err)
  }
}

// Run the test
testToxicBert()
