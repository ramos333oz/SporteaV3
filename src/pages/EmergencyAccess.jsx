import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, Stack, CircularProgress } from '@mui/material';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';

// Emergency component that bypasses all normal authentication flows
const EmergencyAccess = () => {
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState([]);
  const navigate = useNavigate();
  
  // Get match data directly, bypassing auth checks
  const fetchMatches = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setMatches(data || []);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Navigate to host page
  const goToHost = () => {
    window.location.href = '/host';
  };
  
  // Navigate to match details
  const viewMatch = (matchId) => {
    window.location.href = `/match/${matchId}`;
  };
  
  return (
    <Box sx={{ 
      padding: 3,
      maxWidth: 800,
      margin: '0 auto',
      marginTop: 4
    }}>
      <Typography variant="h1" gutterBottom sx={{ color: 'error.main' }}>
        Emergency Access Mode
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
        This mode bypasses regular authentication. Use only when the normal login flow isn't working.
      </Typography>
      
      <Paper sx={{ padding: 3, marginBottom: 3 }}>
        <Typography variant="h2" gutterBottom>Direct Navigation</Typography>
        
        <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={goToHost}
            size="large"
          >
            Create New Match
          </Button>
          
          <Button 
            variant="contained" 
            color="secondary" 
            onClick={fetchMatches}
            size="large"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'View Recent Matches'}
          </Button>
        </Stack>
        
        {matches.length > 0 && (
          <>
            <Typography variant="h3" gutterBottom>Recent Matches</Typography>
            <Stack spacing={2}>
              {matches.map(match => (
                <Paper 
                  key={match.id} 
                  sx={{ 
                    p: 2, 
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' } 
                  }}
                  onClick={() => viewMatch(match.id)}
                >
                  <Typography variant="h4">{match.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {match.description}
                  </Typography>
                  <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">
                      <strong>Sport:</strong> {match.sport}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Location:</strong> {match.location_name}
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </Stack>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default EmergencyAccess;
