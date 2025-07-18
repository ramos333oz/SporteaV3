# Testing Strategy for KNN Recommendation System

## Overview

This document outlines a comprehensive testing strategy for the KNN recommendation system, following TEMPLATE.md's emphasis on thorough validation ("Test Thoroughly: Validate distance calculations with sample data"). The strategy covers algorithm accuracy, performance validation, user experience testing, and system integration verification using unweighted Euclidean distance methodology. The strategy ensures the KNN system meets quality standards before deployment.

## Testing Framework Architecture

### Testing Levels

```
┌─────────────────────────────────────────────────────────────┐
│                    Testing Pyramid                          │
├─────────────────────────────────────────────────────────────┤
│  E2E Tests        │ User Journey & Integration Tests        │
│  Integration Tests│ API & Database Integration             │
│  Unit Tests       │ Algorithm & Component Tests            │
│  Performance Tests│ Load & Scalability Tests               │
└─────────────────────────────────────────────────────────────┘
```

### Testing Tools & Technologies
- **Unit Testing**: Jest, React Testing Library
- **Integration Testing**: Playwright, Supabase Test Client
- **Performance Testing**: Artillery, k6
- **Algorithm Testing**: Custom validation framework
- **User Testing**: Maze, Hotjar for user behavior analysis

## Algorithm Testing

### 1. Vector Building Validation

**File**: `tests/algorithm/vectorBuilding.test.js`

```javascript
import { vectorBuildingService } from '../../src/services/vectorBuildingService';
import { testUserProfiles } from '../fixtures/userProfiles';

describe('Vector Building Service', () => {
  test('should build complete 142-element vector', async () => {
    const userId = 'test-user-1';
    const vector = await vectorBuildingService.buildUserVector(userId);

    expect(vector).toHaveLength(142);
    expect(vector.every(val => val >= 0 && val <= 1)).toBe(true);
  });

  test('should correctly encode time availability', () => {
    const availableHours = {
      monday: ['9-11', '17-19'],
      wednesday: ['13-15']
    };
    
    const timeVector = vectorBuildingService.buildTimeAvailabilityVector(availableHours);
    
    // Monday 9-11 should be 1 (index 0)
    expect(timeVector[0]).toBe(1);
    // Monday 17-19 should be 1 (index 4)
    expect(timeVector[4]).toBe(1);
    // Wednesday 13-15 should be 1 (index 16)
    expect(timeVector[16]).toBe(1);
    // Other slots should be 0
    expect(timeVector[1]).toBe(0);
  });

  test('should handle incomplete user data gracefully', async () => {
    const incompleteUser = {
      id: 'incomplete-user',
      sport_preferences: null,
      available_hours: {}
    };
    
    const vector = await vectorBuildingService.buildUserVector(incompleteUser.id);
    
    expect(vector).toHaveLength(142);
    expect(vector.filter(v => v > 0).length).toBeGreaterThan(0); // Some elements should be non-zero
  });
});
```

### 2. Distance Calculation Testing

**File**: `tests/algorithm/distanceCalculation.test.js`

```javascript
import { calculateEuclideanDistance, distanceToSimilarity } from '../../src/services/knnAlgorithm';

describe('Distance Calculations - TEMPLATE.md Methodology', () => {
  test('should calculate identical vectors as distance 0', () => {
    const vector1 = new Array(142).fill(0.5);
    const vector2 = new Array(142).fill(0.5);

    const distance = calculateEuclideanDistance(vector1, vector2);
    expect(distance).toBeCloseTo(0, 5);
  });

  test('should calculate maximum distance correctly for binary vectors', () => {
    const vector1 = new Array(142).fill(0);
    const vector2 = new Array(142).fill(1);

    const distance = calculateEuclideanDistance(vector1, vector2);
    // For 137 meaningful binary elements (excluding 5 padding): √(137 * 1²) = √137 ≈ 11.70
    expect(distance).toBeCloseTo(Math.sqrt(137), 2);
  });

  test('should validate vector dimensions', () => {
    const vector1 = new Array(100).fill(0); // Wrong dimension
    const vector2 = new Array(142).fill(0);

    expect(() => {
      calculateEuclideanDistance(vector1, vector2);
    }).toThrow('Vectors must be 142-dimensional');
  });

  test('should convert distance to similarity correctly', () => {
    // Test distance-to-similarity conversion as per TEMPLATE.md
    expect(distanceToSimilarity(0)).toBeCloseTo(1.0, 5); // Perfect match
    expect(distanceToSimilarity(1)).toBeCloseTo(0.5, 2); // Moderate similarity
    expect(distanceToSimilarity(10)).toBeCloseTo(0.091, 2); // Low similarity
    expect(similarity).toBeCloseTo(1, 5);
  });
});
```

