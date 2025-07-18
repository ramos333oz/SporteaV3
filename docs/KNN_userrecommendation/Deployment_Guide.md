# KNN User Recommendation System - Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the KNN User Recommendation System in production environments. The system implements Instagram-style user discovery for finding similar users based on sports preferences and profile data.

## Prerequisites

### Database Requirements
- PostgreSQL database with Supabase
- Required extensions: `uuid-ossp`
- Minimum PostgreSQL version: 13+

### Application Requirements
- Node.js 18+ 
- React 18+
- Supabase CLI installed
- NPX for Edge Function deployment

## Deployment Steps

### 1. Database Schema Deployment

Apply the KNN vector tables and functions:

```sql
-- Run the migration
supabase migration up --file 20250117_create_knn_vectors.sql
supabase migration up --file 20250117_add_knn_triggers.sql
```

Verify deployment:
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_vectors_knn', 'user_similarity_cache_knn');

-- Check functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%knn%';
```

### 2. Edge Function Deployment

Deploy the KNN computation Edge Function:

```bash
# Deploy using npx (as per user requirements)
npx supabase functions deploy knn-recommendations

# Verify deployment
npx supabase functions list
```

### 3. Frontend Component Integration

Ensure the following components are properly integrated:

#### Required Files:
- `src/components/UserRecommendations/UserRecommendationModal.jsx`
- `src/components/UserRecommendations/UserRecommendationCard.jsx`
- `src/components/UserRecommendations/UserRecommendationTrigger.jsx`
- `src/services/userRecommendationService.js`
- `src/services/knnVectorService.js`
- `src/services/knnRecommendationService.js`
- `src/services/unifiedRecommendationService.js`

#### Integration Points:
- Friends page: `src/pages/Friends.jsx` (User Recommendation Trigger)
- Optional: Add to navigation or as floating action button

### 4. Environment Configuration

#### Production Environment Variables:
```env
# Supabase Configuration
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_anon_key

# KNN System Configuration (optional)
REACT_APP_KNN_MIN_COMPLETENESS=0.4
REACT_APP_KNN_DEFAULT_K=20
REACT_APP_KNN_MIN_SIMILARITY=0.3
REACT_APP_KNN_USE_EDGE_FUNCTION=true
```

#### Supabase Edge Function Environment:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 5. Performance Optimization

#### Database Indexes
Verify all performance indexes are created:
```sql
-- Check KNN indexes
SELECT indexname, tablename FROM pg_indexes 
WHERE tablename IN ('user_vectors_knn', 'user_similarity_cache_knn');
```

#### Cache Configuration
- Vector similarity cache: 24 hours
- User recommendation cache: 15 minutes
- Edge Function timeout: 8 seconds

### 6. Monitoring and Maintenance

#### Health Checks
```sql
-- Get KNN system statistics
SELECT * FROM get_knn_vector_stats();

-- Check cache performance
SELECT COUNT(*) as cache_entries, 
       AVG(EXTRACT(EPOCH FROM (NOW() - calculated_at))/3600) as avg_age_hours
FROM user_similarity_cache_knn;
```

#### Maintenance Tasks
```sql
-- Clean up old cache entries (run daily)
SELECT cleanup_similarity_cache();

-- Monitor vector completeness
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN completeness_score >= 0.4 THEN 1 END) as high_quality,
  COUNT(CASE WHEN completeness_score >= 0.3 THEN 1 END) as usable,
  AVG(completeness_score) as avg_completeness
FROM user_vectors_knn;
```

## Configuration Options

### KNN Algorithm Parameters

#### Vector Completeness Threshold
```javascript
// In unifiedRecommendationService.js
MIN_COMPLETENESS_FOR_KNN: 0.4  // 40% minimum for quality recommendations
```

#### Similarity Thresholds
```javascript
// In userRecommendationService.js
minSimilarity: 0.3  // 30% minimum user similarity
k: 20              // Number of nearest neighbors to analyze
```

#### Cache Settings
```javascript
// User recommendation cache duration
USER_CACHE_DURATION: 15 * 60 * 1000  // 15 minutes

