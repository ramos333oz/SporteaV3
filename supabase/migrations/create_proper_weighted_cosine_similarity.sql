-- Proper Weighted Cosine Similarity Function Implementation
-- Matches the design specifications from 4_Weighted_Cosine_Similarity_Implementation.md
-- Target: 90-100% similarity for perfect attribute matches with correct dimension weights

CREATE OR REPLACE FUNCTION calculate_proper_weighted_cosine_similarity(
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
    
    -- Debug variables for attribute group analysis
    sports_contribution FLOAT := 0;
    faculty_contribution FLOAT := 0;
    skill_contribution FLOAT := 0;
    enhanced_contribution FLOAT := 0;
    venues_contribution FLOAT := 0;
    duration_contribution FLOAT := 0;
    playstyle_contribution FLOAT := 0;
BEGIN
    calculation_start_time := clock_timestamp();

    -- Get user preference vector
    SELECT preference_vector INTO user_vector
    FROM users
    WHERE id = user_id_param;

    -- Handle missing user vector
    IF user_vector IS NULL THEN
        RAISE NOTICE 'PROPER_WEIGHTED: User vector not found for user_id: %', user_id_param;
        RETURN 0;
    END IF;

    -- Calculate weighted cosine similarity with EXACT design specification weights
    -- Based on 4_Weighted_Cosine_Similarity_Implementation.md

    -- SPORTS (dimensions 1-110): Weight 35% - Most critical for sports matching
    FOR i IN 1..110 LOOP
        weight := 0.35;
        weighted_dot_product := weighted_dot_product +
            (user_vector[i] * match_vector_param[i] * weight);
        weighted_norm_user := weighted_norm_user +
            (user_vector[i] * user_vector[i] * weight);
        weighted_norm_match := weighted_norm_match +
            (match_vector_param[i] * match_vector_param[i] * weight);
        sports_contribution := sports_contribution + (user_vector[i] * match_vector_param[i] * weight);
    END LOOP;

    -- SKILL LEVEL (dimensions 111-150): Weight 20% - Critical for match quality
    FOR i IN 111..150 LOOP
        weight := 0.20;
        weighted_dot_product := weighted_dot_product +
            (user_vector[i] * match_vector_param[i] * weight);
        weighted_norm_user := weighted_norm_user +
            (user_vector[i] * user_vector[i] * weight);
        weighted_norm_match := weighted_norm_match +
            (match_vector_param[i] * match_vector_param[i] * weight);
        skill_contribution := skill_contribution + (user_vector[i] * match_vector_param[i] * weight);
    END LOOP;

    -- PLAY STYLE (dimensions 151-170): Weight 1% - Minimal impact
    FOR i IN 151..170 LOOP
        weight := 0.01;
        weighted_dot_product := weighted_dot_product +
            (user_vector[i] * match_vector_param[i] * weight);
        weighted_norm_user := weighted_norm_user +
            (user_vector[i] * user_vector[i] * weight);
        weighted_norm_match := weighted_norm_match +
            (match_vector_param[i] * match_vector_param[i] * weight);
        playstyle_contribution := playstyle_contribution + (user_vector[i] * match_vector_param[i] * weight);
    END LOOP;

    -- FACULTY (dimensions 171-240): Weight 25% - High UiTM relevance
    FOR i IN 171..240 LOOP
        weight := 0.25;
        weighted_dot_product := weighted_dot_product +
            (user_vector[i] * match_vector_param[i] * weight);
        weighted_norm_user := weighted_norm_user +
            (user_vector[i] * user_vector[i] * weight);
        weighted_norm_match := weighted_norm_match +
            (match_vector_param[i] * match_vector_param[i] * weight);
        faculty_contribution := faculty_contribution + (user_vector[i] * match_vector_param[i] * weight);
    END LOOP;

    -- DURATION (dimensions 241-260): Weight 1% - Less critical
    FOR i IN 241..260 LOOP
        weight := 0.01;
        weighted_dot_product := weighted_dot_product +
            (user_vector[i] * match_vector_param[i] * weight);
        weighted_norm_user := weighted_norm_user +
            (user_vector[i] * user_vector[i] * weight);
        weighted_norm_match := weighted_norm_match +
            (match_vector_param[i] * match_vector_param[i] * weight);
        duration_contribution := duration_contribution + (user_vector[i] * match_vector_param[i] * weight);
    END LOOP;

    -- VENUES/FACILITIES (dimensions 261-350): Weight 3% - Location preference
    FOR i IN 261..350 LOOP
        weight := 0.03;
        weighted_dot_product := weighted_dot_product +
            (user_vector[i] * match_vector_param[i] * weight);
        weighted_norm_user := weighted_norm_user +
            (user_vector[i] * user_vector[i] * weight);
        weighted_norm_match := weighted_norm_match +
            (match_vector_param[i] * match_vector_param[i] * weight);
        venues_contribution := venues_contribution + (user_vector[i] * match_vector_param[i] * weight);
    END LOOP;

    -- ENHANCED ATTRIBUTES (dimensions 351-384): Weight 15% - Gender/age/schedule
    FOR i IN 351..384 LOOP
        weight := 0.15;
        weighted_dot_product := weighted_dot_product +
            (user_vector[i] * match_vector_param[i] * weight);
        weighted_norm_user := weighted_norm_user +
            (user_vector[i] * user_vector[i] * weight);
        weighted_norm_match := weighted_norm_match +
            (match_vector_param[i] * match_vector_param[i] * weight);
        enhanced_contribution := enhanced_contribution + (user_vector[i] * match_vector_param[i] * weight);
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

    -- Log detailed calculation for academic verification and debugging
    RAISE NOTICE 'PROPER_WEIGHTED_COSINE: Final: %, Sports: %, Faculty: %, Skill: %, Enhanced: %, Venues: %, Duration: %, PlayStyle: %, Time: %.3f ms',
        similarity_result,
        sports_contribution,
        faculty_contribution,
        skill_contribution,
        enhanced_contribution,
        venues_contribution,
        duration_contribution,
        playstyle_contribution,
        EXTRACT(MILLISECONDS FROM calculation_end_time - calculation_start_time);

    RETURN similarity_result;
END;
$$ LANGUAGE plpgsql;

-- Create index for performance optimization
CREATE INDEX IF NOT EXISTS idx_users_preference_vector_proper_weighted
ON users USING ivfflat (preference_vector vector_cosine_ops)
WITH (lists = 100);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION calculate_proper_weighted_cosine_similarity(UUID, vector) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_proper_weighted_cosine_similarity(UUID, vector) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION calculate_proper_weighted_cosine_similarity IS 
'Implements proper weighted cosine similarity as per design specifications. 
Weights: Sports(35%), Faculty(25%), Skill(20%), Enhanced(15%), Venues(3%), Duration(1%), PlayStyle(1%).
Target: 90-100% similarity for perfect attribute matches with mathematically correct dimension weighting.';
