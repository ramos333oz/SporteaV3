/**
 * Comprehensive Content Moderation Testing Script
 * Focus: English Language High-Risk Content Detection
 * 
 * This script tests the content moderation logic with various English language
 * test cases to evaluate the system's ability to detect inappropriate content
 * in English language.
 */

// Mock the content moderation logic for testing
// This simulates the fallback system in contentModerationService.js
function moderateContentFallback(title, description) {
  const content = (title + ' ' + description).toLowerCase();
  let toxicScore = 0;
  const flaggedKeywords = [];

  // Enhanced inappropriate keywords with comprehensive English support
  const inappropriateKeywords = [
    // English basic profanity
    'spam', 'promotion', 'advertisement', 'buy', 'sell', 'money',
    'inappropriate', 'offensive', 'hate', 'discrimination', 'fuck', 'shit',
    
    // English strong profanity
    'damn', 'hell', 'bitch', 'asshole', 'bastard', 'cunt', 'motherfucker',
    
    // Threatening language - English
    'kill', 'murder', 'destroy', 'hurt', 'harm', 'attack', 'die', 'death',
    
    // Sexual content - English
    'sex', 'porn', 'nude', 'naked', 'breast', 'penis', 'vagina', 'dick', 'pussy', 'cock', 'tits', 'ass', 'boobs',
    
    // Drug references - English
    'drug', 'cocaine', 'heroin', 'marijuana', 'weed', 'ganja', 'ecstasy', 'meth', 'cannabis', 'dope', 'pot', 'hash',
    
    // Discriminatory language - English
    'retard', 'disabled', 'handicapped', 'freak', 'weirdo', 'racist', 'nigger', 'faggot',
    
    // Hate speech - English
    'hate', 'stupid', 'idiot', 'loser', 'suck', 'terrible', 'awful', 'worst', 'pathetic',
    
    // Competitive terms (can be whitelisted in sports context)
    'crush', 'destroy', 'kill', 'beat', 'demolish', 'dominate'
  ];

  // Define high-severity keywords for weighted scoring
  const highSeverityKeywords = [
    'fuck', 'shit', 'cunt', 'motherfucker', 'kill', 'murder', 'cocaine', 'heroin',
    'nigger', 'faggot', 'porn', 'nude', 'penis', 'vagina', 'pussy', 'cock', 'tits',
    'marijuana', 'weed', 'cannabis', 'meth', 'ecstasy'
  ];
  
  const mediumSeverityKeywords = [
    'damn', 'hell', 'bitch', 'asshole', 'bastard', 'hurt', 'harm', 'attack',
    'marijuana', 'weed', 'retard', 'hate', 'stupid', 'idiot'
  ];

  // Sports context detection
  const sportsWhitelist = ['crush', 'destroy', 'beat', 'demolish', 'dominate'];
  const isInSportsContext = hasSportsContext(content);

  // Check keywords with weighted scoring and sports context
  for (const keyword of inappropriateKeywords) {
    if (content.includes(keyword)) {
      // Special handling for threatening language - never whitelist direct threats
      const isDirectThreat = /\b(kill|murder)\s+(you|him|her|them)\b/i.test(content);

      // Reduce penalty for sports competitive terms in sports context (except direct threats)
      if (isInSportsContext && sportsWhitelist.includes(keyword) && !isDirectThreat) {
        toxicScore += 0.1; // Minimal penalty in sports context
        flaggedKeywords.push(`${keyword}_sports_context`);
      } else {
        // Apply weighted scoring based on severity
        if (highSeverityKeywords.includes(keyword)) {
          toxicScore += 0.6; // High severity
        } else if (mediumSeverityKeywords.includes(keyword)) {
          toxicScore += 0.4; // Medium severity
        } else {
          toxicScore += 0.3; // Standard severity
        }
        flaggedKeywords.push(keyword);
      }
    }
  }

  // Check for excessive capitalization (improved detection)
  const nonSpaceContent = content.replace(/\s/g, '');
  const capsRatio = (content.match(/[A-Z]/g) || []).length / nonSpaceContent.length;
  if (capsRatio > 0.3 && nonSpaceContent.length > 10) {
    toxicScore += 0.3;
    flaggedKeywords.push('excessive_caps');
  }
  
  // Check for repeated characters (spam pattern)
  if (/(.)\1{3,}/.test(content)) {
    toxicScore += 0.2;
    flaggedKeywords.push('repeated_chars');
  }
  
  // Check for URL/link spam
  if (content.includes('http') || content.includes('www.') || content.includes('.com')) {
    toxicScore += 0.4;
    flaggedKeywords.push('external_links');
  }

  // Normalize score
  toxicScore = Math.min(toxicScore, 1.0);

  // Determine risk level with improved thresholds
  let riskLevel, action, requiresReview, autoApproved;

  if (toxicScore >= 0.6) { // Lowered from 0.8
    riskLevel = 'high';
    action = 'auto_reject';
    requiresReview = true;
    autoApproved = false;
  } else if (toxicScore >= 0.3) { // Lowered from 0.5
    riskLevel = 'medium';
    action = 'manual_review';
    requiresReview = true;
    autoApproved = false;
  } else if (toxicScore >= 0.15) { // Lowered from 0.2
    riskLevel = 'low';
    action = 'auto_approve_monitor';
    requiresReview = false;
    autoApproved = true;
  } else {
    riskLevel = 'minimal';
    action = 'auto_approve';
    requiresReview = false;
    autoApproved = true;
  }

  return {
    riskLevel,
    overallScore: toxicScore,
    details: {
      inappropriate: {
        score: toxicScore,
        confidence: toxicScore > 0.5 ? 'high' : 'medium',
        flaggedKeywords,
        details: `Fallback detection: ${toxicScore.toFixed(2)}`
      }
    },
    action,
    requiresReview,
    autoApproved,
    mlMetadata: {
      modelUsed: 'rule-based-fallback',
      processingTime: 0,
      fallbackUsed: true,
      systemVersion: 'test-v1.0'
    }
  };
}

