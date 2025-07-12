-- Sport-Specific Weighted Cosine Similarity Function Implementation
-- Fixes the issue where sport preference changes affect all recommendations
-- Ensures sport-specific changes only affect the relevant sport's recommendation

CREATE OR REPLACE FUNCTION calculate_sport_specific_weighted_cosine_similarity(
    user_id_param UUID,
    match_vector_param vector(384)
) RETURNS FLOAT AS $$
DECLARE
    user_vector vector(384);
    similarity_result FLOAT := 0;
    calculation_start_time TIMESTAMP;
    calculation_end_time TIMESTAMP;
    
    -- Sport detection variables
    target_sport_name TEXT := 'unknown';
    target_sport_start_dim INTEGER := 0;
    target_sport_end_dim INTEGER := 9;
    
    -- Weighted similarity calculation variables
    weighted_dot_product FLOAT := 0;
    weighted_norm_user FLOAT := 0;
    weighted_norm_match FLOAT := 0;
    
    -- Dimension weights based on design specifications
    sports_weight FLOAT := 0.35;      -- 35% weight for target sport
    faculty_weight FLOAT := 0.25;     -- 25% weight for faculty
    skill_weight FLOAT := 0.20;       -- 20% weight for skill level
    enhanced_weight FLOAT := 0.15;    -- 15% weight for enhanced attributes
    venues_weight FLOAT := 0.03;      -- 3% weight for venues/facilities
    duration_weight FLOAT := 0.01;    -- 1% weight for duration
    playstyle_weight FLOAT := 0.01;   -- 1% weight for play style
    
    -- Debug variables
    sport_contribution FLOAT := 0;
    faculty_contribution FLOAT := 0;
    skill_contribution FLOAT := 0;
    enhanced_contribution FLOAT := 0;
    venues_contribution FLOAT := 0;
    duration_contribution FLOAT := 0;
    playstyle_contribution FLOAT := 0;
    
    i INTEGER;
    weight FLOAT;
    user_val FLOAT;
    match_val FLOAT;
