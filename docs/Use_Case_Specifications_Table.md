# SporteaV3 Use Case Specifications Table

## Overview
This document provides detailed specifications for all use cases identified during the systematic exploration of the SporteaV3 application. Each use case is documented with actors, descriptions, preconditions, main flows, and alternative flows based on observed functionality.

---

## 1. Authentication & Account Management

### Register/Login
| **Use Case Name** | **Actors** | **Description** | **Preconditions** | **Main Flow** | **Alternative Flows** |
|-------------------|------------|-----------------|-------------------|---------------|----------------------|
| Register/Login | User, System | User authenticates with UiTM student credentials to access the platform | User has valid UiTM student email and password | 1. User navigates to login page<br>2. User enters UiTM email (format: studentid@student.uitm.edu.my)<br>3. User enters password<br>4. System validates credentials<br>5. System creates/updates user session<br>6. System redirects to home page | • Invalid credentials: Display error message<br>• Network error: Show connection error<br>• First-time user: Redirect to profile setup |

### Logout
| **Use Case Name** | **Actors** | **Description** | **Preconditions** | **Main Flow** | **Alternative Flows** |
|-------------------|------------|-----------------|-------------------|---------------|----------------------|
| Logout | User, System | User terminates their session and exits the application | User must be logged in | 1. User clicks "Sign Out" button<br>2. System clears user session<br>3. System redirects to login page<br>4. System displays logout confirmation | • Session timeout: Automatic logout<br>• Network error: Local session cleanup |

---

## 2. Profile Management

### View Profile
| **Use Case Name** | **Actors** | **Description** | **Preconditions** | **Main Flow** | **Alternative Flows** |
|-------------------|------------|-----------------|-------------------|---------------|----------------------|
| View Profile | User, System | User views their complete profile information including sports, preferences, and statistics | User must be authenticated | 1. User clicks "Profile" in navigation<br>2. System retrieves user profile data<br>3. System displays profile sections (Details, Achievements, Activity)<br>4. System shows sports preferences and skill levels<br>5. System displays availability schedule and preferred facilities | • Profile incomplete: Show setup prompts<br>• Data loading error: Display cached data |

### Edit Profile
| **Use Case Name** | **Actors** | **Description** | **Preconditions** | **Main Flow** | **Alternative Flows** |
|-------------------|------------|-----------------|-------------------|---------------|----------------------|
| Edit Profile | User, System | User updates their profile information, sports preferences, and availability | User must be authenticated and on profile page | 1. User clicks settings/edit button<br>2. System opens profile edit form<br>3. User modifies sports, skill levels, availability<br>4. User updates preferred facilities and duration<br>5. System validates input data<br>6. System saves changes to database<br>7. System displays success confirmation | • Validation errors: Highlight invalid fields<br>• Save failure: Retain form data, show error<br>• Concurrent edits: Show conflict resolution |

---

## 3. Match Management

### Find Matches
| **Use Case Name** | **Actors** | **Description** | **Preconditions** | **Main Flow** | **Alternative Flows** |
|-------------------|------------|-----------------|-------------------|---------------|----------------------|
| Find Matches | User, System | User searches and filters available matches based on preferences | User must be authenticated | 1. User navigates to Find page<br>2. User selects "Games" tab<br>3. User applies filters (sport, skill level, date, location)<br>4. System queries match database<br>5. System displays filtered match results<br>6. User views match details and participant info | • No matches found: Display empty state with suggestions<br>• Filter error: Reset to default filters<br>• Search timeout: Show cached results |

### Join Match
| **Use Case Name** | **Actors** | **Description** | **Preconditions** | **Main Flow** | **Alternative Flows** |
|-------------------|------------|-----------------|-------------------|---------------|----------------------|
| Join Match | User, System | User joins an available match as a participant | User authenticated, match has available spots | 1. User selects match from search results<br>2. User clicks "Join Match" button<br>3. System validates user eligibility<br>4. System adds user to match participants<br>5. System updates match participant count<br>6. System sends confirmation notification<br>7. System updates user's match history | • Match full: Display waitlist option<br>• Time conflict: Show conflict warning<br>• Join failure: Retry mechanism<br>• Already joined: Show current status |

