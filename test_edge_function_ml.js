/**
 * Test Script for Edge Function ML Model Usage
 * This script tests the deployed edge function to see if it's using
 * the Malaysian SFW Classifier or falling back to the lexicon
 */

const SUPABASE_URL = 'https://fcwwuiitsghknsvnsrxp.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjd3d1aWl0c2doa25zdm5zcnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2NjI4MTgsImV4cCI6MjA2MzIzODgxOH0.5IkK_9D4FZU3z_4Kpm7pRJu8rIKfKleIpxMbyr-YoBA'

async function testEdgeFunctionML() {
  console.log('🧪 Testing Edge Function ML Model Usage...\n')

  // Test cases with different content types
  const testCases = [
    {
      name: 'Pure Malay Profanity',
      content: 'Bodoh betul puki babi sial',
      expected: 'Should use Malaysian SFW Classifier'
    },
    {
      name: 'Mixed English-Malay',
      content: 'Fuck this puki game bodoh betul',
      expected: 'Should use Malaysian SFW Classifier'
    },
    {
      name: 'Pure English Profanity',
      content: 'This is fucking bullshit damn',
      expected: 'Should use Toxic-BERT'
    },
    {
      name: 'Clean Content',
      content: 'Great football match today',
      expected: 'Should use any model successfully'
    }
  ]

  for (const testCase of testCases) {
    console.log(`\n🎯 Testing: ${testCase.name}`)
    console.log(`📝 Content: "${testCase.content}"`)
    console.log(`🎯 Expected: ${testCase.expected}`)
    console.log('-'.repeat(50))

    try {
      const startTime = Date.now()

      // Create a test match data
      const matchData = {
        id: `test-${Date.now()}`,
        title: `TEST: ${testCase.name}`,
        description: testCase.content,
        sport_id: 'test-sport',
        host_id: 'test-user',
        location_id: 'test-location'
      }

      // Call the edge function
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/moderate-match-content`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ matchData })
        }
      )

      const processingTime = Date.now() - startTime

      if (!response.ok) {
        console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`)
        const errorText = await response.text()
        console.error(`📄 Error details: ${errorText}`)
        continue
      }

      const result = await response.json()
      console.log(`⏱️  Processing time: ${processingTime}ms`)

      // Analyze the results
      if (result.success) {
        const moderation = result.moderation_result
        console.log(`✅ Moderation successful:`)
        console.log(`   📊 Score: ${moderation.inappropriate_score} (${(moderation.inappropriate_score * 100).toFixed(1)}%)`)
        console.log(`   🎯 Risk Level: ${moderation.overall_risk_level}`)
        console.log(`   🤖 Model Used: ${moderation.ml_model_used}`)
        console.log(`   🔄 Fallback Used: ${moderation.fallback_used}`)
        
        if (moderation.flagged_content && moderation.flagged_content.toxic_words) {
          console.log(`   🚩 Flagged Words: ${moderation.flagged_content.toxic_words.join(', ')}`)
        }

        // Check if the right model was used
        if (testCase.name.includes('Malay') || testCase.name.includes('Mixed')) {
          if (moderation.ml_model_used === 'malaysia-ai/malaysian-sfw-classifier') {
            console.log(`   ✅ CORRECT: Used Malaysian SFW Classifier as expected`)
          } else if (moderation.ml_model_used === 'enhanced-malay-lexicon') {
            console.log(`   ⚠️  FALLBACK: Used lexicon instead of ML model`)
            console.log(`   💡 This indicates the Malaysian SFW Classifier failed`)
          } else {
            console.log(`   ❓ UNEXPECTED: Used ${moderation.ml_model_used}`)
          }
        } else if (testCase.name.includes('English')) {
          if (moderation.ml_model_used === 'unitary/toxic-bert') {
            console.log(`   ✅ CORRECT: Used Toxic-BERT as expected`)
          } else {
            console.log(`   ❓ UNEXPECTED: Used ${moderation.ml_model_used}`)
          }
        }

      } else {
        console.error(`❌ Moderation failed: ${result.error}`)
      }

    } catch (error) {
      console.error(`❌ Error testing ${testCase.name}:`, error.message)
    }
  }
}

async function checkModerationSettings() {
  console.log('\n🔧 Checking Content Moderation Settings...\n')

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/content_moderation_settings?select=*`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        }
      }
    )

    if (!response.ok) {
      console.error(`❌ Failed to fetch settings: ${response.status}`)
      return
    }

    const settings = await response.json()
    if (settings.length > 0) {
      const config = settings[0]
      console.log('📋 Current Moderation Settings:')
      console.log(`   🤖 ML Enabled: ${config.ml_enabled}`)
      console.log(`   🎯 ML Confidence Threshold: ${config.ml_confidence_threshold}`)
      console.log(`   ⏱️  ML Timeout: ${config.ml_timeout_ms}ms`)
      console.log(`   🔧 Primary Model: ${config.ml_primary_model}`)
      console.log(`   🔄 Fallback Model: ${config.ml_fallback_model}`)
      console.log(`   📝 Simplified Mode: ${config.simplified_mode}`)
    } else {
      console.log('⚠️  No moderation settings found')
    }

  } catch (error) {
    console.error('❌ Error checking settings:', error.message)
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Edge Function ML Model Tests\n')
  console.log('=' .repeat(60))
  
  await checkModerationSettings()
  await testEdgeFunctionML()
  
  console.log('\n' + '='.repeat(60))
  console.log('🏁 Tests completed!')
  console.log('\n💡 Analysis:')
  console.log('- If Malaysian SFW Classifier is used: ✅ ML model working')
  console.log('- If enhanced-malay-lexicon is used: ⚠️  ML model failing, using fallback')
  console.log('- Check the model_used field to see which system is being used')
}

runAllTests().catch(console.error)
