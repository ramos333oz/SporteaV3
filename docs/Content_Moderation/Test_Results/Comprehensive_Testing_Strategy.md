# Comprehensive Testing Strategy
## Toxic-BERT ML Integration and Risk-Based Workflow Validation Protocol

### Overview

This document outlines a systematic testing approach for validating the **toxic-bert ML model integration** and **risk-based workflow implementation** in SporteaV3's content moderation system. The strategy includes 44+ specific test scenarios, ML model verification, and production-ready validation protocols.

### Testing Objectives

1. **ML Model Integration**: Validate toxic-bert model accuracy and API integration
2. **Risk-Based Workflow**: Verify automated visibility controls based on toxicity levels
3. **Educational Environment Protection**: Ensure high-risk content is automatically hidden
4. **User Experience**: Validate transparent feedback and notification systems
5. **Production Readiness**: Confirm system reliability and performance standards
6. **Fallback System**: Verify rule-based backup when ML services unavailable

## Phase 1: ML Model Integration Testing

### 1.1 Toxic-BERT Model Verification

**Test Scenarios (ML Model Validation):**

| No. | Testing Description | Content Type | Expected Result | Validation Metric |
|-----|-------------------|--------------|-----------------|-------------------|
| 1 | **Hugging Face API Integration** | Direct API connectivity test | Successful connection | API Response Time |
| 2 | **Response Parsing Verification** | Nested array format handling | Correct score extraction | Parsing Accuracy |
| 3 | **Extreme Toxicity Detection** | "fuck this shit" explicit profanity | 80%+ toxicity score | ML Accuracy |
| 4 | **High Toxicity Classification** | "You are stupid and I hate you" | 80%+ toxicity score | Detection Precision |
| 5 | **Clean Content Verification** | "This is a nice day" | <20% toxicity score | False Positive Rate |
| 6 | **Mixed Profanity Detection** | "fucking assholes and bitches" | 90%+ toxicity score | Compound Detection |
| 7 | **Censored Content Handling** | "f*** and s*** words" | Variable toxicity score | Censorship Impact |
| 8 | **Model Fallback Testing** | API unavailable simulation | Rule-based activation | Fallback Reliability |
| 9 | **Processing Performance** | ML model response time | <10s processing time | Performance Benchmark |
| 10 | **Label Case Sensitivity** | Lowercase "toxic" label | Correct label matching | Label Processing |

### 1.2 ML Model Integration Test Script

```javascript
// Toxic-BERT Model Integration Validation Script
async function validateToxicBertIntegration() {
  const testCases = [
    {
      id: 'ml_001',
      content: 'fuck this shit',
      expected_toxicity: 0.90,
      expected_risk: 'high',
      test_type: 'extreme_profanity'
    },
    {
      id: 'ml_002',
      content: 'You are stupid and I hate you',
      expected_toxicity: 0.85,
      expected_risk: 'high',
      test_type: 'harassment'
    },
    {
      id: 'ml_003',
      content: 'This is a nice day',
      expected_toxicity: 0.05,
      expected_risk: 'minimal',
      test_type: 'clean_content'
    },
    {
      id: 'ml_004',
      content: 'fucking assholes and bitches',
      expected_toxicity: 0.95,
      expected_risk: 'high',
      test_type: 'compound_profanity'
    }
  ];

  const results = [];

  for (const testCase of testCases) {
    const startTime = Date.now();

    // Test direct Hugging Face API call
    const apiResponse = await fetch('https://api-inference.huggingface.co/models/unitary/toxic-bert', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: testCase.content })
    });

    const apiResult = await apiResponse.json();
    const processingTime = Date.now() - startTime;

    // Extract toxic score from nested array response
    const predictions = Array.isArray(apiResult[0]) ? apiResult[0] : apiResult;
    const toxicResult = predictions.find(r => r.label === 'toxic');
    const toxicScore = toxicResult?.score || 0;

    results.push({
      test_id: testCase.id,
      content: testCase.content,
      expected_toxicity: testCase.expected_toxicity,
      actual_toxicity: toxicScore,
      expected_risk: testCase.expected_risk,
      actual_risk: classifyRiskLevel(toxicScore),
      processing_time_ms: processingTime,
      api_success: apiResponse.ok,
      accuracy_within_range: Math.abs(toxicScore - testCase.expected_toxicity) < 0.15,
      test_type: testCase.test_type
    });
  }

  return calculateMLMetrics(results);
}

function classifyRiskLevel(toxicScore) {
  if (toxicScore >= 0.8) return 'high';
  if (toxicScore >= 0.5) return 'medium';
  if (toxicScore >= 0.2) return 'low';
  return 'minimal';
}

function calculateMLMetrics(results) {
  const totalTests = results.length;
  const successfulAPICalls = results.filter(r => r.api_success).length;
  const accurateClassifications = results.filter(r => r.accuracy_within_range).length;

  return {
    api_success_rate: successfulAPICalls / totalTests,
    classification_accuracy: accurateClassifications / totalTests,
    avg_processing_time: results.reduce((sum, r) => sum + r.processing_time_ms, 0) / totalTests,
    ml_integration_date: new Date().toISOString(),
    detailed_results: results
  };
}
```

