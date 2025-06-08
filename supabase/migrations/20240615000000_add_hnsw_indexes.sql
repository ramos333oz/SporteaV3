-- Add HNSW indexes to vector columns for improved recommendation performance
-- This migration adds Hierarchical Navigable Small World (HNSW) indexes to the vector columns
-- which drastically improves performance for nearest neighbor searches used in recommendations

-- Create HNSW index on users.preference_vector
CREATE INDEX IF NOT EXISTS users_preference_vector_hnsw_idx 
ON public.users USING hnsw (preference_vector vector_ip_ops) 
WITH (m=16, ef_construction=64);

-- Create HNSW index on matches.characteristic_vector
CREATE INDEX IF NOT EXISTS matches_characteristic_vector_hnsw_idx 
ON public.matches USING hnsw (characteristic_vector vector_ip_ops) 
WITH (m=16, ef_construction=64);

-- Note: HNSW parameters explanation
-- m: Maximum number of connections per layer (higher = better recall but more memory and slower builds)
-- ef_construction: Size of the dynamic candidate list for index building (higher = more accurate but slower builds)
-- We're using the recommended values from Supabase documentation 