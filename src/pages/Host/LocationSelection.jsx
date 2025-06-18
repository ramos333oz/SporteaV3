import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid,
  Card,
  CardContent,
  CardActionArea,
  TextField,
  InputAdornment,
  Divider,
  Chip,
  Paper,
  Skeleton,
  CircularProgress
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import SportsBasketballIcon from '@mui/icons-material/SportsBasketball';
import SportsTennisIcon from '@mui/icons-material/SportsTennis';
import SportsVolleyballIcon from '@mui/icons-material/SportsVolleyball';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import SportsRugbyIcon from '@mui/icons-material/SportsRugby';
import SportsHockeyIcon from '@mui/icons-material/SportsHockey';
import ErrorIcon from '@mui/icons-material/Error';
import { useAuth } from '../../hooks/useAuth';

const LocationSelection = ({ matchData, onUpdateMatchData }) => {
  const { supabase } = useAuth();
  const [locations, setLocations] = useState([]);
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sports, setSports] = useState({});
  
  // Get appropriate sport icon based on sport name
  const getSportIcon = (sportName) => {
    if (!sportName) return <FitnessCenterIcon />;
    
    const name = sportName.toLowerCase();
    if (name.includes('football') || name.includes('soccer')) {
      return <SportsSoccerIcon />;
    } else if (name.includes('futsal')) {
      return <SportsSoccerIcon />;
    } else if (name.includes('basketball')) {
      return <SportsBasketballIcon />;
    } else if (name.includes('volleyball')) {
      return <SportsVolleyballIcon />;
    } else if (name.includes('tennis') || name.includes('badminton')) {
      return <SportsTennisIcon />;
    } else if (name.includes('rugby')) {
      return <SportsRugbyIcon />;
    } else if (name.includes('hockey')) {
      return <SportsHockeyIcon />;
    } else if (name.includes('frisbee')) {
      return <FitnessCenterIcon />;
    }
    
    return <FitnessCenterIcon />;
  };
  
  // Function to fetch real locations from Supabase
  const fetchLocations = async () => {
    setLoading(true);
    setError(null);
    try {
      // First, fetch all sports to get their names and IDs
      const { data: sportsData, error: sportsError } = await supabase
        .from('sports')
        .select('id, name');
        
      if (sportsError) {
        console.error('Error fetching sports:', sportsError);
        throw sportsError;
      }
      
      // Create a map of sport IDs to names for quick lookup
      const sportsMap = {};
      if (sportsData && sportsData.length > 0) {
        sportsData.forEach(sport => {
          sportsMap[sport.id] = sport.name;
        });
        setSports(sportsMap);
      }

      // Get the sport ID based on matchData.sport (could be name or ID)
      let sportId = matchData.sport;
      let sportName = '';
      
      // If matchData.sport is not a UUID, try to find its ID from the sports map
      if (matchData.sport && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(matchData.sport)) {
        // Find the sport ID by comparing names
        const foundSportEntry = Object.entries(sportsMap).find(([id, name]) => 
          name.toLowerCase() === matchData.sport.toLowerCase() ||
          name.toLowerCase().includes(matchData.sport.toLowerCase()) ||
          matchData.sport.toLowerCase().includes(name.toLowerCase())
        );
        
        if (foundSportEntry) {
          sportId = foundSportEntry[0]; // The ID
          sportName = foundSportEntry[1]; // The name
        } else {
          sportName = matchData.sport;
        }
      } else if (sportsMap[matchData.sport]) {
        // If it's already a UUID, get the name
        sportName = sportsMap[matchData.sport];
      }

      console.log(`Fetching locations for sport: ${sportName} (ID: ${sportId})`);

      // Query locations with the sport ID in supported_sports
      let query = supabase
        .from('locations')
        .select('*')
        .order('name', { ascending: true });
      
      // If we have a valid sport ID, filter by it
      if (sportId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sportId)) {
        // Filter locations with the sportId in the supported_sports array
        query = query.contains('supported_sports', [sportId]);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      if (data && data.length > 0) {
        // Transform database locations to match our UI format
        const formattedLocations = data.map(location => {
          // Determine sport types from supported_sports field
          const sportTypes = [];
          const sportIcons = [];
          
          // Check if location has supported_sports field
          if (location.supported_sports && Array.isArray(location.supported_sports) && location.supported_sports.length > 0) {
            // Map sport IDs to sport names
            location.supported_sports.forEach(sportId => {
              const sportName = sportsMap[sportId];
              if (sportName) {
                sportTypes.push(sportName);
                sportIcons.push(getSportIcon(sportName));
              }
            });
          }
          
          // Generate courts based on facilities data or defaults
          const courtCount = location.facilities?.courts || 1;
          const availableCourts = Array(courtCount).fill(0).map((_, i) => `Court ${String.fromCharCode(65 + Math.floor(i/8))}${i % 8 + 1}`);
          
          // Extract facilities into an array
          const facilities = [];
          if (location.facilities) {
            if (location.facilities.lighting) facilities.push('Lighting');
            if (location.facilities.restrooms) facilities.push('Restrooms');
            if (location.facilities.water_fountains) facilities.push('Water Fountains');
            if (location.facilities.changing_rooms) facilities.push('Changing Rooms');
            if (location.facilities.equipment_rental) facilities.push('Equipment Rental');
          }
          
          // Use campus name as a basic facility if none specified
          if (facilities.length === 0) {
            facilities.push(location.campus || 'UiTM Campus');
          }

          // Extract coordinates for map display
          const coordinates = location.coordinates ? {
            lat: location.coordinates.lat,
            lng: location.coordinates.lng
          } : null;
          
          return {
            id: location.id, // Use the UUID from the database
            name: location.name,
            address: location.address || location.campus || 'UiTM Campus',
            sportTypes,
            sportIcons,
            capacity: location.capacity || 20,
            facilities,
            courtCount,
            availableCourts,
            coordinates,
            raw: location // Store the raw location data for debugging if needed
          };
        });
        
        console.log('Fetched real locations from Supabase:', formattedLocations);
        setLocations(formattedLocations);
        
        // If we don't have a valid UUID but we have a sport name, filter by name
        if ((!sportId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sportId)) && sportName) {
          // Filter locations by sport name
          const sportSpecificLocations = formattedLocations.filter(location => {
            // Check if any of the sportTypes match the sport name
            return location.sportTypes.some(type => 
              type.toLowerCase().includes(sportName.toLowerCase()) || 
              sportName.toLowerCase().includes(type.toLowerCase())
            );
          });
          
          setFilteredLocations(sportSpecificLocations);
        } else {
          // If we have a valid UUID, the query already filtered by supported_sports
          setFilteredLocations(formattedLocations);
        }
      } else {
        console.warn('No locations found in database for this sport');
        setLocations([]);
        setFilteredLocations([]);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      setError('Failed to load locations. Please try again later.');
      setLocations([]);
      setFilteredLocations([]);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    // Fetch locations when the component mounts or sport changes
    fetchLocations();
  }, [matchData.sport]);
  
  useEffect(() => {
    // Filter locations based on search query
    if (searchQuery.trim() === '') {
      setFilteredLocations(locations);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = locations.filter(location => 
        location.name.toLowerCase().includes(query) || 
        location.address.toLowerCase().includes(query)
      );
      setFilteredLocations(filtered);
    }
  }, [searchQuery, locations]);
  
  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };
  
  const handleSelectLocation = (location) => {
    onUpdateMatchData({ 
      location: location,
      location_id: location.id, // Make sure to include the location_id
      courtName: location.availableCourts[0] // Default to first court
    });
  };
  
  const handleSelectCourt = (courtName) => {
    onUpdateMatchData({ courtName });
  };
  
  return (
    <Box>
      <Typography variant="h2" component="h2" gutterBottom>
        Select Location
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Choose a venue for your {matchData.sport} match. The available locations support your selected sport and have the necessary facilities.
      </Typography>
      
      {/* Search Bar */}
      <TextField
        fullWidth
        id="location-search"
        placeholder="Search for locations..."
        variant="outlined"
        value={searchQuery}
        onChange={handleSearchChange}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />
      
      {/* Error message */}
      {error && (
        <Paper sx={{ p: 3, mb: 3, bgcolor: 'error.light', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ErrorIcon sx={{ mr: 1, color: 'error.main' }} />
            <Typography color="error.main">{error}</Typography>
          </Box>
        </Paper>
      )}
      
      {/* Locations Grid */}
      <Grid container spacing={2}>
        {loading ? (
          // Loading skeletons
          Array(3).fill().map((_, index) => (
            <Grid item xs={12} key={`skeleton-${index}`}>
              <Skeleton variant="rectangular" height={150} sx={{ borderRadius: 2 }} />
            </Grid>
          ))
        ) : filteredLocations.length === 0 ? (
          // No locations found
          <Grid item xs={12}>
            <Paper 
              sx={{ 
                p: 3, 
                textAlign: 'center',
                borderRadius: 2
              }}
            >
              <LocationOnIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="h3" gutterBottom>
                No locations found
              </Typography>
              <Typography variant="body1" color="text.secondary">
                There are no available venues for {matchData.sport} that match your search criteria.
              </Typography>
            </Paper>
          </Grid>
        ) : (
          // Location cards
          filteredLocations.map((location) => (
            <Grid item xs={12} key={location.id}>
              <Card 
                elevation={matchData.location?.id === location.id ? 3 : 1}
                sx={{ 
                  borderRadius: 2,
                  border: matchData.location?.id === location.id ? 2 : 0,
                  borderColor: 'primary.main',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: matchData.location?.id !== location.id ? 'translateY(-4px)' : 'none',
                  }
                }}
              >
                <CardActionArea 
                  onClick={() => handleSelectLocation(location)}
                  disabled={matchData.location?.id === location.id}
                >
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        {/* Venue Image */}
                        <Box 
                          sx={{ 
                            width: '100%', 
                            height: '150px', 
                            borderRadius: 1, 
                            overflow: 'hidden',
                            mb: 1,
                            bgcolor: 'action.hover'
                          }}
                        >
                          <img 
                            src={location.raw.image_url || `https://placehold.co/500x300/e0e0e0/7a7a7a?text=${encodeURIComponent(location.name)}`} 
                            alt={location.name}
                            style={{ 
                              width: '100%', 
                              height: '100%', 
                              objectFit: 'cover',
                              objectPosition: 'center'
                            }}
                            loading="lazy"
                          />
                        </Box>
                        
                        {/* Sport types */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                          <Typography variant="body2" fontWeight={500} gutterBottom>
                            Available for:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                            {location.sportTypes.map((sport, index) => (
                              <Chip 
                                key={index}
                                icon={location.sportIcons[index]}
                                label={sport.charAt(0).toUpperCase() + sport.slice(1)}
                                size="small"
                                color={
                                  sport.toLowerCase() === matchData.sport?.toLowerCase() ||
                                  sport.toLowerCase().includes(matchData.sport?.toLowerCase()) ||
                                  matchData.sport?.toLowerCase().includes(sport.toLowerCase())
                                    ? 'primary' 
                                    : 'default'
                                }
                                variant={
                                  sport.toLowerCase() === matchData.sport?.toLowerCase() ||
                                  sport.toLowerCase().includes(matchData.sport?.toLowerCase()) ||
                                  matchData.sport?.toLowerCase().includes(sport.toLowerCase())
                                    ? 'filled' 
                                    : 'outlined'
                                }
                              />
                            ))}
                          </Box>
                          
                          <Typography variant="body2" fontWeight={500} gutterBottom>
                            {location.courtCount} {location.courtCount === 1 ? 'Court' : 'Courts'} Available
                          </Typography>
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12} sm={8}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Typography variant="h3" component="h3" sx={{ flexGrow: 1 }}>
                            {location.name}
                          </Typography>
                          {matchData.location?.id === location.id && (
                            <CheckCircleIcon color="primary" />
                          )}
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <LocationOnIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                          <Typography variant="body2" color="text.secondary">
                            {location.address}
                          </Typography>
                        </Box>
                        
                        {/* Mini map preview if coordinates available */}
                        {location.coordinates && (
                          <Box 
                            sx={{ 
                              mb: 2,
                              height: '80px',
                              borderRadius: 1,
                              overflow: 'hidden',
                              border: '1px solid',
                              borderColor: 'divider',
                              position: 'relative',
                              '&::after': {
                                content: '""',
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                backgroundColor: 'primary.main',
                                border: '2px solid white',
                                zIndex: 10
                              }
                            }}
                          >
                            <img 
                              src={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+1976d2(${location.coordinates.lng},${location.coordinates.lat})/${location.coordinates.lng},${location.coordinates.lat},15,0/300x100?access_token=pk.eyJ1IjoiZXhhbXBsZXVzZXIiLCJhIjoiY2xoOGF5cHpiMWJvbzNlbnV6NWw3Z2s5dSJ9.3MXKwQOfEuICLqZ8w8kJkw`}
                              alt="Location Map"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </Box>
                        )}
                        
                        {/* Facility chips */}
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                          {location.facilities.map((facility, index) => (
                            <Chip 
                              key={index} 
                              label={facility} 
                              size="small" 
                              variant="outlined"
                            />
                          ))}
                        </Box>
                        
                        <Typography variant="body2">
                          <strong>Capacity:</strong> Up to {location.capacity} participants
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </CardActionArea>
                
                {matchData.location?.id === location.id && (
                  <>
                    <Divider />
                    <Box sx={{ p: 2 }}>
                      <Typography variant="body1" fontWeight={500} gutterBottom>
                        Select a Specific Court:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {location.availableCourts.map((court, index) => (
                          <Chip 
                            key={index}
                            label={court}
                            onClick={() => handleSelectCourt(court)}
                            color={matchData.courtName === court ? 'primary' : 'default'}
                            variant={matchData.courtName === court ? 'filled' : 'outlined'}
                            sx={{ px: 1 }}
                          />
                        ))}
                      </Box>
                    </Box>
                  </>
                )}
              </Card>
            </Grid>
          ))
        )}
      </Grid>
      
      {matchData.location && (
        <Paper sx={{ mt: 4, p: 3, borderRadius: 2 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box sx={{ textAlign: 'left' }}>
                <Typography variant="h3" gutterBottom>
                  Selected Location: {matchData.location.name}
                </Typography>
                
                <Typography variant="body1" sx={{ mb: 2, fontWeight: 500, color: 'primary.main' }}>
                  {matchData.courtName ? `Selected court: ${matchData.courtName}` : 'No specific court selected'}
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <LocationOnIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                    <Typography variant="body1">{matchData.location.address}</Typography>
                  </Box>
                  
                  {matchData.location.sportTypes.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <SportsSoccerIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                      <Typography variant="body1">
                        Sports: {matchData.location.sportTypes.join(', ')}
                      </Typography>
                    </Box>
                  )}
                </Box>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {matchData.location.facilities.map((facility, index) => (
                    <Chip 
                      key={index} 
                      label={facility} 
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              {/* Larger map view for the selected location */}
              {matchData.location.coordinates && (
                <Box 
                  sx={{ 
                    width: '100%',
                    height: '200px',
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <img 
                    src={`https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-l+1976d2(${matchData.location.coordinates.lng},${matchData.location.coordinates.lat})/${matchData.location.coordinates.lng},${matchData.location.coordinates.lat},15,0/600x300?access_token=pk.eyJ1IjoiZXhhbXBsZXVzZXIiLCJhIjoiY2xoOGF5cHpiMWJvbzNlbnV6NWw3Z2s5dSJ9.3MXKwQOfEuICLqZ8w8kJkw`}
                    alt="Selected Location Map"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </Box>
              )}
            </Grid>
          </Grid>
        </Paper>
      )}
    </Box>
  );
};

export default LocationSelection;
