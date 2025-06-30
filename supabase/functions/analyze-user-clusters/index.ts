import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ClusterResult {
  clusters: number[];
  centroids: number[][];
  converged: boolean;
  iterations: number;
  optimalK: number;
  clusterProfiles: ClusterProfile[];
  wcss: number[];
}

interface ClusterProfile {
  id: number;
  label: string;
  size: number;
  centroid: number[];
  characteristics: {
    avgSatisfactionRate: number;
    avgEngagementLevel: number;
    avgFeedbackFrequency: number;
    avgResponseTime: number;
    preferredAlgorithms: string[];
    dominantTimePatterns: string[];
    avgAcceptanceRate: number;
  };
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { forceRecalculate = false, maxK = 8, timeRange = 30 } = await req.json();

    console.log('Starting user clustering analysis...');

    // Check for cached results (unless force recalculate)
    if (!forceRecalculate) {
      const { data: cachedProfiles } = await supabase
        .from('cluster_profiles')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('created_at', { ascending: false });

      if (cachedProfiles && cachedProfiles.length > 0) {
        console.log('Returning cached clustering results');

        // Get user cluster assignments count
        const { data: userClusters } = await supabase
          .from('user_clusters')
          .select('user_id')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        // Format cached results to match fresh analysis structure
        const formattedResult = {
          clusterProfiles: cachedProfiles.map(profile => ({
            id: profile.cluster_id,
            label: profile.cluster_label,
            size: profile.size,
            centroid: profile.centroid,
            characteristics: profile.characteristics
          })),
          optimalK: cachedProfiles.length,
          totalUsers: userClusters ? userClusters.length : 0,
          cached: true
        };

        return new Response(
          JSON.stringify({
            cached: true,
            result: formattedResult,
            totalUsers: userClusters ? userClusters.length : 0,
            analysisDate: cachedProfiles[0].created_at,
            message: 'Returned cached clustering results from last 24 hours'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }
    }

    // Extract features using the feature extraction function
    const { data: featuresResponse, error: featuresError } = await supabase.functions.invoke(
      'extract-clustering-features',
      {
        body: { timeRange }
      }
    );

    if (featuresError) {
      throw new Error(`Error extracting features: ${featuresError.message}`);
    }

    const features = featuresResponse.features;
    if (!features || features.length < 3) {
      return new Response(
        JSON.stringify({
          error: 'Insufficient data for clustering',
          message: `Need at least 3 users with feedback data for meaningful clustering analysis. Currently found: ${features?.length || 0} users.`,
          suggestion: 'Please wait for more users to provide feedback, or consider adding test data for demonstration purposes.',
          currentUsers: features?.length || 0,
          minimumRequired: 3
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 // Changed to 200 so the frontend can handle this gracefully
        }
      );
    }

    console.log(`Clustering ${features.length} users...`);

    // Prepare feature matrix
    const featureMatrix = features.map(user => [
      user.feedback_frequency,
      user.satisfaction_rate,
      user.response_time_avg,
      user.engagement_level,
      ...user.algorithm_preference,
      ...user.match_type_preferences,
      ...user.time_based_patterns,
      user.recommendation_acceptance_rate
    ]);

    // Normalize features
    const normalizedMatrix = normalizeFeatures(featureMatrix);

    // Determine optimal K using elbow method
    const optimalK = await findOptimalK(normalizedMatrix, maxK);
    console.log(`Optimal K determined: ${optimalK}`);

    // Perform K-means clustering
    const clusterResult = performKMeans(normalizedMatrix, optimalK);

    // Analyze cluster profiles
    const clusterProfiles = analyzeClusterProfiles(clusterResult, features);

    // Store results in database
    await storeClusterResults(clusterResult, clusterProfiles);

    // Update user cluster assignments
    await updateUserClusterAssignments(features, clusterResult.clusters);

    const result: ClusterResult = {
      ...clusterResult,
      optimalK,
      clusterProfiles
    };

    console.log('Clustering analysis completed successfully');

    return new Response(
      JSON.stringify({ 
        result,
        totalUsers: features.length,
        analysisDate: new Date().toISOString(),
        cached: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in analyze-user-clusters:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to perform clustering analysis'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

function normalizeFeatures(matrix: number[][]): number[][] {
  if (matrix.length === 0) return matrix;
  
  const numFeatures = matrix[0].length;
  const means = new Array(numFeatures).fill(0);
  const stds = new Array(numFeatures).fill(0);
  
  // Calculate means
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < numFeatures; j++) {
      means[j] += matrix[i][j];
    }
  }
  for (let j = 0; j < numFeatures; j++) {
    means[j] /= matrix.length;
  }
  
  // Calculate standard deviations
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < numFeatures; j++) {
      stds[j] += Math.pow(matrix[i][j] - means[j], 2);
    }
  }
  for (let j = 0; j < numFeatures; j++) {
    stds[j] = Math.sqrt(stds[j] / matrix.length);
    if (stds[j] === 0) stds[j] = 1; // Avoid division by zero
  }
  
  // Normalize
  return matrix.map(row => 
    row.map((value, j) => (value - means[j]) / stds[j])
  );
}

async function findOptimalK(data: number[][], maxK: number): Promise<number> {
  const wcss: number[] = [];
  
  for (let k = 1; k <= Math.min(maxK, data.length - 1); k++) {
    const result = performKMeans(data, k);
    wcss.push(result.wcss);
  }
  
  // Find elbow point using the "elbow method"
  let optimalK = 2;
  let maxImprovement = 0;
  
  for (let i = 1; i < wcss.length - 1; i++) {
    const improvement = wcss[i - 1] - wcss[i];
    const nextImprovement = wcss[i] - wcss[i + 1];
    const elbowScore = improvement - nextImprovement;
    
    if (elbowScore > maxImprovement) {
      maxImprovement = elbowScore;
      optimalK = i + 1;
    }
  }
  
  return Math.max(2, Math.min(optimalK, 6)); // Ensure K is between 2 and 6
}

function performKMeans(data: number[][], k: number): any {
  const maxIterations = 100;
  const tolerance = 1e-4;
  
  // Initialize centroids randomly
  let centroids = initializeCentroids(data, k);
  let clusters = new Array(data.length);
  let converged = false;
  let iterations = 0;
  
  for (iterations = 0; iterations < maxIterations && !converged; iterations++) {
    // Assign points to clusters
    const newClusters = assignPointsToClusters(data, centroids);
    
    // Update centroids
    const newCentroids = updateCentroids(data, newClusters, k);
    
    // Check convergence
    converged = checkConvergence(centroids, newCentroids, tolerance);
    
    clusters = newClusters;
    centroids = newCentroids;
  }
  
  // Calculate WCSS (Within-Cluster Sum of Squares)
  const wcss = calculateWCSS(data, clusters, centroids);
  
  return {
    clusters,
    centroids,
    converged,
    iterations,
    wcss
  };
}

function initializeCentroids(data: number[][], k: number): number[][] {
  const centroids: number[][] = [];
  const numFeatures = data[0].length;
  
  for (let i = 0; i < k; i++) {
    const centroid: number[] = [];
    for (let j = 0; j < numFeatures; j++) {
      const min = Math.min(...data.map(point => point[j]));
      const max = Math.max(...data.map(point => point[j]));
      centroid.push(Math.random() * (max - min) + min);
    }
    centroids.push(centroid);
  }
  
  return centroids;
}

function assignPointsToClusters(data: number[][], centroids: number[][]): number[] {
  return data.map(point => {
    let minDistance = Infinity;
    let clusterIndex = 0;
    
    centroids.forEach((centroid, index) => {
      const distance = euclideanDistance(point, centroid);
      if (distance < minDistance) {
        minDistance = distance;
        clusterIndex = index;
      }
    });
    
    return clusterIndex;
  });
}

function updateCentroids(data: number[][], clusters: number[], k: number): number[][] {
  const numFeatures = data[0].length;
  const newCentroids: number[][] = [];
  
  for (let i = 0; i < k; i++) {
    const clusterPoints = data.filter((_, index) => clusters[index] === i);
    
    if (clusterPoints.length === 0) {
      // If cluster is empty, keep the old centroid
      newCentroids.push(new Array(numFeatures).fill(0));
      continue;
    }
    
    const centroid = new Array(numFeatures).fill(0);
    clusterPoints.forEach(point => {
      point.forEach((value, j) => {
        centroid[j] += value;
      });
    });
    
    centroid.forEach((sum, j) => {
      centroid[j] = sum / clusterPoints.length;
    });
    
    newCentroids.push(centroid);
  }
  
  return newCentroids;
}

function checkConvergence(oldCentroids: number[][], newCentroids: number[][], tolerance: number): boolean {
  for (let i = 0; i < oldCentroids.length; i++) {
    const distance = euclideanDistance(oldCentroids[i], newCentroids[i]);
    if (distance > tolerance) {
      return false;
    }
  }
  return true;
}

function euclideanDistance(point1: number[], point2: number[]): number {
  return Math.sqrt(
    point1.reduce((sum, value, index) => 
      sum + Math.pow(value - point2[index], 2), 0
    )
  );
}

function calculateWCSS(data: number[][], clusters: number[], centroids: number[][]): number {
  let wcss = 0;
  
  data.forEach((point, index) => {
    const clusterIndex = clusters[index];
    const centroid = centroids[clusterIndex];
    wcss += Math.pow(euclideanDistance(point, centroid), 2);
  });
  
  return wcss;
}

function analyzeClusterProfiles(clusterResult: any, features: any[]): ClusterProfile[] {
  const { clusters, centroids } = clusterResult;
  const profiles: ClusterProfile[] = [];
  
  for (let i = 0; i < centroids.length; i++) {
    const clusterUsers = features.filter((_, index) => clusters[index] === i);
    
    if (clusterUsers.length === 0) continue;
    
    const profile: ClusterProfile = {
      id: i,
      label: generateClusterLabel(clusterUsers),
      size: clusterUsers.length,
      centroid: centroids[i],
      characteristics: {
        avgSatisfactionRate: average(clusterUsers.map(u => u.satisfaction_rate)),
        avgEngagementLevel: average(clusterUsers.map(u => u.engagement_level)),
        avgFeedbackFrequency: average(clusterUsers.map(u => u.feedback_frequency)),
        avgResponseTime: average(clusterUsers.map(u => u.response_time_avg)),
        preferredAlgorithms: findPreferredAlgorithms(clusterUsers),
        dominantTimePatterns: findDominantTimePatterns(clusterUsers),
        avgAcceptanceRate: average(clusterUsers.map(u => u.recommendation_acceptance_rate))
      }
    };
    
    profiles.push(profile);
  }
  
  return profiles;
}

function generateClusterLabel(users: any[]): string {
  const avgSatisfaction = average(users.map(u => u.satisfaction_rate));
  const avgEngagement = average(users.map(u => u.engagement_level));
  const avgFrequency = average(users.map(u => u.feedback_frequency));
  
  if (avgSatisfaction > 0.8 && avgEngagement > 0.7) return "Highly Satisfied Power Users";
  if (avgSatisfaction > 0.6 && avgFrequency > 2) return "Regular Active Users";
  if (avgSatisfaction < 0.4) return "Dissatisfied Users";
  if (avgEngagement < 0.3) return "Low Engagement Users";
  if (avgFrequency > 5) return "Feedback Champions";
  
  return "Moderate Users";
}

function findPreferredAlgorithms(users: any[]): string[] {
  const algorithms = ['direct_preference', 'collaborative_filtering', 'activity_based'];
  const avgPreferences = algorithms.map((_, i) => 
    average(users.map(u => u.algorithm_preference[i]))
  );
  
  return algorithms
    .map((name, i) => ({ name, score: avgPreferences[i] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(item => item.name);
}

function findDominantTimePatterns(users: any[]): string[] {
  const timeLabels = ['Morning', 'Afternoon', 'Evening', 'Night'];
  const avgPatterns = timeLabels.map((_, i) => 
    average(users.map(u => u.time_based_patterns[i]))
  );
  
  return timeLabels
    .map((name, i) => ({ name, score: avgPatterns[i] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(item => item.name);
}

function average(numbers: number[]): number {
  return numbers.length > 0 ? numbers.reduce((sum, n) => sum + n, 0) / numbers.length : 0;
}

async function storeClusterResults(clusterResult: any, clusterProfiles: ClusterProfile[]): Promise<void> {
  // Clear old cluster profiles
  await supabase.from('cluster_profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  // Insert new cluster profiles
  for (const profile of clusterProfiles) {
    await supabase.from('cluster_profiles').insert({
      cluster_id: profile.id,
      cluster_label: profile.label,
      centroid: profile.centroid,
      size: profile.size,
      characteristics: profile.characteristics
    });
  }
}

async function updateUserClusterAssignments(features: any[], clusters: number[]): Promise<void> {
  // Clear old assignments
  await supabase.from('user_clusters').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  // Insert new assignments
  const assignments = features.map((user, index) => ({
    user_id: user.user_id,
    cluster_id: clusters[index],
    cluster_label: '', // Will be updated by trigger or separate process
    distance_to_centroid: 0, // Calculate if needed
    feature_vector: [
      user.feedback_frequency,
      user.satisfaction_rate,
      user.response_time_avg,
      user.engagement_level,
      ...user.algorithm_preference,
      ...user.match_type_preferences,
      ...user.time_based_patterns,
      user.recommendation_acceptance_rate
    ]
  }));
  
  if (assignments.length > 0) {
    await supabase.from('user_clusters').insert(assignments);
  }
}
