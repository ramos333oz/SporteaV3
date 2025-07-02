import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Skeleton } from '@mui/material';
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  ZoomControl,
  useMap,
} from "react-leaflet";
import L from "leaflet";

/**
 * Component to handle map centering and marker highlighting when location is selected
 */
const MapCenterOnSelection = ({ selectedLocation, venues }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedLocation && venues.length > 0) {
      // Find the selected venue
      const selectedVenue = venues.find(venue => venue.id === selectedLocation.id);

      if (selectedVenue && selectedVenue.coordinates) {
        // Center the map on the selected venue with a smooth animation
        map.flyTo(
          [selectedVenue.coordinates.lat, selectedVenue.coordinates.lng],
          15, // Zoom level for focused view
          {
            duration: 1.5, // Animation duration in seconds
            easeLinearity: 0.25
          }
        );

        // Optional: Open popup for the selected marker after a short delay
        setTimeout(() => {
          map.eachLayer((layer) => {
            if (layer instanceof L.Marker) {
              // Check if this marker corresponds to the selected venue
              const markerLatLng = layer.getLatLng();
              if (
                Math.abs(markerLatLng.lat - selectedVenue.coordinates.lat) < 0.0001 &&
                Math.abs(markerLatLng.lng - selectedVenue.coordinates.lng) < 0.0001
              ) {
                layer.openPopup();
              }
            }
          });
        }, 1000); // Open popup after animation completes
      }
    }
  }, [selectedLocation, venues, map]);

  return null;
};

/**
 * LocationMapView component for displaying venues on a map in the hosting flow
 * Adapted from FindGames.jsx MapView component
 */