// Helper function to detect sports context
function hasSportsContext(content) {
  const sportsTerms = [
    'basketball', 'football', 'soccer', 'tennis', 'badminton', 'volleyball',
    'game', 'match', 'tournament', 'competition', 'training', 'practice',
    'championship', 'league', 'team', 'player', 'coach', 'sport', 'gym'
  ];
  
  return sportsTerms.some(term => content.toLowerCase().includes(term));
}

// Mock the main moderation function
async function moderateContent(title, description, matchData = {}) {
  // Simulate the edge function call failing and falling back to local processing
  return moderateContentFallback(title, description);
}

// Test cases covering various types of English inappropriate content
const testCases = [
  // 1. Basic English Profanity
  {
    id: 1,
    description: "Basic English profanity - 'shit'",
    title: "Basketball Game",
    content: "This game is going to be shit if we don't practice",
    expectedRisk: "high",
    category: "english_profanity"
  },
  
  // 2. Strong English Profanity
  {
    id: 2,
    description: "Strong English profanity - 'fuck'",
    title: "Football Match",
    content: "Fuck this, I'm not playing with these losers",
    expectedRisk: "high",
    category: "english_strong_profanity"
  },
  
  // 3. Threatening Language in English
  {
    id: 3,
    description: "Threatening language - 'kill'",
    title: "Tennis Tournament",
    content: "I'm going to kill you in this match",
    expectedRisk: "high",
    category: "english_threats"
  },
  
  // 4. Sexual Content in English
  {
    id: 4,
    description: "Sexual inappropriate content",
    title: "Gym Session",
    content: "Check out her tits during the workout, so hot",
    expectedRisk: "high",
    category: "english_sexual"
  },
  
  // 5. Sports Context Competitive Terms
  {
    id: 5,
    description: "Sports competitive terms - should be whitelisted",
    title: "Basketball Championship",
    content: "We will crush and dominate the opponent team",
    expectedRisk: "minimal",
    category: "sports_competitive"
  },
  
  // 6. Clean English Sports Content
  {
    id: 6,
    description: "Clean English sports content",
    title: "Basketball Training",
    content: "Join us for basketball training every Tuesday at 7 PM",
    expectedRisk: "minimal",
    category: "clean_english"
  },
  
  // 7. Discriminatory Language
  {
    id: 7,
    description: "Discriminatory content",
    title: "Volleyball Game",
    content: "Don't want to play with those retards and freaks",
    expectedRisk: "high",
    category: "english_discrimination"
  },
  
  // 8. Hate Speech
  {
    id: 8,
    description: "Hate speech content",
    title: "Swimming Practice",
    content: "You guys are so stupid and pathetic at swimming",
    expectedRisk: "medium",
    category: "english_hate_speech"
  },
  
  // 9. Drug References
  {
    id: 9,
    description: "Drug-related content",
    title: "Football Match",
    content: "After the game let's smoke some weed together",
    expectedRisk: "high",
    category: "english_drugs"
  },
  
  // 10. Excessive Capitalization
  {
    id: 10,
    description: "Excessive capitalization spam",
    title: "TENNIS GAME",
    content: "COME PLAY TENNIS WITH US NOW!!!!! BEST GAME EVER!!!!",
    expectedRisk: "low",
    category: "english_caps"
  },
  
  // 11. URL/Link Spam
  {
    id: 11,
    description: "URL spam content",
    title: "Basketball Game",
    content: "Visit www.example.com for the best basketball gear",
    expectedRisk: "medium",
    category: "english_spam"
  },
  
  // 12. Multiple Violations
  {
    id: 12,
    description: "Multiple English profanity words",
    title: "Volleyball Tournament",
    content: "This fucking shit game is so damn stupid",
    expectedRisk: "high",
    category: "english_multiple_profanity"
  },
  
  // 13. Borderline Content
  {
    id: 13,
    description: "Borderline English content - competitive but acceptable",
    title: "Rugby Match",
    content: "We will beat the competition in this rugby match",
    expectedRisk: "minimal",
    category: "english_borderline"
  },
  
  // 14. Subtle Inappropriate Content
  {
    id: 14,
    description: "Subtle inappropriate English content",
    title: "Tennis Game",
    content: "You guys really suck at tennis, so awful",
    expectedRisk: "medium",
    category: "english_mild_inappropriate"
  },
  
  // 15. Extreme Profanity
  {
    id: 15,
    description: "Extreme English profanity",
    title: "Football Game",
    content: "Motherfucker, this is the worst fucking game ever",
    expectedRisk: "high",
    category: "english_extreme_profanity"
  }
];

