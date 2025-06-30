# User Preferences System Documentation - SporteaV3

## Overview

The SporteaV3 user preferences system is a comprehensive framework that collects, stores, processes, and utilizes user preferences to power personalized match recommendations and user-to-user compatibility matching. The system employs a hybrid approach combining explicit user preferences, behavioral analysis, and vector embeddings for optimal recommendation accuracy.

## System Architecture

### Core Components

1. **Preference Collection Layer** - User interface components for gathering preferences
2. **Data Storage Layer** - Database schema for storing preference data
3. **Processing Layer** - Algorithms for converting preferences into actionable data
4. **Vector Embedding Engine** - AI-powered preference vectorization
5. **Recommendation Engine** - Algorithms that use preferences for matching

## Database Schema

### Primary Tables

#### 1. Users Table (Extended)
```sql
-- Core user information with preference fields
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  student_id TEXT,
  faculty TEXT,
  campus TEXT,
  bio TEXT,
  
  -- Sport Preferences
  sport_preferences JSONB,           -- Array of sports with skill levels
  skill_levels JSONB,                -- Skill level mappings
  
  -- Availability Preferences
  available_days JSONB,              -- Array: ["monday", "wednesday", "friday"]
  available_hours JSONB,             -- Object: {monday: [{start: "14:00", end: "18:00"}]}
  
  -- Location Preferences
  preferred_facilities JSONB,        -- Array of facility UUIDs
  home_location JSONB,               -- {latitude: x, longitude: y, address: "text"}
  
  -- Personal Preferences
  gender TEXT,                       -- "Male", "Female", "Other", "Prefer not to say"
  play_style TEXT,                   -- "casual", "competitive"
  
  -- AI/ML Fields
  preference_vector VECTOR(384),     -- 384-dimensional embedding vector
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### 2. User Preferences Table (Recommendation System)
```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Sport Preferences
  sport_preferences JSONB,           -- Structured sport preference data
  skill_level_preferences JSONB,     -- Skill level distributions
  
  -- Time Preferences
  time_preferences JSONB,            -- {days: [], hours: []}
  
  -- Location Preferences
  location_preferences JSONB,        -- Array of preferred facility IDs
  
  -- Personal Preferences
  age INTEGER,
  duration_preference VARCHAR,       -- "Less than 1 hour", "1 hour", "2 hours", "2+ hours"
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3. Embedding Queue Table
```sql
CREATE TABLE embedding_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('user', 'match')),
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER NOT NULL DEFAULT 5,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (entity_id, entity_type)
);
```

## Preference Data Structure

### Sport Preferences
```javascript
// Format stored in sport_preferences field
[
  {
    "id": 1,
    "name": "Football",
    "level": "Beginner"
  },
  {
    "id": 2,
    "name": "Basketball", 
    "level": "Intermediate"
  }
]
```

### Availability Preferences
```javascript
// available_days format
["monday", "wednesday", "friday", "sunday"]

// available_hours format
{
  "monday": [
    {"start": "14:00", "end": "18:00"},
    {"start": "19:00", "end": "21:00"}
  ],
  "wednesday": [
    {"start": "16:00", "end": "20:00"}
  ]
}
```

### Location Preferences
```javascript
// preferred_facilities format
["uuid1", "uuid2", "uuid3"]

// home_location format
{
  "latitude": 3.1390,
  "longitude": 101.6869,
  "address": "UiTM Shah Alam, Selangor"
}
```

## Preference Collection System

### User Interface Components

#### 1. ProfileEdit.jsx
- **Purpose**: Main interface for editing user preferences
- **Features**:
  - Sport selection with skill levels
  - Availability day/time selection
  - Facility preferences
  - Personal information (age, play style, etc.)
  - Real-time validation and updates

#### 2. ProfilePreferences.jsx
- **Purpose**: Specialized component for recommendation preferences
- **Features**:
  - Interactive day selection (Mon-Sun)
  - Time range picker for each day
  - Facility multi-select with search
  - Play style radio buttons (Casual/Competitive)
  - Location picker integration

### Data Flow
```
User Input → ProfileEdit.jsx → ProfilePreferences.jsx → Database Update → Embedding Queue → Vector Generation
```

## Preference Processing

### 1. Explicit Preference Processing
- **Direct Storage**: User-selected preferences stored as-is
- **Validation**: Data type and constraint validation
- **Normalization**: Consistent format across all preference types

### 2. Vector Embedding Generation
- **Technology**: Hugging Face Sentence Transformers (all-MiniLM-L6-v2)
- **Dimensions**: 384-dimensional vectors
- **Process**:
  1. Combine all user preferences into descriptive text
  2. Generate embedding using AI model
  3. Store in `preference_vector` column
  4. Index using HNSW for fast similarity searches

### 3. Preference Text Generation
```javascript
// Example preference text for embedding
"Sports: Football (Beginner), Basketball (Intermediate). 
Available on: monday, wednesday, friday. 
Available hours: monday 14:00-18:00, wednesday 16:00-20:00. 
Preferred facilities: Court A, Court B. 
Play style: casual. 
Faculty: Engineering."
```

## Recommendation Algorithms

### 1. User-to-User Similarity Algorithm
**Weights Distribution:**
- Vector Similarity: 40%
- Behavior Match: 20%
- Skill Compatibility: 20%
- Proximity Factor: 10%
- Availability Overlap: 10%

