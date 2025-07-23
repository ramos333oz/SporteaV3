// Test script to call the create-user-profile Edge Function with Omar's credentials
const testUserProfile = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  email: '2022812796@student.uitm.edu.my',
  username: 'Omar',
  full_name: 'Omar Test',
  student_id: '2022812796',
  faculty: 'Computer Science',
  campus: 'Shah Alam',
  state: 'Selangor',
  gender: 'Male',
  play_style: 'casual',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const supabaseUrl = 'https://fcwwuiitsghknsvnsrxp.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjd3d1aWl0c2doa25zdm5zcnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTYxMTU5NzQsImV4cCI6MjAzMTY5MTk3NH0.Ej_9D4FZU3z_4Kpm7pRJu8rIKfKleIpxMbyr-YoBA';

async function testEdgeFunction() {
  try {
    console.log('Testing Edge Function with data:', testUserProfile);
    
    const response = await fetch(`${supabaseUrl}/functions/v1/create-user-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify(testUserProfile),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Response body:', responseText);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${responseText}`);
    }

    const result = JSON.parse(responseText);
    console.log('Success:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

testEdgeFunction();
