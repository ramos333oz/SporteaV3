import React, { useState, useEffect, useCallback, useMemo } from "react";
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
} from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PersonIcon from "@mui/icons-material/Person";
import SportsIcon from "@mui/icons-material/Sports";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import SportsTennisIcon from "@mui/icons-material/SportsTennis";
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
import { participantService } from "../../services/supabase";
import recommendationService from "../../services/recommendationService";
import interactionService from "../../services/interactionService";
import { useNavigate } from "react-router-dom";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { Calendar, momentLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import moment from "moment";
import ErrorIcon from "@mui/icons-material/Error";

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
 */
const FindGames = ({ matches: propMatches, sports: propSports }) => {
  // State management
  const { user, supabase } = useAuth();
  const [matches, setMatches] = useState(propMatches || []);
  const [loading, setLoading] = useState(!propMatches);
  const [joinLoading, setJoinLoading] = useState({});
  const [viewMode, setViewMode] = useState(0); // 0: List, 1: Map, 2: Calendar
  
  // Single shared filter state for all views
  const [selectedSportFilter, setSelectedSportFilter] = useState("all");
  
  // Remove the separate filter states and getActiveSportFilter function
  
  const [recommendedMatches, setRecommendedMatches] = useState([]);
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

  // Generate sport filters from real data
  const sportFilters = [
    { id: "all", name: "All Sports", icon: <SportsIcon /> },
    ...(propSports || []).map((sport) => {
      // Map sport names to appropriate icons using the SportIcon component
      const sportName = sport.name || "Unknown Sport";

      return {
        id: sport.id?.toString() || "",
        name: sportName,
        icon: <SportIcon sportName={sportName} />,
      };
    }),
  ];

  // Load personalized recommendations when component mounts or user changes
  useEffect(() => {
    const loadRecommendations = async () => {
      if (!user) {
        // For non-logged in users, just show the newest matches
        if (propMatches) {
          const sortedByDate = [...propMatches].sort(
            (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
          );
          setRecommendedMatches(sortedByDate.slice(0, 3));
        }
        return;
      }

      try {
        // Fetch personalized recommendations - we added error handling in the service itself
        // so this should no longer throw errors
        const { recommendations, type, message } =
          await recommendationService.getRecommendations(user.id, 5);

        if (recommendations && recommendations.length > 0) {
          // Filter out matches where the user is the host
          const filteredRecommendations = recommendations.filter(
            (match) => match.host_id !== user.id,
          );

          // Set the recommended matches with their explanation and metadata
          setRecommendedMatches(filteredRecommendations);

          // If we got a message from the recommendation service, show it as a notification
          if (message) {
            setNotification({
              severity: "info",
              message: message,
            });
          }
        } else {
          // Fall back to sorting by date if recommendations are empty
          console.log(
            "No recommendations returned, falling back to default sorting",
          );
          if (propMatches) {
            const sortedByDate = [...propMatches]
              .filter((match) => match.host_id !== user.id) // Filter out user's own matches
              .sort(
                (a, b) =>
                  new Date(b.created_at || 0) - new Date(a.created_at || 0),
              );

            setRecommendedMatches(sortedByDate.slice(0, 3));
          }
        }
      } catch (error) {
        console.error("Error in recommendation handling:", error);
        // Fall back to sorting by date if recommendations fail
        if (propMatches) {
          const sortedByDate = [...propMatches]
            .filter((match) => match.host_id !== user.id) // Filter out user's own matches
            .sort(
              (a, b) =>
                new Date(b.created_at || 0) - new Date(a.created_at || 0),
            );

          setRecommendedMatches(sortedByDate.slice(0, 3));
        }
      }
    };

    loadRecommendations();
  }, [user, propMatches]);

  // Apply all filters to matches
  const applyFilters = useCallback(
    (sourceMatches) => {
      if (!sourceMatches || sourceMatches.length === 0) return [];

      // Get the appropriate sport filter based on the current view
      const activeSportFilter = selectedSportFilter;

      return sourceMatches
        .filter((match) => {
          // Apply sport filter
          if (
            activeSportFilter !== "all" &&
            match.sport_id?.toString() !== activeSportFilter &&
            match.sport?.id?.toString() !== activeSportFilter
          ) {
            return false;
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
    },
    [selectedSportFilter, filters],
  );

  // Update matches when props or filter changes
  useEffect(() => {
    if (propMatches) {
      setLoading(false);

      // Apply all filters
      const filteredMatches = applyFilters(propMatches);
      setMatches(filteredMatches);

      // Register impressions for visible matches to improve recommendations
      if (user) {
        const matchesToTrack =
          selectedSportFilter === "all"
            ? propMatches
            : propMatches.filter(
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
      setLoading(true);
    }
  }, [propMatches, selectedSportFilter, user]);

  // View mode tab change handler
  const handleViewModeChange = (event, newValue) => {
    setViewMode(newValue);
  };

  // Sport filter click handler
  const handleSportFilterChange = (sportId) => {
    setSelectedSportFilter(sportId);
  };

  // Render view based on selected view mode
  const renderViewContent = () => {
    switch (viewMode) {
      case 0: // List View
        return (
          <>
            {/* Recommended Matches Section - Only shown in List View */}
            {recommendedMatches.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <Typography variant="h2" component="h2">
                    Recommended for You
                  </Typography>
                  <Tooltip title="These matches are selected based on your preferences and past activity">
                    <Chip
                      label="For You"
                      size="small"
                      color="secondary"
                      sx={{ ml: 2 }}
                    />
                  </Tooltip>
                </Box>

                <Grid container spacing={2}>
                  {loading
                    ? Array(3)
                        .fill()
                        .map((_, index) => (
                          <Grid
                            item
                            xs={12}
                            sm={6}
                            md={4}
                            key={`skeleton-rec-${index}`}
                          >
                            <Skeleton
                              variant="rectangular"
                              height={320}
                              sx={{ borderRadius: 3 }}
                            />
                          </Grid>
                        ))
                    : recommendedMatches.map((match) => (
                        <Grid item xs={12} sm={6} md={4} key={match.id}>
                          {renderMatchCard(match)}
                        </Grid>
                      ))}
                </Grid>
              </Box>
            )}

            {/* List of all matches */}
            <Grid container spacing={2}>
              {filteredMatches.map((match) => (
                <Grid item xs={12} sm={6} md={4} key={match.id}>
                  {renderMatchCard(match)}
                </Grid>
              ))}
            </Grid>
          </>
        );
      case 1: // Map View
        return (
          <MapView
            matches={matches}
            selectedSport={selectedSportFilter}
            onViewModeChange={handleViewModeChange}
            onSportFilterChange={handleSportFilterChange}
            sportFilters={sportFilters}
            supabase={supabase}
          />
        );
      case 2: // Calendar View
        return (
          <CalendarView 
            matches={matches} 
            selectedSport={selectedSportFilter}
            onSportFilterChange={handleSportFilterChange} 
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

      // Update the match in state
      const updatedMatches = matches.map((m) => {
        if (m.id === match.id) {
          return {
            ...m,
            is_joined: true,
            join_status: "pending", // Always set to pending for new joins
            current_participants: m.current_participants, // Don't increment here as pending requests don't count
          };
        }
        return m;
      });

      // If this is a recommended match, update it in the recommended matches list too
      if (match.recommendation_type) {
        const updatedRecommendations = recommendedMatches.map((m) => {
          if (m.id === match.id) {
            return {
              ...m,
              is_joined: true,
              join_status: "pending", // Always set to pending for new joins
              current_participants: m.current_participants, // Don't increment here as pending requests don't count
            };
          }
          return m;
        });
        setRecommendedMatches(updatedRecommendations);

        // Track recommendation interaction (non-blocking)
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

      setMatches(updatedMatches);

      // Show more prominent notification
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

      // If this is a recommended match, update it in the recommended matches list too
      if (match.recommendation_type) {
        const updatedRecommendations = recommendedMatches.map((m) => {
          if (m.id === match.id) {
            return {
              ...m,
              is_joined: false,
              join_status: null,
              current_participants: Math.max(0, m.current_participants - 1),
            };
          }
          return m;
        });
        setRecommendedMatches(updatedRecommendations);

        // Track recommendation interaction in a try-catch to ensure it doesn't break main flow
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

      setMatches(updatedMatches);
      setNotification({
        severity: "info",
        message: result?.message || "Successfully left the match",
      });

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

  // Refresh recommendations
  const handleRefreshRecommendations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { recommendations, type, message } =
        await recommendationService.getRecommendations(user.id, 5);
      setRecommendedMatches(recommendations);

      if (message) {
        setNotification({
          severity: "info",
          message: message,
        });
      }
    } catch (error) {
      console.error("Error refreshing recommendations:", error);
      setNotification({
        severity: "error",
        message: "Failed to refresh recommendations",
      });
    } finally {
      setLoading(false);
    }
  };

  // Apply filters to matches
  const filteredMatches = React.useMemo(() => {
    if (!matches || matches.length === 0) return [];

    return matches.filter((match) => {
      // Apply sport filter
      if (
        selectedSportFilter !== "all" &&
        match.sport_id?.toString() !== selectedSportFilter &&
        match.sport?.id?.toString() !== selectedSportFilter
      ) {
        return false;
      }

      // Apply skill level filter
      if (
        filters.skillLevel !== "all" &&
        match.skill_level?.toLowerCase() !== filters.skillLevel.toLowerCase()
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
    });
  }, [matches, selectedSportFilter, filters]);

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
    setFilters({
      skillLevel: "all",
      minSpots: 1,
      maxDistance: 50,
      showPrivate: true,
      showFull: false,
      dateRange: "all",
    });
  };

  // Render recommendation card (similar to match card but with recommendation details)
  const renderRecommendationCard = (match) => {
    // Format date and time
    const { date, time } = formatDateTime(match.start_time);

    // Calculate spots available
    const maxParticipants = match.max_participants || 10;
    // Ensure we include the host in the count, start from 1 instead of 0 if not specified
    const currentParticipants = match.current_participants || 1;
    const spotsAvailable = maxParticipants - currentParticipants;

    // Calculate fill percentage for visual progress bar
    const fillPercentage = (currentParticipants / maxParticipants) * 100;

    // Determine match status
    const isFull = spotsAvailable <= 0;
    const isAboutToFill = spotsAvailable <= 2 && !isFull;
    const isJoined = match.is_joined;
    const joinStatus = match.join_status || null;
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
                sx={{ mr: 1, color: "text.secondary" }}
              />
              <Typography variant="body2" color="text.secondary">
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
                disabled={isLoading}
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
                    ? "Cancel Request"
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
    // Ensure we include the host in the count, start from 1 instead of 0 if not specified
    const currentParticipants = match.current_participants || 1;
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
    const isJoined = match.is_joined;
    const joinStatus = match.join_status || null;
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
          borderRadius: 3,
          transition: "all 0.3s ease-in-out",
          position: "relative",
          overflow: "visible",
          "&:hover": {
            transform: "translateY(-8px)",
            boxShadow: 6,
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
              icon={getSportIcon(match.sport?.name || "")}
              label={match.sport?.name || "Sport"}
              size="small"
              color="primary"
              variant="filled"
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

            <AvatarGroup max={5} sx={{ justifyContent: "flex-start" }}>
              {/* This would be populated with actual participant data */}
              {Array(Math.min(currentParticipants, 5))
                .fill()
                .map((_, i) => (
                  <Avatar key={i} sx={{ width: 32, height: 32 }}>
                    {String.fromCharCode(65 + i)}
                  </Avatar>
                ))}
            </AvatarGroup>
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
                disabled={isLoading}
                onClick={() => handleLeaveMatch(match)}
                startIcon={isLoading ? <CircularProgress size={20} /> : null}
                sx={{ mb: 1 }}
              >
                {isLoading
                  ? "Processing..."
                  : joinStatus === "pending"
                    ? "Cancel Request"
                    : "Leave Match"}
              </Button>
            ) : (
              <Button
                variant="contained"
                size="small"
                color={isFull ? "inherit" : "primary"}
                fullWidth
                disabled={isFull || isLoading}
                onClick={() => handleJoinMatch(match)}
                startIcon={isLoading ? <CircularProgress size={20} /> : null}
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
            size="small"
            fullWidth
            startIcon={<AccessTimeIcon />}
            onClick={() => navigate(`/match/${match.id}`)}
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
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={viewMode}
          onChange={handleViewModeChange}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: "divider" }}
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
          <Box sx={{ mb: 3, display: "flex", flexWrap: "wrap", gap: 1 }}>
            {sportFilters.map((sport) => (
              <Chip
                key={sport.id}
                icon={sport.icon}
                label={sport.name}
                color={selectedSportFilter === sport.id ? "primary" : "default"}
                onClick={() => handleSportFilterChange(sport.id)}
                sx={{ mb: { xs: 1, md: 0 } }}
              />
            ))}

            {/* Advanced filters toggle */}
            <Chip
              icon={<FilterListIcon />}
              label="More Filters"
              color={showFilters ? "primary" : "default"}
              onClick={() => setShowFilters(!showFilters)}
              variant={showFilters ? "filled" : "outlined"}
              sx={{ ml: "auto" }}
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

              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                <Button
                  size="small"
                  onClick={handleResetFilters}
                  sx={{ mr: 1 }}
                >
                  Reset Filters
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => setShowFilters(false)}
                >
                  Apply Filters
                </Button>
              </Box>
            </Paper>
          </Collapse>
        </>
      )}

      {/* All Matches Section */}
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Typography variant="h2" component="h2">
            Available Matches
          </Typography>
          <Chip
            label={`${matches.length} found`}
            size="small"
            color="default"
            variant="outlined"
            sx={{ ml: 2 }}
          />
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
        ) : matches.length === 0 ? (
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
            <Button variant="contained" sx={{ mt: 2 }}>
              Host a Match
            </Button>
          </Paper>
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
};

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
  sportFilters,
  supabase,
}) => {
  // Add search functionality states
  const [searchQuery, setSearchQuery] = useState("");
  
  // Initialize with the parent's selected sport
  const [mapViewSelectedSport, setMapViewSelectedSport] = useState(selectedSport || "all");
  
  // Keep local state in sync with parent's selectedSport
  useEffect(() => {
    if (selectedSport !== mapViewSelectedSport) {
      setMapViewSelectedSport(selectedSport);
    }
  }, [selectedSport]);
  
  // Handle search input changes
  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };
  
  // Handle sport filter change specific to map view
  const handleSportFilterChange = (sportId) => {
    setMapViewSelectedSport(sportId);
    if (typeof onSportFilterChange === 'function') {
      // Update the shared filter state in the parent component
      onSportFilterChange(sportId);
    } else {
      console.log('Map view filter changed to:', sportId);
    }
  };
  
  // Map style options with direct URLs - just using standard OSM
  const tileProviderUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const tileProviderAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

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
  
  // Filter venues when sport selection or search changes
  useEffect(() => {
    if (!venues || venues.length === 0) return;
    
    let filtered = [...venues];
    let sportMatches = [];
    
    // First identify which venues match the selected sport (for highlighting)
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
      
      // Store the matching venues for highlighting - don't filter the venues list itself
      setSportMatchingVenues(sportMatches.map(venue => venue.id));
    } else {
      // No sport filter, clear the matching venues list
      setSportMatchingVenues([]);
    }
    
    // Apply search filter if provided (but keep all venues for sport filtering)
    if (searchQuery && searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(venue =>
        venue.name?.toLowerCase().includes(query) ||
        venue.description?.toLowerCase().includes(query) ||
        venue.address?.toLowerCase().includes(query) ||
        venue.campus?.toLowerCase().includes(query)
      );
    }
    
    setFilteredVenues(filtered);
  }, [venues, mapViewSelectedSport, searchQuery, sportFilters]);

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
    const iconSize = 24; // Smaller size (was 28)
    const iconAnchor = iconSize / 2;

    // Check if this venue matches the current sport filter
    const isSelectedVenue = isSelectedSportVenue();
    
    // Adjust icon size if this venue matches the selected sport filter
    const finalIconSize = isSelectedVenue ? iconSize * 1.3 : iconSize;
    
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
      // Single sport marker
      const sport = getSportIconInfo(sportNames[0]);
      
      // Add animation and highlight effect if it matches the selected sport
      const animation = isSelectedVenue ? 'animation: pulse 1.5s infinite;' : '';
      const borderStyle = isSelectedVenue ? `border: 2px solid white; box-shadow: 0 0 8px rgba(255,255,255,0.8);` : 'box-shadow: 0 1px 3px rgba(0,0,0,0.3);';
      
      html = `
        <div class="marker-container" style="width: ${finalIconSize}px; height: ${finalIconSize}px; border-radius: 50%; background-color: ${sport.color}; ${borderStyle} display: flex; align-items: center; justify-content: center; ${animation}">
          <i class="material-icons" style="color: white; font-size: ${isSelectedVenue ? 16 : 14}px;">${sport.icon}</i>
        </div>
      `;
      
      className = `venue-marker sport-${sportNames[0].toLowerCase().replace(/\s+/g, "-")}`;
    } else {
      // Multiple sports marker (max 2)
      const sport1 = getSportIconInfo(sportNames[0]);
      const sport2 = getSportIconInfo(sportNames[1]);

      // Add animation and highlight effect if selected
      const animation = isSelectedVenue ? 'animation: pulse 1.5s infinite;' : '';
      const borderStyle = isSelectedVenue ? `border: 2px solid white; box-shadow: 0 0 8px rgba(255,255,255,0.8);` : 'box-shadow: 0 1px 3px rgba(0,0,0,0.3);';
      
      // Create a split marker with two sport icons side by side
      html = `
        <div class="marker-container" style="width: ${finalIconSize * 1.4}px; height: ${finalIconSize}px; border-radius: ${finalIconSize / 2}px; display: flex; overflow: hidden; ${borderStyle} ${animation}">
          <div style="width: 50%; height: 100%; background-color: ${sport1.color}; display: flex; align-items: center; justify-content: center;">
            <i class="material-icons" style="color: white; font-size: ${isSelectedVenue ? 14 : 12}px;">${sport1.icon}</i>
          </div>
          <div style="width: 50%; height: 100%; background-color: ${sport2.color}; display: flex; align-items: center; justify-content: center;">
            <i class="material-icons" style="color: white; font-size: ${isSelectedVenue ? 14 : 12}px;">${sport2.icon}</i>
          </div>
        </div>
      `;
      className = "venue-marker multi-sport";
    }

    return new L.divIcon({
      html: html,
      className: className,
      iconSize:
        sportNames.length > 1
          ? [finalIconSize * 1.4, finalIconSize]
          : [finalIconSize, finalIconSize],
      iconAnchor:
        sportNames.length > 1
          ? [finalIconSize * 0.7, finalIconSize / 2]
          : [finalIconSize / 2, finalIconSize / 2],
      popupAnchor: [0, -finalIconSize / 2],
    });
  };
    
  // Render map component with properly structured elements
  return (
    <Box sx={{ height: '70vh', width: '100%', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
      {/* Search Box and Sport Filters - positioned as fixed for better z-index behavior */}
      <Paper
        elevation={3}
        className="map-filter-bar"
        sx={{
          p: 1.5,
          borderRadius: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          width: 'calc(100% - 20px)',
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        <Grid container spacing={1}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
              {sportFilters.map((sport) => (
                <Chip
                  key={sport.id}
                  icon={sport.icon}
                  label={sport.name}
                  onClick={() => handleSportFilterChange(sport.id)}
                  color={sport.id === mapViewSelectedSport ? "primary" : "default"}
                  variant={sport.id === mapViewSelectedSport ? "filled" : "outlined"}
                  sx={{ mb: 1 }}
                />
              ))}
            </Box>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search venues by name, address..."
              value={searchQuery}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                sx: { borderRadius: 2 }
              }}
              size="small"
            />
          </Grid>
        </Grid>
      </Paper>
      
      {/* Map Container */}
      <Box 
        className="map-container-wrapper"
        sx={{ 
          height: '100%', 
          width: '100%',
          mt: 0, // No margin top needed since filter is fixed position
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
          // Add these props to prevent interference with filter bar
          whenCreated={(mapInstance) => {
            // Disable dragging when cursor enters the filter bar
            const filterBar = document.querySelector('.map-filter-bar');
            if (filterBar) {
              filterBar.addEventListener('mouseenter', () => {
                mapInstance.dragging.disable();
              });
              filterBar.addEventListener('mouseleave', () => {
                mapInstance.dragging.enable();
              });
            }
          }}
        >
          <TileLayer
            url={tileProviderUrl}
            attribution={tileProviderAttribution}
          />
          <ZoomControl position="bottomright" />
          <SetViewOnLocation center={mapCenter} bounds={mapBounds} />

          {/* Render venue markers */}
          {filteredVenues && filteredVenues.map((venue) => {
            // Skip rendering venues with invalid coordinates
            if (!venue.latitude || !venue.longitude || 
                isNaN(venue.latitude) || isNaN(venue.longitude)) {
              console.warn(`Skipping venue with invalid coordinates: ${venue.name}`);
              return null;
            }
            
            return (
              <Marker
                key={venue.id}
                position={[venue.latitude, venue.longitude]}
                icon={getSportIcon(venue)}
                className={sportMatchingVenues.includes(venue.id) ? "selected-venue" : ""}
              >
                <Popup>
                  <Box sx={{ p: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {venue.name}
                    </Typography>
                    
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
                                onClick={() => {
                                  if (sportId && typeof handleSportFilterChange === 'function') {
                                    handleSportFilterChange(sportId);
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
                        // Navigate to find matches for this venue
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

// Component to set the map view based on center/bounds
const SetViewOnLocation = ({ center, bounds }) => {
  const map = useMap();

  useEffect(() => {
    if (center && center.length === 2) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);

  useEffect(() => {
    if (bounds) {
      try {
        map.fitBounds(bounds, { padding: [50, 50] });
      } catch (error) {
        console.error("Error setting map bounds:", error);
      }
    }
  }, [bounds, map]);

  return null;
};

/**
 * CalendarView component for displaying matches in a calendar
 */
const CalendarView = ({ matches, selectedSport, onSportFilterChange }) => {
  const [calendarEvents, setCalendarEvents] = useState([]);
  const navigate = useNavigate();

  // Set up the localizer for the calendar
  const localizer = useMemo(() => momentLocalizer(moment), []);

  // Prepare matches data for calendar format
  useEffect(() => {
    if (!matches || matches.length === 0) return;

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
    const events = filteredMatches.map((match) => {
      // Parse the start time
      const startTime = new Date(match.start_time);

      // Calculate end time (add duration in minutes or default to 1 hour)
      const endTime = match.end_time
        ? new Date(match.end_time)
        : new Date(
            startTime.getTime() + (match.duration_minutes || 60) * 60000,
          );

      // Get sport name
      const sportName = match.sport?.name || "Sport";

      // Get skill level with safe access
      const skillLevel = match.skill_level || "Any Level";

      // Calculate spots available
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

    setCalendarEvents(events);
  }, [matches, selectedSport]);

  // Custom event renderer
  const eventStyleGetter = (event) => {
    // Get colors based on sport
    let backgroundColor = "#3174ad"; // Default blue
    let textColor = "#fff";

    // Assign colors based on sport type
    switch ((event.sportName || "").toLowerCase()) {
      case "basketball":
        backgroundColor = "#FF5722"; // Orange
        break;
      case "soccer":
      case "football":
        backgroundColor = "#4CAF50"; // Green
        break;
      case "volleyball":
        backgroundColor = "#9C27B0"; // Purple
        break;
      case "badminton":
        backgroundColor = "#FFEB3B"; // Yellow with dark text
        textColor = "#000";
        break;
      case "tennis":
        backgroundColor = "#CDDC39"; // Lime with dark text
        textColor = "#000";
        break;
      case "hockey":
        backgroundColor = "#E91E63"; // Pink
        break;
      case "futsal":
        backgroundColor = "#8BC34A"; // Light green
        break;
      default:
        // Keep default blue
        break;
    }

    // Apply opacity for full matches
    if (event.isFull) {
      backgroundColor = backgroundColor + "80"; // Add 50% transparency
    }

    // Add border for private matches
    const border = event.isPrivate ? "2px dashed #9e9e9e" : "none";

    return {
      style: {
        backgroundColor,
        color: textColor,
        borderRadius: "4px",
        border: border,
        fontWeight: 500,
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
        <Box>
          <Typography variant="subtitle2">{event.title}</Typography>
          <Typography variant="body2">Sport: {event.sportName}</Typography>
          <Typography variant="body2">Level: {event.skillLevel}</Typography>
          <Typography variant="body2">Location: {event.location}</Typography>
          <Typography variant="body2">
            Spots: {event.isFull ? "Full" : `${event.spotsAvailable} available`}
          </Typography>
          {event.isPrivate && (
            <Typography variant="body2">
              <LockIcon fontSize="small" /> Private match
            </Typography>
          )}
          <Typography variant="body2" sx={{ mt: 1, fontStyle: "italic" }}>
            Click to view details
          </Typography>
        </Box>
      }
      arrow
      placement="top"
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
          padding: "2px 4px",
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
          }}
        >
          {event.title}
        </Typography>
      </Box>
    </Tooltip>
  );

  return (
    <Paper sx={{ p: 2, height: 700, mb: 2 }}>
      {/* Add sport filter chips at the top of the calendar */}
      <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <Chip
          label="All Sports"
          onClick={() => onSportFilterChange("all")}
          color={selectedSport === "all" ? "primary" : "default"}
          variant={selectedSport === "all" ? "filled" : "outlined"}
        />
        {/* We don't have sportFilters prop in CalendarView, so we'll show just a few common ones */}
        <Chip
          icon={<SportsSoccerIcon />}
          label="Football"
          onClick={() => onSportFilterChange("1")} /* Assuming ID 1 is football */
          color={selectedSport === "1" ? "primary" : "default"}
          variant={selectedSport === "1" ? "filled" : "outlined"}
        />
        <Chip
          icon={<SportsBasketballIcon />}
          label="Basketball"
          onClick={() => onSportFilterChange("2")} /* Assuming ID 2 is basketball */
          color={selectedSport === "2" ? "primary" : "default"}
          variant={selectedSport === "2" ? "filled" : "outlined"}
        />
        <Chip
          icon={<SportsTennisIcon />}
          label="Badminton"
          onClick={() => onSportFilterChange("3")} /* Assuming ID 3 is badminton */
          color={selectedSport === "3" ? "primary" : "default"}
          variant={selectedSport === "3" ? "filled" : "outlined"}
        />
      </Box>
      
      {calendarEvents.length > 0 ? (
        <Calendar
          localizer={localizer}
          events={calendarEvents}
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
      ) : (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
          }}
        >
          <Typography variant="body1">
            No matches found for the selected filters.
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

// Custom Calendar Toolbar component
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
      <Typography variant="h6" component="span" sx={{ fontWeight: "bold" }}>
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
        gap: 1,
      }}
    >
      <Box>{label()}</Box>
      <Box sx={{ display: "flex", gap: 1 }}>
        <ButtonGroup size="small" variant="outlined">
          <Button onClick={goToToday}>Today</Button>
          <Button onClick={goToBack}>
            <NavigateBeforeIcon />
          </Button>
          <Button onClick={goToNext}>
            <NavigateNextIcon />
          </Button>
        </ButtonGroup>
      </Box>
      <Box sx={{ display: "flex", gap: 1 }}>
        <ButtonGroup size="small" variant="contained">
          <Button
            onClick={goToMonth}
            color={toolbar.view === "month" ? "primary" : "inherit"}
          >
            Month
          </Button>
          <Button
            onClick={goToWeek}
            color={toolbar.view === "week" ? "primary" : "inherit"}
          >
            Week
          </Button>
          <Button
            onClick={goToDay}
            color={toolbar.view === "day" ? "primary" : "inherit"}
          >
            Day
          </Button>
          <Button
            onClick={goToAgenda}
            color={toolbar.view === "agenda" ? "primary" : "inherit"}
          >
            Agenda
          </Button>
        </ButtonGroup>
      </Box>
    </Box>
  );
};

export default FindGames;
