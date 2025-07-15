import React, { lazy, Suspense } from 'react';
import { Box, CircularProgress, Typography, Skeleton } from '@mui/material';

/**
 * Loading component for lazy-loaded routes
 */
const PageLoadingFallback = ({ message = 'Loading...' }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      gap: 2
    }}
  >
    <CircularProgress size={40} />
    <Typography variant="body1" color="text.secondary">
      {message}
    </Typography>
  </Box>
);

/**
 * Component loading fallback for smaller components
 */
const ComponentLoadingFallback = ({ height = 200 }) => (
  <Box sx={{ p: 2 }}>
    <Skeleton variant="rectangular" height={height} sx={{ borderRadius: 1 }} />
  </Box>
);

/**
 * Error boundary for lazy-loaded components
 */
class LazyErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Lazy component loading error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '40vh',
            gap: 2,
            p: 3
          }}
        >
          <Typography variant="h6" color="error">
            Failed to load component
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please refresh the page to try again
          </Typography>
        </Box>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component for lazy loading with error boundary
 */
const withLazyLoading = (LazyComponent, fallback = <PageLoadingFallback />) => {
  return React.forwardRef((props, ref) => (
    <LazyErrorBoundary>
      <Suspense fallback={fallback}>
        <LazyComponent {...props} ref={ref} />
      </Suspense>
    </LazyErrorBoundary>
  ));
};

// Lazy load main pages
export const LazyHome = withLazyLoading(
  lazy(() => import('../pages/Home')),
  <PageLoadingFallback message="Loading Home..." />
);

export const LazyFind = withLazyLoading(
  lazy(() => import('../pages/Find')),
  <PageLoadingFallback message="Loading Find..." />
);

export const LazyCreate = withLazyLoading(
  lazy(() => import('../pages/Create')),
  <PageLoadingFallback message="Loading Create..." />
);

export const LazyProfile = withLazyLoading(
  lazy(() => import('../pages/Profile')),
  <PageLoadingFallback message="Loading Profile..." />
);

export const LazyFriends = withLazyLoading(
  lazy(() => import('../pages/Friends')),
  <PageLoadingFallback message="Loading Friends..." />
);

export const LazyLeaderboard = withLazyLoading(
  lazy(() => import('../pages/Leaderboard')),
  <PageLoadingFallback message="Loading Leaderboard..." />
);

export const LazySettings = withLazyLoading(
  lazy(() => import('../pages/Settings')),
  <PageLoadingFallback message="Loading Settings..." />
);

export const LazyMatchDetails = withLazyLoading(
  lazy(() => import('../pages/MatchDetails')),
  <PageLoadingFallback message="Loading Match Details..." />
);

export const LazyUserProfile = withLazyLoading(
  lazy(() => import('../pages/UserProfile')),
  <PageLoadingFallback message="Loading User Profile..." />
);

// Lazy load components
export const LazyRecommendationsList = withLazyLoading(
  lazy(() => import('./RecommendationsList')),
  <ComponentLoadingFallback height={300} />
);

export const LazyEnhancedMatchCard = withLazyLoading(
  lazy(() => import('./EnhancedMatchCard')),
  <ComponentLoadingFallback height={200} />
);

export const LazyUserRecommendationCard = withLazyLoading(
  lazy(() => import('./UserRecommendationCard')),
  <ComponentLoadingFallback height={150} />
);

export const LazyAchievementCard = withLazyLoading(
  lazy(() => import('./achievements/AchievementCard')),
  <ComponentLoadingFallback height={120} />
);

export const LazyLiveMatchBoard = withLazyLoading(
  lazy(() => import('./LiveMatchBoard')),
  <ComponentLoadingFallback height={250} />
);

// Export utilities
export { 
  PageLoadingFallback, 
  ComponentLoadingFallback, 
  LazyErrorBoundary, 
  withLazyLoading 
};
