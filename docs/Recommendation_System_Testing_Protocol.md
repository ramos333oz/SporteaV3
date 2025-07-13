# Comprehensive Recommendation System Testing Protocol

**Date:** July 13, 2025  
**System:** Sportea Recommendation Engine  
**Implementation:** `simplifiedRecommendationService.js`  
**Test Accounts:** Omar (2022812796@student.uitm.edu.my), Azmil (2022812795@student.uitm.edu.my)

## Testing Methodology Overview

This protocol implements a 5-phase comprehensive testing approach for the Sportea recommendation system, focusing on mathematical accuracy, real-time performance, and user experience validation.

## Phase 1: Recommendation Score Calculation Testing

### 1.1 Weighted Algorithm Verification
**Algorithm:** Sports (40%) + Faculty (25%) + Skill (20%) + Schedule (10%) + Location (5%) = 100%

#### Test Case 1.1.1: Perfect Match Scenario
**Objective:** Verify 100% score for identical preferences
**Test Data:**
- User: Basketball player, Intermediate skill, ENGINEERING faculty
- Match: Basketball, Intermediate skill, ENGINEERING host
- Expected Score: 100% (40% + 25% + 20% + 10% + 5%)

#### Test Case 1.1.2: Sport-Only Match Scenario  
**Objective:** Verify sport-only matching accuracy
**Test Data:**
- User: Basketball player, Intermediate skill, ENGINEERING faculty
- Match: Basketball, Advanced skill, COMPUTER SCIENCES host
- Expected Score: 40% (sports match only)

#### Test Case 1.1.3: Zero Match Scenario
**Objective:** Verify 0% score for completely incompatible preferences
**Test Data:**
- User: Basketball player, morning availability
- Match: Football, evening time slot
- Expected Score: 0% (no compatibility)

#### Test Case 1.1.4: Partial Match Scenarios
**Objective:** Test various partial matching combinations
**Test Scenarios:**
- Sports + Faculty match: Expected 65%
- Sports + Skill match: Expected 60%
- Sports + Schedule match: Expected 50%
- Faculty + Skill match: Expected 45%

### 1.2 Cross-User Consistency Testing
**Objective:** Ensure scoring consistency across different user profiles

#### Test Case 1.2.1: Omar Profile Testing
**Profile Data:**
- Faculty: ENGINEERING
- Sport: Basketball (Intermediate)
- Available Days: Sun, Tue, Wed, Thu, Fri, Sat
- Preferred Facilities: [442107e5-4100-4f61-832f-6a95d52f4ac5, 0809935f-e8b3-4c49-8cbe-2afa341433bb]

#### Test Case 1.2.2: Azmil Profile Testing
**Profile Data:** [To be gathered during testing]

### 1.3 Edge Case Testing
**Objective:** Validate system behavior in boundary conditions

#### Test Case 1.3.1: Empty Preferences
- User with no sport preferences
- Expected: Graceful handling, no recommendations or default scoring

#### Test Case 1.3.2: Maximum Preferences
- User with all sports selected
- Expected: Broader recommendation pool with accurate scoring

#### Test Case 1.3.3: Time Boundary Testing
- Matches starting exactly at user's available time boundaries
- Expected: Accurate schedule overlap calculation

## Phase 2: Real-time Queue System Testing

### 2.1 Cache Management Testing
**Objective:** Verify 5-minute cache duration and invalidation

#### Test Case 2.1.1: Cache Duration Verification
**Steps:**
1. Load recommendations (cache miss)
2. Reload within 5 minutes (cache hit)
3. Wait >5 minutes and reload (cache miss)
**Expected:** Proper cache behavior with timing accuracy

#### Test Case 2.1.2: Manual Cache Invalidation
**Steps:**
1. Load recommendations
2. Click refresh button
3. Verify new API call made
**Expected:** Immediate cache invalidation and fresh data

### 2.2 Real-time Updates Testing
**Objective:** Verify recommendations update when data changes

#### Test Case 2.2.1: User Preference Updates
**Steps:**
1. Record current recommendations
2. Modify user sport preferences
3. Refresh recommendations
**Expected:** Updated scores reflecting new preferences

#### Test Case 2.2.2: Match Data Updates
**Steps:**
1. Record recommendations for specific match
2. Modify match details (time, location, skill level)
3. Refresh recommendations
**Expected:** Updated scores reflecting match changes

### 2.3 Performance Testing
**Objective:** Measure response times and system performance

#### Test Case 2.3.1: Response Time Measurement
**Metrics to Track:**
- Initial load time: Target <2 seconds
- Refresh time: Target <1 second
- Cache hit time: Target <500ms

