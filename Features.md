UiTM Sports Match Platform - Technical Specification
File System
Frontend Repository Structure
/uitm-sports-frontend
├── public/
│   ├── index.html
│   ├── manifest.json
│   └── icons/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.jsx
│   │   │   ├── RegisterForm.jsx
│   │   │   ├── EmailVerification.jsx
│   │   │   └── PasswordReset.jsx
│   │   ├── matches/
│   │   │   ├── MatchCard.jsx
│   │   │   ├── MatchDetails.jsx
│   │   │   ├── CreateMatch.jsx
│   │   │   ├── MatchFilters.jsx
│   │   │   └── LiveMatchBoard.jsx
│   │   ├── profile/
│   │   │   ├── UserProfile.jsx
│   │   │   ├── ProfileSettings.jsx
│   │   │   ├── Achievements.jsx
│   │   │   └── FriendsList.jsx
│   │   ├── recommendations/
│   │   │   ├── RecommendedMatches.jsx
│   │   │   └── PreferenceSettings.jsx
│   │   ├── messaging/
│   │   │   ├── ChatWindow.jsx
│   │   │   ├── MessageList.jsx
│   │   │   └── FriendRequests.jsx
│   │   └── common/
│   │       ├── Header.jsx
│   │       ├── Navigation.jsx
│   │       ├── LoadingSpinner.jsx
│   │       └── ErrorBoundary.jsx
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   ├── RealtimeContext.jsx
│   │   └── NotificationContext.jsx
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useRealtime.js
│   │   ├── useMatches.js
│   │   └── useRecommendations.js
│   ├── services/
│   │   ├── api.js
│   │   ├── supabase.js
│   │   ├── websocket.js
│   │   └── notifications.js
│   ├── utils/
│   │   ├── validation.js
│   │   ├── dateHelpers.js
│   │   ├── constants.js
│   │   └── helpers.js
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── MatchBrowser.jsx
│   │   ├── CreateMatch.jsx
│   │   ├── Profile.jsx
│   │   └── Settings.jsx
│   └── App.jsx
├── package.json
└── tailwind.config.js

Backend Repository Structure
/uitm-sports-backend
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_matches_tables.sql
│   │   ├── 003_realtime_setup.sql
│   │   ├── 004_recommendations_tables.sql
│   │   └── 005_security_policies.sql
│   ├── functions/
│   │   ├── match-recommendations/
│   │   │   ├── index.ts
│   │   │   └── recommendation-engine.ts
│   │   ├── content-moderation/
│   │   │   ├── index.ts
│   │   │   └── moderation-rules.ts
│   │   ├── analytics/
│   │   │   ├── index.ts
│   │   │   └── metrics-collector.ts
│   │   └── notifications/
│   │       ├── index.ts
│   │       └── email-templates.ts
│   ├── seed/
│   │   ├── courts.sql
│   │   ├── sports.sql
│   │   └── test_users.sql
│   └── config.toml
├── scripts/
│   ├── setup-database.js
│   ├── deploy-functions.js
│   └── run-migrations.js
└── README.md

Feature Specifications
Feature 1: User Authentication & Registration System
Feature Goal: Implement secure email-based registration system exclusively for UiTM students with domain validation, email verification workflow, and JWT-based session management.
API Relationships:
Supabase Auth API for user management
Supabase Edge Functions for custom email validation
Integration with Profile Management (Feature 6)
Integration with Real-time System (Feature 2) for user status
Detailed Feature Requirements:
Registration Process:
Email domain validation must restrict to @student.uitm.edu.my only
Custom validation function checks email format before Supabase registration
Password requirements: minimum 8 characters with uppercase, lowercase, number, special character
Automatic profile creation with default sports preferences upon registration
Terms of service and privacy policy acceptance required
Email Verification Workflow:
Custom email template with UiTM branding
Verification link expires after 24 hours
Auto-login upon successful email confirmation
Resend verification option with 5-minute cooldown
Clear error messaging for expired/invalid tokens
Session Management:
JWT tokens with 7-day expiration
Refresh token rotation for security
Session persistence across browser tabs
Automatic logout on token expiration
Remember me functionality for 30-day sessions
Password Reset Functionality:
Secure password reset via email
Reset tokens expire after 1 hour
Password strength validation during reset
Email notification on successful password change
Account lockout after 5 failed attempts (15-minute duration)
Detailed Implementation Guide:
Database Schema Requirements:
-- Custom user profiles table (extends Supabase auth.users)
profiles (
  id: UUID (references auth.users.id),
  email: TEXT (validated @student.uitm.edu.my),
  full_name: TEXT,
  student_id: TEXT (unique),
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
  email_verified: BOOLEAN,
  sports_preferences: JSONB,
  skill_levels: JSONB,
  avatar_url: TEXT,
  is_active: BOOLEAN
)

