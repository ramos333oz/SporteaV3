<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" class="logo" width="120"/>

# Day-Specific Time Slot Encoding for KNN Recommendation System

**Reference Document**: This document details the time availability encoding methodology for elements 59-107 of the 142-element user vector specified in `User_Vector_Specification.md`.

## The Issue You've Identified

You're absolutely right to raise this concern! The current approach of having separate **"Available Days"** and **"Available Hours"** vectors doesn't accurately capture how users actually set their availability in your app.

### Current Limitation

- **Available Days**: `[Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday]`
- **Available Hours**: `[9-11, 11-13, 13-15, 15-17, 17-19, 19-21, 21-23]`

This structure assumes users have the same time preferences for ALL their available days, which isn't realistic.

### Your Actual User Flow

- User selects **Monday** → chooses specific hours for Monday (e.g., 17-19, 19-21)
- User selects **Thursday** → chooses different hours for Thursday (e.g., 9-11, 13-15)


## Solution: Day-Specific Time Slot Encoding

### Recommended Approach: Flattened Day-Hour Vector

Instead of separate day and hour vectors, create one comprehensive vector that represents **every possible day-hour combination**.

### Vector Structure

**Total Time Slots**: 7 days × 7 time slots = **49 possible combinations**

```
Vector positions:
[Monday_9-11, Monday_11-13, Monday_13-15, Monday_15-17, Monday_17-19, Monday_19-21, Monday_21-23,
 Tuesday_9-11, Tuesday_11-13, Tuesday_13-15, Tuesday_15-17, Tuesday_17-19, Tuesday_19-21, Tuesday_21-23,
 Wednesday_9-11, Wednesday_11-13, Wednesday_13-15, Wednesday_15-17, Wednesday_17-19, Wednesday_19-21, Wednesday_21-23,
 Thursday_9-11, Thursday_11-13, Thursday_13-15, Thursday_15-17, Thursday_17-19, Thursday_19-21, Thursday_21-23,
 Friday_9-11, Friday_11-13, Friday_13-15, Friday_15-17, Friday_17-19, Friday_19-21, Friday_21-23,
 Saturday_9-11, Saturday_11-13, Saturday_13-15, Saturday_15-17, Saturday_17-19, Saturday_19-21, Saturday_21-23,
 Sunday_9-11, Sunday_11-13, Sunday_13-15, Sunday_15-17, Sunday_17-19, Sunday_19-21, Sunday_21-23]
```


### Encoding Example

**User A Availability**:

- Monday: 17-19, 19-21
- Thursday: 9-11, 13-15

**Vector Representation**:

```
[0, 0, 0, 0, 1, 1, 0,     // Monday: only 17-19 and 19-21 are 1
 0, 0, 0, 0, 0, 0, 0,     // Tuesday: no availability
 0, 0, 0, 0, 0, 0, 0,     // Wednesday: no availability
 1, 0, 1, 0, 0, 0, 0,     // Thursday: only 9-11 and 13-15 are 1
 0, 0, 0, 0, 0, 0, 0,     // Friday: no availability
 0, 0, 0, 0, 0, 0, 0,     // Saturday: no availability
 0, 0, 0, 0, 0, 0, 0]     // Sunday: no availability
```

**User B Availability**:

- Monday: 17-19
- Thursday: 9-11, 15-17

**Vector Representation**:

```
[0, 0, 0, 0, 1, 0, 0,     // Monday: only 17-19 is 1
 0, 0, 0, 0, 0, 0, 0,     // Tuesday: no availability
 0, 0, 0, 0, 0, 0, 0,     // Wednesday: no availability
 1, 0, 0, 1, 0, 0, 0,     // Thursday: 9-11 and 15-17 are 1
 0, 0, 0, 0, 0, 0, 0,     // Friday: no availability
 0, 0, 0, 0, 0, 0, 0,     // Saturday: no availability
 0, 0, 0, 0, 0, 0, 0]     // Sunday: no availability
```


### Distance Calculation Benefits

With this approach, the KNN algorithm can now detect:

- **Exact time overlap**: Users A and B both available Monday 17-19
- **Same day, different times**: Both available Thursday but different hours
- **Complete mismatches**: Different days entirely

**Shared Availability**: Both users are available Monday 17-19 and Thursday 9-11
**Distance**: Will be smaller due to these exact matches

