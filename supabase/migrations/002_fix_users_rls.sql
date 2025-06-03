-- Fix RLS policies for users table to allow user creation
-- This migration adds a policy that allows users to create their own profile

-- First, check if the policy already exists and drop it if it does
DROP POLICY IF EXISTS "Users can create their own profile" ON users;

-- Create a policy that allows users to insert their own profile
CREATE POLICY "Users can create their own profile" ON users 
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Verify existing policies
COMMENT ON TABLE users IS 'User profiles with RLS policies:
- SELECT: Authenticated users can view all profiles
- INSERT: Authenticated users can create their own profile
- UPDATE: Users can update only their own profile';