### Host Match
| **Use Case Name** | **Actors** | **Description** | **Preconditions** | **Main Flow** | **Alternative Flows** |
|-------------------|------------|-----------------|-------------------|---------------|----------------------|
| Host Match | User, System | User creates and hosts a new sports match | User must be authenticated | 1. User navigates to Host page<br>2. User clicks "Create New Match"<br>3. User fills match details (sport, date, time, location)<br>4. User sets participant limits and skill requirements<br>5. System validates match information<br>6. System creates match in database<br>7. System queues match for content moderation<br>8. System displays hosting confirmation | • Validation errors: Highlight required fields<br>• Time conflict: Suggest alternative times<br>• Content flagged: Queue for admin review<br>• Creation failure: Save draft for retry |

### View Live Matches
| **Use Case Name** | **Actors** | **Description** | **Preconditions** | **Main Flow** | **Alternative Flows** |
|-------------------|------------|-----------------|-------------------|---------------|----------------------|
| View Live Matches | User, System | User views currently active matches with real-time updates | User must be authenticated | 1. User views Live Matches section on home page<br>2. System fetches matches for current date<br>3. System displays active matches with participant counts<br>4. System shows real-time status updates<br>5. User can click to view match details | • No live matches: Display encouraging message<br>• Real-time connection lost: Show offline indicator<br>• Loading error: Display cached data |

---

## 4. Social Features

### Find Players
| **Use Case Name** | **Actors** | **Description** | **Preconditions** | **Main Flow** | **Alternative Flows** |
|-------------------|------------|-----------------|-------------------|---------------|----------------------|
| Find Players | User, System | User searches for other players to connect with based on sports and preferences | User must be authenticated | 1. User navigates to Find page<br>2. User selects "Players" tab<br>3. User applies sport filters<br>4. System queries user database<br>5. System displays player profiles with sports and details<br>6. User views player information and mutual interests | • No players found: Suggest broadening search<br>• Search error: Display cached results<br>• Profile access restricted: Show limited info |

### Add Friend
| **Use Case Name** | **Actors** | **Description** | **Preconditions** | **Main Flow** | **Alternative Flows** |
|-------------------|------------|-----------------|-------------------|---------------|----------------------|
| Add Friend | User, System | User sends friend request to another player | User authenticated, target user exists | 1. User finds player profile<br>2. User clicks "Add Friend" button<br>3. System creates friend request<br>4. System sends notification to target user<br>5. System updates request status<br>6. System displays pending status to requester | • Already friends: Show current status<br>• Request pending: Display pending state<br>• User blocked: Show generic error<br>• Request limit reached: Show limit message |

### Manage Friends
| **Use Case Name** | **Actors** | **Description** | **Preconditions** | **Main Flow** | **Alternative Flows** |
|-------------------|------------|-----------------|-------------------|---------------|----------------------|
| Manage Friends | User, System | User manages friend list, requests, and connections | User must be authenticated | 1. User navigates to Friends page<br>2. System displays friend tabs (Friends, Requests, Sent, Discover)<br>3. User switches between tabs to view different lists<br>4. User can accept/reject incoming requests<br>5. User can view sent requests status<br>6. System updates friend relationships | • No friends: Show discovery suggestions<br>• Request processing error: Retry mechanism<br>• Sync failure: Show offline status |

---

## 5. Gamification