-- Session tracking for analytics
user_sessions (
  id: UUID,
  user_id: UUID (references profiles.id),
  session_start: TIMESTAMP,
  session_end: TIMESTAMP,
  ip_address: TEXT,
  user_agent: TEXT
)

Frontend Implementation Steps:
Create registration form with real-time email validation
Implement custom email domain validation function
Build email verification waiting screen with resend functionality
Create secure login form with remember me option
Implement password reset flow with success/error states
Build session management context with automatic refresh
Create protected route wrapper component
Implement logout functionality with session cleanup
Backend Implementation Steps:
Configure Supabase Auth with custom email validation
Create email domain validation Edge Function
Set up custom email templates for verification and password reset
Implement RLS policies for profile access
Create user profile creation trigger
Set up session tracking for analytics
Configure rate limiting for authentication endpoints
Implement account lockout mechanism
Security Considerations:
CSRF protection on all auth endpoints
Rate limiting: 5 login attempts per minute per IP
Secure cookie configuration for JWT storage
Email verification bypass prevention
Brute force attack mitigation
Feature 2: Real-time Match Display System
Feature Goal: Implement live updating match board using WebSocket connections that instantly broadcasts newly created matches, participant changes, and match status updates to all connected users.
API Relationships:
Integrates with Match Hosting System (Feature 3) for broadcast triggers
Connects to User Authentication (Feature 1) for user-specific updates
Links to Match Discovery (Feature 4) for real-time filtering
Integrates with Messaging System (Future Feature) for chat notifications
Detailed Feature Requirements:
Real-time Match Broadcasting:
Instant broadcast when new matches are created
Live participant count updates as users join/leave
Match status changes (active, full, cancelled, completed)
Court availability updates in real-time
User-specific notifications for followed matches
Connection Management:
Automatic WebSocket reconnection on disconnect
Connection heartbeat every 30 seconds
Graceful degradation to polling if WebSocket fails
Connection status indicator in UI
Bandwidth-optimized message payloads
Data Synchronization:
Optimistic UI updates for immediate feedback
Conflict resolution for simultaneous actions
Message queuing during connection interruptions
Delta updates instead of full data refreshes
Client-side state reconciliation
Performance Requirements:
Sub-second update latency for 100+ concurrent users
Message deduplication to prevent duplicate updates
Connection pooling for efficient resource usage
Automatic cleanup of stale connections
Memory leak prevention in long-running sessions
Detailed Implementation Guide:
Database Schema Requirements:
-- Real-time subscriptions tracking
realtime_subscriptions (
  id: UUID,
  user_id: UUID (references profiles.id),
  subscription_type: TEXT, -- 'matches', 'user_activity', 'notifications'
  filters: JSONB, -- sport, skill_level, time_range filters
  created_at: TIMESTAMP,
  last_active: TIMESTAMP,
  is_active: BOOLEAN
)

-- Match events for real-time updates
match_events (
  id: UUID,
  match_id: UUID (references matches.id),
  event_type: TEXT, -- 'created', 'participant_joined', 'participant_left', 'cancelled', 'completed'
  user_id: UUID (references profiles.id),
  event_data: JSONB,
  created_at: TIMESTAMP
)

