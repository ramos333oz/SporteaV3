import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
// Import Leaflet CSS directly
import "leaflet/dist/leaflet.css";
// Make sure the CSS is imported before any other related imports
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  ZoomControl,
} from "react-leaflet";
import L, { Icon } from "leaflet"; // Import L from leaflet for bounds creation
// No longer using leaflet-providers

// Fix for Leaflet marker icon issue (add this outside any component)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

import {
  Container,
  Box,
  Grid,
  Typography,
  Paper,
  Card,
  CardContent,
  CardMedia,
  CardHeader,
  CardActionArea,
  Chip,
  Button,
  CardActions,
  Skeleton,
  Tabs,
  Tab,
  Divider,
  Avatar,
  AvatarGroup,
  Alert,
  Badge,
  Tooltip,
  LinearProgress,
  Stack,
  CircularProgress,
  IconButton,
  Collapse,
  FormControl,
  FormGroup,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  Slider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  InputAdornment,
  ButtonGroup,
  InputBase,
  Fab,
  Menu,
} from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PersonIcon from "@mui/icons-material/Person";
import SportsIcon from "@mui/icons-material/Sports";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import SportsTennisIcon from "@mui/icons-material/SportsTennis";
import ImageIcon from "@mui/icons-material/Image";
import SportsVolleyballIcon from "@mui/icons-material/SportsVolleyball";
import SportsRugbyIcon from "@mui/icons-material/SportsRugby";
import SportsHockeyIcon from "@mui/icons-material/SportsHockey";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import FiberNewIcon from "@mui/icons-material/FiberNew";
import PeopleIcon from "@mui/icons-material/People";
import LockIcon from "@mui/icons-material/Lock";
import PublicIcon from "@mui/icons-material/Public";
import RecommendIcon from "@mui/icons-material/Recommend";
import InfoIcon from "@mui/icons-material/Info";
import RefreshIcon from "@mui/icons-material/Refresh";
import FilterListIcon from "@mui/icons-material/FilterList";
import SearchIcon from "@mui/icons-material/Search";
import EventIcon from "@mui/icons-material/Event";
import { useAuth } from "../../hooks/useAuth";
import { useAchievements } from "../../hooks/useAchievements";
import { participantService } from "../../services/supabase";
import { XP_VALUES } from "../../services/achievementService";
// Legacy recommendationServiceV3 removed - now using unifiedRecommendationService
import interactionService from "../../services/interactionService";
import { useNavigate } from "react-router-dom";
import RecommendationsList from "../../components/RecommendationsList";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { Calendar, momentLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import moment from "moment";
import ErrorIcon from "@mui/icons-material/Error";
import SportballIcon from "@mui/icons-material/SportsBasketball";
import SportsScore from "@mui/icons-material/SportsScore";
import GroupIcon from "@mui/icons-material/Group";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { useTheme } from "@mui/material/styles";
import { getVenueImage, getVenueImageAlt } from '../../utils/venueImageMapping';

/**
 * SportIcon component for displaying sport-specific icons
 * @param {string} sportName - The name of the sport
 */
const SportIcon = ({ sportName }) => {
  if (!sportName) return <SportsIcon fontSize="small" />;

  sportName = sportName.toLowerCase();

  // Return appropriate icon based on sport name
  if (
    sportName.includes("football") ||
    sportName.includes("soccer") ||
    sportName.includes("futsal")
  ) {
    return <SportsSoccerIcon fontSize="small" />;
  } else if (sportName.includes("basketball")) {
    return <SportsBasketballIcon fontSize="small" />;
  } else if (sportName.includes("tennis")) {
    return <SportsTennisIcon fontSize="small" />;
  } else if (sportName.includes("volleyball")) {
    return <SportsVolleyballIcon fontSize="small" />;
  } else if (sportName.includes("badminton")) {
    return <SportsTennisIcon fontSize="small" />;
  } else if (sportName.includes("gym") || sportName.includes("fitness")) {
    return <FitnessCenterIcon fontSize="small" />;
  } else if (sportName.includes("rugby")) {
    return <SportsRugbyIcon fontSize="small" />;
  } else if (sportName.includes("hockey")) {
    return <SportsHockeyIcon fontSize="small" />;
  } else if (sportName.includes("frisbee")) {
    return <SportsIcon fontSize="small" />;
  } else if (sportName.includes("squash")) {
    return <SportsTennisIcon fontSize="small" />;
  }

  // Default sports icon for unknown sports
  return <SportsIcon fontSize="small" />;
};

/**
 * FindGames component for displaying available sport matches
 * Uses real data from Supabase passed via props
 * Optimized with React.memo for better performance
 */
const FindGames = React.memo(({ matches: propMatches, sports: propSports }) => {
  // State management
  const { user, supabase } = useAuth();
  const { awardXP } = useAchievements();
  const [matches, setMatches] = useState(propMatches || []);
  const [userCreatedMatches, setUserCreatedMatches] = useState([]);
  const [userParticipations, setUserParticipations] = useState({});
  const [loading, setLoading] = useState(!propMatches);
  const [joinLoading, setJoinLoading] = useState({});
  const [viewMode, setViewMode] = useState(0); // 0: List, 1: Map, 2: Calendar
  
  // Separate filter states for each view
  const [listViewSportFilter, setListViewSportFilter] = useState([]);
  const [mapViewSportFilter, setMapViewSportFilter] = useState("all");
  const [calendarViewSportFilter, setCalendarViewSportFilter] = useState("all");
  // Location filter for list view
  const [locationFilter, setLocationFilter] = useState(null);
  
  // Helper function to get the active sport filter based on current view
  const getActiveSportFilter = () => {
    switch (viewMode) {
      case 0: return listViewSportFilter.length > 0 ? listViewSportFilter : ["all"];
      case 1: return mapViewSportFilter;
      case 2: return calendarViewSportFilter;
      default: return "all";
    }
  };
  
  // For backward compatibility with existing code
  const selectedSportFilter = getActiveSportFilter();

  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const navigate = useNavigate();

  // New state for advanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    skillLevel: "all",
    minSpots: 1,
    maxDistance: 50, // in km
    showPrivate: true,
    showFull: false,
    dateRange: "all", // 'today', 'tomorrow', 'week', 'all'
  });

  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [selectedMatchToJoin, setSelectedMatchToJoin] = useState(null);

  // List of supported sports that align with LocationMapView.jsx and database sports table
  const supportedSports = [
    'Badminton', 'Basketball', 'Football', 'Frisbee', 'Futsal',
    'Hockey', 'Rugby', 'Squash', 'Table Tennis', 'Tennis', 'Volleyball'
  ];

  // Generate sport filters from real data, filtered to only supported sports
  const sportFilters = [
    { id: "all", name: "All Sports", icon: <SportsIcon /> },
    ...(propSports || [])
      .filter(sport => {
        const sportName = (sport.name || "").toLowerCase();
        // Only include sports that are in our supported list
        return supportedSports.some(supportedSport =>
          supportedSport.toLowerCase() === sportName
        );
      })
      .map((sport) => {
        // Map sport names to appropriate icons using the SportIcon component
        const sportName = sport.name || "Unknown Sport";

        return {
          id: sport.id?.toString() || "",
          name: sportName,
          icon: <SportIcon sportName={sportName} />,
        };
      }),
  ];



  // Apply all filters to matches
  const applyFilters = useCallback(
    (sourceMatches) => {
      if (!sourceMatches || sourceMatches.length === 0) return [];

      console.log('Starting applyFilters with sourceMatches:', sourceMatches.length);
      console.log('Sample match from source:', sourceMatches[0]?.title, sourceMatches[0]?.id);
      
      // Log any user created matches in source
      if (user) {
        const userMatches = sourceMatches.filter(m => m.host_id === user.id || m.isUserCreated);
        console.log('User matches in source data:', userMatches.length);
        if (userMatches.length > 0) {
          userMatches.forEach(m => console.log(`User match in source: ${m.id} - ${m.title || 'no title'}`));
        } else {
          console.log('No user matches found in source data - this is the problem');
        }
      }
      
      const filtered = sourceMatches
        .filter((match) => {
          // Always include user created matches in Available Matches tab
          if (user && match.host_id === user.id) {
            console.log('Including user match by host_id:', match.id, match.title);
            return true;
          }
          
          if (match.isUserCreated) {
            console.log('Including user match by isUserCreated flag:', match.id, match.title);
            return true;
          }
          
          // Filter out matches that have already ended
          const now = new Date();
          if (match.start_time) {
            const startTime = new Date(match.start_time);
            const endTime = match.end_time 
              ? new Date(match.end_time) 
              : new Date(startTime.getTime() + (match.duration_minutes || 60) * 60000);
            
            // If the match has ended, don't include it unless it's the user's match
            if (endTime < now) {
              console.log(`Filtering out ended match: ${match.id}, ${match.title}, ended at: ${endTime.toLocaleString()}`);
              return false;
            }
          }
          
          // Apply sport filter
          if (viewMode === 0) {
            // List view - handle array of sport filters
            if (
              listViewSportFilter.length > 0 &&
              !listViewSportFilter.some(
                sportId => 
                  sportId === "all" || 
                  match.sport_id?.toString() === sportId || 
                  match.sport?.id?.toString() === sportId
              )
            ) {
              return false;
            }
          } else if (
            selectedSportFilter !== "all" &&
            match.sport_id?.toString() !== selectedSportFilter &&
            match.sport?.id?.toString() !== selectedSportFilter
          ) {
            return false;
          }
          
          // Apply location filter (only for list view)
          if (viewMode === 0 && locationFilter) {
            // Filter by venue/location ID if available
            if (match.location?.id && locationFilter.id && 
                match.location.id.toString() !== locationFilter.id.toString()) {
              return false;
            }
            
            // Filter by venue/location name as fallback
            else if (match.location?.name && locationFilter.name && 
                    match.location.name !== locationFilter.name) {
              return false;
            }
          }

          // Apply skill level filter
          if (
            filters.skillLevel !== "all" &&
            match.skill_level?.toLowerCase() !==
              filters.skillLevel.toLowerCase()
          ) {
            return false;
          }

          // Apply spots filter - only show matches with at least this many spots left
          const spotsLeft =
            (match.max_participants || 0) - (match.current_participants || 0);
          if (spotsLeft < filters.minSpots) {
            return false;
          }

          // Apply full matches filter
          if (!filters.showFull && spotsLeft <= 0) {
            return false;
          }

          // Apply private matches filter
          if (!filters.showPrivate && match.is_private) {
            return false;
          }

          // Apply date range filter
          if (filters.dateRange !== "all" && match.start_time) {
            const matchDate = new Date(match.start_time);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Set to start of today

            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const nextWeek = new Date(today);
            nextWeek.setDate(nextWeek.getDate() + 7);

            if (
              filters.dateRange === "today" &&
              (matchDate < today || matchDate >= tomorrow)
            ) {
              return false;
            } else if (
              filters.dateRange === "tomorrow" &&
              (matchDate < tomorrow ||
                matchDate >= new Date(tomorrow.getTime() + 86400000))
            ) {
              return false;
            } else if (
              filters.dateRange === "week" &&
              (matchDate < today || matchDate >= nextWeek)
            ) {
              return false;
            }
          }

          // Match passed all filters
          return true;
        })
        .map((match) => ({
          ...match,
          // Mark as updated if it's new or recently modified
          isUpdated:
            match.created_at &&
            new Date(match.created_at) > new Date(Date.now() - 10 * 60 * 1000), // Created in last 10 minutes
        }));

      console.log('Filtered matches count:', filtered.length);
      if (filtered.length > 0) {
        console.log('First filtered match:', filtered[0].id, filtered[0].title);
      }
      
      return filtered;
    },
    [selectedSportFilter, filters, user, viewMode, locationFilter, listViewSportFilter],
  );

  // Fetch user created matches
  useEffect(() => {
    if (!user) return;
    
    const fetchUserMatches = async () => {
      try {
        console.log('Fetching matches for user ID:', user.id);
        
        // Get the current date
        const now = new Date();
        
        // Fetch all matches hosted by the user with full relationship data
        const { data: userData, error: userError } = await supabase
          .from('matches')
          .select(`
            *,
            locations (*),
            sports (*)
          `)
          .eq('host_id', user.id);
          
        if (userError) {
          console.error('Error fetching user matches:', userError);
          throw userError;
        }
        
        console.log('Raw user matches data fetched:', userData?.length || 0, 'matches');
        if (userData?.length > 0) {
          console.log('First user match:', userData[0].id, userData[0].title);
        } else {
          console.log('No user matches found in the database');
        }
        
        // Filter out past matches (where end_time is in the past)
        const activeMatches = userData?.filter(match => {
          if (!match.start_time) {
            console.log('Match missing start_time, excluding:', match.id);
            return false;
          }
          
          // Calculate end time based on start_time + duration
          const startTime = new Date(match.start_time);
          const endTime = match.end_time 
            ? new Date(match.end_time) 
            : new Date(startTime.getTime() + (match.duration_minutes || 60) * 60000);
            
          // Only include matches that haven't ended yet
          const isActive = endTime > now;
          
          if (!isActive) {
            console.log('Filtering out past match:', match.id, match.title);
          } else {
            console.log('Including active match:', match.id, match.title);
          }
          
          return isActive;
        }) || [];
        
        // console.log('Active user matches after filtering past matches:', activeMatches.length);
        
        // Mark these matches as user created for easier filtering
        const enhancedMatches = activeMatches.map(match => {
          // Make sure we have all required fields set
          return {
            ...match,
            isUserCreated: true,
            // Make sure these values are set to avoid undefined errors
            title: match.title || `Match on ${new Date(match.start_time).toLocaleDateString()}`,
            current_participants: match.current_participants || 1,
            max_participants: match.max_participants || 10
          };
        });
        
        console.log('Enhanced user matches ready for state:', enhancedMatches.length);
        enhancedMatches.forEach(m => console.log(`Enhanced user match: ${m.id} - ${m.title}`));
        
        // Set to state
        setUserCreatedMatches(enhancedMatches);
      } catch (error) {
        console.error('Error in fetchUserMatches:', error);
      }
    };
    
    fetchUserMatches();
  }, [user, supabase]);

  // Fetch user participations when user and matches are available
  useEffect(() => {
    if (user && matches.length > 0) {
      fetchUserParticipations();
    }
  }, [user, matches.length]);

  // Update matches when props, user matches, or filter changes
  useEffect(() => {
    if (propMatches) {
      // Production logging optimization: Temporarily disable all logging for performance testing
      // if (import.meta.env.DEV) {
      //   console.log("Running match update effect with propMatches:", propMatches.length);
      // }
      setLoading(false);

      // Make a fresh copy of prop matches
      const allMatches = propMatches.slice();

      // Production logging optimization: Temporarily disable all logging for performance testing
      // if (import.meta.env.DEV) {
      //   console.log('Initial propMatches count:', allMatches.length);
      // }

      // Mark any matches the user has created in the prop matches
      if (user) {
        allMatches.forEach(match => {
          if (match.host_id === user.id) {
            match.isUserCreated = true;
            // Production logging optimization: Temporarily disable all logging for performance testing
            // if (import.meta.env.DEV) {
            //   console.log("Marking existing match as user created by host_id:", match.id, match.title || 'untitled');
            // }
          }
        });
      }

      // Add any user created matches that aren't already in propMatches
      if (userCreatedMatches && userCreatedMatches.length > 0) {
        // Production logging optimization: Temporarily disable all logging for performance testing
        // if (import.meta.env.DEV) {
        //   console.log('User created matches count:', userCreatedMatches.length);
        //   console.log('User matches IDs:', userCreatedMatches.map(m => m.id).join(', '));
        // }

        userCreatedMatches.forEach(userMatch => {
          // Ensure the match has required properties
          userMatch.isUserCreated = true;
          if (!userMatch.title) userMatch.title = `Match on ${new Date(userMatch.start_time).toLocaleDateString()}`;

          // Check if this match already exists in allMatches
          const existingIndex = allMatches.findIndex(match => match.id === userMatch.id);

          if (existingIndex === -1) {
            // If not found, add it to allMatches
            // Production logging optimization: Temporarily disable all logging for performance testing
            // if (import.meta.env.DEV) {
            //   console.log("Adding user match to allMatches:", userMatch.id, userMatch.title);
            // }
            allMatches.push(userMatch);
          } else {
            // If found, make sure it's marked properly
            // Production logging optimization: Temporarily disable all logging for performance testing
            // if (import.meta.env.DEV) {
            //   console.log("User match already in propMatches, ensuring it's marked:", userMatch.id);
            // }
            allMatches[existingIndex].isUserCreated = true;
          }
        });
      } else {
        // Production logging optimization: Temporarily disable all logging for performance testing
        // if (import.meta.env.DEV) {
        //   console.log('No user created matches found');
        // }
      }

      // Production logging optimization: Temporarily disable all logging for performance testing
      // if (import.meta.env.DEV) {
      //   console.log('Combined matches count:', allMatches.length);
      //   if (allMatches.length > 0) {
      //     console.log('Sample match from allMatches:', allMatches[0].id, allMatches[0].title);
      //   }
      // }
      
      // Set this unfiltered list directly to state
      // This is a key change - no more filtering at this point!
      setMatches(allMatches);

      // Register impressions for visible matches to improve recommendations
      if (user) {
        const matchesToTrack =
          selectedSportFilter === "all"
            ? allMatches
            : allMatches.filter(
                (match) =>
                  match.sport_id?.toString() === selectedSportFilter ||
                  match.sport?.id?.toString() === selectedSportFilter,
              );

        // Track impressions in a non-blocking way
        matchesToTrack.slice(0, 10).forEach((match) => {
          interactionService
            .registerMatchView(user.id, match.id)
            .catch(console.error); // Non-blocking
        });
      }
    } else {
      console.log("No propMatches available, setting loading to true");
      setLoading(true);
    }
  }, [propMatches, userCreatedMatches, selectedSportFilter, user]);

  // View mode tab change handler
  const handleViewModeChange = (event, newValue) => {
    setViewMode(newValue);
  };

  // Sport filter click handler with view-specific behavior
  const handleSportFilterChange = (sportId) => {
    // Update the appropriate filter based on current view mode
    switch (viewMode) {
      case 0:
        // For List View, handle multi-select
        if (sportId === "all") {
          // If "All Sports" is selected, clear all other filters
          setListViewSportFilter([]);
          console.log('Set list view filter to empty array (all sports)');
        } else {
          setListViewSportFilter(prev => {
            // Create a new array without the "all" option
            let newFilters = prev.filter(id => id !== "all");
            
            if (prev.includes(sportId)) {
              // If already selected, remove it
              newFilters = newFilters.filter(id => id !== sportId);
              console.log(`Removing sport ${sportId} from filters`);
            } else {
              // If not selected, add it
              newFilters = [...newFilters, sportId];
              console.log(`Adding sport ${sportId} to filters`);
            }
            
            // If all filters are removed, treat as "all sports"
            return newFilters.length > 0 ? newFilters : [];
          });
        }
        break;
      case 1:
        setMapViewSportFilter(sportId);
        break;
      case 2:
        setCalendarViewSportFilter(sportId);
        break;
      default:
        break;
    }
  };
  
  // Function to navigate from Map view to List view with filters
  const navigateToListWithFilters = (location, sport) => {
    setViewMode(0); // Switch to List view
    setLocationFilter(location); // Set location filter
    
    // Set sport filter if provided
    if (sport) {
      setListViewSportFilter([sport]);
    } else if (location && location.supported_sports && location.supported_sports.length > 0) {
      // If no specific sport is provided but location has supported sports, use the first one
      setListViewSportFilter([location.supported_sports[0]]);
    }
  };

  // Render view based on selected view mode
  const renderViewContent = () => {
    // Production logging optimization: Temporarily disable all logging for performance testing
    // if (import.meta.env.DEV) {
    //   console.log("Current viewMode:", viewMode);
    //   console.log("Available matches:", filteredMatches.length);
    //   console.log("First match example:", filteredMatches[0]);
    // }
    
    switch (viewMode) {
      case 0: // List View
        return (
          <>
            {/* Personalized Recommendations Section - Only shown in List View */}
            <RecommendationsList
              limit={5}
              onError={(err) => console.error('Recommendation error:', err)}
              sportFilters={listViewSportFilter}
              filters={filters}
            />

            {/* Available Matches Section */}
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                <Typography variant="h5" component="h2" fontWeight="600">
                  Available Matches
                </Typography>
                <Chip
                  label={`${filteredMatches.length} found`}
                  size="small"
                  color="default"
                  variant="outlined"
                  sx={{ ml: 2 }}
                />
                {viewMode === 0 && listViewSportFilter.length > 0 && (
                  <Tooltip title="Filter is active">
                    <Chip
                      icon={<FilterListIcon />}
                      label={`${listViewSportFilter.length} filter${listViewSportFilter.length > 1 ? 's' : ''} active`}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ ml: 1 }}
                    />
                  </Tooltip>
                )}
              </Box>

              {loading ? (
                <Grid container spacing={2}>
                  {Array(6)
                    .fill()
                    .map((_, index) => (
                      <Grid item xs={12} sm={6} md={4} key={`skeleton-${index}`}>
                        <Skeleton
                          variant="rectangular"
                          height={320}
                          sx={{ borderRadius: 3 }}
                        />
                      </Grid>
                    ))}
                </Grid>
              ) : filteredMatches.length === 0 ? (
                <Paper
                  sx={{
                    p: 4,
                    textAlign: "center",
                    borderRadius: 3,
                  }}
                >
                  <SportsIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
                  <Typography variant="h3" gutterBottom>
                    No matches found
                  </Typography>
                                        <Typography variant="body1" color="text.secondary">
                        Try adjusting your filters or create your own match!
                      </Typography>
                      {user && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 1 }}>
                          Note: Your created matches are also subject to filters. 
                          If you can't see your match, try resetting the filters.
                        </Typography>
                      )}
                      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
                        <Button 
                          variant="contained" 
                          onClick={() => navigate('/host')}
                        >
                          Host a Match
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<RefreshIcon />}
                          onClick={handleResetFilters}
                        >
                          Reset All Filters
                        </Button>
                      </Box>
                </Paper>
              ) : (
                /* Horizontal scrolling available matches (max 5) */
                <Box sx={{ position: 'relative' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 2,
                      overflowX: 'auto',
                      px: 2, // Add horizontal padding to prevent border cutoff on sides
                      py: 3, // Increase vertical padding to accommodate hover effects
                      '&::-webkit-scrollbar': {
                        height: 8,
                      },
                      '&::-webkit-scrollbar-track': {
                        backgroundColor: '#f3f4f6',
                        borderRadius: 4,
                      },
                      '&::-webkit-scrollbar-thumb': {
                        backgroundColor: '#d1d5db',
                        borderRadius: 4,
                        '&:hover': {
                          backgroundColor: '#9ca3af',
                        },
                      },
                    }}
                  >
                    {/* Production logging optimization: Temporarily disable all logging for performance testing */}
                    {/* {import.meta.env.DEV && console.log("Preparing to render filtered matches:", filteredMatches.length)} */}
                    {/* Use the filteredMatches directly since it already includes user matches, limit to 5 */}
                    {filteredMatches.slice(0, 5).map((match) => {
                      const isUserMatch = user && (match.host_id === user.id || match.isUserCreated === true);
                      // Production logging optimization: Temporarily disable all logging for performance testing
                      // if (import.meta.env.DEV) {
                      //   console.log("Rendering match:", match.id, match.title, isUserMatch ? "(User Match)" : "");
                      // }
                      return (
                        <Box
                          key={match.id}
                          sx={{
                            minWidth: 320,
                            maxWidth: 320,
                            flexShrink: 0,
                          }}
                        >
                          {renderMatchCard(match)}
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              )}
            </Paper>
          </>
        );
      case 1: // Map View
          return (
    <MapView
      matches={matches}
      selectedSport={selectedSportFilter}
      onViewModeChange={handleViewModeChange}
      onSportFilterChange={handleSportFilterChange}
      navigateToListWithFilters={navigateToListWithFilters}
      sportFilters={sportFilters}
      supabase={supabase}
    />
        );
      case 2: // Calendar View
        return (
          <CalendarView 
            key={`calendar-view-${selectedSportFilter}`} // Add a key that changes with the sport filter
            matches={matches} 
            selectedSport={selectedSportFilter}
            onSportFilterChange={handleSportFilterChange} 
            sportFilters={sportFilters}
          />
        );
      default:
        return null;
    }
  };

  // Function to format date and time
  const formatDateTime = (dateTimeStr) => {
    try {
      const date = new Date(dateTimeStr);
      return {
        date: date.toLocaleDateString("en-MY", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        time: date.toLocaleTimeString("en-MY", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    } catch (error) {
      return { date: "Invalid date", time: "Invalid time" };
    }
  };

  // Get sport icon by name
  const getSportIcon = (sportName) => {
    if (!sportName) return <SportsIcon />;

    sportName = sportName.toLowerCase();
    if (sportName.includes("football") || sportName.includes("futsal")) {
      return <SportsSoccerIcon />;
    } else if (sportName.includes("basketball")) {
      return <SportsBasketballIcon />;
    } else if (
      sportName.includes("badminton") ||
      sportName.includes("tennis")
    ) {
      return <SportsTennisIcon />;
    } else if (sportName.includes("volleyball")) {
      return <SportsVolleyballIcon />;
    } else if (sportName.includes("gym") || sportName.includes("fitness")) {
      return <FitnessCenterIcon />;
    }
    return <SportsIcon />;
  };

  // Fetch user participations for all matches
  const fetchUserParticipations = useCallback(async () => {
    if (!user || matches.length === 0) {
      return;
    }

    try {
      const matchIds = matches.map(m => m.id);

      const { data, error } = await supabase
        .from('participants')
        .select('match_id, status, user_id, joined_at')
        .eq('user_id', user.id)
        .in('match_id', matchIds);

      if (error) {
        console.error('[fetchUserParticipations] Database error:', error);
        throw error;
      }

      const participationMap = {};
      if (data && data.length > 0) {
        data.forEach(p => {
          participationMap[p.match_id] = p;
        });
      }

      setUserParticipations(participationMap);
    } catch (error) {
      console.error('[fetchUserParticipations] Error fetching user participations:', error);
      // Don't clear existing participations on error
    }
  }, [user, matches, supabase]);



  // Handle join match
  const handleJoinMatch = async (match) => {
    if (!user) return;

    setSelectedMatchToJoin(match);
    setJoinDialogOpen(true);
  };

  // Handle join confirmation
  const handleJoinConfirm = async () => {
    const match = selectedMatchToJoin;
    if (!match) return;

    setJoinDialogOpen(false);

    try {
      setJoinLoading((prev) => ({ ...prev, [match.id]: true }));

      const result = await participantService.joinMatch(match.id, user.id);

      if (result && result.success) {
        // Update user participation state immediately
        setUserParticipations(prev => ({
          ...prev,
          [match.id]: { status: 'pending', match_id: match.id, user_id: user.id }
        }));

        // Refresh user participations to ensure consistency
        setTimeout(() => fetchUserParticipations(), 500);

        // Dispatch global event to notify other components about participation change
        window.dispatchEvent(new CustomEvent('sportea:participation', {
          detail: {
            matchId: match.id,
            userId: user.id,
            action: 'join',
            status: 'pending'
          }
        }));
      } else {
        setNotification({
          severity: "error",
          message: result?.message || "Failed to join match",
          duration: 5000,
        });
        return; // Exit early if join failed
      }

      // Track recommendation interaction if this is a recommended match (non-blocking)
      if (match.recommendation_type) {
        try {
          recommendationService
            .trackRecommendationAction(
              user.id,
              match.id,
              "joined",
              match.finalScore || 0.5,
              match.recommendation_type,
              match.explanation || "",
            )
            .catch((error) => {
              console.error(
                "Non-critical error tracking recommendation action:",
                error,
              );
              // Continue execution - this is non-blocking
            });
        } catch (error) {
          console.error("Error in recommendation tracking:", error);
          // Continue execution - this is non-blocking
        }
      }

      setNotification({
        severity: "success",
        message: "Request sent! Waiting for host approval.",
        duration: 5000, // Show for 5 seconds instead of default
      });

      // Track the join interaction (non-blocking)
      try {
        interactionService
          .trackInteraction(user.id, match.id, "join")
          .catch((error) => {
            console.error("Non-critical error tracking interaction:", error);
            // Continue execution - this is non-blocking
          });
      } catch (error) {
        console.error("Error in interaction tracking:", error);
        // Continue execution - this is non-blocking
      }

      // 🎯 ACHIEVEMENT TRACKING: Award XP and check achievements for joining match
      try {
        console.log('🎯 Triggering achievement check for match joining...');
        await awardXP(XP_VALUES.MATCH_JOINED, 'Joined a match', {
          actionType: 'MATCH_JOINED',
          matchId: match.id,
          sport: match.sport,
          updateStreak: true
        });
        console.log('✅ Achievement check completed for match joining');
      } catch (achievementError) {
        console.error('❌ Error checking achievements after joining match:', achievementError);
        // Don't fail the match join if achievement tracking fails
      }

      // Generate new user embeddings to improve future recommendations (non-blocking)
      try {
        // Make this operation completely non-blocking and catch all possible errors
        setTimeout(() => {
          recommendationService
            .generateUserEmbedding(user.id)
            .catch((error) => {
              console.error(
                "Non-critical error generating user embedding:",
                error,
              );
            });
        }, 100);
      } catch (error) {
        console.error("Error initiating user embedding generation:", error);
        // Continue execution - this is non-blocking
      }
    } catch (error) {
      console.error("Error joining match:", error);
      setNotification({
        severity: "error",
        message: error.message || "Failed to join match",
        duration: 5000,
      });
    } finally {
      setJoinLoading((prev) => ({ ...prev, [match.id]: false }));
      setSelectedMatchToJoin(null);
    }
  };

  // Handle join dialog close
  const handleJoinDialogClose = () => {
    setJoinDialogOpen(false);
    setSelectedMatchToJoin(null);
  };

  // Handle leave match
  const handleLeaveMatch = async (match) => {
    if (!user) return;

    try {
      setJoinLoading((prev) => ({ ...prev, [match.id]: true }));

      // Try with participantService first, then fall back to matchService
      let result;
      try {
        result = await participantService.leaveMatch(match.id, user.id);
      } catch (participantServiceError) {
        console.error(
          "Error using participantService.leaveMatch:",
          participantServiceError,
        );

        // Fall back to matchService if participantService fails
        try {
          result = await matchService.leaveMatch(match.id, user.id);
        } catch (matchServiceError) {
          console.error(
            "Error using matchService.leaveMatch fallback:",
            matchServiceError,
          );
          throw new Error("Failed to leave match. Please try again.");
        }
      }

      // Update the match in state
      const updatedMatches = matches.map((m) => {
        if (m.id === match.id) {
          return {
            ...m,
            is_joined: false,
            join_status: null,
            current_participants: Math.max(0, m.current_participants - 1), // Ensure we don't go below 0
          };
        }
        return m;
      });

      // Track recommendation interaction if this is a recommended match (non-blocking)
      if (match.recommendation_type) {
        try {
          recommendationService
            .trackRecommendationAction(
              user.id,
              match.id,
              "left",
              match.finalScore || 0.5,
              match.recommendation_type,
              match.explanation || "",
            )
            .catch((error) => {
              console.error(
                "Non-critical error tracking recommendation action:",
                error,
              );
              // Continue execution - this is non-blocking
            });
        } catch (error) {
          console.error("Error in recommendation tracking:", error);
          // Continue execution - this is non-blocking
        }
      }

      // Update user participation state to 'left'
      setUserParticipations(prev => ({
        ...prev,
        [match.id]: { status: 'left', match_id: match.id, user_id: user.id }
      }));

      setMatches(updatedMatches);
      setNotification({
        severity: "success",
        message: "You have successfully left the match",
        duration: 5000,
      });

      // Refresh user participations to ensure consistency
      setTimeout(() => fetchUserParticipations(), 500);

      // Dispatch global event to notify other components about participation change
      window.dispatchEvent(new CustomEvent('sportea:participation', {
        detail: {
          matchId: match.id,
          userId: user.id,
          action: 'leave',
          status: 'left'
        }
      }));

      // Track the leave interaction with improved error handling
      try {
        interactionService
          .trackInteraction(user.id, match.id, "leave")
          .catch((error) => {
            console.error("Non-critical error tracking interaction:", error);
            // Continue execution - this is non-blocking
          });
      } catch (error) {
        console.error("Error in interaction tracking:", error);
        // Continue execution - this is non-blocking
      }
    } catch (error) {
      console.error("Error leaving match:", error);
      setNotification({
        severity: "error",
        message: error.message || "Failed to leave match",
      });
    } finally {
      setJoinLoading((prev) => ({ ...prev, [match.id]: false }));
    }
  };

  // Handle clicking on a recommended match card
  const handleRecommendationClick = (match) => {
    if (!user || !match.recommendation_type) return;

    // Track that the user clicked on this recommendation in analytics
    recommendationService
      .trackRecommendationAction(
        user.id,
        match.id,
        "clicked",
        match.finalScore || 0.5,
        match.recommendation_type,
        match.explanation || "",
      )
      .catch(console.error); // Non-blocking

    // Also track in user_interactions for collaborative filtering
    interactionService
      .trackInteraction(user.id, match.id, "click")
      .catch(console.error); // Non-blocking

    // Navigate to match details page
    navigate(`/match/${match.id}`);
  };



  // Optimized match filtering with performance improvements
  const filteredMatches = React.useMemo(() => {
    if (!matches || matches.length === 0) {
      return [];
    }

    // Performance optimization: Temporarily disable all logging for performance testing
    // if (import.meta.env.DEV) {
    //   console.log('Filtering', matches.length, 'matches');
    //   console.log('Current filter settings:', {
    //     viewMode,
    //     listViewSportFilter: listViewSportFilter.length > 0 ? listViewSportFilter : 'all (empty array)',
    //     selectedSportFilter,
    //     locationFilter: locationFilter ? `${locationFilter.name} (id: ${locationFilter.id})` : 'none',
    //     otherFilters: filters
    //   });
    // }
    
    // Performance optimization: Temporarily disable all logging for performance testing
    // if (import.meta.env.DEV && user) {
    //   const userMatches = matches.filter(m => m.host_id === user.id || m.isUserCreated === true);
    //   if (userMatches.length > 0) {
    //     console.log('User matches before filtering:', userMatches.length);
    //   }
    // }
    
    return matches.filter((match) => {
      // Performance optimization: Cache user-created match check
      const isUserCreatedMatch = user && (match.host_id === user.id || match.isUserCreated === true);

      // Production logging optimization: Reduce excessive logging
      // Only log user-created matches in development when debugging is needed
      // if (import.meta.env.DEV && isUserCreatedMatch) {
      //   console.log(`Processing user-created match: ${match.id} - ${match.title || 'untitled'}`);
      // }
      
      // Apply sport filter based on the current view mode
      if (viewMode === 0) {
        // LIST VIEW: Handle multi-select sport filters
        if (listViewSportFilter.length > 0) {
          // If the user has selected specific sports (and not "all")
          const matchSportId = match.sport_id?.toString() || match.sport?.id?.toString();
          
          // Check if match sport is in the selected list, or if "all" is selected
          const sportMatches = listViewSportFilter.includes(matchSportId) || listViewSportFilter.includes("all");
          
          if (!sportMatches) {
            // Development logging only
            if (import.meta.env.DEV && isUserCreatedMatch) {
              console.log(`User match ${match.id} filtered out - sport ${matchSportId} not in selected filters:`, listViewSportFilter);
            }
            return false;
          }
        }
      } else {
        // MAP/CALENDAR VIEW: Handle single sport filter
        if (
          selectedSportFilter !== "all" &&
          match.sport_id?.toString() !== selectedSportFilter &&
          match.sport?.id?.toString() !== selectedSportFilter
        ) {
          // Development logging only
          if (import.meta.env.DEV && isUserCreatedMatch) {
            console.log(`User match ${match.id} filtered out - sport doesn't match selected filter: ${selectedSportFilter}`);
          }
          return false;
        }
      }

      // Apply location filter (only for list view)
      if (viewMode === 0 && locationFilter) {
        // Filter by venue/location ID if available
        if (match.location?.id && locationFilter.id &&
            match.location.id.toString() !== locationFilter.id.toString()) {
          // Development logging only
          if (import.meta.env.DEV && isUserCreatedMatch) {
            console.log(`User match ${match.id} filtered out - location ID doesn't match: ${match.location?.id} vs ${locationFilter.id}`);
          }
          return false;
        }

        // Filter by venue/location name as fallback
        else if (match.location?.name && locationFilter.name &&
                match.location.name !== locationFilter.name) {
          // Development logging only
          if (import.meta.env.DEV && isUserCreatedMatch) {
            console.log(`User match ${match.id} filtered out - location name doesn't match: ${match.location?.name} vs ${locationFilter.name}`);
          }
          return false;
        }
      }

      // Apply skill level filter
      if (
        filters.skillLevel !== "all" &&
        match.skill_level?.toLowerCase() !== filters.skillLevel.toLowerCase()
      ) {
        // Development logging only
        if (import.meta.env.DEV && isUserCreatedMatch) {
          console.log(`User match ${match.id} filtered out - skill level doesn't match: ${match.skill_level} vs ${filters.skillLevel}`);
        }
        return false;
      }

      // Apply spots filter - only show matches with at least this many spots left
      const spotsLeft =
        (match.max_participants || 0) - (match.current_participants || 0);
      if (spotsLeft < filters.minSpots) {
        // Development logging only
        if (import.meta.env.DEV && isUserCreatedMatch) {
          console.log(`User match ${match.id} filtered out - not enough spots left: ${spotsLeft} vs ${filters.minSpots}`);
        }
        return false;
      }

      // Apply full matches filter
      if (!filters.showFull && spotsLeft <= 0) {
        if (isUserCreatedMatch) {
          console.log(`User match ${match.id} filtered out - match is full and showFull is false`);
        }
        return false;
      }

      // Apply private matches filter
      if (!filters.showPrivate && match.is_private) {
        if (isUserCreatedMatch) {
          console.log(`User match ${match.id} filtered out - match is private and showPrivate is false`);
        }
        return false;
      }

      // Filter out matches that have already ended
      const now = new Date();
      if (match.start_time) {
        const startTime = new Date(match.start_time);
        const endTime = match.end_time 
          ? new Date(match.end_time) 
          : new Date(startTime.getTime() + (match.duration_minutes || 60) * 60000);
        
        // If the match has ended, don't include it
        if (endTime < now) {
          console.log(`Filtering out ended match: ${match.id}, ${match.title}, ended at: ${endTime.toLocaleString()}`);
          return false;
        }
      }

      // Apply date range filter
      if (filters.dateRange !== "all" && match.start_time) {
        const matchDate = new Date(match.start_time);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of today

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        if (
          filters.dateRange === "today" &&
          (matchDate < today || matchDate >= tomorrow)
        ) {
          if (isUserCreatedMatch) {
            console.log(`User match ${match.id} filtered out - date not today: ${matchDate.toLocaleDateString()}`);
          }
          return false;
        } else if (
          filters.dateRange === "tomorrow" &&
          (matchDate < tomorrow ||
            matchDate >= new Date(tomorrow.getTime() + 86400000))
        ) {
          if (isUserCreatedMatch) {
            console.log(`User match ${match.id} filtered out - date not tomorrow: ${matchDate.toLocaleDateString()}`);
          }
          return false;
        } else if (
          filters.dateRange === "week" &&
          (matchDate < today || matchDate >= nextWeek)
        ) {
          if (isUserCreatedMatch) {
            console.log(`User match ${match.id} filtered out - date not within week: ${matchDate.toLocaleDateString()}`);
          }
          return false;
        }
      }

      // Match passed all filters
      // Production logging optimization: Reduce excessive logging
      // if (isUserCreatedMatch) {
      //   console.log(`User-created match ${match.id} passed all filters`);
      // }
      return true;
    }).map((match) => ({
      ...match,
      // Mark as updated if it's new or recently modified
      isUpdated:
        match.created_at &&
        new Date(match.created_at) > new Date(Date.now() - 10 * 60 * 1000) // Created in last 10 minutes
    })).sort((a, b) => {
      // Sort by creation date (newest first) for better user experience
      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      return dateB - dateA;
    });
  }, [matches, selectedSportFilter, filters, viewMode, listViewSportFilter, locationFilter, user, userCreatedMatches]);

  // Handle filter change
  const handleFilterChange = (event) => {
    const { name, value, checked, type } = event.target;
    setFilters((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Track filter usage if user is logged in
    if (user) {
      interactionService
        .trackInteraction(user.id, "filter_usage", "filter_change", {
          filter: name,
          value: type === "checkbox" ? checked : value,
        })
        .catch(console.error); // Non-blocking
    }
  };

  // Reset filters to default
  const handleResetFilters = () => {
    console.log("Resetting all filters to default values");
    
    // Reset all filters
    setFilters({
      skillLevel: "all",
      minSpots: 1,
      maxDistance: 50,
      showPrivate: true,
      showFull: false,
      dateRange: "all",
    });
    
    // Reset sport filters
    setListViewSportFilter([]);
    
    // Reset location filter
    setLocationFilter(null);
    
    console.log("All filters have been reset to default values");
    
    // Close filter panel if it's open
    if (showFilters) {
      setShowFilters(false);
    }
  };

  // Render recommendation card (similar to match card but with recommendation details)
  const renderRecommendationCard = (match) => {
    // Format date and time
    const { date, time } = formatDateTime(match.start_time);

    // Calculate spots available
    const maxParticipants = match.max_participants || 10;
    // Use actual participant count from database, fallback to 0 if not specified
    const currentParticipants = match.current_participants ?? 0;
    const spotsAvailable = maxParticipants - currentParticipants;

    // Calculate fill percentage for visual progress bar
    const fillPercentage = (currentParticipants / maxParticipants) * 100;

    // Determine match status
    const isFull = spotsAvailable <= 0;
    const isAboutToFill = spotsAvailable <= 2 && !isFull;
    const userParticipation = userParticipations[match.id];
    const isJoined = userParticipation?.status === 'confirmed' || userParticipation?.status === 'pending';
    const joinStatus = userParticipation?.status || null;
    const isLoading = joinLoading[match.id] || false;
    const skillLevel = match.skill_level || match.skillLevel || "Intermediate";
    // Check if the current user is the host of this match
    const isUserHost =
      user &&
      (match.host_id === user.id || (match.host && match.host.id === user.id));

    // Get sport data
    const sport = match.sport || match.sports || {};
    const sportName = sport.name || match.sport_name || "Sport";
    const sportIcon = getSportIcon(sportName);

    // Get location
    const location =
      match.location?.name ||
      match.location_name ||
      match.locations?.name ||
      "Unknown location";

    // Get host
    const host = match.host || {};
    const hostName = host.full_name || host.name || host.username || "Host";

    return (
      <Card
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          borderRadius: 3,
          transition: "all 0.3s ease-in-out",
          position: "relative",
          overflow: "visible",
          border: "2px solid #3f51b5",
          "&:hover": {
            transform: "translateY(-8px)",
            boxShadow: 6,
          },
        }}
        onClick={() => handleRecommendationClick(match)}
      >
        {/* Recommendation badge */}
        <Box
          sx={{
            position: "absolute",
            top: -10,
            right: -10,
            zIndex: 1,
          }}
        >
          <Tooltip title={match.explanation || "Recommended for you"}>
            <Badge
              badgeContent={
                <RecommendIcon fontSize="small" sx={{ color: "white" }} />
              }
              color="primary"
              overlap="circular"
              sx={{
                "& .MuiBadge-badge": {
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                },
              }}
            />
          </Tooltip>
        </Box>

        <CardContent sx={{ flexGrow: 1 }}>
          {/* Sport type chip and recommendation type */}
          <Box
            sx={{
              mb: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Chip
              icon={sportIcon}
              label={sportName}
              size="small"
              color="primary"
              variant="filled"
            />

            <Tooltip title={match.explanation || "Recommended for you"}>
              <Chip
                icon={<InfoIcon fontSize="small" />}
                label={
                  match.recommendation_type === "content-based"
                    ? "Personalized"
                    : match.recommendation_type === "collaborative"
                      ? "Popular"
                      : "Recommended"
                }
                size="small"
                color="secondary"
                variant="outlined"
              />
            </Tooltip>
          </Box>

          {/* Match title */}
          <Typography variant="h6" component="h2" gutterBottom>
            {match.title || "Untitled Match"}
          </Typography>

          {/* Match details */}
          <Box sx={{ mb: 2 }}>
            {/* Date and time */}
            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              <AccessTimeIcon
                fontSize="small"
                sx={{ mr: 1, color: "text.secondary" }}
              />
              <Typography variant="body2" color="text.secondary">
                {date} · {time} · {match.duration_minutes || 60} mins
              </Typography>
            </Box>

            {/* Location */}
            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              <LocationOnIcon
                fontSize="small"
                sx={{ mr: 1, color: "text.secondary", flexShrink: 0 }}
              />
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1
                }}
              >
                {location}
              </Typography>
            </Box>

            {/* Host */}
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <PersonIcon
                fontSize="small"
                sx={{ mr: 1, color: "text.secondary" }}
              />
              <Typography variant="body2" color="text.secondary">
                Hosted by {hostName}
              </Typography>
            </Box>
          </Box>

          {/* Participants */}
          <Box sx={{ mb: 2 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <PeopleIcon
                  fontSize="small"
                  sx={{ mr: 1, color: "text.secondary" }}
                />
                <Typography variant="body2">
                  {currentParticipants}/{maxParticipants} players
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {spotsAvailable} {spotsAvailable === 1 ? "spot" : "spots"} left
              </Typography>
            </Box>

            <Box sx={{ width: "100%", mb: 1 }}>
              <LinearProgress
                variant="determinate"
                value={fillPercentage}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: "rgba(0,0,0,0.05)",
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: isFull
                      ? "error.main"
                      : isAboutToFill
                        ? "warning.main"
                        : "success.main",
                  },
                }}
              />
            </Box>
          </Box>

          {/* Explanation */}
          <Typography
            variant="body2"
            color="secondary"
            sx={{ mb: 1, fontStyle: "italic" }}
          >
            {match.explanation || "Recommended based on your preferences"}
          </Typography>
        </CardContent>

        <CardActions sx={{ flexDirection: "column", gap: 1, p: 2 }}>
          {/* Join/Leave match button */}
          {user &&
            (isUserHost ? (
              <Button
                variant="contained"
                color="secondary"
                size="small"
                fullWidth
                startIcon={<PersonIcon />}
                disabled
                sx={{ mb: 1 }}
              >
                You're Hosting
              </Button>
            ) : isJoined ? (
              <Button
                variant="outlined"
                color={joinStatus === "pending" ? "warning" : "error"}
                size="small"
                fullWidth
                disabled={joinStatus === "pending" || isLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  handleLeaveMatch(match);
                }}
                startIcon={isLoading ? <CircularProgress size={20} /> : null}
                sx={{ mb: 1 }}
              >
                {isLoading
                  ? "Processing..."
                  : joinStatus === "pending"
                    ? "Requested"
                    : "Leave Match"}
              </Button>
            ) : (
              <Button
                variant="contained"
                size="small"
                color={isFull ? "inherit" : "primary"}
                fullWidth
                disabled={isFull || isLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  handleJoinMatch(match);
                }}
                startIcon={isLoading ? <CircularProgress size={20} /> : null}
              >
                {isLoading
                  ? "Processing..."
                  : isFull
                    ? "Match Full"
                    : "Join Match"}
              </Button>
            ))}
        </CardActions>
      </Card>
    );
  };

  // Render match card
  const renderMatchCard = (match) => {
    // Format date and time
    const { date, time } = formatDateTime(match.start_time);

    // Calculate spots available
    const maxParticipants = match.max_participants || 10;
    // Use actual participant count from database, fallback to 0 if not specified
    const currentParticipants = match.current_participants ?? 0;
    const spotsAvailable = maxParticipants - currentParticipants;

    // Check if match is new (created in the last hour)
    const isNew =
      match.created_at &&
      new Date(match.created_at) > new Date(Date.now() - 60 * 60 * 1000);

    // Calculate fill percentage for visual progress bar
    const fillPercentage = (currentParticipants / maxParticipants) * 100;

    // Determine match status
    const isFull = spotsAvailable <= 0;
    const isAboutToFill = spotsAvailable <= 2 && !isFull;
    const userParticipation = userParticipations[match.id];
    const isJoined = userParticipation?.status === 'confirmed' || userParticipation?.status === 'pending';
    const joinStatus = userParticipation?.status || null;
    const isLoading = joinLoading[match.id] || false;
    const skillLevel = match.skill_level || match.skillLevel || "Intermediate";
    // Check if the current user is the host of this match
    const isUserHost =
      user &&
      (match.host_id === user.id || (match.host && match.host.id === user.id));

    // Get sport data
    const sport = match.sport || {};
    const sportName = sport.name || match.sport_name || "Sport";
    const sportIcon = getSportIcon(sportName);

    // Get location
    const location =
      match.location?.name ||
      match.location_name ||
      match.location ||
      "Unknown location";

    // Get host
    const host = match.host || {};
    const hostName = host.full_name || host.name || host.username || "Host";
    const hostInitial = hostName.charAt(0);

    return (
      <Card
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          borderRadius: 'var(--radius)',
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          position: "relative",
          cursor: "pointer",
          border: "1px solid var(--border)",
          backgroundColor: "var(--card)",
          color: "var(--card-foreground)",
          boxShadow: "var(--shadow-sm)",
          // Add margin to prevent border cutoff on hover
          margin: "8px",
          "&:hover": {
            transform: "translateY(-8px)",
            boxShadow: "var(--shadow-lg)",
            borderColor: "var(--primary)",
            "& .card-sport-chip": {
              transform: "scale(1.05)",
            },
            "& .card-title": {
              color: "var(--primary)",
            },
          },
          "&:active": {
            transform: "translateY(-4px)",
          },
          ...(match.isUpdated && {
            animation: "pulse 2s",
            "@keyframes pulse": {
              "0%": { boxShadow: "0 0 0 0 rgba(144, 202, 249, 0.7)" },
              "70%": { boxShadow: "0 0 0 10px rgba(144, 202, 249, 0)" },
              "100%": { boxShadow: "0 0 0 0 rgba(144, 202, 249, 0)" },
            },
          }),
        }}
        onClick={() => navigate(`/match/${match.id}`)}
      >
        {/* New indicator badge */}
        {isNew && (
          <Box
            sx={{
              position: "absolute",
              top: -10,
              right: -10,
              zIndex: 1,
            }}
          >
            <Tooltip title="New match!">
              <Badge
                badgeContent={
                  <FiberNewIcon fontSize="small" sx={{ color: "white" }} />
                }
                color="primary"
                overlap="circular"
                sx={{
                  "& .MuiBadge-badge": {
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                  },
                }}
              />
            </Tooltip>
          </Box>
        )}

        <CardContent sx={{ flexGrow: 1 }}>
          {/* Sport type chip */}
          <Box
            sx={{
              mb: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Chip
              className="card-sport-chip"
              icon={getSportIcon(match.sport?.name || "")}
              label={match.sport?.name || "Sport"}
              size="small"
              color="primary"
              variant="filled"
              sx={{
                transition: "all 0.2s ease-in-out",
                fontWeight: 600,
                "& .MuiChip-icon": {
                  fontSize: "1.1rem",
                },
              }}
            />

            {/* Private/Public indicator */}
            <Tooltip title={match.is_private ? "Private match" : "Open to all"}>
              <Chip
                icon={
                  match.is_private ? (
                    <LockIcon fontSize="small" />
                  ) : (
                    <PublicIcon fontSize="small" />
                  )
                }
                label={match.is_private ? "Private" : "Public"}
                size="small"
                color={match.is_private ? "secondary" : "success"}
                variant="outlined"
              />
            </Tooltip>
          </Box>

          {/* Match title */}
          <Typography
            className="card-title"
            variant="h6"
            component="h2"
            gutterBottom
            sx={{
              fontWeight: 700,
              fontSize: "1.2rem",
              lineHeight: 1.3,
              transition: "color 0.2s ease-in-out",
              mb: 2,
            }}
          >
            {match.title || "Untitled Match"}
          </Typography>

          {/* Match details */}
          <Box sx={{ mb: 2 }}>
            {/* Date and time */}
            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              <AccessTimeIcon
                fontSize="small"
                sx={{ mr: 1, color: "text.secondary" }}
              />
              <Typography variant="body2" color="text.secondary">
                {date} · {time} · {match.duration_minutes || 60} mins
              </Typography>
            </Box>

            {/* Location */}
            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              <LocationOnIcon
                fontSize="small"
                sx={{ mr: 1, color: "text.secondary" }}
              />
              <Typography variant="body2" color="text.secondary">
                {match.location?.name || "Location not specified"}
              </Typography>
            </Box>

            {/* Host */}
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <PersonIcon
                fontSize="small"
                sx={{ mr: 1, color: "text.secondary" }}
              />
              <Typography variant="body2" color="text.secondary">
                Hosted by{" "}
                {match.host?.username ||
                  match.host?.full_name ||
                  "Unknown host"}
              </Typography>
            </Box>
          </Box>

          {/* Participants */}
          <Box sx={{ mb: 2 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <PeopleIcon
                  fontSize="small"
                  sx={{ mr: 1, color: "text.secondary" }}
                />
                <Typography variant="body2">
                  {currentParticipants}/{maxParticipants} players
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {spotsAvailable} {spotsAvailable === 1 ? "spot" : "spots"} left
              </Typography>
            </Box>

            <Box sx={{ width: "100%", mb: 1 }}>
              <LinearProgress
                variant="determinate"
                value={fillPercentage}
                sx={{
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: "rgba(0,0,0,0.08)",
                  boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)",
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: isFull
                      ? "error.main"
                      : isAboutToFill
                        ? "warning.main"
                        : "success.main",
                    borderRadius: 5,
                    transition: "all 0.3s ease-in-out",
                  },
                }}
              />
            </Box>
          </Box>

          {/* Description (truncated) */}
          {match.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                mb: 1,
              }}
            >
              {match.description}
            </Typography>
          )}
        </CardContent>

        <CardActions sx={{
          flexDirection: "column",
          gap: 1.5,
          p: 2,
          borderTop: "1px solid",
          borderColor: "divider",
          backgroundColor: "rgba(0,0,0,0.02)",
        }}>
          {/* Join/Leave match button */}
          {user &&
            (isUserHost ? (
              <Button
                variant="contained"
                color="secondary"
                size="medium"
                fullWidth
                startIcon={<PersonIcon />}
                disabled
                sx={{
                  mb: 1,
                  fontWeight: 600,
                  borderRadius: 2,
                  textTransform: "none",
                }}
              >
                You're Hosting
              </Button>
            ) : isJoined ? (
              <Button
                variant="outlined"
                color={joinStatus === "pending" ? "warning" : "error"}
                size="medium"
                fullWidth
                disabled={joinStatus === "pending" || isLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  handleLeaveMatch(match);
                }}
                startIcon={isLoading ? <CircularProgress size={20} /> : null}
                sx={{
                  mb: 1,
                  fontWeight: 600,
                  borderRadius: 2,
                  textTransform: "none",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    transform: joinStatus === "pending" ? "none" : "scale(1.02)",
                  },
                }}
              >
                {isLoading
                  ? "Processing..."
                  : joinStatus === "pending"
                    ? "Requested"
                    : "Leave Match"}
              </Button>
            ) : (
              <Button
                variant="contained"
                size="medium"
                color={isFull ? "inherit" : "primary"}
                fullWidth
                disabled={isFull || isLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  handleJoinMatch(match);
                }}
                startIcon={isLoading ? <CircularProgress size={20} /> : null}
                sx={{
                  fontWeight: 600,
                  borderRadius: 2,
                  textTransform: "none",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    transform: "scale(1.02)",
                    boxShadow: 3,
                  },
                  "&:disabled": {
                    backgroundColor: "grey.300",
                  },
                }}
              >
                {isLoading
                  ? "Processing..."
                  : isFull
                    ? "Match Full"
                    : "Join Match"}
              </Button>
            ))}

          <Button
            variant="outlined"
            size="medium"
            fullWidth
            startIcon={<AccessTimeIcon />}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/match/${match.id}`);
            }}
            sx={{
              fontWeight: 500,
              borderRadius: 2,
              textTransform: "none",
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                backgroundColor: "primary.main",
                color: "white",
                transform: "scale(1.02)",
              },
            }}
          >
            View Details
          </Button>
        </CardActions>
      </Card>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {notification && (
        <Alert
          severity={notification.severity}
          sx={{ mb: 2 }}
          onClose={() => setNotification(null)}
        >
          {notification.message}
        </Alert>
      )}

      {/* View Mode Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2, p: 1, bgcolor: 'grey.50' }}>
        <Tabs
          value={viewMode}
          onChange={handleViewModeChange}
          variant="fullWidth"
          sx={{
            minHeight: 'auto',
            '& .MuiTabs-indicator': {
              display: 'none', // Remove default indicator
            },
            '& .MuiTab-root': {
              minHeight: 'auto',
              py: 1.5,
              px: 3,
              borderRadius: 1.5,
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.875rem',
              color: 'text.secondary',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                bgcolor: 'action.hover',
                color: 'text.primary',
              },
              '&.Mui-selected': {
                bgcolor: 'background.paper',
                color: 'primary.main',
                fontWeight: 600,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              },
            },
          }}
        >
          <Tab label="List View" />
          <Tab label="Map View" />
          <Tab label="Calendar" />
        </Tabs>
      </Paper>

      {/* Only show filters in List View */}
      {viewMode === 0 && (
        <>
                      {/* Sports filter chips */}
            <Paper sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: 'grey.50' }}>
              <Box sx={{ mb: 1.5 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    color: 'text.secondary',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  <FilterListIcon sx={{ fontSize: '1.1rem' }} />
                  Filter by Sport
                </Typography>
              </Box>
              <Box sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
                maxHeight: '120px',
                overflowY: 'auto',
                '&::-webkit-scrollbar': {
                  width: '4px',
                },
                '&::-webkit-scrollbar-track': {
                  background: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: '2px',
                },
              }}>
                <Chip
                  key="all"
                  icon={<SportsIcon />}
                  label="All Sports"
                  onClick={() => handleSportFilterChange("all")}
                  variant={listViewSportFilter.length === 0 ? 'filled' : 'outlined'}
                  sx={{
                    borderRadius: 1.5,
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    transition: 'all 0.2s ease-in-out',
                    ...(listViewSportFilter.length === 0 ? {
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                      },
                    } : {
                      bgcolor: 'background.paper',
                      color: 'text.secondary',
                      borderColor: 'divider',
                      '&:hover': {
                        bgcolor: 'action.hover',
                        color: 'text.primary',
                        borderColor: 'primary.main',
                      },
                    }),
                  }}
                />
                {sportFilters.slice(1).map((sport) => (
                  <Chip
                    key={sport.id}
                    icon={sport.icon}
                    label={sport.name}
                    onClick={() => handleSportFilterChange(sport.id)}
                    variant={listViewSportFilter.includes(sport.id) ? 'filled' : 'outlined'}
                    sx={{
                      borderRadius: 1.5,
                      fontWeight: 500,
                      fontSize: '0.875rem',
                      transition: 'all 0.2s ease-in-out',
                      ...(listViewSportFilter.includes(sport.id) ? {
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        '&:hover': {
                          bgcolor: 'primary.dark',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                        },
                      } : {
                        bgcolor: 'background.paper',
                        color: 'text.secondary',
                        borderColor: 'divider',
                        '&:hover': {
                          bgcolor: 'action.hover',
                          color: 'text.primary',
                          borderColor: 'primary.main',
                        },
                      }),
                    }}
                  />
                ))}
              </Box>
            </Paper>

            {/* Advanced filters toggle */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Chip
                icon={<FilterListIcon />}
                label="More Filters"
                color={showFilters ? "primary" : "default"}
                onClick={() => setShowFilters(!showFilters)}
                variant={showFilters ? "filled" : "outlined"}
              />
            </Box>

          {/* Advanced filters panel */}
          <Collapse in={showFilters}>
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Advanced Filters
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="skill-level-label">Skill Level</InputLabel>
                    <Select
                      labelId="skill-level-label"
                      id="skill-level"
                      name="skillLevel"
                      value={filters.skillLevel}
                      label="Skill Level"
                      onChange={handleFilterChange}
                    >
                      <MenuItem value="all">All Levels</MenuItem>
                      <MenuItem value="beginner">Beginner</MenuItem>
                      <MenuItem value="intermediate">Intermediate</MenuItem>
                      <MenuItem value="advanced">Advanced</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="date-range-label">Date</InputLabel>
                    <Select
                      labelId="date-range-label"
                      id="date-range"
                      name="dateRange"
                      value={filters.dateRange}
                      label="Date"
                      onChange={handleFilterChange}
                    >
                      <MenuItem value="all">All Dates</MenuItem>
                      <MenuItem value="today">Today</MenuItem>
                      <MenuItem value="tomorrow">Tomorrow</MenuItem>
                      <MenuItem value="week">This Week</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="min-spots-label">Minimum Spots</InputLabel>
                    <Select
                      labelId="min-spots-label"
                      id="min-spots"
                      name="minSpots"
                      value={filters.minSpots}
                      label="Minimum Spots"
                      onChange={handleFilterChange}
                    >
                      <MenuItem value={1}>At least 1</MenuItem>
                      <MenuItem value={2}>At least 2</MenuItem>
                      <MenuItem value={3}>At least 3</MenuItem>
                      <MenuItem value={5}>At least 5</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={filters.showPrivate}
                          onChange={handleFilterChange}
                          name="showPrivate"
                        />
                      }
                      label="Show Private Matches"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={filters.showFull}
                          onChange={handleFilterChange}
                          name="showFull"
                        />
                      }
                      label="Show Full Matches"
                    />
                  </FormGroup>
                </Grid>
              </Grid>

                              <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Filters apply to all matches, including your own
                  </Typography>
                  <Box>
                    <Button
                      size="small"
                      onClick={handleResetFilters}
                      sx={{ mr: 1 }}
                      startIcon={<RefreshIcon />}
                    >
                      Reset All Filters
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => setShowFilters(false)}
                    >
                      Apply Filters
                    </Button>
                  </Box>
                </Box>
            </Paper>
          </Collapse>
        </>
      )}

      {/* All Matches Section */}
      <Box>
        {loading ? (
          <Grid container spacing={2}>
            {Array(6)
              .fill()
              .map((_, index) => (
                <Grid item xs={12} sm={6} md={4} key={`skeleton-${index}`}>
                  <Skeleton
                    variant="rectangular"
                    height={320}
                    sx={{ borderRadius: 3 }}
                  />
                </Grid>
              ))}
          </Grid>
        ) : (
          renderViewContent()
        )}
      </Box>

      {/* Join Match Confirmation Dialog */}
      <Dialog open={joinDialogOpen} onClose={handleJoinDialogClose}>
        <DialogTitle>Join Match</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to join "{selectedMatchToJoin?.title}"?
            {selectedMatchToJoin?.is_private &&
              " This is a private match and will require an access code."}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleJoinDialogClose} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleJoinConfirm}
            color="primary"
            variant="contained"
          >
            Join Match
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo optimization
  // Only re-render if matches or sports data actually changed
  return (
    prevProps.matches === nextProps.matches &&
    prevProps.sports === nextProps.sports
  );
});

// Set display name for debugging
FindGames.displayName = 'FindGames';

/**
 * Utility function to extract coordinates from Google Maps URLs
 * @param {string} url - Google Maps URL
 * @returns {Object|null} - { lat, lng } or null if extraction fails
 */
const extractCoordsFromUrl = (url) => {
  try {
    if (!url || typeof url !== "string") return null;

    // Check if it's already a coordinate pair (direct format)
    if (/^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(url.trim())) {
      const [lat, lng] = url
        .split(",")
        .map((coord) => parseFloat(coord.trim()));
      return { lat, lng };
    }

    // Try to extract from Google Maps URL
    // Looking for patterns like q=3.123,101.456 or @3.123,101.456 in the URL
    const qParam = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (qParam) {
      return { lat: parseFloat(qParam[1]), lng: parseFloat(qParam[2]) };
    }

    const atParam = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atParam) {
      return { lat: parseFloat(atParam[1]), lng: parseFloat(atParam[2]) };
    }

    return null;
  } catch (error) {
    console.error("Error extracting coordinates:", error);
    return null;
  }
};

/**
 * Campus sport facilities data
 */
const campusFacilities = [
  {
    id: "hockey-1",
    name: "Hockey Field",
    sport: "hockey",
    coordinates: extractCoordsFromUrl(
      "https://maps.app.goo.gl/iBMSRUrKzUH3SkpAA",
    ) || { lat: 3.0674, lng: 101.4965 }, // Fallback coordinates
    imageUrl: "https://placehold.co/600x400?text=Hockey+Field",
  },
  {
    id: "futsal-a",
    name: "Futsal Court A",
    sport: "futsal",
    coordinates: { lat: 3.06723, lng: 101.497834 },
    imageUrl: "https://placehold.co/600x400?text=Futsal+Court+A",
  },
  {
    id: "futsal-b",
    name: "Futsal Court B",
    sport: "futsal",
    coordinates: { lat: 3.067189, lng: 101.498046 },
    imageUrl: "https://placehold.co/600x400?text=Futsal+Court+B",
  },
  {
    id: "basketball-a",
    name: "Basketball Court A",
    sport: "basketball",
    coordinates: { lat: 3.06772, lng: 101.497457 },
    imageUrl: "https://placehold.co/600x400?text=Basketball+Court+A",
  },
  {
    id: "basketball-b",
    name: "Basketball Court B",
    sport: "basketball",
    coordinates: { lat: 3.067699, lng: 101.497625 },
    imageUrl: "https://placehold.co/600x400?text=Basketball+Court+B",
  },
  {
    id: "volleyball-a",
    name: "Volleyball Court A",
    sport: "volleyball",
    coordinates: { lat: 3.06782, lng: 101.497218 },
    imageUrl: "https://placehold.co/600x400?text=Volleyball+Court+A",
  },
  {
    id: "tennis-a",
    name: "Tennis Court A",
    sport: "tennis",
    coordinates: { lat: 3.067687, lng: 101.497812 },
    imageUrl: "https://placehold.co/600x400?text=Tennis+Court+A",
  },
  {
    id: "tennis-b",
    name: "Tennis Court B",
    sport: "tennis",
    coordinates: { lat: 3.067652, lng: 101.49795 },
    imageUrl: "https://placehold.co/600x400?text=Tennis+Court+B",
  },
  {
    id: "tennis-c",
    name: "Tennis Court C",
    sport: "tennis",
    coordinates: { lat: 3.06811, lng: 101.49785 },
    imageUrl: "https://placehold.co/600x400?text=Tennis+Court+C",
  },
  {
    id: "tennis-d",
    name: "Tennis Court D",
    sport: "tennis",
    coordinates: { lat: 3.068077, lng: 101.498012 },
    imageUrl: "https://placehold.co/600x400?text=Tennis+Court+D",
  },
  {
    id: "badminton-1",
    name: "Badminton Court",
    sport: "badminton",
    coordinates: { lat: 3.067444, lng: 101.49729 }, // Updated coordinates
    imageUrl: "https://placehold.co/600x400?text=Badminton+Court",
  },
  {
    id: "football-1",
    name: "Football & Rugby Field",
    sport: "football",
    coordinates: { lat: 3.067412, lng: 101.495758 },
    imageUrl: "https://placehold.co/600x400?text=Football+%26+Rugby+Field",
  },
  {
    id: "football-uitm",
    name: "UITM Football Field",
    sport: "football",
    coordinates: { lat: 3.065723, lng: 101.497694 }, // Updated coordinates
    imageUrl: "https://placehold.co/600x400?text=UITM+Football+Field",
  },
  {
    id: "football-synthetic",
    name: "UITM Synthetic Football Field",
    sport: "football",
    coordinates: extractCoordsFromUrl(
      "https://maps.app.goo.gl/A86sVsSXR1mjEjtJ7",
    ) || { lat: 3.0682, lng: 101.501 }, // Fallback coordinates
    imageUrl: "https://placehold.co/600x400?text=UITM+Synthetic+Football+Field",
  },
  {
    id: "football-natural",
    name: "UITM Natural Grass Football Field",
    sport: "football",
    coordinates: { lat: 3.065848, lng: 101.499299 }, // Updated coordinates
    imageUrl:
      "https://placehold.co/600x400?text=UITM+Natural+Grass+Football+Field",
  },
  {
    id: "futsal-perindu-a",
    name: "Futsal Perindu Court A",
    sport: "futsal",
    coordinates: { lat: 3.067714, lng: 101.498947 },
    imageUrl: "https://placehold.co/600x400?text=Futsal+Perindu+Court+A",
  },
  {
    id: "futsal-perindu-b",
    name: "Futsal Perindu Court B",
    sport: "futsal",
    coordinates: { lat: 3.067658, lng: 101.498794 },
    imageUrl: "https://placehold.co/600x400?text=Futsal+Perindu+Court+B",
  },
  {
    id: "futsal-perindu-c",
    name: "Futsal Perindu Court C",
    sport: "futsal",
    coordinates: { lat: 3.066719, lng: 101.501355 },
    imageUrl: "https://placehold.co/600x400?text=Futsal+Perindu+Court+C",
  },
  {
    id: "volleyball-perindu-a",
    name: "Volleyball Perindu Court A",
    sport: "volleyball",
    coordinates: { lat: 3.067391, lng: 101.498991 },
    imageUrl: "https://placehold.co/600x400?text=Volleyball+Perindu+Court+A",
  },
  {
    id: "volleyball-perindu-b",
    name: "Volleyball Perindu Court B",
    sport: "volleyball",
    coordinates: { lat: 3.067374, lng: 101.49886 },
    imageUrl: "https://placehold.co/600x400?text=Volleyball+Perindu+Court+B",
  },
  {
    id: "pingpong-1",
    name: "Ping Pong Court",
    sport: "pingpong",
    coordinates: { lat: 3.064038, lng: 101.505604 }, // Updated coordinates
    imageUrl: "https://placehold.co/600x400?text=Ping+Pong+Court",
  },
  {
    id: "badminton-budisiswa",
    name: "Badminton Budisiswa Court",
    sport: "badminton",
    coordinates: { lat: 3.064032, lng: 101.505598 }, // Updated coordinates
    imageUrl: "https://placehold.co/600x400?text=Badminton+Budisiswa+Court",
  },
  {
    id: "tennis-budisiswa",
    name: "Tennis Budisiswa Court",
    sport: "tennis",
    coordinates: { lat: 3.063965, lng: 101.505024 },
    imageUrl: "https://placehold.co/600x400?text=Tennis+Budisiswa+Court",
  },
];

// Group facilities by sport type for easier filtering
const facilitiesBySport = campusFacilities.reduce((acc, facility) => {
  if (!acc[facility.sport]) {
    acc[facility.sport] = [];
  }
  acc[facility.sport].push(facility);
  return acc;
}, {});

/**
 * MapView component for displaying venues on a map
 */
const MapView = ({
  matches,
  selectedSport,
  onViewModeChange,
  onSportFilterChange,
  navigateToListWithFilters,
  sportFilters,
  supabase,
}) => {
  // Add custom CSS for map markers with modern styling
  const markerStyles = `
    @keyframes pulse {
      0% {
        box-shadow: 0 0 0 0 rgba(211, 47, 47, 0.7);
        transform: scale(1) translateY(0) rotate(-45deg);
      }
      50% {
        box-shadow: 0 0 0 10px rgba(211, 47, 47, 0);
        transform: scale(1.1) translateY(-5px) rotate(-45deg);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(211, 47, 47, 0);
        transform: scale(1) translateY(0) rotate(-45deg);
      }
    }
    
    @keyframes ripple {
      0% {
        box-shadow: 0 0 0 0 rgba(211, 47, 47, 0.5);
        transform: scale(0.8);
        opacity: 1;
      }
      100% {
        box-shadow: 0 0 0 20px rgba(211, 47, 47, 0);
        transform: scale(1.8);
        opacity: 0;
      }
    }
    
    @keyframes float {
      0% {
        transform: translateY(0px);
      }
      50% {
        transform: translateY(-5px);
      }
      100% {
        transform: translateY(0px);
      }
    }
    
    .gps-marker {
      position: relative;
      filter: drop-shadow(0 3px 2px rgba(0,0,0,0.2));
      transition: all 0.3s ease;
      animation: float 3s ease-in-out infinite;
    }
    
    .gps-marker.selected {
      z-index: 1001 !important;
      filter: drop-shadow(0 5px 5px rgba(0,0,0,0.3));
    }
    
    .gps-marker.selected .pin {
      animation: pulse 1.5s infinite;
      box-shadow: 0 0 10px 2px rgba(211, 47, 47, 0.7);
    }
    
    .gps-marker .ripple {
      position: absolute;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: transparent;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: -1;
    }
    
    .gps-marker.selected .ripple {
      animation: ripple 2s infinite;
    }
    
    .leaflet-marker-icon:active .pin, .leaflet-popup-target .pin {
      animation: pulse 1.5s infinite;
    }
    
    .gps-marker .pin {
      width: 22px;
      height: 30px;
      background-color: #d32f2f;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 3px 5px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2);
      position: relative;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      border: 1.5px solid rgba(255, 255, 255, 0.9);
    }
    
    .gps-marker:hover .pin {
      transform: rotate(-45deg) scale(1.1);
    }
    
    .gps-marker .pin::after {
      content: '';
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.9);
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      box-shadow: inset 0 0 2px rgba(0,0,0,0.15);
    }
    
    .gps-marker .material-icons {
      font-family: 'Material Icons';
      font-weight: normal;
      font-style: normal;
      display: inline-block;
      line-height: 1;
      text-transform: none;
      letter-spacing: normal;
      word-wrap: normal;
      white-space: nowrap;
      direction: ltr;
      -webkit-font-feature-settings: 'liga';
      -webkit-font-smoothing: antialiased;
    }
    
    /* Styles for multi-sport markers */
    .gps-marker.multi-sport .pin {
      overflow: hidden;
      background: linear-gradient(135deg, var(--color1) 0%, var(--color1) 49%, white 49.5%, white 50.5%, var(--color2) 51%, var(--color2) 100%);
    }
    
    .gps-marker.multi-sport .half {
      position: absolute;
      width: 50%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .gps-marker.multi-sport .half:first-child {
      left: 0;
      border-right: 1px solid rgba(255, 255, 255, 0.5);
    }
    
    .gps-marker.multi-sport .half:last-child {
      right: 0;
    }
    
    /* Map customizations */
    .leaflet-container {
      background-color: #f8f8f8 !important;
      font-family: 'Inter', sans-serif !important;
    }
    
    .leaflet-popup-content-wrapper {
      border-radius: 8px !important;
      box-shadow: 0 3px 14px rgba(0,0,0,0.2) !important;
    }
    
    .leaflet-popup-tip {
      box-shadow: 0 3px 14px rgba(0,0,0,0.2) !important;
    }
    
    /* Ensure Material Icons load properly */
    @font-face {
      font-family: 'Material Icons';
      font-style: normal;
      font-weight: 400;
      src: url(https://fonts.gstatic.com/s/materialicons/v140/flUhRq6tzZclQEJ-Vdg-IuiaDsNcIhQ8tQ.woff2) format('woff2');
    }
  `;
  
  // Initialize with the parent's selected sport
  const [mapViewSelectedSport, setMapViewSelectedSport] = useState(selectedSport || "all");
  
  // Track coordinates for each sport's venues for navigation
  const [venueCoordinatesBySport, setVenueCoordinatesBySport] = useState({});
  
  // State for navigation notification
  const [notification, setNotification] = useState(null);
  
  // Add state for tracking current venue index and storing sport venues
  const [currentVenueIndex, setCurrentVenueIndex] = useState(0);
  const [sportVenues, setSportVenues] = useState([]);
  
  // Add state to track the currently active popup venue
  const [activePopupVenue, setActivePopupVenue] = useState(null);
  const activeMarkerRef = useRef(null);
  const previousMarkerRef = useRef(null); // Track previous marker to close its popup
  const markerRefsMap = useRef({}); // Store all marker references by venue ID
  
  // Reference to the map instance
  const mapRef = useRef(null);
  
  // Keep local state in sync with parent's selectedSport
  useEffect(() => {
    if (selectedSport !== mapViewSelectedSport) {
      setMapViewSelectedSport(selectedSport);
    }
  }, [selectedSport]);
  
  // Handle next venue navigation
  const handleNextVenue = () => {
    if (!sportVenues || sportVenues.length <= 1) {
      console.log("No venues to navigate to");
      return;
    }
    
    // Make sure we have a valid current index
    let currentIdx = currentVenueIndex;
    if (currentIdx < 0 || currentIdx >= sportVenues.length) {
      currentIdx = 0; // Reset to first venue if out of bounds
    }
    
    // Calculate next index (loop back to 0 if at the end)
    const nextIndex = (currentIdx + 1) % sportVenues.length;
    
    // Get the next venue with validation
    const nextVenue = sportVenues[nextIndex];
    if (!nextVenue) {
      console.error("Next venue is undefined");
      return;
    }
    
    console.log(`Navigating from venue ${currentIdx + 1} to venue ${nextIndex + 1} of ${sportVenues.length}`);
    
    // Close any open popup first
    if (previousMarkerRef.current) {
      previousMarkerRef.current.closePopup();
    }
    
    // Update state
    setCurrentVenueIndex(nextIndex);
    setActivePopupVenue(nextVenue);
    
    // Show notification with safe access
    setNotification({
      message: `Navigating to ${nextVenue.name || 'next venue'} (${nextIndex + 1} of ${sportVenues.length})`,
      type: 'info'
    });
    
    // Clear notification after 3 seconds
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  // Handle sport filter change specific to map view
  const handleSportFilterChange = (sportId, event, fromPopup = false) => {
    // Prevent default behavior to avoid any view switching
    if (event && event.preventDefault) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // Set the selected sport filter
    setMapViewSelectedSport(sportId);
    
    // Close any existing popups if not called from a popup
    if (!fromPopup && previousMarkerRef.current) {
      previousMarkerRef.current.closePopup();
    }
    
    // If called from a popup, don't change the active popup venue
    // This prevents the map from jumping to other locations when selecting a sport in a popup
    if (fromPopup) {
      console.log('Sport filter changed from popup, keeping current venue');
      
      // Keep the current active popup venue
    } else {
      // When changing sport filter not from popup, reset active popup venue
      if (sportId !== 'all' && sportVenues && sportVenues.length > 0) {
        // Find the first venue for this sport and set it as active
        setActivePopupVenue(sportVenues[0]);
      } else {
        setActivePopupVenue(null);
      }
    }
    
    // Only show navigation notification if not called from a popup
    if (!fromPopup && sportId !== 'all' && venueCoordinatesBySport[sportId]) {
      const venueName = venueCoordinatesBySport[sportId].venueName || 'a venue';
      const sportName = sportFilters.find(s => s.id === sportId)?.name || 'this sport';
      
      // Show notification about navigation
      setNotification({
        message: `Navigating to ${venueName} for ${sportName}`,
        type: 'info'
      });
      
      // Clear notification after 3 seconds
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    } else if (sportId === 'all') {
      // Clear any notification
      setNotification(null);
    }
    
    // Don't propagate filter changes to parent component anymore
    // This keeps map view filters isolated from other views
      console.log('Map view filter changed to:', sportId);
  };
  
  // Map style options with direct URLs
  // Use CartoDB modern tile style (Voyager - brighter but not too bright)
  const tileProviderUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  const tileProviderAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>';

  // Additional tile providers for terrain and satellite views
  // Using ESRI World Imagery as the main terrain view (as requested by user)
  const terrainTileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  const terrainAttribution = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
  
  // ESRI World Imagery for satellite view (same as terrain in this case)
  const satelliteTileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  const satelliteAttribution = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
  
  // ESRI Topographic map for detailed terrain
  const topoTileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}';
  const topoAttribution = 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community';

  // Select which tile provider to use - default to terrain for better visualization
  const [selectedTileProvider, setSelectedTileProvider] = useState('terrain'); // Options: 'default', 'terrain', 'satellite', 'topo'
  
  // Get the active tile provider based on selection
  const getActiveTileProvider = () => {
    switch(selectedTileProvider) {
      case 'terrain':
        return {
          url: terrainTileUrl,
          attribution: terrainAttribution
        };
      case 'satellite':
        return {
          url: satelliteTileUrl,
          attribution: satelliteAttribution
        };
      case 'topo':
        return {
          url: topoTileUrl,
          attribution: topoAttribution
        };
      default:
        return {
          url: tileProviderUrl,
          attribution: tileProviderAttribution
        };
    }
  };
  
  const activeTileProvider = getActiveTileProvider();

  // Filter venues and facilities based on search query and sport
  const [filteredVenues, setFilteredVenues] = useState([]);
  // Keep track of venues that match the sport filter for highlighting
  const [sportMatchingVenues, setSportMatchingVenues] = useState([]);

  const [mapCenter, setMapCenter] = useState([3.139, 101.6869]); // Default to KL
  const [mapBounds, setMapBounds] = useState(null);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Add useEffect to load venues when component mounts
  useEffect(() => {
    const loadVenues = async () => {
      setLoading(true);
      try {
        // Fetch locations from the database instead of venues
        const { data: locationsData, error: locationsError } = await supabase
          .from('locations')
          .select('*');
        
        if (locationsError) {
          console.error('Error loading venues:', locationsError);
          setError(`Error loading venues: ${locationsError.message}`);
          throw locationsError;
        }
        
        if (locationsData && locationsData.length > 0) {
          console.log('Loaded locations:', locationsData.length);
          // Transform locations data to match the expected venues format
          const venuesData = locationsData.map(location => {
            // Handle coordinates with proper null checks
            let latitude = null;
            let longitude = null;
            
            if (location.coordinates) {
              latitude = location.coordinates.lat || null;
              longitude = location.coordinates.lng || null;
            }
            
            // Log if coordinates are missing
            if (latitude === null || longitude === null) {
              console.warn(`Missing coordinates for location: ${location.name} (${location.id})`);
            }
            
            // Provide fallback coordinates for venues without them
            if (latitude === null) latitude = 3.0674; // Default campus latitude 
            if (longitude === null) longitude = 101.4965; // Default campus longitude
            
            return {
              id: location.id,
              name: location.name,
              address: location.address || location.campus,
              description: location.name,
              latitude: latitude,
              longitude: longitude,
              campus: location.campus,
              sports: location.supported_sports || [],
              supported_sports: location.supported_sports || [],
              image_url: location.image_url
            };
          });
          
          // Create bounds for all venues with valid coordinates
          if (venuesData.length > 0) {
            const validCoords = venuesData
              .filter(venue => venue.latitude && venue.longitude && 
                              !isNaN(venue.latitude) && !isNaN(venue.longitude))
              .map(venue => [venue.latitude, venue.longitude]);
            
            if (validCoords.length > 0) {
              // Create a Leaflet bounds object from all venue coordinates
              const bounds = L.latLngBounds(validCoords);
              setMapBounds(bounds);
              
              // Also set map center to the center of all venues
              const center = bounds.getCenter();
              setMapCenter([center.lat, center.lng]);
            }
          }
          
          setVenues(venuesData);
          setFilteredVenues(venuesData);
        } else {
          console.log('No locations data returned');
          setVenues([]);
          setFilteredVenues([]);
        }
      } catch (error) {
        console.error('Error loading venues:', error);
        setError('Failed to load venues');
      } finally {
        setLoading(false);
      }
    };
    
    loadVenues();
  }, [supabase]);
  
  // Filter venues when sport selection changes and prepare coordinates for navigation
  useEffect(() => {
    if (!venues || venues.length === 0) return;
    
    let sportMatches = [];
    
    // Identify venues that match the selected sport
    if (mapViewSelectedSport && mapViewSelectedSport !== 'all') {
      sportMatches = venues.filter(venue => {
        // Primary check: supported_sports array includes the selected sport
        if (venue.supported_sports && 
            Array.isArray(venue.supported_sports) && 
            venue.supported_sports.includes(mapViewSelectedSport)) {
          return true;
        }
        
        // Secondary check: sports array might have the sport (older format)
        if (venue.sports && Array.isArray(venue.sports)) {
          // Get sport name from ID for comparison
          const sportObj = sportFilters.find(s => s.id === mapViewSelectedSport);
          const sportName = sportObj ? sportObj.name.toLowerCase() : '';
          
          return venue.sports.some(s => 
            (typeof s === 'string' && s.toLowerCase() === sportName) ||
            (s.id && s.id === mapViewSelectedSport) ||
            (s.name && s.name.toLowerCase() === sportName)
          );
        }
        
        return false;
      });
      
      // Store the matching venues for highlighting
      setSportMatchingVenues(sportMatches.map(venue => venue.id));
      
      // CHANGE: Only show venues matching the selected sport
      setFilteredVenues(sportMatches);
      
      // NEW: Store the full venue objects for the selected sport and reset current index
      setSportVenues(sportMatches);
      setCurrentVenueIndex(0);
      
      // Set the first venue as the active popup venue if available
      if (sportMatches.length > 0) {
        setActivePopupVenue(sportMatches[0]);
      } else {
        setActivePopupVenue(null);
      }
    } else {
      // No sport filter, clear the matching venues list
      setSportMatchingVenues([]);
      
      // Show all venues when no sport filter is applied
      setFilteredVenues(venues);
      
      // NEW: Clear sport venues array and reset index
      setSportVenues([]);
      setCurrentVenueIndex(0);
      
      // Clear the active popup venue
      setActivePopupVenue(null);
    }
    
    // Build a mapping of sport IDs to venue coordinates for navigation
    const sportVenueMap = {};
    
    // Process all venues and collect coordinates by sport
    venues.forEach(venue => {
      // Skip venues with invalid coordinates
      if (!venue.latitude || !venue.longitude || 
          isNaN(venue.latitude) || isNaN(venue.longitude)) {
        return;
      }
      
      // Add coordinates for each supported sport
      if (venue.supported_sports && Array.isArray(venue.supported_sports)) {
        venue.supported_sports.forEach(sportId => {
          // Only add if we don't already have coordinates for this sport
          // or randomly decide to update it for variety (10% chance)
          if (!sportVenueMap[sportId] || Math.random() < 0.1) {
            sportVenueMap[sportId] = {
              lat: venue.latitude,
              lng: venue.longitude,
              venueName: venue.name
            };
          }
        });
      }
      
      // Also check the older sports array format
      if (venue.sports && Array.isArray(venue.sports)) {
        venue.sports.forEach(sport => {
          const sportId = (typeof sport === 'string') ? 
            sportFilters.find(s => s.name.toLowerCase() === sport.toLowerCase())?.id : 
            (sport.id || null);
            
          if (sportId && (!sportVenueMap[sportId] || Math.random() < 0.1)) {
            sportVenueMap[sportId] = {
              lat: venue.latitude,
              lng: venue.longitude,
              venueName: venue.name
            };
          }
        });
      }
    });
    
    // Ensure all sports have at least one venue with coordinates
    // Find any venue with valid coordinates to use as default
    const defaultVenue = venues.find(venue => 
      venue.latitude && venue.longitude && !isNaN(venue.latitude) && !isNaN(venue.longitude)
    );
    
    // Add default coordinates for sports that don't have any
    if (defaultVenue) {
      // Go through all sport filters except 'all'
      sportFilters.forEach(sport => {
        if (sport.id !== 'all' && !sportVenueMap[sport.id]) {
          console.log(`Adding default coordinates for sport: ${sport.name} (${sport.id})`);
          sportVenueMap[sport.id] = {
            lat: defaultVenue.latitude,
            lng: defaultVenue.longitude,
            venueName: `Default ${sport.name} location`
          };
        }
      });
    }
    
    // Log which sports have coordinates for debugging
    console.log('Sports with coordinates:', Object.keys(sportVenueMap).map(sportId => {
      const sport = sportFilters.find(s => s.id === sportId);
      return sport ? sport.name : sportId;
    }));
    
    // Update the coordinates map for use by the navigation component
    setVenueCoordinatesBySport(sportVenueMap);
  }, [venues, mapViewSelectedSport, sportFilters]);
  
  // Add effect to handle popup opening when activePopupVenue changes
  useEffect(() => {
    if (activePopupVenue) {
      // Get the marker reference from our map
      const marker = markerRefsMap.current[activePopupVenue.id];
      
      if (marker) {
        // Set a small delay to allow the map to finish panning/zooming
        setTimeout(() => {
          // Close previous popup if it exists
          if (previousMarkerRef.current && previousMarkerRef.current !== marker) {
            previousMarkerRef.current.closePopup();
          }
          
          // Open the popup for this marker
          marker.openPopup();
          
          // Update the previous marker reference
          previousMarkerRef.current = marker;
        }, 500); // 500ms delay gives time for the map animation to complete
      }
    }
  }, [activePopupVenue]);

  // Get sport icon for map markers
  const getSportIcon = (venue) => {
    // Function to get icon class and color for a specific sport
    const getSportIconInfo = (sportName) => {
      if (!sportName) return { icon: "sports", color: "#3f51b5" };

      const sport =
        typeof sportName === "string" ? sportName.toLowerCase() : "";

      if (
        sport.includes("football") ||
        sport.includes("soccer") ||
        sport.includes("futsal")
      ) {
        return { icon: "sports_soccer", color: "#4CAF50" }; // Green
      } else if (sport.includes("basketball")) {
        return { icon: "sports_basketball", color: "#FF5722" }; // Orange
      } else if (sport.includes("tennis")) {
        return { icon: "sports_tennis", color: "#CDDC39" }; // Lime
      } else if (sport.includes("badminton")) {
        return { icon: "sports_tennis", color: "#8BC34A" }; // Light Green
      } else if (sport.includes("volleyball")) {
        return { icon: "sports_volleyball", color: "#9C27B0" }; // Purple
      } else if (sport.includes("rugby")) {
        return { icon: "sports_rugby", color: "#795548" }; // Brown
      } else if (sport.includes("hockey")) {
        return { icon: "sports_hockey", color: "#E91E63" }; // Pink
      } else if (sport.includes("frisbee")) {
        return { icon: "sports", color: "#2196F3" }; // Blue
      } else if (sport.includes("squash")) {
        return { icon: "sports_tennis", color: "#FF9800" }; // Orange
      } else if (sport.includes("ping") || sport.includes("pong")) {
        return { icon: "sports_tennis", color: "#FF9800" }; // Orange
      }

      return { icon: "sports", color: "#3f51b5" }; // Default blue
    };
    
    // Check if venue supports the selected sport filter 
    const isSelectedSportVenue = () => {
      // Sport filter is active and this venue is in our sportMatchingVenues list
      return mapViewSelectedSport !== 'all' && sportMatchingVenues.includes(venue.id);
    };

    // Create a smaller, cleaner marker using divIcon
    const iconSize = 22; // Smaller size (was 28)
    const iconAnchor = iconSize / 2;

    // Check if this venue matches the current sport filter
    const isSelectedVenue = isSelectedSportVenue();
    
    // Adjust icon size if this venue matches the selected sport filter
    const finalIconSize = isSelectedVenue ? iconSize * 1.2 : iconSize;
    
    // Get sport names for the venue
    let sportNames = [];
    if (
      venue.supported_sports &&
      Array.isArray(venue.supported_sports) &&
      venue.supported_sports.length > 0
    ) {
      // Convert sport IDs to names
      sportNames = venue.supported_sports
        .map((sportId) => {
          const sport = sportFilters.find((s) => s.id === sportId);
          return sport ? sport.name : "";
        })
        .filter((name) => name); // Filter out empty names

      // Put highlighted sport first if applicable
      if (mapViewSelectedSport !== 'all') {
        const highlightedSport = sportFilters.find(s => s.id === mapViewSelectedSport)?.name;
        if (highlightedSport && sportNames.includes(highlightedSport)) {
          sportNames = [
            highlightedSport,
            ...sportNames.filter(name => name !== highlightedSport)
          ];
        }
      }
    } else if (venue.sports && Array.isArray(venue.sports)) {
      sportNames = venue.sports
        .map((s) => (typeof s === "string" ? s : s.name))
        .filter((name) => name);
    }

    // Limit to max 2 sports for display
    if (sportNames.length > 2) {
      sportNames = sportNames.slice(0, 2);
    }

    // Default to "other" if no sports found
    if (sportNames.length === 0) {
      sportNames = ["Other"];
    }

    let html;
    let className;

    if (sportNames.length === 1) {
      // Single sport marker - Use GPS marker style
      const sport = getSportIconInfo(sportNames[0]);
      
      html = `
        <div class="gps-marker ${isSelectedVenue ? 'selected' : ''}">
          <div class="ripple"></div>
          <div class="pin" style="background-color: ${sport.color};">
            <span class="material-icons" aria-hidden="true" style="font-size: 12px; color: white; transform: rotate(45deg); display: block; text-align: center;">${sport.icon}</span>
          </div>
        </div>
      `;
      
      className = `sport-${sportNames[0].toLowerCase().replace(/\s+/g, "-")}`;
    } else {
      // Multiple sports marker (max 2) - Use GPS marker with split colors
      const sport1 = getSportIconInfo(sportNames[0]);
      const sport2 = getSportIconInfo(sportNames[1]);

      html = `
        <div class="gps-marker multi-sport ${isSelectedVenue ? 'selected' : ''}">
          <div class="ripple"></div>
          <div class="pin" style="--color1: ${sport1.color}; --color2: ${sport2.color};">
            <div class="half" style="background-color: ${sport1.color};">
              <span class="material-icons" aria-hidden="true" style="font-size: 10px; color: white; transform: rotate(45deg); display: block; text-align: center;">${sport1.icon}</span>
          </div>
            <div class="half" style="background-color: ${sport2.color};">
              <span class="material-icons" aria-hidden="true" style="font-size: 10px; color: white; transform: rotate(45deg); display: block; text-align: center;">${sport2.icon}</span>
            </div>
          </div>
        </div>
      `;
      className = "";
    }

    return new L.divIcon({
      html: html,
      className: className,
      iconSize:
        sportNames.length > 1
          ? [finalIconSize * 1.2, finalIconSize]
          : [finalIconSize, finalIconSize],
      iconAnchor:
        sportNames.length > 1
          ? [finalIconSize * 0.6, finalIconSize / 2]
          : [finalIconSize / 2, finalIconSize / 2],
      popupAnchor: [0, -finalIconSize / 2],
    });
  };
    
  // Render map component with properly structured elements
  return (
    <Box sx={{ height: '70vh', width: '100%', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
      {/* Add marker styles and map customizations */}
      <Box component="style">{`
        .leaflet-container {
          width: 100% !important;
          height: 100% !important;
          z-index: 1 !important;
          font-family: 'Inter', sans-serif;
        }
        ${markerStyles}
      `}</Box>
      
      {/* Navigation Notification */}
      {notification && (
        <Box
          sx={{
            position: 'absolute',
            top: 60,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1001,
            borderRadius: 2,
            p: 1,
            px: 2,
            backgroundColor: notification.type === 'error' ? 'error.main' : 'primary.main',
            color: 'white',
            boxShadow: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            maxWidth: '90%'
          }}
        >
          <InfoIcon fontSize="small" />
          <Typography variant="body2">{notification.message}</Typography>
        </Box>
      )}
      
      {/* Sport Filter - positioned at the top-left of the map */}
      <Paper
        className="map-sport-filter"
        sx={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 1000,
          p: 2,
          borderRadius: 2,
          maxWidth: '280px',
          backgroundColor: 'rgba(248, 247, 245, 0.95)',
          backdropFilter: 'blur(4px)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          transition: 'all 0.3s',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }
        }}
      >
        <Typography
          variant="subtitle2"
          fontWeight="bold"
          sx={{
            mb: 1.5,
            px: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: 'text.secondary'
          }}
        >
          <FilterListIcon sx={{ fontSize: '1.1rem' }} />
          Filter by Sport
        </Typography>

        <Box
          sx={{
            display: 'flex',
            flexWrap: 'nowrap',
            gap: 1,
            overflowX: 'auto',
            pb: 1,
            px: 0.5,
            '&::-webkit-scrollbar': {
              height: 6,
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'rgba(0,0,0,0.05)',
              borderRadius: 3,
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0,0,0,0.2)',
              borderRadius: 3,
              '&:hover': {
                backgroundColor: 'rgba(0,0,0,0.3)',
              },
            },
          }}
        >
          <Chip
            label="All Sports"
            size="small"
            onClick={(e) => handleSportFilterChange('all', e)}
            variant={mapViewSelectedSport === 'all' ? 'filled' : 'outlined'}
            sx={{
              flexShrink: 0,
              borderRadius: 1.5,
              fontWeight: 500,
              transition: 'all 0.2s ease-in-out',
              ...(mapViewSelectedSport === 'all' ? {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                '&:hover': {
                  bgcolor: 'primary.dark',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                },
              } : {
                bgcolor: 'background.paper',
                color: 'text.secondary',
                borderColor: 'divider',
                '&:hover': {
                  bgcolor: 'action.hover',
                  color: 'text.primary',
                  borderColor: 'primary.main',
                },
              }),
            }}
          />
          {sportFilters.slice(1).map((sport) => (
            <Chip
              key={sport.id}
              icon={sport.icon}
              label={sport.name}
              size="small"
              onClick={(e) => handleSportFilterChange(sport.id, e)}
              variant={mapViewSelectedSport === sport.id ? 'filled' : 'outlined'}
              sx={{
                flexShrink: 0,
                borderRadius: 1.5,
                fontWeight: 500,
                transition: 'all 0.2s ease-in-out',
                ...(mapViewSelectedSport === sport.id ? {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                  },
                } : {
                  bgcolor: 'background.paper',
                  color: 'text.secondary',
                  borderColor: 'divider',
                  '&:hover': {
                    bgcolor: 'action.hover',
                    color: 'text.primary',
                    borderColor: 'primary.main',
                  },
                }),
              }}
            />
          ))}
        </Box>
      </Paper>
      
      {/* Next Venue Button - show only when a sport is selected and multiple venues exist */}
      {mapViewSelectedSport !== 'all' && sportVenues.length > 1 && (
        <Fab
          color="primary"
          size="medium"
          aria-label="next venue"
          onClick={handleNextVenue}
          sx={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            zIndex: 1000,
          }}
        >
          <NavigateNextIcon />
        </Fab>
      )}
      
      {/* Venue Counter - show when multiple venues exist */}
      {mapViewSelectedSport !== 'all' && sportVenues.length > 1 && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 25,
            right: 80, // Position to the left of the Next button
            zIndex: 1000,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            borderRadius: 1,
            px: 1,
            py: 0.5,
            display: 'flex',
            alignItems: 'center',
            boxShadow: 1,
          }}
        >
          <Typography variant="body2" fontWeight="medium">
            {currentVenueIndex + 1} / {sportVenues.length}
          </Typography>
        </Box>
      )}
      
      {/* Map Container */}
      <Box 
        className="map-container-wrapper"
        sx={{ 
          height: '100%',
          width: '100%',
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
          className="dark-map"
        >
          <TileLayer
            url={activeTileProvider.url}
            attribution={activeTileProvider.attribution}
          />
          <ZoomControl position="bottomright" />
          
          <SetViewOnLocation 
            center={mapCenter} 
            bounds={mapBounds} 
            selectedSportId={mapViewSelectedSport}
            venueCoordinates={venueCoordinatesBySport}
            currentVenueIndex={currentVenueIndex}
            sportVenues={sportVenues}
          />

          {/* Render venue markers */}
          {filteredVenues && filteredVenues.map((venue) => {
            // Skip rendering venues with invalid coordinates
            if (!venue.latitude || !venue.longitude || 
                isNaN(venue.latitude) || isNaN(venue.longitude)) {
              console.warn(`Skipping venue with invalid coordinates: ${venue.name}`);
              return null;
            }
            
            // Store marker reference if this is the active venue
            const isActiveVenue = activePopupVenue && activePopupVenue.id === venue.id;
            
            return (
              <Marker
                key={venue.id}
                position={[venue.latitude, venue.longitude]}
                icon={getSportIcon(venue)}
                className={sportMatchingVenues.includes(venue.id) ? "selected-venue" : ""}
                ref={(marker) => {
                  // Store this marker in our refs map
                  if (marker) {
                    markerRefsMap.current[venue.id] = marker;
                  }
                  
                  if (isActiveVenue) {
                    activeMarkerRef.current = marker;
                  }
                }}
                eventHandlers={{
                  click: (e) => {
                    // Close the previous popup if it exists
                    if (previousMarkerRef.current && previousMarkerRef.current !== e.target) {
                      previousMarkerRef.current.closePopup();
                    }
                    
                    // Update the active popup venue
                    setActivePopupVenue(venue);
                    
                    // Update current venue index if this is in the sportVenues array
                    if (sportVenues.length > 0) {
                      const venueIndex = sportVenues.findIndex(v => v.id === venue.id);
                      if (venueIndex !== -1) {
                        setCurrentVenueIndex(venueIndex);
                      }
                    }
                    
                    // Store this marker as the previous one for next time
                    previousMarkerRef.current = e.target;
                  }
                }}
              >
                <Popup
                  closeOnClick={false}
                  autoClose={false}
                >
                  <Box sx={{ p: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {venue.name}
                    </Typography>
                    
                    {/* Venue Image Placeholder */}
                    <Box 
                      sx={{ 
                        width: '100%', 
                        height: 120, 
                        backgroundColor: 'rgba(0,0,0,0.05)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        borderRadius: 1,
                        mb: 1,
                        overflow: 'hidden'
                      }}
                    >
                      {(() => {
                        const venueImage = getVenueImage(venue.name) || venue.image_url;
                        return venueImage ? (
                          <img
                            src={venueImage}
                            alt={getVenueImageAlt(venue.name)}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <Box sx={{ textAlign: 'center', p: 1 }}>
                            <ImageIcon sx={{ fontSize: '2rem', color: 'text.secondary', opacity: 0.5 }} />
                            <Typography variant="caption" color="text.secondary" display="block">
                              Venue Image
                            </Typography>
                          </Box>
                        );
                      })()}
                    </Box>
                    
                    {venue.description && (
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {venue.description}
                      </Typography>
                    )}
                    
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <LocationOnIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                      {venue.address || "Address not available"}
                    </Typography>
                    
                    {venue.supported_sports && venue.supported_sports.length > 0 && (
                      <>
                        <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 0.5 }}>
                          Supported Sports:
                        </Typography>
                        <ButtonGroup variant="outlined" size="small" sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
                          {venue.supported_sports.map(sportId => {
                            const sport = sportFilters.find(s => s.id === sportId);
                            if (!sport) return null;
                            
                            const sportName = sport.name;
                            
                            return (
                              <Button
                                key={sportId}
                                startIcon={<SportIcon sportName={sportName} />}
                                size="small"
                                onClick={(e) => {
                                  if (sportId && typeof handleSportFilterChange === 'function') {
                                    handleSportFilterChange(sportId, e, true); // Pass true for fromPopup parameter
                                  }
                                }}
                                color={sportId === mapViewSelectedSport ? "primary" : "inherit"}
                                variant={sportId === mapViewSelectedSport ? "contained" : "outlined"}
                              >
                                {sportName}
                              </Button>
                            );
                          })}
                        </ButtonGroup>
                      </>
                    )}
                    
                                        <Button 
                      variant="contained" 
                      color="primary" 
                      fullWidth
                      startIcon={<EventIcon />}
                      onClick={() => {
                        // Get the selected sport(s) for this venue
                        let selectedSport = null;
                        
                        // If user has selected a sport for this venue, use that
                        if (mapViewSelectedSport && mapViewSelectedSport !== 'all' && 
                            venue.supported_sports && venue.supported_sports.includes(mapViewSelectedSport)) {
                          selectedSport = mapViewSelectedSport;
                        } 
                        // Otherwise default to first supported sport
                        else if (venue.supported_sports && venue.supported_sports.length > 0) {
                          selectedSport = venue.supported_sports[0];
                        }
                        
                        // If venue has multiple sports and user hasn't selected one yet, 
                        // show a dialog or use the buttons above
                        
                        // Navigate to List view with filters
                        if (typeof onViewModeChange === 'function') {
                          // Create a location object with the venue's data and supported sports
                          const locationObj = {
                            name: venue.name,
                            id: venue.id,
                            coordinates: {
                              lat: venue.latitude,
                              lng: venue.longitude
                            },
                            supported_sports: venue.supported_sports || []
                          };
                          
                          // Call the parent's navigateToListWithFilters function
                          if (typeof navigateToListWithFilters === 'function') {
                            navigateToListWithFilters(locationObj, selectedSport);
                          } else {
                            // Fallback to direct navigation
                            onViewModeChange(null, 0);
                            if (typeof onSportFilterChange === 'function' && selectedSport) {
                              onSportFilterChange(selectedSport);
                            }
                          }
                        }
                      }}
                    >
                      Find Matches Here
                    </Button>
                  </Box>
                </Popup>
              </Marker>
            );
          })}

          {/* Show message when no venues match filters */}
          {filteredVenues && filteredVenues.length === 0 && !loading && (
            <Popup 
              position={mapCenter}
              closeButton={false}
            >
              <Box p={1} textAlign="center">
                <Typography variant="body2">
                  {error ? 'Error loading venues' : 'No venues found for the selected filters'}
                </Typography>
                {mapViewSelectedSport && mapViewSelectedSport !== 'all' && (
                  <Typography variant="caption" color="text.secondary">
                    Try a different sport filter to see courts in this area
                  </Typography>
                )}
              </Box>
            </Popup>
          )}
        </MapContainer>
      </Box>
    </Box>
  );
};

// Component to set the map view based on center/bounds and handle navigation
const SetViewOnLocation = ({ center, bounds, selectedSportId, venueCoordinates, currentVenueIndex, sportVenues }) => {
  const map = useMap();
  // Keep track of the last animation timestamp to debounce rapid changes
  const lastAnimationRef = useRef(0);

  // Initial map view setup based on center or bounds
  useEffect(() => {
    if (center && center.length === 2) {
      // Simple setView without animation for initial positioning
      map.setView(center, map.getZoom(), { animate: false });
    }
  }, [center, map]);

  useEffect(() => {
    if (bounds) {
      try {
        // Fit bounds without animation for initial view
        map.fitBounds(bounds, { padding: [50, 50], animate: false });
      } catch (error) {
        console.error("Error setting map bounds:", error);
      }
    }
  }, [bounds, map]);
  
  // Handle navigation to venue when active popup venue changes
  useEffect(() => {
    // Debounce rapid animations
    const now = Date.now();
    if (now - lastAnimationRef.current < 500) {
      return; // Skip if less than 500ms since last animation
    }
    
    // Handle navigation when sport filter changes (not from popups)
    if (selectedSportId && selectedSportId !== 'all' && sportVenues && sportVenues.length > 0 && currentVenueIndex >= 0) {
      // Get the current venue based on index
      const safeIndex = Math.min(currentVenueIndex, sportVenues.length - 1);
      const venue = sportVenues[safeIndex];
      
      // Only navigate if coordinates are valid
      if (venue && venue.latitude && venue.longitude && 
          !isNaN(venue.latitude) && !isNaN(venue.longitude)) {
        
        lastAnimationRef.current = now;
        
        // Use smoother animation with slightly longer duration
        map.flyTo([venue.latitude, venue.longitude], 17, {
          animate: true,
          duration: 2.0, // Slightly longer duration for smoother animation
          easeLinearity: 0.25 // More natural easing
        });
        
        console.log(`Navigated to venue ${venue.name} for ${selectedSportId} (${safeIndex + 1}/${sportVenues.length})`);
        return;
      }
    }
    
    // Fallback to original behavior if no specific venue
    if (selectedSportId && selectedSportId !== 'all' && venueCoordinates) {
      // Check if we have coordinates for the selected sport
      if (venueCoordinates[selectedSportId] && 
          venueCoordinates[selectedSportId].lat && 
          venueCoordinates[selectedSportId].lng) {
        
        const { lat, lng } = venueCoordinates[selectedSportId];
        
        if (!isNaN(lat) && !isNaN(lng)) {
          lastAnimationRef.current = now;
          
          // Use smoother animation with slightly longer duration
        map.flyTo([lat, lng], 17, {
          animate: true,
            duration: 2.0,
            easeLinearity: 0.25
        });
        
        console.log(`Navigated to sport facility for ${selectedSportId} at ${lat},${lng}`);
        }
      }
    }
  }, [selectedSportId, venueCoordinates, currentVenueIndex, sportVenues, map]);

  return null;
};

/**
 * CalendarView component for displaying matches in a calendar
 */
const CalendarView = ({ matches, selectedSport, onSportFilterChange, sportFilters }) => {
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const open = Boolean(anchorEl);
  const theme = useTheme();

  // Handle dropdown open/close
  const handleSportFilterButtonClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleSportFilterClose = () => {
    setAnchorEl(null);
  };

  const handleSportSelect = (sportId) => {
    onSportFilterChange(sportId);
    handleSportFilterClose();
  };

  // Set up the localizer for the calendar
  const localizer = useMemo(() => momentLocalizer(moment), []);

  // Prepare matches data for calendar format
  useEffect(() => {
    // Always initialize with an empty array
    let events = [];

    try {
      // Only process matches if we have them
      if (matches && Array.isArray(matches) && matches.length > 0) {
    // Filter matches by selected sport if needed
    let filteredMatches = [...matches];
    if (selectedSport && selectedSport !== "all") {
      filteredMatches = matches.filter(
        (match) =>
          match.sport_id?.toString() === selectedSport ||
          match.sport?.id?.toString() === selectedSport,
      );
    }

    // Convert matches to calendar events
        events = filteredMatches.map((match) => {
          // Safely parse the start time with error handling
          let startTime;
          try {
            startTime = new Date(match.start_time);
            // Check if date is valid
            if (isNaN(startTime.getTime())) {
              console.warn(`Invalid start time for match ${match.id}:`, match.start_time);
              startTime = new Date(); // Fallback to current time
            }
          } catch (error) {
            console.error(`Error parsing start time for match ${match.id}:`, error);
            startTime = new Date(); // Fallback to current time
          }

      // Calculate end time (add duration in minutes or default to 1 hour)
          let endTime;
          try {
            endTime = match.end_time
        ? new Date(match.end_time)
        : new Date(
            startTime.getTime() + (match.duration_minutes || 60) * 60000,
          );
            // Check if date is valid
            if (isNaN(endTime.getTime())) {
              console.warn(`Invalid end time for match ${match.id}:`, match.end_time);
              endTime = new Date(startTime.getTime() + 60 * 60000); // Fallback to start time + 1 hour
            }
          } catch (error) {
            console.error(`Error calculating end time for match ${match.id}:`, error);
            endTime = new Date(startTime.getTime() + 60 * 60000); // Fallback to start time + 1 hour
          }

          // Get sport name with safe access
      const sportName = match.sport?.name || "Sport";

      // Get skill level with safe access
      const skillLevel = match.skill_level || "Any Level";

          // Calculate spots available with safe access
      const maxParticipants = match.max_participants || 10;
      const currentParticipants = match.current_participants || 1;
      const spotsAvailable = maxParticipants - currentParticipants;

      return {
        id: match.id,
        title: match.title || `${sportName} Match`,
        start: startTime,
        end: endTime,
        allDay: false,
        resource: match, // Store the original match data for the event
        sportName,
        skillLevel,
        location: match.location?.name || "Location not specified",
        spotsAvailable,
        isFull: spotsAvailable <= 0,
        isPrivate: match.is_private,
      };
    });
      }
    } catch (error) {
      console.error("Error processing calendar events:", error);
      // Ensure we set an empty array on error
      events = [];
    } finally {
      // Always set calendar events, even if it's an empty array
    setCalendarEvents(events);
    }
  }, [matches, selectedSport]);

  // Custom event renderer
  const eventStyleGetter = (event) => {
    // Get colors based on sport using CSS variables
    let backgroundColor = "var(--primary)"; // Default primary color
    let textColor = "var(--primary-foreground)";

    // Assign colors based on sport type using CSS sport variables
    switch ((event.sportName || "").toLowerCase()) {
      case "basketball":
        backgroundColor = "var(--sport-basketball)";
        break;
      case "soccer":
      case "football":
        backgroundColor = "var(--sport-football)";
        break;
      case "volleyball":
        backgroundColor = "var(--sport-volleyball)";
        break;
      case "badminton":
        backgroundColor = "var(--sport-badminton)";
        textColor = "var(--foreground)";
        break;
      case "tennis":
        backgroundColor = "var(--sport-tennis)";
        textColor = "var(--foreground)";
        break;
      case "hockey":
        backgroundColor = "var(--sport-hockey)";
        break;
      case "futsal":
        backgroundColor = "var(--sport-futsal)";
        break;
      case "rugby":
        backgroundColor = "var(--sport-rugby)";
        break;
      case "squash":
        backgroundColor = "var(--sport-squash)";
        break;
      case "frisbee":
        backgroundColor = "var(--sport-frisbee)";
        break;
      default:
        // Keep default primary color
        break;
    }

    // Apply opacity for full matches
    if (event.isFull) {
      backgroundColor = backgroundColor + "80"; // Add 50% transparency
    }

    // Add border for private matches
    const border = event.isPrivate ? "2px dashed var(--muted-foreground)" : "none";

    return {
      style: {
        backgroundColor,
        color: textColor,
        borderRadius: "var(--radius)",
        border,
        fontWeight: 500,
        boxShadow: "var(--shadow-sm)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        padding: "2px 0",
        ':hover': {
          transform: 'translateY(-1px)',
          boxShadow: "var(--shadow-md)",
        }
      },
    };
  };

  // Handle clicking on an event
  const handleSelectEvent = (event) => {
    // Navigate to match details page
    navigate(`/match/${event.id}`);
  };

  // Custom event component
  const EventComponent = ({ event }) => (
    <Tooltip
      title={
        <Box sx={{ p: 0.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            {event.title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <SportballIcon fontSize="small" sx={{ mr: 1, color: 'primary.light' }} />
            <Typography variant="body2">{event.sportName}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <SportsScore fontSize="small" sx={{ mr: 1, color: 'primary.light' }} />
          <Typography variant="body2">Level: {event.skillLevel}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <LocationOnIcon fontSize="small" sx={{ mr: 1, color: 'primary.light' }} />
            <Typography variant="body2">{event.location}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <GroupIcon fontSize="small" sx={{ mr: 1, color: event.isFull ? 'error.light' : 'success.light' }} />
          <Typography variant="body2">
              {event.isFull ? "Full" : `${event.spotsAvailable} spots available`}
          </Typography>
          </Box>
          {event.isPrivate && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <LockIcon fontSize="small" sx={{ mr: 1, color: 'warning.light' }} />
              <Typography variant="body2">Private match</Typography>
            </Box>
          )}
          <Divider sx={{ my: 1 }} />
          <Typography variant="body2" sx={{ fontStyle: "italic", textAlign: 'center', color: 'primary.main' }}>
            Click to view details
          </Typography>
        </Box>
      }
      arrow
      placement="top"
      componentsProps={{
        tooltip: {
          sx: {
            bgcolor: 'background.paper',
            color: 'text.primary',
            borderRadius: 2,
            boxShadow: theme.shadows[3],
            p: 1.5,
            '& .MuiTooltip-arrow': {
              color: 'background.paper',
            },
          },
        },
      }}
    >
      <Box
        sx={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          padding: "4px 8px",
          cursor: "pointer",
          transition: 'all 0.2s ease',
          '&:hover': {
            opacity: 0.9,
          }
        }}
      >
        {event.isPrivate && (
          <LockIcon fontSize="small" sx={{ mr: 0.5, opacity: 0.7 }} />
        )}
        <SportIcon sportName={event.sportName} />
        <Typography
          variant="body2"
          sx={{
            ml: 0.5,
            flexGrow: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontWeight: 500,
          }}
        >
          {event.title}
        </Typography>
      </Box>
    </Tooltip>
  );

  // Find the currently selected sport object
  const selectedSportObject = sportFilters?.find(sport => 
    sport.id === selectedSport
  ) || sportFilters?.[0] || { id: 'all', name: 'All Sports' };

  // These effects were removed as they referenced map-related variables
  // that aren't available in the CalendarView component

  return (
    <Paper 
      sx={{ 
        p: 3, 
        height: 700, 
        mb: 3,
        borderRadius: 3,
        overflow: 'hidden',
        boxShadow: '0 4px 20px 0 rgba(0,0,0,0.1)',
        background: 'linear-gradient(to bottom, rgba(245,247,250,0.95), rgba(255,255,255,1))',
      }} 
      elevation={2}
    >
      {/* Calendar header section with sport filter */}
      <Box 
        sx={{ 
          mb: 3, 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Typography 
          variant="h5" 
          component="h2" 
          sx={{ 
            fontWeight: 700,
            color: 'text.primary',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <EventIcon sx={{ mr: 1, color: 'primary.main' }} />
          Sports Calendar
        </Typography>
        
        <Button
          id="sport-filter-button"
          variant="contained"
          color="primary"
          onClick={handleSportFilterButtonClick}
          startIcon={selectedSportObject.icon || <SportsIcon />}
          endIcon={<FilterListIcon />}
          sx={{ 
            borderRadius: 3,
            px: 2,
            py: 1,
            textTransform: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            background: 'linear-gradient(45deg, #d32f2f 30%, #f44336 90%)',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              transform: 'translateY(-2px)'
            },
          }}
        >
          {selectedSportObject.name}
        </Button>
        <Menu
          id="sport-filter-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={handleSportFilterClose}
          MenuListProps={{
            'aria-labelledby': 'sport-filter-button',
            sx: {
              maxHeight: 300,
              overflow: 'auto' // Enable scrolling for menu items
            }
          }}
          PaperProps={{
            elevation: 4,
            sx: {
              mt: 1,
              width: 220,
              maxHeight: 400,
              borderRadius: 2,
              overflow: 'visible', // Changed from 'hidden' to 'visible' to allow scrolling
              animation: 'fadeIn 0.3s ease',
              '@keyframes fadeIn': {
                '0%': {
                  opacity: 0,
                  transform: 'translateY(-10px)'
                },
                '100%': {
                  opacity: 1,
                  transform: 'translateY(0)'
                },
              }
            }
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          {sportFilters?.map((sport) => (
            <MenuItem 
              key={sport.id} 
              onClick={() => handleSportSelect(sport.id)}
              selected={selectedSport === sport.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                py: 1.2,
                px: 2,
                transition: 'background 0.2s ease',
                borderLeft: selectedSport === sport.id ? 4 : 0,
                borderColor: 'primary.main',
              }}
            >
              <Box 
                component="span" 
                sx={{ 
                  mr: 1.5, 
                  display: 'flex',
                  color: selectedSport === sport.id ? 'primary.main' : 'text.secondary'
                }}
              >
                {sport.icon}
              </Box>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: selectedSport === sport.id ? 600 : 400,
                  color: selectedSport === sport.id ? 'primary.main' : 'text.primary'
                }}
              >
                {sport.name}
              </Typography>
            </MenuItem>
          ))}
        </Menu>
      </Box>
      
      {/* Calendar container with enhanced styling */}
      <Box 
        sx={{ 
          height: "calc(100% - 60px)", 
          position: "relative",
          '.rbc-calendar': {
            fontFamily: theme.typography.fontFamily,
            borderRadius: 2,
            overflow: 'hidden',
          },
          '.rbc-header': {
            padding: '8px 4px',
            fontWeight: 600,
            textTransform: 'uppercase',
            fontSize: '0.8rem',
            letterSpacing: '0.5px',
            backgroundColor: 'rgba(25, 118, 210, 0.05)',
            color: 'text.secondary',
          },
          '.rbc-month-view': {
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
          },
          '.rbc-day-bg': {
            transition: 'all 0.2s ease',
          },
          '.rbc-today': {
            backgroundColor: 'rgba(25, 118, 210, 0.08)',
          },
          '.rbc-off-range-bg': {
            backgroundColor: 'rgba(0, 0, 0, 0.02)',
          },
          '.rbc-event': {
            borderRadius: 2,
            transition: 'transform 0.2s ease',
            '&:hover': {
              transform: 'scale(1.01)',
            }
          },
          '.rbc-toolbar button': {
            color: 'text.primary',
            borderRadius: 1,
            '&:hover': {
              backgroundColor: 'rgba(25, 118, 210, 0.1)',
              color: 'primary.main',
            },
            '&.rbc-active': {
              backgroundColor: 'rgba(25, 118, 210, 0.2)',
              color: 'primary.main',
              boxShadow: 'none',
            }
          },
          '.rbc-toolbar-label': {
            fontSize: '1.2rem',
            fontWeight: 600,
            color: 'text.primary',
          },
        }}
      >
        <Calendar
          key={`calendar-${selectedSport}`} // Add a key that changes with the sport filter
          localizer={localizer}
          events={calendarEvents || []} // Ensure we always pass an array
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%" }}
          eventPropGetter={eventStyleGetter}
          onSelectEvent={handleSelectEvent}
          views={["month", "week", "day", "agenda"]}
          defaultView="month"
          defaultDate={new Date()}
          popup
          components={{
            event: EventComponent,
            toolbar: CalendarToolbar,
          }}
        />
        
        {/* Enhanced empty state overlay */}
        {(!calendarEvents || calendarEvents.length === 0) && (
        <Box
          sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
              flexDirection: "column",
              gap: 3,
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(2px)",
              zIndex: 10,
              pointerEvents: "auto",
              borderRadius: 2,
              transition: 'all 0.3s ease',
              animation: 'fadeIn 0.5s ease',
              '@keyframes fadeIn': {
                '0%': {
                  opacity: 0,
                },
                '100%': {
                  opacity: 1,
                },
              }
            }}
          >
            <Box sx={{ 
              width: 100, 
              height: 100, 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: 'rgba(25, 118, 210, 0.08)',
            }}>
              <EventBusyIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.7 }} />
            </Box>
            <Typography 
              variant="h6" 
              color="text.secondary"
              sx={{ 
                fontWeight: 500,
                textAlign: 'center',
                maxWidth: 400,
              }}
            >
              No matches found for {selectedSportObject.name}.
              <Typography 
                component="span" 
                display="block" 
                variant="body1" 
                sx={{ mt: 1, color: 'text.secondary', opacity: 0.8 }}
              >
                Try selecting a different sport or check back later.
          </Typography>
            </Typography>
            <Button 
              variant="contained" 
              onClick={() => handleSportSelect('all')}
              startIcon={<SportsIcon />}
              sx={{ 
                zIndex: 20,
                borderRadius: 6,
                px: 3,
                py: 1,
                textTransform: 'none',
                background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
                boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(25, 118, 210, 0.4)',
                  transform: 'translateY(-2px)',
                }
              }}
            >
              Show All Sports
            </Button>
        </Box>
      )}
      </Box>
    </Paper>
  );
};

// Custom Calendar Toolbar component with modernized styling
const CalendarToolbar = (toolbar) => {
  const goToBack = () => {
    toolbar.onNavigate("PREV");
  };

  const goToNext = () => {
    toolbar.onNavigate("NEXT");
  };

  const goToToday = () => {
    toolbar.onNavigate("TODAY");
  };

  const goToDay = () => {
    toolbar.onView("day");
  };

  const goToWeek = () => {
    toolbar.onView("week");
  };

  const goToMonth = () => {
    toolbar.onView("month");
  };

  const goToAgenda = () => {
    toolbar.onView("agenda");
  };

  const label = () => {
    const date = toolbar.date;
    return (
      <Typography 
        variant="h6" 
        component="span" 
        sx={{ 
          fontWeight: 600, 
          fontSize: { xs: '1rem', md: '1.2rem' },
          color: 'primary.dark',
          letterSpacing: '0.5px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <CalendarMonthIcon sx={{ mr: 1, color: 'primary.main' }} />
        {moment(date).format("MMMM YYYY")}
      </Typography>
    );
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: "center",
        justifyContent: "space-between",
        mb: 2,
        gap: { xs: 2, sm: 1 },
        px: 1,
        py: 1,
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(5px)',
      }}
    >
      <Box>{label()}</Box>
      <Box sx={{ display: "flex", gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
        <ButtonGroup 
          size="small" 
          variant="outlined" 
          sx={{ 
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            '.MuiButton-root': {
              borderColor: 'divider',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.08)',
              },
              '&:not(:last-child)': {
                borderRight: '1px solid',
                borderColor: 'divider',
              },
            }
          }}
        >
          <Button 
            onClick={goToToday} 
            sx={{ 
              fontWeight: 600, 
              textTransform: 'none',
              borderRadius: '20px 0 0 20px',
            }}
          >
            Today
          </Button>
          <Button 
            onClick={goToBack}
            sx={{ 
              minWidth: 40,
              borderRadius: 0,
            }}
          >
            <NavigateBeforeIcon />
          </Button>
          <Button 
            onClick={goToNext}
            sx={{ 
              minWidth: 40,
              borderRadius: '0 20px 20px 0',
            }}
          >
            <NavigateNextIcon />
          </Button>
        </ButtonGroup>
        
        <ButtonGroup 
          size="small" 
          variant="contained" 
          disableElevation
          sx={{ 
            borderRadius: 3,
            overflow: 'hidden',
            background: 'linear-gradient(45deg, rgba(25, 118, 210, 0.08) 0%, rgba(66, 165, 245, 0.12) 100%)',
            '.MuiButton-root': {
              textTransform: 'none',
              borderRadius: 0,
              backgroundColor: 'transparent',
              color: 'text.secondary',
              fontWeight: 500,
              border: 'none',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.12)',
                color: 'primary.main',
              },
              '&.active': {
                backgroundColor: 'primary.main',
                color: 'white',
              }
            }
          }}
        >
          <Button
            onClick={goToMonth}
            className={toolbar.view === "month" ? "active" : ""}
            color={toolbar.view === "month" ? "primary" : "inherit"}
            sx={{
              minWidth: '70px',
              borderTopLeftRadius: '20px',
              borderBottomLeftRadius: '20px',
              backgroundColor: toolbar.view === "month" ? 'primary.main' : 'transparent',
              color: toolbar.view === "month" ? 'white' : 'text.secondary',
              '&:hover': {
                color: toolbar.view === "month" ? 'white' : undefined,
              },
            }}
          >
            Month
          </Button>
          <Button
            onClick={goToWeek}
            className={toolbar.view === "week" ? "active" : ""}
            color={toolbar.view === "week" ? "primary" : "inherit"}
            sx={{ 
              minWidth: '60px',
              backgroundColor: toolbar.view === "week" ? 'primary.main' : 'transparent',
              color: toolbar.view === "week" ? 'white' : 'text.secondary',
              '&:hover': {
                color: toolbar.view === "week" ? 'white' : undefined,
              },
            }}
          >
            Week
          </Button>
          <Button
            onClick={goToDay}
            className={toolbar.view === "day" ? "active" : ""}
            color={toolbar.view === "day" ? "primary" : "inherit"}
            sx={{ 
              minWidth: '50px',
              backgroundColor: toolbar.view === "day" ? 'primary.main' : 'transparent',
              color: toolbar.view === "day" ? 'white' : 'text.secondary',
              '&:hover': {
                color: toolbar.view === "day" ? 'white' : undefined,
              },
            }}
          >
            Day
          </Button>
          <Button
            onClick={goToAgenda}
            className={toolbar.view === "agenda" ? "active" : ""}
            color={toolbar.view === "agenda" ? "primary" : "inherit"}
            sx={{ 
              minWidth: '70px', 
              borderTopRightRadius: '20px',
              borderBottomRightRadius: '20px',
              backgroundColor: toolbar.view === "agenda" ? 'primary.main' : 'transparent',
              color: toolbar.view === "agenda" ? 'white' : 'text.secondary',
              '&:hover': {
                color: toolbar.view === "agenda" ? 'white' : undefined,
              },
            }}
          >
            Agenda
          </Button>
        </ButtonGroup>
      </Box>
    </Box>
  );
};

export default FindGames;
