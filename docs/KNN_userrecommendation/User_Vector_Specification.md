# User Vector Specification for KNN Recommendation System

## Overview

This document defines the comprehensive user attribute vector specification for the KNN recommendation system. The vector is based on **actual user preference data available in the current database schema** and uses the day-specific time slot encoding from TEMPLATE_2.md and sport-specific skill level encoding from the Sport-Specific Skill Level Encoding document to create a precise vector for user similarity calculations.

## Database Schema Verification

**Source Table**: `users` (all user preference data is stored directly in the users table)

**Verified Available Columns**:
- `sport_preferences` (JSONB) - User's sport interests and skill levels
- `faculty` (TEXT) - User's faculty affiliation
- `campus` (TEXT) - User's campus/state location
- `gender` (TEXT) - User's gender identity
- `play_style` (TEXT) - Casual or Competitive preference
- `available_hours` (JSONB) - Day-specific time slot availability following TEMPLATE_2.md structure
- `preferred_facilities` (JSONB) - User's preferred venue/facility IDs

## Actual Data Available

### Sports (11 sports available in database)
From `sports` table: Basketball, Badminton, Football, Frisbee, Futsal, Hockey, Rugby, Squash, Table Tennis, Tennis, Volleyball

### Faculties (7 options from ProfileEdit.jsx)
From frontend: COMPUTER SCIENCES, ENGINEERING, ARTS, MASSCOM, SPORT SCIENCES AND RECREATION, LANGUAGE, APB

### Campus/States (13 options from ProfileEdit.jsx)
From frontend: SELANGOR, SARAWAK, SABAH, JOHOR, KEDAH, KELANTAN, PAHANG, PERAK, PERLIS, MELAKA, TERENGGANU, PENANG, NEGERI SEMBILAN

### Gender (4 options from ProfileEdit.jsx)
From frontend: Male, Female, Other, Prefer not to say

### Play Style (2 options)
From database/frontend: casual, competitive

### Facilities (29 facilities available in database)
From `locations` table: 29 specific courts and venues at UiTM Shah Alam

## Vector Architecture

### Total Vector Size: 142 Elements

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    User Attribute Vector                                                   │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Sport-Skills(33) │ Faculty(7) │ Campus(13) │ Gender(4) │ PlayStyle(2) │ TimeSlots(49) │ Facilities(29) │ Padding(5) │
│ [0-32]           │ [33-39]    │ [40-52]    │ [53-56]   │ [57-58]      │ [59-107]      │ [108-136]      │ [137-141]  │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Vector Components

### 1. Sport-Specific Skill Levels Vector (Elements 0-32)
**Size**: 33 elements (11 sports × 3 skill levels)
**Encoding**: Binary (0 = not this sport-skill combination, 1 = this sport-skill combination)
**Source**: `users.sport_preferences` JSONB field
**Reference**: Sport-Specific Skill Level Encoding for KNN Recomm.md (detailed methodology)
**Implementation**: This encoding follows the exact methodology outlined in the Sport-Specific document

**Sport-Skill Combinations** (based on actual database sports):
```javascript
const SPORT_SKILL_MAPPING = {
  // Basketball (positions 0-2)
  'Basketball_Beginner': 0, 'Basketball_Intermediate': 1, 'Basketball_Advanced': 2,
  // Badminton (positions 3-5)
  'Badminton_Beginner': 3, 'Badminton_Intermediate': 4, 'Badminton_Advanced': 5,
  // Football (positions 6-8)
  'Football_Beginner': 6, 'Football_Intermediate': 7, 'Football_Advanced': 8,
  // Frisbee (positions 9-11)
  'Frisbee_Beginner': 9, 'Frisbee_Intermediate': 10, 'Frisbee_Advanced': 11,
  // Futsal (positions 12-14)
  'Futsal_Beginner': 12, 'Futsal_Intermediate': 13, 'Futsal_Advanced': 14,
  // Hockey (positions 15-17)
  'Hockey_Beginner': 15, 'Hockey_Intermediate': 16, 'Hockey_Advanced': 17,
  // Rugby (positions 18-20)
  'Rugby_Beginner': 18, 'Rugby_Intermediate': 19, 'Rugby_Advanced': 20,
  // Squash (positions 21-23)
  'Squash_Beginner': 21, 'Squash_Intermediate': 22, 'Squash_Advanced': 23,
  // Table Tennis (positions 24-26)
  'Table_Tennis_Beginner': 24, 'Table_Tennis_Intermediate': 25, 'Table_Tennis_Advanced': 26,
  // Tennis (positions 27-29)
  'Tennis_Beginner': 27, 'Tennis_Intermediate': 28, 'Tennis_Advanced': 29,
  // Volleyball (positions 30-32)
  'Volleyball_Beginner': 30, 'Volleyball_Intermediate': 31, 'Volleyball_Advanced': 32
};
```

