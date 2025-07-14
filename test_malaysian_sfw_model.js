/**
 * Comprehensive ML Model Comparison Test
 * Tests Multilingual XLM-RoBERTa (primary) and Toxic-BERT (fallback)
 * NOTE: Malaysian SFW Classifier is not available (404 errors)
 * This test validates the production XLM-RoBERTa configuration
 */

const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models'
const API_KEY = process.env.HUGGINGFACE_API_KEY || 'your-api-key-here'

// Test cases with different types of content
const testCases = [
  {
    name: 'Pure Malay Profanity',
    content: 'Bodoh betul puki babi sial',
    expected: 'High toxicity detection'
  },
  {
    name: 'Mixed English-Malay',
    content: 'Fuck this puki game bodoh betul',
    expected: 'High toxicity detection'
  },
  {
    name: 'Malay Insults',
    content: 'Anjing celaka bangsat lancau',
    expected: 'High toxicity detection'
  },
  {
    name: 'Clean Malay Content',
    content: 'Selamat datang ke permainan bola sepak',
    expected: 'Low toxicity detection'
  },
  {
    name: 'English Profanity',
    content: 'This is fucking bullshit damn',
    expected: 'High toxicity detection'
  }
]

async function testMalaysianSFWModel_DEPRECATED(testCase) {
  console.log(`❌ DEPRECATED: Malaysian SFW Classifier: ${testCase.name}`)
  console.log(`📝 Content: "${testCase.content}"`)
  console.log(`⚠️  NOTE: This model is not available (404 errors)`)

  // Return failure result without making API call
  return {
    success: false,
    error: 'Model not available (404)',
    processingTime: 0,
    model: 'malaysian-sfw-classifier-UNAVAILABLE'
  }

  // Original code kept for reference:
  /*
  try {
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
          inputs: testCase.content,
          options: {
            wait_for_model: true,
            use_cache: false
          }
        })
      }
    )

    const processingTime = Date.now() - startTime

    if (!response.ok) {
      console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`)
      const errorText = await response.text()
      console.error(`📄 Error: ${errorText}`)
      return { success: false, error: `HTTP ${response.status}`, processingTime }
    }

    const result = await response.json()

    // Analyze results
    if (Array.isArray(result) && result.length > 0) {
      const maxScore = Math.max(...result.map(item => item.score || 0))
      const detectedCategory = result.find(item => item.score === maxScore)?.label || 'unknown'

      console.log(`✅ Success: Score ${maxScore.toFixed(4)} (${(maxScore * 100).toFixed(1)}%) - ${detectedCategory}`)
      console.log(`⏱️  Processing: ${processingTime}ms\n`)

      return {
        success: true,
        score: maxScore,
        category: detectedCategory,
        processingTime,
        model: 'malaysian-sfw-classifier'
      }
    } else {
      console.log('⚠️  Unexpected response format\n')
      return { success: false, error: 'Invalid response format', processingTime }
    }

  } catch (error) {
    console.error(`❌ Error: ${error.message}\n`)
    return { success: false, error: error.message, processingTime: 0 }
  }
  */
}

async function testMultilingualXLMRoBERTa(testCase) {
  console.log(`🌍 Testing Multilingual XLM-RoBERTa: ${testCase.name}`)
  console.log(`📝 Content: "${testCase.content}"`)

  try {
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
          inputs: testCase.content,
          options: {
            wait_for_model: true,
            use_cache: false
          }
        })
      }
    )

    const processingTime = Date.now() - startTime

    if (!response.ok) {
      console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`)
      const errorText = await response.text()
      console.error(`📄 Error: ${errorText}`)
      return { success: false, error: `HTTP ${response.status}`, processingTime }
    }

    const result = await response.json()

    // Analyze results
    if (Array.isArray(result) && result.length > 0) {
      const toxicItem = result.find(item => item.label === 'TOXIC')
      const toxicScore = toxicItem ? toxicItem.score : 0

      console.log(`✅ Success: Score ${toxicScore.toFixed(4)} (${(toxicScore * 100).toFixed(1)}%) - TOXIC`)
      console.log(`⏱️  Processing: ${processingTime}ms\n`)

      return {
        success: true,
        score: toxicScore,
        category: 'TOXIC',
        processingTime,
        model: 'multilingual-toxic-xlm-roberta'
      }
    } else {
      console.log('⚠️  Unexpected response format\n')
      return { success: false, error: 'Invalid response format', processingTime }
    }

  } catch (error) {
    console.error(`❌ Error: ${error.message}\n`)
    return { success: false, error: error.message, processingTime: 0 }
  }
}

async function testToxicBert(testCase) {
  console.log(`🔥 Testing Toxic-BERT: ${testCase.name}`)
  console.log(`📝 Content: "${testCase.content}"`)

  try {
    const startTime = Date.now()

    const response = await fetch(
      `${HUGGINGFACE_API_URL}/unitary/toxic-bert`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: testCase.content,
          options: {
            wait_for_model: true,
            use_cache: false
          }
        })
      }
    )

    const processingTime = Date.now() - startTime

    if (!response.ok) {
      console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`)
      const errorText = await response.text()
      console.error(`📄 Error: ${errorText}`)
      return { success: false, error: `HTTP ${response.status}`, processingTime }
    }

    const result = await response.json()

    // Analyze results
    if (Array.isArray(result) && result.length > 0) {
      const toxicItem = result.find(item => item.label === 'TOXIC')
      const toxicScore = toxicItem ? toxicItem.score : 0

      console.log(`✅ Success: Score ${toxicScore.toFixed(4)} (${(toxicScore * 100).toFixed(1)}%) - TOXIC`)
      console.log(`⏱️  Processing: ${processingTime}ms\n`)

      return {
        success: true,
        score: toxicScore,
        category: 'TOXIC',
        processingTime,
        model: 'toxic-bert'
      }
    } else {
      console.log('⚠️  Unexpected response format\n')
      return { success: false, error: 'Invalid response format', processingTime }
    }

  } catch (error) {
    console.error(`❌ Error: ${error.message}\n`)
    return { success: false, error: error.message, processingTime: 0 }
  }
}

