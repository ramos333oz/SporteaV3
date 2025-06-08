<goal>
You are an industry-veteran SaaS product designer. You’ve built high-touch UIs for FANG-style companies.

Your goal is to take the context below, the guidelines, and the user inspiration, and turn it into a functional UI design
</goal>

<guidelines>
<aesthetics>
Bold simplicity with intuitive navigation creating frictionless experiences
Breathable whitespace complemented by strategic color accents for visual hierarchy
Strategic negative space calibrated for cognitive breathing room and content prioritization
Systematic color theory applied through subtle gradients and purposeful accent placement
Typography hierarchy utilizing weight variance and proportional scaling for information architecture
Visual density optimization balancing information availability with cognitive load management
Motion choreography implementing physics-based transitions for spatial continuity
Accessibility-driven contrast ratios paired with intuitive navigation patterns ensuring universal usability
Feedback responsiveness via state transitions communicating system status with minimal latency
Content-first layouts prioritizing user objectives over decorative elements for task efficiency
</aesthetics>

<practicalities>
Use MOCKED DATA for any front-end views, because this is just a design exercise
Follow the style-guide given below
Place a number above each screen in sequential order so that I can easily give feedback on specific contained screens
</practicalities>
</guidelines>

<context>
<app-overview>
Sportea is a web application for sports matchmaking at the university level. It allows students to find and join games hosted by other users and host their own games. This is a simple web application that is intended to be used for students to discover new teammmates as well as upcoming games that they could join themselves into. With the existances of this web application, students are able to seamlessly connect themselves with others, without needing to reach-out separately. The core of this web app us to allow students to host a match or join a match.

You should take inspiration from apps like SportsBuddy, Smatch, Sportpartner, but it will be significantly different for the following reasons:

Im only gonna build this app for my university students only. Only specific to the facilities that are available to one campus. So the facilities that are available in my chosen campus only will be displayed and only can be chosen by the students to host in the app. So, only registered student who have a domain email of (@student.uitm.edu.my) is allowed to register themselves into the app .I dont want to implement realtime messaging yet but just realtime matches that will be displayed to everyone when a hoster is hosting a match. Keep it simple, once user host a match, the match will be displayed REALTIME, thats the core of the intention of the app. Then, once we got that done, we can move on to matching algorithm, maybe we can implement recommendation system like Collaborative Filtering system kind of algorithm or Content-Based Filtering. Or we could do hybrid but i just wanted to make sure that we can implement this successfully without requiring extra steps that may cause errors or may take time. And i wanted to make sure that it is complex enough such as involving some what a machine learning for this feature but dont make it too complex since i dont have much idea on how i could do this too.

So 2 core things:
Realtime display of matches.
Matchmaking algorithm for users based from their preferences and data (whether their own data or their history of data while using the app)


Type of sports and their pre-defined location and name of the court and maximum number of players needed:

Football: 22 players 
Name of Court: Padang Pusat Sukan UiTM


Rugby: 22 players 
Name of Court: Padang Pusat Sukan UiTM

basketball : 15 players
Name of Court: 
1. Court Pusat Sukan A 
2. Court Pusat Sukan B

Futsal: 12 players
Name of Court: 
1. Court Pusat Sukan A 
2. Court Pusat Sukan B
3. Court Perindu A 
Court Perindu B

Volley: 15 players
Name of Court: 
1. Court Pusat Sukan A 
2. Court Pusat Sukan B
3. Court Perindu A 
4. Court Perindu B

Frisbee: 15 players
Name of Court: 
Padang Hoki Pusat Sukan


Hockey: 15 players
Name of Court: 
Padang Hoki Pusat Sukan


Badminton: 8 players
Name of Court: 
Court Pusat Sukan A 
Court Pusat Sukan B
Court Pusat Sukan C 
Court Pusat Sukan D 
Court Pusat Sukan E 
Court Pusat Sukan F
Court Budisiswa 


Here is the full extent of how the app should function as an MVP:

FOR USER (Not an admin, just a normal user)

User registers using their university email (@student.uitm.edu.my) 
User needs to approve their email registration via email and once they dont that, they will be redirected to the app again. Automatically logs them in once approved. 
Navigation bar will display 