**Skill Level Encoding**:
- Beginner: Binary 1 in corresponding position
- Intermediate: Binary 1 in corresponding position
- Advanced: Binary 1 in corresponding position
- Not playing this sport: All 3 positions for that sport remain 0

**Example**:
```javascript
// User: Basketball (Advanced), Futsal (Beginner), Tennis (Intermediate)
sportSkillVector = [
  0, 0, 1,    // Basketball: Advanced
  0, 0, 0,    // Badminton: doesn't play
  0, 0, 0,    // Football: doesn't play
  0, 0, 0,    // Frisbee: doesn't play
  1, 0, 0,    // Futsal: Beginner
  0, 0, 0,    // Hockey: doesn't play
  0, 0, 0,    // Rugby: doesn't play
  0, 0, 0,    // Squash: doesn't play
  0, 0, 0,    // Table Tennis: doesn't play
  0, 1, 0,    // Tennis: Intermediate
  0, 0, 0     // Volleyball: doesn't play
]
```

### 2. Faculty Vector (Elements 33-39)
**Size**: 7 elements
**Encoding**: Binary (0 = not this faculty, 1 = this faculty)
**Source**: `users.faculty` TEXT field

**Faculty Mapping** (based on actual ProfileEdit.jsx options):
```javascript
const FACULTY_MAPPING = {
  'COMPUTER SCIENCES': 0, 'ENGINEERING': 1, 'ARTS': 2,
  'MASSCOM': 3, 'SPORT SCIENCES AND RECREATION': 4, 'LANGUAGE': 5, 'APB': 6
};
```

### 3. Campus/State Vector (Elements 40-52)
**Size**: 13 elements
**Encoding**: Binary (0 = not this state, 1 = this state)
**Source**: `users.campus` TEXT field (stores state information)

**State Mapping** (based on actual ProfileEdit.jsx options):
```javascript
const STATE_MAPPING = {
  'SELANGOR': 0, 'SARAWAK': 1, 'SABAH': 2, 'JOHOR': 3, 'KEDAH': 4,
  'KELANTAN': 5, 'PAHANG': 6, 'PERAK': 7, 'PERLIS': 8, 'MELAKA': 9,
  'TERENGGANU': 10, 'PENANG': 11, 'NEGERI SEMBILAN': 12
};
```

### 4. Gender Vector (Elements 53-56)
**Size**: 4 elements
**Encoding**: Binary (0 = not this gender, 1 = this gender)
**Source**: `users.gender` TEXT field

**Gender Mapping** (based on actual ProfileEdit.jsx options):
```javascript
const GENDER_MAPPING = {
  'Male': 0, 'Female': 1, 'Other': 2, 'Prefer not to say': 3
};
```

### 5. Play Style Vector (Elements 57-58)
**Size**: 2 elements
**Encoding**: Binary (0 = not this style, 1 = this style)
**Source**: `users.play_style` TEXT field

**Play Style Mapping**:
```javascript
const PLAY_STYLE_MAPPING = {
  'casual': 0, 'competitive': 1
};
```