const LocationMapView = ({
  venues = [],
  selectedSport,
  selectedLocation,
  onLocationSelect,
  loading = false,
}) => {
  // State for map
  const [mapCenter, setMapCenter] = useState([3.139, 101.6869]); // Default to KL
  const [mapBounds, setMapBounds] = useState(null);
  const [filteredVenues, setFilteredVenues] = useState([]);
  
  // Refs for markers
  const markerRefsMap = useRef({});

  // CSS styles for map markers
  const markerStyles = `
    @keyframes pulse {
      0% {
        box-shadow: 0 0 0 0 rgba(138, 21, 56, 0.7);
        transform: scale(1) translateY(0) rotate(-45deg);
      }
      50% {
        box-shadow: 0 0 0 10px rgba(138, 21, 56, 0);
        transform: scale(1.1) translateY(-5px) rotate(-45deg);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(138, 21, 56, 0);
        transform: scale(1) translateY(0) rotate(-45deg);
      }
    }

    .gps-marker {
      position: relative;
      cursor: pointer;
      transition: transform 0.2s ease;
    }

    .gps-marker:hover {
      transform: scale(1.1);
    }

    .gps-marker.selected .pin {
      box-shadow: 0 0 0 4px rgba(138, 21, 56, 0.5);
      transform: scale(1.2);
      z-index: 1000;
    }

    .gps-marker.selected .ripple {
      animation: selectedPulse 1.5s infinite;
    }

    .gps-marker .ripple {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background-color: rgba(138, 21, 56, 0.2);
      animation: pulse 2s infinite;
    }

    @keyframes selectedPulse {
      0% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
        background-color: rgba(138, 21, 56, 0.6);
      }
      50% {
        transform: translate(-50%, -50%) scale(2.5);
        opacity: 0.7;
        background-color: rgba(138, 21, 56, 0.4);
      }
      100% {
        transform: translate(-50%, -50%) scale(3);
        opacity: 0;
        background-color: rgba(138, 21, 56, 0.2);
      }
    }

    .gps-marker .pin {
      position: relative;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .leaflet-container {
      width: 100% !important;
      height: 100% !important;
      z-index: 1 !important;
      font-family: 'Inter', sans-serif;
      background-color: #f8f8f8 !important;
    }
  `;

  // Function to get sport icon info
  const getSportIconInfo = (sportName) => {
    if (!sportName) return { icon: "sports", color: "#8A1538" };

    const sport = typeof sportName === "string" ? sportName.toLowerCase() : "";

    switch (sport) {
      case "football":
      case "soccer":
        return { icon: "sports_soccer", color: "#4CAF50" };
      case "basketball":
        return { icon: "sports_basketball", color: "#FF9800" };
      case "badminton":
        return { icon: "sports_tennis", color: "#2196F3" };
      case "tennis":
        return { icon: "sports_tennis", color: "#4CAF50" };
      case "volleyball":
        return { icon: "sports_volleyball", color: "#FF5722" };
      case "futsal":
        return { icon: "sports_soccer", color: "#795548" };
      case "table tennis":
      case "ping pong":
        return { icon: "sports_tennis", color: "#607D8B" };
      case "squash":
        return { icon: "sports_tennis", color: "#9C27B0" };
      case "rugby":
        return { icon: "sports_rugby", color: "#8BC34A" };
      case "hockey":
        return { icon: "sports_hockey", color: "#00BCD4" };
      case "frisbee":
        return { icon: "album", color: "#FFEB3B" };
      default:
        return { icon: "sports", color: "#8A1538" };
    }
  };

  // Function to create sport-specific markers
  const getSportIcon = (venue) => {
    const sportNames = venue.sportTypes || [];
    const finalIconSize = 32; // Touch-friendly size
    const isSelected = selectedLocation && selectedLocation.id === venue.id;

    let html = '';
    let className = '';

    if (sportNames.length === 1) {
      // Single sport marker
      const sport = getSportIconInfo(sportNames[0]);
      
      html = `
        <div class="gps-marker ${isSelected ? 'selected' : ''}">
          <div class="ripple"></div>
          <div class="pin" style="background-color: ${sport.color};">
            <span style="font-size: 14px; color: white; display: block; text-align: center;">⚽</span>
          </div>
        </div>
      `;
      
      className = `sport-${sportNames[0].toLowerCase().replace(/\s+/g, "-")}`;
    } else if (sportNames.length > 1) {
      // Multiple sports marker - use primary sport color
      const sport = getSportIconInfo(sportNames[0]);
      
      html = `
        <div class="gps-marker ${isSelected ? 'selected' : ''}">
          <div class="ripple"></div>
          <div class="pin" style="background-color: ${sport.color};">
            <span style="font-size: 14px; color: white; display: block; text-align: center;">🏃</span>
          </div>
        </div>
      `;
      
      className = "multi-sport";
    } else {
      // Default marker
      html = `
        <div class="gps-marker ${isSelected ? 'selected' : ''}">
          <div class="ripple"></div>
          <div class="pin" style="background-color: #8A1538;">
            <span style="font-size: 14px; color: white; display: block; text-align: center;">📍</span>
          </div>
        </div>
      `;
      
      className = "default-venue";
    }

    return new L.divIcon({
      html: html,
      className: className,
      iconSize: [finalIconSize, finalIconSize],
      iconAnchor: [finalIconSize / 2, finalIconSize / 2],
      popupAnchor: [0, -finalIconSize / 2],
    });
  };

  // Filter venues based on selected sport
  useEffect(() => {
    console.log('LocationMapView - Filtering venues:', {
      venues: venues,
      venuesLength: venues?.length,
      selectedSport: selectedSport
    });

    if (!venues || venues.length === 0) {
      console.log('LocationMapView - No venues provided');
      setFilteredVenues([]);
      return;
    }

    let filtered = venues;

    // Filter by sport if a specific sport is selected
    if (selectedSport && selectedSport !== 'all') {
      console.log('LocationMapView - Filtering by sport:', selectedSport);

      filtered = venues.filter(venue => {
        console.log('LocationMapView - Checking venue:', {
          name: venue.name,
          sportTypes: venue.sportTypes,
          supported_sports: venue.supported_sports,
          coordinates: venue.coordinates
        });

        // Check if venue supports the selected sport
        // The venue data structure uses sportTypes array (transformed by LocationSelection)
        if (venue.sportTypes && Array.isArray(venue.sportTypes)) {
          const matches = venue.sportTypes.some(sport =>
            sport.toLowerCase() === selectedSport.toLowerCase()
          );
          console.log('LocationMapView - SportTypes match:', matches, venue.sportTypes);
          return matches;
        }

        // Fallback: check supported_sports if it exists
        if (venue.supported_sports && Array.isArray(venue.supported_sports)) {
          console.log('LocationMapView - Has supported_sports but no sportTypes');
          return venue.supported_sports.length > 0;
        }

        console.log('LocationMapView - No sport data found for venue');
        return false;
      });

      console.log('LocationMapView - Filtered venues:', filtered);
    }

    setFilteredVenues(filtered);

    // Calculate map bounds to fit all filtered venues
    if (filtered.length > 0) {
      const validVenues = filtered.filter(venue =>
        venue.coordinates &&
        venue.coordinates.lat &&
        venue.coordinates.lng &&
        !isNaN(venue.coordinates.lat) &&
        !isNaN(venue.coordinates.lng)
      );

      if (validVenues.length > 0) {
        if (validVenues.length === 1) {
          // Single venue - center on it with appropriate zoom
          const venue = validVenues[0];
          setMapCenter([venue.coordinates.lat, venue.coordinates.lng]);
          setMapBounds(null); // Clear bounds to use center and zoom
        } else {
          // Multiple venues - calculate bounds with generous padding
          const bounds = L.latLngBounds(
            validVenues.map(venue => [venue.coordinates.lat, venue.coordinates.lng])
          );
          // Add padding to the bounds to ensure all markers are clearly visible
          const paddedBounds = bounds.pad(0.3); // 30% padding
          setMapBounds(paddedBounds);
          // Also set center to the center of bounds for better initial view
          const center = paddedBounds.getCenter();
          setMapCenter([center.lat, center.lng]);
        }
      }
    } else {
      // No valid venues, reset to default center
      setMapCenter([3.139, 101.6869]); // Default to KL
      setMapBounds(null);
    }
  }, [venues, selectedSport]);

  // Handle marker click
  const handleMarkerClick = (venue) => {
    if (onLocationSelect) {
      onLocationSelect(venue);
    }
  };

  // Force marker re-render when selectedLocation changes
  const [markerKey, setMarkerKey] = useState(0);
  useEffect(() => {
    // Force re-render of all markers when selection changes
    // This ensures the selected marker gets the proper styling
    setMarkerKey(prev => prev + 1);
  }, [selectedLocation]);

  // Map style options with direct URLs (matching FindGames.jsx configuration)
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

  // Select which tile provider to use - default to terrain for better visualization (matching Find page)
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

  if (loading) {
    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h3" gutterBottom>
          Court Locations
        </Typography>
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  if (filteredVenues.length === 0) {
    return (
      <Box sx={{ mt: 3, textAlign: 'center', py: 4 }}>
        <Typography variant="h3" gutterBottom>
          Court Locations
        </Typography>
        <Typography variant="body1" color="text.secondary">
          No courts found for the selected sport. Please try a different sport or check back later.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      {/* Add marker styles */}
      <Box component="style">{markerStyles}</Box>
      
      <Typography variant="h3" gutterBottom>
        Court Locations
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Click on a marker to select that location for your match.
      </Typography>
      
      <Box 
        sx={{ 
          height: { xs: '300px', sm: '350px', md: '400px' },
          width: '100%',
          borderRadius: 2,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
        }}
      >
        <MapContainer
          center={mapCenter}
          zoom={mapBounds ? undefined : 14}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
          bounds={mapBounds}
          boundsOptions={{
            padding: [50, 50],
            maxZoom: 16
          }}
        >
          <TileLayer
            url={activeTileProvider.url}
            attribution={activeTileProvider.attribution}
          />
          <ZoomControl position="bottomright" />

          {/* Component to handle map centering when location is selected */}
          <MapCenterOnSelection
            selectedLocation={selectedLocation}
            venues={filteredVenues}
          />
          
          {/* Render markers for filtered venues */}
          {filteredVenues.map((venue) => {
            if (!venue.coordinates || !venue.coordinates.lat || !venue.coordinates.lng) {
              return null;
            }

            return (
              <Marker
                key={`${venue.id}-${markerKey}`}
                position={[venue.coordinates.lat, venue.coordinates.lng]}
                icon={getSportIcon(venue)}
                eventHandlers={{
                  click: () => handleMarkerClick(venue),
                }}
                ref={(marker) => {
                  if (marker) {
                    markerRefsMap.current[venue.id] = marker;
                  }
                }}
              >
                <Popup>
                  <Box sx={{ minWidth: 200 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {venue.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {venue.address}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Sports:</strong> {venue.sportTypes?.join(', ') || 'Various'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Capacity:</strong> Up to {venue.capacity || 20} participants
                    </Typography>
                  </Box>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </Box>
    </Box>
  );
};

export default LocationMapView;
