$env:PATH = $env:PATH + ";C:\Program Files\nodejs"
Set-Location "C:\Users\Moussa\SporteaV3"
Write-Host "Please login to Supabase when prompted..."
npx supabase login
Write-Host "Now deploying the edge function..."
npx supabase functions deploy enhanced-weighted-recommendations --project-ref fcwwuiitsghknsvnsrxp