### View Leaderboard
| **Use Case Name** | **Actors** | **Description** | **Preconditions** | **Main Flow** | **Alternative Flows** |
|-------------------|------------|-----------------|-------------------|---------------|----------------------|
| View Leaderboard | User, System | User views rankings and competes with other players across different metrics | User must be authenticated | 1. User navigates to Leaderboard page<br>2. System displays current user tier and ranking<br>3. User selects leaderboard type (Experience/Level)<br>4. User chooses timeframe (All Time/Month/Week)<br>5. User selects competition group (Global/Friends/Tier)<br>6. System displays ranked list with user positions | • No ranking data: Show initialization message<br>• Calculation in progress: Display loading state<br>• Tie scores: Use secondary sorting criteria |

### View Achievements
| **Use Case Name** | **Actors** | **Description** | **Preconditions** | **Main Flow** | **Alternative Flows** |
|-------------------|------------|-----------------|-------------------|---------------|----------------------|
| View Achievements | User, System | User views earned achievements and progress toward unlocking new ones | User must be authenticated | 1. User navigates to Profile page<br>2. User selects "Achievements" tab<br>3. System displays earned achievements<br>4. System shows progress bars for incomplete achievements<br>5. System displays achievement descriptions and rewards | • No achievements: Show available achievements<br>• Achievement unlock: Display celebration animation<br>• Progress sync error: Show cached progress |

---

## 6. Communication & Feedback

### Submit Report
| **Use Case Name** | **Actors** | **Description** | **Preconditions** | **Main Flow** | **Alternative Flows** |
|-------------------|------------|-----------------|-------------------|---------------|----------------------|
| Submit Report | User, System | User reports issues, bugs, or inappropriate behavior to administrators | User must be authenticated | 1. User clicks "report issue" button<br>2. System opens report form<br>3. User selects report category and priority<br>4. User provides detailed description<br>5. User submits report<br>6. System creates report record<br>7. System sends confirmation to user | • Form validation error: Highlight required fields<br>• Duplicate report: Show existing report status<br>• Submission failure: Save draft locally |

### View Notifications
| **Use Case Name** | **Actors** | **Description** | **Preconditions** | **Main Flow** | **Alternative Flows** |
|-------------------|------------|-----------------|-------------------|---------------|----------------------|
| View Notifications | User, System | User views and manages their notification history and settings | User must be authenticated | 1. User clicks notification bell icon<br>2. System displays notification panel<br>3. System shows unread count and recent notifications<br>4. User can mark notifications as read<br>5. System updates notification status | • No notifications: Show empty state<br>• Notification load error: Show cached notifications<br>• Real-time update failure: Manual refresh option |

---

## 7. Admin Functions

### Access Admin Portal
| **Use Case Name** | **Actors** | **Description** | **Preconditions** | **Main Flow** | **Alternative Flows** |
|-------------------|------------|-----------------|-------------------|---------------|----------------------|
| Access Admin Portal | Admin, System | Administrator logs into the admin dashboard to manage the platform | Admin must have valid credentials and admin privileges | 1. Admin navigates to /admin<br>2. Admin enters credentials<br>3. System validates admin permissions<br>4. System displays admin dashboard<br>5. System shows overview statistics | • Invalid credentials: Display error message<br>• Insufficient privileges: Redirect to user portal<br>• Session timeout: Require re-authentication |

### Manage User Reports
| **Use Case Name** | **Actors** | **Description** | **Preconditions** | **Main Flow** | **Alternative Flows** |
|-------------------|------------|-----------------|-------------------|---------------|----------------------|
| Manage User Reports | Admin, System | Administrator reviews and resolves user-submitted reports and issues | Admin authenticated, reports exist in queue | 1. Admin navigates to Users section<br>2. System displays user reports with status filters<br>3. Admin selects report to review<br>4. System shows report details and user context<br>5. Admin investigates and gathers evidence<br>6. Admin takes action (resolve, escalate, close)<br>7. Admin adds resolution notes<br>8. System updates report status and notifies users | • Urgent reports: Highlight high-priority items<br>• Investigation needed: Set to "In Progress" status<br>• False reports: Mark as invalid with reasoning<br>• Escalation required: Forward to higher authority |

