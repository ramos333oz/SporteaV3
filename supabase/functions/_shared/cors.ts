// Shared CORS utilities for Edge Functions
import { getEnv } from './deno_types.ts';

// Define CORS headers to be used across edge functions
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, Content-Type, Authorization, x-client-info, X-Debug-Request-ID, Accept',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Handle OPTIONS requests for CORS preflight
export function handleCors(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}

// Helper function for database calls
export async function queryDatabase(endpoint: string, options: any = {}) {
  const url = `${getEnv('SUPABASE_URL')}${endpoint}`;
  const headers = {
    'apikey': getEnv('SUPABASE_ANON_KEY'),
    'Authorization': `Bearer ${getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_ANON_KEY')}`,
    'Content-Type': 'application/json',
    ...options.headers
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Database query failed: ${response.status} ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error in database query to ${endpoint}:`, error);
    throw error;
  }
}

// Helper function to create a JSON response with CORS headers
export function jsonResponse(data: any, status = 200) {
  return new Response(
    JSON.stringify(data),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status 
    }
  );
}

// Helper function to create an error response with CORS headers
export function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

// Helper function to create a success response with CORS headers
export function successResponse(data: any) {
  return jsonResponse({ 
    success: true,
    ...data
  });
}

// Helper function to parse request body with error handling
export async function parseRequestBody(req: Request) {
  try {
    return await req.json();
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }
}
