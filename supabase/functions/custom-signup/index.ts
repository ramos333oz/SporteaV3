import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors, parseRequestBody, errorResponse, successResponse } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Create Supabase client with service role key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Allowed domains for testing
const ALLOWED_DOMAINS = [
  '@student.uitm.edu.my',
  '@example.com',
  '@test.local',
  '@mailhog.example',
  '@gmail.com',
  '@outlook.com',
  '@yahoo.com',
  '@hotmail.com'
]

function isValidEmailDomain(email: string): boolean {
  if (!email || !email.trim()) return false
  return ALLOWED_DOMAINS.some(domain => email.toLowerCase().endsWith(domain))
}

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405)
    }

    const body = await parseRequestBody(req)
    const { email, password, userData } = body

    // Validate required fields
    if (!email || !password) {
      return errorResponse('Email and password are required', 400)
    }

    // Validate email domain
    if (!isValidEmailDomain(email)) {
      return errorResponse(`Email domain not allowed. Allowed domains: ${ALLOWED_DOMAINS.join(', ')}`, 400)
    }

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('email')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (checkError) {
      console.error('Error checking existing user:', checkError)
      return errorResponse('Error checking user existence', 500)
    }

    if (existingUser) {
      return errorResponse('User with this email already exists', 409)
    }

    // For test domains, create user directly without email confirmation
    const isTestDomain = email.includes('@mailhog.example') || 
                        email.includes('@example.com') || 
                        email.includes('@test.local')

    if (isTestDomain) {
      // For test domains, use normal signup flow but with custom SMTP settings
      // This allows testing the full email verification flow with MailHog
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
          emailRedirectTo: `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'vercel.app') || 'http://localhost:3000'}/auth/callback`
        }
      })

      if (authError) {
        console.error('Auth signup error for test domain:', authError)
        return errorResponse(`Authentication error: ${authError.message}`, 400)
      }

      return successResponse({
        user: authData.user,
        message: 'User created successfully. Please check MailHog (http://localhost:8025) for the verification email.'
      })
    } else {
      // For real domains, use normal signup flow
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      })

      if (authError) {
        console.error('Auth signup error:', authError)
        return errorResponse(`Authentication error: ${authError.message}`, 400)
      }

      return successResponse({
        user: authData.user,
        message: 'User created successfully. Please check your email for confirmation.'
      })
    }

  } catch (error) {
    console.error('Unexpected error:', error)
    return errorResponse('Internal server error', 500)
  }
})
