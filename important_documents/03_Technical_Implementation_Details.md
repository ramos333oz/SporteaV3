# Technical Implementation Details

## Abstract

This document provides comprehensive technical specifications for implementing the vector-based recommendation system, covering database architecture, API design, performance optimizations, and integration patterns.

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   Application   │◄──►│   Services      │◄──►│   PostgreSQL    │
│                 │    │                 │    │   + pgvector    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   AI Services   │
                       │   Hugging Face  │
                       │   Transformers  │
                       └─────────────────┘
```

### 1.2 Technology Stack

#### Database Layer
- **PostgreSQL 15+** with **pgvector extension**
- **HNSW indexing** for vector similarity search
- **Connection pooling** for scalable concurrent access

#### Backend Services
- **Supabase Edge Functions** for serverless compute
- **TypeScript/JavaScript** for business logic
- **RESTful APIs** for client communication

#### AI Processing
- **Hugging Face Transformers** (all-MiniLM-L6-v2)
- **Sentence-level embedding** generation
- **Automatic vector updates** via database triggers

#### Frontend Integration
- **React.js** components for recommendation display
- **Real-time updates** via WebSocket connections
- **Progressive loading** for optimal user experience

## 2. Database Design and Schema

### 2.1 Vector Storage Schema

```sql
-- Users table with preference vectors
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    username TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    
    -- Preference data
    sport_preferences JSONB,
    available_hours JSONB,
    preferred_facilities JSONB,
    play_style TEXT,
    faculty TEXT,
    campus TEXT,
    
    -- Vector representation (384 dimensions)
    preference_vector vector(384),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Matches table with characteristic vectors
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    sport_id UUID REFERENCES sports(id),
    host_id UUID REFERENCES users(id),
    location_id UUID REFERENCES locations(id),
    
    -- Match characteristics
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    skill_level TEXT NOT NULL,
    max_participants INTEGER NOT NULL,
    status TEXT DEFAULT 'upcoming',
    
    -- Vector representation (384 dimensions)
    characteristic_vector vector(384),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 HNSW Index Configuration

```sql
-- Optimized HNSW indexes for vector similarity search
CREATE INDEX users_preference_vector_hnsw_idx 
ON users USING hnsw (preference_vector vector_ip_ops) 
WITH (m=16, ef_construction=64);

CREATE INDEX matches_characteristic_vector_hnsw_idx 
ON matches USING hnsw (characteristic_vector vector_ip_ops) 
WITH (m=16, ef_construction=64);

-- Index parameters explanation:
-- m=16: Maximum connections per layer (optimal for 384D vectors)
-- ef_construction=64: Build-time search width (balances accuracy vs speed)
-- vector_ip_ops: Inner product operations (optimized for cosine similarity)
```

### 2.3 Vector Update Triggers

```sql
-- Automatic vector regeneration on preference changes
CREATE OR REPLACE FUNCTION update_user_vector()
RETURNS TRIGGER AS $$
BEGIN
    -- Queue vector regeneration when preferences change
    INSERT INTO embedding_queue (
        table_name,
        record_id,
        operation,
        created_at
    ) VALUES (
        'users',
        NEW.id,
        'update_vector',
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_preferences_changed
    AFTER UPDATE OF sport_preferences, available_hours, preferred_facilities, 
                   play_style, faculty, campus
    ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_user_vector();
```

## 3. Vector Generation Implementation

### 3.1 Preference Text Generation