#### Test Case 2.3.2: Concurrent User Testing
**Objective:** Test system performance with multiple users
**Method:** Simulate multiple user sessions requesting recommendations

## Phase 3: Data Consistency and Integration Testing

### 3.1 Frontend-Backend Alignment
**Objective:** Ensure displayed scores match calculated scores

#### Test Case 3.1.1: Score Display Verification
**Steps:**
1. Get recommendation from frontend
2. Query backend for same user/match combination
3. Manually calculate expected score
4. Compare all three values
**Expected:** 100% alignment across all sources

### 3.2 Edge Function vs Local Fallback
**Objective:** Test failover mechanisms

#### Test Case 3.2.1: Edge Function Success Path
**Steps:**
1. Verify edge function is responding
2. Request recommendations
3. Check logs for edge function usage
**Expected:** Edge function handles requests successfully

#### Test Case 3.2.2: Fallback Mechanism
**Steps:**
1. Simulate edge function failure
2. Request recommendations
3. Verify local fallback activates
**Expected:** Seamless fallback with identical results

### 3.3 Cross-System Integration
**Objective:** Test integration with other system components

#### Test Case 3.3.1: Match Creation Impact
**Steps:**
1. Record current recommendations
2. Create new match
3. Refresh recommendations
**Expected:** New match appears in recommendations if relevant

#### Test Case 3.3.2: Participant Count Updates
**Steps:**
1. Note match participant count in recommendations
2. Join/leave match
3. Refresh recommendations
**Expected:** Updated participant counts immediately

## Phase 4: User Experience and Accuracy Testing

### 4.1 Recommendation Explanation Testing
**Objective:** Verify explanation accuracy matches calculations

#### Test Case 4.1.1: Score Breakdown Verification
**Steps:**
1. Get recommendation with explanation
2. Parse explanation components
3. Verify against manual calculation
**Expected:** Explanation matches actual score breakdown

### 4.2 Perfect Match Testing
**Objective:** Verify 1.0 similarity score for perfect matches

#### Test Case 4.2.1: Identical Sport Preference
**Setup:** User and match with identical sport
**Expected:** Sports component = 40% (perfect match)

### 4.3 User Feedback Integration
**Objective:** Test feedback mechanism accuracy

#### Test Case 4.3.1: Feedback Recording
**Steps:**
1. Provide feedback on recommendation
2. Verify feedback stored correctly
3. Check if feedback affects future recommendations
**Expected:** Accurate feedback recording and processing

## Phase 5: Performance and Reliability Testing

### 5.1 Load Testing
**Objective:** Test system under various load conditions

#### Test Case 5.1.1: Database State Variations
**Scenarios:**
- Empty database: Expected graceful handling
- Full database: Expected maintained performance
- Mixed data: Expected accurate filtering

### 5.2 Error Handling Testing
**Objective:** Verify graceful error handling

#### Test Case 5.2.1: Network Failure Simulation
**Steps:**
1. Disconnect network during recommendation request
2. Verify error handling
3. Test recovery when network restored
**Expected:** Graceful degradation and recovery

### 5.3 Accuracy Under Load
**Objective:** Ensure accuracy maintained under stress

#### Test Case 5.3.1: Concurrent Calculation Accuracy
**Steps:**
1. Generate multiple simultaneous recommendation requests
2. Verify all calculations remain accurate
**Expected:** No accuracy degradation under load

## Test Execution Framework

### Data Collection Template
For each test case, record:
- **Test ID:** Unique identifier
- **Expected Result:** Calculated/predicted outcome
- **Actual Result:** System-generated outcome
- **Accuracy Percentage:** (Actual/Expected) × 100
- **Response Time:** Milliseconds
- **Error Count:** Number of errors encountered
- **Notes:** Additional observations

### Success Criteria
- **Calculation Accuracy:** ≥99%
- **Response Time:** ≤2 seconds for initial load, ≤1 second for refresh
- **Error Rate:** ≤1%
- **Cache Behavior:** 100% compliance with 5-minute duration
- **Data Consistency:** 100% frontend-backend alignment

### Reporting Format
Each test phase will generate:
1. **Summary Table:** Pass/Fail status for each test case
2. **Accuracy Metrics:** Percentage accuracy for calculations
3. **Performance Metrics:** Response times and throughput
4. **Error Analysis:** Detailed error categorization and frequency
5. **Recommendations:** Specific improvement suggestions

## Next Steps
1. Execute Phase 1 testing with current user profiles
2. Document results in standardized format
3. Proceed to Phase 2 upon Phase 1 completion
4. Generate comprehensive accuracy report
5. Apply similar methodology to other system components
