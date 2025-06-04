import React, { useState, useEffect } from 'react';
import { Box, Button, Container, Typography, Paper, CircularProgress, Divider, Alert } from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import recommendationService from '../../services/recommendationService';

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

  async function testRecommendations() {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    setResult(null);
    setDiagnosticData(null);
    
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

  useEffect(() => {
    if (user) {
      testRecommendations();
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
      
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Test Parameters</Typography>
        <Box sx={{ mb: 2 }}>
          <Typography><strong>User ID:</strong> {user.id}</Typography>
          <Typography><strong>Limit:</strong> 10</Typography>
        </Box>
        
        <Button 
          variant="contained" 
          onClick={testRecommendations} 
          disabled={loading}
          sx={{ mr: 2 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Test Recommendations'}
        </Button>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Recommendation Results</Typography>
          <Typography><strong>Recommendation Type:</strong> {result.type}</Typography>
          <Typography><strong>Message:</strong> {result.message}</Typography>
          <Typography><strong>Count:</strong> {result.recommendations?.length || 0}</Typography>
          
          {result.error && (
            <Box mt={2}>
              <Typography color="error"><strong>Error:</strong> {result.error.message}</Typography>
              <Typography color="error"><strong>Code:</strong> {result.error.code}</Typography>
              <Typography color="error"><strong>Status:</strong> {result.error.status}</Typography>
            </Box>
          )}
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle1" gutterBottom>Recommended Matches:</Typography>
          {result.recommendations?.length > 0 ? (
            result.recommendations.map((match, index) => (
              <Paper key={match.id || index} elevation={1} sx={{ p: 2, mb: 1 }}>
                <Typography><strong>Title:</strong> {match.title}</Typography>
                <Typography><strong>Type:</strong> {match.recommendation_type}</Typography>
                <Typography><strong>Explanation:</strong> {match.explanation}</Typography>
                {match.finalScore !== undefined && (
                  <Typography><strong>Score:</strong> {match.finalScore.toFixed(2)}</Typography>
                )}
              </Paper>
            ))
          ) : (
            <Typography color="text.secondary">No recommendations available</Typography>
          )}
        </Paper>
      )}

      {diagnosticData && (
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Diagnostic Data</Typography>
          <Typography><strong>Validation Status:</strong> {diagnosticData.validationStatus || 'N/A'}</Typography>
          
          {diagnosticData.receivedParameters && (
            <Box mt={2}>
              <Typography variant="subtitle1" gutterBottom>Received Parameters:</Typography>
              <Typography><strong>User ID:</strong> {diagnosticData.receivedParameters.userId}</Typography>
              <Typography><strong>Limit:</strong> {diagnosticData.receivedParameters.limit}</Typography>
              <Typography><strong>Request Time:</strong> {diagnosticData.receivedParameters.requestTime}</Typography>
              <Typography><strong>Additional Parameters:</strong> {
                diagnosticData.receivedParameters.additionalParams?.length 
                ? diagnosticData.receivedParameters.additionalParams.join(', ') 
                : 'None'
              }</Typography>
            </Box>
          )}
          
          {diagnosticData.validationErrors && diagnosticData.validationErrors.length > 0 && (
            <Box mt={2}>
              <Typography variant="subtitle1" color="error" gutterBottom>Validation Errors:</Typography>
              {diagnosticData.validationErrors.map((error, index) => (
                <Typography key={index} color="error">• {error}</Typography>
              ))}
            </Box>
          )}
        </Paper>
      )}
    </Container>
  );
};

export default TestRecommendations;