```typescript
// Convert user preferences to descriptive text
function generatePreferenceText(user: UserProfile): string {
    const parts: string[] = [];
    
    // Sports and skill levels
    if (user.sport_preferences) {
        const sportsText = Object.entries(user.sport_preferences)
            .map(([sport, level]) => `${sport} (${level})`)
            .join(', ');
        parts.push(`Sports: ${sportsText}`);
    }
    
    // Availability
    if (user.available_hours) {
        const availabilityText = Object.entries(user.available_hours)
            .map(([day, hours]) => `${day} ${hours}`)
            .join(', ');
        parts.push(`Available on: ${availabilityText}`);
    }
    
    // Facilities
    if (user.preferred_facilities?.length > 0) {
        parts.push(`Preferred facilities: ${user.preferred_facilities.join(', ')}`);
    }
    
    // Play style and demographics
    if (user.play_style) parts.push(`Play style: ${user.play_style}`);
    if (user.faculty) parts.push(`Faculty: ${user.faculty}`);
    if (user.campus) parts.push(`Campus: ${user.campus}`);
    
    return parts.join('. ');
}

// Example output:
// "Sports: Football (Beginner), Basketball (Intermediate). 
//  Available on: monday 14:00-18:00, wednesday 16:00-20:00. 
//  Preferred facilities: Court A, Court B. 
//  Play style: casual. 
//  Faculty: Engineering."
```

### 3.2 Vector Embedding Service

```typescript
// Edge function for generating embeddings
export async function generateUserEmbedding(userId: string): Promise<number[]> {
    try {
        // 1. Fetch user preferences
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
            
        if (error) throw error;
        
        // 2. Generate preference text
        const preferenceText = generatePreferenceText(user);
        
        // 3. Call Hugging Face API
        const response = await fetch(
            'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputs: preferenceText,
                    options: { wait_for_model: true }
                })
            }
        );
        
        if (!response.ok) {
            throw new Error(`Hugging Face API error: ${response.statusText}`);
        }
        
        const embedding = await response.json();
        
        // 4. Update user vector in database
        await supabase
            .from('users')
            .update({ preference_vector: embedding })
            .eq('id', userId);
            
        return embedding;
        
    } catch (error) {
        console.error('Error generating embedding:', error);
        
        // Fallback: Generate mock embedding for development
        return generateMockEmbedding();
    }
}
```

### 3.3 Batch Processing for Vector Updates

```typescript
// Process embedding queue for bulk updates
export async function processEmbeddingQueue(): Promise<void> {
    const batchSize = 10;
    
    while (true) {
        // Fetch pending embedding tasks
        const { data: tasks, error } = await supabase
            .from('embedding_queue')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(batchSize);
            
        if (error || !tasks?.length) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s
            continue;
        }
        
        // Process tasks in parallel
        const promises = tasks.map(async (task) => {
            try {
                if (task.table_name === 'users') {
                    await generateUserEmbedding(task.record_id);
                } else if (task.table_name === 'matches') {
                    await generateMatchEmbedding(task.record_id);
                }
                
                // Mark as completed
                await supabase
                    .from('embedding_queue')
                    .update({ status: 'completed', processed_at: new Date() })
                    .eq('id', task.id);
                    
            } catch (error) {
                console.error(`Error processing task ${task.id}:`, error);
                
                // Mark as failed
                await supabase
                    .from('embedding_queue')
                    .update({ 
                        status: 'failed', 
                        error_message: error.message,
                        processed_at: new Date()
                    })
                    .eq('id', task.id);
            }
        });
        
        await Promise.allSettled(promises);
    }
}
```

## 4. Similarity Search Implementation

### 4.1 Core Similarity Functions

```typescript
// Optimized cosine similarity calculation
function cosineSimilarity(vectorA: number[], vectorB: number[]): number {
    // Input validation
    if (!vectorA || !vectorB || vectorA.length !== vectorB.length) {
        console.warn('Invalid vectors for cosine similarity calculation');
        return 0;
    }
    
    if (vectorA.length === 0) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    // Vectorized calculation for performance
    for (let i = 0; i < vectorA.length; i++) {
        const a = vectorA[i] || 0;
        const b = vectorB[i] || 0;
        
        dotProduct += a * b;
        normA += a * a;
        normB += b * b;
    }
    
    // Handle zero vectors
    if (normA === 0 || normB === 0) return 0;
    
    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    
    // Clamp to valid range due to floating-point precision
    return Math.max(-1, Math.min(1, similarity));
}

// Convert similarity to percentage
function calculateRecommendationScore(similarity: number): {
    score: number;
    percentage: string;
    explanation: string;
} {
    const clampedSimilarity = Math.max(0, similarity); // Remove negative similarities
    const percentage = Math.round(clampedSimilarity * 100);
    
    let explanation: string;
    if (percentage >= 80) {
        explanation = 'Excellent match - very similar preferences';
    } else if (percentage >= 60) {
        explanation = 'Good match - compatible preferences';
    } else if (percentage >= 40) {
        explanation = 'Moderate match - some shared interests';
    } else {
        explanation = 'Limited compatibility';
    }
    
    return {
        score: clampedSimilarity,
        percentage: `${percentage}%`,
        explanation
    };
}
```