BEGIN
    calculation_start_time := clock_timestamp();

    -- Get user preference vector
    SELECT preference_vector INTO user_vector
    FROM users
    WHERE id = user_id_param;

    -- Handle missing user vector
    IF user_vector IS NULL THEN
        RAISE NOTICE 'SPORT_SPECIFIC_WEIGHTED: User vector not found for user_id: %', user_id_param;
        RETURN 0;
    END IF;

    -- STEP 1: Detect target sport from match vector
    -- Check which sport dimensions (0-109) have the highest values
    DECLARE
        max_sport_value FLOAT := 0;
        current_sport_value FLOAT;
        sport_mappings TEXT[] := ARRAY[
            'football',     -- 0-9
            'basketball',   -- 10-19  
            'volleyball',   -- 20-29
            'badminton',    -- 30-39
            'tennis',       -- 40-49
            'table_tennis', -- 50-59
            'futsal',       -- 60-69
            'frisbee',      -- 70-79
            'hockey',       -- 80-89
            'rugby',        -- 90-99
            'squash'        -- 100-109
        ];
        sport_idx INTEGER;
    BEGIN
        FOR sport_idx IN 1..11 LOOP
            current_sport_value := 0;
            -- Sum the 10 dimensions for this sport
            FOR i IN ((sport_idx-1)*10)..((sport_idx-1)*10 + 9) LOOP
                current_sport_value := current_sport_value + match_vector_param[i+1]; -- pgvector is 1-indexed
            END LOOP;
            
            IF current_sport_value > max_sport_value THEN
                max_sport_value := current_sport_value;
                target_sport_name := sport_mappings[sport_idx];
                target_sport_start_dim := (sport_idx-1) * 10;
                target_sport_end_dim := target_sport_start_dim + 9;
            END IF;
        END LOOP;
    END;

    RAISE NOTICE 'SPORT_SPECIFIC: Detected target sport: % (dimensions %-%)', 
        target_sport_name, target_sport_start_dim, target_sport_end_dim;

    -- STEP 2: Calculate sport-specific weighted cosine similarity
    
    -- TARGET SPORT DIMENSIONS (35% weight) - Only for the detected sport
    FOR i IN target_sport_start_dim..target_sport_end_dim LOOP
        weight := sports_weight;
        user_val := user_vector[i+1]; -- pgvector is 1-indexed
        match_val := match_vector_param[i+1];
        
        weighted_dot_product := weighted_dot_product + (weight * user_val * match_val);
        weighted_norm_user := weighted_norm_user + (weight * user_val * user_val);
        weighted_norm_match := weighted_norm_match + (weight * match_val * match_val);
        sport_contribution := sport_contribution + (weight * user_val * match_val);
    END LOOP;

    -- SKILL LEVEL DIMENSIONS (110-149): 20% weight - Shared across all sports
    FOR i IN 110..149 LOOP
        weight := skill_weight;
        user_val := user_vector[i+1];
        match_val := match_vector_param[i+1];
        
        weighted_dot_product := weighted_dot_product + (weight * user_val * match_val);
        weighted_norm_user := weighted_norm_user + (weight * user_val * user_val);
        weighted_norm_match := weighted_norm_match + (weight * match_val * match_val);
        skill_contribution := skill_contribution + (weight * user_val * match_val);
    END LOOP;

    -- PLAY STYLE DIMENSIONS (150-169): 1% weight - Shared across all sports
    FOR i IN 150..169 LOOP
        weight := playstyle_weight;
        user_val := user_vector[i+1];
        match_val := match_vector_param[i+1];
        
        weighted_dot_product := weighted_dot_product + (weight * user_val * match_val);
        weighted_norm_user := weighted_norm_user + (weight * user_val * user_val);
        weighted_norm_match := weighted_norm_match + (weight * match_val * match_val);
        playstyle_contribution := playstyle_contribution + (weight * user_val * match_val);
    END LOOP;

    -- FACULTY DIMENSIONS (170-239): 25% weight - Shared across all sports
    FOR i IN 170..239 LOOP
        weight := faculty_weight;
        user_val := user_vector[i+1];
        match_val := match_vector_param[i+1];
        
        weighted_dot_product := weighted_dot_product + (weight * user_val * match_val);
        weighted_norm_user := weighted_norm_user + (weight * user_val * user_val);
        weighted_norm_match := weighted_norm_match + (weight * match_val * match_val);
        faculty_contribution := faculty_contribution + (weight * user_val * match_val);
    END LOOP;

    -- DURATION DIMENSIONS (240-259): 1% weight - Shared across all sports
    FOR i IN 240..259 LOOP
        weight := duration_weight;
        user_val := user_vector[i+1];
        match_val := match_vector_param[i+1];
        
        weighted_dot_product := weighted_dot_product + (weight * user_val * match_val);
        weighted_norm_user := weighted_norm_user + (weight * user_val * user_val);
        weighted_norm_match := weighted_norm_match + (weight * match_val * match_val);
        duration_contribution := duration_contribution + (weight * user_val * match_val);
    END LOOP;

    -- VENUES/FACILITIES DIMENSIONS (260-349): 3% weight - Shared across all sports
    FOR i IN 260..349 LOOP
        weight := venues_weight;
        user_val := user_vector[i+1];
        match_val := match_vector_param[i+1];
        
        weighted_dot_product := weighted_dot_product + (weight * user_val * match_val);
        weighted_norm_user := weighted_norm_user + (weight * user_val * user_val);
        weighted_norm_match := weighted_norm_match + (weight * match_val * match_val);
        venues_contribution := venues_contribution + (weight * user_val * match_val);
    END LOOP;

    -- ENHANCED ATTRIBUTES DIMENSIONS (350-383): 15% weight - Shared across all sports
    FOR i IN 350..383 LOOP
        weight := enhanced_weight;
        user_val := user_vector[i+1];
        match_val := match_vector_param[i+1];
        
        weighted_dot_product := weighted_dot_product + (weight * user_val * match_val);
        weighted_norm_user := weighted_norm_user + (weight * user_val * user_val);
        weighted_norm_match := weighted_norm_match + (weight * match_val * match_val);
        enhanced_contribution := enhanced_contribution + (weight * user_val * match_val);
    END LOOP;

    -- STEP 3: Calculate final weighted cosine similarity
    IF weighted_norm_user > 0 AND weighted_norm_match > 0 THEN
        similarity_result := weighted_dot_product / (SQRT(weighted_norm_user) * SQRT(weighted_norm_match));
    ELSE
        similarity_result := 0;
    END IF;

    -- Ensure result is between 0 and 1
    similarity_result := GREATEST(0, LEAST(1, similarity_result));

    calculation_end_time := clock_timestamp();

    -- Log detailed calculation for debugging and verification
    RAISE NOTICE 'SPORT_SPECIFIC_WEIGHTED: Sport: % (%), Faculty: %, Skill: %, Enhanced: %, Venues: %, Duration: %, PlayStyle: %, Final: %, Time: %.3f ms',
        target_sport_name,
        sport_contribution,
        faculty_contribution,
        skill_contribution,
        enhanced_contribution,
        venues_contribution,
        duration_contribution,
        playstyle_contribution,
        similarity_result,
        EXTRACT(MILLISECONDS FROM calculation_end_time - calculation_start_time);

    RETURN similarity_result;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION calculate_sport_specific_weighted_cosine_similarity(UUID, vector) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_sport_specific_weighted_cosine_similarity(UUID, vector) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION calculate_sport_specific_weighted_cosine_similarity IS 
'Implements sport-specific weighted cosine similarity where sport preference changes only affect the relevant sport.
Detects target sport from match vector and applies weights: Sports(35%), Faculty(25%), Skill(20%), Enhanced(15%), Venues(3%), Duration(1%), PlayStyle(1%).
Ensures Football preference changes only affect Football recommendations, not Basketball or Badminton.';