-- Connection status tracking
user_connections (
  id: UUID,
  user_id: UUID (references profiles.id),
  connection_id: TEXT,
  connected_at: TIMESTAMP,
  last_heartbeat: TIMESTAMP,
  is_active: BOOLEAN
)

Frontend Implementation Steps:
Create WebSocket connection manager with automatic reconnection
Implement subscription management for different event types
Build optimistic UI update system for immediate feedback
Create connection status indicator component
Implement message queuing for offline scenarios
Build real-time match list component with live updates
Create user presence indicators for active participants
Implement graceful degradation to polling fallback
Backend Implementation Steps:
Configure Supabase Realtime subscriptions for matches table
Create Edge Function for custom real-time event processing
Implement connection tracking and heartbeat system
Set up event filtering based on user preferences
Create match event trigger functions
Implement message deduplication logic
Set up connection cleanup for stale sessions
Configure rate limiting for WebSocket connections
Real-time Event Types:
match:created - New match available
match:participant_joined - User joined match
match:participant_left - User left match
match:status_changed - Match status updated
match:cancelled - Match cancelled by host
user:online - User came online
user:offline - User went offline
Connection Resilience Strategy:
Exponential backoff for reconnection attempts
Connection state persistence across page refreshes
Message replay for missed updates during disconnection
Duplicate message filtering
Connection health monitoring with automatic failover
Feature 3: Match Hosting & Management System
Feature Goal: Comprehensive match creation system with sport-specific constraints, predefined court locations, date/time scheduling with conflict detection, and complete match lifecycle management.
API Relationships:
Triggers Real-time Display System (Feature 2) for match broadcasts
Integrates with User Authentication (Feature 1) for host permissions
Connects to Match Discovery (Feature 4) for searchable match data
Links to Recommendation Engine (Feature 5) for match scoring
Integrates with Profile Management (Feature 6) for host reputation
Detailed Feature Requirements:
Match Creation System:
Sport-specific player limits (Football: 10-22, Basketball: 6-12, Badminton: 2-4, etc.)
Predefined court selection with location data and facility details
Date/time scheduling with 2-hour minimum advance booking
Skill level requirements (Beginner/Intermediate/Professional)
Match duration settings (1-4 hours with 30-minute increments)
Optional equipment requirements and sharing arrangements
Court Management:
Pre-loaded court database with photos, facilities, and capacity
Court availability checking (no double-booking prevention since first-come-first-serve)
Court rating system based on user feedback
Facility information (lighting, equipment, parking, etc.)
Weather consideration alerts for outdoor courts
Match Lifecycle Management:
Match creation with immediate real-time broadcast
Participant invitation system with deep links
Match cancellation with automatic participant notifications
Match completion marking with participation tracking
No-show reporting and user reputation impact
Host Control Features:
Participant management (view profiles, kick if necessary)
Match details editing (time, requirements, description)
Private match option for friend-only games
Match sharing via social links
Emergency contact information for safety
Detailed Implementation Guide:
Database Schema Requirements:
-- Sports configuration
sports (
  id: UUID,
  name: TEXT,
  min_players: INTEGER,
  max_players: INTEGER,
  typical_duration: INTEGER, -- minutes
  equipment_needed: TEXT[],
  court_types: TEXT[],
  skill_levels: TEXT[]
)

-- Courts and facilities
courts (
  id: UUID,
  name: TEXT,
  location: TEXT,
  coordinates: POINT,
  court_type: TEXT, -- indoor, outdoor
  facilities: JSONB, -- lighting, equipment, parking, etc.
  capacity: INTEGER,
  images: TEXT[],
  rating: DECIMAL,
  is_active: BOOLEAN
)