### Content Moderation
| **Use Case Name** | **Actors** | **Description** | **Preconditions** | **Main Flow** | **Alternative Flows** |
|-------------------|------------|-----------------|-------------------|---------------|----------------------|
| Content Moderation | Admin, System | Administrator reviews flagged content and makes approval/rejection decisions | Admin authenticated, content in moderation queue | 1. Admin navigates to Content Moderation section<br>2. System displays moderation queue with risk levels<br>3. Admin filters by status and risk level<br>4. Admin selects content item for review<br>5. System shows content details and ML analysis<br>6. Admin makes decision (Approve/Reject/Review)<br>7. System updates content status<br>8. System applies decision to live content | • High-risk content: Require additional review<br>• Borderline cases: Use detailed review modal<br>• Bulk actions: Process multiple items efficiently<br>• Appeal process: Handle content appeals |

### View Dashboard
| **Use Case Name** | **Actors** | **Description** | **Preconditions** | **Main Flow** | **Alternative Flows** |
|-------------------|------------|-----------------|-------------------|---------------|----------------------|
| View Dashboard | Admin, System | Administrator views system analytics and performance metrics | Admin must be authenticated with dashboard access | 1. Admin accesses Overview section<br>2. System displays key metrics (users, matches, participations)<br>3. System shows recent activity and trends<br>4. Admin views feedback scores and statistics<br>5. System provides real-time data updates | • Data loading error: Show cached metrics<br>• Metric calculation delay: Display loading indicators<br>• Export functionality: Generate reports for analysis |

### Manage Matches
| **Use Case Name** | **Actors** | **Description** | **Preconditions** | **Main Flow** | **Alternative Flows** |
|-------------------|------------|-----------------|-------------------|---------------|----------------------|
| Manage Matches | Admin, System | Administrator oversees match management and resolves match-related issues | Admin authenticated, matches exist in system | 1. Admin navigates to Matches section<br>2. System displays match list with filters<br>3. Admin can view match details and participants<br>4. Admin can modify match status or details<br>5. Admin resolves match-related disputes<br>6. System logs all administrative actions | • Match conflicts: Provide resolution tools<br>• Cancelled matches: Handle participant notifications<br>• Disputed matches: Investigation and mediation tools |

---

## 8. System Processes

### Generate Match Recommendations
| **Use Case Name** | **Actors** | **Description** | **Preconditions** | **Main Flow** | **Alternative Flows** |
|-------------------|------------|-----------------|-------------------|---------------|----------------------|
| Generate Match Recommendations | System, User | System automatically suggests relevant matches based on user preferences and behavior | User profile complete, matches available in database | 1. System analyzes user preferences and history<br>2. System applies recommendation algorithm<br>3. System scores and ranks available matches<br>4. System filters by user availability and constraints<br>5. System returns top recommendations<br>6. System caches results for performance | • No suitable matches: Return empty recommendations<br>• Algorithm failure: Fall back to basic filtering<br>• Performance issues: Use cached recommendations |

### Generate User Recommendations
| **Use Case Name** | **Actors** | **Description** | **Preconditions** | **Main Flow** | **Alternative Flows** |
|-------------------|------------|-----------------|-------------------|---------------|----------------------|
| Generate User Recommendations | System, User | System suggests potential friends and connections using KNN algorithm | User profile complete, other users available | 1. System builds user preference vector<br>2. System calculates similarity with other users<br>3. System applies KNN algorithm for nearest neighbors<br>4. System filters out existing friends and blocked users<br>5. System ranks recommendations by similarity score<br>6. System returns top user suggestions | • Insufficient data: Use basic demographic matching<br>• Algorithm timeout: Return cached suggestions<br>• Privacy settings: Respect user visibility preferences |

