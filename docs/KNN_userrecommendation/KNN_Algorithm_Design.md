# KNN Algorithm Design for User Recommendation System

## Overview

This document details the K-Nearest Neighbors algorithm implementation for the Sportea recommendation system. The algorithm uses the 142-element user vectors to find similar users and recommend relevant matches based on collaborative filtering principles, following the foundational methodology outlined in TEMPLATE.md.

## Algorithm Architecture

### Core KNN Implementation

```javascript
class KNNRecommendationEngine {
  constructor(options = {}) {
    this.k = options.k || 10; // Number of nearest neighbors
    this.minSimilarity = options.minSimilarity || 0.3;
    this.similarityMetric = options.similarityMetric || 'jaccard';
  }
}
```

### Similarity Metrics

#### 1. Jaccard Similarity (Primary Implementation)

Following TEMPLATE.md's incremental development approach ("Start with basic matching, then enhance"), we implement Jaccard similarity calculation optimized for binary preference vectors:

**Mathematical Foundation** (TEMPLATE.md lines 61-63):
```
Jaccard Similarity = |Intersection| / |Union| = |A ∩ B| / |A ∪ B|
```

```javascript
function calculateJaccardSimilarity(vector1, vector2) {
  if (vector1.length !== vector2.length || vector1.length !== 142) {
    throw new Error('Vectors must be 142-dimensional');
  }

  let intersection = 0;
  let union = 0;

  // Only calculate over meaningful elements (0-136), excluding padding (137-141)
  for (let i = 0; i < 137; i++) {
    const hasData1 = vector1[i] > 0;
    const hasData2 = vector2[i] > 0;

    if (hasData1 && hasData2) {
      intersection++;
    }
    if (hasData1 || hasData2) {
      union++;
    }
  }

  return union > 0 ? intersection / union : 0;
}
```

**Implementation Notes from TEMPLATE.md**:
- Higher similarity = Better match (0.0 to 1.0 scale)
- Similarity of 1.0 = Perfect match (identical preferences)
- Similarity of 0.0 = No shared preferences
- Ideal for binary preference vectors where 1 = has preference, 0 = no preference

**Phase 1 Benefits**:
- **Natural Handling**: Perfect for sparse binary data without normalization
- **Intuitive Results**: Similarity percentages directly interpretable
- **Performance**: No square root calculations needed
- **Validation**: Easy to verify with manual intersection/union counts

#### 2. Cosine Similarity (Secondary)

```javascript
function cosineSimilarity(vector1, vector2) {
  const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
  const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
  const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));
  
  return dotProduct / (magnitude1 * magnitude2);
}
```

#### 3. Direct Similarity Calculation

Following TEMPLATE.md methodology, Jaccard similarity provides direct similarity scores without conversion:

```javascript
function calculateUserSimilarity(vector1, vector2) {
  return calculateJaccardSimilarity(vector1, vector2);
}

function interpretSimilarity(similarity) {
  if (similarity >= 0.7) return "Very High Similarity";
  if (similarity >= 0.5) return "High Similarity";
  if (similarity >= 0.3) return "Moderate Similarity";
  if (similarity >= 0.1) return "Low Similarity";
  return "Very Low Similarity";
}
```

**Similarity Interpretation** (based on TEMPLATE.md):
- Similarity = 1.0: Perfect match (100% shared preferences)
- Similarity ≥ 0.7: Very high compatibility (70%+ shared)
- Similarity 0.5-0.7: High compatibility (50-70% shared)
- Similarity 0.3-0.5: Moderate compatibility (30-50% shared)
- Similarity < 0.3: Low compatibility (<30% shared)

## KNN Query Algorithm

### Step 1: Candidate Filtering

```javascript
async function findCandidateUsers(targetUserId, sportFilter = null) {
  let query = supabase
    .from('user_vectors_knn')
    .select('user_id, vector_data, sports_hash')
    .neq('user_id', targetUserId);
  
  // Sport isolation: only consider users with overlapping sports
  if (sportFilter) {
    query = query.eq('sports_hash', sportFilter);
  }
  
  const { data: candidates } = await query;
  return candidates;
}
```

### Step 2: Similarity Calculation

```javascript
async function calculateSimilarities(targetVector, candidates) {
  const similarities = [];

  for (const candidate of candidates) {
    const similarity = calculateUserSimilarity(
      targetVector,
      candidate.vector_data
    );

    if (similarity >= this.minSimilarity) {
      similarities.push({
        userId: candidate.user_id,
        similarity: similarity,
        jaccardScore: similarity, // Direct Jaccard similarity score
        sportsHash: candidate.sports_hash
      });
    }
  }

  // Sort by similarity (descending)
  return similarities.sort((a, b) => b.similarity - a.similarity);
}
```

### Step 3: K-Nearest Neighbors Selection

```javascript
function selectKNearestNeighbors(similarities, k) {
  // Dynamic K selection based on similarity distribution
  const adaptiveK = Math.min(k, similarities.length);
  
  // Ensure minimum similarity threshold
  const qualifiedNeighbors = similarities.filter(s => s.similarity >= this.minSimilarity);
  
  return qualifiedNeighbors.slice(0, adaptiveK);
}
```

## Match Recommendation Algorithm

### Step 1: Neighbor Match Collection

```javascript
async function collectNeighborMatches(nearestNeighbors) {
  const neighborIds = nearestNeighbors.map(n => n.userId);
  
  // Get matches that neighbors have joined or shown interest in
  const { data: neighborMatches } = await supabase
    .from('match_participants')
    .select(`
      match_id,
      user_id,
      status,
      matches(
        id, title, sport_id, start_time, max_participants,
        skill_level, location_id, host_id, status,
        sports(name),
        locations(name, campus)
      )
    `)
    .in('user_id', neighborIds)
    .eq('status', 'confirmed')
    .eq('matches.status', 'upcoming')
    .gte('matches.start_time', new Date().toISOString());
  
  return neighborMatches;
}
```

