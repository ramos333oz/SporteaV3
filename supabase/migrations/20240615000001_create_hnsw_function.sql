-- Create a function to find similar matches using HNSW indexing
CREATE OR REPLACE FUNCTION match_similar_vector_hnsw(
  query_embedding vector, 
  match_threshold float, 
  match_count int
)
RETURNS TABLE (
  id uuid,
  title text,
  sport_id uuid,
  host_id uuid,
  start_time timestamptz,
  skill_level text,
  status text,
  location_id uuid,
  characteristic_vector vector,
  similarity float
)
LANGUAGE plpgsql
AS $$
#variable_conflict use_variable
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.title,
    m.sport_id,
    m.host_id,
    m.start_time,
    m.skill_level,
    m.status,
    m.location_id,
    m.characteristic_vector,
    1 - (m.characteristic_vector <=> query_embedding) AS similarity
  FROM
    matches m
  WHERE 1 - (m.characteristic_vector <=> query_embedding) > match_threshold
    AND m.status = 'active'  -- Only include active matches
    AND m.start_time > NOW()  -- Only future matches
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_similar_vector_hnsw IS 'Returns matches that have similar characteristic vectors to the query_embedding using the HNSW index for improved performance'; 