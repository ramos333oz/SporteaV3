-- Migration: Update locations table for map view
-- Description: This migration adds new columns to the locations table to support the map view functionality

-- Add supported_sports field to store which sports can be played at each location
ALTER TABLE public.locations 
  ADD COLUMN IF NOT EXISTS supported_sports UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS maps_url TEXT;

-- Comment the new columns for better documentation
COMMENT ON COLUMN public.locations.supported_sports IS 'Array of sport IDs that can be played at this location, allowing for multi-sport venues';
COMMENT ON COLUMN public.locations.maps_url IS 'Google Maps URL for the location, which can be used to extract coordinates';

-- Create an index for faster lookups by supported sports
CREATE INDEX IF NOT EXISTS idx_locations_supported_sports ON public.locations USING GIN (supported_sports); 