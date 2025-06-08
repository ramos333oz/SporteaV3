Sportea - Technical Architecture & MVP Plan

Tech Stacls:
1. React.js (Web app focused)
2. Supabase 
3. Other tech that can be used to make this project possible

Users:
Normal users (Students or Staff) 
Admin (Different page for data analytics and handling user inquiries based from user’s feedback)
Launch Features (MVP)
User Authentication & Registration
Secure email-based registration system specifically for UiTM students using domain validation. The system validates @student.uitm.edu.my emails, sends verification emails, and automatically logs users in upon email confirmation.
Email domain validation (@student.uitm.edu.my only)
Email verification workflow with auto-login
JWT-based session management
Password reset functionality
User profile creation with sports preferences
Tech Involved
Supabase Auth with custom email validation
React.js with React Router for navigation
Email service integration (Supabase built-in or SendGrid)
Main Requirements
Secure token management
Email deliverability
Domain restriction enforcement
Session persistence across devices
Real-time Match Display System
Live updating match board that instantly shows newly created matches to all connected users. This core feature ensures students see available matches immediately without page refreshes, solving the last-minute vacancy problem.
WebSocket connections for real-time updates
Match creation broadcast to all connected users
Live participant count updates
Match status changes (active, full, cancelled)
Connection resilience and reconnection handling
Tech Involved
Supabase Realtime subscriptions
React Context API for state management
WebSocket connection management
Optimistic UI updates
Main Requirements
Sub-second update latency
Handle 100+ concurrent connections
Graceful degradation if real-time fails
Efficient data synchronization
Match Hosting & Management
Comprehensive match creation system with predefined court locations and sport-specific constraints. Users can create matches with all necessary details while the system enforces business rules like player limits and court availability.
Sport-specific player limits (6-15 players based on sport)
Predefined court selection with location data
Date/time scheduling with conflict detection
Skill level requirements (Beginner/Intermediate/Professional)
Match cancellation with participant notifications
Tech Involved
React forms with validation (Formik or React Hook Form)
Supabase database with relational tables
Date/time libraries (date-fns or dayjs)
Image placeholder system for court photos
Main Requirements
Data validation and constraints
Court availability checking
Participant limit enforcement
Cancellation workflow management
Match Discovery & Joining
Advanced filtering and search system for finding matches with personalized recommendations. Students can filter by sport, skill level, date/time, and receive AI-powered match suggestions based on their preferences and history.
Multi-criteria filtering (sport, skill level, date, time)
Match detail views with participant management
One-click join functionality
Host controls (kick participants, invite friends)
Match sharing via deep links
Tech Involved
React filtering components
Supabase RLS (Row Level Security)
Deep linking implementation
State management for complex filters
Main Requirements
Fast search and filtering performance
Real-time participant updates
Secure host permissions
responsive match cards
Basic Recommendation Engine
Content-based filtering system that suggests matches based on user sports preferences, skill level, and historical activity. This MVP version focuses on simple algorithmic matching before scaling to collaborative filtering.
User preference analysis (sports, skill level, time preferences)
Historical activity tracking (joined/hosted matches)
Content-based filtering algorithm
Recommendation scoring and ranking
A/B testing framework for algorithm improvements
Tech Involved
Python/Node.js recommendation service
Supabase Edge Functions for ML computations
User behavior tracking
Recommendation caching system
Main Requirements
Real-time preference updates
Scalable recommendation computation
Performance monitoring
Recommendation explanation capability
User Profile & Friend Management
Social features enabling users to connect, view profiles, and build their sports network within the university. Includes friend requests, profile customization, and social match invitations.
Comprehensive user profiles with sports history
Friend request system with status management
Achievement tracking and display
Profile customization options
Social match invitations
Tech Involved
React profile components
Supabase user management
Image upload and storage
Social graph data modeling
Main Requirements
Privacy controls
Efficient friend relationship queries
Profile data consistency
Social interaction logging
Future Features (Post-MVP)
Advanced ML Recommendation System
Collaborative filtering with user similarity
Hybrid recommendation combining content + collaborative
Deep learning models for complex preference matching
Real-time model retraining pipeline
Tech Involved
TensorFlow.js or PyTorch for ML models
Vector databases for similarity search
MLOps pipeline for model deployment
Real-time feature engineering
Main Requirements
Model performance monitoring
A/B testing infrastructure
Scalable feature computation
Model versioning and rollback
Real-time Messaging System
In-match chat functionality
Direct messaging between users
Match-specific group chats
Push notifications for messages
Tech Involved
WebSocket messaging infrastructure
React Chat UI components
Push notification services
Message encryption and security
Main Requirements
Message delivery guarantees
Chat history persistence
Real-time typing indicators
Spam and abuse prevention
Advanced Analytics Dashboard
Predictive analytics for match success
User engagement insights
Sport popularity trends
Performance optimization recommendations
Tech Involved
Apache Superset or custom React dashboards
Time-series database (InfluxDB)
Data pipeline orchestration (Apache Airflow)
Machine learning for predictions
Main Requirements
Real-time data processing
Interactive visualization
Scheduled report generation
Data privacy compliance
System Diagram