### 4.2 HNSW-Powered Search API

```typescript
// User-to-user similarity search
export async function findSimilarUsers(
    userId: string,
    options: {
        limit?: number;
        minScore?: number;
        filters?: {
            sameGender?: boolean;
            sameCampus?: boolean;
        };
    } = {}
): Promise<SimilarUser[]> {
    
    const { limit = 10, minScore = 0.3, filters = {} } = options;
    
    // Get current user's vector
    const { data: currentUser, error: userError } = await supabase
        .from('users')
        .select('preference_vector, gender, campus')
        .eq('id', userId)
        .single();
        
    if (userError || !currentUser?.preference_vector) {
        throw new Error('User vector not found');
    }
    
    // Build query with filters
    let query = supabase
        .from('users')
        .select(`
            id,
            full_name,
            username,
            sport_preferences,
            faculty,
            campus,
            preference_vector
        `)
        .neq('id', userId)
        .not('preference_vector', 'is', null);
    
    // Apply filters
    if (filters.sameGender && currentUser.gender) {
        query = query.eq('gender', currentUser.gender);
    }
    if (filters.sameCampus && currentUser.campus) {
        query = query.eq('campus', currentUser.campus);
    }
    
    // Use HNSW index for similarity search
    query = query
        .order(`preference_vector <=> '${JSON.stringify(currentUser.preference_vector)}'`)
        .limit(limit * 2); // Over-fetch for filtering
    
    const { data: potentialUsers, error: searchError } = await query;
    
    if (searchError) throw searchError;
    
    // Calculate exact similarities and filter
    const similarUsers: SimilarUser[] = [];
    
    for (const user of potentialUsers) {
        const similarity = cosineSimilarity(
            currentUser.preference_vector,
            user.preference_vector
        );
        
        if (similarity >= minScore) {
            const scoreData = calculateRecommendationScore(similarity);
            
            similarUsers.push({
                ...user,
                similarity_score: similarity,
                similarity_percentage: scoreData.percentage,
                explanation: scoreData.explanation,
                calculation_method: 'cosine_similarity'
            });
        }
    }
    
    // Sort by similarity and return top results
    return similarUsers
        .sort((a, b) => b.similarity_score - a.similarity_score)
        .slice(0, limit);
}
```

### 4.3 Match Recommendation API

