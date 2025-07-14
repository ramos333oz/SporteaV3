/**
 * Debug Model Response Formats
 * This script tests the actual response formats from different models
 * to understand why toxicity scores are showing as 0.0%
 */

const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models'
const API_KEY = process.env.HUGGINGFACE_API_KEY || 'your-api-key-here'

async function debugModelResponse(modelName, testContent) {
  console.log(`\n🔍 Debugging ${modelName}`)
  console.log(`📝 Content: "${testContent}"`)
  console.log('-'.repeat(50))

  try {
    const response = await fetch(
      `${HUGGINGFACE_API_URL}/${modelName}`,
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

    console.log(`📊 Status: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`❌ Error: ${errorText}`)
      return
    }

    const result = await response.json()
    console.log(`✅ Raw Response:`)
    console.log(JSON.stringify(result, null, 2))

    // Analyze response structure
    if (Array.isArray(result)) {
      console.log(`📋 Response Type: Array with ${result.length} items`)
      result.forEach((item, index) => {
        console.log(`   Item ${index}:`, item)
      })
    } else if (typeof result === 'object') {
      console.log(`📋 Response Type: Object`)
      console.log(`   Keys:`, Object.keys(result))
    } else {
      console.log(`📋 Response Type: ${typeof result}`)
    }

  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
  }
}

async function testKnownWorkingModel() {
  console.log('🧪 Testing Known Working Models for Response Format Analysis\n')
  console.log('=' .repeat(70))

  const testContent = "This is fucking bullshit damn"
  
  // Test models that should work
  const modelsToTest = [
    'unitary/toxic-bert',
    'unitary/multilingual-toxic-xlm-roberta',
    'martin-ha/toxic-comment-model'
  ]

  for (const model of modelsToTest) {
    await debugModelResponse(model, testContent)
    console.log('=' .repeat(70))
  }

  // Test with Malay content
  console.log('\n🇲🇾 Testing with Malay Content:')
  const malayContent = "bodoh betul puki babi sial"
  
  for (const model of modelsToTest) {
    await debugModelResponse(model, malayContent)
    console.log('=' .repeat(70))
  }
}

async function testCorrectToxicBertUsage() {
  console.log('\n🔥 Testing Correct Toxic-BERT Usage\n')
  
  const testCases = [
    "This is fucking bullshit damn",
    "You are an idiot and stupid",
    "Hello, how are you today?",
    "bodoh betul puki babi sial"
  ]

  for (const content of testCases) {
    console.log(`\n📝 Testing: "${content}"`)
    
    try {
      const response = await fetch(
        `${HUGGINGFACE_API_URL}/unitary/toxic-bert`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: content,
            options: {
              wait_for_model: true,
              use_cache: false
            }
          })
        }
      )

      if (response.ok) {
        const result = await response.json()
        console.log('Raw response:', JSON.stringify(result, null, 2))
        
        // Try different ways to extract toxicity score
        if (Array.isArray(result)) {
          // Method 1: Look for TOXIC label
          const toxicItem = result.find(item => item.label === 'TOXIC')
          if (toxicItem) {
            console.log(`✅ Method 1 - TOXIC score: ${(toxicItem.score * 100).toFixed(1)}%`)
          }
          
          // Method 2: Look for highest score
          const maxScore = Math.max(...result.map(item => item.score || 0))
          const maxItem = result.find(item => item.score === maxScore)
          console.log(`📊 Method 2 - Highest score: ${(maxScore * 100).toFixed(1)}% (${maxItem?.label})`)
          
          // Method 3: Show all scores
          console.log('📋 All scores:')
          result.forEach(item => {
            console.log(`   ${item.label}: ${(item.score * 100).toFixed(1)}%`)
          })
        }
      } else {
        console.log(`❌ Error: ${response.status}`)
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`)
    }
    
    console.log('-'.repeat(50))
  }
}

// Run all debug tests
async function runDebugTests() {
  console.log('🚀 Model Response Format Debug Tests\n')
  
  await testKnownWorkingModel()
  await testCorrectToxicBertUsage()
  
  console.log('\n🏁 Debug tests completed!')
  console.log('\n💡 Next Steps:')
  console.log('1. Analyze the actual response formats')
  console.log('2. Update the parsing logic in the edge function')
  console.log('3. Test with the corrected model configuration')
}

runDebugTests().catch(console.error)
