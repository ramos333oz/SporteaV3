// Test script to analyze recommendation system calculations
// This script will call the recommendation API and examine the returned data

const SUPABASE_URL = 'https://fcwwuiitsghknsvnsrxp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjd3d1aWl0c2doa25zdm5zcnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2NjI4MTgsImV4cCI6MjA2MzIzODgxOH0.5IkK_9D4FZU3z_4Kpm7pRJu8rIKfKleIpxMbyr-YoBA';

// Test user ID from the browser session
const TEST_USER_ID = '0debd257-a63a-4ccf-83a8-6c3ee17a2bf2';

async function testRecommendationAPI() {
  console.log('🔍 Testing Recommendation System Calculations...\n');
  
  try {
    // Call the combined-recommendations edge function
    const response = await fetch(`${SUPABASE_URL}/functions/v1/combined-recommendations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: TEST_USER_ID,
        limit: 5
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('📊 Raw API Response:');
    console.log(JSON.stringify(data, null, 2));
    console.log('\n' + '='.repeat(80) + '\n');

    // Analyze each recommendation
    if (data.recommendations && data.recommendations.length > 0) {
      console.log('🎯 Analyzing Recommendation Calculations:\n');
      
      data.recommendations.forEach((rec, index) => {
        console.log(`📋 Recommendation ${index + 1}: ${rec.match?.title || 'Unknown Match'}`);
        console.log(`   Final Score: ${rec.final_score || rec.score || 'N/A'}`);
        
        // Check score breakdown
        if (rec.score_breakdown) {
          console.log('   Score Breakdown:');
          console.log(`     - Direct Preference: ${rec.score_breakdown.direct_preference || 'N/A'}`);
          console.log(`     - Collaborative Filtering: ${rec.score_breakdown.collaborative_filtering || 'N/A'}`);
          console.log(`     - Activity Based: ${rec.score_breakdown.activity_based || 'N/A'}`);
          
          // Calculate total
          const total = (rec.score_breakdown.direct_preference || 0) + 
                       (rec.score_breakdown.collaborative_filtering || 0) + 
                       (rec.score_breakdown.activity_based || 0);
          console.log(`     - Total: ${total.toFixed(4)} (should equal final_score: ${rec.final_score || rec.score || 'N/A'})`);
        }
        
        // Check individual component scores
        if (rec.direct_preference) {
          console.log('   Direct Preference Details:');
          console.log(`     - Score: ${rec.direct_preference.score || 'N/A'}`);
          if (rec.direct_preference.breakdown) {
            console.log(`     - Sports Score: ${rec.direct_preference.breakdown.sports_score || 'N/A'}`);
            console.log(`     - Venue Score: ${rec.direct_preference.breakdown.venue_score || 'N/A'}`);
            console.log(`     - Schedule Score: ${rec.direct_preference.breakdown.schedule_score || 'N/A'}`);
          }
        }
        
        if (rec.collaborative_filtering) {
          console.log('   Collaborative Filtering Details:');
          console.log(`     - Score: ${rec.collaborative_filtering.score || 'N/A'}`);
        }
        
        if (rec.activity_based) {
          console.log('   Activity Based Details:');
          console.log(`     - Score: ${rec.activity_based.score || 'N/A'}`);
        }
        
        console.log(`   Explanation: ${rec.explanation || 'N/A'}`);
        console.log('\n' + '-'.repeat(60) + '\n');
      });
      
      // Analyze the percentage calculation issue
      console.log('🔍 Analyzing Percentage Display Issue:\n');
      
      const firstRec = data.recommendations[0];
      if (firstRec && firstRec.score_breakdown) {
        console.log('Expected Algorithm Weights (from edge function):');
        console.log('  - Direct Preference: 35%');
        console.log('  - Collaborative Filtering: 45%');
        console.log('  - Activity Based: 20%');
        console.log('  - Total: 100%\n');
        
        console.log('Current Frontend Display Weights:');
        console.log('  - Sports Match: 30%');
        console.log('  - Venue Match: 12%');
        console.log('  - Schedule Match: 9%');
        console.log('  - Community Match: 30%');
        console.log('  - Activity Pattern: 10%');
        console.log('  - Total: 91% ❌ (Missing 9%)\n');
        
        console.log('🚨 ISSUES IDENTIFIED:');
        console.log('1. Frontend percentages don\'t add up to 100%');
        console.log('2. Frontend percentages don\'t match actual algorithm weights');
        console.log('3. Direct Preference (35%) is split into Sports (30%) + Venue (12%) + Schedule (9%) = 51%');
        console.log('4. Collaborative Filtering shows as 30% instead of 45%');
        console.log('5. Activity Based shows as 10% instead of 20%');
      }
      
    } else {
      console.log('❌ No recommendations returned');
    }
    
  } catch (error) {
    console.error('❌ Error testing recommendation API:', error);
  }
}

// Run the test
testRecommendationAPI();
