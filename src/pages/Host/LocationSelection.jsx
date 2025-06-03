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
  Skeleton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import SportsBasketballIcon from '@mui/icons-material/SportsBasketball';
import SportsTennisIcon from '@mui/icons-material/SportsTennis';
import SportsVolleyballIcon from '@mui/icons-material/SportsVolleyball';
import { useAuth } from '../../hooks/useAuth';

const LocationSelection = ({ matchData, onUpdateMatchData }) => {
  const { supabase } = useAuth();
  const [locations, setLocations] = useState([]);
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Mock data for locations
  const mockLocations = [
    {
      id: 1,
      name: 'Padang Pusat Sukan A',
      address: 'UiTM Shah Alam, Kompleks Sukan, Level 1',
      sportTypes: ['football', 'futsal'],
      sportIcons: [<SportsSoccerIcon key="football" />],
      capacity: 30,
      facilities: ['Changing Rooms', 'Showers', 'Water Cooler'],
      courtCount: 2,
      availableCourts: ['Court A1', 'Court A2']
    },
    {
      id: 2,
      name: 'Court Pusat Sukan B',
      address: 'UiTM Shah Alam, Kompleks Sukan, Level 2',
      sportTypes: ['basketball', 'volleyball'],
      sportIcons: [<SportsBasketballIcon key="basketball" />, <SportsVolleyballIcon key="volleyball" />],
      capacity: 20,
      facilities: ['Changing Rooms', 'Water Cooler'],
      courtCount: 3,
      availableCourts: ['Court B1', 'Court B2', 'Court B3']
    },
    {
      id: 3,
      name: 'Court Pusat Sukan C',
      address: 'UiTM Shah Alam, Kompleks Sukan, Level 1',
      sportTypes: ['badminton'],
      sportIcons: [<SportsTennisIcon key="badminton" />],
      capacity: 16,
      facilities: ['Changing Rooms', 'Showers', 'Water Cooler', 'Equipment Rental'],
      courtCount: 8,
      availableCourts: ['Court C1', 'Court C2', 'Court C3', 'Court C4', 'Court C5', 'Court C6', 'Court C7', 'Court C8']
    },
    {
      id: 4,
      name: 'Court Perindu A',
      address: 'UiTM Shah Alam, Kolej Perindu, Block A',
      sportTypes: ['basketball', 'volleyball'],
      sportIcons: [<SportsBasketballIcon key="basketball" />, <SportsVolleyballIcon key="volleyball" />],
      capacity: 15,
      facilities: ['Water Cooler'],
      courtCount: 1,
      availableCourts: ['Main Court']
    },
    {
      id: 5,
      name: 'Court Perindu B',
      address: 'UiTM Shah Alam, Kolej Perindu, Block B',
      sportTypes: ['futsal'],
      sportIcons: [<SportsSoccerIcon key="futsal" />],
      capacity: 14,
      facilities: ['Water Cooler', 'Seating Area'],
      courtCount: 1,
      availableCourts: ['Main Court']
    },
    {
      id: 6,
      name: 'UiTM Running Track',
      address: 'UiTM Shah Alam, Pusat Sukan',
      sportTypes: ['running'],
      sportIcons: [],
      capacity: 50,
      facilities: ['Water Station', 'Changing Rooms', 'Lockers'],
      courtCount: 1,
      availableCourts: ['Main Track']
    }
  ];
  
  // Function to fetch real locations from Supabase
  const fetchLocations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      if (data && data.length > 0) {
        // Transform database locations to match our UI format
        const formattedLocations = data.map(location => {
          // Determine sport types from the facilities or other data
          // This is a simplified approach - you may need to adjust based on your schema
          const sportTypes = [];
          const sportIcons = [];
          
          // For simplicity, we'll make some assumptions based on the location name
          if (location.name.toLowerCase().includes('basketball')) {
            sportTypes.push('basketball');
            sportIcons.push(<SportsBasketballIcon key="basketball" />);
          }
          if (location.name.toLowerCase().includes('badminton')) {
            sportTypes.push('badminton');
            sportIcons.push(<SportsTennisIcon key="badminton" />);
          }
          if (location.name.toLowerCase().includes('futsal') || location.name.toLowerCase().includes('football')) {
            sportTypes.push('futsal', 'football');
            sportIcons.push(<SportsSoccerIcon key="futsal" />);
          }
          if (location.name.toLowerCase().includes('volleyball')) {
            sportTypes.push('volleyball');
            sportIcons.push(<SportsVolleyballIcon key="volleyball" />);
          }
          
          // If no specific sports found, assume it supports all sports
          if (sportTypes.length === 0) {
            sportTypes.push('football', 'futsal', 'basketball', 'badminton', 'volleyball', 'running');
            sportIcons.push(<SportsSoccerIcon key="general" />);
          }
          
          // Generate courts based on facilities data or defaults
          const courtCount = location.facilities?.courts || 2;
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
          
          // Use sensible defaults if no facilities data
          if (facilities.length === 0) {
            facilities.push('Basic Facilities');
          }
          
          return {
            id: location.id, // Use the UUID from the database
            name: location.name,
            address: location.address || location.campus || 'UiTM Campus',
            sportTypes,
            sportIcons,
            capacity: location.capacity || 20,
            facilities,
            courtCount,
            availableCourts
          };
        });
        
        console.log('Fetched real locations from Supabase:', formattedLocations);
        setLocations(formattedLocations);
        
        // Filter by sport if needed
        if (matchData.sport) {
          const sportSpecificLocations = formattedLocations.filter(location => 
            location.sportTypes.includes(matchData.sport)
          );
          setFilteredLocations(sportSpecificLocations);
        } else {
          setFilteredLocations(formattedLocations);
        }
      } else {
        console.warn('No locations found in database, falling back to mock data');
        // Fallback to mock data if no locations found
        const sportSpecificLocations = mockLocations.filter(location => 
          !matchData.sport || location.sportTypes.includes(matchData.sport)
        );
        setLocations(sportSpecificLocations);
        setFilteredLocations(sportSpecificLocations);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      // Fallback to mock data on error
      const sportSpecificLocations = mockLocations.filter(location => 
        !matchData.sport || location.sportTypes.includes(matchData.sport)
      );
      setLocations(sportSpecificLocations);
      setFilteredLocations(sportSpecificLocations);
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
                      
                      <Grid item xs={12} sm={4}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                          <Typography variant="body2" fontWeight={500} gutterBottom>
                            Available for:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 'auto' }}>
                            {location.sportTypes.map((sport, index) => (
                              <Chip 
                                key={index}
                                icon={location.sportIcons[index]}
                                label={sport.charAt(0).toUpperCase() + sport.slice(1)}
                                size="small"
                                color={sport === matchData.sport ? 'primary' : 'default'}
                                variant={sport === matchData.sport ? 'filled' : 'outlined'}
                              />
                            ))}
                          </Box>
                          
                          <Typography variant="body2" fontWeight={500} sx={{ mt: 2, mb: 1 }}>
                            {location.courtCount} {location.courtCount === 1 ? 'Court' : 'Courts'} Available
                          </Typography>
                        </Box>
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
        <Box sx={{ mt: 3, bgcolor: 'secondary.light', p: 2, borderRadius: 2 }}>
          <Typography variant="body1" color="text.secondary">
            <strong>Selected Location:</strong> {matchData.location.name}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            <strong>Selected Court:</strong> {matchData.courtName}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default LocationSelection;
