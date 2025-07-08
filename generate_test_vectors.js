// Script to generate vectors for test matches
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fcwwuiitsghknsvnsrxp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjd3d1aWl0c2doa25zdm5zcnhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NjE0NzQsImV4cCI6MjA1MDUzNzQ3NH0.Ej8Ky8Ej8Ky8Ej8Ky8Ej8Ky8Ej8Ky8Ej8Ky8Ej8Ky8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function generateVectors() {
  console.log('Generating vectors for test matches...')
  
  try {
    const { data, error } = await supabase.functions.invoke('generate-match-embeddings', {
      body: { batchMode: true }
    })

    if (error) {
      console.error('Error:', error)
      return
    }

    console.log('Vector generation result:', data)
  } catch (err) {
    console.error('Unexpected error:', err)
  }
}

generateVectors()
