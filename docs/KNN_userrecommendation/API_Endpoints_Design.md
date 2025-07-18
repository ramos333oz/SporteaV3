# API Endpoints Design for KNN Recommendation System

## Overview

This document specifies the API endpoints for the KNN recommendation system, including both Supabase Edge Functions and client-side service methods. The API design follows RESTful principles and integrates seamlessly with the existing Sportea backend architecture.

## Edge Functions Architecture

### 1. KNN Recommendations Edge Function

**File**: `supabase/functions/knn-recommendations/index.ts`

```typescript
// Main KNN recommendation endpoint
export default async function handler(req: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, options = {} } = await req.json();
    const {
      k = 10,
      minSimilarity = 0.3,
      sportFilter = null,
      includeExplanations = true,
      cacheTimeout = 300 // 5 minutes
    } = options;

    // Implementation details...
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
```

**Request Format**:
```json
{
  "userId": "uuid",
  "options": {
    "k": 10,
    "minSimilarity": 0.3,
    "sportFilter": "basketball",
    "includeExplanations": true,
    "cacheTimeout": 300
  }
}
```

**Response Format**:
```json
{
  "recommendations": [
    {
      "match_id": "uuid",
      "title": "Basketball Match",
      "sport": "Basketball",
      "start_time": "2025-01-20T14:00:00Z",
      "location": "UiTM Shah Alam",
      "skill_level": "Intermediate",
      "recommendation_score": 0.85,
      "neighbor_count": 5,
      "avg_neighbor_similarity": 0.78,
      "explanation": {
        "primary_reasons": ["Similar time availability", "Same sport interest"],
        "neighbor_overlap": 5,
        "confidence": 0.85
      }
    }
  ],
  "metadata": {
    "algorithm": "knn_v1",
    "k_neighbors": 10,
    "total_neighbors_found": 8,
    "cache_hit": false,
    "execution_time_ms": 145,
    "generated_at": "2025-01-17T10:30:00Z"
  }
}
```

### 2. Vector Management Edge Function

**File**: `supabase/functions/knn-vector-management/index.ts`

```typescript
// Vector building and updating endpoint
export default async function handler(req: Request) {
  const { action, userId, vectorData } = await req.json();
  
  switch (action) {
    case 'build':
      return await buildUserVector(userId);
    case 'update':
      return await updateUserVector(userId, vectorData);
    case 'rebuild':
      return await rebuildUserVector(userId);
    case 'validate':
      return await validateUserVector(userId);
    default:
      throw new Error('Invalid action');
  }
}
```

**Build Vector Request**:
```json
{
  "action": "build",
  "userId": "uuid"
}
```

**Update Vector Request**:
```json
{
  "action": "update",
  "userId": "uuid",
  "vectorData": [
    1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    1, 0, 0, 0, 0, 0, 0,
    1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    1, 0, 0, 0,
    1, 0,
    1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0
  ]
}
```

**Note**: The vectorData is now a flat 142-element array representing:
- Elements 0-32: Sport-skill combinations (33 elements)
- Elements 33-39: Faculty (7 elements)
- Elements 40-52: State (13 elements)
- Elements 53-56: Gender (4 elements)
- Elements 57-58: Play style (2 elements)
- Elements 59-107: Time availability (49 elements)
- Elements 108-136: Facilities (29 elements)
- Elements 137-141: Padding (5 elements)

**Response Format**:
```json
{
  "success": true,
  "vector": {
    "user_id": "uuid",
    "vector_data": [1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    "completeness_score": 0.85,
    "last_updated": "2025-01-17T10:30:00Z"
  },
  "metadata": {
    "vector_version": 1,
    "vector_dimensions": 142,
    "build_time_ms": 45,
    "components_updated": ["sport_skills", "time_availability", "facilities"],
    "component_breakdown": {
      "sport_skills": "0-32 (33 elements)",
      "faculty": "33-39 (7 elements)",
      "state": "40-52 (13 elements)",
      "gender": "53-56 (4 elements)",
      "play_style": "57-58 (2 elements)",
      "time_availability": "59-107 (49 elements)",
      "facilities": "108-136 (29 elements)",
      "padding": "137-141 (5 elements)"
    }
  }
}
```

### 3. Similarity Calculation Edge Function

**File**: `supabase/functions/knn-similarity/index.ts`

```typescript
// Calculate similarities between users
export default async function handler(req: Request) {
  const { userId1, userId2, batchUsers } = await req.json();
  
  if (batchUsers) {
    return await calculateBatchSimilarities(batchUsers);
  } else {
    return await calculatePairwiseSimilarity(userId1, userId2);
  }
}
```

