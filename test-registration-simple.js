// Simple test to verify Edge Function works with proper auth user ID
const supabaseUrl = 'https://fcwwuiitsghknsvnsrxp.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjd3d1aWl0c2doa25zdm5zcnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTYxMTU5NzQsImV4cCI6MjAzMTY5MTk3NH0.Ej_9D4FZU3z_4Kpm7pRJu8rIKfKleIpxMbyr-YoBA';

async function testWithExistingUser() {
  try {
    console.log('=== Testing Edge Function with existing auth user ===');
    
    // Use the existing test user ID that we know works
    const existingUserId = '6868863d-fc05-4dba-9cef-78af34a82e67';
    
    const userProfile = {
      id: existingUserId,
      email: 'omar-test@student.uitm.edu.my',
      username: 'OmarTest',
      full_name: 'Omar Test User',
      student_id: '2022812796',
      faculty: 'Computer Science',
      campus: 'Shah Alam',
      gender: 'Male',
      play_style: 'casual',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Calling Edge Function with data:', userProfile);

    const response = await fetch(`${supabaseUrl}/functions/v1/create-user-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify(userProfile),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Response body:', responseText);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${responseText}`);
    }

    const result = JSON.parse(responseText);
    console.log('\n✅ Edge Function test successful!');
    console.log('Result:', result);

  } catch (error) {
    console.error('\n❌ Edge Function test failed:', error);
  }
}

testWithExistingUser();
