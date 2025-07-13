# Test Case 1.1.1: Recommendation Score Calculation Verification

**Date:** July 13, 2025  
**Test ID:** TC-1.1.1  
**Objective:** Verify weighted scoring algorithm accuracy for Omar's profile  
**Test Type:** Manual Calculation vs System Output Comparison

## Test Setup

### User Profile (Omar - 2022812796@student.uitm.edu.my)
```json
{
  "id": "a7ed4757-5983-4112-967f-b678430248f9",
  "faculty": "ENGINEERING",
  "sport_preferences": [{"id": 2, "name": "Basketball", "level": "Intermediate"}],
  "skill_levels": {"badminton": "beginner", "basketball": "intermediate"},
  "available_days": ["sunday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
  "available_hours": {
    "sunday": [{"end": "17:00", "start": "09:00"}],
    "tuesday": [{"end": "17:00", "start": "09:00"}],
    "wednesday": [{"end": "17:00", "start": "02:00"}]
  },
  "preferred_facilities": ["442107e5-4100-4f61-832f-6a95d52f4ac5", "0809935f-e8b3-4c49-8cbe-2afa341433bb"]
}
```

### Test Match: "Friendly Basketball Game at UiTM"
```json
{
  "id": "aa32eb73-0510-418b-8809-e39bf867b19d",
  "title": "Friendly Basketball Game at UiTM",
  "sport_name": "Basketball",
  "skill_level": "Intermediate",
  "host_faculty": "COMPUTER SCIENCES",
  "start_time": "2025-07-13 21:39:00+00",
  "day_name": "Sunday",
  "location_id": "5c21c6cc-dcd1-48f6-8583-fedfcb8bc98c",
  "location_name": "Court Pusat Sukan A (Basketball)"
}
```

## Algorithm Weights
- Sports: 40%
- Faculty: 25%
- Skill: 20%
- Schedule: 10%
- Location: 5%

## Detailed Score Analysis

### 1. Sports Score (40% weight)
**Expected Calculation:**
- User Sport: Basketball
- Match Sport: Basketball
- Match: Perfect ✅
- **Score: 1.0**

**System Output:** ✅ 1.0
**Weighted Contribution:** 1.0 × 0.4 = 0.4 (40%)

### 2. Faculty Score (25% weight)
**Expected Calculation:**
- User Faculty: ENGINEERING
- Host Faculty: COMPUTER SCIENCES
- Match: Different faculties
- Algorithm: Different faculty gets 0.5 (partial points for diversity)
- **Score: 0.5**

**System Output:** ✅ 0.5
**Weighted Contribution:** 0.5 × 0.25 = 0.125 (12.5%)

### 3. Skill Score (20% weight)
**Expected Calculation:**
- User Skill for Basketball: "intermediate"
- Match Skill Requirement: "Intermediate"
- Skill Matrix: intermediate → intermediate = 1.0
- **Expected Score: 1.0**

**System Output:** ❌ 0.5
**Issue Identified:** Case sensitivity problem
- User data: "basketball": "intermediate" (lowercase)
- Match data: sport_name: "Basketball", skill_level: "Intermediate" (capitalized)
- Algorithm looks for userSkillLevels["Basketball"] but finds userSkillLevels["basketball"]
- Fallback to default 'intermediate' but comparison fails due to case mismatch

**Weighted Contribution:** 0.5 × 0.2 = 0.1 (10%)
**Expected Contribution:** 1.0 × 0.2 = 0.2 (20%)
**Accuracy Loss:** 10%

