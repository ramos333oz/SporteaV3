# Edge Functions Cleanup Testing Guide

## Overview

This guide provides comprehensive testing procedures to verify the Supabase edge functions cleanup was successful and the recommendation system continues to work correctly.

## Pre-Cleanup Testing (Baseline)

### Current System Status ✅
- **Recommendation System**: Working with similarity percentages (37%, 24%, 9%, 2%)
- **Vector Generation**: User embeddings generated successfully
- **Mathematical Accuracy**: Cosine similarity calculations functional
- **Performance**: <2ms response time maintained

### Console Verification
```
[LOG] [Sportea Recommendation Service] Using simplified vector-based recommendation system
[LOG] [Sportea Recommendation Service] Received simplified vector recommendations {count: 4}
[LOG] [Sportea Recommendation Service] User embedding generated successfully
```

## Post-Cleanup Testing Protocol

### Phase 1: Function Deployment Verification

#### 1.1 Check Deployed Functions
```bash
# Using Supabase CLI
supabase functions list --project-ref fcwwuiitsghknsvnsrxp
```

**Expected Result**: Only 4 functions should be listed:
- `generate-match-embeddings`
- `generate-user-embeddings-v2`
- `simplified-recommendations`
- `process-embedding-queue`

#### 1.2 Verify Function Status
All functions should show status: `ACTIVE`

### Phase 2: Recommendation System Testing

#### 2.1 Access Application
1. Navigate to `http://localhost:3000`
2. Login with test credentials: `2022812795@student.uitm.edu.my` / `Ulalala@369`
3. Verify home page loads with recommendations section

#### 2.2 Recommendation Display Verification
**Check for:**
- [ ] "Based on your preferences" section visible
- [ ] Recommendation cards displaying similarity percentages
- [ ] Mathematical breakdown showing cosine similarity
- [ ] Explanation text for each recommendation

**Expected Similarity Range**: 0% - 100% with explanatory text

#### 2.3 Console Log Verification
Open browser developer tools and check for:
```
[LOG] [Sportea Recommendation Service] Using simplified vector-based recommendation system
[LOG] [Sportea Recommendation Service] Starting simplified vector recommendation request
[LOG] [Sportea Recommendation Service] Received simplified vector recommendations
```

**No Error Messages Should Appear Related To:**
- Missing edge functions
- Function call failures
- Vector generation errors

### Phase 3: Vector Pipeline Testing

#### 3.1 User Vector Generation Test
1. Navigate to Profile → Edit Preferences
2. Modify sport preferences (add/remove sports)
3. Save changes
4. Return to home page
5. Click "Refresh recommendations" button

**Expected Behavior:**
- [ ] Preferences save successfully
- [ ] New recommendations generated
- [ ] Similarity percentages may change
- [ ] No error messages in console

#### 3.2 Match Vector Generation Test
1. Create a new match (if possible)
2. Check that match appears in recommendations
3. Verify similarity calculation works

### Phase 4: Mathematical Verification

#### 4.1 Similarity Calculation Accuracy
1. Note current similarity percentages
2. Refresh recommendations multiple times
3. Verify percentages remain consistent
4. Check mathematical breakdown in recommendation cards

**Verification Points:**
- [ ] Similarity percentages are mathematically consistent
- [ ] Cosine similarity values between 0 and 1
- [ ] Vector dimensions reported as 384
- [ ] Calculation method shows "PostgreSQL RPC function"

#### 4.2 Performance Testing
1. Time recommendation loading
2. Verify response time <2ms for similarity calculations
3. Check for any performance degradation

### Phase 5: Dual-Screen Testing (Advanced)

#### 5.1 Setup
- **Screen 1**: `localhost:3000` - User: `2022812795@student.uitm.edu.my`
- **Screen 2**: `localhost:3001` - User: `2022812796@student.uitm.edu.my`

#### 5.2 Cross-User Verification
1. Create match on Screen 1
2. Verify it appears in recommendations on Screen 2
3. Check similarity calculations are different for different users

### Phase 6: Error Handling Testing

#### 6.1 Function Availability Test
1. Temporarily disable one function (if possible)
2. Verify graceful error handling
3. Re-enable function and test recovery

#### 6.2 Network Resilience Test
1. Simulate network interruption
2. Verify system recovers gracefully
3. Check recommendation system continues working

## Success Criteria Checklist

### ✅ Deployment Success
- [ ] Only 4 edge functions deployed
- [ ] All functions show ACTIVE status
- [ ] No deprecated functions remain

### ✅ Functional Success
- [ ] Recommendation system displays similarity percentages
- [ ] User preference updates trigger vector regeneration
- [ ] Mathematical calculations remain accurate
- [ ] Performance targets maintained (<2ms)

### ✅ Integration Success
- [ ] Frontend calls correct edge function versions
- [ ] No version mismatch errors in console
- [ ] Vector pipeline works end-to-end
- [ ] Database operations successful

### ✅ Academic Verification
- [ ] Mathematical verifiability maintained
- [ ] Deterministic vector generation working
- [ ] Cosine similarity calculations accurate
- [ ] Documentation reflects actual implementation

## Troubleshooting Guide

### Issue: Recommendations Not Loading
**Check:**
1. Edge function deployment status
2. Console errors for function calls
3. User authentication status
4. Database connectivity

### Issue: Similarity Percentages Missing
**Check:**
1. `simplified-recommendations` function status
2. User preference vector existence
3. Match characteristic vectors
4. PostgreSQL RPC function availability

### Issue: Vector Generation Failing
**Check:**
1. `generate-user-embeddings-v2` deployment
2. `process-embedding-queue` function status
3. Database trigger functionality
4. Queue processing status

### Issue: Performance Degradation
**Check:**
1. Function response times
2. Database query performance
3. Vector index status
4. Network latency

## Rollback Procedure

If critical issues are found:

1. **Immediate Rollback**
   ```bash
   # Redeploy old functions temporarily
   supabase functions deploy generate-user-embeddings --project-ref fcwwuiitsghknsvnsrxp
   ```

2. **Investigate Issues**
   - Check function logs
   - Verify database state
   - Test individual components

3. **Re-attempt Cleanup**
   - Fix identified issues
   - Re-run cleanup process
   - Re-test thoroughly

## Documentation Updates Required

After successful cleanup:
- [ ] Update system architecture diagrams
- [ ] Revise function reference documentation
- [ ] Update deployment guides
- [ ] Modify troubleshooting documentation

---

**Testing Completed By**: _______________
**Date**: _______________
**System Status**: _______________
**Issues Found**: _______________
**Recommendations**: _______________
