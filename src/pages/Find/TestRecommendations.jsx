import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Container, 
  Typography, 
  Paper, 
  CircularProgress, 
  Divider, 
  Alert,
  Tabs,
  Tab,
  TextField,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Chip,
  Switch,
  FormControlLabel,
  FormGroup,
  Card,
  CardContent,
  CardHeader
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAuth } from '../../hooks/useAuth';
import recommendationService from '../../services/recommendationService';
import { supabase } from '../../services/supabase';

/**
 * Test component for diagnosing recommendation service issues
 * This page allows testing the recommendation service with different parameters
 */
const TestRecommendations = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [diagnosticData, setDiagnosticData] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [testUsers, setTestUsers] = useState([]);
  const [testMatches, setTestMatches] = useState([]);
  const [userEmbeddings, setUserEmbeddings] = useState(null);
  const [matchEmbeddings, setMatchEmbeddings] = useState(null);
  const [embedLoading, setEmbedLoading] = useState(false);
  const [testUserId, setTestUserId] = useState('');
  const [testMatchId, setTestMatchId] = useState('');
  const [recommendationStatus, setRecommendationStatus] = useState({});
  const [comparisonResult, setComparisonResult] = useState(null);
  
  // New state for enhanced features
  const [useHnsw, setUseHnsw] = useState(true);
  const [useHybridSearch, setUseHybridSearch] = useState(true);
  const [useActivityContext, setUseActivityContext] = useState(true);
  const [runComparison, setRunComparison] = useState(false);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  async function testRecommendations() {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    setResult(null);
    setDiagnosticData(null);
    setComparisonResult(null);
    
    try {
      console.log('Testing recommendations for user:', user.id);
      const response = await recommendationService.getRecommendations(user.id, 10);
      
      setResult(response);
      setDiagnosticData(response.diagnostic);
      console.log('Recommendation response:', response);
    } catch (err) {
      console.error('Error testing recommendations:', err);
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  // Fetch test users and matches
  const fetchTestData = async () => {
    try {
      // Fetch test users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, preference_vector')
        .limit(10);
      
      if (usersError) throw usersError;
      setTestUsers(users || []);
      
      // Fetch test matches
      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select('id, title, sport_id, host_id, start_time, status, embedding')
        .eq('status', 'active')
        .limit(10);
      
      if (matchesError) throw matchesError;
      setTestMatches(matches || []);
    } catch (err) {
      console.error('Error fetching test data:', err);
      setError('Failed to fetch test data: ' + (err.message || 'Unknown error'));
    }
  };

  // Generate user embeddings
  const generateUserEmbedding = async (userId) => {
    try {
      setEmbedLoading(true);
      setRecommendationStatus({
        ...recommendationStatus,
        userEmbedding: 'processing'
      });
      
      const { data, error } = await supabase.functions.invoke('generate-user-embeddings', {
        body: { userId }
      });
      
      if (error) throw error;
      
      setUserEmbeddings(data);
      setRecommendationStatus({
        ...recommendationStatus,
        userEmbedding: 'success'
      });
      
      // Refresh test users to see updated embedding
      fetchTestData();
    } catch (err) {
      console.error('Error generating user embedding:', err);
      setError('Failed to generate user embedding: ' + (err.message || 'Unknown error'));
      setRecommendationStatus({
        ...recommendationStatus,
        userEmbedding: 'error'
      });
    } finally {
      setEmbedLoading(false);
    }
  };

  // Generate match embeddings
  const generateMatchEmbedding = async (matchId) => {
    try {
      setEmbedLoading(true);
      setRecommendationStatus({
        ...recommendationStatus,
        matchEmbedding: 'processing'
      });
      
      const { data, error } = await supabase.functions.invoke('generate-match-embeddings', {
        body: { matchId }
      });
      
      if (error) throw error;
      
      setMatchEmbeddings(data);
      setRecommendationStatus({
        ...recommendationStatus,
        matchEmbedding: 'success'
      });
      
      // Refresh test matches to see updated embedding
      fetchTestData();
    } catch (err) {
      console.error('Error generating match embedding:', err);
      setError('Failed to generate match embedding: ' + (err.message || 'Unknown error'));
      setRecommendationStatus({
        ...recommendationStatus,
        matchEmbedding: 'error'
      });
    } finally {
      setEmbedLoading(false);
    }
  };

  // Test full recommendation pipeline
  const testFullRecommendationPipeline = async (userId) => {
    try {
      setLoading(true);
      setError(null);
      setRecommendationStatus({
        ...recommendationStatus,
        pipeline: 'processing'
      });
      
      // Step 1: Generate user embedding
      await generateUserEmbedding(userId);
      
      // Step 2: Fetch recommendations
      const response = await recommendationService.getRecommendations(userId, 10);
      
      setResult(response);
      setDiagnosticData(response.diagnostic);
      setRecommendationStatus({
        ...recommendationStatus,
        pipeline: 'success'
      });
    } catch (err) {
      console.error('Error testing recommendation pipeline:', err);
      setError('Pipeline error: ' + (err.message || 'Unknown error'));
      setRecommendationStatus({
        ...recommendationStatus,
        pipeline: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Test the diagnostic endpoint with enhanced features
  const testEnhancedRecommendations = async (userId) => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      setDiagnosticData(null);
      setComparisonResult(null);
      
      // Call the diagnostic endpoint with options
      const { data, error } = await supabase.functions.invoke('get-recommendations-diagnostic', {
        body: { 
          userId, 
          limit: 10,
          useHnsw,
          useHybridSearch,
          useActivityContext,
          runComparison
        }
      });
      
      if (error) throw error;
      
      if (runComparison) {
        setComparisonResult(data.comparisonResults);
      } else {
        setResult(data);
        setDiagnosticData(data.diagnosticInfo);
      }
      
      console.log('Enhanced recommendation response:', data);
    } catch (err) {
      console.error('Error testing enhanced recommendations:', err);
      setError('Enhanced recommendation error: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Visualize vector embeddings (simplified for display)
  const visualizeVector = (vector, maxItems = 10) => {
    if (!vector || !Array.isArray(vector)) return 'No vector data';
    
    const truncatedVector = vector.slice(0, maxItems);
    
    return (
      <Box sx={{ mt: 1 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Vector length: {vector.length} (showing first {Math.min(maxItems, vector.length)} elements)
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {truncatedVector.map((value, index) => (
            <Chip 
              key={index} 
              label={`${value.toFixed(4)}`} 
              size="small" 
              variant="outlined"
            />
          ))}
          {vector.length > maxItems && <Chip label="..." size="small" variant="outlined" />}
        </Box>
      </Box>
    );
  };

  // Render performance comparison
  const renderComparison = () => {
    if (!comparisonResult) return null;
    
    const { originalAlgorithm, enhancedAlgorithm, performanceImprovement } = comparisonResult;
    const percentImprovement = performanceImprovement.percentageImprovement.toFixed(2);
    
    return (
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Performance Comparison</Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card elevation={2}>
              <CardHeader
                title="Original Algorithm"
                subheader={`${originalAlgorithm.executionTimeMs.toFixed(2)} ms`}
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {originalAlgorithm.description}
                </Typography>
                <Typography variant="body2">
                  Content-based: {originalAlgorithm.contentBasedCount} results<br />
                  Collaborative: {originalAlgorithm.collaborativeCount} results<br />
                  Total: {originalAlgorithm.recommendations.length} recommendations
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card elevation={2} sx={{ bgcolor: 'success.light' }}>
              <CardHeader
                title="Enhanced Algorithm"
                subheader={`${enhancedAlgorithm.executionTimeMs.toFixed(2)} ms`}
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {enhancedAlgorithm.description}
                </Typography>
                <Typography variant="body2">
                  Content-based: {enhancedAlgorithm.contentBasedCount} results<br />
                  Collaborative: {enhancedAlgorithm.collaborativeCount} results<br />
                  Activity: {enhancedAlgorithm.activityCount} results<br />
                  Total: {enhancedAlgorithm.recommendations.length} recommendations
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12}>
            <Alert severity={percentImprovement > 0 ? "success" : "warning"}>
              {percentImprovement > 0 ? 
                `Performance improved by ${percentImprovement}% (${performanceImprovement.timeDifferenceMs.toFixed(2)} ms faster)` : 
                `Performance decreased by ${Math.abs(percentImprovement)}% (${Math.abs(performanceImprovement.timeDifferenceMs).toFixed(2)} ms slower)`
              }
              <br />
              {performanceImprovement.recommendationOverlap} recommendations are common between both algorithms.
            </Alert>
          </Grid>
          
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>View Original Algorithm Results</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  {originalAlgorithm.recommendations.map((rec, idx) => (
                    <ListItem key={`original-${idx}`} divider>
                      <ListItemText
                        primary={`${idx + 1}. ${rec.title}`}
                        secondary={
                          <>
                            <Typography variant="caption" display="block">
                              Score: {rec.finalScore.toFixed(4)} | Type: {rec.recommendation_type}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {rec.explanation}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
            
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>View Enhanced Algorithm Results</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  {enhancedAlgorithm.recommendations.map((rec, idx) => (
                    <ListItem key={`enhanced-${idx}`} divider>
                      <ListItemText
                        primary={`${idx + 1}. ${rec.title}`}
                        secondary={
                          <>
                            <Typography variant="caption" display="block">
                              Score: {rec.finalScore.toFixed(4)} | Type: {rec.recommendation_type || 'hybrid'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {rec.explanation}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          </Grid>
        </Grid>
      </Paper>
    );
  };

  useEffect(() => {
    if (user) {
      fetchTestData();
    }
  }, [user]);

  if (!user) {
    return (
      <Container>
        <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>Please log in to test recommendations</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Typography variant="h4" sx={{ mt: 4, mb: 2 }}>Recommendation System Diagnostics</Typography>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth">
          <Tab label="Basic Test" />
          <Tab label="Generate Embeddings" />
          <Tab label="Full Pipeline Test" />
          <Tab label="Enhanced Features" />
        </Tabs>
        
        <Box sx={{ p: 3 }}>
          {/* Tab 1: Basic Test */}
          {activeTab === 0 && (
            <>
              <Typography paragraph>
                Test the basic recommendation retrieval for the current user.
                This will call the recommendation service directly.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={testRecommendations}
                disabled={loading}
                sx={{ mb: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Test Recommendations'}
              </Button>
            </>
          )}
          
          {/* Tab 2: Generate Embeddings */}
          {activeTab === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>Generate User Embedding</Typography>
                <Typography variant="body2" paragraph color="text.secondary">
                  Select a user and generate their preference vector based on their profile data.
                </Typography>
                
                <TextField
                  select
                  fullWidth
                  label="Select User"
                  value={testUserId}
                  onChange={(e) => setTestUserId(e.target.value)}
                  SelectProps={{ native: true }}
                  variant="outlined"
                  margin="normal"
                >
                  <option value="">-- Select User --</option>
                  {testUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.email})
                    </option>
                  ))}
                </TextField>
                
                <Button
                  variant="contained"
                  color="primary"
                  disabled={!testUserId || embedLoading}
                  onClick={() => generateUserEmbedding(testUserId)}
                  sx={{ mt: 1 }}
                >
                  {embedLoading && recommendationStatus.userEmbedding === 'processing' ? 
                    <CircularProgress size={24} /> : 'Generate User Embedding'}
                </Button>
                
                {userEmbeddings && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2">Generated Vector:</Typography>
                    {visualizeVector(userEmbeddings.embedding)}
                  </Box>
                )}
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>Generate Match Embedding</Typography>
                <Typography variant="body2" paragraph color="text.secondary">
                  Select a match and generate its characteristic vector based on its details.
                </Typography>
                
                <TextField
                  select
                  fullWidth
                  label="Select Match"
                  value={testMatchId}
                  onChange={(e) => setTestMatchId(e.target.value)}
                  SelectProps={{ native: true }}
                  variant="outlined"
                  margin="normal"
                >
                  <option value="">-- Select Match --</option>
                  {testMatches.map((match) => (
                    <option key={match.id} value={match.id}>
                      {match.title} ({new Date(match.start_time).toLocaleDateString()})
                    </option>
                  ))}
                </TextField>
                
                <Button
                  variant="contained"
                  color="primary"
                  disabled={!testMatchId || embedLoading}
                  onClick={() => generateMatchEmbedding(testMatchId)}
                  sx={{ mt: 1 }}
                >
                  {embedLoading && recommendationStatus.matchEmbedding === 'processing' ? 
                    <CircularProgress size={24} /> : 'Generate Match Embedding'}
                </Button>
                
                {matchEmbeddings && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2">Generated Vector:</Typography>
                    {visualizeVector(matchEmbeddings.embedding)}
                  </Box>
                )}
              </Grid>
            </Grid>
          )}
          
          {/* Tab 3: Full Pipeline Test */}
          {activeTab === 2 && (
            <>
              <Typography paragraph>
                Test the full recommendation pipeline including embedding generation and recommendation retrieval.
              </Typography>
              
              <TextField
                select
                fullWidth
                label="Select User"
                value={testUserId}
                onChange={(e) => setTestUserId(e.target.value)}
                SelectProps={{ native: true }}
                variant="outlined"
                margin="normal"
                sx={{ maxWidth: 400 }}
              >
                <option value="">-- Select User --</option>
                {testUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name} ({user.email})
                  </option>
                ))}
              </TextField>
              
              <Button
                variant="contained"
                color="primary"
                disabled={!testUserId || loading}
                onClick={() => testFullRecommendationPipeline(testUserId)}
                sx={{ mt: 1 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Run Full Pipeline Test'}
              </Button>
              
              {recommendationStatus.pipeline && (
                <Alert 
                  severity={recommendationStatus.pipeline === 'success' ? 'success' : 
                           recommendationStatus.pipeline === 'error' ? 'error' : 'info'}
                  sx={{ mt: 2 }}
                >
                  Pipeline status: {recommendationStatus.pipeline}
                </Alert>
              )}
            </>
          )}
          
          {/* Tab 4: Enhanced Features */}
          {activeTab === 3 && (
            <>
              <Typography paragraph>
                Test enhanced recommendation features with different configuration options.
              </Typography>
              
              <Paper sx={{ p: 2, mb: 2 }} variant="outlined">
                <Typography variant="subtitle1" gutterBottom>Configuration Options</Typography>
                <FormGroup>
                  <FormControlLabel 
                    control={<Switch checked={useHnsw} onChange={e => setUseHnsw(e.target.checked)} />}
                    label="Use HNSW Indexing (faster vector search)"
                  />
                  <FormControlLabel 
                    control={<Switch checked={useHybridSearch} onChange={e => setUseHybridSearch(e.target.checked)} />}
                    label="Use Hybrid Search with Reciprocal Rank Fusion"
                  />
                  <FormControlLabel 
                    control={<Switch checked={useActivityContext} onChange={e => setUseActivityContext(e.target.checked)} />}
                    label="Include User Activity Context"
                  />
                  <FormControlLabel 
                    control={<Switch checked={runComparison} onChange={e => setRunComparison(e.target.checked)} />}
                    label="Run Performance Comparison (original vs enhanced)"
                  />
                </FormGroup>
              </Paper>
              
              <TextField
                select
                fullWidth
                label="Select User"
                value={testUserId}
                onChange={(e) => setTestUserId(e.target.value)}
                SelectProps={{ native: true }}
                variant="outlined"
                margin="normal"
                sx={{ maxWidth: 400 }}
              >
                <option value="">-- Select User --</option>
                {testUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name} ({user.email})
                  </option>
                ))}
              </TextField>
              
              <Button
                variant="contained"
                color="primary"
                disabled={!testUserId || loading}
                onClick={() => testEnhancedRecommendations(testUserId)}
                sx={{ mt: 1 }}
              >
                {loading ? <CircularProgress size={24} /> : runComparison ? 'Run Performance Comparison' : 'Test Enhanced Recommendations'}
              </Button>
              
              {comparisonResult && renderComparison()}
            </>
          )}
        </Box>
      </Paper>
      
      {/* Error display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Results display */}
      {result && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Recommendation Results</Typography>
          
          {result.type === 'comparison' ? (
            <Typography variant="body1">Comparison results displayed above.</Typography>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Type: {result.type} | Found: {result.recommendations?.length || 0} recommendations
                {diagnosticData?.metrics && ` | Execution time: ${diagnosticData.metrics.executionTimeMs.toFixed(2)} ms`}
              </Typography>
              
              {diagnosticData && (
                <Accordion sx={{ mb: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Diagnostic Information</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <pre style={{ overflowX: 'auto' }}>
                      {JSON.stringify(diagnosticData, null, 2)}
                    </pre>
                  </AccordionDetails>
                </Accordion>
              )}
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle1" gutterBottom>Recommendations:</Typography>
              
              <List>
                {result.recommendations?.length > 0 ? 
                  result.recommendations.map((rec, idx) => (
                    <ListItem key={idx} divider>
                      <ListItemText
                        primary={`${idx + 1}. ${rec.title}`}
                        secondary={
                          <>
                            <Typography variant="caption" display="block">
                              Score: {rec.finalScore?.toFixed(4) || 'N/A'} | 
                              Type: {rec.recommendation_type || 'unknown'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {rec.explanation || 'No explanation provided'}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                  )) : 
                  <Typography variant="body2" color="text.secondary">
                    No recommendations found
                  </Typography>
                }
              </List>
            </>
          )}
        </Paper>
      )}
      
      {/* Raw data display (for debugging) */}
      {result && (
        <Accordion sx={{ mb: 3 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Raw Response Data</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <pre style={{ overflowX: 'auto' }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </AccordionDetails>
        </Accordion>
      )}
    </Container>
  );
};

export default TestRecommendations;
