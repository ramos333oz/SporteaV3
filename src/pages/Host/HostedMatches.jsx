import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  MapPin,
  Clock,
  Users,
  MoreVertical,
  Calendar,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { SporteaTabs, SporteaTab, SporteaTabPanel } from '../../components/common/SporteaTabs';
import { SporteaCard } from '../../components/common/SporteaCard';
import { SporteaButton } from '../../components/common/SporteaButton';
import { useAuth } from '../../hooks/useAuth';
import { format } from 'date-fns';
import { matchService } from '../../services/supabase';
import { useToast } from '../../contexts/ToastContext';

const HostedMatches = () => {
  const { user, supabase } = useAuth();
  const navigate = useNavigate();
  const { showSuccessToast, showErrorToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get tab value from URL params, default to 0 (Upcoming)
  const getTabFromParams = () => {
    const tab = searchParams.get('tab');
    if (tab === 'past') return 1;
    if (tab === 'cancelled') return 2;
    return 0;
  };

  const [tabValue, setTabValue] = useState(getTabFromParams());
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const open = Boolean(menuAnchorEl);
  
  // Mock data for hosted matches (will be replaced with real data from Supabase)
  // Helper function to get sport icon based on sport name
  const getSportIcon = (sportName) => {
    if (!sportName) return <SportsSoccerIcon />;
    
    const sportNameLower = sportName.toLowerCase();
    if (sportNameLower.includes('football') || sportNameLower.includes('soccer') || sportNameLower.includes('futsal')) {
      return <SportsSoccerIcon />;
    } else if (sportNameLower.includes('basketball')) {
      return <SportsBasketballIcon />;
    } else if (sportNameLower.includes('tennis') || sportNameLower.includes('badminton')) {
      return <SportsTennisIcon />;
    }
    
    return <SportsSoccerIcon />; // Default
  };

  // Define fetchHostedMatches outside of useEffect so it can be called from handlers
  const fetchHostedMatches = async () => {
    setLoading(true);
    try {
      const matchStatus = tabValue === 0 ? 'upcoming' : tabValue === 1 ? 'completed' : 'cancelled';
      
      // Handle automatic categorization of past matches
      if (matchStatus === 'upcoming') {
        // First, get all upcoming matches
        const { data: upcomingMatches, error: upcomingError } = await supabase
          .from('matches')
          .select(`
            *,
            sport:sports(*),
            location:locations(*),
            participants(count)
          `)
          .eq('host_id', user.id)
          .eq('status', 'upcoming')
          .order('start_time', { ascending: true });
        
        if (upcomingError) {
          throw upcomingError;
        }
        
        // Check if any "upcoming" matches are actually in the past
        const now = new Date();
        const pastMatches = upcomingMatches.filter(match => new Date(match.start_time) < now);
        
        // If we found past matches that are still marked as "upcoming", update them to "completed"
        if (pastMatches.length > 0) {
          // Update status in database
          for (const match of pastMatches) {
            await supabase
              .from('matches')
              .update({ status: 'completed' })
              .eq('id', match.id);
          }
        }
      }
      
      // Now get the matches with the current tab status (which may have just been updated)
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          sport:sports(*),
          location:locations(*),
          participants(count)
        `)
        .eq('host_id', user.id)
        .eq('status', matchStatus)
        .order('start_time', { ascending: matchStatus === 'upcoming' });
      
      if (error) {
        throw error;
      }
      
      // Map Supabase data to component's expected format
      const formattedMatches = data.map(match => ({
        id: match.id,
        title: match.title,
        sport: match.sport?.name?.toLowerCase() || 'unknown',
        sportIcon: getSportIcon(match.sport?.name),
        location: match.location?.name || 'Unknown location',
        dateTime: match.start_time,
        currentParticipants: match.participants?.[0]?.count || 0,
        maxParticipants: match.max_participants,
        status: match.status,
        participantRequests: 0, // This would need another query to get pending requests
        participants: [] // This would need another query to get participant details
      }));
      
      setMatches(formattedMatches);
    } catch (error) {
      console.error('Error fetching hosted matches:', error);
      showErrorToast('Error', 'Failed to load your matches');
    } finally {
      setLoading(false);
    }
  };

  // Update tab value when URL params change (e.g., when navigating back)
  useEffect(() => {
    const newTabValue = getTabFromParams();
    if (newTabValue !== tabValue) {
      setTabValue(newTabValue);
    }
  }, [searchParams]);

  useEffect(() => {
    // Fetch hosted matches when component mounts or tab changes
    if (user?.id) {
      fetchHostedMatches();
    }
  }, [tabValue, user?.id]);
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);

    // Update URL params to persist tab state
    const newSearchParams = new URLSearchParams(searchParams);
    if (newValue === 1) {
      newSearchParams.set('tab', 'past');
    } else if (newValue === 2) {
      newSearchParams.set('tab', 'cancelled');
    } else {
      newSearchParams.delete('tab'); // Remove tab param for upcoming (default)
    }
    setSearchParams(newSearchParams);
  };
  
  const handleMenuOpen = (event, match) => {
    console.log('handleMenuOpen called with:', { event: event.type, match });
    setMenuAnchorEl(event.currentTarget);
    setSelectedMatch(match);
  };
  
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };
  
  const handleEditMatch = (matchFromButton = null) => {
    // Use the match passed from button click, or fall back to selectedMatch from menu
    const matchToEdit = matchFromButton || selectedMatch;
    console.log('Edit match:', matchToEdit);

    // Safety check - ensure we have a valid match object
    if (!matchToEdit || !matchToEdit.id) {
      console.error('No valid match object found for editing');
      showErrorToast('Error', 'Unable to edit match. Please try again.');
      return;
    }

    // Only close menu if it was opened (selectedMatch exists)
    if (!matchFromButton) {
      handleMenuClose();
    }

    // Navigate to edit match page
    navigate(`/edit-match/${matchToEdit.id}`);
  };
  
  const handleCancelMatch = async (matchFromMenu = null) => {
    // Use the match passed from menu click, or fall back to selectedMatch
    const matchToCancel = matchFromMenu || selectedMatch;
    console.log('Cancel match:', matchToCancel);

    // Safety check - ensure we have a valid match object
    if (!matchToCancel || !matchToCancel.id) {
      console.error('No valid match object found for cancelling');
      showErrorToast('Error', 'Unable to cancel match. Please try again.');
      return;
    }

    // Only close menu if it was opened (selectedMatch exists)
    if (!matchFromMenu) {
      handleMenuClose();
    }

    if (window.confirm('Are you sure you want to cancel this match? This action cannot be undone.')) {
      try {
        const result = await matchService.cancelMatch(matchToCancel.id);

        if (result && result.error) {
          throw new Error(result.message || 'Failed to cancel the match');
        }

        showSuccessToast('Match Cancelled', 'The match has been cancelled successfully');

        // Refresh the matches list
        fetchHostedMatches();
      } catch (error) {
        console.error('Error cancelling match:', error);
        showErrorToast('Cancel Failed', error.message || 'Failed to cancel the match. Please try again.');
      }
    }
  };
  
  const handleDeleteMatch = async (matchFromMenu = null) => {
    // Use the match passed from menu click, or fall back to selectedMatch
    const matchToDelete = matchFromMenu || selectedMatch;
    console.log('Delete match:', matchToDelete);

    // Safety check - ensure we have a valid match object
    if (!matchToDelete || !matchToDelete.id) {
      console.error('No valid match object found for deleting');
      showErrorToast('Error', 'Unable to delete match. Please try again.');
      return;
    }

    // Only close menu if it was opened (selectedMatch exists)
    if (!matchFromMenu) {
      handleMenuClose();
    }

    if (window.confirm('Are you sure you want to delete this match? This action cannot be undone and all match data will be permanently deleted.')) {
      try {
        const result = await matchService.deleteMatch(matchToDelete.id);

        if (!result.success) {
          throw new Error(result.message || 'Failed to delete the match');
        }

        showSuccessToast('Match Deleted', 'The match has been permanently deleted');

        // Refresh the matches list
        fetchHostedMatches();
      } catch (error) {
        console.error('Error deleting match:', error);
        showErrorToast('Delete Failed', error.message || 'Failed to delete the match. Please try again.');
      }
    }
  };
  
  // Handle restoring a cancelled match
  const handleRestoreMatch = async (matchFromCard) => {
    // If called from card button, use that match, otherwise use the selected match from menu
    const matchToRestore = matchFromCard || selectedMatch;
    
    console.log('Restore match:', matchToRestore);
    
    // If called from menu, close it
    if (!matchFromCard) {
      handleMenuClose();
    }
    
    if (window.confirm('Are you sure you want to restore this cancelled match? This will make the match active again and notify all confirmed participants.')) {
      try {
        const result = await matchService.restoreMatch(matchToRestore.id);
        
        if (!result.success) {
          throw new Error(result.message || 'Failed to restore the match');
        }
        
        showSuccessToast('Match Restored', 'The match has been restored successfully and confirmed participants have been notified');
        
        // Refresh the matches list
        fetchHostedMatches();
      } catch (error) {
        console.error('Error restoring match:', error);
        showErrorToast('Restore Failed', error.message || 'Failed to restore the match. Please try again.');
      }
    }
  };
  
  const handleViewParticipants = (matchFromButton = null) => {
    // Use the match passed from button click, or fall back to selectedMatch from menu
    const matchToView = matchFromButton || selectedMatch;
    console.log('View participants for match:', matchToView);

    // Safety check - ensure we have a valid match object
    if (!matchToView || !matchToView.id) {
      console.error('No valid match object found for viewing participants');
      showErrorToast('Error', 'Unable to view participants. Please try again.');
      return;
    }

    // Only close menu if it was opened (selectedMatch exists)
    if (!matchFromButton) {
      handleMenuClose();
    }

    // Navigate to match detail page
    navigate(`/match/${matchToView.id}`);
  };
  
  // Format date and time
  const formatDateTime = (dateTimeStr) => {
    const date = new Date(dateTimeStr);
    return {
      date: format(date, 'EEE, MMM d'),
      time: format(date, 'h:mm a')
    };
  };
  
  // Render match card
  const renderMatchCard = (match) => {
    const { date, time } = formatDateTime(match.dateTime);

    const getStatusColor = (status) => {
      switch (status) {
        case 'upcoming': return 'border-l-brand-primary';
        case 'completed': return 'border-l-green-500';
        case 'cancelled': return 'border-l-red-500';
        default: return 'border-l-gray-300';
      }
    };

    return (
      <SporteaCard
        variant="match"
        className={cn("border-l-4", getStatusColor(match.status))}
      >
        <div className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <div className={cn(
                "px-2 py-1 rounded-full text-xs font-medium",
                "bg-brand-primary/10 text-brand-primary"
              )}>
                {match.sport.charAt(0).toUpperCase() + match.sport.slice(1)}
              </div>
              {match.participantRequests > 0 && (
                <div className="relative">
                  <div className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
                    Requests
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {match.participantRequests}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={(e) => handleMenuOpen(e, match)}
              className={cn(
                "p-1 rounded-md transition-all",
                "hover:bg-gray-100 text-gray-500 hover:text-brand-primary",
                "focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
              )}
              aria-label="more options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            {match.title}
          </h3>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4" />
              <span className="truncate">{match.location}</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>{date}, {time}</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span>{match.currentParticipants}/{match.maxParticipants} participants</span>
            </div>
          </div>

          {match.participants.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-gray-600">Participants:</span>
              <div className="flex -space-x-1">
                {match.participants.slice(0, 3).map(participant => (
                  <div
                    key={participant.id}
                    className="w-6 h-6 bg-brand-primary text-white text-xs rounded-full flex items-center justify-center border-2 border-white"
                    title={participant.name}
                  >
                    {participant.name.charAt(0)}
                  </div>
                ))}
                {match.participants.length > 3 && (
                  <div className="w-6 h-6 bg-gray-300 text-gray-600 text-xs rounded-full flex items-center justify-center border-2 border-white">
                    +{match.participants.length - 3}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t border-gray-100">
            {match.status === 'upcoming' && (
              <>
                <SporteaButton
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewParticipants(match)}
                  className="flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  View Participants
                </SporteaButton>
                <SporteaButton
                  variant="primary"
                  size="sm"
                  onClick={() => handleEditMatch(match)}
                  className="flex items-center gap-1"
                >
                  <Edit className="w-3 h-3" />
                  Edit Match
                </SporteaButton>
              </>
            )}
            {match.status === 'completed' && (
              <SporteaButton
                variant="outline"
                size="sm"
                onClick={() => handleViewParticipants(match)}
                className="flex items-center gap-1"
              >
                <Calendar className="w-3 h-3" />
                Match Summary
              </SporteaButton>
            )}
          </div>
        </div>
      </SporteaCard>
    );
  };
  
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Your Hosted Matches
      </h2>

      <div className="mb-6">
        <SporteaTabs variant="elevated">
          <SporteaTab
            active={tabValue === 0}
            onClick={() => handleTabChange(null, 0)}
            className="flex-1 text-center"
          >
            Upcoming
          </SporteaTab>
          <SporteaTab
            active={tabValue === 1}
            onClick={() => handleTabChange(null, 1)}
            className="flex-1 text-center"
          >
            Past
          </SporteaTab>
          <SporteaTab
            active={tabValue === 2}
            onClick={() => handleTabChange(null, 2)}
            className="flex-1 text-center"
          >
            Cancelled
          </SporteaTab>
        </SporteaTabs>
      </div>
      
      {loading ? (
        // Loading skeletons
        <div className="space-y-4">
          {Array(3).fill().map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="animate-pulse bg-gray-200 h-40 rounded-lg"
            />
          ))}
        </div>
      ) : matches.length === 0 ? (
        // No matches found
        <SporteaCard variant="default" className="text-center">
          <div className="p-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No {tabValue === 0 ? 'upcoming' : tabValue === 1 ? 'past' : 'cancelled'} matches
            </h3>
            <p className="text-gray-600">
              {tabValue === 0
                ? "You don't have any upcoming matches. Create a new match to get started!"
                : tabValue === 1
                  ? "You haven't hosted any matches yet."
                  : "You don't have any cancelled matches."}
            </p>
          </div>
        </SporteaCard>
      ) : (
        // Match list
        <div className="space-y-4">
          {matches.map(match => (
            <div key={match.id}>
              {renderMatchCard(match)}
            </div>
          ))}
        </div>
      )}
      
      {/* Match options menu */}
      {menuAnchorEl && (
        <div
          className="absolute z-50 bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200"
          style={{
            top: menuAnchorEl.getBoundingClientRect().bottom + window.scrollY,
            left: menuAnchorEl.getBoundingClientRect().left + window.scrollX
          }}
        >
          <div className="py-1">
            {selectedMatch?.status === 'upcoming' && (
              <button
                onClick={() => {
                  handleEditMatch(selectedMatch);
                  handleMenuClose();
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Edit Match
              </button>
            )}
            {selectedMatch?.status === 'upcoming' && (
              <button
                onClick={() => {
                  handleCancelMatch(selectedMatch);
                  handleMenuClose();
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Cancel Match
              </button>
            )}
            {(selectedMatch?.status === 'cancelled' || selectedMatch?.status === 'completed') && (
              <button
                onClick={() => {
                  handleDeleteMatch(selectedMatch);
                  handleMenuClose();
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Delete Match
              </button>
            )}
            {selectedMatch?.status !== 'cancelled' && (
              <button
                onClick={() => {
                  handleViewParticipants(selectedMatch);
                  handleMenuClose();
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                {selectedMatch?.status === 'completed' ? 'View Summary' : 'View Participants'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HostedMatches;
