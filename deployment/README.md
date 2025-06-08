# Manual Edge Function Deployment Instructions

Since Docker Desktop isn't available for automated deployment, follow these steps to manually deploy the updated `get-recommendations-diagnostic` function to Supabase:

## Option 1: Supabase Dashboard

1. Log into the [Supabase Dashboard](https://app.supabase.io/)
2. Select your project (ID: `fcwwuiitsghknsvnsrxp`)
3. Navigate to **Edge Functions** in the sidebar
4. Find the `get-recommendations-diagnostic` function and click on it
5. Click **Edit** or **Deploy New Version**
6. Copy and paste the contents of the `index.ts` file from this directory
7. Click **Deploy**

## Option 2: Use a Machine with Docker Installed

If you have access to a machine with Docker Desktop installed:

```bash
# Clone your repository or copy the files
git clone <your-repo-url>

# Navigate to your project
cd SporteaV3

# Login to Supabase CLI (if not already logged in)
npx supabase login

# Deploy the function
npx supabase functions deploy get-recommendations-diagnostic --project-ref fcwwuiitsghknsvnsrxp
```

## Verification Steps After Deployment

1. Check the function status in the Supabase Dashboard 
2. Test the endpoint directly with a simple request:

```javascript
// You can run this in your browser console on your app
fetch('https://fcwwuiitsghknsvnsrxp.supabase.co/functions/v1/get-recommendations-diagnostic', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_ANON_KEY' // Replace with your anon key
  },
  body: JSON.stringify({
    userId: 'test-user-id',
    limit: 3
  })
})
.then(response => {
  console.log('Status:', response.status);
  return response.json();
})
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

## Environmental Variables Check

Make sure the following environment variables are properly set in the Supabase Dashboard:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

To check this:
1. Go to the Supabase Dashboard
2. Navigate to Project Settings > API 
3. Verify the values are correct and accessible by the edge function

## Troubleshooting

If the function returns 500 errors after deployment:
1. Check the function logs in the Supabase Dashboard
2. Verify environment variables are correctly set
3. Consider enabling the DEBUG=true query parameter for more detailed error information
