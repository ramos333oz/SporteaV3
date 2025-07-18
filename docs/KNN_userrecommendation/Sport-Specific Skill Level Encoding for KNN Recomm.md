<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" class="logo" width="120"/>

# Sport-Specific Skill Level Encoding for KNN Recommendation System

**Reference Document**: This document details the sport-skill encoding methodology for elements 0-32 of the 142-element user vector specified in `User_Vector_Specification.md`.

## The Issue You've Identified

Excellent observation! You're encountering the **exact same structural problem** with skill levels that we just solved with the day-specific time slots.

### Current Limitation

- **Sport Preferences**: `[Futsal, Badminton, Tennis, Basketball, ...]`
- **Skill Level**: `[Beginner, Intermediate, Advanced]`

This structure incorrectly assumes users have the **same skill level across all sports**, which is unrealistic.

### Your Actual User Reality

- User plays **Futsal** → Beginner skill level
- Same user plays **Badminton** → Different skill level (e.g., Intermediate)
- User might play **Tennis** → Advanced skill level


## Solution: Sport-Specific Skill Level Encoding

### Recommended Approach: Flattened Sport-Skill Vector

Yes, we should use the **exact same approach** as the day-specific time slots! Instead of separate sport and skill vectors, create one comprehensive vector representing **every possible sport-skill combination**.

### Vector Structure

**Total Sport-Skill Combinations**: Number of sports × 3 skill levels

Based on actual database sports (11 verified sports):

```
Vector positions:
[Basketball_Beginner, Basketball_Intermediate, Basketball_Advanced,
 Badminton_Beginner, Badminton_Intermediate, Badminton_Advanced,
 Football_Beginner, Football_Intermediate, Football_Advanced,
 Frisbee_Beginner, Frisbee_Intermediate, Frisbee_Advanced,
 Futsal_Beginner, Futsal_Intermediate, Futsal_Advanced,
 Hockey_Beginner, Hockey_Intermediate, Hockey_Advanced,
 Rugby_Beginner, Rugby_Intermediate, Rugby_Advanced,
 Squash_Beginner, Squash_Intermediate, Squash_Advanced,
 Table_Tennis_Beginner, Table_Tennis_Intermediate, Table_Tennis_Advanced,
 Tennis_Beginner, Tennis_Intermediate, Tennis_Advanced,
 Volleyball_Beginner, Volleyball_Intermediate, Volleyball_Advanced]
```

**Vector Length**: 11 sports × 3 skill levels = **33 positions** (Elements 0-32 in 142-element vector)

**Integration with User_Vector_Specification.md**: This sport-skill vector forms the first 33 elements (0-32) of the complete 142-element user vector as defined in User_Vector_Specification.md.

### Encoding Example

**User A**:

- Basketball: Advanced
- Badminton: Intermediate
- Futsal: Beginner

**Vector Representation** (33 elements):

```
[0, 0, 1,    // Basketball: Advanced
 0, 1, 0,    // Badminton: Intermediate
 0, 0, 0,    // Football: doesn't play
 0, 0, 0,    // Frisbee: doesn't play
 1, 0, 0,    // Futsal: Beginner
 0, 0, 0,    // Hockey: doesn't play
 0, 0, 0,    // Rugby: doesn't play
 0, 0, 0,    // Squash: doesn't play
 0, 0, 0,    // Table Tennis: doesn't play
 0, 0, 0,    // Tennis: doesn't play
 0, 0, 0]    // Volleyball: doesn't play
```

**User B**:

- Basketball: Intermediate
- Badminton: Advanced
- Futsal: Beginner

**Vector Representation** (33 elements):

```
[0, 1, 0,    // Basketball: Intermediate (different from User A)
 0, 0, 1,    // Badminton: Advanced (different from User A)
 0, 0, 0,    // Football: doesn't play
 0, 0, 0,    // Frisbee: doesn't play
 1, 0, 0,    // Futsal: Beginner (MATCH with User A)
 0, 0, 0,    // Hockey: doesn't play
 0, 0, 0,    // Rugby: doesn't play
 0, 0, 0,    // Squash: doesn't play
 0, 0, 0,    // Table Tennis: doesn't play
 0, 0, 0,    // Tennis: doesn't play
 0, 0, 0]    // Volleyball: doesn't play
```


## Benefits of This Approach

### Accurate Similarity Detection

- **Exact sport-skill matches**: Users A and B both play Futsal at Beginner level
- **Same sport, different skills**: Both play Badminton but at different levels
- **Skill progression compatibility**: Beginner can be matched with Intermediate for learning


### Better Recommendations

- **Sport-specific matching**: Find people who play the same sports at compatible skill levels
- **Learning opportunities**: Beginners can be matched with Intermediate players for improvement
- **Competitive balance**: Similar skill levels for fair competition


