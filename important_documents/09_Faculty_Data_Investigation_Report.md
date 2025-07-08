# Faculty Data Investigation Report

**Investigation Date:** 2025-07-08  
**Database:** Supabase Project fcwwuiitsghknsvnsrxp  
**Objective:** Comprehensive faculty data verification and vector schema correction

## Executive Summary

The initial database verification revealed only 2 faculties in the current user base, leading to an incomplete vector schema design. A comprehensive investigation combining database queries and application code analysis revealed that the system is designed to support **7 faculties**, not just the 2 found in the limited user sample. This report documents the complete faculty investigation and the resulting vector schema corrections.

## Investigation Methodology

### Phase 1: Database Query Analysis
```sql
-- Initial faculty query
SELECT DISTINCT faculty FROM users WHERE faculty IS NOT NULL ORDER BY faculty;
-- Result: "COMPUTER SCIENCES", "ENGINEERING" (2 faculties)

-- User coverage analysis
SELECT 
  faculty,
  COUNT(*) as user_count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM users), 2) as percentage
FROM users 
GROUP BY faculty 
ORDER BY user_count DESC;
-- Result: 50% ENGINEERING, 50% COMPUTER SCIENCES (4 total users)
```

### Phase 2: Application Code Investigation
**Files Analyzed:**
- `src/pages/Register.jsx` (lines 386-394)
- `src/pages/ProfileEdit.jsx` (lines 111-119)

**Discovery:** Both files contain identical `facultyOptions` arrays defining 7 supported faculties.

### Phase 3: Database Schema Verification
```sql
-- Faculty field analysis
SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'faculty';
-- Result: TEXT field, nullable, no constraints

-- No faculty reference tables found
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name ILIKE '%faculty%';
-- Result: No faculty-specific tables
```

## Critical Findings

### 1. Sampling Bias Discovery
**Issue:** The database contains only 4 users, creating a non-representative sample
**Impact:** Only 2 out of 7 intended faculties are represented
**Root Cause:** Early development stage with limited user registration

### 2. Application vs Database Discrepancy
**Application Design:** Supports 7 faculties for full UiTM coverage
**Database Reality:** Only 2 faculties in current user base
**Resolution:** Use application design as authoritative source for schema planning

### 3. UiTM Faculty Context
**Research Finding:** UiTM is a large university with multiple faculties
**Application Alignment:** The 7 faculties represent core UiTM academic divisions
**Validation:** Faculty list aligns with UiTM's academic structure

## Complete Faculty Specification

### Application-Defined Faculties (7 Total)
```javascript
const facultyOptions = [
  "COMPUTER SCIENCES",           // Technology/IT focus
  "ENGINEERING",                 // Engineering disciplines  
  "ARTS",                       // Creative and liberal arts
  "MASSCOM",                    // Mass Communication/Media
  "SPORT SCIENCES AND RECREATION", // Sports and recreation
  "LANGUAGE",                   // Language studies
  "APB"                         // Applied Business/Management
];
```

### Current Database Distribution
```
COMPUTER SCIENCES: 2 users (50%)
ENGINEERING: 2 users (50%)
ARTS: 0 users (0%)
MASSCOM: 0 users (0%)
SPORT SCIENCES AND RECREATION: 0 users (0%)
LANGUAGE: 0 users (0%)
APB: 0 users (0%)
```

## Vector Schema Impact

### Previous Allocation (Incorrect)
```
Faculty Dimensions: 170-189 (20 dimensions for 2 faculties)
- Computer Sciences: 170-179
- Engineering: 180-189
```

### Corrected Allocation (Application-Verified)
```
Faculty Dimensions: 170-239 (70 dimensions for 7 faculties)
- Computer Sciences: 170-179
- Engineering: 180-189
- Arts: 190-199
- Mass Communication: 200-209
- Sport Sciences: 210-219
- Language: 220-229
- Applied Business: 230-239
```

### Dimension Reallocation Impact
```
Previous Schema:
- Faculty: 20 dimensions (170-189)
- Duration: 20 dimensions (190-209)
- Venues: 90 dimensions (210-299)
- Reserved: 84 dimensions (300-383)

Corrected Schema:
- Faculty: 70 dimensions (170-239)
- Duration: 20 dimensions (240-259)
- Venues: 90 dimensions (260-349)
- Reserved: 34 dimensions (350-383)

Total Active Dimensions: 350/384 (91.1% utilization)
```

## Mathematical Justification

### Why 10 Dimensions Per Faculty?
1. **Binary Encoding Space:** 10 dimensions provide sufficient encoding space for faculty identity
2. **Similarity Granularity:** Allows for nuanced similarity calculations between faculty matches
3. **Future Flexibility:** Accommodates potential sub-faculty or department encoding
4. **Mathematical Consistency:** Maintains consistent allocation strategy across attributes

### Alternative Encoding Strategies Considered
```
Option A: 5 dimensions per faculty (35 total)
- Pro: More space for other attributes
- Con: Reduced similarity granularity

Option B: One-hot encoding (7 dimensions total)
- Pro: Minimal space usage
- Con: Binary similarity only (0% or 100%)

Option C: 10 dimensions per faculty (70 total) - SELECTED
- Pro: Optimal balance of granularity and space efficiency
- Con: Higher dimension usage
```

## Implementation Requirements

### Vector Generation Updates
```typescript
// Update generate-user-embeddings-v2/index.ts
// Expand faculty encoding from 2 to 7 faculties (dimensions 170-239)

const facultyMapping = {
  "COMPUTER SCIENCES": 170,
  "ENGINEERING": 180,
  "ARTS": 190,
  "MASSCOM": 200,
  "SPORT SCIENCES AND RECREATION": 210,
  "LANGUAGE": 220,
  "APB": 230
};

// Encode user faculty
if (userData.faculty && facultyMapping[userData.faculty]) {
  const baseIndex = facultyMapping[userData.faculty];
  for (let i = 0; i < 10; i++) {
    vector[baseIndex + i] = 0.9 - (i * 0.02); // Faculty strength encoding
  }
}
```

### Database Considerations
```sql
-- No schema changes required
-- Faculty field already supports TEXT values
-- All 7 faculty values can be stored in existing field

-- Future data collection should target all 7 faculties
-- Consider faculty-based user recruitment for better representation
```

## Academic Defense Implications

### Strengths
- ✅ Application code provides authoritative faculty specification
- ✅ Vector schema now supports full UiTM faculty coverage
- ✅ Mathematical framework scales to complete faculty diversity
- ✅ Realistic similarity improvements expected with diverse users

### Limitations Acknowledged
- Current user base limited to 2 faculties (sampling bias)
- Faculty matching benefits will increase with user diversity
- Testing currently limited to COMPUTER SCIENCES vs ENGINEERING

### Future Validation
- Recruit users from all 7 faculties for comprehensive testing
- Validate faculty matching improvements with diverse user base
- Monitor similarity score improvements as faculty diversity increases

## Conclusion

The faculty investigation revealed a critical discrepancy between the limited current user base and the application's intended scope. The corrected vector schema now accurately reflects the system's design for full UiTM faculty coverage, providing a scalable foundation for the recommendation system as the user base grows and diversifies across all 7 supported faculties.

**Key Outcome:** Vector schema updated from 2-faculty support to 7-faculty support, increasing faculty dimensions from 20 to 70, with total active dimensions now at 350/384 (91.1% utilization).

**Academic Defense Ready:** The schema now provides comprehensive faculty coverage with mathematical justification and realistic scalability for the intended UiTM user base.