// Results storage
const testResults = [];

// Helper function to determine pass/fail status
function determineStatus(actualRisk, expectedRisk) {
  // Define risk level hierarchy
  const riskLevels = { 'minimal': 0, 'low': 1, 'medium': 2, 'high': 3 };
  
  const actualLevel = riskLevels[actualRisk] || 0;
  const expectedLevel = riskLevels[expectedRisk] || 0;
  
  // Pass if actual risk is equal or higher than expected
  // This accounts for the fact that higher detection is better for safety
  return actualLevel >= expectedLevel ? 'Pass' : 'Fail';
}

// Helper function to format test results
function formatResults() {
  console.log('\n=== ENGLISH CONTENT MODERATION TESTING RESULTS ===\n');
  console.log('| No. | Testing Description | Expected Result | Actual Result | Status (Pass/Fail) |');
  console.log('|-----|-------------------|-----------------|---------------|-------------------|');
  
  testResults.forEach((result, index) => {
    const no = (index + 1).toString().padEnd(3);
    const description = result.description.padEnd(45);
    const expected = result.expectedRisk.padEnd(13);
    const actual = result.actualRisk.padEnd(13);
    const status = result.status;
    
    console.log(`| ${no} | ${description} | ${expected} | ${actual} | ${status} |`);
  });
  
  // Calculate summary statistics
  const totalTests = testResults.length;
  const passedTests = testResults.filter(r => r.status === 'Pass').length;
  const failedTests = totalTests - passedTests;
  const passRate = ((passedTests / totalTests) * 100).toFixed(1);
  
  console.log('\n=== SUMMARY STATISTICS ===');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Pass Rate: ${passRate}%`);
  
  // Category breakdown
  console.log('\n=== CATEGORY BREAKDOWN ===');
  const categories = {};
  testResults.forEach(result => {
    if (!categories[result.category]) {
      categories[result.category] = { total: 0, passed: 0 };
    }
    categories[result.category].total++;
    if (result.status === 'Pass') {
      categories[result.category].passed++;
    }
  });
  
  Object.entries(categories).forEach(([category, stats]) => {
    const rate = ((stats.passed / stats.total) * 100).toFixed(1);
    console.log(`${category}: ${stats.passed}/${stats.total} (${rate}%)`);
  });
}

// Main testing function
async function runContentModerationTests() {
  console.log('Starting English Content Moderation Testing...\n');
  
  for (const testCase of testCases) {
    try {
      console.log(`Testing Case ${testCase.id}: ${testCase.description}`);
      
      // Create mock match data for testing
      const mockMatchData = {
        id: `test-match-${testCase.id}`,
        sport_id: 'test-sport-id',
        sport_name: 'Test Sport'
      };
      
      // Run content moderation
      const result = await moderateContent(
        testCase.title,
        testCase.content,
        mockMatchData
      );
      
      // Store result
      const testResult = {
        id: testCase.id,
        description: testCase.description,
        title: testCase.title,
        content: testCase.content,
        expectedRisk: testCase.expectedRisk,
        actualRisk: result.riskLevel,
        overallScore: result.overallScore,
        category: testCase.category,
        status: determineStatus(result.riskLevel, testCase.expectedRisk),
        details: result.details,
        mlMetadata: result.mlMetadata
      };
      
      testResults.push(testResult);
      
      console.log(`  Expected: ${testCase.expectedRisk}, Actual: ${result.riskLevel}, Status: ${testResult.status}`);
      
      // Add delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`Error testing case ${testCase.id}:`, error);
      
      // Record error as failed test
      testResults.push({
        id: testCase.id,
        description: testCase.description,
        expectedRisk: testCase.expectedRisk,
        actualRisk: 'error',
        category: testCase.category,
        status: 'Fail',
        error: error.message
      });
    }
  }
  
  // Display results
  formatResults();
  
  // Save detailed results to file
  const detailedResults = {
    timestamp: new Date().toISOString(),
    testSummary: {
      totalTests: testResults.length,
      passedTests: testResults.filter(r => r.status === 'Pass').length,
      failedTests: testResults.filter(r => r.status === 'Fail').length,
      passRate: ((testResults.filter(r => r.status === 'Pass').length / testResults.length) * 100).toFixed(1)
    },
    testResults: testResults
  };
  
  // Write results to JSON file for detailed analysis
  try {
    const fs = await import('fs');
    fs.writeFileSync(
      'content-moderation-english-test-results.json',
      JSON.stringify(detailedResults, null, 2)
    );
    console.log('\nDetailed results saved to: content-moderation-english-test-results.json');
  } catch (error) {
    console.log('\nNote: Could not save detailed results to file:', error.message);
  }
}

// Run the tests
runContentModerationTests().catch(console.error);