### 3. KNN Algorithm Testing

**File**: `tests/algorithm/knnAlgorithm.test.js`

```javascript
import { KNNRecommendationEngine } from '../../src/services/knnRecommendationEngine';
import { createTestDatabase } from '../helpers/testDatabase';

describe('KNN Algorithm', () => {
  let knn;
  let testDb;

  beforeAll(async () => {
    testDb = await createTestDatabase();
    knn = new KNNRecommendationEngine({ k: 5, minSimilarity: 0.3 });
  });

  test('should find correct number of neighbors', async () => {
    const targetUserId = 'user-1';
    const neighbors = await knn.findKNearestNeighbors(targetUserId);
    
    expect(neighbors).toHaveLength(5);
    expect(neighbors.every(n => n.similarity >= 0.3)).toBe(true);
    expect(neighbors[0].similarity).toBeGreaterThanOrEqual(neighbors[1].similarity);
  });

  test('should recommend matches from similar users', async () => {
    const targetUserId = 'user-1';
    const recommendations = await knn.getRecommendations(targetUserId);
    
    expect(recommendations.recommendations).toBeDefined();
    expect(recommendations.recommendations.length).toBeGreaterThan(0);
    expect(recommendations.metadata.algorithm).toBe('knn');
  });

  test('should provide explanation for recommendations', async () => {
    const targetUserId = 'user-1';
    const recommendations = await knn.getRecommendations(targetUserId, {
      includeExplanations: true
    });
    
    const firstRec = recommendations.recommendations[0];
    expect(firstRec.explanation).toBeDefined();
    expect(firstRec.explanation.primary_reasons).toBeInstanceOf(Array);
    expect(firstRec.neighbor_count).toBeGreaterThan(0);
  });

  test('should handle sport isolation correctly', async () => {
    const basketballUser = 'basketball-user';
    const recommendations = await knn.getRecommendations(basketballUser, {
      sportFilter: 'basketball'
    });
    
    // All recommendations should be basketball matches
    recommendations.recommendations.forEach(rec => {
      expect(rec.sport.toLowerCase()).toContain('basketball');
    });
  });
});
```

## Performance Testing

### 1. Load Testing

**File**: `tests/performance/loadTest.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
};

export default function() {
  const userId = `user-${Math.floor(Math.random() * 1000)}`;
  
  // Test KNN recommendations endpoint
  const response = http.post('http://localhost:54321/functions/v1/knn-recommendations', 
    JSON.stringify({
      userId: userId,
      options: { k: 10, minSimilarity: 0.3 }
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${__ENV.SUPABASE_ANON_KEY}`
      }
    }
  );

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'has recommendations': (r) => JSON.parse(r.body).recommendations.length > 0,
  });

  sleep(1);
}
```

### 2. Scalability Testing

**File**: `tests/performance/scalabilityTest.js`

```javascript
import { performance } from 'perf_hooks';
import { KNNRecommendationEngine } from '../../src/services/knnRecommendationEngine';

describe('KNN Scalability', () => {
  test('should handle increasing user base efficiently', async () => {
    const userCounts = [100, 500, 1000, 5000];
    const results = [];

    for (const userCount of userCounts) {
      const startTime = performance.now();
      
      // Generate test users
      await generateTestUsers(userCount);
      
      // Test recommendation generation
      const knn = new KNNRecommendationEngine();
      const recommendations = await knn.getRecommendations('test-user-1');
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      results.push({
        userCount,
        duration,
        recommendationCount: recommendations.recommendations.length
      });

      // Performance should scale reasonably
      expect(duration).toBeLessThan(userCount * 0.1); // Linear scaling expectation
    }

    console.log('Scalability Results:', results);
  });

  test('should maintain accuracy with larger datasets', async () => {
    await generateTestUsers(1000);
    
    const knn = new KNNRecommendationEngine();
    const recommendations = await knn.getRecommendations('test-user-1');
    
    // Quality should not degrade with more users
    expect(recommendations.recommendations.length).toBeGreaterThan(5);
    expect(recommendations.recommendations[0].recommendation_score).toBeGreaterThan(0.5);
  });
});
```

## Integration Testing

### 1. Database Integration

**File**: `tests/integration/databaseIntegration.test.js`

```javascript
import { supabase } from '../../src/services/supabase';
import { knnRecommendationService } from '../../src/services/knnRecommendationService';

