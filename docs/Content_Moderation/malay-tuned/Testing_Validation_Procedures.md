# 🧪 **TESTING & VALIDATION PROCEDURES: MALAY LANGUAGE ENHANCEMENT**

## **📋 OVERVIEW**

This document provides comprehensive testing procedures to validate the enhanced Malay language profanity detection system. The testing follows a systematic 6-phase approach to ensure reliability, accuracy, and performance compliance.

## **🎯 TESTING OBJECTIVES**

### **Primary Success Criteria:**
- ✅ **Malay "bodoh" Detection**: Improve from 0.13% to 65% toxicity
- ✅ **Malay "sial" Detection**: Improve from 0.13% to 60% toxicity  
- ✅ **English Accuracy**: Maintain 99.8% detection accuracy
- ✅ **Processing Time**: Keep under 6.0 seconds
- ✅ **Overall Malay Detection**: Achieve >70% detection rate

### **Secondary Success Criteria:**
- ✅ **System Stability**: Zero production issues during testing
- ✅ **Admin Workflow**: Proper integration with existing review process
- ✅ **User Experience**: No impact on legitimate content creators
- ✅ **Fallback Reliability**: Graceful degradation when ML services fail

## **📊 PHASE 1: BASELINE VALIDATION TESTING**

### **1.1 Pre-Enhancement Baseline**
**Objective**: Document current system performance before enhancement

| No. | Testing Description | Expected Result | Actual Result | Status |
|-----|-------------------|----------------|---------------|---------|
| 1 | **English High-Risk**: "Fuck this stupid game, you're all idiots!" | 99.8% toxicity, high risk | _To be recorded_ | ⏳ |
| 2 | **English Medium-Risk**: "This is really annoying and frustrating" | 45-60% toxicity, medium risk | _To be recorded_ | ⏳ |
| 3 | **Malay "bodoh" Baseline**: "Bodoh betul permainan ni!" | **0.13% toxicity** (current issue) | _To be recorded_ | ⏳ |
| 4 | **Malay "sial" Baseline**: "Sial punya pemain tak pandai main" | **0.13% toxicity** (current issue) | _To be recorded_ | ⏳ |
| 5 | **Processing Time Baseline**: Average processing time | <5.3 seconds | _To be recorded_ | ⏳ |

### **1.2 System Architecture Validation**
```bash
# Test current edge function
curl -X POST "https://fcwwuiitsghknsvnsrxp.supabase.co/functions/v1/moderate-match-content" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title": "Bodoh betul", "description": "Sial punya permainan"}'
```

---

## **📊 PHASE 2: ENHANCED RULE-BASED TESTING**

### **2.1 Malay Lexicon Validation**
**Objective**: Validate enhanced rule-based Malay detection

| No. | Testing Description | Expected Result | Actual Result | Status |
|-----|-------------------|----------------|---------------|---------|
| 6 | **High-Risk Malay**: "Puki betul! Babi punya permainan!" | 85-95% toxicity, high risk | _To be tested_ | ⏳ |
| 7 | **Medium-Risk "bodoh"**: "Bodoh betul permainan ni!" | **65% toxicity**, medium risk | _To be tested_ | ⏳ |
| 8 | **Medium-Risk "sial"**: "Sial punya pemain tak pandai main" | **60% toxicity**, medium risk | _To be tested_ | ⏳ |
| 9 | **Low-Risk Malay**: "Hampeh betul, tak guna punya team" | 30-40% toxicity, low risk | _To be tested_ | ⏳ |
| 10 | **Context-Aware Sports**: "Hancurkan lawan dalam permainan badminton" | <20% toxicity, minimal risk | _To be tested_ | ⏳ |

### **2.2 Context Modifier Testing**
| No. | Testing Description | Expected Result | Actual Result | Status |
|-----|-------------------|----------------|---------------|---------|
| 11 | **Intensifier Effect**: "Memang bodoh betul kau ni!" | 70-75% toxicity (higher than base) | _To be tested_ | ⏳ |
| 12 | **Target Modifier**: "Bodoh kau, sial betul!" | 70-75% toxicity (higher than base) | _To be tested_ | ⏳ |
| 13 | **Sports Context Reduction**: "Main bodoh je, kalah lawan" | 55-60% toxicity (reduced from base) | _To be tested_ | ⏳ |

---

## **📊 PHASE 3: MALAYSIAN SFW CLASSIFIER TESTING**

### **3.1 ML Model Integration Testing**
**Objective**: Validate Malaysian SFW Classifier integration

| No. | Testing Description | Expected Result | Actual Result | Status |
|-----|-------------------|----------------|---------------|---------|
| 14 | **API Connectivity**: Test Malaysian SFW Classifier API | Successful connection, valid response | _To be tested_ | ⏳ |
| 15 | **Malay Racist Content**: "Cina babi, balik tongsan!" | High toxicity, racist category | _To be tested_ | ⏳ |
| 16 | **Malay Sexist Content**: "Perempuan memang bodoh, tak pandai main" | Medium-high toxicity, sexist category | _To be tested_ | ⏳ |
| 17 | **Malay Harassment**: "Puki kau, anjing betul!" | High toxicity, harassment category | _To be tested_ | ⏳ |
| 18 | **Safe Malay Content**: "Selamat pagi, jom main badminton!" | <10% toxicity, safe category | _To be tested_ | ⏳ |