### 6. Day-Specific Time Slots Vector (Elements 59-107)
**Size**: 49 elements (7 days × 7 time slots)
**Encoding**: Binary (0 = unavailable, 1 = available)
**Source**: `users.available_hours` JSONB field (day-specific structure as per TEMPLATE_2.md)
**Reference**: TEMPLATE_2.md for complete day-specific time slot encoding methodology
**Implementation**: Follows TEMPLATE_2.md's flattened day-hour vector approach

**Time Slots**:
- Slot 0: 9:00-11:00 AM
- Slot 1: 11:00 AM-1:00 PM
- Slot 2: 1:00-3:00 PM
- Slot 3: 3:00-5:00 PM
- Slot 4: 5:00-7:00 PM
- Slot 5: 7:00-9:00 PM
- Slot 6: 9:00-11:00 PM

**Vector Layout** (as specified in TEMPLATE_2.md):
```
[Mon_9-11, Mon_11-13, ..., Mon_21-23, Tue_9-11, ..., Sun_21-23]
[   59   ,    60    , ...,    65    ,    66   , ...,   107    ]
```

**Example**:
```javascript
// User available Monday 9-11 AM and 5-7 PM, Wednesday 1-3 PM
timeVector = [1,0,0,0,1,0,0, 0,0,0,0,0,0,0, 0,0,1,0,0,0,0, ...]
//            Mon slots      Tue slots      Wed slots
```

**Data Structure** (TEMPLATE_2.md format):
```json
{
  "monday": ["17-19", "19-21"],
  "tuesday": [],
  "wednesday": [],
  "thursday": ["9-11", "13-15"],
  "friday": [],
  "saturday": [],
  "sunday": []
}
```

**Data Conversion**: The `available_hours` JSONB field stores day-specific time slots as per TEMPLATE_2.md and is converted to the 49-element flattened vector during vector building.

### 7. Preferred Facilities Vector (Elements 108-136)
**Size**: 29 elements
**Encoding**: Binary (0 = not preferred, 1 = preferred)
**Source**: `users.preferred_facilities` JSONB field

**Facility Mapping** (based on actual database locations):
```javascript
const FACILITY_MAPPING = {
  'Court Budisiswa Badminton': 0, 'Court Budisiswa Tennis A': 1, 'Court Budisiswa Tennis B': 2,
  'Court Budisiswa Tennis C': 3, 'Court Budisiswa Tennis D': 4, 'Court Kenanga': 5,
  'Court Perindu A (Futsal)': 6, 'Court Perindu A (Volleyball)': 7, 'Court Perindu B (Futsal)': 8,
  'Court Perindu B (Volleyball)': 9, 'Court Perindu C (Futsal)': 10, 'Court Pusat Sukan A (Basketball)': 11,
  'Court Pusat Sukan A (Futsal)': 12, 'Court Pusat Sukan A (Volleyball)': 13, 'Court Pusat Sukan B (Basketball)': 14,
  'Court Pusat Sukan B (Futsal)': 15, 'Court Pusat Sukan B (Volleyball)': 16, 'Court Pusat Sukan Tennis A': 17,
  'Court Pusat Sukan Tennis B': 18, 'Court Pusat Sukan Tennis C': 19, 'Court Pusat Sukan Tennis D': 20,
  'Court Squash Budisiswa A': 21, 'Court Squash Budisiswa B': 22, 'Dewan Pusat Sukan': 23,
  'Padang Bola Sintetik': 24, 'Padang Hoki Pusat Sukan': 25, 'Padang Natural Grass Field Football': 26,
  'Padang Pusat Sukan UiTM': 27, 'Padang UITM': 28
};
```

**Example**:
```javascript
// User prefers Court Pusat Sukan A (Basketball), Court Budisiswa Badminton, and Dewan Pusat Sukan
facilitiesVector = [1,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0]
//                 CB1 CBT1 CBT2 ... CPS-A(B) ... DPS ...
```