### 4. Schedule Score (10% weight)
**Expected Calculation:**
- Match Day: Sunday
- User Available Days: ["sunday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
- Match: User available on Sunday ✅
- **Expected Score: 1.0**

**System Output:** ❌ 0.0
**Issue Identified:** Potential timezone or date parsing discrepancy
- SQL shows match on Sunday, user available on Sunday
- JavaScript Date parsing may be interpreting differently
- Algorithm returning 0.0 suggests day mismatch detected

**Weighted Contribution:** 0.0 × 0.1 = 0.0 (0%)
**Expected Contribution:** 1.0 × 0.1 = 0.1 (10%)
**Accuracy Loss:** 10%

### 5. Location Score (5% weight)
**Expected Calculation:**
- Match Location: "5c21c6cc-dcd1-48f6-8583-fedfcb8bc98c" (Court Pusat Sukan A Basketball)
- User Preferred: ["442107e5-4100-4f61-832f-6a95d52f4ac5", "0809935f-e8b3-4c49-8cbe-2afa341433bb"]
- Algorithm: Fixed 0.5 score (TODO: Implement location preference system)
- **Score: 0.5**

**System Output:** ✅ 0.5
**Weighted Contribution:** 0.5 × 0.05 = 0.025 (2.5%)

## Final Score Comparison

### System Calculation (from console logs):
```
Individual scores: {sports: 1, faculty: 0.5, skill: 0.5, schedule: 0, location: 0.5}
Weighted calculation:
  Sports: 1 × 0.4 = 0.4
  Faculty: 0.5 × 0.25 = 0.125
  Skill: 0.5 × 0.2 = 0.1
  Schedule: 0 × 0.1 = 0
  Location: 0.5 × 0.05 = 0.025
  Total Score: 0.65
```

### Expected Calculation (corrected):
```
  Sports: 1 × 0.4 = 0.4
  Faculty: 0.5 × 0.25 = 0.125
  Skill: 1.0 × 0.2 = 0.2
  Schedule: 1.0 × 0.1 = 0.1
  Location: 0.5 × 0.05 = 0.025
  Total Score: 0.85
```

### Results Summary
- **System Score:** 65%
- **Expected Score:** 85%
- **Accuracy:** 76.5% (65/85)
- **Discrepancy:** 20 percentage points

## Issues Identified

### Critical Issues
1. **Skill Level Case Sensitivity (Impact: 10%)**
   - **Root Cause:** Inconsistent casing between user data and match data
   - **Location:** `calculateSkillScore()` function line 256
   - **Fix Required:** Normalize case before comparison

2. **Schedule Day Detection (Impact: 10%)**
   - **Root Cause:** Date parsing discrepancy between JavaScript and SQL
   - **Location:** `calculateScheduleScore()` function line 295
   - **Fix Required:** Ensure consistent timezone handling

### Total Accuracy Impact
- **Functional Accuracy:** 76.5%
- **Algorithm Logic:** Correct (weights and formulas accurate)
- **Data Processing:** Issues with case sensitivity and date parsing

## Recommendations

### Immediate Fixes
1. **Normalize case sensitivity in skill matching:**
   ```javascript
   let userSkillLevel = userSkillLevels[matchSport.toLowerCase()] || 'intermediate';
   const matchSkillRequirement = (match.skill_level || 'intermediate').toLowerCase();
   ```

2. **Fix date parsing for schedule matching:**
   ```javascript
   const matchDate = new Date(match.start_time);
   const matchDay = matchDate.toLocaleDateString('en-US', { 
     weekday: 'long', 
     timeZone: 'UTC' 
   }).toLowerCase();
   ```

### Testing Validation
- **Test Status:** ❌ FAILED (76.5% accuracy)
- **Critical Issues:** 2
- **Blocking Issues:** 0
- **Next Steps:** Fix identified issues and retest

## Test Evidence
- **Console Logs:** Captured system calculation details
- **Database Queries:** Verified user and match data
- **Manual Calculations:** Documented step-by-step expected results
- **Frontend Display:** Confirmed 65% score displayed to user

## Additional Test Case: Host Exclusion Logic

### Test Case 1.2.1: Host Exclusion Verification
**Objective:** Verify hosts are correctly excluded from their own match recommendations

**Test Setup:**
- **User:** Azmil (2022812795@student.uitm.edu.my)
- **Role:** Host of both basketball matches
- **Expected Behavior:** No recommendations shown (hosts excluded)

**Results:**
- **Frontend Display:** ✅ "No Recommended Matches Found" message
- **Refresh Functionality:** ✅ Works correctly for no-recommendations scenario
- **Host Detection:** ✅ System correctly identifies Azmil as host
- **User Experience:** ✅ Clear messaging explaining why no recommendations

**Accuracy:** 100% - Host exclusion logic working perfectly

## Cross-User Testing Summary

### Omar (Non-Host User)
- **Recommendations Shown:** ✅ Yes (2 basketball matches)
- **Scores Displayed:** 65% for both matches
- **Calculation Issues:** Case sensitivity and date parsing problems
- **Overall Accuracy:** 76.5%

### Azmil (Host User)
- **Recommendations Shown:** ✅ Correctly excluded (host of matches)
- **No-Match Handling:** ✅ Proper user messaging
- **Refresh Functionality:** ✅ Works in no-recommendations scenario
- **Overall Accuracy:** 100% (for host exclusion logic)