**Pairwise Similarity Request**:
```json
{
  "userId1": "uuid1",
  "userId2": "uuid2"
}
```

**Batch Similarity Request**:
```json
{
  "batchUsers": [
    {
      "targetUserId": "uuid1",
      "candidateUserIds": ["uuid2", "uuid3", "uuid4"]
    }
  ]
}
```

**Response Format**:
```json
{
  "similarities": [
    {
      "user_id_1": "uuid1",
      "user_id_2": "uuid2",
      "euclidean_distance": 2.45,
      "similarity_score": 0.78,
      "vector_dimensions": 142,
      "calculation_method": "euclidean"
    }
  ],
  "metadata": {
    "calculation_method": "unweighted_euclidean",
    "template_reference": "TEMPLATE.md",
    "execution_time_ms": 15,
    "vector_validation": "passed"
  }
}
```

## Client-Side Service Layer

### KNN Recommendation Service

**File**: `src/services/knnRecommendationService.js`

```javascript
class KNNRecommendationService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get KNN-based recommendations for a user
   */
  async getRecommendations(userId, options = {}) {
    try {
      const cacheKey = this.generateCacheKey(userId, options);
      
      // Check cache first
      if (this.isCacheValid(cacheKey)) {
        return this.cache.get(cacheKey).data;
      }

      // Call edge function
      const { data, error } = await supabase.functions.invoke('knn-recommendations', {
        body: { userId, options }
      });

      if (error) throw error;

      // Cache the result
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      console.error('KNN recommendation error:', error);
      throw error;
    }
  }

  /**
   * Update user vector when profile changes
   */
  async updateUserVector(userId, changes = {}) {
    try {
      const { data, error } = await supabase.functions.invoke('knn-vector-management', {
        body: {
          action: 'update',
          userId,
          vectorData: changes
        }
      });

      if (error) throw error;

      // Invalidate cache for this user
      this.invalidateUserCache(userId);

      return data;
    } catch (error) {
      console.error('Vector update error:', error);
      throw error;
    }
  }

  /**
   * Get similar users for a given user
   */
  async getSimilarUsers(userId, k = 10, minSimilarity = 0.3) {
    try {
      const { data, error } = await supabase.functions.invoke('knn-similarity', {
        body: {
          batchUsers: [{
            targetUserId: userId,
            candidateUserIds: await this.getCandidateUsers(userId)
          }]
        }
      });

      if (error) throw error;

      return data.similarities
        .filter(s => s.similarity_score >= minSimilarity)
        .slice(0, k);
    } catch (error) {
      console.error('Similar users error:', error);
      throw error;
    }
  }

  /**
   * Explain why a match was recommended (Phase 1: Basic explanation)
   */
  generateRecommendationExplanation(recommendation) {
    const { similarity_score, euclidean_distance } = recommendation;

    const reasons = [];

    // Simple similarity-based explanations following TEMPLATE.md approach
    if (similarity_score > 0.8) {
      reasons.push(`High compatibility match (${Math.round(similarity_score * 100)}% similar)`);
    } else if (similarity_score > 0.6) {
      reasons.push(`Good compatibility match (${Math.round(similarity_score * 100)}% similar)`);
    } else if (similarity_score > 0.4) {
      reasons.push(`Moderate compatibility match (${Math.round(similarity_score * 100)}% similar)`);
    } else {
      reasons.push(`Based on your preferences (${Math.round(similarity_score * 100)}% similar)`);
    }

    return {
      primary_reason: reasons[0],
      all_reasons: reasons,
      similarity_score: similarity_score,
      euclidean_distance: euclidean_distance,
      calculation_method: 'unweighted_euclidean'
    };
  }

  // Cache management methods
  generateCacheKey(userId, options) {
    return `knn_${userId}_${JSON.stringify(options)}`;
  }

  isCacheValid(cacheKey) {
    const cached = this.cache.get(cacheKey);
    return cached && (Date.now() - cached.timestamp) < this.cacheTimeout;
  }

  invalidateUserCache(userId) {
    for (const [key] of this.cache) {
      if (key.includes(userId)) {
        this.cache.delete(key);
      }
    }
  }
}

export const knnRecommendationService = new KNNRecommendationService();
```

### Vector Building Service

**File**: `src/services/vectorBuildingService.js`