-- Main matches table
matches (
  id: UUID,
  host_id: UUID (references profiles.id),
  sport_id: UUID (references sports.id),
  court_id: UUID (references courts.id),
  title: TEXT,
  description: TEXT,
  scheduled_date: DATE,
  start_time: TIME,
  end_time: TIME,
  min_players: INTEGER,
  max_players: INTEGER,
  skill_level: TEXT,
  current_participants: INTEGER,
  status: TEXT, -- active, full, cancelled, completed
  is_private: BOOLEAN,
  equipment_provided: TEXT[],
  requirements: TEXT,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
)

-- Match participants
match_participants (
  id: UUID,
  match_id: UUID (references matches.id),
  user_id: UUID (references profiles.id),
  joined_at: TIMESTAMP,
  status: TEXT, -- confirmed, waitlist, no_show
  notes: TEXT
)

-- No-show tracking
no_show_reports (
  id: UUID,
  match_id: UUID (references matches.id),
  reported_user_id: UUID (references profiles.id),
  reporter_id: UUID (references profiles.id),
  report_reason: TEXT,
  created_at: TIMESTAMP,
  status: TEXT -- pending, confirmed, dismissed
)

Frontend Implementation Steps:
Create comprehensive match creation form with dynamic validation
Implement sport selection with automatic constraint updates
Build court selection interface with photos and facility details
Create date/time picker with availability checking
Implement participant management interface for hosts
Build match editing functionality with change notifications
Create match cancellation workflow with reason selection
Implement deep linking for match sharing
Backend Implementation Steps:
Create match creation API with comprehensive validation
Implement sport-specific business rule enforcement
Set up real-time triggers for match events
Create participant management endpoints
Implement match cancellation workflow with notifications
Set up no-show reporting system
Create match completion and rating system
Implement host reputation tracking
Business Rules Implementation:
Users can host maximum 2 active matches simultaneously
Match creation requires 2-hour advance notice
Automatic match closure when participant limit reached
Host cannot leave their own match (must cancel instead)
Skill level matching recommendations for balanced games
Weather alerts for outdoor matches 24 hours prior
Validation Requirements:
Date/time validation against current time
Participant limit validation against sport constraints
Court capacity validation
Host availability checking (no simultaneous hosting)
Equipment requirement validation
Skill level matching verification
Feature 4: Match Discovery & Joining System
Feature Goal: Advanced filtering and search system for finding matches with one-click joining, detailed match views, and personalized recommendations based on user preferences and activity history.
API Relationships:
Receives real-time updates from Real-time Display System (Feature 2)
Integrates with Match Hosting System (Feature 3) for detailed match data
Connects to Recommendation Engine (Feature 5) for personalized suggestions
Links to User Authentication (Feature 1) for personalized filtering
Integrates with Profile Management (Feature 6) for social match features
Detailed Feature Requirements:
Advanced Filtering System:
Multi-criteria filtering (sport, skill level, date range, time slots)
Location-based filtering by court/area preferences
Participant count filtering (spaces available, nearly full, etc.)
Host rating and reputation filtering
Equipment requirement filtering
Saved filter presets for quick access
Match Discovery Interface:
Card-based match display with key information
Map view showing court locations
Calendar view for date-based browsing
List view with sortable columns
Quick preview on hover with participant details
Infinite scroll or pagination for large result sets
Match Joining System:
One-click join with instant confirmation
Waitlist functionality for full matches
Join request system for skill-restricted matches
Automatic notifications for join status changes
Batch joining for multiple matches
Friend invitation to discovered matches
Social Discovery Features:
Matches with friends or connections
Popular matches trending indicators
Recently viewed matches history
Bookmark/favorite matches for later
Share match recommendations with friends
Follow specific hosts or popular matches
Detailed Implementation Guide:
Database Schema Requirements:
-- User search preferences
user_search_preferences (
  id: UUID,
  user_id: UUID (references profiles.id),
  preferred_sports: UUID[],
  preferred_skill_levels: TEXT[],
  preferred_times: JSONB, -- day_of_week: [time_ranges]
  preferred_courts: UUID[],
  max_travel_distance: INTEGER,
  saved_filters: JSONB,
  updated_at: TIMESTAMP
)