### **3.2 Fallback Mechanism Testing**
| No. | Testing Description | Expected Result | Actual Result | Status |
|-----|-------------------|----------------|---------------|---------|
| 19 | **API Timeout Simulation**: Force Malaysian SFW timeout | Graceful fallback to enhanced lexicon | _To be tested_ | ⏳ |
| 20 | **API Error Simulation**: Invalid API response | Fallback maintains detection accuracy | _To be tested_ | ⏳ |
| 21 | **Network Failure**: Simulate network connectivity issues | System continues with rule-based detection | _To be tested_ | ⏳ |

---

## **📊 PHASE 4: HYBRID DETECTION PIPELINE TESTING**

### **4.1 Language Detection Accuracy**
**Objective**: Validate intelligent routing between models

| No. | Testing Description | Expected Result | Actual Result | Status |
|-----|-------------------|----------------|---------------|---------|
| 22 | **Pure English Content**: "This is a great game, well played!" | Route to toxic-bert, maintain 99.8% accuracy | _To be tested_ | ⏳ |
| 23 | **Pure Malay Content**: "Permainan yang bagus, tahniah semua!" | Route to Malaysian SFW, proper detection | _To be tested_ | ⏳ |
| 24 | **Mixed Language**: "Great game! Tapi bodoh betul pemain tu" | Route to hybrid, detect Malay profanity | _To be tested_ | ⏳ |
| 25 | **Malay Profanity in English**: "The player is so bodoh and sial" | Detect Malay profanity, medium risk | _To be tested_ | ⏳ |

### **4.2 Model Comparison Logic**
| No. | Testing Description | Expected Result | Actual Result | Status |
|-----|-------------------|----------------|---------------|---------|
| 26 | **High Malaysian Score**: Malaysian SFW: 0.8, ToxicBert: 0.1 | Use Malaysian SFW result | _To be tested_ | ⏳ |
| 27 | **Low ToxicBert Score**: Malaysian SFW: 0.6, ToxicBert: 0.13 | Use Malaysian SFW result (fixes 0.13% issue) | _To be tested_ | ⏳ |
| 28 | **High ToxicBert Score**: Malaysian SFW: 0.3, ToxicBert: 0.9 | Use ToxicBert result | _To be tested_ | ⏳ |

---

## **📊 PHASE 5: PERFORMANCE & SCALABILITY TESTING**

### **5.1 Processing Time Validation**
**Objective**: Ensure processing time remains under 6 seconds

| No. | Testing Description | Expected Result | Actual Result | Status |
|-----|-------------------|----------------|---------------|---------|
| 29 | **Single Model Call**: English content → toxic-bert only | <5.5 seconds | _To be tested_ | ⏳ |
| 30 | **Hybrid Model Call**: Malay content → both models | <6.0 seconds | _To be tested_ | ⏳ |
| 31 | **Fallback Performance**: ML failure → rule-based only | <3.0 seconds | _To be tested_ | ⏳ |
| 32 | **Concurrent Requests**: 10 simultaneous requests | All complete within timeout | _To be tested_ | ⏳ |

### **5.2 Memory & Resource Usage**
| No. | Testing Description | Expected Result | Actual Result | Status |
|-----|-------------------|----------------|---------------|---------|
| 33 | **Memory Consumption**: Monitor edge function memory | <512MB usage | _To be tested_ | ⏳ |
| 34 | **API Rate Limits**: Test HuggingFace API limits | No rate limit errors | _To be tested_ | ⏳ |
| 35 | **Error Rate Monitoring**: Track failed requests | <1% error rate | _To be tested_ | ⏳ |

---

## **📊 PHASE 6: PRODUCTION INTEGRATION TESTING**

### **6.1 End-to-End Workflow Testing**
**Objective**: Validate complete user workflow with enhanced detection

| No. | Testing Description | Expected Result | Actual Result | Status |
|-----|-------------------|----------------|---------------|---------|
| 36 | **Match Creation with Malay Profanity**: Create match with "bodoh" | Medium risk, admin review queue | _To be tested_ | ⏳ |
| 37 | **Admin Review Interface**: Review Malay toxic content | Proper display, correct risk level | _To be tested_ | ⏳ |
| 38 | **User Notification**: Rejected Malay content | Appropriate feedback message | _To be tested_ | ⏳ |
| 39 | **Database Storage**: Malay content moderation results | Proper storage of all fields | _To be tested_ | ⏳ |
| 40 | **Legitimate Malay Content**: Safe Malay sports content | Auto-approved, no admin review | _To be tested_ | ⏳ |

