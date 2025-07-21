#!/usr/bin/env node

/**
 * Health Check Script for Sportea Production Deployment
 * Verifies all critical systems are working correctly
 */

import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.production' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const APP_URL = process.env.VITE_APP_URL || 'https://sportea.vercel.app';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkWebsiteHealth() {
  try {
    log('🌐 Checking website accessibility...', 'blue');
    const response = await fetch(APP_URL, { timeout: 10000 });
    
    if (response.ok) {
      log('✅ Website is accessible', 'green');
      return true;
    } else {
      log(`❌ Website returned status: ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Website check failed: ${error.message}`, 'red');
    return false;
  }
}

async function checkSupabaseConnection() {
  try {
    log('🗄️ Checking Supabase database connection...', 'blue');
    
    // Test basic connection
    const { data, error } = await supabase
      .from('sports')
      .select('count')
      .limit(1);
    
    if (error) {
      log(`❌ Database connection failed: ${error.message}`, 'red');
      return false;
    }
    
    log('✅ Database connection successful', 'green');
    return true;
  } catch (error) {
    log(`❌ Database check failed: ${error.message}`, 'red');
    return false;
  }
}

async function checkSupabaseAuth() {
  try {
    log('🔐 Checking Supabase authentication...', 'blue');
    
    // Test auth endpoint
    const { data, error } = await supabase.auth.getSession();
    
    if (error && error.message !== 'No session found') {
      log(`❌ Auth check failed: ${error.message}`, 'red');
      return false;
    }
    
    log('✅ Authentication system working', 'green');
    return true;
  } catch (error) {
    log(`❌ Auth check failed: ${error.message}`, 'red');
    return false;
  }
}

async function checkEdgeFunctions() {
  try {
    log('⚡ Checking Supabase Edge Functions...', 'blue');
    
    // Test a simple edge function
    const { data, error } = await supabase.functions.invoke('simplified-recommendations', {
      body: { test: true }
    });
    
    if (error && !error.message.includes('test')) {
      log(`❌ Edge functions check failed: ${error.message}`, 'red');
      return false;
    }
    
    log('✅ Edge functions accessible', 'green');
    return true;
  } catch (error) {
    log(`❌ Edge functions check failed: ${error.message}`, 'red');
    return false;
  }
}

async function checkCriticalTables() {
  try {
    log('📊 Checking critical database tables...', 'blue');
    
    const tables = ['users', 'matches', 'sports', 'locations', 'participants'];
    let allTablesOk = true;
    
    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('count')
          .limit(1);
        
        if (error) {
          log(`❌ Table '${table}' check failed: ${error.message}`, 'red');
          allTablesOk = false;
        } else {
          log(`✅ Table '${table}' accessible`, 'green');
        }
      } catch (tableError) {
        log(`❌ Table '${table}' check failed: ${tableError.message}`, 'red');
        allTablesOk = false;
      }
    }
    
    return allTablesOk;
  } catch (error) {
    log(`❌ Tables check failed: ${error.message}`, 'red');
    return false;
  }
}

async function runHealthCheck() {
  log('🏥 Starting Sportea Health Check...', 'blue');
  log('=====================================', 'blue');
  
  const checks = [
    { name: 'Website Health', fn: checkWebsiteHealth },
    { name: 'Database Connection', fn: checkSupabaseConnection },
    { name: 'Authentication', fn: checkSupabaseAuth },
    { name: 'Edge Functions', fn: checkEdgeFunctions },
    { name: 'Critical Tables', fn: checkCriticalTables }
  ];
  
  let passedChecks = 0;
  const totalChecks = checks.length;
  
  for (const check of checks) {
    const result = await check.fn();
    if (result) passedChecks++;
    console.log(''); // Add spacing
  }
  
  log('=====================================', 'blue');
  log(`Health Check Summary: ${passedChecks}/${totalChecks} checks passed`, 
      passedChecks === totalChecks ? 'green' : 'yellow');
  
  if (passedChecks === totalChecks) {
    log('🎉 All systems operational!', 'green');
    process.exit(0);
  } else {
    log('⚠️ Some systems need attention', 'yellow');
    process.exit(1);
  }
}

// Run the health check
runHealthCheck().catch(error => {
  log(`💥 Health check crashed: ${error.message}`, 'red');
  process.exit(1);
});
