/**
 * ML Model Connectivity and Performance Test
 * Tests the XLM-RoBERTa model connectivity and response times
 * to diagnose timeout issues in the content moderation system
 */

const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models';
const XLM_MODEL = 'unitary/multilingual-toxic-xlm-roberta';

// Test cases including the problematic content
const TEST_CASES = [
  {
    name: "Clean Content",
    text: "This is a normal sports match for football"
  },
  {
    name: "Problematic Content (Original)",
    text: "game tolol fuck"
  },
  {
    name: "Mild Profanity",
    text: "This game is damn difficult"
  },
  {
    name: "Long Text",
    text: "This is a longer text to test if the model handles longer content differently and whether it affects processing time significantly"
  }
];

async function testHuggingFaceAPIKey() {
  console.log('🔑 Testing Hugging Face API Key...\n');
  
  // Check if API key is available in environment
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    console.error('❌ HUGGINGFACE_API_KEY environment variable not found!');
    console.log('💡 To fix: Set your Hugging Face API key:');
    console.log('   export HUGGINGFACE_API_KEY="your_token_here"');
    return false;
  }
  
  console.log(`✅ API Key found: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
  return apiKey;
}

async function testModelConnectivity(apiKey) {
  console.log('🌐 Testing Model Connectivity...\n');
  
  try {
    const response = await fetch(`${HUGGINGFACE_API_URL}/${XLM_MODEL}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      }
    });
    
    if (response.ok) {
      console.log('✅ Model endpoint is accessible');
      const modelInfo = await response.json();
      console.log(`📊 Model Status: ${modelInfo.pipeline_tag || 'Available'}`);
      return true;
    } else {
      console.error(`❌ Model endpoint error: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Network error: ${error.message}`);
    return false;
  }
}

async function testModelPerformance(apiKey, testCase, timeoutMs = 10000) {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log(`📝 Text: "${testCase.text}"`);
  console.log(`⏱️  Timeout: ${timeoutMs}ms`);
  
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch(`${HUGGINGFACE_API_URL}/${XLM_MODEL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: testCase.text,
        options: {
          wait_for_model: true,
          use_cache: false
        }
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const processingTime = Date.now() - startTime;
    
    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log(`📄 Error Details: ${errorText}`);
      return { success: false, processingTime, error: `HTTP ${response.status}` };
    }
    
    const result = await response.json();
    console.log(`✅ Success! Processing time: ${processingTime}ms`);
    
    // Parse the result based on XLM-RoBERTa format
    if (Array.isArray(result) && result.length > 0) {
      const toxicScore = result.find(item => item.label === 'TOXIC')?.score || 0;
      console.log(`📊 Toxic Score: ${(toxicScore * 100).toFixed(2)}%`);
      return { 
        success: true, 
        processingTime, 
        toxicScore: toxicScore,
        rawResult: result 
      };
    } else {
      console.log(`📊 Raw Result: ${JSON.stringify(result)}`);
      return { success: true, processingTime, rawResult: result };
    }
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    if (error.name === 'AbortError') {
      console.error(`❌ Timeout after ${processingTime}ms (limit: ${timeoutMs}ms)`);
      return { success: false, processingTime, error: 'timeout' };
    } else {
      console.error(`❌ Error: ${error.message}`);
      return { success: false, processingTime, error: error.message };
    }
  }
}

async function runDiagnostics() {
  console.log('🔍 ML MODEL CONNECTIVITY DIAGNOSTICS');
  console.log('=====================================\n');
  
  // Step 1: Check API Key
  const apiKey = await testHuggingFaceAPIKey();
  if (!apiKey) return;
  
  // Step 2: Test Model Connectivity
  const isConnected = await testModelConnectivity(apiKey);
  if (!isConnected) return;
  
  // Step 3: Test Performance with Different Timeouts
  console.log('\n🚀 PERFORMANCE TESTING');
  console.log('======================');
  
  const timeouts = [4000, 6000, 8000, 10000]; // Test different timeout values
  const results = {};
  
  for (const timeout of timeouts) {
    console.log(`\n⏱️  Testing with ${timeout}ms timeout:`);
    results[timeout] = [];
    
    for (const testCase of TEST_CASES) {
      const result = await testModelPerformance(apiKey, testCase, timeout);
      results[timeout].push({ testCase: testCase.name, ...result });
      
      // Add delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Step 4: Analysis and Recommendations
  console.log('\n📊 ANALYSIS AND RECOMMENDATIONS');
  console.log('================================');
  
  let optimalTimeout = 4000;
  let successRates = {};
  
  for (const timeout of timeouts) {
    const successful = results[timeout].filter(r => r.success).length;
    const total = results[timeout].length;
    const successRate = (successful / total) * 100;
    successRates[timeout] = successRate;
    
    console.log(`⏱️  ${timeout}ms timeout: ${successful}/${total} successful (${successRate.toFixed(1)}%)`);
    
    if (successRate > successRates[optimalTimeout]) {
      optimalTimeout = timeout;
    }
  }
  
  console.log(`\n🎯 RECOMMENDATIONS:`);
  console.log(`   • Optimal timeout: ${optimalTimeout}ms`);
  console.log(`   • Current system timeout: 4000ms (hard-coded)`);
  console.log(`   • Database setting: 10000ms (not being used)`);
  
  if (optimalTimeout > 4000) {
    console.log(`\n⚠️  ISSUE IDENTIFIED:`);
    console.log(`   The hard-coded 4000ms timeout is too short!`);
    console.log(`   Recommended fix: Update edge function to use database timeout setting`);
  }
  
  return results;
}

// Run the diagnostics
if (import.meta.main) {
  runDiagnostics().catch(console.error);
}

export { runDiagnostics, testModelPerformance };
