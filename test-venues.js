/**
 * Venues Implementation Test Script
 * 
 * This script tests the venues implementation to ensure that:
 * 1. The locations table exists and has the required fields
 * 2. The locations are properly populated with the venue data
 * 3. The supported_sports field is properly set for each location
 * 
 * Usage: node test-venues.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Run tests
async function runTests() {
  console.log('Starting venues implementation tests...');
  
  try {
    // Test 1: Check if the locations table exists
    console.log('\n=== Test 1: Locations Table ===');
    const { data: locations, error } = await supabase
      .from('locations')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error accessing locations table:', error.message);
    } else {
      console.log('✅ Locations table exists and is accessible');
    }
    
    // Test 2: Check if locations have coordinates
    console.log('\n=== Test 2: Location Coordinates ===');
    const { data: locationsWithCoords, error: coordsError } = await supabase
      .from('locations')
      .select('id, name, coordinates');
    
    if (coordsError) {
      console.error('❌ Error fetching location coordinates:', coordsError.message);
    } else {
      const withCoords = locationsWithCoords.filter(loc => 
        loc.coordinates && loc.coordinates.lat && loc.coordinates.lng
      );
      
      console.log(`Found ${locationsWithCoords.length} locations, ${withCoords.length} with valid coordinates`);
      
      if (withCoords.length === 0) {
        console.error('❌ No locations have coordinates');
      } else if (withCoords.length < locationsWithCoords.length) {
        console.warn('⚠️ Some locations are missing coordinates');
        locationsWithCoords.forEach(loc => {
          if (!loc.coordinates || !loc.coordinates.lat || !loc.coordinates.lng) {
            console.warn(`  - ${loc.name} (missing coordinates)`);
          }
        });
      } else {
        console.log('✅ All locations have coordinates');
      }
    }
    
    // Test 3: Check if locations have supported_sports
    console.log('\n=== Test 3: Supported Sports ===');
    const { data: locationsWithSports, error: sportsError } = await supabase
      .from('locations')
      .select('id, name, supported_sports');
    
    if (sportsError) {
      console.error('❌ Error fetching location sports:', sportsError.message);
    } else {
      const withSports = locationsWithSports.filter(loc => 
        loc.supported_sports && Array.isArray(loc.supported_sports) && loc.supported_sports.length > 0
      );
      
      console.log(`Found ${locationsWithSports.length} locations, ${withSports.length} with supported sports`);
      
      if (withSports.length === 0) {
        console.error('❌ No locations have supported sports');
      } else if (withSports.length < locationsWithSports.length) {
        console.warn('⚠️ Some locations are missing supported sports');
        locationsWithSports.forEach(loc => {
          if (!loc.supported_sports || !Array.isArray(loc.supported_sports) || loc.supported_sports.length === 0) {
            console.warn(`  - ${loc.name} (missing supported sports)`);
          }
        });
      } else {
        console.log('✅ All locations have supported sports');
      }
    }
    
    // Test 4: Check if all sports exist
    console.log('\n=== Test 4: Sports Table ===');
    const { data: sports, error: sportsTableError } = await supabase
      .from('sports')
      .select('id, name');
    
    if (sportsTableError) {
      console.error('❌ Error fetching sports:', sportsTableError.message);
    } else {
      console.log(`Found ${sports.length} sports in the database:`);
      sports.forEach(sport => {
        console.log(`  - ${sport.name} (${sport.id})`);
      });
      
      // Check for expected sports
      const expectedSports = ['Football', 'Basketball', 'Volleyball', 'Badminton', 'Rugby', 'Hockey', 'Frisbee', 'Futsal'];
      const sportNames = sports.map(s => s.name.toLowerCase());
      
      const missingSports = expectedSports.filter(s => 
        !sportNames.includes(s.toLowerCase())
      );
      
      if (missingSports.length > 0) {
        console.warn('⚠️ Missing expected sports:', missingSports.join(', '));
      } else {
        console.log('✅ All expected sports are present');
      }
    }
    
    console.log('\nTests completed.');
    
  } catch (error) {
    console.error('Unexpected error during testing:', error);
  }
}

// Run the tests
runTests(); 