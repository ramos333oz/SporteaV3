// This file provides explicit declarations for Deno types
// Import this file in each edge function to ensure Deno types are available

// Re-export the Deno namespace from the global scope
// This is a workaround for TypeScript not recognizing Deno globally
export const { serve, env } = Deno;

// Export common types
export type ServeHandler = (request: Request) => Response | Promise<Response>;

// Helper function to access environment variables safely
export function getEnv(key: string): string {
  const value = Deno.env.get(key);
  if (value === undefined) {
    console.warn(`Environment variable ${key} is not set`);
    return '';
  }
  return value;
} 