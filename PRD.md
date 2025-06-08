# Sportea - Product Requirements Document (PRD)

## Overview
Sportea is a sports matchmaking web application designed exclusively for UiTM university students. It enables students to find and join games hosted by their peers or host their own games. The platform aims to solve the problem of last-minute vacancies in sports matches and improve the sports community engagement within the university.

## Target Users
1. **Students**: UiTM students looking to participate in sports activities
2. **Staff**: UiTM staff members who want to engage in sports
3. **Admins**: Platform administrators who manage the system and monitor user activity

## Technical Architecture

### Tech Stack
- **Frontend**: React.js
- **Backend**: Supabase
- **Authentication**: Supabase Auth with JWT
- **Real-time Updates**: Supabase Realtime with WebSockets
- **Database**: PostgreSQL (via Supabase)
- **Hosting**: To be determined

### Core System Components
1. **Authentication Service**: Handles user registration, login, and session management
2. **Match Management Service**: Coordinates match creation, updates, and cancellations
3. **Real-time Update System**: Ensures all users receive immediate updates on match changes
4. **Recommendation Engine**: Provides personalized match suggestions based on user preferences
5. **User Profile & Social System**: Manages user data, achievements, and friend connections

## Feature Specifications

### 1. User Authentication & Registration
- **Domain Validation**: Only emails with @student.uitm.edu.my domain are accepted
- **Email Verification**: Automated verification email with secure token
- **Auto-login**: Automatic login after successful email verification
- **Password Management**: Secure storage and reset functionality
- **Profile Creation**: Initial sports preferences setup during onboarding

### 2. Real-time Match Display System
- **WebSocket Connection**: Maintain persistent real-time connections
- **Match Broadcasting**: Instant notification to all users when matches are created
- **Participant Tracking**: Live updates of participant counts and status changes
- **Connection Resilience**: Automatic reconnection with state synchronization
- **Performance Requirements**: Support for 100+ concurrent connections with sub-second latency

### 3. Match Hosting & Management
- **Sport-specific Configuration**:
  - Football: 22 players max at Padang Pusat Sukan UiTM
  - Rugby: 22 players max at Padang Pusat Sukan UiTM
  - Basketball: 15 players max at Court Pusat Sukan A/B
  - Futsal: 12 players max at Court Pusat Sukan A/B and Court Perindu A/B
  - Volley: 15 players max at Court Pusat Sukan A/B and Court Perindu A/B
  - Frisbee: 15 players max at Padang Hoki Pusat Sukan
  - Hockey: 15 players max at Padang Hoki Pusat Sukan
  - Badminton: 8 players max at Court Pusat Sukan A-F and Court Budisiswa
- **Court Selection**: Pre-defined courts with location data
- **Scheduling**: Date/time selection with conflict prevention
- **Skill Matching**: Options for Beginner, Intermediate, and Professional levels
- **Host Controls**: Participant management with removal capability
- **Cancellation Workflow**: Match cancellation with notifications to all participants

### 4. Match Discovery & Joining
- **Advanced Filtering**: Multi-criteria search (sport, skill level, date, time)
- **Match Details**: Comprehensive view of match information and participants
- **One-click Joining**: Streamlined process to join available matches
- **Host Permissions**: Special controls for match hosts
- **Share Functionality**: Deep link sharing for matches

### 5. Basic Recommendation Engine
- **Preference Analysis**: System tracks user's sports preferences and skill levels
- **Historical Data**: Recommendations based on past activity
- **Content-based Filtering**: Initial algorithm using direct match between preferences and available games
- **Future Expansion**: Framework for A/B testing and algorithm improvements
- **Real-time Updates**: Recommendations that adjust based on new user activity

### 6. User Profile & Friend Management
- **Comprehensive Profiles**: Sports history, achievements, and user details
- **Friend System**: Send/accept friend requests and manage connections
- **Activity Tracking**: Record of participated and hosted matches
- **Customization**: User profile personalization options
- **Social Integration**: Invite friends to matches

### 7. Admin Dashboard (Future)
- **User Inquiries**: Handle and respond to user reports and questions
- **Data Analytics**: Insights on popular sports, peak activity times, and user engagement
- **Content Moderation**: Tools to monitor and moderate user-generated content
- **System Health Monitoring**: Track platform performance metrics

## Non-Functional Requirements

### Performance
- **Load Time**: Pages should load in under 3 seconds
- **Real-time Updates**: Sub-second latency for match updates
- **Concurrent Users**: Support for at least 100 simultaneous users
- **Database Performance**: Efficient queries optimized for real-time operations

### Security
- **Authentication**: JWT-based secure session management
- **Data Protection**: Encryption for sensitive user data
- **Input Validation**: Comprehensive validation on all user inputs
- **Access Control**: Row-level security for database access

### Usability
- **Responsive Design**: Full functionality on desktop and mobile browsers
- **Accessibility**: WCAG AA compliance for core features
- **Error Handling**: Clear user feedback for all error conditions
- **Navigation**: Intuitive UI with consistent layout and controls

### Scalability
- **Database**: Design for potential growth to 10,000+ users
- **Architecture**: Modular design that allows component-wise scaling
- **Caching**: Strategic caching of user profiles and match data

## Future Enhancements (Post-MVP)

### Advanced ML Recommendation System
- Collaborative filtering with user similarity metrics
- Hybrid recommendation combining content-based and collaborative approaches
- Deep learning models for complex preference matching

### Real-time Messaging System
- In-match chat functionality
- Direct messaging between users
- Group chat for match participants

### Advanced Analytics Dashboard
- Predictive analytics for match success
- User engagement insights and trends
- Sport popularity tracking across campus

## Development Roadmap
See the Implementation Roadmap document for detailed timeline and milestones.