-- Match bookmarks
match_bookmarks (
  id: UUID,
  user_id: UUID (references profiles.id),
  match_id: UUID (references matches.id),
  created_at: TIMESTAMP
)

-- Match views tracking
match_views (
  id: UUID,
  user_id: UUID (references profiles.id),
  match_id: UUID (references matches.id),
  viewed_at: TIMESTAMP,
  view_duration: INTEGER -- seconds
)

-- Join requests for skill-restricted matches
join_requests (
  id: UUID,
  match_id: UUID (references matches.id),
  user_id: UUID (references profiles.id),
  message: TEXT,
  status: TEXT, -- pending, approved, rejected
  requested_at: TIMESTAMP,
  responded_at: TIMESTAMP
)

-- Match waitlists
match_waitlists (
  id: UUID,
  match_id: UUID (references matches.id),
  user_id: UUID (references profiles.id),
  position: INTEGER,
  joined_waitlist_at: TIMESTAMP,
  notified_at: TIMESTAMP
)

Frontend Implementation Steps:
Create comprehensive filter panel with real-time updates
Build match card components with key information display
Implement map view integration with court markers
Create calendar view for date-based match browsing
Build one-click join functionality with confirmation
Implement waitlist management interface
Create bookmark and history tracking features
Build social sharing and recommendation features
Backend Implementation Steps:
Create advanced search API with multiple filter support
Implement efficient database indexing for search performance
Set up match recommendation scoring algorithm
Create join request workflow with approval system
Implement waitlist management with automatic notifications
Set up match view tracking for analytics
Create bookmark and favorites management
Implement social sharing and invitation features
Search and Filter Implementation:
// Advanced match search logic
function searchMatches(filters) {
  base_query = matches
    .where('status', 'active')
    .where('scheduled_date', '>=', today)
  
  if (filters.sports) {
    base_query = base_query.in('sport_id', filters.sports)
  }
  
  if (filters.skill_levels) {
    base_query = base_query.in('skill_level', filters.skill_levels)
  }
  
  if (filters.date_range) {
    base_query = base_query.between('scheduled_date', filters.date_range)
  }
  
  if (filters.available_spots) {
    base_query = base_query.where('current_participants', '<', 'max_players')
  }
  
  // Add real-time subscription for live updates
  return base_query.subscribe(onMatchUpdate)
}

