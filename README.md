# Sportea Recommendation System

This repository contains the implementation of Sportea's recommendation system, which matches users with sports activities and other players based on their preferences.

## Overview

The recommendation system uses a direct preference matching algorithm to provide personalized recommendations to users. It considers various factors including:

- Sports preferences (50% of score)
- Venue preferences (20% of score)
- Schedule compatibility (15% of score)
- Other preferences like group size and skill level (15% of score)

## Architecture

The system consists of:

1. **Edge Functions**: Serverless functions that handle recommendation logic
   - `get-recommendations-light`: Main recommendation function using direct preference matching

2. **Database Tables**:
   - `user_preferences`: Stores user preferences
   - `venues`: Stores venue information
   - `match_history`: Tracks past match participation
   - `user_engagement`: Tracks user interactions
   - `match_ratings`: Collects feedback after matches

## Verifying the System

To verify that the recommendation system is working correctly:

1. **Prerequisites**:
   - Node.js installed
   - Access to your Supabase project
   - A test user account

2. **Setup**:
   - Create a `.env` file with the following variables:
     ```
     SUPABASE_URL=your_supabase_url
     SUPABASE_ANON_KEY=your_supabase_anon_key
     TEST_USER_EMAIL=your_test_user_email
     TEST_USER_PASSWORD=your_test_user_password
     ```
   - Install required dependencies:
     ```bash
     npm install dotenv @supabase/supabase-js
     ```

3. **Quick Verification**:
   - Run the verification script:
     ```bash
     node verify-recommendation-system.js
     ```
   - This will make a single request to the recommendation system and display the results

4. **Comprehensive Testing**:
   - For more detailed testing, run:
     ```bash
     node test-recommendations.js
     ```
   - This will test the system with different parameters and verify component scores

5. **Performance Monitoring**:
   - To monitor performance, run:
     ```bash
     node monitor-recommendations.js
     ```
   - This will run multiple tests and generate a performance report

## Deployment

To deploy the Edge Function:

### Linux/Mac:
```bash
chmod +x deploy-edge-function.sh
./deploy-edge-function.sh
```

### Windows:
```powershell
.\deploy-edge-function.ps1
```

## Documentation

For more detailed information, see:

- [Recommendation Testing Guide](recommendation-testing-guide.md) - Detailed instructions for testing
- [Recommendation Implementation Summary](Recommendation_Implementation_Summary.md) - Overview of implementation details
- [Recommendation Deployment Plan](Recommendation_Deployment_Plan.md) - Phased deployment strategy

## Next Steps

The current implementation focuses on direct preference matching (Phase 1). Future phases will include:

- **Phase 2**: Collaborative filtering based on user similarities
- **Phase 3**: Activity-based scoring using historical data 