### 8. Padding Vector (Elements 137-141)
**Size**: 5 elements
**Encoding**: Always 0 (reserved for future expansion)
**Purpose**: Ensures vector size is a round number and provides space for future attributes

## Vector Building Algorithm

### Data Collection Process

```javascript
async function buildUserVector(userId) {
  // 1. Fetch user data from users table
  const { data: userData, error } = await supabase
    .from('users')
    .select(`
      sport_preferences,
      faculty,
      campus,
      gender,
      play_style,
      available_hours,
      preferred_facilities
    `)
    .eq('id', userId)
    .single();

  if (error) throw error;

  // 2. Initialize 142-element vector
  const vector = new Array(142).fill(0);

  // 3. Build sport-specific skill levels vector (0-32)
  vector.splice(0, 33, ...buildSportSkillVector(userData.sport_preferences));

  // 4. Build faculty vector (33-39)
  vector.splice(33, 7, ...buildFacultyVector(userData.faculty));

  // 5. Build state vector (40-52)
  vector.splice(40, 13, ...buildStateVector(userData.campus));

  // 6. Build gender vector (53-56)
  vector.splice(53, 4, ...buildGenderVector(userData.gender));

  // 7. Build play style vector (57-58)
  vector.splice(57, 2, ...buildPlayStyleVector(userData.play_style));

  // 8. Build day-specific time slots vector (59-107) - TEMPLATE_2.md methodology
  vector.splice(59, 49, ...buildTimeAvailabilityVector(userData.available_hours));

  // 9. Build preferred facilities vector (108-136)
  vector.splice(108, 29, ...buildFacilitiesVector(userData.preferred_facilities));

  // 10. Padding elements (137-141) remain 0

  return vector;
}
```

### Vector Component Builders

```javascript
function buildSportSkillVector(sportPreferences) {
  const sportSkillVector = new Array(33).fill(0);

  if (sportPreferences && Array.isArray(sportPreferences)) {
    sportPreferences.forEach(sport => {
      const sportName = sport.name;
      const skillLevel = sport.level;

      // Create sport-skill combination key
      const sportSkillKey = `${sportName}_${skillLevel}`;
      const index = SPORT_SKILL_MAPPING[sportSkillKey];

      if (index !== undefined) {
        sportSkillVector[index] = 1;
      }
    });
  }

  return sportSkillVector;
}

function buildFacultyVector(faculty) {
  const facultyVector = new Array(7).fill(0);
  const index = FACULTY_MAPPING[faculty];
  if (index !== undefined) {
    facultyVector[index] = 1;
  }
  return facultyVector;
}

function buildStateVector(campus) {
  const stateVector = new Array(13).fill(0);
  const index = STATE_MAPPING[campus];
  if (index !== undefined) {
    stateVector[index] = 1;
  }
  return stateVector;
}

function buildGenderVector(gender) {
  const genderVector = new Array(4).fill(0);
  const index = GENDER_MAPPING[gender];
  if (index !== undefined) {
    genderVector[index] = 1;
  }
  return genderVector;
}

function buildPlayStyleVector(playStyle) {
  const playStyleVector = new Array(2).fill(0);
  const index = PLAY_STYLE_MAPPING[playStyle];
  if (index !== undefined) {
    playStyleVector[index] = 1;
  }
  return playStyleVector;
}

function buildTimeAvailabilityVector(availableHours) {
  // Convert JSONB available_hours to 49-element day-specific encoding
  // Follows TEMPLATE_2.md flattened day-hour vector approach
  const timeVector = new Array(49).fill(0);

  // Days mapping (TEMPLATE_2.md structure)
  const dayMapping = {
    'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3,
    'friday': 4, 'saturday': 5, 'sunday': 6
  };

  // Time slots mapping (TEMPLATE_2.md time slots: 7 slots per day)
  const timeSlotMapping = {
    '9-11': 0, '11-13': 1, '13-15': 2, '15-17': 3,
    '17-19': 4, '19-21': 5, '21-23': 6
  };

  // Process day-specific availability as per TEMPLATE_2.md
  if (availableHours && typeof availableHours === 'object') {
    Object.keys(availableHours).forEach(day => {
      const dayIndex = dayMapping[day.toLowerCase()];
      if (dayIndex !== undefined) {
        const daySlots = availableHours[day];
        if (Array.isArray(daySlots)) {
          daySlots.forEach(slot => {
            const slotIndex = timeSlotMapping[slot];
            if (slotIndex !== undefined) {
              // Calculate vector position: dayIndex * 7 + slotIndex (TEMPLATE_2.md formula)
              const vectorIndex = dayIndex * 7 + slotIndex;
              timeVector[vectorIndex] = 1;
            }
          });
        }
      }
    });
  }

  return timeVector;
}

function buildFacilitiesVector(preferredFacilities) {
  const facilitiesVector = new Array(29).fill(0);

  if (preferredFacilities && Array.isArray(preferredFacilities)) {
    // Need to map facility IDs to facility names, then to indices
    preferredFacilities.forEach(facilityId => {
      // This would require a lookup to get facility name from ID
      // Then map to FACILITY_MAPPING index
      const facilityName = getFacilityNameById(facilityId);
      const index = FACILITY_MAPPING[facilityName];
      if (index !== undefined && index < 29) {
        facilitiesVector[index] = 1;
      }
    });
  }

  return facilitiesVector;
}

// Helper function to get facility name by ID (would need to be implemented)
function getFacilityNameById(facilityId) {
  // This would query the locations table to get the name
  // Implementation depends on how you want to handle the lookup
  return null; // Placeholder
}
```

