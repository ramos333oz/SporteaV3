# Sportea Recommendation System Architecture

## Overview

The Sportea recommendation system is designed to provide personalized match recommendations to users based on their preferences and behavior. It uses a hybrid approach combining content-based filtering and collaborative filtering to generate relevant recommendations.

## Architecture Components

### 1. Frontend Components

- **TestRecommendations.jsx**: A comprehensive testing UI with tabbed interface for diagnostic testing
- **recommendationService.js**: Client-side service for interacting with recommendation endpoints
- **RecommendationsList.jsx**: Component for displaying recommendations in the main app UI
- **RecommendationCard.jsx**: Card component for rendering individual match recommendations

### 2. Backend Components

- **Edge Functions**:
  - `generate-user-embeddings`: Creates and updates user preference vectors
  - `generate-match-embeddings`: Creates and updates match characteristic vectors
  - `get-recommendations`: Main recommendation algorithm
  - `get-recommendations-diagnostic`: Debugging version with enhanced diagnostics

- **Database Tables**:
  - `users`: Includes `preference_vector` column for user embeddings
  - `matches`: Includes `characteristic_vector` column for match embeddings
  - `recommendation_analytics`: Tracks recommendation actions (shown, clicked, joined)
  - `participants`: Records match participation (used for collaborative filtering)

- **SQL Functions**:
  - `match_similar_vector`: Performs similarity search using pgvector
  - `find_similar_users`: Identifies users with similar preferences and behavior

## Algorithms and Methods

### 1. Content-Based Filtering

- Uses vector embeddings to represent user preferences and match characteristics
- Employs pgvector's similarity search to find matches that align with user preferences
- Embeddings are generated using GTE-small model via the transformers.js library
- Users are represented by their activities, preferences, and historical participation
- Matches are represented by their attributes including sport, location, skill level, etc.

### 2. Collaborative Filtering

- Identifies similar users based on preference vectors and match participation
- Finds matches that similar users have joined or hosted
- Ranks matches based on the number of similar users who have engaged with them
- Provides "social proof" recommendations even when content-based similarity is low

### 3. Hybrid Approach

- Combines recommendations from both algorithms with configurable weights
- Content-based: 60% weight (CONTENT_BASED_WEIGHT = 0.6)
- Collaborative: 40% weight (COLLABORATIVE_WEIGHT = 0.4)
- Computes a final score for each match and ranks by descending score
- Provides fallback to generic recommendations for new users without embeddings

## Data Flow

1. **Embedding Generation**:
   - User data (preferences, history, interactions) → Text representation → Vector embedding
   - Match data (title, sport, location, skill level) → Text representation → Vector embedding
   - Embeddings stored in database (pgvector columns)

2. **Recommendation Process**:
   - User ID → Retrieve user preference vector
   - Retrieve matches user has already joined (for exclusion)
   - Get content-based recommendations via vector similarity
   - Get collaborative recommendations via similar users
   - Merge and rank recommendations
   - Return top N recommendations to client

3. **Recommendation Tracking**:
   - Log when recommendations are shown to users
   - Track when users interact with recommendations (click, join, dismiss)
   - Use this data to improve future recommendations

## Error Handling and Diagnostics

- Robust error handling in both client and server components
- Retry mechanism for network failures and Edge Function timeouts
- Diagnostic mode for detailed logging and debugging
- Fallback to generic recommendations when critical errors occur
- Mock data for production users when recommendation service is unavailable

## Performance Considerations

- Batch processing for embedding generation to avoid timeout issues
- Caching opportunities for recommendations and similar users
- Vector index optimization for similarity search
- Limiting the number of recommendations to control response time
- Proper validation of input parameters to prevent bad requests

## Security Considerations

- Service role key used only in secure Edge Functions
- Client-side code only uses anonymous key
- Input validation to prevent injection attacks
- Rate limiting to prevent abuse
- No sensitive user data in embeddings or recommendations

## Future Enhancements

1. A/B testing framework for algorithm variations
2. Real-time recommendation updates based on user activity
3. Contextual recommendations based on time, location, and availability
4. Enhanced explanation system for recommendation transparency
5. Personalized ranking factors based on individual user preferences 