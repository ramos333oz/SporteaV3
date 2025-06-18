# Venues Implementation Verification Checklist

Use this checklist to verify that the venues implementation is working correctly.

## Database Verification

- [x] Run the migrations to update the locations table
  - `npx supabase migration up`

- [x] Verify the locations table exists with required fields (id, name, coordinates, supported_sports)
  - `id`
  - `name`
  - `coordinates`
  - `supported_sports`

- [x] Verify all venues from requirements are present in the database
  - All venues from the requirements should be present

- [x] Verify each venue has coordinates and supported_sports set
  - Each venue should have coordinates
  - Each venue should have supported_sports set

- [x] Add Tennis venues to the database
  - Court budisiswa A, B, C, D
  - Court Pusat Sukan A, B, C, D

- [x] Add Badminton venues to the database
  - Court Pusat Sukan Badminton Hall
  - Court Budisiswa Badminton

- [x] Add Squash venues to the database
  - Court Squash Budisiswa A, B
  - Court Squash Pusat Sukan A, B

## Map View Verification

- [x] Open the app and navigate to the Find Games page
  - `npm run dev` and go to the Find Games tab

- [x] Switch to Map View
  - The map should load without errors
  - The map should be centered on the UiTM campus area

- [x] Check that venues are displayed on the map
  - Each venue should have a marker
  - The marker should have the appropriate sport icon
  - Venues with multiple sports should have a combined icon

- [x] Click on a venue marker
  - A popup should appear with venue details
  - The popup should show the venue name
  - The popup should show the supported sports
  - The popup should have a "View Matches" button

- [x] Test the search functionality
  - Type a venue name in the search box
  - The map should filter to show only matching venues

- [x] Test filtering by sport
  - Select a sport from the sport filter
  - The map should show only venues that support that sport

- [x] Fix chip component error in sport filter
  - "Invalid prop `icon` of type `object` supplied to `ForwardRef(Chip2)`"
  - Replace icon prop with proper React component

- [x] Update SportIcon component to properly handle different sport types
  - Ensure all sport types have appropriate icons (including Squash)
  - Make SportIcon component compatible with the Chip component

## Hosting Page Verification

- [x] Navigate to the Host a Match page
  - Go to the Host tab

- [x] Select a sport
  - The location selection page should show only venues that support that sport

- [x] Check that venue details are displayed correctly
  - Each venue should show the correct name
  - Each venue should show the supported sports
  - Each venue should show available courts

- [x] Select a venue
  - The venue should be selected
  - The next button should be enabled

- [x] Complete the match creation process
  - Fill in the match details
  - Submit the form
  - The match should be created with the selected venue

## Edge Cases

- [x] Test with no internet connection
  - The app should fall back to using mock data
  - The map should still display venues

- [x] Test with a sport that has no venues
  - The app should show a message that no venues are available

- [x] Test with a venue that has no coordinates
  - The venue should not appear on the map
  - The venue should still appear in the hosting page

## Final Verification

- [x] Check that the app works end-to-end
  - Create a match at a specific venue
  - View the match in the Find Games page
  - Verify that the match is displayed at the correct venue on the map

- [x] Verify all sports can be filtered properly
  - Test filtering by Football, Basketball, Futsal
  - Test filtering by Volleyball, Tennis, Badminton
  - Test filtering by Rugby, Hockey, Frisbee, Squash 