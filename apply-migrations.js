/**
 * Apply Venues SQL Migrations
 * 
 * This script applies the SQL migrations to update the locations table and populate it with venues data
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigrations() {
  console.log('Starting venues migrations application...');

  try {
    // First migration: Update locations table schema
    console.log('\n=== Applying migration 1: Update locations table ===');
    const updateTableSQL = readFileSync(
      join(process.cwd(), 'supabase', 'migrations', '20250620_update_locations_table.sql'),
      'utf-8'
    );
    
    const { error: updateError } = await supabase.rpc('exec_sql', { sql: updateTableSQL });
    
    if (updateError) {
      console.error('❌ Error updating locations table:', updateError.message);
      console.log('Trying to continue with the next migration...');
    } else {
      console.log('✅ Successfully updated locations table schema');
    }
    
    // Second migration: Populate locations with venue data
    console.log('\n=== Applying migration 2: Populate locations with venues ===');
    const populateLocationsSQL = readFileSync(
      join(process.cwd(), 'supabase', 'migrations', '20250621_populate_locations.sql'),
      'utf-8'
    );
    
    const { error: populateError } = await supabase.rpc('exec_sql', { sql: populateLocationsSQL });
    
    if (populateError) {
      console.error('❌ Error populating locations:', populateError.message);
    } else {
      console.log('✅ Successfully populated locations with venue data');
    }
    
    // Verify the results
    console.log('\n=== Verifying migrations ===');
    const { data: locations, error: selectError } = await supabase
      .from('locations')
      .select('id, name, coordinates, supported_sports')
      .limit(5);
    
    if (selectError) {
      console.error('❌ Error verifying locations:', selectError.message);
    } else {
      console.log(`✅ Found ${locations.length} locations with the updated schema`);
      console.table(locations.map(loc => ({
        name: loc.name,
        coordinates: JSON.stringify(loc.coordinates),
        supported_sports: loc.supported_sports ? loc.supported_sports.length : 0
      })));
    }
    
    console.log('\nMigrations completed.');
    
  } catch (error) {
    console.error('Unexpected error during migrations:', error);
  }
}

// Run the migrations
applyMigrations(); 