```typescript
// Match recommendation based on user preferences
export async function getMatchRecommendations(
    userId: string,
    options: {
        limit?: number;
        minScore?: number;
        sportFilter?: string[];
    } = {}
): Promise<MatchRecommendation[]> {
    
    const { limit = 10, minScore = 0.3, sportFilter } = options;
    
    // Get user's preference vector
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('preference_vector')
        .eq('id', userId)
        .single();
        
    if (userError || !user?.preference_vector) {
        throw new Error('User vector not found');
    }
    
    // Build match query
    let query = supabase
        .from('matches')
        .select(`
            id,
            title,
            description,
            start_time,
            end_time,
            skill_level,
            max_participants,
            status,
            characteristic_vector,
            sports(id, name),
            locations(id, name),
            host:host_id(id, full_name)
        `)
        .eq('status', 'upcoming')
        .gt('start_time', new Date().toISOString())
        .not('characteristic_vector', 'is', null);
    
    // Apply sport filter
    if (sportFilter?.length) {
        query = query.in('sport_id', sportFilter);
    }
    
    // Use HNSW index for similarity search
    query = query
        .order(`characteristic_vector <=> '${JSON.stringify(user.preference_vector)}'`)
        .limit(limit * 2);
    
    const { data: matches, error: searchError } = await query;
    
    if (searchError) throw searchError;
    
    // Calculate similarities and build recommendations
    const recommendations: MatchRecommendation[] = [];
    
    for (const match of matches) {
        const similarity = cosineSimilarity(
            user.preference_vector,
            match.characteristic_vector
        );
        
        if (similarity >= minScore) {
            const scoreData = calculateRecommendationScore(similarity);
            
            recommendations.push({
                match: {
                    ...match,
                    sport: match.sports,
                    location: match.locations
                },
                score: similarity,
                percentage: scoreData.percentage,
                explanation: scoreData.explanation,
                calculation_details: {
                    method: 'cosine_similarity',
                    user_vector_dimensions: 384,
                    match_vector_dimensions: 384,
                    similarity_raw: similarity
                }
            });
        }
    }
    
    return recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}
```

## 5. Performance Optimizations

### 5.1 Database Optimizations

```sql
-- Connection pooling configuration
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '4MB';

-- Vector-specific optimizations
ALTER SYSTEM SET maintenance_work_mem = '64MB';  -- For index building
ALTER SYSTEM SET random_page_cost = 1.1;        -- SSD optimization

-- Query optimization
CREATE STATISTICS users_vector_stats ON preference_vector FROM users;
CREATE STATISTICS matches_vector_stats ON characteristic_vector FROM matches;
```

### 5.2 Caching Strategy

```typescript
// Redis-based caching for frequent queries
class RecommendationCache {
    private redis: Redis;
    private readonly TTL = 3600; // 1 hour cache
    
    async getCachedRecommendations(
        userId: string,
        type: 'users' | 'matches'
    ): Promise<any[] | null> {
        const key = `recommendations:${type}:${userId}`;
        const cached = await this.redis.get(key);
        return cached ? JSON.parse(cached) : null;
    }
    
    async setCachedRecommendations(
        userId: string,
        type: 'users' | 'matches',
        recommendations: any[]
    ): Promise<void> {
        const key = `recommendations:${type}:${userId}`;
        await this.redis.setex(key, this.TTL, JSON.stringify(recommendations));
    }
    
    async invalidateUserCache(userId: string): Promise<void> {
        const keys = await this.redis.keys(`recommendations:*:${userId}`);
        if (keys.length > 0) {
            await this.redis.del(...keys);
        }
    }
}
```

### 5.3 Batch Processing Optimizations

```typescript
// Optimized batch similarity calculation
function batchCosineSimilarity(
    queryVector: number[],
    targetVectors: number[][]
): number[] {
    const similarities: number[] = [];
    
    // Pre-calculate query vector norm
    const queryNorm = Math.sqrt(
        queryVector.reduce((sum, val) => sum + val * val, 0)
    );
    
    if (queryNorm === 0) {
        return new Array(targetVectors.length).fill(0);
    }
    
    for (const targetVector of targetVectors) {
        let dotProduct = 0;
        let targetNorm = 0;
        
        // Single loop for both calculations
        for (let i = 0; i < queryVector.length; i++) {
            const q = queryVector[i];
            const t = targetVector[i] || 0;
            
            dotProduct += q * t;
            targetNorm += t * t;
        }
        
        if (targetNorm === 0) {
            similarities.push(0);
        } else {
            const similarity = dotProduct / (queryNorm * Math.sqrt(targetNorm));
            similarities.push(Math.max(-1, Math.min(1, similarity)));
        }
    }
    
    return similarities;
}
```

---

**Next Document**: [Models and Technologies Deep Dive](04_Models_and_Technologies_Deep_Dive.md)

This document provides detailed analysis of the AI models and technologies powering our vector-based recommendation system.
