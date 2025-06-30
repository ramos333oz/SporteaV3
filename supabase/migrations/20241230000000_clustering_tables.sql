-- Create user_clusters table for storing individual user cluster assignments
CREATE TABLE IF NOT EXISTS user_clusters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cluster_id INTEGER NOT NULL,
  cluster_label VARCHAR(50),
  distance_to_centroid FLOAT DEFAULT 0,
  feature_vector FLOAT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one cluster assignment per user
  CONSTRAINT unique_user_cluster UNIQUE(user_id)
);

-- Create cluster_profiles table for storing cluster metadata and characteristics
CREATE TABLE IF NOT EXISTS cluster_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cluster_id INTEGER NOT NULL,
  cluster_label VARCHAR(50) NOT NULL,
  centroid FLOAT[] NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  characteristics JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique cluster IDs per analysis run
  CONSTRAINT unique_cluster_id UNIQUE(cluster_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_clusters_user_id ON user_clusters(user_id);
CREATE INDEX IF NOT EXISTS idx_user_clusters_cluster_id ON user_clusters(cluster_id);
CREATE INDEX IF NOT EXISTS idx_user_clusters_created_at ON user_clusters(created_at);

CREATE INDEX IF NOT EXISTS idx_cluster_profiles_cluster_id ON cluster_profiles(cluster_id);
CREATE INDEX IF NOT EXISTS idx_cluster_profiles_created_at ON cluster_profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_cluster_profiles_size ON cluster_profiles(size);

-- Enable Row Level Security
ALTER TABLE user_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE cluster_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_clusters
CREATE POLICY "Users can view their own cluster assignment"
  ON user_clusters
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage user clusters"
  ON user_clusters
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- RLS Policies for cluster_profiles (admin access only)
CREATE POLICY "Service role can manage cluster profiles"
  ON cluster_profiles
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Create a view for easy cluster analysis
CREATE OR REPLACE VIEW cluster_analysis AS
SELECT 
  cp.cluster_id,
  cp.cluster_label,
  cp.size as cluster_size,
  cp.characteristics,
  cp.created_at as analysis_date,
  ROUND(
    (cp.size::FLOAT / (SELECT SUM(size) FROM cluster_profiles WHERE created_at >= cp.created_at - INTERVAL '1 hour')) * 100, 
    2
  ) as percentage_of_users
FROM cluster_profiles cp
ORDER BY cp.cluster_id;

-- Create a function to get user cluster info with profile
CREATE OR REPLACE FUNCTION get_user_cluster_info(target_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  cluster_id INTEGER,
  cluster_label VARCHAR(50),
  cluster_size INTEGER,
  cluster_characteristics JSONB,
  user_distance_to_centroid FLOAT,
  analysis_date TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uc.user_id,
    uc.cluster_id,
    uc.cluster_label,
    cp.size as cluster_size,
    cp.characteristics as cluster_characteristics,
    uc.distance_to_centroid,
    uc.created_at as analysis_date
  FROM user_clusters uc
  JOIN cluster_profiles cp ON uc.cluster_id = cp.cluster_id
  WHERE uc.user_id = target_user_id
  ORDER BY uc.created_at DESC
  LIMIT 1;
END;
$$;

-- Create a function to get cluster summary statistics
CREATE OR REPLACE FUNCTION get_cluster_summary()
RETURNS TABLE (
  total_clusters INTEGER,
  total_users_clustered INTEGER,
  largest_cluster_size INTEGER,
  smallest_cluster_size INTEGER,
  avg_cluster_size FLOAT,
  analysis_date TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_clusters,
    SUM(cp.size)::INTEGER as total_users_clustered,
    MAX(cp.size)::INTEGER as largest_cluster_size,
    MIN(cp.size)::INTEGER as smallest_cluster_size,
    AVG(cp.size)::FLOAT as avg_cluster_size,
    MAX(cp.created_at) as analysis_date
  FROM cluster_profiles cp
  WHERE cp.created_at >= (
    SELECT MAX(created_at) - INTERVAL '1 hour' 
    FROM cluster_profiles
  );
END;
$$;

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_clusters_updated_at 
  BEFORE UPDATE ON user_clusters 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cluster_profiles_updated_at 
  BEFORE UPDATE ON cluster_profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT SELECT ON cluster_analysis TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_cluster_info(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cluster_summary() TO authenticated;

-- Insert initial comment for tracking
COMMENT ON TABLE user_clusters IS 'Stores individual user cluster assignments from K-means analysis';
COMMENT ON TABLE cluster_profiles IS 'Stores cluster metadata and characteristics from K-means analysis';
COMMENT ON VIEW cluster_analysis IS 'Provides easy access to cluster analysis results with percentages';
COMMENT ON FUNCTION get_user_cluster_info(UUID) IS 'Returns cluster information for a specific user';
COMMENT ON FUNCTION get_cluster_summary() IS 'Returns summary statistics for the latest clustering analysis';
