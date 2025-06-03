import React from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent,
  CardActionArea
} from '@mui/material';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import SportsBasketballIcon from '@mui/icons-material/SportsBasketball';
import SportsTennisIcon from '@mui/icons-material/SportsTennis';
import SportsVolleyballIcon from '@mui/icons-material/SportsVolleyball';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import SportsIcon from '@mui/icons-material/Sports';

const SportSelection = ({ matchData, onUpdateMatchData }) => {
  // List of available sports
  const sportsList = [
    { id: 'football', name: 'Football', icon: <SportsSoccerIcon sx={{ fontSize: 40 }} />, constraints: { minPlayers: 6, maxPlayers: 22 } },
    { id: 'futsal', name: 'Futsal', icon: <SportsSoccerIcon sx={{ fontSize: 40 }} />, constraints: { minPlayers: 4, maxPlayers: 12 } },
    { id: 'basketball', name: 'Basketball', icon: <SportsBasketballIcon sx={{ fontSize: 40 }} />, constraints: { minPlayers: 4, maxPlayers: 15 } },
    { id: 'badminton', name: 'Badminton', icon: <SportsTennisIcon sx={{ fontSize: 40 }} />, constraints: { minPlayers: 2, maxPlayers: 8 } },
    { id: 'volleyball', name: 'Volleyball', icon: <SportsVolleyballIcon sx={{ fontSize: 40 }} />, constraints: { minPlayers: 6, maxPlayers: 15 } },
    { id: 'running', name: 'Running', icon: <DirectionsRunIcon sx={{ fontSize: 40 }} />, constraints: { minPlayers: 2, maxPlayers: 30 } },
    { id: 'gym', name: 'Gym Session', icon: <FitnessCenterIcon sx={{ fontSize: 40 }} />, constraints: { minPlayers: 2, maxPlayers: 20 } },
    { id: 'other', name: 'Other', icon: <SportsIcon sx={{ fontSize: 40 }} />, constraints: { minPlayers: 2, maxPlayers: 50 } }
  ];
  
  const handleSelectSport = (sport) => {
    onUpdateMatchData({ 
      sport: sport.id, 
      sportIcon: sport.icon, 
      maxParticipants: sport.constraints.maxPlayers,
      minParticipants: sport.constraints.minPlayers
    });
  };
  
  return (
    <Box>
      <Typography variant="h2" component="h2" gutterBottom>
        Select a Sport
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Choose the sport you want to host a match for. This will determine available locations, participant limits, and other sport-specific settings.
      </Typography>
      
      <Grid container spacing={2} sx={{ mt: 2 }}>
        {sportsList.map((sport) => (
          <Grid item xs={6} sm={4} md={3} key={sport.id}>
            <Card 
              elevation={matchData.sport === sport.id ? 3 : 1} 
              sx={{ 
                borderRadius: 2,
                border: matchData.sport === sport.id ? 2 : 0,
                borderColor: 'primary.main',
                height: '100%',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                }
              }}
            >
              <CardActionArea 
                onClick={() => handleSelectSport(sport)}
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  p: 2
                }}
              >
                <Box 
                  sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: matchData.sport === sport.id ? 'primary.light' : 'secondary.light',
                    color: matchData.sport === sport.id ? 'white' : 'primary.main',
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    mb: 2
                  }}
                >
                  {sport.icon}
                </Box>
                <Typography 
                  variant="h3" 
                  component="h3" 
                  align="center"
                  color={matchData.sport === sport.id ? 'primary' : 'text.primary'}
                >
                  {sport.name}
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  align="center" 
                  sx={{ mt: 1 }}
                >
                  {sport.constraints.minPlayers}-{sport.constraints.maxPlayers} players
                </Typography>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {matchData.sport && (
        <Box sx={{ mt: 3, bgcolor: 'secondary.light', p: 2, borderRadius: 2 }}>
          <Typography variant="body1" color="text.secondary">
            <strong>Selected Sport:</strong> {sportsList.find(s => s.id === matchData.sport)?.name}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            <strong>Required Participants:</strong> {matchData.minParticipants} - {matchData.maxParticipants} players
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default SportSelection;
