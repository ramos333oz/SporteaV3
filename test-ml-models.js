/**
 * Test ML model access for cascading fallback system
 */

// Load environment variables from .env file
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');

    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value && !key.startsWith('#')) {
        process.env[key.trim()] = value.trim();
      }
    });
  } catch (error) {
    console.log('Warning: Could not load .env file:', error.message);
  }
}

loadEnvFile();

async function testMalaysianSFWClassifier() {
  console.log("=" * 60);
  console.log("TESTING MALAYSIAN SFW CLASSIFIER VIA API");
  console.log("=" * 60);
  
  const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
  if (!HF_API_KEY) {
    console.log("❌ No Hugging Face API key found");
    return false;
  }
  
  console.log(`✅ Using HF API key: ${HF_API_KEY.substring(0, 10)}...`);
  
  const testTexts = ["bodoh", "babi", "hello world", "saya suka makan"];
  
  for (const text of testTexts) {
    try {
      console.log(`\nTesting text: '${text}'`);
      
      const response = await fetch(
        "https://api-inference.huggingface.co/models/malaysia-ai/malaysian-sfw-classifier",
        {
          headers: {
            Authorization: `Bearer ${HF_API_KEY}`,
            "Content-Type": "application/json",
          },
          method: "POST",
          body: JSON.stringify({
            inputs: text,
            options: { wait_for_model: true }
          }),
        }
      );
      
      if (!response.ok) {
        console.log(`❌ API Error: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.log(`Error details: ${errorText}`);
        continue;
      }
      
      const result = await response.json();
      console.log(`✅ API Response:`, result);
      
      // Check if it's an array of classification results
      if (Array.isArray(result) && result.length > 0) {
        const scores = result[0];
        if (Array.isArray(scores)) {
          console.log(`  Classification scores:`, scores);
          const maxScore = Math.max(...scores.map(s => s.score));
          const maxLabel = scores.find(s => s.score === maxScore);
          console.log(`  Predicted: ${maxLabel.label} (${(maxScore * 100).toFixed(2)}%)`);
        }
      }
      
    } catch (error) {
      console.log(`❌ Error testing '${text}': ${error.message}`);
    }
  }
  
  return true;
}

async function testXLMRoberta() {
  console.log("\n" + "=" * 60);
  console.log("TESTING XLM-ROBERTA MULTILINGUAL TOXIC CLASSIFIER VIA API");
  console.log("=" * 60);
  
  const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
  if (!HF_API_KEY) {
    console.log("❌ No Hugging Face API key found");
    return false;
  }
  
  const testTexts = ["bodoh", "babi", "hello world", "you are stupid"];
  
  for (const text of testTexts) {
    try {
      console.log(`\nTesting text: '${text}'`);
      
      const response = await fetch(
        "https://api-inference.huggingface.co/models/unitary/multilingual-toxic-xlm-roberta",
        {
          headers: {
            Authorization: `Bearer ${HF_API_KEY}`,
            "Content-Type": "application/json",
          },
          method: "POST",
          body: JSON.stringify({
            inputs: text,
            options: { wait_for_model: true }
          }),
        }
      );
      
      if (!response.ok) {
        console.log(`❌ API Error: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.log(`Error details: ${errorText}`);
        continue;
      }
      
      const result = await response.json();
      console.log(`✅ API Response:`, result);
      
      // Check if it's an array of classification results
      if (Array.isArray(result) && result.length > 0) {
        const scores = result[0];
        if (Array.isArray(scores)) {
          console.log(`  Classification scores:`, scores);
          const toxicScore = scores.find(s => s.label === 'TOXIC');
          if (toxicScore) {
            console.log(`  Toxic probability: ${(toxicScore.score * 100).toFixed(2)}%`);
          }
        }
      }
      
    } catch (error) {
      console.log(`❌ Error testing '${text}': ${error.message}`);
    }
  }
  
  return true;
}

async function main() {
  console.log("ML MODEL ACCESS TESTING VIA HUGGING FACE API");
  console.log("=" * 60);
  
  // Check environment
  const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
  if (HF_API_KEY) {
    console.log(`✅ HF API Key found: ${HF_API_KEY.substring(0, 10)}...`);
  } else {
    console.log("⚠️  No HF API key found in environment");
    console.log("Please set HUGGINGFACE_API_KEY environment variable");
    return false;
  }
  
  // Test models
  const results = {};
  results.malaysian_sfw = await testMalaysianSFWClassifier();
  results.xlm_roberta = await testXLMRoberta();
  
  // Summary
  console.log("\n" + "=" * 60);
  console.log("SUMMARY");
  console.log("=" * 60);
  
  for (const [model, success] of Object.entries(results)) {
    const status = success ? "✅ ACCESSIBLE" : "❌ FAILED";
    console.log(`${model}: ${status}`);
  }
  
  const allSuccess = Object.values(results).every(Boolean);
  console.log(`\nOverall result: ${allSuccess ? "✅ SUCCESS" : "❌ SOME FAILURES"}`);
  
  return allSuccess;
}

// Run the test
main().catch(console.error);