Questions & Clarifications
Do you want users to be able to book specific time slots for courts, or is it first-come-first-serve based on match timing?
Answer: first-come-first-serve 
Should the recommendation system consider geographical proximity within campus (e.g., prefer matches at closer courts)?
Answer: not really, just consider hosted match that relates alot with their preferences and user data such as preferred sports, skill level, usual playing time.  Sooner, implement system that can track user’s data then integrate it into our recommendation model. 
For the achievement system, what specific achievements would motivate users (games hosted, games joined, streaks, etc.)?
Answer: total games joined and hosted, streaks and other simple similar  

Do you want match history to include performance ratings or just participation tracking?
Answer: participation tracking

Should there be different user roles (team captains, regular players) with different permissions?
Answer: not really, but for in the match detail, show the hoster of the match and different them from regular player

How should the system handle no-shows or late cancellations to maintain match quality?
Answer: yes

List of Architecture Consideration Questions
Database Design: How will you handle the relationship between users, matches, and courts? Should we implement database sharding strategies for 100K+ users?
Answer: maybe but this app will only have prob below 10k students

Real-time Scalability: What's your strategy for handling WebSocket connections at scale? Should we implement horizontal scaling with Redis pub/sub?

Answer: yes pls

ML Model Deployment: Where will the recommendation models run - Edge Functions, separate ML service, or third-party ML platforms?
Answer: edge functions

Caching Strategy: What data should be cached (user profiles, match lists, recommendations) and what's your cache invalidation strategy?
Answer:user profiles, match lists

Mobile Strategy: Are you planning native mobile apps eventually, or will PWA suffice for the university environment?
Answer: yes but just focus completely for web fundamental first. 

Data Analytics Infrastructure: Do you need real-time analytics or is batch processing sufficient for admin dashboards?
Answer: yes please

Security & Privacy: How will you handle sensitive student data and ensure GDPR/privacy compliance?
Answer: make sure the database and the app is secured and utilize better system to avoid breaches. Make the user agree the agreement policy of user data once registering. 

Monitoring & Observability: What metrics are critical for system health and user experience monitoring?
Answer: number of players logging in or registering, matches being hosted, type of sports being mostly hosted, user inquiry to admin. 

Backup & Disaster Recovery: What's your data backup strategy and RTO/RPO requirements?
Answer: no idea but utlizie the best strategy for this 

API Rate Limiting: How will you prevent abuse while ensuring good user experience for legitimate usage?
Answer: make sure user can host a match 1 or 2 times at a time. And send friend request max 3 times per hour. And make sure they can send report to admin once every hour. 

Content Moderation: Do you need automated systems to detect inappropriate content in match descriptions or user profiles?
Answer: yes but provide me what kind of system is it using for this moderations? 

Integration Strategy: Any plans to integrate with university systems (student directory, facility booking systems)?

Answer: yes but not yet, just focus on the core thing first. 





