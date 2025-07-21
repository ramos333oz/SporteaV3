# Entity Relationship Diagram (ERD) Analysis Report

## Phase 1: Database Schema Analysis

### Database Overview
- **Project**: Sportea V3 (Sports Matching Platform)
- **Database**: Supabase PostgreSQL
- **Project ID**: fcwwuiitsghknsvnsrxp
- **Analysis Date**: July 19, 2025

### Active Tables Identified

#### Core Application Tables
1. **users** - Main user profiles and authentication
2. **sports** - Sports catalog and definitions
3. **locations** - Venues and facilities
4. **matches** - Sports matches and events
5. **participants** - Match participation tracking
6. **ratings** - User rating system
7. **notifications** - Notification system
8. **messages** - Messaging system

#### Gamification & Social Features
9. **user_gamification** - XP and achievement tracking
10. **friendships** - Friend relationships
11. **achievements** - Achievement definitions
12. **user_achievements** - User achievement tracking

#### Match Management
13. **match_invitations** - Match invitation system
14. **match_join_requests** - Join request system
15. **host_notifications** - Host-specific notifications

#### Recommendation System
16. **user_vectors_knn** - KNN recommendation vectors
17. **user_similarity_cache_knn** - Similarity caching
18. **recommendation_feedback** - Recommendation feedback
19. **user_activity_metrics** - Activity tracking

#### Content Moderation & Admin
20. **content_moderation_results** - Content moderation
21. **admin_review_queue** - Admin review system
22. **user_behavior_patterns** - Behavior tracking
23. **learning_parameters** - ML parameters
24. **threshold_contexts** - Adaptive thresholds
25. **learning_feedback_signals** - Learning system feedback

#### Reporting & Limits
26. **user_reports** - User reporting system
27. **user_report_limits** - Report limits tracking
28. **user_hosting_limits** - Host limits tracking

### Code Usage Analysis

#### Heavily Used Tables (High Activity)
- **users**: Referenced in all major components
- **matches**: Core functionality, heavily queried
- **sports**: Referenced in match creation and filtering
- **locations**: Used in match hosting and search
- **participants**: Active participation tracking
- **notifications**: Real-time notification system

#### Moderately Used Tables (Medium Activity)
- **user_gamification**: XP system implementation
- **friendships**: Social features
- **match_invitations**: Invitation workflow
- **recommendation_feedback**: Recommendation system
- **content_moderation_results**: Content safety

#### Specialized Tables (Low but Critical Activity)
- **user_vectors_knn**: KNN recommendation calculations
- **admin_review_queue**: Admin moderation workflow
- **learning_parameters**: ML system configuration
- **threshold_contexts**: Adaptive learning system

### Legacy/Unused Tables Identified
- **chats**: Mentioned in old documentation but not in current schema
- **venues**: Replaced by `locations` table
- **match_history**: Replaced by `participants` table
- **user_engagement**: Replaced by other tracking mechanisms

### Database Relationships Summary

#### Primary Relationships
1. **users** ↔ **matches** (host_id)
2. **matches** ↔ **participants** (match_id, user_id)
3. **matches** ↔ **sports** (sport_id)
4. **matches** ↔ **locations** (location_id)
5. **users** ↔ **friendships** (user_id, friend_id)
6. **users** ↔ **user_gamification** (user_id)

#### Secondary Relationships
7. **users** ↔ **notifications** (user_id)
8. **users** ↔ **ratings** (rater_id, rated_user_id)
9. **matches** ↔ **match_invitations** (match_id)
10. **users** ↔ **user_vectors_knn** (user_id)

#### Administrative Relationships
11. **users** ↔ **admin_review_queue** (assigned_admin_id)
12. **content_moderation_results** ↔ **threshold_contexts**
13. **user_behavior_patterns** ↔ **learning_feedback_signals**

### Next Steps
1. Create individual entity SVG diagrams for each active table
2. Design comprehensive ERD showing all relationships
3. Document entity purposes and constraints
4. Validate relationships against codebase usage
