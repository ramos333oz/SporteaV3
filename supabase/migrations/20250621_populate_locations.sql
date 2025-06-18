-- Migration: Populate locations table with venue data
-- Description: This migration inserts the venue data for various sports into the locations table

-- First, let's create a function to check if a location already exists to avoid duplicates
CREATE OR REPLACE FUNCTION insert_location_if_not_exists(
  p_name TEXT,
  p_coordinates JSONB,
  p_supported_sports UUID[],
  p_campus TEXT DEFAULT 'UiTM Shah Alam',
  p_address TEXT DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
  -- Check if the location already exists with the same name
  IF NOT EXISTS (SELECT 1 FROM locations WHERE name = p_name) THEN
    -- Insert the location if it doesn't exist
    INSERT INTO locations (
      name,
      campus,
      address,
      coordinates,
      supported_sports,
      image_url,
      is_verified
    ) VALUES (
      p_name,
      p_campus,
      COALESCE(p_address, p_campus || ', ' || p_name),
      p_coordinates,
      p_supported_sports,
      p_image_url,
      TRUE
    );
  ELSE
    -- Update the existing location with the new supported_sports
    UPDATE locations
    SET 
      supported_sports = 
        (SELECT array_agg(DISTINCT e) FROM (
          SELECT unnest(supported_sports || p_supported_sports) AS e
        ) AS dt),
      coordinates = p_coordinates
    WHERE name = p_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Now insert the locations with their coordinates and supported sports

-- Add missing sports
INSERT INTO sports (name, description)
VALUES 
  ('Rugby', 'Team sport played with an oval ball'),
  ('Hockey', 'Team sport played with hockey sticks and a ball'),
  ('Frisbee', 'Team sport played with a flying disc')
ON CONFLICT (name) DO NOTHING;

-- Football and Rugby (same location)
INSERT INTO locations (
  name,
  campus,
  address,
  coordinates,
  supported_sports,
  is_verified
)
VALUES (
  'Padang Pusat Sukan UiTM',
  'UiTM Shah Alam',
  'UiTM Shah Alam, Padang Pusat Sukan',
  '{"lat": 3.067482, "lng": 101.495771}',
  ARRAY[
    '4746e9c1-f772-4515-8d08-6c28563fbfc9'::UUID, -- Football
    (SELECT id FROM sports WHERE name = 'Rugby')
  ],
  TRUE
)
ON CONFLICT (name) 
DO UPDATE SET 
  coordinates = EXCLUDED.coordinates,
  supported_sports = EXCLUDED.supported_sports;

-- Basketball courts
INSERT INTO locations (
  name,
  campus,
  address,
  coordinates,
  supported_sports,
  is_verified
)
VALUES (
  'Court Pusat Sukan A (Basketball)',
  'UiTM Shah Alam',
  'UiTM Shah Alam, Court Pusat Sukan A',
  '{"lat": 3.067723, "lng": 101.497453}',
  ARRAY[
    'dd400853-7ce6-47bc-aee6-2ee241530f79'::UUID -- Basketball
  ],
  TRUE
)
ON CONFLICT (name) 
DO UPDATE SET 
  coordinates = EXCLUDED.coordinates,
  supported_sports = EXCLUDED.supported_sports;

INSERT INTO locations (
  name,
  campus,
  address,
  coordinates,
  supported_sports,
  is_verified
)
VALUES (
  'Court Pusat Sukan B (Basketball)',
  'UiTM Shah Alam',
  'UiTM Shah Alam, Court Pusat Sukan B',
  '{"lat": 3.067697, "lng": 101.497624}',
  ARRAY[
    'dd400853-7ce6-47bc-aee6-2ee241530f79'::UUID -- Basketball
  ],
  TRUE
)
ON CONFLICT (name) 
DO UPDATE SET 
  coordinates = EXCLUDED.coordinates,
  supported_sports = EXCLUDED.supported_sports;

-- Futsal courts
INSERT INTO locations (
  name,
  campus,
  address,
  coordinates,
  supported_sports,
  is_verified
)
VALUES (
  'Court Pusat Sukan A (Futsal)',
  'UiTM Shah Alam',
  'UiTM Shah Alam, Court Pusat Sukan A',
  '{"lat": 3.067217, "lng": 101.497848}',
  ARRAY[
    'd662bc78-9e50-4785-ac71-d1e591e4a9ce'::UUID -- Futsal
  ],
  TRUE
)
ON CONFLICT (name) 
DO UPDATE SET 
  coordinates = EXCLUDED.coordinates,
  supported_sports = EXCLUDED.supported_sports;

INSERT INTO locations (
  name,
  campus,
  address,
  coordinates,
  supported_sports,
  is_verified
)
VALUES (
  'Court Pusat Sukan B (Futsal)',
  'UiTM Shah Alam',
  'UiTM Shah Alam, Court Pusat Sukan B',
  '{"lat": 3.067191, "lng": 101.498044}',
  ARRAY[
    'd662bc78-9e50-4785-ac71-d1e591e4a9ce'::UUID -- Futsal
  ],
  TRUE
)
ON CONFLICT (name) 
DO UPDATE SET 
  coordinates = EXCLUDED.coordinates,
  supported_sports = EXCLUDED.supported_sports;

INSERT INTO locations (
  name,
  campus,
  address,
  coordinates,
  supported_sports,
  is_verified
)
VALUES (
  'Court Perindu A (Futsal)',
  'UiTM Shah Alam',
  'UiTM Shah Alam, Kolej Perindu',
  '{"lat": 3.066656, "lng": 101.501332}',
  ARRAY[
    'd662bc78-9e50-4785-ac71-d1e591e4a9ce'::UUID -- Futsal
  ],
  TRUE
)
ON CONFLICT (name) 
DO UPDATE SET 
  coordinates = EXCLUDED.coordinates,
  supported_sports = EXCLUDED.supported_sports;

INSERT INTO locations (
  name,
  campus,
  address,
  coordinates,
  supported_sports,
  is_verified
)
VALUES (
  'Court Perindu B (Futsal)',
  'UiTM Shah Alam',
  'UiTM Shah Alam, Kolej Perindu',
  '{"lat": 3.067772, "lng": 101.498945}',
  ARRAY[
    'd662bc78-9e50-4785-ac71-d1e591e4a9ce'::UUID -- Futsal
  ],
  TRUE
)
ON CONFLICT (name) 
DO UPDATE SET 
  coordinates = EXCLUDED.coordinates,
  supported_sports = EXCLUDED.supported_sports;

INSERT INTO locations (
  name,
  campus,
  address,
  coordinates,
  supported_sports,
  is_verified
)
VALUES (
  'Court Perindu C (Futsal)',
  'UiTM Shah Alam',
  'UiTM Shah Alam, Kolej Perindu',
  '{"lat": 3.067743, "lng": 101.498772}',
  ARRAY[
    'd662bc78-9e50-4785-ac71-d1e591e4a9ce'::UUID -- Futsal
  ],
  TRUE
)
ON CONFLICT (name) 
DO UPDATE SET 
  coordinates = EXCLUDED.coordinates,
  supported_sports = EXCLUDED.supported_sports;

-- Volleyball courts
INSERT INTO locations (
  name,
  campus,
  address,
  coordinates,
  supported_sports,
  is_verified
)
VALUES (
  'Court Pusat Sukan A (Volleyball)',
  'UiTM Shah Alam',
  'UiTM Shah Alam, Court Pusat Sukan A',
  '{"lat": 3.067816, "lng": 101.497209}',
  ARRAY[
    '66e9893a-2be7-47f0-b7d3-d7191901dd77'::UUID -- Volleyball
  ],
  TRUE
)
ON CONFLICT (name) 
DO UPDATE SET 
  coordinates = EXCLUDED.coordinates,
  supported_sports = EXCLUDED.supported_sports;

INSERT INTO locations (
  name,
  campus,
  address,
  coordinates,
  supported_sports,
  is_verified
)
VALUES (
  'Court Pusat Sukan B (Volleyball)',
  'UiTM Shah Alam',
  'UiTM Shah Alam, Court Pusat Sukan B',
  '{"lat": 3.068131, "lng": 101.497302}',
  ARRAY[
    '66e9893a-2be7-47f0-b7d3-d7191901dd77'::UUID -- Volleyball
  ],
  TRUE
)
ON CONFLICT (name) 
DO UPDATE SET 
  coordinates = EXCLUDED.coordinates,
  supported_sports = EXCLUDED.supported_sports;

INSERT INTO locations (
  name,
  campus,
  address,
  coordinates,
  supported_sports,
  is_verified
)
VALUES (
  'Court Perindu A (Volleyball)',
  'UiTM Shah Alam',
  'UiTM Shah Alam, Kolej Perindu',
  '{"lat": 3.067370, "lng": 101.498861}',
  ARRAY[
    '66e9893a-2be7-47f0-b7d3-d7191901dd77'::UUID -- Volleyball
  ],
  TRUE
)
ON CONFLICT (name) 
DO UPDATE SET 
  coordinates = EXCLUDED.coordinates,
  supported_sports = EXCLUDED.supported_sports;

INSERT INTO locations (
  name,
  campus,
  address,
  coordinates,
  supported_sports,
  is_verified
)
VALUES (
  'Court Perindu B (Volleyball)',
  'UiTM Shah Alam',
  'UiTM Shah Alam, Kolej Perindu',
  '{"lat": 3.067393, "lng": 101.498996}',
  ARRAY[
    '66e9893a-2be7-47f0-b7d3-d7191901dd77'::UUID -- Volleyball
  ],
  TRUE
)
ON CONFLICT (name) 
DO UPDATE SET 
  coordinates = EXCLUDED.coordinates,
  supported_sports = EXCLUDED.supported_sports;

-- Frisbee and Hockey (shared location)
INSERT INTO locations (
  name,
  campus,
  address,
  coordinates,
  supported_sports,
  is_verified
)
VALUES (
  'Padang Hoki Pusat Sukan',
  'UiTM Shah Alam',
  'UiTM Shah Alam, Padang Hoki Pusat Sukan',
  '{"lat": 3.067742, "lng": 101.496551}',
  ARRAY[
    (SELECT id FROM sports WHERE name = 'Frisbee'),
    (SELECT id FROM sports WHERE name = 'Hockey')
  ],
  TRUE
)
ON CONFLICT (name) 
DO UPDATE SET 
  coordinates = EXCLUDED.coordinates,
  supported_sports = EXCLUDED.supported_sports;

-- Additional Frisbee location
INSERT INTO locations (
  name,
  campus,
  address,
  coordinates,
  supported_sports,
  is_verified
)
VALUES (
  'Court Kenanga',
  'UiTM Shah Alam',
  'UiTM Shah Alam, Kolej Kenanga',
  '{"lat": 3.065437, "lng": 101.501783}',
  ARRAY[
    (SELECT id FROM sports WHERE name = 'Frisbee')
  ],
  TRUE
)
ON CONFLICT (name) 
DO UPDATE SET 
  coordinates = EXCLUDED.coordinates,
  supported_sports = EXCLUDED.supported_sports;

-- Clean up
DROP FUNCTION IF EXISTS insert_location_if_not_exists; 