describe('Database Integration', () => {
  test('should store and retrieve user vectors correctly', async () => {
    const userId = 'test-user-vector';
    const testVector = new Array(142).fill(0).map(() => Math.random());
    
    // Store vector
    await supabase.from('user_vectors_knn').upsert({
      user_id: userId,
      vector_data: testVector,
      time_availability_hash: 'test-hash',
      sports_hash: 'test-sports',
      completeness_score: 0.8
    });
    
    // Retrieve vector
    const { data, error } = await supabase
      .from('user_vectors_knn')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    expect(error).toBeNull();
    expect(data.vector_data).toEqual(testVector);
    expect(data.completeness_score).toBe(0.8);
  });

  test('should cache similarities correctly', async () => {
    const user1 = 'user-similarity-1';
    const user2 = 'user-similarity-2';
    const similarity = 0.75;
    
    // Store similarity
    await supabase.from('user_similarity_knn').upsert({
      user_id_1: user1 < user2 ? user1 : user2,
      user_id_2: user1 < user2 ? user2 : user1,
      euclidean_similarity: similarity,
      cosine_similarity: similarity,
      hybrid_similarity: similarity
    });
    
    // Retrieve similarity
    const { data, error } = await supabase
      .from('user_similarity_knn')
      .select('*')
      .or(`and(user_id_1.eq.${user1},user_id_2.eq.${user2}),and(user_id_1.eq.${user2},user_id_2.eq.${user1})`)
      .single();
    
    expect(error).toBeNull();
    expect(data.hybrid_similarity).toBe(similarity);
  });
});
```

### 2. API Integration

**File**: `tests/integration/apiIntegration.test.js`

```javascript
import { enhancedRecommendationService } from '../../src/services/enhancedRecommendationService';

describe('API Integration', () => {
  test('should fallback to simplified recommendations on KNN failure', async () => {
    // Mock KNN failure
    jest.spyOn(knnRecommendationService, 'getRecommendations')
      .mockRejectedValue(new Error('KNN service unavailable'));
    
    const recommendations = await enhancedRecommendationService.getRecommendations('test-user');
    
    expect(recommendations.algorithm).toBe('simplified');
    expect(recommendations.recommendations).toBeDefined();
  });

  test('should update vectors when preferences change', async () => {
    const userId = 'test-preference-update';
    const newPreferences = {
      available_days: ['monday', 'wednesday'],
      available_hours: { monday: ['9-11'], wednesday: ['17-19'] }
    };
    
    await enhancedRecommendationService.updateUserPreferences(userId, newPreferences);
    
    // Verify vector was updated
    const { data } = await supabase
      .from('user_vectors_knn')
      .select('last_updated')
      .eq('user_id', userId)
      .single();
    
    expect(new Date(data.last_updated)).toBeInstanceOf(Date);
  });
});
```

## User Experience Testing

### 1. A/B Testing Framework

**File**: `tests/userExperience/abTesting.js`

```javascript
class ABTestingFramework {
  constructor() {
    this.experiments = new Map();
  }

  createExperiment(name, variants, trafficSplit = 0.5) {
    this.experiments.set(name, {
      variants,
      trafficSplit,
      results: { A: [], B: [] }
    });
  }

  assignVariant(userId, experimentName) {
    const hash = this.hashUserId(userId);
    const experiment = this.experiments.get(experimentName);
    
    return hash < experiment.trafficSplit ? 'A' : 'B';
  }

  recordResult(userId, experimentName, metric, value) {
    const variant = this.assignVariant(userId, experimentName);
    const experiment = this.experiments.get(experimentName);
    
    experiment.results[variant].push({ userId, metric, value, timestamp: Date.now() });
  }

  getResults(experimentName) {
    const experiment = this.experiments.get(experimentName);
    const aResults = experiment.results.A;
    const bResults = experiment.results.B;
    
    return {
      variantA: this.calculateMetrics(aResults),
      variantB: this.calculateMetrics(bResults),
      significance: this.calculateSignificance(aResults, bResults)
    };
  }
}

// Test KNN vs Simplified recommendations
const abTest = new ABTestingFramework();
abTest.createExperiment('recommendation_algorithm', ['knn', 'simplified'], 0.5);
```

### 2. User Journey Testing

**File**: `tests/userExperience/userJourney.test.js`

```javascript
import { test, expect } from '@playwright/test';

