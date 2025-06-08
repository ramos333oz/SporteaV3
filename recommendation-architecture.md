# Sportea Recommendation System Architecture

## Current Implementation (Temporary Fix)

We've implemented a temporary solution to address the 500/400 errors in the Edge Functions:

1. **Mock Data Responses**: Both Edge Functions (`get-recommendations` and `get-recommendations-diagnostic`) now return mock recommendation data instead of attempting database queries.
2. **Improved Error Handling**: All errors now return HTTP 200 status codes with error information in the response body to avoid triggering unnecessary retries.
3. **Resilient Request Parsing**: The functions now handle any JSON payload format, even invalid ones, providing reasonable defaults when necessary.

This approach allows the frontend to function properly while we address the underlying database connectivity issues.

## Planned Architecture (Final Implementation)

### 1. Frontend Components

- **TestRecommendations.jsx**: Diagnostic UI with tabs for testing different aspects of the recommendation system
- **recommendationService.js**: Client-side service with robust error handling and fallback mechanisms
- **RecommendationsList.jsx**: Component for displaying recommendations in the main app UI
- **RecommendationCard.jsx**: Card component for individual match recommendations

### 2. Backend Components

- **Edge Functions**:
  - `get-recommendations`: Core algorithm combining content-based and collaborative filtering
  - `get-recommendations-diagnostic`: Version with additional debugging information
  - `generate-user-embeddings`: Creates user preference vectors from profile and activity data
  - `generate-match-embeddings`: Creates match characteristic vectors

- **Database**:
  - pgvector extension for vector similarity search
  - recommendation_embeddings table storing user and match embedding vectors
  - SQL functions for similarity calculations

### 3. Recommendation Algorithm

The system uses a hybrid approach combining:

1. **Content-Based Filtering**: Uses vector similarity between user preferences and match characteristics
2. **Collaborative Filtering**: Recommends matches based on similar users' participation
3. **Recency & Popularity Factors**: Boosts recently created matches and those with high participation
4. **Fallback Mechanism**: Provides generic recommendations for new users with little data

## Next Steps for Implementation

1. Verify pgvector extension installation and configuration
2. Ensure the recommendation_embeddings table exists with the correct schema
3. Test database connectivity from Edge Functions using simplified queries
4. Implement content-based filtering using vector similarity
5. Add collaborative filtering component
6. Combine approaches into a hybrid model with configurable weights
7. Implement feedback mechanism to improve recommendations over time

## Technical Considerations

- **Performance**: Vector operations are computationally intensive, so caching may be necessary
- **Cold Starts**: Edge Functions have cold start latency, affecting initial response times
- **Database Load**: Similarity queries can be resource-intensive on the database
- **Privacy**: User preference data should be handled securely
- **Fallbacks**: Multiple fallback mechanisms ensure users always receive recommendations

This architecture provides a robust foundation for delivering personalized match recommendations to Sportea users.

## Architecture Components

### 1. Frontend Components

- **TestRecommendations.jsx**: A comprehensive testing UI with tabbed interface for diagnostic testing
- **recommendationService.js**: Client-side service for interacting with recommendation endpoints
- **RecommendationsList.jsx**: Component for displaying recommendations in the main app UI
- **RecommendationCard.jsx**: Card component for rendering individual match recommendations

### 2. Backend Components

- **Edge Functions**:
  - `generate-user-embeddings`: Creates user preference vectors
  - `generate-match-embeddings`: Creates match characteristic vectors
  - `get-recommendations`: Main recommendation algorithm
  - `get-recommendations-diagnostic`: Enhanced version with debugging information

### 3. Database Components

- **pgvector Extension**: PostgreSQL extension for vector operations
- **recommendation_embeddings Table**: Stores embedding vectors for users and matches
- **Database Functions**: SQL functions for similarity search

## Recommendation Algorithm

The recommendation system uses a hybrid approach:

1. **Content-Based Filtering**: 
   - Generates embedding vectors for users based on preferences and activity
   - Generates embedding vectors for matches based on characteristics
   - Uses vector similarity search to find matches similar to user preferences

2. **Collaborative Filtering**:
   - Identifies users with similar preferences
   - Recommends matches that similar users have joined

3. **Hybrid Weighting**:
   - Combines scores from both approaches
   - Adjusts weights based on data availability

## Known Issues and Future Improvements

### Current Issues

1. **Database Connection**: Edge Functions are having trouble connecting to the database
2. **Service Role Authentication**: Possible issues with service role keys or permissions
3. **Vector Extension Integration**: Need to verify pgvector is properly configured

### Planned Improvements

1. **Fix Database Connection**: Ensure Edge Functions can properly connect to the database
2. **Restore Vector-Based Recommendations**: Re-enable the full recommendation algorithm
3. **Performance Optimization**: Add caching layer to reduce computation load
4. **Improved Monitoring**: Add detailed logging and monitoring for Edge Functions
5. **Fallback Mechanism**: Enhance the system to gracefully handle partial failures

## Testing Strategy

The TestRecommendations component provides a comprehensive UI for testing the recommendation system:

1. **Basic Test**: Simple recommendation retrieval
2. **Embeddings Test**: Testing embedding generation for users and matches
3. **Pipeline Test**: End-to-end testing of the entire recommendation flow
4. **Results**: Detailed display of test results and diagnostics

This component is accessible at `/test-recommendations` and is instrumental in diagnosing and fixing issues with the recommendation system.

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