import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// Define CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, X-Client-Info, Content-Type, Authorization, Accept',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

// Create Supabase client using environment variables
let supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
let supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

// Log environment variable status for debugging
console.log(`SUPABASE_URL environment variable ${supabaseUrl ? 'is set' : 'is NOT set'}`)
console.log(`SUPABASE_SERVICE_ROLE_KEY environment variable ${supabaseKey ? 'is set' : 'is NOT set (will cause auth issues)'}`)

// Fallback values for development/testing only
if (!supabaseUrl) {
  // You should set these in your Supabase dashboard > Settings > API > Edge Functions
  console.warn('⚠️ SUPABASE_URL not found, using development fallback - this should not happen in production')
  supabaseUrl = 'https://fcwwuiitsghknsvnsrxp.supabase.co' // Update this with your project URL if needed
}

if (!supabaseKey) {
  console.error('🛑 SUPABASE_SERVICE_ROLE_KEY not found - authentication will fail!')
}

/**
 * Diagnostic version of the get-recommendations Edge Function
 * This function logs detailed information about the request and validates input parameters
 */
Deno.serve(async (req) => {
  console.log('Received request to get-recommendations-diagnostic')
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request (CORS preflight)')
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }

  // Log request information
  console.log(`Request method: ${req.method}`)
  console.log(`Request URL: ${req.url}`)
  
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      console.log(`Invalid method: ${req.method} - only POST allowed`)
      return new Response(
        JSON.stringify({ 
          error: 'Method not allowed',
          expectedMethod: 'POST',
          receivedMethod: req.method
        }),
        { 
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // Validate environment variables before proceeding
    if (!supabaseUrl || !supabaseKey) {
      console.error(`Environment validation failed: URL=${!!supabaseUrl}, KEY=${!!supabaseKey}`)
      return new Response(
        JSON.stringify({
          error: 'Server configuration error',
          message: 'Missing required environment variables',
          details: {
            supabaseUrl: !!supabaseUrl,
            supabaseKey: !!supabaseKey
          },
          recommendations: [],
          type: 'error'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Log request headers for diagnostics
    const headers = {}
    req.headers.forEach((value, key) => {
      // Exclude sensitive headers
      if (!['authorization', 'apikey'].includes(key.toLowerCase())) {
        headers[key] = value
      } else {
        headers[key] = '[REDACTED]'
      }
    })
    console.log('Request headers:', JSON.stringify(headers, null, 2))
    
    // Parse request body
    let body
    try {
      // Handle both direct body and body property if it exists
      body = await req.json()
      console.log('Received raw request body:', JSON.stringify(body, null, 2))
      
      // Some Supabase SDKs nest the payload inside a body property
      if (body && body.body && typeof body.body === 'object') {
        console.log('Detected nested body structure, using body.body instead')
        body = body.body
      }
      
      // Ensure we're working with an object
      if (typeof body !== 'object' || body === null) {
        throw new Error('Request body must be a JSON object')
      }
      
      console.log('Normalized request body:', JSON.stringify(body, null, 2))
    } catch (parseError) {
      console.log('Error parsing request body:', parseError.message)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body',
          message: parseError.message,
          diagnostic: 'Expected valid JSON object with userId and limit properties',
          received: typeof req.body === 'string' ? req.body.substring(0, 100) + '...' : 'non-string body'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // Validate required parameters
    const validationErrors = []
    
    // Check if userId is present and valid
    if (!body.userId) {
      validationErrors.push('Missing required parameter: userId')
    } else if (typeof body.userId !== 'string') {
      validationErrors.push(`Invalid userId type: expected string, got ${typeof body.userId}`)
    }
    
    // Check if limit is valid if provided
    if (body.limit !== undefined) {
      const limitNum = Number(body.limit)
      if (isNaN(limitNum)) {
        validationErrors.push(`Invalid limit: not a number (${body.limit})`)
      } else if (limitNum < 1 || limitNum > 100) {
        validationErrors.push(`Invalid limit range: must be between 1 and 100, got ${limitNum}`)
      }
    }
    
    // Return validation errors if any
    if (validationErrors.length > 0) {
      console.log('Validation errors:', validationErrors)
      return new Response(
        JSON.stringify({ 
          error: 'Validation failed',
          validationErrors,
          receivedBody: body
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // Log successful validation
    console.log('Input validation passed:', {
      userId: body.userId,
      limit: body.limit || 10
    })

    // Create a supabase client for any further operations
    const supabase = createClient(supabaseUrl, supabaseKey)
    console.log('Supabase client created with URL:', supabaseUrl)
    
    // Test the Supabase connection to validate credentials
    try {
      // Simple query to verify connection works
      const { error: testError } = await supabase.from('recommendation_embeddings').select('count(*)', { count: 'exact', head: true })
      
      if (testError) {
        console.error('Supabase connection test failed:', testError)
        throw new Error(`Database connection failed: ${testError.message}`)
      }
      
      console.log('Supabase connection test successful')
    } catch (connectionError) {
      console.error('Failed to connect to Supabase:', connectionError)
      return new Response(
        JSON.stringify({
          error: 'Database connection failed',
          message: connectionError.message || 'Could not connect to the database',
          recommendations: [],
          type: 'error'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // If validation passes, return diagnostic info with mock recommendations
    return new Response(
      JSON.stringify({ 
        message: 'Diagnostic successful',
        validationStatus: 'PASSED',
        receivedParameters: {
          userId: body.userId,
          limit: body.limit || 10,
          requestTime: body.requestTime || null,
          additionalParams: Object.keys(body).filter(key => !['userId', 'limit', 'requestTime'].includes(key))
        },
        recommendations: [
          { 
            id: 'diagnostic-match-1', 
            title: 'Diagnostic Match 1',
            recommendation_type: 'diagnostic',
            explanation: 'This is a mock recommendation from the diagnostic function' 
          },
          { 
            id: 'diagnostic-match-2', 
            title: 'Diagnostic Match 2',
            recommendation_type: 'diagnostic',
            explanation: 'This is a mock recommendation from the diagnostic function' 
          }
        ],
        type: 'diagnostic',
        message: 'Diagnostic recommendations provided for testing'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    // Log error details
    console.error('Unhandled error in get-recommendations-diagnostic:', error)
    let errorMessage = error.message || 'Unknown error'
    let errorStack = error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : null
    
    // Check for common error patterns and enhance the message
    if (errorMessage.includes('authentication')) {
      errorMessage = `Authentication error - please check SUPABASE_SERVICE_ROLE_KEY: ${errorMessage}`
    } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      errorMessage = `Network/connection error - please check SUPABASE_URL: ${errorMessage}`
    }
    
    // Return error response with detailed diagnostic information
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        errorType: error.constructor.name,
        stack: errorStack,
        recommendations: [],
        type: 'error',
        message: 'Diagnostic error response',
        supabaseInfo: {
          // Safely check if environment variables are set without revealing sensitive values
          urlConfigured: !!supabaseUrl,
          urlLength: supabaseUrl ? supabaseUrl.length : 0,
          keyConfigured: !!supabaseKey,
          keyLength: supabaseKey ? supabaseKey.length : 0,
          // Include truncated values for debugging (first few chars only)
          urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 8) + '...' : 'not-set',
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