test.describe('KNN Recommendation User Journey', () => {
  test('should provide personalized recommendations after profile completion', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'test@student.uitm.edu.my');
    await page.fill('[data-testid="password"]', 'testpassword');
    await page.click('[data-testid="login-button"]');

    // Complete profile preferences
    await page.goto('/profile/edit');
    
    // Select available days
    await page.click('[data-testid="day-monday"]');
    await page.click('[data-testid="day-wednesday"]');
    
    // Select time slots
    await page.click('[data-testid="timeslot-9-11"]');
    await page.click('[data-testid="timeslot-17-19"]');
    
    // Select sports
    await page.click('[data-testid="sport-basketball"]');
    
    // Save preferences
    await page.click('[data-testid="save-profile"]');
    await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();

    // Navigate to recommendations
    await page.goto('/find');
    
    // Verify KNN recommendations are shown
    await expect(page.locator('[data-testid="knn-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="recommendation-score"]')).toBeVisible();
    
    // Check recommendation explanation
    await page.click('[data-testid="expand-explanation"]');
    await expect(page.locator('[data-testid="recommendation-reasons"]')).toBeVisible();
  });

  test('should show algorithm toggle and allow switching', async ({ page }) => {
    await page.goto('/find');
    
    // Open recommendation settings
    await page.click('[data-testid="recommendation-settings"]');
    
    // Switch to simplified algorithm
    await page.click('[data-testid="algorithm-simplified"]');
    
    // Verify recommendations update
    await expect(page.locator('[data-testid="knn-badge"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="algorithm-indicator"]')).toContainText('Direct Matching');
  });
});
```

## Quality Assurance Testing

### 1. Recommendation Quality Metrics

**File**: `tests/quality/recommendationQuality.test.js`

```javascript
describe('Recommendation Quality', () => {
  test('should maintain minimum precision threshold', async () => {
    const testUsers = await getTestUsers(100);
    const results = [];
    
    for (const user of testUsers) {
      const recommendations = await knnRecommendationService.getRecommendations(user.id);
      const userFeedback = await getUserFeedback(user.id, recommendations);
      
      const precision = calculatePrecision(recommendations, userFeedback);
      results.push(precision);
    }
    
    const avgPrecision = results.reduce((a, b) => a + b) / results.length;
    expect(avgPrecision).toBeGreaterThan(0.7); // 70% minimum precision
  });

  test('should provide diverse recommendations', async () => {
    const recommendations = await knnRecommendationService.getRecommendations('test-user');
    
    const sports = new Set(recommendations.recommendations.map(r => r.sport));
    const locations = new Set(recommendations.recommendations.map(r => r.location));
    
    // Should recommend diverse sports and locations
    expect(sports.size).toBeGreaterThan(1);
    expect(locations.size).toBeGreaterThan(1);
  });

  test('should avoid recommending inappropriate matches', async () => {
    const beginnerUser = 'beginner-user';
    const recommendations = await knnRecommendationService.getRecommendations(beginnerUser);
    
    // Should not recommend expert-level matches to beginners
    const expertMatches = recommendations.recommendations.filter(r => 
      r.skill_level === 'Expert'
    );
    
    expect(expertMatches.length).toBeLessThan(recommendations.recommendations.length * 0.2);
  });
});
```

### 2. Data Quality Testing

**File**: `tests/quality/dataQuality.test.js`

```javascript
describe('Data Quality', () => {
  test('should validate vector completeness', async () => {
    const users = await getAllUsers();
    
    for (const user of users) {
      const vector = await getUserVector(user.id);
      
      if (vector) {
        expect(vector.vector_data).toHaveLength(142);
        expect(vector.completeness_score).toBeGreaterThan(0.3);
        expect(vector.vector_data.every(v => v >= 0 && v <= 1)).toBe(true);
      }
    }
  });

  test('should detect and handle data anomalies', async () => {
    // Test with corrupted vector data
    const corruptedVector = new Array(142).fill(NaN);
    
    expect(() => {
      validateVector(corruptedVector);
    }).toThrow('Invalid vector data');
  });
});
```

## Testing Execution Plan

### Phase 1: Unit & Algorithm Testing (Week 1)
- [ ] Vector building validation
- [ ] Distance calculation testing
- [ ] KNN algorithm core functionality
- [ ] Edge case handling

### Phase 2: Integration Testing (Week 2)
- [ ] Database integration
- [ ] API endpoint testing
- [ ] Service layer integration
- [ ] Error handling validation

### Phase 3: Performance Testing (Week 3)
- [ ] Load testing with increasing users
- [ ] Scalability validation
- [ ] Memory and CPU usage analysis
- [ ] Response time optimization

### Phase 4: User Experience Testing (Week 4)
- [ ] A/B testing setup
- [ ] User journey validation
- [ ] Recommendation quality assessment
- [ ] Feedback collection and analysis

### Continuous Testing
- [ ] Automated test suite execution on CI/CD
- [ ] Performance monitoring in production
- [ ] User feedback analysis
- [ ] Algorithm accuracy tracking

This comprehensive testing strategy ensures the KNN recommendation system meets quality, performance, and user experience standards before and after deployment.
