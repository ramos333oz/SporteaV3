/**
 * Recommendation System Monitoring Tool
 * 
 * This script monitors the recommendation system by making requests and analyzing the responses.
 * It provides detailed information about performance, scoring, and any potential issues.
 */

// Set environment variables directly in the script
const env = {
  SUPABASE_URL: "https://fcwwuiitsghknsvnsrxp.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjd3d1aWl0c2doa25zdm5zcnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2NjI4MTgsImV4cCI6MjA2MzIzODgxOH0.5IkK_9D4FZU3z_4Kpm7pRJu8rIKfKleIpxMbyr-YoBA",
  TEST_USER_EMAIL: "2022812796@student.uitm.edu.my",
  TEST_USER_PASSWORD: "Ulalala@369",
  LOG_LEVEL: "info"
};

// Import dependencies
import { createClient } from '@supabase/supabase-js';

// Create Supabase client
const supabaseUrl = env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_ANON_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test user credentials
const testUserEmail = env.TEST_USER_EMAIL;
const testUserPassword = env.TEST_USER_PASSWORD;

if (!testUserEmail || !testUserPassword) {
  console.error('Error: TEST_USER_EMAIL and TEST_USER_PASSWORD must be set');
  process.exit(1);
}

// Configure logging
const logLevel = env.LOG_LEVEL || 'info';
const logLevels = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