### Vector Normalization

All vector elements are normalized to [0.0, 1.0] range for consistent distance calculations:

```javascript
function normalizeVector(vector) {
  return vector.map(value => Math.max(0.0, Math.min(1.0, value)));
}
```

## Distance Calculation

### Unweighted Euclidean Distance

Following the foundational methodology outlined in TEMPLATE.md, the KNN algorithm uses pure Euclidean distance calculation for user similarity:

**Mathematical Foundation** (as specified in TEMPLATE.md lines 61-63):
```
Euclidean Distance = √[(x₁-y₁)² + (x₂-y₂)² + ... + (xₙ-yₙ)²]
```

**Implementation Notes from TEMPLATE.md**:
- Lower distance = Higher similarity
- Distance of 0 = Perfect match on that attribute
- Distance of √2 ≈ 1.41 = Complete opposite for binary attributes

```javascript
function calculateEuclideanDistance(vector1, vector2) {
  if (vector1.length !== vector2.length || vector1.length !== 142) {
    throw new Error('Vectors must be 142-dimensional');
  }

  let sum = 0;

  // Calculate sum of squared differences for all 142 elements
  for (let i = 0; i < 142; i++) {
    const diff = vector1[i] - vector2[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}
```

**Phase 1: Unweighted Implementation**

This unweighted approach follows TEMPLATE.md's incremental development philosophy: "Start with basic matching, then enhance" (TEMPLATE.md line 167). This ensures:

1. **Calculation Precision**: Easy to validate mathematical correctness
2. **Debugging Simplicity**: Simpler to identify issues in vector encoding
3. **Performance Baseline**: Establishes baseline for future enhancements
4. **Thorough Validation**: Follows TEMPLATE.md's emphasis on testing calculations with sample data

## Vector Update Strategy

### Trigger Events
- **Profile Updates**: Immediate vector regeneration
- **Preference Changes**: Real-time vector updates
- **Behavioral Changes**: Periodic batch updates (daily)
- **New Activity**: Incremental behavioral vector updates

### Update Frequency
- **Real-time**: Time availability, sports preferences, location preferences
- **Hourly**: Social preferences, demographic updates
- **Daily**: Behavioral metrics, activity patterns
- **Weekly**: Comprehensive vector validation and cleanup

## Vector Storage Schema

### Database Table: user_vectors_knn