**Calculation Process:**
```javascript
function calculateUserSimilarity(userA, userB) {
  // Vector similarity (cosine similarity)
  vectorSimilarity = cosineSimilarity(userA.preference_vector, userB.preference_vector);
  
  // Behavior match (sports + play style)
  behaviorMatch = calculateBehaviorMatch(userA, userB);
  
  // Skill compatibility
  skillCompatibility = calculateSkillCompatibility(userA, userB);
  
  // Geographic proximity (campus + faculty)
  proximityFactor = calculateProximityFactor(userA, userB);
  
  // Time availability overlap
  availabilityOverlap = calculateAvailabilityOverlap(userA, userB);
  
  // Final weighted score
  finalScore = (
    vectorSimilarity * 0.4 +
    behaviorMatch * 0.2 +
    skillCompatibility * 0.2 +
    proximityFactor * 0.1 +
    availabilityOverlap * 0.1
  );
  
  return finalScore;
}
```

### 2. Match Recommendation Algorithm
**Components:**
- Direct Preference Matching (60%)
- Collaborative Filtering (30%)
- Activity-Based Scoring (10%)

**Preference Matching Logic:**
```javascript
function calculateMatchScore(user, match) {
  let score = 0;
  
  // Sport preference (40% weight)
  if (user.sport_preferences.includes(match.sport_id)) {
    score += 0.4;
  }
  
  // Time preference (25% weight)
  if (isTimeCompatible(user.available_hours, match.start_time)) {
    score += 0.25;
  }
  
  // Location preference (20% weight)
  if (user.preferred_facilities.includes(match.location_id)) {
    score += 0.2;
  }
  
  // Skill level compatibility (15% weight)
  skillScore = calculateSkillMatch(user.skill_levels, match.skill_level);
  score += skillScore * 0.15;
  
  return score;
}
```

## Preference Update Mechanisms

### 1. Manual Updates
- User explicitly changes preferences through profile editing
- Immediate database update
- Automatic queuing for vector regeneration

### 2. Behavioral Learning (Future Enhancement)
```javascript
function updateUserPreferences(userId) {
  activities = getUserActivities(userId, last_30_days);
  
  // Calculate sport preferences based on activity frequency
  sportCounts = countByField(activities, 'sport_id');
  sportPreferences = normalizeCounts(sportCounts);
  
  // Calculate time preferences
  timePatterns = analyzeTimePatterns(activities);
  
  // Calculate skill level progression
  skillProgression = analyzeSkillProgression(activities);
  
  saveUserPreferences(userId, {
    sports: sportPreferences,
    times: timePatterns,
    skill_levels: skillProgression
  });
}
```

### 3. Automatic Vector Updates
- **Trigger**: Database trigger on preference changes
- **Queue System**: Asynchronous processing via embedding_queue
- **Edge Function**: `generate-user-embeddings` processes updates
- **Fallback**: Mock embeddings if AI service unavailable

## Performance Optimizations

### 1. Vector Indexing
```sql
-- HNSW index for fast vector similarity searches
CREATE INDEX users_preference_vector_hnsw_idx
ON users USING hnsw (preference_vector vector_ip_ops)
WITH (m=16, ef_construction=64);
```

### 2. Caching Strategy
- **Recommendation Cache**: 24-hour cache for user recommendations
- **Vector Cache**: Preference vectors cached until user updates
- **Query Optimization**: Indexed lookups for common preference queries

### 3. Batch Processing
- **Embedding Generation**: Batched processing of preference updates
- **Recommendation Updates**: Bulk calculation during off-peak hours

## Integration Points

### 1. Frontend Components
- **ProfileEdit.jsx**: Main preference editing interface
- **ProfilePreferences.jsx**: Specialized preference components
- **UserRecommendationsList.jsx**: Displays preference-based recommendations
- **RecommendationsList.jsx**: Shows match recommendations

### 2. Backend Services
- **get-similar-users**: Edge function for user similarity
- **combined-recommendations**: Match recommendation engine
- **generate-user-embeddings**: Vector generation service

### 3. Database Functions
- **find_similar_users()**: SQL function for vector similarity
- **update_user_preference_embedding()**: Trigger function for updates

## Error Handling

### 1. Missing Preferences
- **Default Values**: Neutral scores for missing data
- **Graceful Degradation**: Algorithm adapts to incomplete preferences
- **User Guidance**: UI prompts for completing preference profiles

### 2. Vector Generation Failures
- **Fallback Mechanism**: Mock vectors when AI service unavailable
- **Retry Logic**: Automatic retry with exponential backoff
- **Error Logging**: Comprehensive error tracking and reporting

### 3. Data Validation
- **Type Checking**: Strict validation of preference data types
- **Constraint Validation**: Business rule enforcement
- **Sanitization**: Input cleaning and normalization

## Future Enhancements

### 1. Advanced Behavioral Learning
- **Activity Pattern Analysis**: Learn from user behavior over time
- **Feedback Integration**: Incorporate user feedback into preferences
- **Seasonal Adjustments**: Adapt preferences based on time of year

### 2. Enhanced Matching Algorithms
- **Deep Learning Models**: More sophisticated similarity calculations
- **Multi-Modal Embeddings**: Combine text, behavioral, and demographic data
- **Real-Time Adaptation**: Dynamic preference adjustment

### 3. Social Features
- **Friend Influence**: Consider friend preferences in recommendations
- **Group Preferences**: Support for group activity preferences
- **Community Trends**: Incorporate popular preferences in recommendations

## Monitoring and Analytics

### 1. Preference Completeness Metrics
- Track percentage of users with complete preference profiles
- Monitor preference update frequency
- Analyze preference distribution patterns

### 2. Recommendation Quality Metrics
- User engagement with recommendations
- Conversion rates (recommendation → participation)
- User satisfaction scores

### 3. System Performance Metrics
- Vector generation processing times
- Recommendation calculation latency
- Database query performance

This documentation provides a comprehensive overview of the user preferences system in SporteaV3, covering all aspects from data collection to recommendation generation. The system is designed to be scalable, maintainable, and adaptable to future enhancements while providing accurate and personalized recommendations to users.
