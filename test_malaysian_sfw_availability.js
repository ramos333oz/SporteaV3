/**
 * ML Model Availability Test
 * Tests if Multilingual XLM-RoBERTa and other models are accessible
 * NOTE: Malaysian SFW Classifier confirmed unavailable (404 errors)
 */

const API_KEY = process.env.HUGGINGFACE_API_KEY || 'your-api-key-here'
const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models'

async function testMalaysianSFWAvailability() {
  console.log('🔍 Testing Malaysian SFW Classifier Model Availability\n')
  console.log('=' .repeat(60))

  const testContent = "Testing model availability"
  
  try {
    console.log(`📝 Test content: "${testContent}"`)
    console.log(`🔗 Model: malaysia-ai/malaysian-sfw-classifier`)
    console.log(`🔑 API Key: ${API_KEY.substring(0, 10)}...`)
    
    const startTime = Date.now()

    const response = await fetch(
      `${HUGGINGFACE_API_URL}/malaysia-ai/malaysian-sfw-classifier`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: testContent,
          options: {
            wait_for_model: true,
            use_cache: false
          }
        })
      }
    )

    const processingTime = Date.now() - startTime
    console.log(`⏱️  Processing time: ${processingTime}ms`)

    if (!response.ok) {
      console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`)
      const errorText = await response.text()
      console.error(`📄 Error details: ${errorText}`)
      
      if (response.status === 404) {
        console.log('\n💡 CONCLUSION: Malaysian SFW Classifier model is NOT AVAILABLE')
        console.log('   - Model may not exist or may be private')
        console.log('   - Cannot be used for comparison testing')
        console.log('   - Will focus on XLM-RoBERTa optimization instead')
      } else if (response.status === 401) {
        console.log('\n💡 CONCLUSION: API key permission issue')
      } else if (response.status === 503) {
        console.log('\n💡 CONCLUSION: Model is loading, may be available later')
      }
      return false
    }

    const result = await response.json()
    console.log('✅ Malaysian SFW Classifier Response:')
    console.log(JSON.stringify(result, null, 2))
    
    console.log('\n💡 CONCLUSION: Malaysian SFW Classifier model is AVAILABLE')
    console.log('   - Can proceed with comparison testing')
    console.log('   - Will test against XLM-RoBERTa model')
    
    return true

  } catch (error) {
    console.error('❌ Error testing Malaysian SFW Classifier:')
    console.error(error.message)
    
    console.log('\n💡 CONCLUSION: Malaysian SFW Classifier model is NOT ACCESSIBLE')
    console.log('   - Network or API error')
    console.log('   - Cannot be used for comparison testing')
    
    return false
  }
}

// Test XLM-RoBERTa for comparison
async function testXLMRoBERTaAvailability() {
  console.log('\n🌍 Testing Multilingual XLM-RoBERTa Model Availability\n')
  console.log('=' .repeat(60))

  const testContent = "Testing model availability"
  
  try {
    console.log(`📝 Test content: "${testContent}"`)
    console.log(`🔗 Model: unitary/multilingual-toxic-xlm-roberta`)
    
    const startTime = Date.now()

    const response = await fetch(
      `${HUGGINGFACE_API_URL}/unitary/multilingual-toxic-xlm-roberta`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: testContent,
          options: {
            wait_for_model: true,
            use_cache: false
          }
        })
      }
    )

    const processingTime = Date.now() - startTime
    console.log(`⏱️  Processing time: ${processingTime}ms`)

    if (!response.ok) {
      console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`)
      return false
    }

    const result = await response.json()
    console.log('✅ XLM-RoBERTa Response:')
    console.log(JSON.stringify(result, null, 2))
    
    console.log('\n💡 CONCLUSION: XLM-RoBERTa model is AVAILABLE and WORKING')
    
    return true

  } catch (error) {
    console.error('❌ Error testing XLM-RoBERTa:')
    console.error(error.message)
    return false
  }
}

async function runAvailabilityTests() {
  console.log('🚀 ML Model Availability Testing\n')
  
  const malaysianAvailable = await testMalaysianSFWAvailability()
  const xlmAvailable = await testXLMRoBERTaAvailability()
  
  console.log('\n' + '='.repeat(60))
  console.log('📊 AVAILABILITY TEST SUMMARY')
  console.log('='.repeat(60))
  
  console.log(`Malaysian SFW Classifier: ${malaysianAvailable ? '✅ AVAILABLE' : '❌ NOT AVAILABLE'}`)
  console.log(`Multilingual XLM-RoBERTa: ${xlmAvailable ? '✅ AVAILABLE' : '❌ NOT AVAILABLE'}`)
  
  if (malaysianAvailable && xlmAvailable) {
    console.log('\n🎯 NEXT STEPS: Proceed with comprehensive model comparison')
  } else if (xlmAvailable) {
    console.log('\n🎯 NEXT STEPS: Focus on XLM-RoBERTa optimization and alternative comparisons')
  } else {
    console.log('\n⚠️  ISSUE: No models available for testing')
  }
  
  return { malaysianAvailable, xlmAvailable }
}

runAvailabilityTests().catch(console.error)