-Home (Home screen)
-Find (Finding games and players)
-Host (Page for hosting games) 
-Profile (User profile page) 

For Home Navigation:

Display welcome, username!
Profile picture next to it and also notification bell button anywhere top right or somewhere appropriate. 
Display button such as find and host games where if pressed, it will navigate them the following navigation. 
Display calendar of the user’s joined and hosted games. Can interact with the calendar, when pressed of the following dates, it will display the user hosted or joined games. If the user hosted the match, they can edit the match such as deleting the match,invite added friends via the app friend management system or they can add them in that match via social media links. Anyone can view the match in detail when they click on the match. 
Below it, I want you to Display most popular sports such as most hosted sports.
IM also thinking of adding leaderboard feature displayed next to notification bell button but we will skip this part but tell me your opinion on this on what can be made possible. 


For Find Navigation: 

Display 2 part of the screen where user can choose between 2 such as::

Finding games:

Display all the games based from the preferences displayed. Default preferences means all the games will be displayed randomly. Preferences such as: Type of sports, skill level, date and time of the match and other thing that can be considered. 
Once the preferences was chosen, it will display all the match based from the match preferences.
To add abit of more complexity, add in recommendation system where it display recommended games to the user, displaying to the top of the Find navigation screen or inside their notification. It recommend based on user inputted data such as their sports type, skill level, positions. User’s historical data also can be used for this algorithm too. Suggest me the model that i can use for this feature please, 
When matches are displayed, user can press on the match and detail will be shown to them in a new page. 
This new page called “Match Detail”  is where they can view the details such as the location (pre-defined place and gps location), number of participants needed, hoster name, skill level required (Beginner, Intermediate, Professional), and i want it to display the participants in a box where everyone is stacked in one column and it will display the hoster profile there, then below the hoster, is shown the participants. Inside this box also, the hoster have the access to invite their in-game friends. The hoster can share the link of the match and once the user pressed the link, it will navigate them to the match inside the app, make sure to have the user who pressed the link have the app to view the match or else require them to download the app. 
The hoster of the match have the ability to kick off the player that joined the match. Kick button will be displayed in the row of the player inside the participant box. 
At the bottom, a cancel button to cancel the match will be displayed. Once pressed, it will display a cancel confirmation modal. Then if confirmed, the match will be canceled and all the participants will be removed. Inside their “Home” screen for everyone that were in that match will have show the match inside the calendar where it will display “CANCELLED”. They can further delete the cancelled match to clear up their calendar.
		
		


Extra step when building the hosting page of the app:

Make sure to left a placeholder for a picture diagram in the page too. I wanted to insert picture of the selected court like for exmaple, if the user choose football then it will display a picture for it but if user choose futsal, it will display the picture of futsal court, For now, Just leave a space for me to put a pic there. Once i got the picture ready, ill let you insert pictures there. 
 