```javascript
class VectorBuildingService {
  /**
   * Build complete user vector from profile data
   */
  async buildUserVector(userId) {
    try {
      // Fetch user data from users table (all preferences stored here)
      const userData = await this.getUserData(userId);

      // Build 142-element vector directly
      const vector = new Array(142).fill(0);

      // Build vector components based on actual database schema
      const sportSkillVector = this.buildSportSkillVector(userData.sport_preferences);
      const facultyVector = this.buildFacultyVector(userData.faculty);
      const stateVector = this.buildStateVector(userData.campus);
      const genderVector = this.buildGenderVector(userData.gender);
      const playStyleVector = this.buildPlayStyleVector(userData.play_style);
      const timeVector = this.buildTimeAvailabilityVector(userData.available_hours, userData.available_days);
      const facilitiesVector = this.buildFacilitiesVector(userData.preferred_facilities);

      // Assemble 142-element vector
      vector.splice(0, 33, ...sportSkillVector);      // Sport-skills (0-32)
      vector.splice(33, 7, ...facultyVector);         // Faculty (33-39)
      vector.splice(40, 13, ...stateVector);          // State (40-52)
      vector.splice(53, 4, ...genderVector);          // Gender (53-56)
      vector.splice(57, 2, ...playStyleVector);       // Play style (57-58)
      vector.splice(59, 49, ...timeVector);           // Time slots (59-107)
      vector.splice(108, 29, ...facilitiesVector);    // Facilities (108-136)
      // Padding (137-141) remains 0

      // Update via edge function
      return await knnRecommendationService.updateUserVector(userId, vector);
    } catch (error) {
      console.error('Vector building error:', error);
      throw error;
    }
  }

  /**
   * Build time availability vector (49 elements)
   */
  buildTimeAvailabilityVector(availableHours) {
    const vector = new Array(49).fill(0);
    const timeSlots = ['9-11', '11-13', '13-15', '15-17', '17-19', '19-21', '21-23'];
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    days.forEach((day, dayIndex) => {
      if (availableHours[day]) {
        availableHours[day].forEach(slot => {
          const slotIndex = timeSlots.indexOf(slot);
          if (slotIndex !== -1) {
            vector[dayIndex * 7 + slotIndex] = 1;
          }
        });
      }
    });

    return vector;
  }

  /**
   * Build sport-skill combinations vector (33 elements)
   */
  buildSportSkillVector(sportPreferences) {
    const vector = new Array(33).fill(0);
    const SPORT_SKILL_MAPPING = {
      'Basketball_Beginner': 0, 'Basketball_Intermediate': 1, 'Basketball_Advanced': 2,
      'Badminton_Beginner': 3, 'Badminton_Intermediate': 4, 'Badminton_Advanced': 5,
      'Football_Beginner': 6, 'Football_Intermediate': 7, 'Football_Advanced': 8,
      'Frisbee_Beginner': 9, 'Frisbee_Intermediate': 10, 'Frisbee_Advanced': 11,
      'Futsal_Beginner': 12, 'Futsal_Intermediate': 13, 'Futsal_Advanced': 14,
      'Hockey_Beginner': 15, 'Hockey_Intermediate': 16, 'Hockey_Advanced': 17,
      'Rugby_Beginner': 18, 'Rugby_Intermediate': 19, 'Rugby_Advanced': 20,
      'Squash_Beginner': 21, 'Squash_Intermediate': 22, 'Squash_Advanced': 23,
      'Table_Tennis_Beginner': 24, 'Table_Tennis_Intermediate': 25, 'Table_Tennis_Advanced': 26,
      'Tennis_Beginner': 27, 'Tennis_Intermediate': 28, 'Tennis_Advanced': 29,
      'Volleyball_Beginner': 30, 'Volleyball_Intermediate': 31, 'Volleyball_Advanced': 32
    };

    if (sportPreferences && Array.isArray(sportPreferences)) {
      sportPreferences.forEach(sport => {
        const sportSkillKey = `${sport.name}_${sport.level}`;
        const index = SPORT_SKILL_MAPPING[sportSkillKey];
        if (index !== undefined) {
          vector[index] = 1;
        }
      });
    }

    return vector;
  }

  /**
   * Build faculty vector (7 elements)
   */
  buildFacultyVector(faculty) {
    const vector = new Array(7).fill(0);
    const FACULTY_MAPPING = {
      'COMPUTER SCIENCES': 0, 'ENGINEERING': 1, 'ARTS': 2,
      'MASSCOM': 3, 'SPORT SCIENCES AND RECREATION': 4, 'LANGUAGE': 5, 'APB': 6
    };

    const index = FACULTY_MAPPING[faculty];
    if (index !== undefined) {
      vector[index] = 1;
    }

    return vector;
  }

  /**
   * Build state vector (13 elements)
   */
  buildStateVector(campus) {
    const vector = new Array(13).fill(0);
    const STATE_MAPPING = {
      'SELANGOR': 0, 'SARAWAK': 1, 'SABAH': 2, 'JOHOR': 3, 'KEDAH': 4,
      'KELANTAN': 5, 'PAHANG': 6, 'PERAK': 7, 'PERLIS': 8, 'MELAKA': 9,
      'TERENGGANU': 10, 'PENANG': 11, 'NEGERI SEMBILAN': 12
    };

    const index = STATE_MAPPING[campus];
    if (index !== undefined) {
      vector[index] = 1;
    }

    return vector;
  }

  /**
   * Build gender vector (4 elements)
   */
  buildGenderVector(gender) {
    const vector = new Array(4).fill(0);
    const GENDER_MAPPING = {
      'Male': 0, 'Female': 1, 'Other': 2, 'Prefer not to say': 3
    };

    const index = GENDER_MAPPING[gender];
    if (index !== undefined) {
      vector[index] = 1;
    }

    return vector;
  }

  /**
   * Build play style vector (2 elements)
   */
  buildPlayStyleVector(playStyle) {
    const vector = new Array(2).fill(0);
    const PLAY_STYLE_MAPPING = {
      'casual': 0, 'competitive': 1
    };

    const index = PLAY_STYLE_MAPPING[playStyle];
    if (index !== undefined) {
      vector[index] = 1;
    }

    return vector;
  }

  /**
   * Build facilities vector (29 elements)
   */
  buildFacilitiesVector(preferredFacilities) {
    const vector = new Array(29).fill(0);
    // Facility mapping would be based on actual database facility IDs
    // This would require a lookup to map facility IDs to indices

    if (preferredFacilities && Array.isArray(preferredFacilities)) {
      preferredFacilities.forEach(facilityId => {
        // Map facility ID to index (implementation depends on facility lookup)
        const index = this.getFacilityIndex(facilityId);
        if (index !== undefined && index < 29) {
          vector[index] = 1;
        }
      });
    }

    return vector;
  }

  /**
   * Fetch user data from users table
   */
  async getUserData(userId) {
    const { data, error } = await supabase
      .from('users')
      .select(`
        sport_preferences,
        faculty,
        campus,
        gender,
        play_style,
        available_days,
        available_hours,
        preferred_facilities
      `)
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Helper function to get facility index by ID
   */
  getFacilityIndex(facilityId) {
    // This would query the locations table to get the facility index
    // Implementation depends on how facility mapping is handled
    return null; // Placeholder
  }
}

export const vectorBuildingService = new VectorBuildingService();
```