## Phase 2: Risk-Based Workflow Testing

### 2.1 Automated Visibility Control Validation

**Test Scenarios (Risk-Based Workflow):**

| No. | Testing Description | Content Toxicity | Expected Behavior | Success Criteria |
|-----|-------------------|------------------|-------------------|------------------|
| 11 | **HIGH RISK Auto-Hiding** | 80%+ toxicity content | Automatically hidden from public | Match status: cancelled, not in upcoming |
| 12 | **HIGH RISK Notification** | High-risk content creation | Detailed user notification | Notification with toxicity percentage |
| 13 | **MEDIUM RISK Visibility** | 50-80% toxicity content | Visible while under review | Match in upcoming, admin queue entry |
| 14 | **LOW RISK Auto-Approval** | 20-50% toxicity content | Auto-approved with monitoring | Match visible, minimal intervention |
| 15 | **MINIMAL RISK Processing** | 0-20% toxicity content | Immediate approval | No delays, no admin review |
| 16 | **Database Status Updates** | Various risk levels | Proper field updates | moderation_status field accuracy |
| 17 | **Admin Queue Priority** | High-risk content | Urgent priority assignment | Priority: urgent for high-risk |
| 18 | **Rejection Reason Logging** | High-risk rejection | Detailed reason storage | rejection_reason field populated |
| 19 | **Toxic Words Detection** | Profanity identification | Individual words flagged | flagged_content.toxic_words array |
| 20 | **Frontend Tab Organization** | Cancelled matches | Proper categorization | High-risk in cancelled tab only |

### 2.2 Risk-Based Workflow Test Script

