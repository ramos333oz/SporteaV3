# Sportea Application - User Activity Diagram (Simplified)

```mermaid
flowchart TD
    Start([User Opens Sportea]) --> CheckAuth{Registered?}

    %% Authentication
    CheckAuth -->|No| Register[Register with UiTM Email]
    CheckAuth -->|Yes| Login[Login]
    Register --> SetupProfile[Setup Profile]
    Login --> Dashboard[Dashboard]
    SetupProfile --> Dashboard

    %% Core Activities
    Dashboard --> MainChoice{Choose Activity}

    %% Match Flow
    MainChoice -->|Find Matches| ViewMatches[Browse Matches]
    ViewMatches --> MatchAction{Action?}
    MatchAction -->|Join| JoinMatch[Join Match]
    MatchAction -->|Back| Dashboard
    JoinMatch --> Dashboard

    %% Host Flow
    MainChoice -->|Host Match| HostMatch[Create Match]
    HostMatch --> HostDetails[Enter Details]
    HostDetails --> HostSuccess[Match Created]
    HostSuccess --> Dashboard

    %% Social Flow
    MainChoice -->|Find Players| FindPlayers[Browse Players]
    FindPlayers --> AddFriend[Add Friend]
    AddFriend --> Dashboard

    %% Profile Flow
    MainChoice -->|Profile| ViewProfile[View Profile]
    ViewProfile --> EditProfile[Edit Profile]
    EditProfile --> Dashboard

    %% Gamification
    MainChoice -->|Leaderboard| Leaderboard[View Leaderboard]
    Leaderboard --> Dashboard

    %% Session End
    Dashboard --> Continue{Continue?}
    Continue -->|Yes| MainChoice
    Continue -->|No| Logout[Logout]
    Logout --> End([End])

    %% Styling
    classDef startEnd fill:#4CAF50,stroke:#2E7D32,stroke-width:3px,color:#fff
    classDef decision fill:#FF9800,stroke:#F57C00,stroke-width:2px,color:#fff
    classDef activity fill:#2196F3,stroke:#1976D2,stroke-width:2px,color:#fff
    classDef success fill:#8BC34A,stroke:#689F38,stroke-width:2px,color:#fff

    class Start,End startEnd
    class CheckAuth,MainChoice,MatchAction,Continue decision
    class HostSuccess,JoinMatch,AddFriend success
```

## Core User Journey

This simplified diagram shows the essential user flows in Sportea:

### Main Flows:
1. **Authentication**: Register/Login → Profile Setup → Dashboard
2. **Match Activities**: Browse Matches → Join OR Create Match
3. **Social**: Find Players → Add Friends
4. **Profile**: View/Edit Profile
5. **Gamification**: View Leaderboard
6. **Session**: Continue or Logout

### Key Features:
- **One-page overview** of core functionality
- **Essential user decisions** only
- **Streamlined paths** without detailed sub-flows
- **Focus on primary actions** users perform daily