### Step 2: Match Scoring

```javascript
function scoreMatches(neighborMatches, nearestNeighbors, targetUser) {
  const matchScores = new Map();
  
  for (const neighborMatch of neighborMatches) {
    const matchId = neighborMatch.match_id;
    const neighborId = neighborMatch.user_id;
    
    // Find neighbor's similarity score
    const neighbor = nearestNeighbors.find(n => n.userId === neighborId);
    if (!neighbor) continue;
    
    // Calculate match score based on neighbor similarity
    const baseScore = neighbor.similarity;
    
    // Apply additional scoring factors
    const timeCompatibility = calculateTimeCompatibility(
      targetUser, 
      neighborMatch.matches
    );
    const skillCompatibility = calculateSkillCompatibility(
      targetUser.skill_level, 
      neighborMatch.matches.skill_level
    );
    const locationCompatibility = calculateLocationCompatibility(
      targetUser, 
      neighborMatch.matches
    );
    
    // Combined score
    const finalScore = baseScore * 0.4 + 
                      timeCompatibility * 0.3 + 
                      skillCompatibility * 0.2 + 
                      locationCompatibility * 0.1;
    
    // Aggregate scores for matches recommended by multiple neighbors
    if (matchScores.has(matchId)) {
      const existing = matchScores.get(matchId);
      matchScores.set(matchId, {
        ...existing,
        score: Math.max(existing.score, finalScore), // Take highest score
        neighborCount: existing.neighborCount + 1,
        totalSimilarity: existing.totalSimilarity + neighbor.similarity
      });
    } else {
      matchScores.set(matchId, {
        match: neighborMatch.matches,
        score: finalScore,
        neighborCount: 1,
        totalSimilarity: neighbor.similarity,
        recommendingNeighbors: [neighborId]
      });
    }
  }
  
  return Array.from(matchScores.values());
}
```

### Step 3: Recommendation Ranking

```javascript
function rankRecommendations(scoredMatches) {
  return scoredMatches
    .map(item => ({
      ...item.match,
      recommendation_score: item.score,
      neighbor_count: item.neighborCount,
      avg_neighbor_similarity: item.totalSimilarity / item.neighborCount,
      confidence: calculateConfidence(item),
      explanation: generateExplanation(item)
    }))
    .sort((a, b) => b.recommendation_score - a.recommendation_score);
}
```

## Optimization Strategies

### 1. Vector Indexing

```javascript
// Use approximate nearest neighbor search for large datasets
class ANNIndex {
  constructor(vectors, indexType = 'hnsw') {
    this.index = new HNSWIndex(vectors.length, 142); // 142-dimensional vectors
    this.buildIndex(vectors);
  }
  
  search(queryVector, k) {
    return this.index.searchKnn(queryVector, k);
  }
}
```

### 2. Caching Strategy

```javascript
class KNNCache {
  constructor() {
    this.userSimilarityCache = new Map(); // User-to-user similarities
    this.recommendationCache = new Map(); // User recommendations
    this.vectorCache = new Map(); // User vectors
  }
  
  getCachedSimilarities(userId) {
    const cached = this.userSimilarityCache.get(userId);
    if (cached && this.isValid(cached.timestamp)) {
      return cached.similarities;
    }
    return null;
  }
}
```

### 3. Batch Processing

```javascript
async function batchUpdateSimilarities() {
  const users = await getAllActiveUsers();
  const batchSize = 100;
  
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    await Promise.all(batch.map(user => updateUserSimilarities(user.id)));
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

## Performance Considerations

### Computational Complexity
- **Jaccard Calculation**: O(d) where d = 137 (meaningful vector dimensions, excluding padding)
- **KNN Search**: O(n*d) where n = number of users
- **With Indexing**: O(log n * d) using approximate methods
- **Performance Advantage**: No square root calculations needed compared to Euclidean distance

### Memory Usage
- **Vector Storage**: 142 * 8 bytes = 1,136 bytes per user
- **Similarity Cache**: 4 bytes per user pair
- **Index Structure**: ~2x vector storage overhead

### Scalability Targets
- **Users**: Support up to 50,000 active users
- **Response Time**: < 200ms for recommendation queries
- **Update Frequency**: Real-time for critical updates, batch for behavioral metrics

## Quality Assurance

### Similarity Validation

```javascript
function validateSimilarity(user1, user2, calculatedSimilarity) {
  // Check for obvious mismatches
  const timeOverlap = calculateTimeOverlap(user1.timeVector, user2.timeVector);
  const sportOverlap = calculateSportOverlap(user1.sportsVector, user2.sportsVector);
  
  // Similarity should correlate with overlaps
  const expectedSimilarity = (timeOverlap + sportOverlap) / 2;
  const deviation = Math.abs(calculatedSimilarity - expectedSimilarity);
  
  return deviation < 0.3; // Allow 30% deviation
}
```

### Recommendation Quality Metrics

```javascript
function calculateRecommendationMetrics(recommendations, userFeedback) {
  const metrics = {
    precision: calculatePrecision(recommendations, userFeedback),
    recall: calculateRecall(recommendations, userFeedback),
    diversity: calculateDiversity(recommendations),
    novelty: calculateNovelty(recommendations, userHistory),
    coverage: calculateCoverage(recommendations, allMatches)
  };
  
  return metrics;
}
```

This algorithm design provides a robust foundation for KNN-based recommendations while maintaining performance and scalability for the UiTM student user base.
