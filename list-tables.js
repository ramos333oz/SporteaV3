/**
 * List Tables in the Database
 */

// Import dependencies
import { createClient } from '@supabase/supabase-js';

// Hardcoded credentials
const supabaseUrl = "https://fcwwuiitsghknsvnsrxp.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjd3d1aWl0c2doa25zdm5zcnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2NjI4MTgsImV4cCI6MjA2MzIzODgxOH0.5IkK_9D4FZU3z_4Kpm7pRJu8rIKfKleIpxMbyr-YoBA";

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  try {
    console.log('Listing tables in the database...');
    
    // Query for tables in the public schema
    const { data, error } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
    
    if (error) {
      // If pg_tables is not accessible, try a different approach
      console.log(`Error querying pg_tables: ${error.message}`);
      console.log('Trying an alternative approach...');
      
      // Try to query some known tables to see what's available
      const commonTables = ['profiles', 'users', 'games', 'venues', 'user_preferences'];
      
      console.log('Checking for common tables:');
      
      for (const table of commonTables) {
        try {
          const { error: tableError } = await supabase
            .from(table)
            .select('count(*)', { count: 'exact', head: true });
          
          if (tableError) {
            console.log(`- ${table}: Not accessible or doesn't exist`);
          } else {
            console.log(`- ${table}: Exists`);
          }
        } catch (e) {
          console.log(`- ${table}: Error checking - ${e.message}`);
        }
      }
      
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('No tables found or no permission to list tables.');
      return;
    }
    
    console.log('Tables in the database:');
    data.forEach((row, index) => {
      console.log(`${index + 1}. ${row.tablename}`);
    });
    
    // Try to get a sample from each table
    console.log('\nAttempting to get sample data from each table:');
    
    for (const row of data) {
      const tableName = row.tablename;
      try {
        const { data: sampleData, error: sampleError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (sampleError) {
          console.log(`- ${tableName}: Error - ${sampleError.message}`);
        } else if (!sampleData || sampleData.length === 0) {
          console.log(`- ${tableName}: Empty or no access`);
        } else {
          console.log(`- ${tableName}: Has data`);
          
          // Print column names
          console.log(`  Columns: ${Object.keys(sampleData[0]).join(', ')}`);
        }
      } catch (e) {
        console.log(`- ${tableName}: Error - ${e.message}`);
      }
    }
    
  } catch (error) {
    console.error(`\nError: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
listTables(); 