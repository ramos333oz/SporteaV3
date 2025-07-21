# Sportea Application - Entity Relationship Diagram (Mermaid)

This diagram shows the core entities and relationships in the Sportea application, excluding messaging and rating functionality that is not yet implemented.

```mermaid
erDiagram
    USERS {
        uuid id PK
        text email UK
        text username UK
        text full_name
        text avatar_url
        text student_id
        text faculty
        text campus
        text bio
        text gender
        text play_style
        jsonb sport_preferences
        jsonb skill_levels
        jsonb available_days
        jsonb available_hours
        jsonb preferred_facilities
        jsonb home_location
        vector preference_vector
        text account_status
        boolean is_admin
        text admin_role
        timestamptz created_at
        timestamptz updated_at
    }

    SPORTS {
        uuid id PK
        text name UK
        text icon_url
        text description
        timestamptz created_at
        timestamptz updated_at
    }

    LOCATIONS {
        uuid id PK
        text name UK
        text address
        text campus
        jsonb coordinates
        jsonb facilities
        uuid[] supported_sports
        boolean is_verified
        timestamptz created_at
        timestamptz updated_at
    }

    MATCHES {
        uuid id PK
        text title
        text description
        uuid sport_id FK
        uuid host_id FK
        uuid location_id FK
        timestamptz start_time
        timestamptz end_time
        date scheduled_date
        integer max_participants
        text skill_level
        text status
        timestamptz created_at
        timestamptz updated_at
    }

    PARTICIPANTS {
        uuid id PK
        uuid match_id FK
        uuid user_id FK
        timestamptz joined_at
        text status
    }

    FRIENDSHIPS {
        uuid id PK
        uuid user_id FK
        uuid friend_id FK
        text status
        timestamptz created_at
        timestamptz updated_at
    }

    USER_GAMIFICATION {
        uuid id PK
        uuid user_id FK
        integer total_xp
        integer current_level
        integer current_streak
        integer longest_streak
        date last_activity_date
        float8 community_score
        integer weekly_xp
        integer monthly_xp
        timestamptz created_at
        timestamptz updated_at
    }

    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        uuid match_id FK
        text type
        text message
        boolean is_read
        timestamptz read_at
        timestamptz created_at
    }

    ACHIEVEMENTS {
        uuid id PK
        text name UK
        text description
        text category
        text tier
        text requirement_type
        integer requirement_value
        integer xp_reward
        text badge_icon
        text badge_color
        float8 rarity_percentage
        boolean is_active
        boolean is_time_limited
        timestamptz start_date
        timestamptz end_date
        timestamptz created_at
        timestamptz updated_at
    }

    USER_ACHIEVEMENT_PROGRESS {
        uuid id PK
        uuid user_id FK
        uuid achievement_id FK
        integer current_progress
        boolean is_completed
        timestamptz completed_at
        boolean notified
        timestamptz created_at
        timestamptz updated_at
    }

    USER_VECTORS_KNN {
        uuid id PK
        uuid user_id FK
        vector preference_vector
        vector behavior_vector
        timestamptz last_updated
        timestamptz created_at
    }

    CONTENT_MODERATION_RESULTS {
        uuid id PK
        uuid match_id FK
        text content_type
        text content_field
        text original_content
        numeric toxicity_score
        text language_detected
        text risk_level
        jsonb ml_analysis
        text status
        uuid reviewed_by FK
        timestamptz reviewed_at
        timestamptz created_at
    }

    ADMIN_REVIEW_QUEUE {
        uuid id PK
        uuid content_id FK
        text content_type
        text priority
        text status
        uuid assigned_to FK
        timestamptz assigned_at
        timestamptz completed_at
        text resolution
        text notes
        timestamptz created_at
        timestamptz updated_at
    }

    %% Core Relationships
    USERS ||--o{ MATCHES : "hosts"
    USERS ||--o{ PARTICIPANTS : "joins"
    USERS ||--o{ FRIENDSHIPS : "initiates"
    USERS ||--|| USER_GAMIFICATION : "has"
    USERS ||--o{ NOTIFICATIONS : "receives"
    USERS ||--o{ USER_ACHIEVEMENT_PROGRESS : "earns"
    USERS ||--|| USER_VECTORS_KNN : "has_vector"

    SPORTS ||--o{ MATCHES : "sport_type"
    LOCATIONS ||--o{ MATCHES : "venue"
    
    MATCHES ||--o{ PARTICIPANTS : "has_participants"
    MATCHES ||--o{ NOTIFICATIONS : "generates"
    MATCHES ||--o{ CONTENT_MODERATION_RESULTS : "moderated"

    ACHIEVEMENTS ||--o{ USER_ACHIEVEMENT_PROGRESS : "awarded"

    CONTENT_MODERATION_RESULTS ||--o{ ADMIN_REVIEW_QUEUE : "queued_for_review"
    USERS ||--o{ ADMIN_REVIEW_QUEUE : "assigned_reviewer"
    USERS ||--o{ CONTENT_MODERATION_RESULTS : "reviewed_by"

    %% Self-referencing Relationships
    USERS ||--o{ FRIENDSHIPS : "friend_of"
```

## Entity Descriptions

### Core Business Entities

- **USERS**: Central entity storing user profiles, preferences, and authentication data
- **MATCHES**: Main business entity representing sports matches/games
- **SPORTS**: Reference data for different sports types
- **LOCATIONS**: Venue information for matches

### Bridge/Junction Tables

- **PARTICIPANTS**: Many-to-many relationship between users and matches
- **FRIENDSHIPS**: Many-to-many relationship for user connections
- **USER_ACHIEVEMENT_PROGRESS**: Many-to-many relationship between users and achievements with progress tracking

### Gamification & Leaderboard System

- **USER_GAMIFICATION**: Core leaderboard table with XP tracking, level progression, streaks, and time-based XP (weekly/monthly). Supports leaderboard functionality through the `simple_leaderboard` view which joins with USERS to provide ranked leaderboard data.
- **ACHIEVEMENTS**: Comprehensive achievement system with tiers, requirements, badges, and rarity
- **NOTIFICATIONS**: System alerts and messages

**Note**: Leaderboard functionality is implemented through the `USER_GAMIFICATION` table and a database view (`simple_leaderboard`) that joins user gamification data with user profile information to provide ranked leaderboard results. No separate leaderboard tables are used.

### Advanced Features

- **USER_VECTORS_KNN**: Machine learning vectors for recommendation system
- **CONTENT_MODERATION_RESULTS**: AI-powered content moderation
- **ADMIN_REVIEW_QUEUE**: Administrative workflow management

## Relationship Cardinalities

- **1:1** - One-to-one (e.g., User has one Gamification record)
- **1:M** - One-to-many (e.g., User hosts many Matches)
- **M:M** - Many-to-many (implemented via bridge tables)

## Key Features

1. **Professional ERD Notation**: Uses standard crow's foot notation
2. **Complete Schema**: All core entities without messaging/rating
3. **Proper Constraints**: Primary keys (PK), Foreign keys (FK), Unique keys (UK)
4. **Data Types**: Includes modern types like JSONB, VECTOR, TIMESTAMPTZ
5. **Scalable Design**: Supports recommendation systems and content moderation

## Excluded Entities

The following entities are excluded as they represent messaging/rating functionality not yet implemented:

- MESSAGES
- RATINGS  
- MATCH_INVITATIONS
- MATCH_JOIN_REQUESTS

This ERD provides a comprehensive view of the Sportea application's data architecture, focusing on the core sports matching, social, and gamification features.