Join Process Workflow:
User clicks join button on match
Check match availability and user eligibility
If skill-restricted, create join request for host approval
If space available, add user to participants immediately
Send real-time update to all connected users
Notify host and existing participants of new member
Update user's joined matches and recommendation data
Performance Optimization:
Database indexing on frequently filtered columns
Caching of popular search results
Lazy loading of match details and images
Debounced search input to reduce API calls
Virtual scrolling for large match lists
Preloading of likely-to-be-viewed matches
Feature 5: Basic Recommendation Engine
Feature Goal: Content-based filtering system that suggests matches based on user sports preferences, skill level, historical activity, and playing patterns to improve match discovery and participation rates.
API Relationships:
Receives user data from User Authentication (Feature 1) and Profile Management (Feature 6)
Analyzes match data from Match Hosting System (Feature 3)
Integrates with Match Discovery (Feature 4) for recommendation display
Uses activity data from all user interactions across the platform
Detailed Feature Requirements:
User Preference Analysis:
Sports preference weighting based on frequency and recency
Skill level matching with slight stretch recommendations
Time preference analysis (weekdays vs weekends, morning vs evening)
Court location preferences based on historical choices
Social preferences (friends' matches, similar skill level players)
Historical Activity Tracking:
Match participation history with success/completion rates
Host reputation and user interactions
Preferred match sizes and game types
Seasonal activity patterns and sport preferences
Friend network analysis for social recommendations
Content-Based Filtering Algorithm:
Match scoring based on user preference alignment
Skill level compatibility scoring (±1 level recommendations)
Time slot preference matching with historical data
Location preference scoring based on previous choices
Social scoring based on friend participation
Recommendation Scoring and Ranking:
Multi-factor scoring algorithm with weighted preferences
Recency boost for newly created matches
Popularity scoring based on join rates
Diversity injection to prevent recommendation tunnel vision
A/B testing framework for algorithm improvements
Detailed Implementation Guide:
Database Schema Requirements:
-- User activity tracking
user_activities (
  id: UUID,
  user_id: UUID (references profiles.id),
  activity_type: TEXT, -- 'match_joined', 'match_hosted', 'match_viewed', 'match_completed'
  match_id: UUID (references matches.id),
  activity_data: JSONB, -- additional context like duration, completion_status
  created_at: TIMESTAMP
)

-- User preference scores (computed)
user_preference_scores (
  id: UUID,
  user_id: UUID (references profiles.id),
  sport_id: UUID (references sports.id),
  preference_score: DECIMAL, -- 0.0 to 1.0
  skill_level_preference: JSONB, -- skill level distributions
  time_preferences: JSONB, -- day_of_week and time_of_day preferences
  court_preferences: JSONB, -- court_id to preference_score mapping
  last_calculated: TIMESTAMP
)

-- Match recommendations
match_recommendations (
  id: UUID,
  user_id: UUID (references profiles.id),
  match_id: UUID (references matches.id),
  recommendation_score: DECIMAL,
  recommendation_reasons: TEXT[], -- 'preferred_sport', 'skill_match', 'friend_joining', etc.
  generated_at: TIMESTAMP,
  viewed: BOOLEAN,
  clicked: BOOLEAN,
  joined: BOOLEAN
)

-- A/B testing for recommendations
recommendation_experiments (
  id: UUID,
  experiment_name: TEXT,
  user_id: UUID (references profiles.id),
  variant: TEXT, -- 'control', 'variant_a', 'variant_b'
  started_at: TIMESTAMP,
  ended_at: TIMESTAMP
)

Frontend Implementation Steps:
Create recommended matches section on dashboard
Build recommendation explanation interface
Implement recommendation feedback system (like/dislike)
Create preference adjustment interface
Build recommendation performance tracking
Implement personalized match suggestions in search
Create recommendation history and trends
Build A/B testing UI for algorithm comparison
Backend Implementation Steps:
Create user activity tracking system
Implement preference calculation Edge Function
Build content-based recommendation algorithm
Set up batch processing for recommendation generation
Create recommendation serving API with caching
Implement A/B testing framework
Set up recommendation performance analytics
Create preference update triggers
Recommendation Algorithm Implementation:
// Content-based recommendation scoring
function calculateRecommendationScore(user, match) {
  base_score = 0.0
  
  // Sport preference (40% weight)
  sport_score = user.sport_preferences[match.sport_id] || 0.1
  base_score += sport_score * 0.4
  
  // Skill level compatibility (25% weight)
  skill_diff = abs(user.skill_level - match.skill_level)
  skill_score = max(0, 1 - (skill_diff * 0.3))
  base_score += skill_score * 0.25
  
  // Time preference (20% weight)
  time_score = calculateTimePreference(user, match.start_time)
  base_score += time_score * 0.2
  
  // Social factor (10% weight)
  social_score = calculateSocialScore(user, match.participants)
  base_score += social_score * 0.1
  
  // Recency boost (5% weight)
  recency_score = calculateRecencyBoost(match.created_at)
  base_score += recency_score * 0.05
  
  return base_score
}

function updateUserPreferences(user_id) {
  activities = getUserActivities(user_id, last_30_days)
  
  // Calculate sport preferences based on activity frequency
  sport_counts = countByField(activities, 'sport_id')
  sport_preferences = normalizeCounts(sport_counts)
  
  // Calculate time preferences
  time_patterns = analyzeTimePatterns(activities)
  
  // Calculate skill level progression
  skill_progression = analyzeSkillProgression(activities)
  
  saveUserPreferences(user_id, {
    sports: sport_preferences,
    times: time_patterns,
    skill_levels: skill_progression
  })
}

Recommendation Generation Process:
Daily batch processing to calculate user preferences
Real-time recommendation scoring for new matches
Recommendation cache with 1-hour TTL
Personalized recommendation API endpoint
Feedback collection for recommendation quality
A/B testing on recommendation algorithms
Performance monitoring and algorithm tuning
Performance Optimization:
Precomputed user preference scores updated daily
Cached recommendations with invalidation on new matches
Efficient database queries with proper indexing
Background processing for heavy computations
Recommendation result pagination for large datasets
Feature 6: User Profile & Friend Management System
Feature Goal: Comprehensive user profile system with sports history tracking, friend network management, achievement display, and social match invitation features to build community engagement.
API Relationships:
Extends User Authentication System (Feature 1) with detailed profile data
Integrates with Match Hosting/Discovery (Feature 3/4) for activity history
Connects to Recommendation Engine (Feature 5) for social recommendations
Links to Real-time System (Feature 2) for friend activity updates
Integrates with future Messaging System for social communications
Detailed Feature Requirements:
Comprehensive User Profiles:
Extended profile with sports history and statistics
Match participation tracking (total games, completion rate, no-shows)
Skill level progression over time with sport-specific ratings
Achievement badges and milestone tracking
Profile customization with avatar upload and bio
Privacy settings for profile visibility and data sharing
Friend Management System:
Friend request system with pending/accepted/blocked states
Friend discovery through mutual connections and match history
Activity feed showing friends' recent matches and achievements
Group creation for regular playing partners
Friend recommendations based on common sports and skill levels
Achievement Tracking System:
Total games joined and hosted with milestone badges
Playing streaks (consecutive days, weeks, specific sports)
Social achievements (friend invitations, group formations)
Skill improvement tracking with progress indicators
Special event participation badges
Seasonal and sport-specific achievements
Social Match Features:
Friend invitation system for hosted matches
Group match creation with automatic friend invitations
Social match recommendations featuring friends
Activity sharing and match result celebrations
Team formation tools for recurring matches
Detailed Implementation Guide:
Database Schema Requirements:
-- Extended user profiles
profiles (
  id: UUID (references auth.users.id),
  email: TEXT,
  full_name: TEXT,
  student_id: TEXT,
  bio: TEXT,
  avatar_url: TEXT,
  date_of_birth: DATE,
  preferred_sports: UUID[],
  skill_levels: JSONB, -- sport_id: skill_level mapping
  privacy_settings: JSONB,
  total_matches_joined: INTEGER DEFAULT 0,
  total_matches_hosted: INTEGER DEFAULT 0,
  total_matches_completed: INTEGER DEFAULT 0,
  current_streak: INTEGER DEFAULT 0,
  longest_streak: INTEGER DEFAULT 0,
  reputation_score: DECIMAL DEFAULT 5.0,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
)

-- Friend relationships
friendships (
  id: UUID,
  requester_id: UUID (references profiles.id),
  addressee_id: UUID (references profiles.id),
  status: TEXT, -- 'pending', 'accepted', 'blocked'
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
  UNIQUE(requester_id, addressee_id)
)

-- Achievement definitions
achievements (
  id: UUID,
  name: TEXT,
  description: TEXT,
  category: TEXT, -- 'participation', 'social', 'streak', 'skill'
  requirement_type: TEXT, -- 'count', 'streak', 'special'
  requirement_value: INTEGER,
  badge_icon: TEXT,
  badge_color: TEXT,
  is_active: BOOLEAN
)

-- User achievements
user_achievements (
  id: UUID,
  user_id: UUID (references profiles.id),
  achievement_id: UUID (references achievements.id),
  earned_at: TIMESTAMP,
  progress_value: INTEGER, -- current progress toward achievement
  is_completed: BOOLEAN
)

-- Activity feed
activity_feed (
  id: UUID,
  user_id: UUID (references profiles.id),



