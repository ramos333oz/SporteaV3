import React from 'react';
import { 
  Box, 
  Typography, 
  Paper,
  Grid,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import TitleIcon from '@mui/icons-material/Title';
import DescriptionIcon from '@mui/icons-material/Description';
import EventIcon from '@mui/icons-material/Event';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PeopleIcon from '@mui/icons-material/People';
import TimerIcon from '@mui/icons-material/Timer';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import LockIcon from '@mui/icons-material/Lock';
import { format } from 'date-fns';

const MatchReview = ({ matchData, onUpdateMatchData }) => {
  const [termsAccepted, setTermsAccepted] = React.useState(false);
  
  const handleTermsAcceptedChange = (event) => {
    setTermsAccepted(event.target.checked);
    onUpdateMatchData({ termsAccepted: event.target.checked });
  };
  
  // Format date and time for display
  const formatDateTime = () => {
    if (!matchData.date || !matchData.time) return 'Not set';
    
    const date = format(matchData.date, 'EEEE, MMMM d, yyyy');
    const time = format(matchData.time, 'h:mm a');
    
    return `${date} at ${time}`;
  };
  
  // Calculate end time based on start time and duration
  const calculateEndTime = () => {
    if (!matchData.time) return 'Not set';
    
    const endTime = new Date(matchData.time);
    endTime.setMinutes(endTime.getMinutes() + matchData.duration);
    
    return format(endTime, 'h:mm a');
  };
  
  // Get sport icon based on sport type
  const getSportIcon = () => {
    if (matchData.sportIcon) {
      return matchData.sportIcon;
    }
    
    // Default icon if sportIcon not available
    return <SportsSoccerIcon />;
  };
  
  return (
    <Box>
      <Typography variant="h2" component="h2" gutterBottom>
        Review Match Details
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Please review all match details before creating your match. You'll be able to edit these details after creation if needed.
      </Typography>
      
      <Paper elevation={2} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box 
            sx={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'primary.light',
              color: 'white',
              width: 48,
              height: 48,
              borderRadius: '50%',
              mr: 2
            }}
          >
            {getSportIcon()}
          </Box>
          <Typography variant="h3" component="h3">
            {matchData.title || 'Untitled Match'}
          </Typography>
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <List disablePadding>
              <ListItem sx={{ px: 0 }}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <TitleIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={<span style={{ color: 'rgba(0, 0, 0, 0.6)', fontSize: '0.875rem' }}>Title</span>}
                  secondary={<span style={{ fontSize: '1rem' }}>{matchData.title || 'Not set'}</span>}
                />
              </ListItem>
              
              <ListItem sx={{ px: 0 }}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <SportsSoccerIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={<span style={{ color: 'rgba(0, 0, 0, 0.6)', fontSize: '0.875rem' }}>Sport</span>}
                  secondary={
                    <span style={{ display: 'inline-block', marginTop: '5px' }}>
                      <Chip 
                        icon={getSportIcon()}
                        label={matchData.sportName || 'Not selected'}
                        color="primary"
                        variant="outlined"
                        size="medium"
                      />
                    </span>
                  }
                />
              </ListItem>
              
              <ListItem sx={{ px: 0 }}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <FitnessCenterIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={<span style={{ color: 'rgba(0, 0, 0, 0.6)', fontSize: '0.875rem' }}>Skill Level</span>}
                  secondary={
                    <Chip 
                      label={matchData.skillLevel}
                      size="small"
                      color={
                        matchData.skillLevel === 'Beginner' ? 'success' : 
                        matchData.skillLevel === 'Intermediate' ? 'primary' : 
                        'secondary'
                      }
                      variant="outlined"
                      sx={{ mt: 0.5 }}
                    />
                  }
                />
              </ListItem>
              
              <ListItem sx={{ px: 0 }}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <EventIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={<span style={{ color: 'rgba(0, 0, 0, 0.6)', fontSize: '0.875rem' }}>Date & Time</span>}
                  secondary={<span style={{ fontSize: '1rem' }}>{formatDateTime()}</span>}
                />
              </ListItem>
              
              <ListItem sx={{ px: 0 }}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <TimerIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={<span style={{ color: 'rgba(0, 0, 0, 0.6)', fontSize: '0.875rem' }}>Duration</span>}
                  secondary={
                    <span style={{ fontSize: '1rem' }}>
                      {matchData.duration} minutes (until {calculateEndTime()})
                    </span>
                  }
                />
              </ListItem>
            </List>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <List disablePadding>
              <ListItem sx={{ px: 0 }}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <LocationOnIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={<span style={{ color: 'rgba(0, 0, 0, 0.6)', fontSize: '0.875rem' }}>Location</span>}
                  secondary={
                    <>
                      <span style={{ fontSize: '1rem', display: 'block' }}>{matchData.location?.name || 'Not set'}</span>
                      <span style={{ fontSize: '0.875rem', color: 'rgba(0, 0, 0, 0.6)', display: 'block' }}>
                        {matchData.courtName ? `Court: ${matchData.courtName}` : ''}
                      </span>
                    </>
                  }
                />
              </ListItem>
              
              <ListItem sx={{ px: 0 }}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <PeopleIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={<span style={{ color: 'rgba(0, 0, 0, 0.6)', fontSize: '0.875rem' }}>Participants</span>}
                  secondary={
                    <span style={{ fontSize: '1rem' }}>
                      {matchData.minParticipants} - {matchData.maxParticipants} participants
                    </span>
                  }
                />
              </ListItem>
              
              <ListItem sx={{ px: 0 }}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <LockIcon color={matchData.isPrivate ? 'primary' : 'disabled'} />
                </ListItemIcon>
                <ListItemText
                  primary={<span style={{ color: 'rgba(0, 0, 0, 0.6)', fontSize: '0.875rem' }}>Privacy</span>}
                  secondary={
                    <span style={{ fontSize: '1rem' }}>
                      {matchData.isPrivate ? 'Private Match (Invitation Only)' : 'Public Match (Anyone Can Join)'}
                    </span>
                  }
                />
              </ListItem>
              
              <ListItem sx={{ px: 0 }}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <DescriptionIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={<span style={{ color: 'rgba(0, 0, 0, 0.6)', fontSize: '0.875rem' }}>Description</span>}
                  secondary={
                    <span 
                      style={{
                        fontSize: '1rem',
                        whiteSpace: 'pre-wrap',
                        display: '-webkit-box',
                        WebkitLineClamp: 4,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {matchData.description || 'No description provided'}
                    </span>
                  }
                />
              </ListItem>
            </List>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Host Information */}
      <Paper elevation={2} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
        <Typography variant="h3" component="h3" gutterBottom>
          Host Information
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Avatar
            sx={{
              width: 48,
              height: 48,
              bgcolor: 'primary.main',
              fontSize: '1.25rem',
              mr: 2
            }}
          >
            U
          </Avatar>
          <Box>
            <Typography variant="body1" fontWeight={500}>
              You will be listed as the host
            </Typography>
            <Typography variant="body2" color="text.secondary">
              As the host, you'll be responsible for managing the match and participants
            </Typography>
          </Box>
        </Box>
      </Paper>
      
      {/* Terms and Conditions */}
      <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h3" component="h3" gutterBottom>
          Terms and Conditions
        </Typography>
        
        <Typography variant="body2" paragraph>
          By creating this match, you acknowledge and agree to the following:
        </Typography>
        
        <List dense sx={{ ml: 2 }}>
          <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
            <Typography variant="body2">
              You will follow all UiTM facility rules and regulations
            </Typography>
          </ListItem>
          <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
            <Typography variant="body2">
              You are responsible for the behavior of participants during your match
            </Typography>
          </ListItem>
          <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
            <Typography variant="body2">
              You will arrive on time and ensure the facility is left in good condition
            </Typography>
          </ListItem>
          <ListItem sx={{ display: 'list-item', listStyleType: 'disc' }}>
            <Typography variant="body2">
              You will notify participants of any changes or cancellations
            </Typography>
          </ListItem>
        </List>
        
        <FormControlLabel
          control={
            <Checkbox
              checked={termsAccepted}
              onChange={handleTermsAcceptedChange}
              color="primary"
            />
          }
          label="I accept the terms and conditions"
          sx={{ mt: 2 }}
        />
      </Paper>
    </Box>
  );
};

export default MatchReview;
