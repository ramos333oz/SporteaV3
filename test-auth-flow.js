/**
 * Comprehensive Authentication Flow Testing Script
 * Tests the complete registration → email verification → login flow
 * 
 * Usage: node test-auth-flow.js
 * 
 * This script tests:
 * 1. User registration with profile creation
 * 2. Email verification redirect behavior
 * 3. Login with profile existence verification
 * 4. Backup profile creation mechanisms
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test accounts
const testAccounts = [
  {
    email: '2022812796@student.uitm.edu.my',
    password: 'Ulalala@369',
    name: 'Omar Test User',
    username: 'omartestuser'
  },
  {
    email: '2022812795@student.uitm.edu.my', 
    password: 'Ulalala@369',
    name: 'Azmil Test User',
    username: 'azmiltestuser'
  }
];

/**
 * Clean up test data
 */
async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...');
  
  for (const account of testAccounts) {
    try {
      // Get user ID from auth.users
      const { data: authUsers } = await supabase
        .from('auth.users')
        .select('id')
        .eq('email', account.email);
      
      if (authUsers && authUsers.length > 0) {
        const userId = authUsers[0].id;
        
        // Delete from public.users
        await supabase
          .from('users')
          .delete()
          .eq('id', userId);
        
        // Delete from user_preferences if exists
        await supabase
          .from('user_preferences')
          .delete()
          .eq('user_id', userId);
        
        console.log(`✅ Cleaned up data for ${account.email}`);
      }
    } catch (error) {
      console.log(`⚠️  Cleanup warning for ${account.email}:`, error.message);
    }
  }
}

/**
 * Test profile creation backup function
 */
async function testBackupProfileCreation(userId, email) {
  console.log(`\n🔧 Testing backup profile creation for ${email}...`);
  
  try {
    const { data, error } = await supabase
      .rpc('create_user_profile_from_auth', { user_id: userId });
    
    if (error) {
      console.error('❌ Backup function failed:', error.message);
      return false;
    }
    
    if (data) {
      console.log('✅ Backup profile creation successful');
      
      // Verify profile was created
      const { data: profile } = await supabase
        .from('users')
        .select('id, email, username')
        .eq('id', userId)
        .single();
      
      if (profile) {
        console.log('✅ Profile verification successful:', profile);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('❌ Backup function error:', error.message);
    return false;
  }
}

/**
 * Test user registration
 */
async function testRegistration(account) {
  console.log(`\n📝 Testing registration for ${account.email}...`);
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: account.email,
      password: account.password,
      options: {
        data: {
          username: account.username,
          full_name: account.name,
          student_id: '2024999999',
          faculty: 'COMPUTER SCIENCES',
          campus: 'SELANGOR',
          gender: 'Male',
          sport_preferences: JSON.stringify(['dd400853-7ce6-47bc-aee6-2ee241530f79']),
          available_days: JSON.stringify(['monday']),
          available_hours: JSON.stringify({ monday: ['17-19'] }),
          preferred_facilities: JSON.stringify(['5c21c6cc-dcd1-48f6-8583-fedfcb8bc98c']),
          play_style: 'casual',
          age: 25,
          birth_date: '1999-01-01'
        },
        emailRedirectTo: `${process.env.VITE_APP_URL || 'http://localhost:3000'}/auth/callback`
      }
    });
    
    if (error) {
      console.error('❌ Registration failed:', error.message);
      return null;
    }
    
    if (data.user) {
      console.log('✅ Registration successful');
      console.log('📧 Email verification required');
      
      // Wait a moment for trigger to execute
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if profile was created by trigger
      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('id', data.user.id)
        .maybeSingle();
      
      if (profile) {
        console.log('✅ Profile created automatically by trigger');
      } else {
        console.log('⚠️  Profile not created by trigger, testing backup mechanism...');
        await testBackupProfileCreation(data.user.id, account.email);
      }
      
      return data.user;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Registration error:', error.message);
    return null;
  }
}

/**
 * Test login flow
 */
async function testLogin(account) {
  console.log(`\n🔐 Testing login for ${account.email}...`);
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: account.email,
      password: account.password
    });
    
    if (error) {
      if (error.message.includes('Email not confirmed')) {
        console.log('📧 Email verification required (expected behavior)');
        return { requiresVerification: true };
      }
      console.error('❌ Login failed:', error.message);
      return null;
    }
    
    if (data.session) {
      console.log('✅ Login successful');
      
      // Check profile existence
      const { data: profile } = await supabase
        .from('users')
        .select('id, email, username')
        .eq('id', data.user.id)
        .maybeSingle();
      
      if (profile) {
        console.log('✅ User profile found:', profile);
      } else {
        console.log('⚠️  User profile not found, testing backup creation...');
        await testBackupProfileCreation(data.user.id, account.email);
      }
      
      // Sign out
      await supabase.auth.signOut();
      console.log('✅ Sign out successful');
      
      return { success: true };
    }
    
    return null;
  } catch (error) {
    console.error('❌ Login error:', error.message);
    return null;
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Starting Comprehensive Authentication Flow Tests');
  console.log('================================================');
  
  // Phase 1: Cleanup
  await cleanupTestData();
  
  // Phase 2: Test Registration and Profile Creation
  console.log('\n📋 Phase 2: Registration and Profile Creation Tests');
  console.log('---------------------------------------------------');
  
  const registrationResults = [];
  for (const account of testAccounts) {
    const user = await testRegistration(account);
    registrationResults.push({ account, user, success: !!user });
  }
  
  // Phase 3: Test Login Flow
  console.log('\n📋 Phase 3: Login Flow Tests');
  console.log('-----------------------------');
  
  const loginResults = [];
  for (const account of testAccounts) {
    const result = await testLogin(account);
    loginResults.push({ account, result });
  }
  
  // Phase 4: Summary
  console.log('\n📊 Test Results Summary');
  console.log('=======================');
  
  console.log('\n📝 Registration Results:');
  registrationResults.forEach(({ account, success }) => {
    console.log(`${success ? '✅' : '❌'} ${account.email}: ${success ? 'SUCCESS' : 'FAILED'}`);
  });
  
  console.log('\n🔐 Login Results:');
  loginResults.forEach(({ account, result }) => {
    if (result?.requiresVerification) {
      console.log(`📧 ${account.email}: REQUIRES EMAIL VERIFICATION (Expected)`);
    } else if (result?.success) {
      console.log(`✅ ${account.email}: LOGIN SUCCESS`);
    } else {
      console.log(`❌ ${account.email}: LOGIN FAILED`);
    }
  });
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Check email inboxes for verification links');
  console.log('2. Click verification links to test redirect behavior');
  console.log('3. Attempt login after email verification');
  console.log('4. Verify that users are redirected to login page (not auto-logged in)');
  
  console.log('\n✅ Test execution completed!');
}

// Run tests
runTests().catch(console.error);