### **6.2 Regression Testing**
| No. | Testing Description | Expected Result | Actual Result | Status |
|-----|-------------------|----------------|---------------|---------|
| 41 | **English High-Risk Regression**: Previous English test cases | Maintain 99.8% accuracy | _To be tested_ | ⏳ |
| 42 | **Existing Features**: All non-moderation features | No impact, full functionality | _To be tested_ | ⏳ |
| 43 | **Database Compatibility**: Existing data structures | No schema changes, full compatibility | _To be tested_ | ⏳ |
| 44 | **API Compatibility**: Frontend integration | No breaking changes | _To be tested_ | ⏳ |

---

## **🔧 TESTING EXECUTION PROCEDURES**

### **Automated Testing Script**
```javascript
// Comprehensive testing script for Malay enhancement
const testCases = [
  // Phase 2: Enhanced Rule-Based Testing
  {
    id: 7,
    input: { title: "Bodoh betul", description: "permainan ni!" },
    expected: { toxicity: 0.65, risk: "medium", model: "enhanced-malay-lexicon" },
    phase: "rule-based"
  },
  {
    id: 8,
    input: { title: "Sial punya", description: "pemain tak pandai main" },
    expected: { toxicity: 0.60, risk: "medium", model: "enhanced-malay-lexicon" },
    phase: "rule-based"
  },
  
  // Phase 3: Malaysian SFW Classifier Testing
  {
    id: 15,
    input: { title: "Racist content", description: "Cina babi, balik tongsan!" },
    expected: { toxicity: 0.85, risk: "high", category: "racist" },
    phase: "malaysian-sfw"
  },
  
  // Phase 4: Hybrid Detection Testing
  {
    id: 24,
    input: { title: "Mixed language", description: "Great game! Tapi bodoh betul pemain tu" },
    expected: { toxicity: 0.65, risk: "medium", detected_language: "mixed" },
    phase: "hybrid"
  }
];

async function runComprehensiveTests() {
  const results = [];
  
  for (const testCase of testCases) {
    console.log(`Running test ${testCase.id}: ${testCase.phase}`);
    
    const startTime = Date.now();
    const response = await fetch('/functions/v1/moderate-match-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCase.input)
    });
    
    const result = await response.json();
    const processingTime = Date.now() - startTime;
    
    const testResult = {
      id: testCase.id,
      phase: testCase.phase,
      input: testCase.input,
      expected: testCase.expected,
      actual: {
        toxicity: result.inappropriate_score,
        risk: result.overall_risk_level,
        model: result.ml_model_used,
        processing_time: processingTime
      },
      passed: validateTestResult(testCase.expected, result),
      processing_time: processingTime
    };
    
    results.push(testResult);
    console.log(`Test ${testCase.id}: ${testResult.passed ? 'PASSED' : 'FAILED'}`);
  }
  
  return generateTestReport(results);
}

function validateTestResult(expected, actual) {
  const toxicityMatch = Math.abs(expected.toxicity - actual.inappropriate_score) < 0.1;
  const riskMatch = expected.risk === actual.overall_risk_level;
  const timeValid = actual.processing_time_ms < 6000;
  
  return toxicityMatch && riskMatch && timeValid;
}
```

### **Manual Testing Checklist**
```bash
# 1. Deploy enhanced system
npx supabase functions deploy moderate-match-content --project-ref fcwwuiitsghknsvnsrxp

# 2. Run baseline tests
curl -X POST "https://fcwwuiitsghknsvnsrxp.supabase.co/functions/v1/moderate-match-content" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title": "Bodoh betul", "description": "permainan ni!"}'

# 3. Validate response
# Expected: {"inappropriate_score": 0.65, "overall_risk_level": "medium"}

# 4. Test English regression
curl -X POST "https://fcwwuiitsghknsvnsrxp.supabase.co/functions/v1/moderate-match-content" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title": "Fuck this", "description": "stupid game!"}'

# 5. Validate English accuracy maintained
# Expected: High toxicity score (>0.9), high risk
```

## **📊 SUCCESS CRITERIA VALIDATION**

### **Critical Success Metrics:**
- [ ] **"bodoh" Detection**: 0.13% → 65% ✅
- [ ] **"sial" Detection**: 0.13% → 60% ✅  
- [ ] **English Accuracy**: Maintained at 99.8% ✅
- [ ] **Processing Time**: <6.0 seconds ✅
- [ ] **System Stability**: Zero production issues ✅

### **Performance Benchmarks:**
- [ ] **Overall Malay Detection**: >70% success rate
- [ ] **False Positive Rate**: <5% for legitimate content
- [ ] **API Reliability**: >99% uptime
- [ ] **Error Handling**: Graceful fallback in 100% of failures

## **🚨 ROLLBACK CRITERIA**

**Immediate Rollback Triggers:**
1. **Processing Time**: >10 seconds average
2. **English Regression**: <95% accuracy  
3. **System Errors**: >5% error rate
4. **Production Issues**: Any user-facing errors

**Rollback Procedure:**
```bash
# Emergency rollback to previous version
git checkout HEAD~1 supabase/functions/moderate-match-content/
npx supabase functions deploy moderate-match-content --project-ref fcwwuiitsghknsvnsrxp
```

This comprehensive testing approach ensures the enhanced Malay detection system meets all requirements while maintaining system reliability and performance.
