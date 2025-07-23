// Test script to simulate full registration flow for Omar
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fcwwuiitsghknsvnsrxp.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjd3d1aWl0c2doa25zdm5zcnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTYxMTU5NzQsImV4cCI6MjAzMTY5MTk3NH0.Ej_9D4FZU3z_4Kpm7pRJu8rIKfKleIpxMbyr-YoBA';

const supabase = createClient(supabaseUrl, anonKey);

async function testFullRegistration() {
  try {
    console.log('=== Testing Full Registration Flow for Omar ===');
    
    // Step 1: Create auth user
    console.log('\n1. Creating auth user...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: '2022812796@student.uitm.edu.my',
      password: 'Ulalala@369',
      options: {
        data: {
          full_name: 'Omar Test',
          username: 'Omar',
          student_id: '2022812796'
        }
      }
    });

    if (authError) {
      console.error('Auth signup error:', authError);
      return;
    }

    console.log('Auth user created successfully:', {
      id: authData.user?.id,
      email: authData.user?.email
    });

    if (!authData.user) {
      console.error('No user data returned from auth signup');
      return;
    }

    // Step 2: Call Edge Function to create profile
    console.log('\n2. Calling Edge Function to create user profile...');
    
    const userProfile = {
      id: authData.user.id,
      email: authData.user.email,
      username: 'Omar',
      full_name: 'Omar Test',
      student_id: '2022812796',
      faculty: 'Computer Science',
      campus: 'Shah Alam',
      gender: 'Male',
      play_style: 'casual',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const response = await fetch(`${supabaseUrl}/functions/v1/create-user-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify(userProfile),
    });

    console.log('Edge Function response status:', response.status);

    const responseText = await response.text();
    console.log('Edge Function response:', responseText);

    if (!response.ok) {
      throw new Error(`Edge Function failed: ${response.status} - ${responseText}`);
    }

    const result = JSON.parse(responseText);
    console.log('\n✅ Registration completed successfully!');
    console.log('User profile:', result.user);
    console.log('Gamification record:', result.gamification);

    // Step 3: Verify data in database
    console.log('\n3. Verifying data in database...');
    
    // Check user profile
    const { data: userCheck } = await supabase
      .from('users')
      .select('id, email, username, full_name, student_id')
      .eq('id', authData.user.id)
      .single();
    
    console.log('User profile in database:', userCheck);

    // Check gamification record
    const { data: gamificationCheck } = await supabase
      .from('user_gamification')
      .select('user_id, total_xp, current_level')
      .eq('user_id', authData.user.id)
      .single();
    
    console.log('Gamification record in database:', gamificationCheck);

    console.log('\n🎉 Full registration test completed successfully!');

  } catch (error) {
    console.error('\n❌ Registration test failed:', error);
  }
}

testFullRegistration();