```javascript
// Risk-Based Workflow Validation Script
async function validateRiskBasedWorkflow() {
  const workflowTests = [
    {
      scenario: 'high_risk_auto_hiding',
      content: {
        title: 'HIGH RISK TEST - You fucking assholes and bitches come play',
        description: 'Testing HIGH RISK workflow. All you stupid motherfuckers and dumb bitches better show up!',
        sport_id: 'volleyball'
      },
      expected_toxicity: 0.95,
      expected_status: 'cancelled',
      expected_visibility: 'hidden',
      expected_notification: true
    },
    {
      scenario: 'medium_risk_visibility',
      content: {
        title: 'MEDIUM RISK TEST - Competitive players only, no weak players',
        description: 'Looking for serious players only. Don\'t join if you\'re a loser.',
        sport_id: 'basketball'
      },
      expected_toxicity: 0.60,
      expected_status: 'upcoming',
      expected_visibility: 'visible',
      expected_notification: false
    },
    {
      scenario: 'minimal_risk_approval',
      content: {
        title: 'Clean Basketball Match',
        description: 'Looking for friendly basketball players for a fun match.',
        sport_id: 'basketball'
      },
      expected_toxicity: 0.05,
      expected_status: 'upcoming',
      expected_visibility: 'visible',
      expected_notification: false
    }
  ];

  const results = [];

  for (const test of workflowTests) {
    // Create match through frontend
    const matchCreationResult = await createMatchThroughFrontend(test.content);

    // Wait for moderation to complete
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Check database results
    const moderationResult = await getModerationResult(matchCreationResult.match_id);
    const matchStatus = await getMatchStatus(matchCreationResult.match_id);
    const notifications = await getUserNotifications(matchCreationResult.user_id);

    // Check frontend visibility
    const frontendVisibility = await checkFrontendVisibility(
      matchCreationResult.match_id,
      test.expected_visibility
    );

    results.push({
      scenario: test.scenario,
      match_id: matchCreationResult.match_id,
      actual_toxicity: moderationResult.inappropriate_score,
      expected_toxicity: test.expected_toxicity,
      actual_status: matchStatus.status,
      expected_status: test.expected_status,
      actual_visibility: frontendVisibility.visible ? 'visible' : 'hidden',
      expected_visibility: test.expected_visibility,
      notification_received: notifications.length > 0,
      expected_notification: test.expected_notification,
      workflow_success: validateWorkflowBehavior(test, {
        toxicity: moderationResult.inappropriate_score,
        status: matchStatus.status,
        visibility: frontendVisibility.visible,
        notification: notifications.length > 0
      })
    });
  }

  return results;
}

function validateWorkflowBehavior(expected, actual) {
  const toxicityMatch = Math.abs(actual.toxicity - expected.expected_toxicity) < 0.2;
  const statusMatch = actual.status === expected.expected_status;
  const visibilityMatch = (actual.visibility && expected.expected_visibility === 'visible') ||
                         (!actual.visibility && expected.expected_visibility === 'hidden');
  const notificationMatch = actual.notification === expected.expected_notification;

  return toxicityMatch && statusMatch && visibilityMatch && notificationMatch;
}
```

## Phase 3: Frontend Integration Testing

### 3.1 User Experience and Interface Validation

**Frontend Integration Scenarios:**

| No. | Testing Description | User Action | Expected Result | UX Validation |
|-----|-------------------|-------------|-----------------|---------------|
| 21 | **Match Creation Flow** | Create match with toxic content | Smooth creation, post-moderation | No workflow interruption |
| 22 | **Loading States** | Submit match creation form | "Creating..." button with spinner | Visual feedback during processing |
| 23 | **Upcoming List Filtering** | View upcoming matches | High-risk matches excluded | Only safe content visible |
| 24 | **Cancelled Tab Organization** | Check cancelled tab | High-risk matches categorized | Proper match organization |
| 25 | **Notification Badge** | Receive violation notification | Badge shows unread count | Real-time notification updates |
| 26 | **Notification Panel** | Click notification badge | Detailed violation message | Clear policy explanation |
| 27 | **Tab Navigation** | Switch between match tabs | Smooth transitions | Correct content filtering |
| 28 | **Match Status Display** | View match details | Accurate information display | Complete match information |
| 29 | **Responsive Design** | Use on different devices | Consistent experience | Cross-device compatibility |
| 30 | **Error Handling** | Moderation service failure | Graceful error handling | User-friendly error messages |

### 3.2 Frontend Integration Test Script