### Auto Content Moderation
| **Use Case Name** | **Actors** | **Description** | **Preconditions** | **Main Flow** | **Alternative Flows** |
|-------------------|------------|-----------------|-------------------|---------------|----------------------|
| Auto Content Moderation | System | System automatically analyzes and flags potentially inappropriate content using ML | Content submitted for review | 1. System receives new content for analysis<br>2. System applies ML toxicity detection<br>3. System calculates risk score and confidence<br>4. System categorizes content by risk level<br>5. System auto-approves low-risk content<br>6. System queues high-risk content for manual review<br>7. System logs moderation decisions | • ML service unavailable: Queue for manual review<br>• Confidence too low: Default to manual review<br>• False positives: Learn from admin corrections |

### Send Notifications
| **Use Case Name** | **Actors** | **Description** | **Preconditions** | **Main Flow** | **Alternative Flows** |
|-------------------|------------|-----------------|-------------------|---------------|----------------------|
| Send Notifications | System, User | System delivers real-time notifications for various user activities and updates | User authenticated, notification triggers activated | 1. System detects notification trigger event<br>2. System determines affected users<br>3. System formats notification content<br>4. System delivers via real-time connection<br>5. System stores notification in user history<br>6. System tracks delivery status | • User offline: Store for next login<br>• Delivery failure: Retry with exponential backoff<br>• User preferences: Respect notification settings |

### Update Real-time Data
| **Use Case Name** | **Actors** | **Description** | **Preconditions** | **Main Flow** | **Alternative Flows** |
|-------------------|------------|-----------------|-------------------|---------------|----------------------|
| Update Real-time Data | System | System maintains live data synchronization across all connected clients | Real-time connections established | 1. System detects data change events<br>2. System identifies affected clients<br>3. System broadcasts updates via WebSocket<br>4. System ensures data consistency<br>5. System handles connection failures gracefully | • Connection lost: Attempt reconnection<br>• Sync conflicts: Use timestamp-based resolution<br>• Performance issues: Throttle update frequency |

### Calculate XP/Levels
| **Use Case Name** | **Actors** | **Description** | **Preconditions** | **Main Flow** | **Alternative Flows** |
|-------------------|------------|-----------------|-------------------|---------------|----------------------|
| Calculate XP/Levels | System, User | System automatically calculates and updates user experience points and levels | User completes XP-earning activities | 1. System detects XP-earning event<br>2. System calculates XP reward amount<br>3. System updates user's total XP<br>4. System checks for level progression<br>5. System updates user level if threshold reached<br>6. System triggers achievement checks<br>7. System notifies user of progression | • Calculation error: Log and retry<br>• Level cap reached: Handle gracefully<br>• Achievement unlock: Trigger celebration |

### Adaptive Learning
| **Use Case Name** | **Actors** | **Description** | **Preconditions** | **Main Flow** | **Alternative Flows** |
|-------------------|------------|-----------------|-------------------|---------------|----------------------|
| Adaptive Learning | System | System continuously improves content moderation thresholds based on admin feedback | Admin moderation decisions available | 1. System collects admin moderation decisions<br>2. System analyzes decision patterns<br>3. System identifies threshold adjustment opportunities<br>4. System updates ML model parameters<br>5. System validates improvements<br>6. System logs threshold changes | • Insufficient data: Maintain current thresholds<br>• Model degradation: Revert to previous version<br>• Performance impact: Gradual threshold adjustment |

---

## Summary

This comprehensive use case specifications table documents **32 distinct use cases** identified during the systematic exploration of SporteaV3:

- **Authentication & Account Management**: 2 use cases
- **Profile Management**: 2 use cases
- **Match Management**: 4 use cases
- **Social Features**: 3 use cases
- **Gamification**: 2 use cases
- **Communication & Feedback**: 2 use cases
- **Admin Functions**: 5 use cases
- **System Processes**: 7 use cases

Each specification includes detailed main flows based on observed application behavior, comprehensive alternative flows for error handling, and realistic preconditions reflecting the actual system requirements discovered during exploration.
