# Sportea Recommendation System Testing Guide

## Overview

This guide provides instructions for testing the recommendation system in Sportea. The system uses a hybrid approach combining content-based filtering (vector similarity) and collaborative filtering to provide personalized match recommendations.

## Prerequisites

1. Sportea app running locally at http://localhost:5173
2. User account with login credentials
3. Access to Supabase Edge Functions 

## Testing Interface

Navigate to: `http://localhost:5173/test-recommendations`

The testing interface has four tabs:

1. **Basic Test**: Simple recommendation retrieval
2. **Embeddings**: Test embedding generation for users and matches
3. **Pipeline Test**: End-to-end testing
4. **Results**: View detailed test results

## Fixed Issues
- Edge Functions now return mock data instead of errors
- Improved error handling to always return 200 status codes
- Fixed request payload parsing to handle any JSON format

## Testing Steps

### 1. Basic Recommendation Test
1. Go to `/test-recommendations`
2. Click "Test Recommendations" button on the first tab
3. View results in the "Results" tab - you should see 3 mock recommendations

### 2. User/Match Embeddings Test
1. Select the "Embeddings" tab
2. Choose a user/match from the list
3. Click "Generate User Embedding" or "Generate Match Embedding"
4. Check for success message or vector visualization

### 3. End-to-End Pipeline Test
1. Select the "Pipeline Test" tab
2. Choose a user ID
3. Click "Run Full Pipeline Test"
4. Check pipeline status indicators

## Expected Results
- All recommendation requests should return mock data
- The Results tab should show football, basketball, and futsal matches
- Each mock recommendation includes a match title, sport type, and score

## Troubleshooting
If errors persist, check:
1. Browser console for detailed error messages
2. Supabase Edge Function logs in the dashboard
3. Network tab for request/response details

This is a temporary solution that returns mock data while we resolve the database connectivity issues.

## Current State & Next Steps

The current implementation returns mock data instead of actual personalized recommendations. This is a temporary fix to ensure the frontend functions properly while we address the underlying database connectivity issues.

### Next steps for fully implementing the recommendation system:

1. Verify that the pgvector extension is properly installed and configured
2. Ensure the recommendation_embeddings table exists with the correct schema
3. Test the database connection from the Edge Functions
4. Gradually reimplement the actual recommendation algorithm in the Edge Functions

To monitor Edge Function logs for further debugging:
- Go to the Supabase dashboard
- Navigate to Edge Functions
- Click on the function name
- Check the Logs tab

## Test Procedures

### 1. Basic Recommendation Test

This test verifies that the recommendation service can retrieve recommendations for the current user.

1. Log in to your account
2. Navigate to `/test-recommendations`
3. On the "Basic Test" tab, click "Test Recommendations"
4. Verify that recommendations are displayed in the "Results" tab
5. Check the diagnostic data for any errors or warnings

### 2. Testing Embedding Generation

#### User Embeddings

1. Go to the "Embeddings" tab
2. In the "User Embeddings" accordion, select a user from the list or enter a user ID
3. Click "Generate User Embedding"
4. Verify that the user's embedding is generated successfully
5. You should see the vector visualization if successful

#### Match Embeddings

1. In the "Match Embeddings" accordion, select a match from the list or enter a match ID
2. Click "Generate Match Embedding"
3. Verify that the match's embedding is generated successfully
4. You should see the vector visualization if successful

### 3. End-to-End Pipeline Test

This test runs the complete recommendation pipeline including embedding generation and retrieval.

1. Go to the "Pipeline Test" tab
2. Enter a user ID or use the current user
3. Click "Run Full Pipeline Test"
4. Monitor the pipeline status indicators
5. Check the "Results" tab for the final recommendations

### 4. Examining Results

1. Go to the "Results" tab
2. Review the recommendations returned
3. Check the "Recommendation Type" to see which algorithm was used
4. Examine the "Diagnostic Data" section for detailed information
5. Verify that no validation errors are present

## Common Issues and Troubleshooting

1. **Missing Embeddings**: If no recommendations are shown, check that embeddings exist for both users and matches.
2. **Empty Results**: This may indicate that the user has already joined all available matches or no suitable matches exist.
3. **Edge Function Errors**: Check the browser console for detailed error messages from the Supabase Edge Functions.
4. **CORS Issues**: Ensure that CORS headers are properly configured in the Edge Functions.

## Performance Evaluation

- Record the response time for recommendation retrievals
- Test with different numbers of matches and users
- Check CPU and memory usage during embedding generation
- Verify that recommendations are personalized based on user preferences

## Expected Outcomes

1. Successful recommendation retrieval with personalized matches
2. Generated embeddings for users and matches
3. Complete pipeline execution with no errors
4. Comprehensive diagnostic information in the results 

## Next Steps

Now that we've deployed the temporary fixes, here are the next steps to fully fix the recommendation system:

1. Debug the database connection issues in the original Edge Functions
2. Verify the pgvector extension is properly configured
3. Check that the recommendation_embeddings table has the correct structure
4. Ensure the Edge Functions have the necessary permissions to access the database
5. Update the Edge Functions to use the actual database queries once the connection issues are resolved

## Troubleshooting

If you still encounter issues:

1. Clear your browser cache and try again
2. Check the browser console for error messages
3. Verify that you're logged in to the application
4. Try accessing the test pages in an incognito/private browsing window 