function log(level, ...args) {
  if (logLevels[level] >= logLevels[logLevel]) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}]`, ...args);
  }
}

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m'
};

/**
 * Monitor the recommendation system
 */
async function monitorRecommendationSystem() {
  try {
    console.log(`${colors.bold}${colors.blue}=== Recommendation System Monitor ===${colors.reset}\n`);
    
    log('info', 'Signing in test user...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testUserEmail,
      password: testUserPassword
    });
    
    if (authError) {
      throw new Error(`Authentication failed: ${authError.message}`);
    }
    
    const userId = authData.user.id;
    log('info', `Successfully signed in user: ${userId}`);
    
    // Get user profile to understand their preferences
    log('info', 'Fetching user profile...');
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (profileError) {
      log('warn', `Could not fetch profile: ${profileError.message}`);
    } else {
      log('debug', 'User profile:', profileData);
    }
    
    // Get user preferences
    log('info', 'Fetching user preferences...');
    const { data: preferencesData, error: preferencesError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (preferencesError) {
      log('warn', `Could not fetch preferences: ${preferencesError.message}`);
    } else {
      log('debug', 'User preferences:', preferencesData);
      
      if (preferencesData) {
        console.log(`\n${colors.cyan}User Preference Summary:${colors.reset}`);
        console.log(`Favorite Sports: ${preferencesData.favorite_sports?.join(', ') || 'None set'}`);
        console.log(`Preferred Venues: ${preferencesData.venue_preference?.join(', ') || 'None set'}`);
        console.log(`Available Days: ${preferencesData.available_days?.join(', ') || 'None set'}`);
        console.log(`Available Hours: ${preferencesData.available_hours?.join(', ') || 'None set'}`);
      }
    }
    
    // Run the recommendation function
    console.log(`\n${colors.cyan}Testing recommendation system...${colors.reset}`);
    console.log(`${colors.yellow}Making request to get-recommendations-light Edge Function...${colors.reset}`);
    
    const startTime = Date.now();
    const { data, error } = await supabase.functions.invoke(
      'get-recommendations-light',
      {
        body: { userId, limit: 10 }
      }
    );
    const responseTime = Date.now() - startTime;
    
    if (error) {
      throw new Error(`Function invocation failed: ${error.message}`);
    }
    
    console.log(`${colors.green}Request completed in ${responseTime}ms${colors.reset}`);
    
    if (!data || !Array.isArray(data.recommendations)) {
      throw new Error('Invalid response format: recommendations array not found');
    }
    
    const { recommendations } = data;
    console.log(`${colors.green}Received ${recommendations.length} recommendations${colors.reset}\n`);
    
    if (recommendations.length === 0) {
      console.log(`${colors.yellow}No recommendations found. This might be normal if the user has no matches.${colors.reset}`);
      console.log('Possible reasons:');
      console.log('1. User has no preferences set');
      console.log('2. No other users or games match the user\'s preferences');
      console.log('3. User is new and has no activity history');
      
      // Check if user has preferences
      if (!preferencesData || 
          !preferencesData.favorite_sports || 
          preferencesData.favorite_sports.length === 0) {
        console.log(`\n${colors.red}Issue detected: User has no favorite sports set${colors.reset}`);
        console.log('Recommendation: Add favorite sports to user preferences');
      }
      
      console.log('\nRecommendation system is working, but returned no results.');
      return;
    }
    
    // Analyze recommendations
    console.log(`${colors.bold}Recommendation Analysis:${colors.reset}\n`);
    
    // Calculate score distribution
    const scores = recommendations.map(rec => rec.score);
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    
    console.log(`Score Distribution:`);
    console.log(`- Average: ${avgScore.toFixed(2)}`);
    console.log(`- Minimum: ${minScore.toFixed(2)}`);
    console.log(`- Maximum: ${maxScore.toFixed(2)}`);
    
    // Count recommendation types
    const typeCounts = recommendations.reduce((counts, rec) => {
      counts[rec.type] = (counts[rec.type] || 0) + 1;
      return counts;
    }, {});
    
    console.log(`\nRecommendation Types:`);
    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`- ${type}: ${count} (${((count / recommendations.length) * 100).toFixed(1)}%)`);
    });
    
    // Count sports
    const sportCounts = recommendations.reduce((counts, rec) => {
      counts[rec.sport] = (counts[rec.sport] || 0) + 1;
      return counts;
    }, {});
    
    console.log(`\nSports Distribution:`);
    Object.entries(sportCounts).forEach(([sport, count]) => {
      console.log(`- ${sport}: ${count} (${((count / recommendations.length) * 100).toFixed(1)}%)`);
    });
    
    // Count venues
    const venueCounts = recommendations.reduce((counts, rec) => {
      counts[rec.venue] = (counts[rec.venue] || 0) + 1;
      return counts;
    }, {});
    
    console.log(`\nVenue Distribution:`);
    Object.entries(venueCounts).forEach(([venue, count]) => {
      console.log(`- ${venue}: ${count} (${((count / recommendations.length) * 100).toFixed(1)}%)`);
    });
    
    // Display the top 3 recommendations
    console.log(`\n${colors.bold}Top 3 Recommendations:${colors.reset}\n`);
    
    const topRecs = recommendations.slice(0, 3);
    topRecs.forEach((rec, index) => {
      console.log(`${colors.bold}Recommendation #${index + 1}:${colors.reset}`);
      console.log(`ID: ${rec.id}`);
      console.log(`Type: ${rec.type}`);
      console.log(`Sport: ${rec.sport}`);
      console.log(`Venue: ${rec.venue}`);
      console.log(`Score: ${rec.score.toFixed(2)}`);
      
      if (rec.componentScores) {
        console.log('Component Scores:');
        Object.entries(rec.componentScores).forEach(([component, score]) => {
          console.log(`  - ${component}: ${score.toFixed(2)}`);
        });
      }
      
      console.log(`Explanation: ${rec.explanation}`);
      console.log(''); // Empty line for readability
    });
    
    // Performance metrics
    console.log(`${colors.bold}Performance Metrics:${colors.reset}`);
    console.log(`- Response Time: ${responseTime}ms`);
    console.log(`- Recommendations Returned: ${recommendations.length}`);
    
    // System health check
    console.log(`\n${colors.bold}System Health:${colors.reset}`);
    
    const issues = [];
    
    // Check for missing component scores
    const missingComponentScores = recommendations.some(rec => !rec.componentScores);
    if (missingComponentScores) {
      issues.push('Some recommendations are missing component scores');
    }
    
    // Check for missing explanations
    const missingExplanations = recommendations.some(rec => !rec.explanation);
    if (missingExplanations) {
      issues.push('Some recommendations are missing explanations');
    }
    
    // Check for very low scores
    const veryLowScores = recommendations.some(rec => rec.score < 0.2);
    if (veryLowScores) {
      issues.push('Some recommendations have very low scores (< 0.2)');
    }
    
    if (issues.length > 0) {
      console.log(`${colors.yellow}Issues detected:${colors.reset}`);
      issues.forEach(issue => console.log(`- ${issue}`));
    } else {
      console.log(`${colors.green}No issues detected${colors.reset}`);
    }
    
    console.log(`\n${colors.bold}${colors.green}Recommendation System Status: WORKING CORRECTLY${colors.reset}`);
    
  } catch (error) {
    console.error(`\n${colors.red}Error: ${error.message}${colors.reset}`);
    console.error(`\n${colors.bold}${colors.red}Recommendation System Status: NOT WORKING${colors.reset}`);
    process.exit(1);
  }
}

// Run the monitor
monitorRecommendationSystem();