// Direct test of Hugging Face toxic-bert API to debug the issue
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || 'your-api-key-here'

async function testToxicBertDirect() {
  console.log('🧪 Testing Hugging Face toxic-bert API directly...')
  
  const testTexts = [
    "fuck this shit",
    "This is a nice day",
    "You are stupid and I hate you",
    "Hello, how are you today?"
  ]
  
  for (const text of testTexts) {
    console.log(`\n📝 Testing: "${text}"`)
    
    try {
      const response = await fetch('https://api-inference.huggingface.co/models/unitary/toxic-bert', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: text })
      })
      
      if (!response.ok) {
        console.error(`❌ HTTP ${response.status}: ${response.statusText}`)
        continue
      }
      
      const result = await response.json()
      console.log('📊 Raw API Response:', JSON.stringify(result, null, 2))
      
      // Check what labels are available
      if (Array.isArray(result)) {
        result.forEach(item => {
          console.log(`   Label: "${item.label}" | Score: ${item.score}`)
        })
        
        // Find toxic score
        const toxicResult = result.find(r => r.label === 'TOXIC' || r.label === 'toxic')
        if (toxicResult) {
          console.log(`✅ Toxic Score Found: ${toxicResult.score}`)
        } else {
          console.log('❌ No TOXIC label found in response')
        }
      }
      
    } catch (error) {
      console.error('💥 Error:', error.message)
    }
  }
}

// Run the test
testToxicBertDirect()