// Run the tests
async function runComprehensiveModelComparison() {
  console.log('🚀 Comprehensive ML Model Comparison for Malay Detection\n')
  console.log('=' .repeat(80))
  console.log('Testing 2 models: Multilingual XLM-RoBERTa (primary), Toxic-BERT (fallback)')
  console.log('=' .repeat(80))

  const results = {
    malaysianSFW: [],
    multilingualXLM: [],
    toxicBert: []
  }

  for (const testCase of testCases) {
    console.log(`\n🎯 TEST CASE: ${testCase.name}`)
    console.log(`Expected: ${testCase.expected}`)
    console.log('-'.repeat(60))

    // Test Malaysian SFW Classifier (DEPRECATED - not available)
    const malaysianResult = await testMalaysianSFWModel_DEPRECATED(testCase)
    results.malaysianSFW.push({ testCase: testCase.name, ...malaysianResult })

    // Test Multilingual XLM-RoBERTa
    const xlmResult = await testMultilingualXLMRoBERTa(testCase)
    results.multilingualXLM.push({ testCase: testCase.name, ...xlmResult })

    // Test Toxic-BERT
    const toxicBertResult = await testToxicBert(testCase)
    results.toxicBert.push({ testCase: testCase.name, ...toxicBertResult })

    console.log('=' .repeat(60))
  }

  // Generate comparison report
  console.log('\n📊 COMPREHENSIVE COMPARISON REPORT')
  console.log('=' .repeat(80))

  console.log('\n� MODEL PERFORMANCE SUMMARY:')

  const models = [
    { name: 'Malaysian SFW Classifier', results: results.malaysianSFW, key: 'malaysianSFW' },
    { name: 'Multilingual XLM-RoBERTa', results: results.multilingualXLM, key: 'multilingualXLM' },
    { name: 'Toxic-BERT', results: results.toxicBert, key: 'toxicBert' }
  ]

  models.forEach(model => {
    const successCount = model.results.filter(r => r.success).length
    const avgProcessingTime = model.results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.processingTime, 0) / successCount || 0

    console.log(`\n${model.name}:`)
    console.log(`  ✅ Success Rate: ${successCount}/${testCases.length} (${(successCount/testCases.length*100).toFixed(1)}%)`)
    console.log(`  ⏱️  Avg Processing Time: ${avgProcessingTime.toFixed(0)}ms`)

    // Check Malay detection specifically
    const malayTests = model.results.filter(r =>
      r.testCase.includes('Malay') || r.testCase.includes('Mixed')
    )
    const malaySuccess = malayTests.filter(r => r.success && r.score > 0.5).length
    console.log(`  🇲🇾 Malay Detection: ${malaySuccess}/${malayTests.length} (${(malaySuccess/malayTests.length*100).toFixed(1)}%)`)
  })

  console.log('\n🎯 DETAILED RESULTS BY TEST CASE:')
  testCases.forEach((testCase, index) => {
    console.log(`\n${index + 1}. ${testCase.name}:`)
    models.forEach(model => {
      const result = model.results[index]
      if (result.success) {
        console.log(`   ${model.name}: ${(result.score * 100).toFixed(1)}% (${result.processingTime}ms)`)
      } else {
        console.log(`   ${model.name}: ❌ FAILED - ${result.error}`)
      }
    })
  })

  console.log('\n🏅 RECOMMENDATION:')

  // Find best model for Malay content
  const malayTestIndices = [0, 1, 2] // Pure Malay, Mixed, Malay Insults
  let bestMalayModel = null
  let bestMalayScore = 0

  models.forEach(model => {
    const malayScores = malayTestIndices.map(i => model.results[i])
      .filter(r => r.success)
      .map(r => r.score)

    if (malayScores.length > 0) {
      const avgMalayScore = malayScores.reduce((sum, score) => sum + score, 0) / malayScores.length
      if (avgMalayScore > bestMalayScore) {
        bestMalayScore = avgMalayScore
        bestMalayModel = model.name
      }
    }
  })

  if (bestMalayModel) {
    console.log(`🥇 Best for Malay Detection: ${bestMalayModel} (${(bestMalayScore * 100).toFixed(1)}% avg score)`)
  }

  console.log('\n💡 NEXT STEPS:')
  console.log('1. Update Supabase content moderation settings with the best model')
  console.log('2. Test the updated configuration with a new match creation')
  console.log('3. Verify that fallback_used becomes false')

  console.log('\n' + '='.repeat(80))
  console.log('🏁 Comprehensive model comparison completed!')

  return results
}

runComprehensiveModelComparison().catch(console.error)
