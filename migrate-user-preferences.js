/**
 * User Preferences Migration Script
 * 
 * This script helps migrate user preferences from the old format to the new format
 * required by the direct preference matching recommendation system.
 * 
 * Usage:
 * 1. Create a .env file with the following variables:
 *    SUPABASE_URL=your_supabase_url
 *    SUPABASE_SERVICE_KEY=your_supabase_service_key (requires service key with admin access)
 * 
 * 2. Run the script:
 *    node migrate-user-preferences.js
 */

// Load environment variables from .env file
require('dotenv').config();

// Import dependencies
const { createClient } = require('@supabase/supabase-js');

// Create Supabase client with service role key (needed for admin operations)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

/**
 * Main migration function
 */
async function migrateUserPreferences() {
  console.log(`${colors.bright}User Preferences Migration${colors.reset}\n`);
  console.log(`${colors.yellow}Warning: This script requires a service role key with admin access.${colors.reset}\n`);
  
  try {
    // Step 1: Get all users with preferences
    console.log(`${colors.cyan}Step 1: Fetching users with preferences...${colors.reset}`);
    const { data: users, error: usersError } = await supabase
      .from('user_preferences')
      .select('user_id');
    
    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }
    
    if (!users || users.length === 0) {
      console.log(`${colors.yellow}No users with preferences found.${colors.reset}`);
      return;
    }
    
    console.log(`${colors.green}✓ Found ${users.length} users with preferences${colors.reset}\n`);
    
    // Step 2: Process each user
    console.log(`${colors.cyan}Step 2: Migrating user preferences...${colors.reset}`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const { user_id } of users) {
      try {
        // Get existing preferences
        const { data: oldPrefs, error: oldPrefsError } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user_id)
          .single();
        
        if (oldPrefsError) {
          throw new Error(`Failed to fetch preferences for user ${user_id}: ${oldPrefsError.message}`);
        }
        
        // Extract venue preferences from existing data
        const venuePreferences = [];
        if (oldPrefs.venue_preferences) {
          try {
            // Try parsing if it's a JSON string
            const parsedVenues = typeof oldPrefs.venue_preferences === 'string' 
              ? JSON.parse(oldPrefs.venue_preferences) 
              : oldPrefs.venue_preferences;
            
            // Extract venue IDs from various possible formats
            if (Array.isArray(parsedVenues)) {
              parsedVenues.forEach(venue => {
                if (typeof venue === 'string') {
                  venuePreferences.push(venue);
                } else if (venue && venue.id) {
                  venuePreferences.push(venue.id);
                }
              });
            } else if (parsedVenues && typeof parsedVenues === 'object') {
              Object.keys(parsedVenues).forEach(key => {
                if (parsedVenues[key]) {
                  venuePreferences.push(key);
                }
              });
            }
          } catch (e) {
            console.log(`${colors.yellow}Warning: Could not parse venue preferences for user ${user_id}${colors.reset}`);
          }
        }
        
        // Extract available days from existing data
        const availableDays = [];
        const dayMapping = {
          monday: 'monday',
          tuesday: 'tuesday',
          wednesday: 'wednesday',
          thursday: 'thursday',
          friday: 'friday',
          saturday: 'saturday',
          sunday: 'sunday',
          Mon: 'monday',
          Tue: 'tuesday',
          Wed: 'wednesday',
          Thu: 'thursday',
          Fri: 'friday',
          Sat: 'saturday',
          Sun: 'sunday'
        };
        
        if (oldPrefs.available_days) {
          try {
            const parsedDays = typeof oldPrefs.available_days === 'string'
              ? JSON.parse(oldPrefs.available_days)
              : oldPrefs.available_days;
            
            if (Array.isArray(parsedDays)) {
              parsedDays.forEach(day => {
                const normalizedDay = dayMapping[day];
                if (normalizedDay && !availableDays.includes(normalizedDay)) {
                  availableDays.push(normalizedDay);
                }
              });
            } else if (parsedDays && typeof parsedDays === 'object') {
              Object.keys(parsedDays).forEach(day => {
                if (parsedDays[day]) {
                  const normalizedDay = dayMapping[day];
                  if (normalizedDay && !availableDays.includes(normalizedDay)) {
                    availableDays.push(normalizedDay);
                  }
                }
              });
            }
          } catch (e) {
            console.log(`${colors.yellow}Warning: Could not parse available days for user ${user_id}${colors.reset}`);
          }
        }
        
        // Extract available times from existing data
        const availableTimes = [];
        const timeMapping = {
          morning: 'morning',
          afternoon: 'afternoon',
          evening: 'evening',
          Morning: 'morning',
          Afternoon: 'afternoon',
          Evening: 'evening',
          AM: 'morning',
          PM: 'afternoon',
          Night: 'evening'
        };
        
        if (oldPrefs.available_times) {
          try {
            const parsedTimes = typeof oldPrefs.available_times === 'string'
              ? JSON.parse(oldPrefs.available_times)
              : oldPrefs.available_times;
            
            if (Array.isArray(parsedTimes)) {
              parsedTimes.forEach(time => {
                const normalizedTime = timeMapping[time];
                if (normalizedTime && !availableTimes.includes(normalizedTime)) {
                  availableTimes.push(normalizedTime);
                }
              });
            } else if (parsedTimes && typeof parsedTimes === 'object') {
              Object.keys(parsedTimes).forEach(time => {
                if (parsedTimes[time]) {
                  const normalizedTime = timeMapping[time];
                  if (normalizedTime && !availableTimes.includes(normalizedTime)) {
                    availableTimes.push(normalizedTime);
                  }
                }
              });
            }
          } catch (e) {
            console.log(`${colors.yellow}Warning: Could not parse available times for user ${user_id}${colors.reset}`);
          }
        }
        
        // Extract favorite activities from existing data
        const favoriteActivities = [];
        if (oldPrefs.favorite_activities) {
          try {
            const parsedActivities = typeof oldPrefs.favorite_activities === 'string'
              ? JSON.parse(oldPrefs.favorite_activities)
              : oldPrefs.favorite_activities;
            
            if (Array.isArray(parsedActivities)) {
              parsedActivities.forEach(activity => {
                if (typeof activity === 'string') {
                  favoriteActivities.push(activity);
                } else if (activity && activity.id) {
                  favoriteActivities.push(activity.id);
                }
              });
            }
          } catch (e) {
            console.log(`${colors.yellow}Warning: Could not parse favorite activities for user ${user_id}${colors.reset}`);
          }
        }
        
        // Determine preferred group size
        let preferredGroupSize = 'medium';
        if (oldPrefs.group_size_preference) {
          const groupSize = oldPrefs.group_size_preference.toLowerCase();
          if (groupSize.includes('small')) {
            preferredGroupSize = 'small';
          } else if (groupSize.includes('large')) {
            preferredGroupSize = 'large';
          }
        }
        
        // Determine preferred skill level
        let preferredSkillLevel = 'intermediate';
        if (oldPrefs.skill_level) {
          const skillLevel = oldPrefs.skill_level.toLowerCase();
          if (skillLevel.includes('beginner')) {
            preferredSkillLevel = 'beginner';
          } else if (skillLevel.includes('advanced')) {
            preferredSkillLevel = 'advanced';
          }
        }
        
        // Create the new preferences object
        const newPreferences = {
          preferred_venues: venuePreferences,
          preferred_days: availableDays,
          preferred_times: availableTimes,
          preferred_group_size: preferredGroupSize,
          preferred_skill_level: preferredSkillLevel,
          preferred_match_frequency: oldPrefs.match_frequency || 'weekly'
        };
        
        // Update the user's preferences
        const { error: updateError } = await supabase
          .from('user_preferences')
          .update(newPreferences)
          .eq('user_id', user_id);
        
        if (updateError) {
          throw new Error(`Failed to update preferences for user ${user_id}: ${updateError.message}`);
        }
        
        console.log(`${colors.green}✓ Migrated preferences for user ${user_id}${colors.reset}`);
        successCount++;
        
      } catch (error) {
        console.error(`${colors.red}Error migrating user ${user_id}: ${error.message}${colors.reset}`);
        errorCount++;
      }
    }
    
    console.log(`\n${colors.bright}Migration Summary:${colors.reset}`);
    console.log(`${colors.green}✓ Successfully migrated: ${successCount} users${colors.reset}`);
    
    if (errorCount > 0) {
      console.log(`${colors.red}✗ Failed migrations: ${errorCount} users${colors.reset}`);
    }
    
  } catch (error) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Run the migration
migrateUserPreferences(); 