## Integration with 142-Element Vector Structure

### Complete User Vector Components (User_Vector_Specification.md)

**Sport-Specific Skill Levels** (Elements 0-32):
- **Vector Length: 33** (11 sports × 3 skill levels) - **THIS DOCUMENT**
- **Encoding**: Binary (0/1) for each sport-skill combination
- **Source**: `users.sport_preferences` JSONB field

**Faculty** (Elements 33-39):
- **Vector Length: 7** - Verified faculty options from ProfileEdit.jsx
- **Encoding**: One-hot encoding

**State/Campus** (Elements 40-52):
- **Vector Length: 13** - Verified state options from ProfileEdit.jsx
- **Encoding**: One-hot encoding

**Gender** (Elements 53-56):
- **Vector Length: 4** - Male, Female, Other, Prefer not to say
- **Encoding**: One-hot encoding

**Play Style** (Elements 57-58):
- **Vector Length: 2** - Casual, Competitive
- **Encoding**: One-hot encoding

**Time Availability** (Elements 59-107):
- **Vector Length: 49** - Day-specific time slots (7 days × 7 time slots)
- **Encoding**: Binary (0/1) for each day-time combination

**Facilities** (Elements 108-136):
- **Vector Length: 29** - Verified UiTM facilities from database
- **Encoding**: Binary (0/1) for each facility preference

**Padding** (Elements 137-141):
- **Vector Length: 5** - Reserved for future expansion

**Total Vector Size**: 142 elements as specified in User_Vector_Specification.md


## Implementation Considerations

### Data Storage Structure

Your database should store sport skills as:

```json
{
  "user_id": 123,
  "sport_preferences": [
    {"name": "Basketball", "level": "Advanced"},
    {"name": "Badminton", "level": "Intermediate"},
    {"name": "Futsal", "level": "Beginner"}
  ]
}
```

**Note**: This matches the actual database structure where `sport_preferences` is stored as a JSONB array in the `users` table.


### Vector Conversion Process

1. **Extract sport-skill combinations** from user's `sport_preferences` JSONB field
2. **Map to vector positions** using SPORT_SKILL_MAPPING (User_Vector_Specification.md)
3. **Set corresponding positions to 1**, rest remain 0
4. **Combine with other attributes** to create complete 142-element user vector
5. **Apply unweighted Euclidean distance** following TEMPLATE.md methodology

### KNN Distance Calculation (TEMPLATE.md Approach)

Following the unweighted Euclidean distance approach:

```javascript
// Sport-skill elements contribute to overall distance calculation
function calculateSportSkillDistance(vector1, vector2) {
  let sum = 0;
  // Elements 0-32: Sport-skill combinations
  for (let i = 0; i < 33; i++) {
    const diff = vector1[i] - vector2[i];
    sum += diff * diff;
  }
  return sum; // Part of total 142-element distance calculation
}
```

### Matching Logic Benefits

This approach enables the KNN algorithm to:

- **Find exact sport-skill matches** for competitive games
- **Identify learning opportunities** (beginner with intermediate)
- **Avoid mismatches** (beginner with advanced)
- **Maintain mathematical precision** using unweighted distance
- **Enable easy validation** of sport-skill similarity calculations

## Cross-Document Validation

### Consistency with User_Vector_Specification.md

✅ **Sport List**: All 11 sports match exactly between documents
✅ **Vector Positions**: Elements 0-32 correctly allocated for sport-skill combinations
✅ **Encoding Method**: Binary (0/1) encoding consistent across documents
✅ **Database Source**: Both reference `users.sport_preferences` JSONB field
✅ **Total Elements**: 33 sport-skill elements (11 sports × 3 skill levels)
✅ **Integration**: Properly integrated into 142-element vector structure

### Implementation Verification

The sport-skill mapping defined in this document is implemented exactly as specified in User_Vector_Specification.md:

```javascript
// From User_Vector_Specification.md - SPORT_SKILL_MAPPING
'Basketball_Beginner': 0, 'Basketball_Intermediate': 1, 'Basketball_Advanced': 2,
'Badminton_Beginner': 3, 'Badminton_Intermediate': 4, 'Badminton_Advanced': 5,
// ... (matches this document exactly)
```

This ensures perfect consistency between the theoretical framework (this document) and the implementation specification (User_Vector_Specification.md).
- **Support multi-sport users** accurately


## Summary

**Yes, use the exact same approach as the day-specific time slots!**

Replace the separate "Sport Preferences" and "Skill Level" vectors with a single **"Sport-Specific Skill Levels"** vector. This accurately represents how users actually have different skill levels across different sports and will provide much more meaningful similarity calculations for your KNN recommendation system.

The pattern is clear: whenever you have **nested relationships** between attributes (day→hours, sport→skill), flatten them into a single comprehensive vector that captures all possible combinations.