Finding Players 
Theres a search bar at the top, where user can key in username of the players or the ID of the player to find players. 
It will also display suggested player to add friend with based from similar preferences and history data of player. (Use the same concept as recommendation system to the “Finding Games algorithm”. 
User can press the player and it will navigate them to their profile page. 
Inside their profile page, the user can see their data such as:
Profile picture, Username, ID number, sport preferences, their history of joined/hosted games, skill level, their email that was used to sign up for the app, ratings (1 to 5 stars). It will also show their achievements too. Make it a simple achievement tab. 
Theres also button where user can press to Add Friend. Once pressed, it will display “Requested” and once the user accepted it, it will display “Removed” which means the user is already friend with them and have the ability to remove them as a friend too once pressed “Removed” button. Make it simple. 

For Host Navigation Page: 

Display the data requirement to host the match such as: Sport name, title of match, skill level, number of participants, position needed (User key in by themselves), date and time and description of the match. For Number of participants, make it appropriate based from the following sport criteria that i gave to you earlier. 
		


For profile navigation page:
Display profile picture, username, profile bio and the rest of how you would view other players just that since their profile so they have the ability to change something about them except the user’s ID and achievements tab Suggest me other features that could be useful but dont add them yet. Then in this page also displays setting icon, when settings icon is pressed, it will navigate them to the settings page, in settings page displayed the Log Out button, privacy and policy, app’s version and theme mode such as bright and dark mode. They will also see a report button being displayed anywhere in the screen in this page to send messages to the admin for further questions. 

Other navigation:

Notification icon, display it in the dashboard or home screen, make it top right or somewhere appropriate.  

FOR Admin: 

They log in using their Admin credentials, i will give you their credentials later, but im thinking of making a different sign in method, like one for staff of the app or admin of the app and theres one for normal sign in (Normal user sign in page), so when the admin wants to sign in, they can enter their credentials into the admin sign in page, or when they wanted to host a match, they can just use the normal sign in page for the normal user.
Once the user sign in using their credentials, they will see tabs such as user queries, data analytical dashboard that shows the result of the most hosted sports, and the timing of the hosting (in what hour is most sports being hosted or what day is the sport being hosted), and other things that can be important to analyze on. 
</app-overview>
<task>
Follow the guidelines above precisely to ensure correctness. 
Feature 1: User Authentication & Registration System
Screen 1: Registration Screen
Screen 1 State 1: Initial Registration Form
Layout: Clean single-column form on Background White (#FFFFFF) with 16dp margins
Header: "Join Sportea" in H1 style (28px, Bold) with Primary Maroon (#8A1538)
Subheader: "Connect with UiTM students for sports" in Body text (15px, Regular) with Dark Gray (#424242)
Email Field: Input field (56dp height) with "@student.uitm.edu.my" placeholder and real-time domain validation
Full Name Field: Standard input with proper capitalization hints
Student ID Field: Numeric input with format validation
Password Field: Secure input with strength indicator bar in Primary Maroon gradient
Terms Checkbox: Small checkbox with Caption text (12px, Medium) and clickable terms link
Primary Button: "Create Account" - Primary Maroon background, White text, 48dp height
Animation: Smooth 200ms transitions for field focus states, validation errors slide in from right
Screen 1 State 2: Email Verification Pending
Background: Background Light (#F5F7F9) with centered card
Icon: Large mail icon (64dp) in Primary Maroon
Header: "Check Your Email" in H2 style (24px, Bold)
Body: "We sent a verification link to [email]" in Body text
Resend Timer: Countdown in Caption style with "Resend in 4:32" format
Secondary Button: "Resend Email" (disabled during cooldown)
Animation: Pulsing mail icon, timer countdown animation
Screen 2: Login Screen
Screen 2 State 1: Standard Login
Layout: Minimal centered form on Background White
Logo: Sportea wordmark in Primary Maroon (positioned 48dp from top)
Email Field: Pre-filled if returning user, with domain suffix hint
Password Field: Toggle visibility icon in Neutral Gray
Remember Me: Toggle switch in Secondary Maroon Light when active
Primary Button: "Sign In" - full-width Primary Maroon
Forgot Password: Text button in Primary Maroon, positioned below main button
Error States: Red border (Error Red #D32F2F) with slide-down error message
Animation: Gentle bounce on invalid login attempts, success checkmark before navigation
Screen 2 State 2: Loading Authentication
Overlay: Semi-transparent Background Light over form
Loading Indicator: Custom spinning Sportea logo in Primary Maroon
Text: "Signing in..." in Body Small (13px, Regular)
Animation: 350ms fade-in for overlay, continuous rotation for logo
Screen 3: Password Reset Flow
Screen 3 State 1: Reset Request
Header: "Reset Password" in H2 style
Email Field: With validation for registered accounts
Primary Button: "Send Reset Link"
Back Button: Text button "Back to Sign In"
Success Message: Green checkmark with "Reset link sent!" message
Animation: Success state slides up from bottom with gentle spring curve
Feature 2: Real-time Match Display System
Screen 1: Live Match Dashboard
Screen 1 State 1: Connected with Active Matches
Header Bar: "Live Matches" in H2 with connection status indicator (green dot)
Match Cards: Elevated cards (12dp corner radius) with real-time participant counters
Card Layout: Sport icon, match title, participant count (e.g., "8/12"), time remaining
Live Indicators: Subtle pulsing Primary Maroon dot for newly created matches
Filter Pills: Horizontally scrollable sport filters with Selected state in Secondary Maroon Pale
Pull to Refresh: Custom refresh indicator in Primary Maroon
Animation: New matches slide in from top with 300ms spring curve, participant updates with number counter animation
Screen 1 State 2: Connection Issues
Overlay Banner: Yellow warning banner at top with "Connection unstable - trying to reconnect"
Match Cards: Slightly faded (80% opacity) with "Last updated X seconds ago" timestamps
Retry Button: Secondary button "Reconnect" in banner
Auto-retry: Visual countdown in banner showing next retry attempt
Animation: Gentle fade between connected/disconnected states
Screen 1 State 3: Empty State
Illustration: Custom sports-themed illustration in center
Header: "No active matches right now" in H3
Subtext: "Be the first to host a game!" in Body
Primary Button: "Host a Match" leading to Feature 3
Animation: Illustration elements animate in sequence on load
Screen 2: Real-time Notifications
Screen 2 State 1: In-App Notifications
Toast Notifications: Slide down from top with sport icon and message
Match Updates: "New Basketball match at Court A" with quick join button
Friend Activities: "Sarah joined a Football match" with profile picture
System Messages: Connection status, maintenance updates
Animation: 350ms slide-down, auto-dismiss after 4 seconds unless interaction occurs
Feature 3: Match Hosting & Management System
Screen 1: Match Creation Form
Screen 1 State 1: Sport Selection
Grid Layout: 2x4 grid of sport cards with icons and names
Card Design: White background, Primary Maroon border when selected
Sport Icons: 32dp sport-specific icons in Primary Maroon
Player Count: Small badge showing "10-22 players" in Caption style
Animation: Selected card scales to 1.05x with gentle bounce, unselected cards fade to 80%
Screen 1 State 2: Court & Time Selection
Court Cards: Horizontal scroll with court images, names, and facility icons
Date Picker: Custom calendar with Primary Maroon accents for available dates
Time Slots: Grid of available time blocks (30-minute increments)
Duration Selector: Stepper control for match duration (1-4 hours)
Weather Alert: Conditional banner for outdoor courts showing weather forecast
Animation: Court selection with smooth horizontal scroll snap, time blocks highlight with color transition
Screen 1 State 3: Match Details
Title Field: Large input for match name with character counter
Description: Multi-line text area with formatting hints
Skill Level: Segmented control (Beginner/Intermediate/Professional)
Player Limits: Min/max steppers with sport-specific constraints
Equipment Toggle: Switches for "Equipment provided" items
Privacy Toggle: "Private match" switch with explanation text
Animation: Dynamic form validation with real-time feedback
Screen 2: Match Management (Host View)
Screen 2 State 1: Active Match Overview
Header: Match title with edit icon, countdown to match time
Participant Grid: Profile pictures in organized grid with host badge
Quick Actions: Row of buttons (Edit Details, Invite Friends, Cancel Match)
Court Information: Card showing location, facilities, and directions button
Chat Preview: Last 3 messages with "View All" link (future feature preparation)
Animation: Participant joins animate with slide-in effect, real-time counter updates
Screen 2 State 2: Participant Management
Participant List: Full list with profile pictures, names, and join times
Host Controls: Three-dot menu per participant with "View Profile" and "Remove" options
Waitlist Section: Collapsible section showing waitlisted users with approve/deny buttons
Bulk Actions: Select mode for managing multiple participants
Animation: Remove actions with confirm dialog, approve animations with green checkmark
Screen 3: Match Cancellation Flow
Screen 3 State 1: Cancellation Confirmation
Modal Dialog: Centered on Background White with shadow
Warning Icon: Large warning icon in Error Red
Header: "Cancel this match?" in H3
Impact Text: "X participants will be notified" in Body
Reason Selector: Optional dropdown for cancellation reason
Buttons: "Keep Match" (Secondary) and "Cancel Match" (Error Red background)
Animation: Modal slides up from bottom with backdrop fade
Feature 4: Match Discovery & Joining System
Screen 1: Match Discovery Dashboard
Screen 1 State 1: Default View with Filters
Search Bar: Prominent search with sport icon and "Find matches..." placeholder
Filter Bar: Horizontal scroll of filter pills (Sport, Skill, Time, Location)
View Toggle: Segmented control for List/Map/Calendar views
Match Cards: Vertical stack with sport icon, title, participants, time, and quick join button
Recommendation Section: "Recommended for you" header with horizontal scroll of match cards
Animation: Filter selection with smooth pill highlighting, card entrance with staggered timing
Screen 1 State 2: Map View
Full-Screen Map: Integrated map with court markers in Primary Maroon
Floating Search: Search bar floats over map with transparency
Match Markers: Custom markers showing sport type and participant count
Detail Cards: Bottom sheet that slides up when marker is tapped
Current Location: User location with different marker style
Animation: Smooth map transitions, marker selection with bounce effect
Screen 1 State 3: Calendar View
Month View: Calendar grid with match indicator dots
Day Selection: Selected day highlighted in Secondary Maroon Pale
Match Timeline: Below calendar showing matches for selected day in chronological order
Quick Navigation: Month/week toggle with smooth transitions
Animation: Calendar navigation with slide transitions, match timeline updates with fade
Screen 2: Match Detail View
Screen 2 State 1: Full Match Information
Hero Section: Sport image/icon with overlay containing key details
Host Profile: Host avatar, name, rating, and "View Profile" link
Match Info Cards: Organized sections for Time & Location, Requirements, Equipment
Participant Preview: Horizontal scroll of participant avatars with "+3 more" indicator
Map Preview: Small map showing court location with "Get Directions" button
Primary Action: Large "Join Match" button at bottom
Animation: Hero parallax scroll, section reveals with fade-up effect
Screen 2 State 2: Join Confirmation
Modal Overlay: Confirmation dialog with match summary
User Profile Preview: Your profile as it will appear to other participants
Commitment Text: "By joining, you commit to participate" message
Buttons: "Confirm Join" (Primary Maroon) and "Cancel" (Secondary)
Loading State: Button transforms to loading spinner during API call
Animation: Success confirmation with checkmark and "You're in!" message
Screen 3: Waitlist & Requests
Screen 3 State 1: Waitlist Position
Position Indicator: Large number showing "You're #2 in line"
Progress Ring: Circular progress showing likelihood of getting in
Notification Settings: Toggle for waitlist notifications
Alternative Matches: "Similar matches you might like" section
Animation: Position updates with number counting animation
Feature 5: Basic Recommendation Engine
Screen 1: Personalized Recommendations
Screen 1 State 1: Dashboard Integration
Section Header: "Recommended for You" with personalization icon
Recommendation Cards: Enhanced match cards with "Why this match?" explanations
Explanation Tags: Small pills showing "Favorite sport", "Skill match", "Friend joining"
Feedback Actions: Thumbs up/down buttons for recommendation quality
Refresh Button: "See more recommendations" with refresh icon
Animation: Cards slide in with staggered timing, explanation tags fade in after card
Screen 1 State 2: No Recommendations Available
Illustration: Custom illustration showing user connecting with others
Header: "We're learning your preferences" in H3
Subtext: "Join a few matches to get personalized recommendations"
CTA Button: "Explore All Matches"
Animation: Illustration elements animate to show progression
Screen 2: Recommendation Preferences
Screen 2 State 1: Preference Settings
Sport Preferences: List of sports with slider controls for interest level
Skill Level: Current skill per sport with progression indicators
Time Preferences: Weekly calendar grid to mark preferred times
Social Settings: Toggles for friend-based recommendations
Save Button: Fixed at bottom, enabled when changes are made
Animation: Sliders animate smoothly, calendar selection with color transitions
Feature 6: User Profile & Friend Management System
Screen 1: User Profile View
Screen 1 State 1: Own Profile
Header: Large avatar (96dp) with edit button overlay
Name & Stats: User name, student ID, and key statistics row
Achievement Badges: Horizontal scroll of earned badges with progress indicators
Sports History: Chart showing participation by sport type
Recent Activity: Timeline of recent matches and achievements
Settings Button: Gear icon in top right
Animation: Profile load with staggered element animation, badge collection with celebration effects
Screen 1 State 2: Other User Profile
Header: Similar layout but with "Add Friend" or "Message" buttons
Mutual Connections: "X mutual friends" with avatar preview
Public Stats: Match completion rate, reliability score, preferred sports
Common Matches: "Played together X times" section
Action Buttons: "Add Friend", "Invite to Match", "Block User"
Animation: Connection status updates with smooth transitions
Screen 2: Friends List & Management
Screen 2 State 1: Friends Dashboard
Search Bar: "Search friends..." with real-time filtering
Active Friends: Section showing currently active friends with green status dots
Friend Requests: Collapsible section with pending incoming/outgoing requests
All Friends: Alphabetical list with sport badges and last active times
Group Creation: FAB for creating friend groups
Animation: Status indicators pulse gently, list updates with smooth additions/removals
Screen 2 State 2: Friend Requests
Incoming Requests: Cards with user info and Accept/Decline buttons
Outgoing Requests: Sent requests with Cancel option
Mutual Friends: Shows mutual connections for context
Request Actions: Smooth transitions between states (pending → accepted → friends)
Animation: Accept action with celebration micro-interaction
Screen 3: Achievement System
Screen 3 State 1: Achievement Gallery
Grid Layout: 3-column grid of achievement badges
Badge States: Earned (full color), In Progress (partial), Locked (grayscale)
Progress Indicators: Circular progress bars for achievements in progress
Badge Details: Tap to expand with description and requirements
Categories: Tabs for different achievement types (Participation, Social, Streaks)
Animation: Badge unlock with satisfying pop and particle effects
Navigation & Global Elements
Bottom Navigation
Home Tab: House icon, Primary Maroon when active
Find Tab: Search icon with notification badge for new matches
Host Tab: Plus icon, special styling with slight elevation
Profile Tab: User avatar thumbnail
Animation: Tab switches with gentle bounce, active state with color transition
Top Navigation Elements
Status Bar: Custom styling with Primary Maroon background on key screens
Header Bars: Consistent spacing (16dp margins), back buttons, action buttons
Notification Bell: Badge with unread count, shake animation for new notifications
Connection Indicator: Subtle WiFi-style icon showing real-time connection status
Loading States
Skeleton Screens: Subtle shimmer effect in Secondary Maroon Pale
Content Loading: Staggered fade-in for lists, smooth transitions for single items
Button Loading: Transform button text to spinner, maintain button size
Animation: All loading states use 200ms ease-out transitions
Error States
Network Errors: Friendly illustrations with retry buttons
Empty States: Custom illustrations matching the feature context
Form Errors: Red borders with slide-down error messages
Animation: Error states slide in from appropriate direction, success states celebrate with micro-interactions
Accessibility Features
Color Contrast: All text meets WCAG AA standards against backgrounds
Touch Targets: Minimum 44dp for all interactive elements
Screen Reader: Proper labeling for all interactive elements
Keyboard Navigation: Logical tab order and focus indicators
Animation Preferences: Respect system motion reduction settings
</task>

<style-guide>Here’s the app’s style guide:
Design Brief: Culinary Transform App
Color Palette
Primary Colors
Primary White - #F9FAFA (Used for backgrounds and clean surfaces)
Primary Maroon - #8A1538 (Primary brand color for buttons, icons, and emphasis)
Secondary Colors
Secondary Maroon Light - #B52E4C (For hover states and secondary elements)
Secondary Maroon Pale - #F9EBEE (For backgrounds, selected states, and highlights)
Accent Colors
Accent Red - #E63946 (For important actions and notifications)
Accent Gold - #F2C94C (For premium features and highlights)
Functional Colors
Success Green - #34A853 (For success states and confirmations)
Error Red - #D32F2F (For errors and destructive actions)
Neutral Gray - #9E9E9E (For secondary text and disabled states)
Dark Gray - #424242 (For primary text)
Background Colors
Background White - #FFFFFF (Pure white for cards and content areas)
Background Light - #F5F7F9 (Subtle off-white for app background)
Background Dark - #1A1A1A (For dark mode primary background)
Typography
Font Family
Primary Font: SF Pro Text (iOS) / Roboto (Android)
Alternative Font: Inter (Web fallback)
Font Weights
Regular: 400
Medium: 500
Semibold: 600
Bold: 700
Text Styles
Headings
H1: 28px/34px, Bold, Letter spacing -0.2px
Used for screen titles and major headers
H2: 24px/30px, Bold, Letter spacing -0.2px
Used for section headers and card titles
H3: 20px/26px, Semibold, Letter spacing -0.1px
Used for subsection headers and recipe names
Body Text
Body Large: 17px/24px, Regular, Letter spacing 0px
Primary reading text for recipe content
Body: 15px/22px, Regular, Letter spacing 0px
Standard text for most UI elements
Body Small: 13px/18px, Regular, Letter spacing 0.1px
Secondary information and ingredient lists
Special Text
Caption: 12px/16px, Medium, Letter spacing 0.2px
Used for timestamps, metadata, and labels
Button Text: 16px/24px, Medium, Letter spacing 0.1px
Used specifically for buttons and interactive elements
Link Text: 15px/22px, Medium, Letter spacing 0px, Primary Maroon (#8A1538)
Clickable text throughout the application
Component Styling
Buttons
Primary Button
Background: Primary Maroon (#8A1538)
Text: White (#FFFFFF)
Height: 48dp
Corner Radius: 8dp
Padding: 16dp horizontal
State changes: Darken by 10% on press
Secondary Button
Border: 1.5dp Primary Maroon (#8A1538)
Text: Primary Maroon (#8A1538)
Background: Transparent
Height: 48dp
Corner Radius: 8dp
State changes: Background fill 10% opacity on press
Text Button
Text: Primary Maroon (#8A1538)
No background or border
Height: 44dp
State changes: Text darken by 10% on press
Cards
Background: White (#FFFFFF)
Shadow: Y-offset 2dp, Blur 8dp, Opacity 8%
Corner Radius: 12dp
Padding: 16dp
Border: Optional 1dp light gray (#E0E0E0) for greater definition
Input Fields
Height: 56dp
Corner Radius: 8dp
Border: 1dp Neutral Gray (#9E9E9E)
Active Border: 2dp Primary Maroon (#8A1538)
Background: White (#FFFFFF)
Text: Dark Gray (#424242)
Placeholder Text: Neutral Gray (#9E9E9E)
Icon position: Right-aligned for actionable inputs
Icons
Primary Icons: 24dp × 24dp
Small Icons: 20dp × 20dp
Navigation Icons: 28dp × 28dp
Primary color for interactive icons: Primary Maroon (#8A1538)
Secondary color for inactive/decorative icons: Neutral Gray (#9E9E9E)
Style: Outlined with 2dp stroke for consistency
Spacing System
4dp - Micro spacing (between related elements)
8dp - Small spacing (internal padding)
16dp - Default spacing (standard margins)
24dp - Medium spacing (between sections)
32dp - Large spacing (major sections separation)
48dp - Extra large spacing (screen padding top/bottom)
Motion & Animation
Standard Transition: 200ms, Ease-out curve
Emphasis Transition: 300ms, Spring curve (tension: 300, friction: 35)
Microinteractions: 150ms, Ease-in-out
Page Transitions: 350ms, Custom cubic-bezier(0.2, 0.8, 0.2, 1)
Camera/Photo Transitions: 400ms, Anticipation curve for capturing moments
Special UI Elements
Recipe Cards
Prominent image area: 60% of card height
Title: H3 text style
Metadata row: Caption text with icon prefixes
Corner Radius: 16dp (slightly larger than standard cards)
Shadow: Y-offset 3dp, Blur 12dp, Opacity 10% (enhanced depth)
Photo Capture Interface
Minimalist overlay controls
Dynamic guides using Primary Maroon indicators
Capture button: 64dp diameter, white with maroon border
Flash/settings icons: White with 50% background overlay for visibility
Recipe View
Step indicators: Small numbered circles in Primary Maroon
Ingredient quantities: Bold emphasis
Time indicators: Icon + Caption text in Secondary Maroon Light
Scrolling indicator: Subtle maroon dot pagination
</style-guide>
</context>