```javascript
// Frontend Integration Validation Script using Playwright
async function validateFrontendIntegration() {
  const frontendTests = [
    {
      scenario: 'high_risk_match_creation',
      actions: [
        'navigate_to_host_page',
        'select_volleyball_sport',
        'enter_toxic_title',
        'enter_toxic_description',
        'select_location',
        'accept_terms',
        'create_match'
      ],
      expected_outcomes: {
        creation_success: true,
        notification_received: true,
        match_hidden_from_upcoming: true,
        match_in_cancelled_tab: true
      }
    },
    {
      scenario: 'medium_risk_match_creation',
      actions: [
        'navigate_to_host_page',
        'select_basketball_sport',
        'enter_medium_risk_title',
        'enter_medium_risk_description',
        'select_location',
        'accept_terms',
        'create_match'
      ],
      expected_outcomes: {
        creation_success: true,
        notification_received: false,
        match_visible_in_upcoming: true,
        admin_queue_entry: true
      }
    }
  ];

  const results = [];

  for (const test of frontendTests) {
    const browser = await playwright.chromium.launch();
    const page = await browser.newPage();

    try {
      // Execute test actions
      for (const action of test.actions) {
        await executePlaywrightAction(page, action, test.scenario);
      }

      // Wait for processing
      await page.waitForTimeout(15000);

      // Validate outcomes
      const outcomes = await validateTestOutcomes(page, test.expected_outcomes);

      results.push({
        scenario: test.scenario,
        actions_completed: test.actions.length,
        expected_outcomes: test.expected_outcomes,
        actual_outcomes: outcomes,
        test_success: compareOutcomes(test.expected_outcomes, outcomes),
        screenshots: await captureTestScreenshots(page)
      });

    } catch (error) {
      results.push({
        scenario: test.scenario,
        error: error.message,
        test_success: false
      });
    } finally {
      await browser.close();
    }
  }

  return results;
}

async function executePlaywrightAction(page, action, scenario) {
  switch (action) {
    case 'navigate_to_host_page':
      await page.goto('http://localhost:3000/host');
      break;
    case 'select_volleyball_sport':
      await page.click('[data-testid="sport-volleyball"]');
      break;
    case 'enter_toxic_title':
      await page.fill('[data-testid="match-title"]', 'HIGH RISK TEST - You fucking assholes and bitches come play');
      break;
    case 'enter_toxic_description':
      await page.fill('[data-testid="match-description"]', 'Testing HIGH RISK workflow. All you stupid motherfuckers and dumb bitches better show up!');
      break;
    // ... additional actions
  }
}
```

## Phase 4: Database Verification Testing

### 4.1 Database Schema and Data Integrity Validation

```javascript
// Database Verification Script
async function validateDatabaseIntegration() {
  const dbTests = [
    {
      test_name: 'enhanced_matches_table',
      query: `SELECT moderation_status, rejection_reason, review_reason
              FROM matches WHERE title LIKE '%HIGH RISK TEST%'`,
      expected_fields: ['moderation_status', 'rejection_reason', 'review_reason'],
      validation: 'schema_exists'
    },
    {
      test_name: 'content_moderation_results',
      query: `SELECT inappropriate_score, overall_risk_level, ml_model_used, flagged_content
              FROM content_moderation_results
              WHERE match_id IN (SELECT id FROM matches WHERE title LIKE '%HIGH RISK TEST%')`,
      expected_values: {
        inappropriate_score: '>0.9',
        overall_risk_level: 'high',
        ml_model_used: 'unitary/toxic-bert'
      },
      validation: 'data_accuracy'
    },
    {
      test_name: 'admin_review_queue',
      query: `SELECT priority, status, admin_decision
              FROM admin_review_queue
              WHERE match_id IN (SELECT id FROM matches WHERE title LIKE '%HIGH RISK TEST%')`,
      expected_values: {
        priority: 'urgent',
        status: 'pending'
      },
      validation: 'queue_management'
    },
    {
      test_name: 'notification_system',
      query: `SELECT type, title, message, read_status
              FROM host_notifications
              WHERE user_id = $1 AND message LIKE '%toxicity detected%'`,
      expected_values: {
        type: 'content_violation',
        read_status: false
      },
      validation: 'notification_delivery'
    }
  ];

  const results = [];

  for (const test of dbTests) {
    try {
      const queryResult = await executeQuery(test.query);

      const validation = await validateDatabaseResult(
        queryResult,
        test.expected_fields,
        test.expected_values,
        test.validation
      );

      results.push({
        test_name: test.test_name,
        query_success: true,
        rows_returned: queryResult.rows.length,
        validation_passed: validation.passed,
        validation_details: validation.details,
        data_sample: queryResult.rows[0] || null
      });

    } catch (error) {
      results.push({
        test_name: test.test_name,
        query_success: false,
        error: error.message,
        validation_passed: false
      });
    }
  }

  return results;
}

async function validateDatabaseResult(queryResult, expectedFields, expectedValues, validationType) {
  switch (validationType) {
    case 'schema_exists':
      return validateSchemaExists(queryResult, expectedFields);
    case 'data_accuracy':
      return validateDataAccuracy(queryResult, expectedValues);
    case 'queue_management':
      return validateQueueManagement(queryResult, expectedValues);
    case 'notification_delivery':
      return validateNotificationDelivery(queryResult, expectedValues);
    default:
      return { passed: false, details: 'Unknown validation type' };
  }
}
```

