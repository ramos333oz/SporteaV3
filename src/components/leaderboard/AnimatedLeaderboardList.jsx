import React, { useRef, useState, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  List,
  ListItem,
  Box,
  Typography,
  Avatar,
  Chip,
  Paper,
  Skeleton
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { UserAvatarWithLevel } from '../achievements';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import './AnimatedLeaderboardList.css';

/**
 * AnimatedLeaderboardItem Component
 * Individual animated list item with Framer Motion
 */
const AnimatedLeaderboardItem = ({ 
  children, 
  delay = 0, 
  index, 
  onMouseEnter, 
  onClick,
  isSelected = false 
}) => {
  const ref = useRef(null);
  const inView = useInView(ref, { amount: 0.3, triggerOnce: false });
  
  return (
    <motion.div
      ref={ref}
      data-index={index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      initial={{ scale: 0.8, opacity: 0, y: 20 }}
      animate={inView ? { 
        scale: isSelected ? 1.02 : 1, 
        opacity: 1, 
        y: 0 
      } : { 
        scale: 0.8, 
        opacity: 0, 
        y: 20 
      }}
      transition={{ 
        duration: 0.3, 
        delay,
        type: "spring",
        stiffness: 100,
        damping: 15
      }}
      whileHover={{
        scale: 1.01,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.99 }}
      style={{
        margin: '0.75rem 0.5rem',
        cursor: 'pointer'
      }}
    >
      {children}
    </motion.div>
  );
};

/**
 * AnimatedLeaderboardList Component
 * Enhanced leaderboard with sophisticated animations and interactions
 */
const AnimatedLeaderboardList = ({
  data = [],
  loading = false,
  type = 'xp',
  showUserHighlight = false,
  currentUserId = null,
  tierConfig = null,
  getUserTier = null,
  showGradients = true,
  enableArrowNavigation = true,
  displayScrollbar = true,
  maxHeight = 600
}) => {
  const navigate = useNavigate();
  const listRef = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [keyboardNav, setKeyboardNav] = useState(false);
  const [topGradientOpacity, setTopGradientOpacity] = useState(0);
  const [bottomGradientOpacity, setBottomGradientOpacity] = useState(1);

  // Limit to top 10 players
  const limitedData = data.slice(0, 10);

  // Handle scroll for gradient effects
  const handleScroll = (e) => {
    if (!showGradients) return;
    
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    setTopGradientOpacity(Math.min(scrollTop / 50, 1));
    const bottomDistance = scrollHeight - (scrollTop + clientHeight);
    setBottomGradientOpacity(
      scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 50, 1)
    );
  };

  // Keyboard navigation
  useEffect(() => {
    if (!enableArrowNavigation || limitedData.length === 0) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex((prev) => Math.min(prev + 1, limitedData.length - 1));
      } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        if (selectedIndex >= 0 && selectedIndex < limitedData.length) {
          e.preventDefault();
          handleProfileClick(limitedData[selectedIndex].userId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [limitedData, selectedIndex, enableArrowNavigation]);

  // Auto-scroll to selected item
  useEffect(() => {
    if (!keyboardNav || selectedIndex < 0 || !listRef.current) return;
    
    const container = listRef.current;
    const selectedItem = container.querySelector(`[data-index="${selectedIndex}"]`);
    
    if (selectedItem) {
      const extraMargin = 50;
      const containerScrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const itemTop = selectedItem.offsetTop;
      const itemBottom = itemTop + selectedItem.offsetHeight;
      
      if (itemTop < containerScrollTop + extraMargin) {
        container.scrollTo({ top: itemTop - extraMargin, behavior: 'smooth' });
      } else if (itemBottom > containerScrollTop + containerHeight - extraMargin) {
        container.scrollTo({
          top: itemBottom - containerHeight + extraMargin,
          behavior: 'smooth',
        });
      }
    }
    setKeyboardNav(false);
  }, [selectedIndex, keyboardNav]);

  // Handle profile click navigation
  const handleProfileClick = (userId) => {
    if (userId) {
      navigate(`/profile/${userId}`);
    }
  };

  // Get rank icon based on position
  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <EmojiEventsIcon sx={{ color: '#FFD700', fontSize: '1.5rem' }} />;
      case 2:
        return <WorkspacePremiumIcon sx={{ color: '#C0C0C0', fontSize: '1.5rem' }} />;
      case 3:
        return <MilitaryTechIcon sx={{ color: '#CD7F32', fontSize: '1.5rem' }} />;
      default:
        return (
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              bgcolor: 'grey.300',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'grey.700'
            }}
          >
            {rank}
          </Box>
        );
    }
  };

  // Get tier styling for user based on level
  const getTierStyling = (userLevel) => {
    if (!tierConfig || !getUserTier) return {};

    const tierKey = getUserTier(userLevel);
    const tier = tierConfig[tierKey];

    if (!tier) return {};

    return {
      borderLeft: `4px solid ${tier.color}`,
      backgroundColor: `${tier.bgColor}40`,
      '&:hover': {
        backgroundColor: `${tier.bgColor}60`,
      }
    };
  };

  // Format score display
  const formatScore = (score, type) => {
    if (typeof score !== 'number') return '0';
    
    switch (type) {
      case 'xp':
        return score.toLocaleString();
      case 'level':
        return score.toString();
      default:
        return score.toLocaleString();
    }
  };

  // Get score label based on type
  const getScoreLabel = (type) => {
    switch (type) {
      case 'xp':
        return 'XP';
      case 'level':
        return 'Level';
      case 'community':
        return 'Community Score';
      case 'streak':
        return 'Day Streak';
      default:
        return 'Score';
    }
  };

  // Loading state
  if (loading) {
    return (
      <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
        <List sx={{ p: 0 }}>
          {[...Array(5)].map((_, index) => (
            <ListItem key={index} sx={{ py: 2, px: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Skeleton variant="circular" width={24} height={24} />
                <Skeleton variant="circular" width={48} height={48} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="60%" height={24} />
                  <Skeleton variant="text" width="40%" height={20} />
                </Box>
                <Skeleton variant="text" width={60} height={24} />
              </Box>
            </ListItem>
          ))}
        </List>
      </Paper>
    );
  }

  // Empty state
  if (limitedData.length === 0) {
    return (
      <Paper sx={{ borderRadius: 3, p: 4, textAlign: 'center', boxShadow: 'var(--shadow-lg)' }}>
        <EmojiEventsIcon sx={{ fontSize: 60, color: 'grey.300', mb: 2 }} />
        <Typography variant="h6" gutterBottom color="text.secondary">
          No Rankings Available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Be the first to appear on this leaderboard!
        </Typography>
      </Paper>
    );
  }

  // Main render
  return (
    <div className={`animated-leaderboard-container ${showGradients ? 'with-gradients' : ''}`}>
      <Paper sx={{
        borderRadius: 3,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)',
        position: 'relative'
      }}>
        <div
          ref={listRef}
          className={`animated-leaderboard-list ${!displayScrollbar ? 'no-scrollbar' : ''}`}
          onScroll={handleScroll}
          style={{ maxHeight: maxHeight }}
        >
          <List sx={{ p: 0, pt: 1, pb: 1 }}>
            {limitedData.map((entry, index) => {
              const isCurrentUser = showUserHighlight && entry.userId === currentUserId;
              const isSelected = selectedIndex === index;
              const tierStyling = getTierStyling(entry.level);

              return (
                <AnimatedLeaderboardItem
                  key={entry.userId}
                  delay={index * 0.1}
                  index={index}
                  isSelected={isSelected}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => {
                    setSelectedIndex(index);
                    handleProfileClick(entry.userId);
                  }}
                >
                  <ListItem
                    sx={{
                      py: 2.5,
                      px: 3,
                      mx: 1,
                      my: 0.5,
                      borderBottom: 'none',
                      bgcolor: isCurrentUser ? 'primary.50' :
                               isSelected ? 'action.hover' : 'transparent',
                      border: isCurrentUser ? '2px solid' : '1px solid transparent',
                      borderColor: isCurrentUser ? 'primary.main' : 'transparent',
                      borderRadius: 3,
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden',
                      boxShadow: isSelected ? 'var(--shadow-md)' : 'none',
                      '&:hover': {
                        bgcolor: isCurrentUser ? 'primary.100' : 'action.hover',
                        boxShadow: 'var(--shadow-md)',
                        borderColor: isCurrentUser ? 'primary.main' : 'divider'
                      },
                      '&::before': isSelected ? {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                        animation: 'shimmer 2s infinite'
                      } : {},
                      ...tierStyling
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      {/* Rank Icon */}
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.1 + 0.2, type: "spring" }}
                      >
                        <Box sx={{ minWidth: 32, display: 'flex', justifyContent: 'center' }}>
                          {getRankIcon(entry.rank)}
                        </Box>
                      </motion.div>

                      {/* User Avatar with Level */}
                      <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: index * 0.1 + 0.3 }}
                      >
                        <UserAvatarWithLevel
                          user={{
                            ...entry.user,
                            level: entry.level,
                            avatarUrl: entry.user?.avatar_url
                          }}
                          size={48}
                          badgeSize="medium"
                        />
                      </motion.div>

                      {/* User Info */}
                      <motion.div
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: index * 0.1 + 0.4 }}
                        style={{ flex: 1, minWidth: 0 }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="subtitle1" sx={{
                            fontWeight: 600,
                            mb: 0.5,
                            fontFamily: 'var(--font-sans)'
                          }}>
                            {entry.user?.full_name || entry.user?.username || 'Unknown User'}
                            {isCurrentUser && (
                              <Chip
                                label="You"
                                size="small"
                                color="primary"
                                sx={{ ml: 1, fontSize: '0.75rem' }}
                              />
                            )}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{
                            fontFamily: 'var(--font-sans)'
                          }}>
                            Level {entry.level}
                            {entry.faculty && ` • ${entry.faculty}`}
                          </Typography>
                        </Box>
                      </motion.div>

                      {/* Score Display */}
                      <motion.div
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: index * 0.1 + 0.5 }}
                      >
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="h6" sx={{
                            fontWeight: 700,
                            color: 'primary.main',
                            fontFamily: 'var(--font-sans)'
                          }}>
                            {formatScore(entry.score, type)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{
                            fontFamily: 'var(--font-sans)'
                          }}>
                            {getScoreLabel(type)}
                          </Typography>
                        </Box>
                      </motion.div>
                    </Box>
                  </ListItem>
                </AnimatedLeaderboardItem>
              );
            })}
          </List>
        </div>

        {/* Gradient Overlays */}
        {showGradients && (
          <>
            <div
              className="leaderboard-top-gradient"
              style={{ opacity: topGradientOpacity }}
            />
            <div
              className="leaderboard-bottom-gradient"
              style={{ opacity: bottomGradientOpacity }}
            />
          </>
        )}
      </Paper>
    </div>
  );
};

export default AnimatedLeaderboardList;
