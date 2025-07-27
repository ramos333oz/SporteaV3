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
// import ValidationStatus from './ValidationStatus';

const MatchReview = ({ matchData, onUpdateMatchData }) => {
  const [termsAccepted, setTermsAccepted] = React.useState(false);
  const [canCreateMatch, setCanCreateMatch] = React.useState(true);
  
  const handleTermsAcceptedChange = (event) => {
    setTermsAccepted(event.target.checked);
    onUpdateMatchData({
      termsAccepted: event.target.checked,
      canCreateMatch: event.target.checked && canCreateMatch
    });
  };

  const handleValidationChange = (isValid) => {
    setCanCreateMatch(isValid);
    onUpdateMatchData({
      canCreateMatch: isValid && termsAccepted
    });
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
      {/* Modern Header Section */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: 'grey.50' }}>
        <Typography
          variant="h2"
          component="h2"
          sx={{
            mb: 1.5,
            fontWeight: 600,
            color: 'text.primary',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          Review Match Details
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: 'text.secondary',
            fontSize: '0.875rem',
            lineHeight: 1.5
          }}
        >
          Please review all match details before creating your match. You'll be able to edit these details after creation if needed.
        </Typography>
      </Paper>

      {/* Validation Status Component - Temporarily disabled for debugging */}
      {/* <ValidationStatus
        matchData={matchData}
        onValidationChange={handleValidationChange}
      /> */}

      <Paper sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: 'grey.50', boxShadow: '0 6px 20px rgba(0,0,0,0.08)' }}>
        {/* Modern Header */}
        <Box sx={{ mb: 1.5 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: 'text.secondary',
              fontSize: '0.875rem',
              mb: 2
            }}
          >
            Match Details
          </Typography>
          <Typography
            variant="h3"
            component="h3"
            sx={{
              fontWeight: 600,
              color: 'text.primary',
              fontSize: '1.25rem'
            }}
          >
            {matchData.title || 'Untitled Match'}
          </Typography>
        </Box>
        
        <Box sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          '& > *': { flex: '1 1 300px' }
        }}>
          <Box>
            <List disablePadding sx={{
              '& .MuiListItem-root': {
                px: 0,
                py: 1,
                borderRadius: 1,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  bgcolor: 'action.hover'
                }
              }
            }}>
              <ListItem>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <TitleIcon sx={{ fontSize: '1.1rem', color: 'primary.main' }} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="caption" sx={{
                      color: 'text.secondary',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Title
                    </Typography>
                  }
                  secondary={
                    <Typography variant="body2" sx={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: 'text.primary',
                      mt: 0.5
                    }}>
                      {matchData.title || 'Not set'}
                    </Typography>
                  }
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Box sx={{ fontSize: '1.1rem', color: 'primary.main' }}>
                    {getSportIcon()}
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="caption" sx={{
                      color: 'text.secondary',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Sport
                    </Typography>
                  }
                  secondary={
                    <Chip
                      label={matchData.sportName || 'Not selected'}
                      variant="filled"
                      size="small"
                      sx={{
                        mt: 0.5,
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        fontWeight: 500,
                        fontSize: '0.75rem'
                      }}
                    />
                  }
                />
              </ListItem>

              <ListItem>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <FitnessCenterIcon sx={{ fontSize: '1.1rem', color: 'primary.main' }} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="caption" sx={{
                      color: 'text.secondary',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Skill Level
                    </Typography>
                  }
                  secondary={
                    <Chip
                      label={matchData.skillLevel}
                      size="small"
                      variant="filled"
                      sx={{
                        mt: 0.5,
                        bgcolor: matchData.skillLevel === 'Beginner' ? 'success.main' :
                                matchData.skillLevel === 'Intermediate' ? 'warning.main' :
                                'error.main',
                        color: 'white',
                        fontWeight: 500,
                        fontSize: '0.75rem'
                      }}
                    />
                  }
                />
              </ListItem>

              <ListItem>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <EventIcon sx={{ fontSize: '1.1rem', color: 'primary.main' }} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="caption" sx={{
                      color: 'text.secondary',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Date & Time
                    </Typography>
                  }
                  secondary={
                    <Typography variant="body2" sx={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: 'text.primary',
                      mt: 0.5
                    }}>
                      {formatDateTime()}
                    </Typography>
                  }
                />
              </ListItem>

              <ListItem>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <TimerIcon sx={{ fontSize: '1.1rem', color: 'primary.main' }} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="caption" sx={{
                      color: 'text.secondary',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Duration
                    </Typography>
                  }
                  secondary={
                    <Typography variant="body2" sx={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: 'text.primary',
                      mt: 0.5
                    }}>
                      {matchData.duration} minutes (until {calculateEndTime()})
                    </Typography>
                  }
                />
              </ListItem>
            </List>
          </Box>

          <Box>
            <List disablePadding sx={{
              '& .MuiListItem-root': {
                px: 0,
                py: 1,
                borderRadius: 1,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  bgcolor: 'action.hover'
                }
              }
            }}>
              <ListItem>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <LocationOnIcon sx={{ fontSize: '1.1rem', color: 'primary.main' }} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="caption" sx={{
                      color: 'text.secondary',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Location
                    </Typography>
                  }
                  secondary={
                    <Box sx={{ mt: 0.5 }}>
                      <Typography variant="body2" sx={{
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: 'text.primary'
                      }}>
                        {matchData.location?.name || 'Not set'}
                      </Typography>
                      {matchData.courtName && (
                        <Typography variant="caption" sx={{
                          fontSize: '0.75rem',
                          color: 'text.secondary',
                          display: 'block'
                        }}>
                          Court: {matchData.courtName}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>

              <ListItem>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <PeopleIcon sx={{ fontSize: '1.1rem', color: 'primary.main' }} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="caption" sx={{
                      color: 'text.secondary',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Participants
                    </Typography>
                  }
                  secondary={
                    <Typography variant="body2" sx={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: 'text.primary',
                      mt: 0.5
                    }}>
                      {matchData.minParticipants} - {matchData.maxParticipants} participants
                    </Typography>
                  }
                />
              </ListItem>

              <ListItem>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <LockIcon sx={{
                    fontSize: '1.1rem',
                    color: matchData.isPrivate ? 'error.main' : 'success.main'
                  }} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="caption" sx={{
                      color: 'text.secondary',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Privacy
                    </Typography>
                  }
                  secondary={
                    <Chip
                      label={matchData.isPrivate ? 'Private Match (Invitation Only)' : 'Public Match (Anyone Can Join)'}
                      size="small"
                      variant="filled"
                      sx={{
                        mt: 0.5,
                        bgcolor: matchData.isPrivate ? 'error.main' : 'success.main',
                        color: 'white',
                        fontWeight: 500,
                        fontSize: '0.75rem'
                      }}
                    />
                  }
                />
              </ListItem>

              <ListItem>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <DescriptionIcon sx={{ fontSize: '1.1rem', color: 'primary.main' }} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="caption" sx={{
                      color: 'text.secondary',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Description
                    </Typography>
                  }
                  secondary={
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: '0.875rem',
                        fontWeight: 400,
                        color: 'text.primary',
                        mt: 0.5,
                        whiteSpace: 'pre-wrap',
                        display: '-webkit-box',
                        WebkitLineClamp: 4,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.4
                      }}
                    >
                      {matchData.description || 'No description provided'}
                    </Typography>
                  }
                />
              </ListItem>
            </List>
          </Box>
        </Box>
      </Paper>
      
      {/* Host Information */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: 'grey.50', boxShadow: '0 6px 20px rgba(0,0,0,0.08)' }}>
        <Box sx={{ mb: 1.5 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: 'text.secondary',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              fontSize: '0.875rem'
            }}
          >
            <Avatar
              sx={{
                width: 24,
                height: 24,
                bgcolor: 'primary.main',
                fontSize: '0.75rem'
              }}
            >
              U
            </Avatar>
            Host Information
          </Typography>
        </Box>

        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          p: 2,
          borderRadius: 1,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider'
        }}>
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: 'primary.main',
              fontSize: '1rem',
              mr: 2
            }}
          >
            U
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              You will be listed as the host
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
              As the host, you'll be responsible for managing the match and participants
            </Typography>
          </Box>
        </Box>
      </Paper>
      
      {/* Terms and Conditions */}
      <Paper sx={{ p: 2, borderRadius: 2, bgcolor: 'grey.50', boxShadow: '0 6px 20px rgba(0,0,0,0.08)' }}>
        <Box sx={{ mb: 1.5 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: 'text.secondary',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              fontSize: '0.875rem'
            }}
          >
            Terms and Conditions
          </Typography>
        </Box>

        <Box sx={{
          p: 2,
          borderRadius: 1,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          mb: 2
        }}>
          <Typography variant="body2" sx={{
            fontSize: '0.875rem',
            color: 'text.primary',
            mb: 1.5,
            fontWeight: 500
          }}>
            By creating this match, you acknowledge and agree to the following:
          </Typography>

          <Box component="ul" sx={{
            pl: 2,
            m: 0,
            '& li': {
              fontSize: '0.75rem',
              color: 'text.secondary',
              lineHeight: 1.5,
              mb: 0.5
            }
          }}>
            <li>You will follow all UiTM facility rules and regulations</li>
            <li>You are responsible for the behavior of participants during your match</li>
            <li>You will arrive on time and ensure the facility is left in good condition</li>
            <li>You will notify participants of any changes or cancellations</li>
          </Box>
        </Box>

        <Box sx={{
          p: 2,
          borderRadius: 1.5,
          border: '2px solid',
          borderColor: !termsAccepted ? 'error.main' : 'success.main',
          bgcolor: !termsAccepted ? 'error.light' : 'success.light',
          transition: 'all 0.2s ease-in-out'
        }}>
          <FormControlLabel
            required
            control={
              <Checkbox
                checked={termsAccepted}
                onChange={handleTermsAcceptedChange}
                color="primary"
                sx={{
                  '& .MuiSvgIcon-root': {
                    fontSize: '1.2rem'
                  }
                }}
              />
            }
            label={
              <Typography sx={{
                fontWeight: 600,
                fontSize: '0.875rem',
                color: 'text.primary'
              }}>
                I accept the terms and conditions
              </Typography>
            }
          />
          {!termsAccepted && (
            <Typography variant="caption" sx={{
              display: 'block',
              mt: 1,
              color: 'error.main',
              fontSize: '0.75rem',
              fontWeight: 500
            }}>
              You must accept the terms and conditions to create a match
            </Typography>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default MatchReview;