### 4.2 Success Criteria Validation

**Target Metrics for ML Integration:**
- **ML Model Accuracy**: ≥95% for explicit profanity detection
- **Risk Classification**: 100% accuracy for high-risk content (80%+ toxicity)
- **Automated Workflow**: High-risk content automatically hidden
- **User Notifications**: Detailed feedback with toxicity percentages
- **Database Integration**: Complete schema support with proper indexing
- **Frontend Integration**: Seamless user experience with real-time updates

### 4.3 Automated Validation Report

```javascript
// ML Integration Test Report Generation
function generateMLValidationReport(testResults) {
  const report = {
    test_date: new Date().toISOString(),
    system_version: 'SporteaV3-ML-Integrated',
    ml_model: 'unitary/toxic-bert',
    overall_success: true,
    phase_results: {},
    recommendations: []
  };

  // Validate each phase
  const phases = [
    {
      name: 'ML Model Integration',
      tests: testResults.ml_integration,
      success_criteria: {
        api_success_rate: 0.95,
        classification_accuracy: 0.90,
        max_processing_time: 10000
      }
    },
    {
      name: 'Risk-Based Workflow',
      tests: testResults.workflow_validation,
      success_criteria: {
        high_risk_hiding: 1.0,
        notification_delivery: 1.0,
        status_accuracy: 1.0
      }
    },
    {
      name: 'Frontend Integration',
      tests: testResults.frontend_validation,
      success_criteria: {
        ui_responsiveness: 1.0,
        error_handling: 1.0,
        user_experience: 1.0
      }
    },
    {
      name: 'Database Verification',
      tests: testResults.database_validation,
      success_criteria: {
        schema_integrity: 1.0,
        data_accuracy: 1.0,
        performance: 1.0
      }
    }
  ];

  phases.forEach(phase => {
    const phaseResult = validatePhaseResults(phase.tests, phase.success_criteria);
    report.phase_results[phase.name] = phaseResult;

    if (!phaseResult.passed) {
      report.overall_success = false;
      report.recommendations.push(...phaseResult.recommendations);
    }
  });

  // Generate final assessment
  report.final_assessment = {
    production_ready: report.overall_success,
    critical_issues: report.recommendations.filter(r => r.includes('CRITICAL')),
    minor_issues: report.recommendations.filter(r => !r.includes('CRITICAL')),
    next_steps: generateNextSteps(report.overall_success)
  };

  return report;
}

function validatePhaseResults(tests, criteria) {
  const results = {
    passed: true,
    test_count: tests.length,
    success_count: tests.filter(t => t.test_success).length,
    recommendations: []
  };

  // Calculate success rate
  results.success_rate = results.success_count / results.test_count;

  // Check against criteria
  Object.keys(criteria).forEach(criterion => {
    const threshold = criteria[criterion];
    const actual = calculateCriterionValue(tests, criterion);

    if (actual < threshold) {
      results.passed = false;
      results.recommendations.push(
        `${criterion}: Expected ${threshold}, Got ${actual.toFixed(3)}`
      );
    }
  });

  return results;
}
```

## Phase 5: User Experience Testing

### 5.1 Complete User Journey Validation

**User Experience Test Scenarios:**

| No. | Testing Description | User Journey | Expected Experience | Success Criteria |
|-----|-------------------|--------------|-------------------|------------------|
| 31 | **High-Risk Content Creator** | Create toxic match → receive notification → understand violation | Clear policy education | User understands guidelines |
| 32 | **Medium-Risk Content Creator** | Create borderline content → see review notice → await decision | Transparent process | User aware of review status |
| 33 | **Clean Content Creator** | Create appropriate match → immediate approval → normal flow | Seamless experience | No delays or interruptions |
| 34 | **Notification Interaction** | Click violation notification → view details → learn guidelines | Educational feedback | Clear next steps provided |
| 35 | **Match Restoration** | Attempt to restore cancelled match → understand process | Proper workflow | Restoration options available |
| 36 | **Policy Learning** | Receive violation → create new appropriate content | Behavior improvement | Better content creation |
| 37 | **System Transparency** | Understand moderation decisions → see toxicity scores | Clear reasoning | Transparent feedback |
| 38 | **Workflow Efficiency** | Regular users experience minimal friction | Smooth operation | No unnecessary delays |

