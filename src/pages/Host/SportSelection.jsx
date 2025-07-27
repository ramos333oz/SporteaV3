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
  // Complete list of available sports with correct database UUIDs
  // This matches exactly what LocationMapView.jsx supports and the database sports table
  const sportsList = [
    {
      id: 'fb575fc1-2eac-4142-898a-2f7dae107844',
      name: 'Badminton',
      displayName: 'Badminton',
      icon: <img src="/images/sportslectionicons/badminton.png" alt="Badminton" style={{ width: 40, height: 40 }} />,
      constraints: { minPlayers: 2, maxPlayers: 8 }
    },
    {
      id: 'dd400853-7ce6-47bc-aee6-2ee241530f79',
      name: 'Basketball',
      displayName: 'Basketball',
      icon: <img src="/images/sportslectionicons/basketball.png" alt="Basketball" style={{ width: 40, height: 40 }} />,
      constraints: { minPlayers: 4, maxPlayers: 15 }
    },
    {
      id: '4746e9c1-f772-4515-8d08-6c28563fbfc9',
      name: 'Football',
      displayName: 'Football',
      icon: <img src="/images/sportslectionicons/football.png" alt="Football" style={{ width: 40, height: 40 }} />,
      constraints: { minPlayers: 6, maxPlayers: 22 }
    },
    {
      id: 'dcedf87a-13aa-4c2f-979f-6b71d457f531',
      name: 'Frisbee',
      displayName: 'Frisbee',
      icon: <img src="/images/sportslectionicons/frisbee.png" alt="Frisbee" style={{ width: 40, height: 40 }} />,
      constraints: { minPlayers: 4, maxPlayers: 14 }
    },
    {
      id: 'd662bc78-9e50-4785-ac71-d1e591e4a9ce',
      name: 'Futsal',
      displayName: 'Futsal',
      icon: <img src="/images/sportslectionicons/futsal.png" alt="Futsal" style={{ width: 40, height: 40 }} />,
      constraints: { minPlayers: 4, maxPlayers: 12 }
    },
    {
      id: '3aba0f36-38bf-4ca2-b713-3dabd9f993f1',
      name: 'Hockey',
      displayName: 'Hockey',
      icon: <img src="/images/sportslectionicons/hockey.png" alt="Hockey" style={{ width: 40, height: 40 }} />,
      constraints: { minPlayers: 6, maxPlayers: 22 }
    },
    {
      id: '13e32815-8a3b-48f7-8cc9-5fdad873b851',
      name: 'Rugby',
      displayName: 'Rugby',
      icon: <img src="/images/sportslectionicons/rugby.png" alt="Rugby" style={{ width: 40, height: 40 }} />,
      constraints: { minPlayers: 8, maxPlayers: 30 }
    },
    {
      id: '0ec51cfc-f644-4057-99d8-d2c29c1b7dd0',
      name: 'Squash',
      displayName: 'Squash',
      icon: <img src="/images/sportslectionicons/squash.png" alt="Squash" style={{ width: 40, height: 40 }} />,
      constraints: { minPlayers: 2, maxPlayers: 4 }
    },
    {
      id: '845d3461-42fc-45c2-a403-8efcaf237c17',
      name: 'Table Tennis',
      displayName: 'Table Tennis',
      icon: <img src="/images/sportslectionicons/table tennis.png" alt="Table Tennis" style={{ width: 40, height: 40 }} />,
      constraints: { minPlayers: 2, maxPlayers: 8 }
    },
    {
      id: '9a304214-6c57-4c33-8c5f-3f1955b63caf',
      name: 'Tennis',
      displayName: 'Tennis',
      icon: <img src="/images/sportslectionicons/tennis.png" alt="Tennis" style={{ width: 40, height: 40 }} />,
      constraints: { minPlayers: 2, maxPlayers: 4 }
    },
    {
      id: '66e9893a-2be7-47f0-b7d3-d7191901dd77',
      name: 'Volleyball',
      displayName: 'Volleyball',
      icon: <img src="/images/sportslectionicons/volleyball.png" alt="Volleyball" style={{ width: 40, height: 40 }} />,
      constraints: { minPlayers: 6, maxPlayers: 15 }
    }
  ];
  
  const handleSelectSport = (sport) => {
    onUpdateMatchData({
      sport: sport.id, // Use UUID as the sport identifier
      sport_id: sport.id, // UUID for database operations
      sportIcon: sport.icon,
      sportName: sport.name, // Display name
      sportDisplayName: sport.displayName, // For UI display
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
                  {sport.displayName}
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