// Edge Function timeout
EDGE_FUNCTION_TIMEOUT: 8000  // 8 seconds
```

### UI Configuration

#### Recommendation Trigger Variants
```jsx
// Button variant (default)
<UserRecommendationTrigger variant="button" />

// Card variant (for Friends page)
<UserRecommendationTrigger variant="card" />

// Floating Action Button
<UserRecommendationTrigger variant="fab" />
```

## Troubleshooting

### Common Issues

#### 1. No User Recommendations Shown
**Symptoms**: "Complete your profile to get recommendations"
**Solution**: 
- Check user vector completeness: `SELECT completeness_score FROM user_vectors_knn WHERE user_id = 'user_id'`
- Ensure user has sport preferences, faculty, and availability data
- Minimum 40% completeness required for quality recommendations

#### 2. Edge Function Timeout
**Symptoms**: Fallback to local KNN service
**Solution**:
- Check Edge Function logs: `npx supabase functions logs knn-recommendations`
- Verify database performance and indexes
- Consider increasing timeout or optimizing vector calculations

#### 3. Slow Vector Building
**Symptoms**: Long delays when building user vectors
**Solution**:
- Check facility mapping initialization
- Verify database indexes on users table
- Monitor hash calculation function performance

#### 4. Cache Performance Issues
**Symptoms**: Repeated similarity calculations
**Solution**:
- Check cache table size: `SELECT COUNT(*) FROM user_similarity_cache_knn`
- Verify cache cleanup is running
- Monitor cache hit rates in application logs

### Performance Monitoring

#### Key Metrics to Track
1. **Vector Completeness Distribution**
2. **Cache Hit Rates**
3. **Edge Function Response Times**
4. **User Recommendation Quality Scores**
5. **Database Query Performance**

#### Alerting Thresholds
- Vector completeness < 30% for active users
- Cache hit rate < 70%
- Edge Function timeout rate > 10%
- Average recommendation generation time > 2 seconds

## Security Considerations

### Data Privacy
- User vectors contain encoded preference data only
- No sensitive personal information in vectors
- Similarity calculations use mathematical distances only

### Access Control
- Edge Functions use service role key (server-side only)
- Frontend uses anon key with RLS policies
- User recommendations filtered by privacy settings

### Rate Limiting
- Recommendation requests: 10 per minute per user
- Vector building: 5 per minute per user
- Edge Function calls: 100 per minute per user

## Rollback Procedures

### Emergency Rollback
1. **Disable Edge Function**: Set `USE_EDGE_FUNCTION: false`
2. **Fallback to Simplified**: Modify algorithm selection logic
3. **Database Rollback**: Drop KNN tables if necessary

### Gradual Rollback
1. **Reduce Traffic**: Lower completeness threshold
2. **Monitor Performance**: Check system stability
3. **Selective Disable**: Disable for specific user groups

## Production Checklist

### Pre-Deployment
- [ ] Database migrations applied
- [ ] Edge Function deployed and tested
- [ ] Environment variables configured
- [ ] Performance indexes verified
- [ ] Cache cleanup scheduled

### Post-Deployment
- [ ] Health checks passing
- [ ] User recommendations generating
- [ ] Edge Function responding
- [ ] Cache performance optimal
- [ ] Monitoring alerts configured

### Ongoing Maintenance
- [ ] Weekly cache cleanup
- [ ] Monthly performance review
- [ ] Quarterly algorithm tuning
- [ ] User feedback analysis

## Support and Maintenance

### Log Locations
- **Frontend**: Browser console and application logs
- **Edge Function**: `npx supabase functions logs knn-recommendations`
- **Database**: PostgreSQL logs and query performance

### Performance Tuning
- Adjust K value based on user base size
- Optimize vector completeness thresholds
- Fine-tune cache durations
- Monitor and adjust similarity thresholds

### Scaling Considerations
- Vector storage grows with user base
- Cache size increases with user interactions
- Edge Function concurrency limits
- Database connection pooling requirements

This deployment guide ensures successful production deployment of the KNN User Recommendation System with proper monitoring, maintenance, and troubleshooting procedures.