## Integration with 142-Element Vector Structure

### Day-Specific Time Slots in Complete Vector (User_Vector_Specification.md)

**Day-Specific Time Slots** (Elements 59-107):
- **Vector Length: 49** (7 days × 7 time slots) - **THIS DOCUMENT**
- **Position**: Elements 59-107 in the complete 142-element user vector
- **Encoding**: Binary (0/1) for each day-time combination
- **Source**: `users.available_hours` JSONB field

**Complete 142-Element Vector Structure**:
- **Sport-Skills** (0-32): 33 elements - Sport-skill combinations
- **Faculty** (33-39): 7 elements - Faculty preferences
- **State** (40-52): 13 elements - Campus/state location
- **Gender** (53-56): 4 elements - Gender identity
- **Play Style** (57-58): 2 elements - Casual/competitive preference
- **Time Availability** (59-107): 49 elements - **THIS DOCUMENT**
- **Facilities** (108-136): 29 elements - Facility preferences
- **Padding** (137-141): 5 elements - Future expansion

**Reference**: See User_Vector_Specification.md for complete vector structure


## Implementation Considerations

### Data Storage Structure

Your database should store availability as:

```json
{
  "user_id": 123,
  "availability": {
    "monday": ["17-19", "19-21"],
    "tuesday": [],
    "wednesday": [],
    "thursday": ["9-11", "13-15"],
    "friday": [],
    "saturday": [],
    "sunday": []
  }
}
```


### Vector Conversion Process

1. **Extract day-hour combinations** from user's `available_hours` JSONB field
2. **Map to vector positions** using day-hour index formula: `dayIndex * 7 + slotIndex`
3. **Set corresponding positions to 1**, rest remain 0
4. **Combine with other attributes** to create complete 142-element user vector
5. **Apply unweighted Euclidean distance** following TEMPLATE.md methodology

### KNN Distance Calculation (TEMPLATE.md Approach)

Following the unweighted Euclidean distance approach:

```javascript
// Time availability elements contribute to overall distance calculation
function calculateTimeAvailabilityDistance(vector1, vector2) {
  let sum = 0;
  // Elements 59-107: Day-specific time slots
  for (let i = 59; i < 108; i++) {
    const diff = vector1[i] - vector2[i];
    sum += diff * diff;
  }
  return sum; // Part of total 142-element distance calculation
}
```

### Similarity Advantages

This approach provides much more accurate similarity calculations because:

- **Precise overlap detection**: Users with exact same availability windows
- **Realistic matching**: No false positives from separate day/hour vectors
- **Better recommendations**: Users actually available at the same times
- **Mathematical precision**: Using unweighted distance for easy validation
- **TEMPLATE.md compliance**: Follows foundational methodology


## Summary

The **"Day-Specific Time Slots"** vector of length 49 (elements 59-107 in the 142-element vector) accurately represents user availability selection and provides meaningful similarity calculations for the KNN recommendation system.

**Key Integration Points**:
- **Database Storage**: `users.available_hours` JSONB field with day-specific structure
- **Vector Position**: Elements 59-107 in User_Vector_Specification.md
- **Distance Calculation**: Unweighted Euclidean distance following TEMPLATE.md methodology
- **Implementation**: Flattened day-hour vector approach for precise time overlap detection

This approach ensures accurate time-based matching within the complete 142-element KNN user vector system.

## Cross-Document Validation

### Consistency with User_Vector_Specification.md

✅ **Vector Position**: Elements 59-107 correctly allocated for day-specific time slots
✅ **Vector Length**: 49 elements (7 days × 7 time slots) consistent across documents
✅ **Encoding Method**: Binary (0/1) encoding consistent across documents
✅ **Database Source**: Both reference `users.available_hours` JSONB field
✅ **Data Structure**: Day-specific availability format matches exactly
✅ **Integration**: Properly integrated into 142-element vector structure

### Implementation Verification

The day-specific time slot encoding defined in this document is implemented exactly as specified in User_Vector_Specification.md:

```javascript
// From User_Vector_Specification.md - buildTimeAvailabilityVector function
const vectorIndex = dayIndex * 7 + slotIndex; // TEMPLATE_2.md formula
timeVector[vectorIndex] = 1;
```

This ensures perfect consistency between the theoretical framework (this document) and the implementation specification (User_Vector_Specification.md).

