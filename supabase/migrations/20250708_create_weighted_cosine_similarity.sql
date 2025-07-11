-- Enhanced Weighted Cosine Similarity Function for 90-100% Similarity Targets
-- Replaces standard cosine similarity with attribute-weighted calculation
-- Implementation Date: 2025-07-08
-- Target: 90-100% similarity for perfect attribute matches

CREATE OR REPLACE FUNCTION calculate_weighted_cosine_similarity(
    user_id_param UUID,
    match_vector_param vector(384)
) RETURNS FLOAT AS $$
DECLARE
    user_vector vector(384);
    weighted_dot_product FLOAT := 0;
    weighted_norm_user FLOAT := 0;
    weighted_norm_match FLOAT := 0;
    similarity_result FLOAT := 0;
    i INTEGER;
    weight FLOAT;
    calculation_start_time TIMESTAMP;
    calculation_end_time TIMESTAMP;
BEGIN
    calculation_start_time := clock_timestamp();
    
    -- Get user preference vector
    SELECT preference_vector INTO user_vector 
    FROM users 
    WHERE id = user_id_param;
    
    -- Handle missing user vector
    IF user_vector IS NULL THEN
        RAISE NOTICE 'User vector not found for user_id: %', user_id_param;
        RETURN 0;
    END IF;
    
    -- Calculate weighted cosine similarity with attribute-specific weights
    -- Based on database-verified enhanced vector schema
    
    -- Sports (dimensions 1-110): Weight 35% - Most critical for sports matching
    FOR i IN 1..110 LOOP
        weight := 0.35;
        weighted_dot_product := weighted_dot_product + 
            (user_vector[i] * match_vector_param[i] * weight);
        weighted_norm_user := weighted_norm_user + 
            (user_vector[i] * user_vector[i] * weight);
        weighted_norm_match := weighted_norm_match + 
            (match_vector_param[i] * match_vector_param[i] * weight);
    END LOOP;
    
    -- Skill Level (dimensions 111-150): Weight 20% - Critical for match quality
    FOR i IN 111..150 LOOP
        weight := 0.20;
        weighted_dot_product := weighted_dot_product + 
            (user_vector[i] * match_vector_param[i] * weight);
        weighted_norm_user := weighted_norm_user + 
            (user_vector[i] * user_vector[i] * weight);
        weighted_norm_match := weighted_norm_match + 
            (match_vector_param[i] * match_vector_param[i] * weight);
    END LOOP;
    
    -- Play Style (dimensions 151-170): Weight 1% - Minimal impact
    FOR i IN 151..170 LOOP
        weight := 0.01;
        weighted_dot_product := weighted_dot_product + 
            (user_vector[i] * match_vector_param[i] * weight);
        weighted_norm_user := weighted_norm_user + 
            (user_vector[i] * user_vector[i] * weight);
        weighted_norm_match := weighted_norm_match + 
            (match_vector_param[i] * match_vector_param[i] * weight);
    END LOOP;
    
    -- Faculty (dimensions 171-240): Weight 25% - High UiTM relevance
    FOR i IN 171..240 LOOP
        weight := 0.25;
        weighted_dot_product := weighted_dot_product + 
            (user_vector[i] * match_vector_param[i] * weight);
        weighted_norm_user := weighted_norm_user + 
            (user_vector[i] * user_vector[i] * weight);
        weighted_norm_match := weighted_norm_match + 
            (match_vector_param[i] * match_vector_param[i] * weight);
    END LOOP;
    
    -- Duration (dimensions 241-260): Weight 1% - Less critical
    FOR i IN 241..260 LOOP
        weight := 0.01;
        weighted_dot_product := weighted_dot_product + 
            (user_vector[i] * match_vector_param[i] * weight);
        weighted_norm_user := weighted_norm_user + 
            (user_vector[i] * user_vector[i] * weight);
        weighted_norm_match := weighted_norm_match + 
            (match_vector_param[i] * match_vector_param[i] * weight);
    END LOOP;
    
    -- Venues (dimensions 261-350): Weight 3% - Location preference
    FOR i IN 261..350 LOOP
        weight := 0.03;
        weighted_dot_product := weighted_dot_product + 
            (user_vector[i] * match_vector_param[i] * weight);
        weighted_norm_user := weighted_norm_user + 
            (user_vector[i] * user_vector[i] * weight);
        weighted_norm_match := weighted_norm_match + 
            (match_vector_param[i] * match_vector_param[i] * weight);
    END LOOP;
    
    -- Enhanced Attributes (dimensions 351-384): Weight 15% - Gender/age/schedule
    FOR i IN 351..384 LOOP
        weight := 0.15;
        weighted_dot_product := weighted_dot_product + 
            (user_vector[i] * match_vector_param[i] * weight);
        weighted_norm_user := weighted_norm_user + 
            (user_vector[i] * user_vector[i] * weight);
        weighted_norm_match := weighted_norm_match + 
            (match_vector_param[i] * match_vector_param[i] * weight);
    END LOOP;
    
    -- Calculate final weighted cosine similarity
    IF weighted_norm_user > 0 AND weighted_norm_match > 0 THEN
        similarity_result := weighted_dot_product / 
            (SQRT(weighted_norm_user) * SQRT(weighted_norm_match));
    ELSE
        similarity_result := 0;
    END IF;
    
    -- Ensure result is between 0 and 1
    similarity_result := GREATEST(0, LEAST(1, similarity_result));
    
    calculation_end_time := clock_timestamp();
    
    -- Log calculation performance for academic verification
    RAISE NOTICE 'Weighted cosine similarity calculated: % (%.3f ms)', 
        similarity_result, 
        EXTRACT(MILLISECONDS FROM calculation_end_time - calculation_start_time);
    
    RETURN similarity_result;
END;
$$ LANGUAGE plpgsql;

-- Create index for performance optimization
CREATE INDEX IF NOT EXISTS idx_users_preference_vector_weighted 
ON users USING ivfflat (preference_vector vector_cosine_ops) 
WITH (lists = 100);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION calculate_weighted_cosine_similarity(UUID, vector) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_weighted_cosine_similarity(UUID, vector) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION calculate_weighted_cosine_similarity(UUID, vector) IS 
'Enhanced weighted cosine similarity function targeting 90-100% similarity for perfect attribute matches. 
Uses attribute-specific weights: Sports 35%, Faculty 25%, Skill 20%, Enhanced 15%, Venues 3%, Duration 1%, Play Style 1%.
Replaces standard cosine similarity for improved accuracy in sports match recommendations.';
