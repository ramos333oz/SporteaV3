# Recommendation System Verification Checklist

Use this checklist to verify that all components of the recommendation system are working correctly before deploying to production.

## Database Verification

- [ ] SQL migrations have been applied
  - [ ] New futsal venues added (COURT PERINDU 1, 2, 3)
  - [ ] user_preferences table updated with new fields
  - [ ] match_history table created
  - [ ] user_engagement table created
  - [ ] match_ratings table created
  - [ ] user_similarity table created
  - [ ] user_activity_metrics table created
  - [ ] All necessary indexes created

## Edge Function Verification

- [ ] get-recommendations-light Edge Function deployed
  - [ ] Function returns correct response format
  - [ ] Function handles errors gracefully
  - [ ] Function includes proper logging
  - [ ] Function performs within acceptable time limits (< 2 seconds)

## Frontend Verification

- [ ] recommendationService.js updated to use new Edge Function
  - [ ] Legacy system used as fallback
  - [ ] Error handling implemented
- [ ] RecommendationCard.jsx updated to display component scores
  - [ ] Color coding works correctly
  - [ ] Explanations displayed correctly

## Test Verification

- [ ] All tests pass
  - [ ] Run `node supabase/functions/tests/test-recommendations-light.js`
  - [ ] Run `node test-edge-function.js`
  - [ ] Verify no errors in console

## User Migration Verification

- [ ] User preferences migration script works correctly
  - [ ] Run `node migrate-user-preferences.js` on test environment
  - [ ] Verify preferences are correctly migrated

## Performance Verification

- [ ] Response time is acceptable (< 2 seconds)
  - [ ] Test with 10 recommendations
  - [ ] Test with 20 recommendations
  - [ ] Test with 50 recommendations
- [ ] CPU usage is acceptable
- [ ] Memory usage is acceptable

## Deployment Readiness

- [ ] All code changes committed
  - [ ] Run `./commit-changes.sh` or `.\commit-changes.ps1`
- [ ] Changes pushed to remote repository
  - [ ] Run `git push origin <branch-name>`
- [ ] Edge Function deployed
  - [ ] Run `./deploy-edge-function.sh` or `.\deploy-edge-function.ps1`
- [ ] Monitoring in place
  - [ ] Error logging configured
  - [ ] Performance metrics tracked

## Rollback Plan

In case of issues, follow these steps to roll back:

1. Revert to using the legacy recommendation system:
   - Update `recommendationService.js` to set `USE_SIMPLIFIED_ENDPOINT = false`
   - Deploy the updated file

2. If database issues occur:
   - Run the rollback SQL script: `supabase/migrations/20250616_recommendation_system_rollback.sql`

3. Document any issues encountered:
   - Create an issue in the repository with details
   - Include error logs and steps to reproduce 