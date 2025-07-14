/**
 * Fix Malaysian SFW Classifier ML Model Usage
 * This script diagnoses and fixes issues preventing the Malaysian SFW Classifier
 * from being used instead of falling back to the lexicon-based approach
 */

const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models'
const MALAYSIAN_MODEL = 'malaysia-ai/malaysian-sfw-classifier'

async function testHuggingFaceAPIKey() {
  console.log('🔑 Testing Hugging Face API Key Access...\n')

  const apiKey = process.env.HUGGINGFACE_API_KEY
  if (!apiKey) {
    console.error('❌ HUGGINGFACE_API_KEY environment variable not found!')
    console.log('💡 Solution: Set your Hugging Face API key:')
    console.log('   export HUGGINGFACE_API_KEY="your_token_here"')
    return false
  }

  console.log('✅ API key found, testing access...')

  try {
    // Test basic API access
    const response = await fetch('https://huggingface.co/api/whoami', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    })

    if (!response.ok) {
      console.error(`❌ API key validation failed: ${response.status}`)
      return false
    }

    const userInfo = await response.json()
    console.log(`✅ API key valid for user: ${userInfo.name}`)
    return true

  } catch (error) {
    console.error('❌ Error validating API key:', error.message)
    return false
  }
}

async function testMalaysianSFWModel() {
  console.log('\n🧪 Testing Malaysian SFW Classifier Model...\n')

  const apiKey = process.env.HUGGINGFACE_API_KEY
  const testContent = "bodoh betul puki babi sial"

  try {
    console.log(`📝 Testing content: "${testContent}"`)
    console.log(`🔗 Model: ${MALAYSIAN_MODEL}`)

    const startTime = Date.now()

    const response = await fetch(
      `${HUGGINGFACE_API_URL}/${MALAYSIAN_MODEL}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
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

      // Provide specific solutions based on error type
      if (response.status === 401) {
        console.log('\n💡 SOLUTION: API key lacks permissions')
        console.log('   1. Go to https://huggingface.co/settings/tokens')
        console.log('   2. Create a new token with "Read" permissions')
        console.log('   3. Update your HUGGINGFACE_API_KEY')
      } else if (response.status === 403) {
        console.log('\n💡 SOLUTION: Model access restricted')
        console.log('   1. Check if the model requires special permissions')
        console.log('   2. Try using a different Malaysian language model')
        console.log('   3. Contact model authors for access')
      } else if (response.status === 503) {
        console.log('\n💡 SOLUTION: Model is loading')
        console.log('   1. Wait 2-3 minutes for model to load')
        console.log('   2. Increase timeout in edge function')
        console.log('   3. Retry the request')
      } else if (response.status === 429) {
        console.log('\n💡 SOLUTION: Rate limit exceeded')
        console.log('   1. Wait before retrying')
        console.log('   2. Upgrade to Hugging Face Pro for higher limits')
        console.log('   3. Implement request queuing')
      }
      return false
    }

    const result = await response.json()
    console.log('✅ Malaysian SFW Classifier Response:')
    console.log(JSON.stringify(result, null, 2))

    // Analyze results
    if (Array.isArray(result) && result.length > 0) {
      const maxScore = Math.max(...result.map(item => item.score || 0))
      const detectedCategory = result.find(item => item.score === maxScore)?.label || 'unknown'
      
      console.log(`\n📊 Analysis:`)
      console.log(`   Max Score: ${maxScore.toFixed(4)} (${(maxScore * 100).toFixed(2)}%)`)
      console.log(`   Category: ${detectedCategory}`)
      console.log(`   Processing Time: ${processingTime}ms`)
      
      if (maxScore > 0.5) {
        console.log('✅ Model successfully detected toxicity!')
        return true
      } else {
        console.log('⚠️  Model detected low toxicity - may need threshold adjustment')
        return true
      }
    } else {
      console.log('⚠️  Unexpected response format')
      return false
    }

  } catch (error) {
    console.error('❌ Error testing Malaysian SFW Classifier:', error.message)
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.log('\n💡 SOLUTION: Network connectivity issue')
      console.log('   1. Check internet connection')
      console.log('   2. Verify firewall settings')
      console.log('   3. Try using a VPN if blocked')
    } else if (error.message.includes('timeout')) {
      console.log('\n💡 SOLUTION: Request timeout')
      console.log('   1. Increase timeout in edge function')
      console.log('   2. Try again during off-peak hours')
      console.log('   3. Use model caching')
    }
    return false
  }
}

async function suggestAlternativeModels() {
  console.log('\n🔄 Suggesting Alternative Multilingual Models...\n')

  const alternatives = [
    {
      name: 'unitary/multilingual-toxic-xlm-roberta',
      description: 'Multilingual toxic content detection (supports Malay)',
      pros: ['Reliable', 'Fast', 'Good Malay support'],
      cons: ['Less specialized for Malaysian context']
    },
    {
      name: 'martin-ha/toxic-comment-model',
      description: 'General toxic comment detection',
      pros: ['Very reliable', 'Fast processing'],
      cons: ['English-focused', 'Limited Malay support']
    },
    {
      name: 'unitary/toxic-bert',
      description: 'Current fallback model',
      pros: ['Proven reliability', 'Fast'],
      cons: ['English-only', 'No Malay support']
    }
  ]

  console.log('📋 Alternative Models for Multilingual Content Moderation:')
  alternatives.forEach((model, index) => {
    console.log(`\n${index + 1}. ${model.name}`)
    console.log(`   Description: ${model.description}`)
    console.log(`   Pros: ${model.pros.join(', ')}`)
    console.log(`   Cons: ${model.cons.join(', ')}`)
  })

  console.log('\n💡 Recommendation:')
  console.log('   Primary: unitary/multilingual-toxic-xlm-roberta')
  console.log('   Fallback: enhanced-malay-lexicon (current system)')
  console.log('   Reason: Best balance of reliability and multilingual support')
}

async function generateSQLFix() {
  console.log('\n🔧 Generating SQL Fix for Model Configuration...\n')

  const sqlCommands = [
    {
      description: 'Option 1: Use Multilingual XLM-RoBERTa (Recommended)',
      sql: `UPDATE content_moderation_settings 
SET 
  ml_primary_model = 'unitary/multilingual-toxic-xlm-roberta',
  ml_fallback_model = 'unitary/toxic-bert',
  ml_enabled = true,
  ml_confidence_threshold = 0.5,
  ml_timeout_ms = 15000,
  simplified_mode = false
WHERE id = 'cac40411-3f81-476a-bc44-07e79635a229';`
    },
    {
      description: 'Option 2: Keep Malaysian SFW with increased timeout',
      sql: `UPDATE content_moderation_settings 
SET 
  ml_primary_model = 'malaysia-ai/malaysian-sfw-classifier',
  ml_fallback_model = 'unitary/multilingual-toxic-xlm-roberta',
  ml_enabled = true,
  ml_confidence_threshold = 0.4,
  ml_timeout_ms = 20000,
  simplified_mode = false
WHERE id = 'cac40411-3f81-476a-bc44-07e79635a229';`
    },
    {
      description: 'Option 3: Disable ML and use enhanced lexicon only',
      sql: `UPDATE content_moderation_settings 
SET 
  ml_enabled = false,
  simplified_mode = true,
  lexicon_weight = 1.0
WHERE id = 'cac40411-3f81-476a-bc44-07e79635a229';`
    }
  ]

  sqlCommands.forEach((command, index) => {
    console.log(`${index + 1}. ${command.description}`)
    console.log('```sql')
    console.log(command.sql)
    console.log('```\n')
  })
}

// Main execution
async function runDiagnostics() {
  console.log('🚀 Malaysian SFW Classifier Diagnostic Tool\n')
  console.log('=' .repeat(60))

  const apiKeyValid = await testHuggingFaceAPIKey()
  
  if (apiKeyValid) {
    const modelWorking = await testMalaysianSFWModel()
    
    if (!modelWorking) {
      await suggestAlternativeModels()
    }
  }

  await generateSQLFix()

  console.log('\n' + '='.repeat(60))
  console.log('🏁 Diagnostics completed!')
  console.log('\n📋 Summary:')
  console.log('1. Test your Hugging Face API key access')
  console.log('2. Verify Malaysian SFW Classifier availability')
  console.log('3. Consider alternative multilingual models')
  console.log('4. Update database configuration as needed')
  console.log('5. Test the system with new configuration')
}

runDiagnostics().catch(console.error)