### 5.2 Production Monitoring and Maintenance

**Ongoing Validation Requirements:**
- **Daily ML Model Performance**: Monitor toxic-bert API response times and accuracy
- **Weekly Risk Classification Review**: Analyze high/medium/low risk distribution
- **Monthly User Feedback Analysis**: Review notification effectiveness and user behavior
- **Quarterly Educational Compliance Audit**: Ensure university environment standards maintained

### 5.3 System Health Monitoring

**Automated Health Checks:**
```javascript
// Production Health Monitoring Script
async function performHealthCheck() {
  const healthMetrics = {
    ml_model_status: await checkToxicBertAPI(),
    database_performance: await checkDatabasePerformance(),
    frontend_responsiveness: await checkFrontendPerformance(),
    notification_delivery: await checkNotificationSystem(),
    admin_queue_processing: await checkAdminQueueHealth()
  };

  const overallHealth = calculateOverallHealth(healthMetrics);

  if (overallHealth.status === 'critical') {
    await triggerAlerts(overallHealth.issues);
  }

  return overallHealth;
}
```

### 5.4 Rollback and Recovery Procedures

**Automatic Rollback Triggers:**
- **ML Model Failure**: >50% API failures for 5+ minutes
- **Classification Accuracy Drop**: >20% decrease in toxicity detection accuracy
- **Database Performance**: >10s average query response time
- **User Experience Impact**: >30% increase in user complaints
- **Educational Compliance**: Any explicit content not properly flagged

**Recovery Procedures:**
1. **Immediate Fallback**: Switch to rule-based moderation system
2. **Service Restoration**: Investigate and fix ML model integration issues
3. **Data Validation**: Verify all moderation decisions during downtime
4. **User Communication**: Notify affected users of any delayed moderation decisions

## Phase 6: Malay Language Multilingual Testing

### 6.1 Malay Language Content Validation

**Malay Language Test Scenarios:**

| No. | Testing Description | Content Type | Expected Result | Validation Metric |
|-----|-------------------|--------------|-----------------|-------------------|
| 39 | **Low-Risk Malay Competitive Language** | "hancurkan lawan", "dominasi" | Minimal risk classification | ML Processing Accuracy |
| 40 | **Medium-Risk Malay Profanity** | "bodoh", "sial", "tak berguna" | Medium risk classification | Malay Detection Rate |
| 41 | **High-Risk Malay Explicit Content** | "puki", "babi", "kontol", "pukimak" | High risk classification | Explicit Content Detection |
| 42 | **Mixed Language Content** | English + Malay profanity | Appropriate risk level | Multilingual Processing |
| 43 | **Malay Cultural Context** | Sports-specific Malay terms | Cultural sensitivity | Context Awareness |
| 44 | **Malay Character Encoding** | Unicode Malay characters | Proper text processing | Character Support |
| 45 | **Malay Notification System** | Violation notifications in context | Appropriate user feedback | User Experience |
| 46 | **Database Malay Storage** | Malay toxic words in flagged_content | Proper data storage | Data Integrity |

### 6.2 Multilingual Integration Test Script