```sql
CREATE TABLE user_vectors_knn (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vector_data FLOAT8[] NOT NULL CHECK (array_length(vector_data, 1) = 142),
  time_availability_hash VARCHAR(64), -- For quick time overlap checks
  sports_hash VARCHAR(64), -- For sport-skill isolation
  state_hash VARCHAR(32), -- For geographic filtering
  completeness_score FLOAT8 DEFAULT 0.0, -- Percentage of non-zero elements
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1,

  UNIQUE(user_id)
);

-- Indexes for performance
CREATE INDEX idx_user_vectors_knn_user_id ON user_vectors_knn(user_id);
CREATE INDEX idx_user_vectors_knn_updated ON user_vectors_knn(last_updated);
CREATE INDEX idx_user_vectors_knn_sports_hash ON user_vectors_knn(sports_hash);
CREATE INDEX idx_user_vectors_knn_state_hash ON user_vectors_knn(state_hash);
CREATE INDEX idx_user_vectors_knn_completeness ON user_vectors_knn(completeness_score);
```

## Vector Quality Metrics

### Completeness Score
Percentage of non-zero elements in user vector (target: >60%)

### Consistency Score  
Stability of vector over time (target: >80% similarity week-over-week)

### Predictive Power
Correlation between vector similarity and actual match participation (target: >0.7)

## Implementation Notes

### TEMPLATE.md Methodology Compliance
- **Foundational Approach**: Follows TEMPLATE.md's incremental development strategy
- **Mathematical Foundation**: Uses pure Euclidean distance as specified in TEMPLATE.md (lines 61-63)
- **Validation Priority**: Emphasizes "Test Thoroughly: Validate distance calculations with sample data" (TEMPLATE.md line 168)
- **Incremental Enhancement**: Supports "Start with basic matching, then enhance" philosophy (TEMPLATE.md line 167)

### Data Source Validation
- **100% Verified**: All vector components are based on actual database columns in the `users` table
- **No Theoretical Data**: All sports, faculties, states, and facilities are verified from actual database content
- **Frontend Compatibility**: All options match exactly with ProfileEdit.jsx form options
- **Time Slot Encoding**: Follows TEMPLATE_2.md specification for day-specific encoding
- **Sport-Skill Encoding**: Follows Sport-Specific Skill Level Encoding document methodology

### Actual Data Constraints
- **Sports**: Limited to 11 actual sports in database (not theoretical 15-20)
- **Faculties**: Limited to 7 actual faculty options from frontend
- **States**: Limited to 13 actual state options from frontend
- **Facilities**: Limited to 29 actual facilities in UiTM Shah Alam
- **No Age Data**: Birth date not stored in database - completely removed from vector

### Missing Data Handling
- **Incomplete Sport Preferences**: Default to empty array (all sport-skill positions = 0)
- **Missing Faculty/State/Gender**: Default to first option or leave all positions = 0
- **Empty Time Slots**: Default to all time slots unavailable (all positions = 0)
- **No Facility Preferences**: Default to empty array (all facility positions = 0)

### Performance Considerations
- **142-element vectors** provide optimal balance between accuracy and efficiency
- **Vector storage**: ~1,136 bytes per user (142 × 8 bytes)
- **Binary encoding**: Most elements are binary (0/1) for fast distance calculations
- **Unweighted calculation**: O(n) complexity for pure Euclidean distance
- **Sparse vectors**: Most users will have many zero elements, enabling optimization

### Vector Quality Metrics
- **Completeness Score**: Target >40% (at least 57 non-zero elements out of 142)
- **Sport Coverage**: Users should have at least 1 sport-skill combination
- **Time Coverage**: Users should have at least 7 available time slots (1 per day)
- **Facility Coverage**: Users should prefer at least 3 facilities

This specification provides the foundation for accurate user similarity calculations based on **100% verified, actual user preference data** available in the current Sportea database schema, following TEMPLATE.md's foundational methodology for KNN implementation.