## API Integration Points

### Frontend Integration

```javascript
// In React components
import { knnRecommendationService } from '../services/knnRecommendationService';

// Get recommendations
const recommendations = await knnRecommendationService.getRecommendations(user.id, {
  k: 15,
  sportFilter: 'basketball',
  includeExplanations: true
});

// Update vector when profile changes
await knnRecommendationService.updateUserVector(user.id, {
  sport_preferences: newSports,
  available_hours: newTimeSlots,
  faculty: newFaculty,
  campus: newState,
  preferred_facilities: newFacilities
});
```

### Real-time Updates

```javascript
// Listen for profile changes and update vectors
useEffect(() => {
  const channel = supabase
    .channel('profile-changes')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'users'
    }, async (payload) => {
      if (payload.new.id === user.id) {
        await knnRecommendationService.updateUserVector(user.id);
      }
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [user.id]);
```

## Error Handling and Monitoring

### Error Response Format

```json
{
  "error": {
    "code": "KNN_VECTOR_NOT_FOUND",
    "message": "User vector not found. Please update your profile.",
    "details": {
      "user_id": "uuid",
      "suggested_action": "update_profile"
    }
  },
  "metadata": {
    "request_id": "uuid",
    "timestamp": "2025-01-17T10:30:00Z"
  }
}
```

### Performance Monitoring

```javascript
// Track API performance
const trackAPICall = async (endpoint, startTime, success, error = null) => {
  const duration = Date.now() - startTime;
  
  await supabase.from('knn_performance_metrics').insert({
    query_type: endpoint,
    execution_time_ms: duration,
    success,
    error_message: error?.message
  });
};
```

This API design provides a comprehensive interface for the KNN recommendation system while maintaining performance, scalability, and ease of use for frontend integration.