```javascript
// Malay Language Content Moderation Validation Script
async function validateMalayLanguageSupport() {
  const malayTests = [
    {
      scenario: 'low_risk_malay_competitive',
      content: {
        title: 'MALAY LOW-RISK TEST - Hancurkan Lawan Badminton',
        description: 'Mari hancurkan lawan dengan smash yang kuat! Tunjukkan kehebatan dan dominasi dalam permainan badminton.',
        sport_id: 'badminton'
      },
      expected_toxicity: 0.20,
      expected_risk: 'minimal',
      test_type: 'competitive_language'
    },
    {
      scenario: 'medium_risk_malay_profanity',
      content: {
        title: 'MALAY MEDIUM-RISK TEST - Bodoh Sial Permainan Football',
        description: 'Sial betul permainan ni! Bodoh punya pemain yang tak pandai main. Jangan join kalau korang lemah dan tak berguna.',
        sport_id: 'football'
      },
      expected_toxicity: 0.60,
      expected_risk: 'medium',
      test_type: 'moderate_profanity'
    },
    {
      scenario: 'high_risk_malay_explicit',
      content: {
        title: 'MALAY HIGH-RISK TEST - Puki Babi Kontol',
        description: 'Pukimak betul! Semua pemain ni babi dan kontol. Puki korang semua tak pandai main!',
        sport_id: 'volleyball'
      },
      expected_toxicity: 0.85,
      expected_risk: 'high',
      test_type: 'explicit_profanity'
    }
  ];

  const results = [];

  for (const test of malayTests) {
    // Create match through frontend with Playwright
    const matchResult = await createMalayMatchThroughFrontend(test.content);

    // Wait for ML processing
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Analyze moderation results
    const moderationResult = await getModerationResult(matchResult.match_id);
    const frontendVisibility = await checkMalayContentVisibility(matchResult.match_id);

    results.push({
      scenario: test.scenario,
      content_language: 'malay',
      actual_toxicity: moderationResult.inappropriate_score,
      expected_toxicity: test.expected_toxicity,
      actual_risk: moderationResult.overall_risk_level,
      expected_risk: test.expected_risk,
      ml_model_used: moderationResult.ml_model_used,
      malay_words_detected: moderationResult.flagged_content.toxic_words,
      frontend_visibility: frontendVisibility.visible,
      character_encoding_success: validateMalayCharacters(test.content),
      test_success: validateMalayTestResult(test, moderationResult, frontendVisibility)
    });
  }

  return calculateMalayLanguageMetrics(results);
}

function validateMalayCharacters(content) {
  // Check for proper Unicode support of Malay characters
  const malayCharacters = /[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/g;
  const titleSupport = content.title.match(malayCharacters) !== null;
  const descriptionSupport = content.description.match(malayCharacters) !== null;

  return {
    title_encoding: titleSupport || !content.title.match(malayCharacters),
    description_encoding: descriptionSupport || !content.description.match(malayCharacters),
    overall_support: true // Basic Latin characters work for Malay
  };
}

function calculateMalayLanguageMetrics(results) {
  const totalTests = results.length;
  const successfulTests = results.filter(r => r.test_success).length;
  const mlProcessingSuccess = results.filter(r => r.ml_model_used === 'unitary/toxic-bert').length;

  return {
    malay_test_success_rate: successfulTests / totalTests,
    ml_processing_rate: mlProcessingSuccess / totalTests,
    character_encoding_success: results.every(r => r.character_encoding_success.overall_support),
    malay_detection_capabilities: {
      competitive_language: results.find(r => r.scenario.includes('competitive')),
      moderate_profanity: results.find(r => r.scenario.includes('medium')),
      explicit_content: results.find(r => r.scenario.includes('high'))
    },
    enhancement_recommendations: generateMalayEnhancementRecommendations(results)
  };
}
```

### 6.3 Multilingual Success Criteria

**Malay Language Validation Requirements:**
- **Text Processing**: 100% success rate for Malay character encoding
- **ML Integration**: toxic-bert processes Malay content without errors
- **Database Support**: Complete Unicode support for Malay text storage
- **Frontend Display**: Proper rendering of Malay content in all UI components
- **Workflow Consistency**: Risk-based workflow operates regardless of language
- **Enhancement Opportunities**: Identify areas for Malay-specific improvements

### 6.4 Multilingual Enhancement Recommendations

**Based on Testing Results:**
1. **Hybrid Detection Approach**: Combine ML model with Malay-specific rule sets
2. **Language-Specific Thresholds**: Adjust risk thresholds based on language detection capabilities
3. **Cultural Context Awareness**: Enhance system understanding of Malay cultural expressions
4. **Community Feedback Integration**: Implement user reporting for missed Malay profanity
5. **Regular Model Updates**: Monitor and update ML model training for better multilingual support

This comprehensive testing strategy ensures the toxic-bert ML integration and risk-based workflow meet all requirements while maintaining the highest standards for educational environment safety, user experience, and multilingual content support.
