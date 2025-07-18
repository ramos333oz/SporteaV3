# Frontend Integration Plan for KNN Recommendation System

## Overview

This document outlines the frontend integration strategy for the KNN recommendation system, including UI/UX enhancements, component modifications, and user flow improvements to seamlessly incorporate KNN-based recommendations with 142-element user vectors into the existing Sportea interface.

## Current Frontend Analysis

### Existing Components
- ✅ **FindGames.jsx**: Main match discovery interface
- ✅ **LiveMatchBoard.jsx**: Real-time match display
- ✅ **EnhancedMatchCard.jsx**: Unified match card component
- ✅ **ProfileEdit.jsx**: User profile and preferences management
- ✅ **ProfilePreferences.jsx**: Time slot and preference selection
- ✅ **simplifiedRecommendationService.js**: Current recommendation service

### Current Recommendation Flow
1. User visits Find page
2. System calls simplifiedRecommendationService
3. Matches displayed in list/map/calendar views
4. User can join matches directly

## KNN Integration Strategy

### Phase 1: Service Layer Integration

#### 1. Enhanced Recommendation Service

**File**: `src/services/enhancedRecommendationService.js`

```javascript
import { knnRecommendationService } from './knnRecommendationService';
import { simplifiedRecommendationService } from './simplifiedRecommendationService';

class EnhancedRecommendationService {
  constructor() {
    this.fallbackToSimplified = true;
    this.knnEnabled = true;
  }

  async getRecommendations(userId, options = {}) {
    try {
      // Try KNN first if enabled
      if (this.knnEnabled) {
        const knnResults = await knnRecommendationService.getRecommendations(userId, {
          ...options,
          includeExplanations: true
        });

        // Enhance with KNN metadata
        return {
          ...knnResults,
          algorithm: 'knn',
          enhanced: true
        };
      }
    } catch (error) {
      console.warn('KNN recommendations failed, falling back to simplified:', error);
      
      if (!this.fallbackToSimplified) {
        throw error;
      }
    }

    // Fallback to existing system
    const simplifiedResults = await simplifiedRecommendationService.getRecommendations(userId, options);
    return {
      ...simplifiedResults,
      algorithm: 'simplified',
      enhanced: false
    };
  }

  async updateUserPreferences(userId, preferences) {
    // Update both systems
    await Promise.all([
      knnRecommendationService.updateUserVector(userId, preferences),
      // Update existing preference storage if needed
    ]);
  }
}

export const enhancedRecommendationService = new EnhancedRecommendationService();
```

#### 2. Recommendation Context Provider

**File**: `src/contexts/RecommendationContext.jsx`

```javascript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { enhancedRecommendationService } from '../services/enhancedRecommendationService';
import { useAuth } from './AuthContext';

const RecommendationContext = createContext();

export const RecommendationProvider = ({ children }) => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [algorithm, setAlgorithm] = useState('knn');
  const [lastUpdated, setLastUpdated] = useState(null);

  const refreshRecommendations = async (options = {}) => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const result = await enhancedRecommendationService.getRecommendations(user.id, options);
      
      setRecommendations(result.recommendations || []);
      setAlgorithm(result.algorithm);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to refresh recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (preferences) => {
    await enhancedRecommendationService.updateUserPreferences(user.id, preferences);
    await refreshRecommendations(); // Refresh after update
  };

  useEffect(() => {
    if (user?.id) {
      refreshRecommendations();
    }
  }, [user?.id]);

  return (
    <RecommendationContext.Provider value={{
      recommendations,
      loading,
      algorithm,
      lastUpdated,
      refreshRecommendations,
      updatePreferences
    }}>
      {children}
    </RecommendationContext.Provider>
  );
};

export const useRecommendations = () => {
  const context = useContext(RecommendationContext);
  if (!context) {
    throw new Error('useRecommendations must be used within RecommendationProvider');
  }
  return context;
};
```

### Phase 2: UI Component Enhancements

#### 1. Enhanced Match Card with KNN Explanations

**File**: `src/components/KNNEnhancedMatchCard.jsx`

```javascript
import React, { useState } from 'react';
import { 
  Card, CardContent, Typography, Chip, Box, Collapse, 
  IconButton, Tooltip, Badge 
} from '@mui/material';
import { 
  ExpandMore, Psychology, Group, Schedule, 
  LocationOn, TrendingUp 
} from '@mui/icons-material';
import { EnhancedMatchCard } from './EnhancedMatchCard';

const KNNEnhancedMatchCard = ({ match, onJoin, joinedMatches, ...props }) => {
  const [showExplanation, setShowExplanation] = useState(false);
  
  const isKNNRecommendation = match.algorithm === 'knn';
  const explanation = match.explanation || {};

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'default';
  };

  const getReasonIcon = (reason) => {
    if (reason.includes('time')) return <Schedule fontSize="small" />;
    if (reason.includes('sport')) return <Psychology fontSize="small" />;
    if (reason.includes('location')) return <LocationOn fontSize="small" />;
    if (reason.includes('users')) return <Group fontSize="small" />;
    return <TrendingUp fontSize="small" />;
  };

  return (
    <Card sx={{ position: 'relative' }}>
      {/* KNN Badge */}
      {isKNNRecommendation && (
        <Badge
          badgeContent={
            <Tooltip title="AI-powered recommendation">
              <Psychology fontSize="small" sx={{ color: 'white' }} />
            </Tooltip>
          }
          color="primary"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 1
          }}
        />
      )}

      {/* Original Match Card */}
      <EnhancedMatchCard
        match={match}
        onJoin={onJoin}
        joinedMatches={joinedMatches}
        {...props}
      />

      {/* KNN Explanation Section */}
      {isKNNRecommendation && (
        <CardContent sx={{ pt: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Chip
              label={`${Math.round(match.recommendation_score * 100)}% match`}
              color={getConfidenceColor(match.recommendation_score)}
              size="small"
              variant="outlined"
            />
            <Chip
              label={`${match.neighbor_count} similar users`}
              size="small"
              variant="outlined"
            />
            <IconButton
              size="small"
              onClick={() => setShowExplanation(!showExplanation)}
              sx={{ ml: 'auto' }}
            >
              <ExpandMore 
                sx={{ 
                  transform: showExplanation ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s'
                }}
              />
            </IconButton>
          </Box>

          <Collapse in={showExplanation}>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Why this match was recommended:
              </Typography>
              
              {explanation.primary_reasons?.map((reason, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  {getReasonIcon(reason)}
                  <Typography variant="body2">{reason}</Typography>
                </Box>
              ))}

              {match.neighbor_count > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Based on preferences of {match.neighbor_count} users similar to you
                </Typography>
              )}
            </Box>
          </Collapse>
        </CardContent>
      )}
    </Card>
  );
};

export default KNNEnhancedMatchCard;
```

#### 2. Recommendation Algorithm Toggle

**File**: `src/components/RecommendationSettings.jsx`

```javascript
import React from 'react';
import { 
  FormControl, FormLabel, RadioGroup, FormControlLabel, 
  Radio, Typography, Box, Switch, Tooltip 
} from '@mui/material';
import { Psychology, Speed, TuneOutlined } from '@mui/icons-material';

const RecommendationSettings = ({ 
  algorithm, 
  onAlgorithmChange, 
  knnEnabled, 
  onKnnToggle 
}) => {
  return (
    <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TuneOutlined />
        Recommendation Settings
      </Typography>

      <FormControl component="fieldset" sx={{ mb: 2 }}>
        <FormLabel component="legend">Algorithm</FormLabel>
        <RadioGroup
          value={algorithm}
          onChange={(e) => onAlgorithmChange(e.target.value)}
        >
          <FormControlLabel
            value="knn"
            control={<Radio />}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Psychology fontSize="small" />
                <Box>
                  <Typography variant="body2">AI-Powered (KNN)</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Finds matches based on users similar to you
                  </Typography>
                </Box>
              </Box>
            }
            disabled={!knnEnabled}
          />
          <FormControlLabel
            value="simplified"
            control={<Radio />}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Speed fontSize="small" />
                <Box>
                  <Typography variant="body2">Direct Matching</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Matches based on your direct preferences
                  </Typography>
                </Box>
              </Box>
            }
          />
        </RadioGroup>
      </FormControl>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Switch
          checked={knnEnabled}
          onChange={(e) => onKnnToggle(e.target.checked)}
        />
        <Tooltip title="Enable AI-powered recommendations using machine learning">
          <Typography variant="body2">
            Enable AI Recommendations
          </Typography>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default RecommendationSettings;
```

#### 3. Updated Find Games Component

**File**: `src/pages/Find/FindGamesKNN.jsx`

```javascript
import React, { useState, useEffect } from 'react';
import { Box, Typography, Alert, Skeleton } from '@mui/material';
import { useRecommendations } from '../../contexts/RecommendationContext';
import KNNEnhancedMatchCard from '../../components/KNNEnhancedMatchCard';
import RecommendationSettings from '../../components/RecommendationSettings';

const FindGamesKNN = () => {
  const { 
    recommendations, 
    loading, 
    algorithm, 
    refreshRecommendations 
  } = useRecommendations();
  
  const [knnEnabled, setKnnEnabled] = useState(true);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('knn');

  const handleAlgorithmChange = async (newAlgorithm) => {
    setSelectedAlgorithm(newAlgorithm);
    await refreshRecommendations({ algorithm: newAlgorithm });
  };

  const handleKnnToggle = async (enabled) => {
    setKnnEnabled(enabled);
    if (!enabled) {
      setSelectedAlgorithm('simplified');
      await refreshRecommendations({ algorithm: 'simplified' });
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        {[...Array(3)].map((_, index) => (
          <Skeleton key={index} variant="rectangular" height={200} sx={{ mb: 2 }} />
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* Algorithm Settings */}
      <RecommendationSettings
        algorithm={selectedAlgorithm}
        onAlgorithmChange={handleAlgorithmChange}
        knnEnabled={knnEnabled}
        onKnnToggle={handleKnnToggle}
      />

      {/* Algorithm Info */}
      {algorithm === 'knn' && (
        <Alert severity="info" sx={{ my: 2 }}>
          <Typography variant="body2">
            🤖 AI-powered recommendations based on users with similar preferences to you
          </Typography>
        </Alert>
      )}

      {/* Recommendations */}
      <Typography variant="h6" sx={{ my: 2 }}>
        Recommended Matches ({recommendations.length})
      </Typography>

      {recommendations.length === 0 ? (
        <Alert severity="info">
          No recommendations available. Try updating your preferences or check back later.
        </Alert>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {recommendations.map((match) => (
            <KNNEnhancedMatchCard
              key={match.id}
              match={match}
              onJoin={(matchId) => console.log('Join match:', matchId)}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default FindGamesKNN;
```

### Phase 3: Profile Integration

#### 1. Enhanced Profile Preferences

**File**: `src/components/KNNProfilePreferences.jsx`

```javascript
import React, { useState } from 'react';
import { Box, Typography, Alert, LinearProgress } from '@mui/material';
import { Psychology, TrendingUp } from '@mui/icons-material';
import ProfilePreferences from './ProfilePreferences';
import { useRecommendations } from '../contexts/RecommendationContext';

const KNNProfilePreferences = ({ value, onChange, facilities }) => {
  const { updatePreferences } = useRecommendations();
  const [vectorCompleteness, setVectorCompleteness] = useState(0.75);

  const handlePreferenceChange = async (newPreferences) => {
    onChange(newPreferences);
    
    // Update KNN vector
    try {
      await updatePreferences(newPreferences);
      // Update completeness score based on filled preferences
      const completeness = calculateCompleteness(newPreferences);
      setVectorCompleteness(completeness);
    } catch (error) {
      console.error('Failed to update KNN preferences:', error);
    }
  };

  const calculateCompleteness = (preferences) => {
    let score = 0;
    const maxScore = 5;

    if (preferences.available_days?.length > 0) score += 1;
    if (Object.keys(preferences.available_hours || {}).length > 0) score += 1;
    if (preferences.preferred_facilities?.length > 0) score += 1;
    if (preferences.home_location) score += 1;
    if (preferences.play_style) score += 1;

    return score / maxScore;
  };

  const getCompletenessColor = (score) => {
    if (score >= 0.8) return 'success';
    if (score >= 0.6) return 'warning';
    return 'error';
  };

  return (
    <Box>
      {/* KNN Status */}
      <Alert 
        severity="info" 
        icon={<Psychology />}
        sx={{ mb: 2 }}
      >
        <Typography variant="body2" gutterBottom>
          <strong>AI Recommendation Profile</strong>
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <Typography variant="caption">
            Profile Completeness: {Math.round(vectorCompleteness * 100)}%
          </Typography>
          <LinearProgress
            variant="determinate"
            value={vectorCompleteness * 100}
            color={getCompletenessColor(vectorCompleteness)}
            sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
          />
        </Box>
        <Typography variant="caption" color="text.secondary">
          More complete profiles get better recommendations
        </Typography>
      </Alert>

      {/* Original Preferences Component */}
      <ProfilePreferences
        value={value}
        onChange={handlePreferenceChange}
        facilities={facilities}
      />

      {/* Recommendation Impact */}
      {vectorCompleteness < 0.6 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <TrendingUp sx={{ verticalAlign: 'middle', mr: 1 }} />
            Complete more preferences to improve your AI recommendations
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default KNNProfilePreferences;
```

### Phase 4: User Flow Integration

#### 1. Onboarding Enhancement

```javascript
// Add KNN explanation to user onboarding
const KNNOnboardingStep = () => (
  <Box sx={{ textAlign: 'center', p: 3 }}>
    <Psychology sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
    <Typography variant="h5" gutterBottom>
      AI-Powered Match Recommendations
    </Typography>
    <Typography variant="body1" color="text.secondary" paragraph>
      Our smart algorithm learns from users with similar preferences to suggest 
      the best matches for you. The more you use the app, the better it gets!
    </Typography>
  </Box>
);
```

#### 2. Recommendation Feedback

```javascript
// Collect user feedback on recommendations
const RecommendationFeedback = ({ matchId, onFeedback }) => {
  const [rating, setRating] = useState(0);
  
  const handleFeedback = async (helpful) => {
    await supabase.from('recommendation_feedback').insert({
      match_id: matchId,
      user_id: user.id,
      helpful,
      rating,
      algorithm: 'knn'
    });
    
    onFeedback(helpful);
  };

  return (
    <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
      <Typography variant="body2" gutterBottom>
        Was this recommendation helpful?
      </Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button size="small" onClick={() => handleFeedback(true)}>
          👍 Yes
        </Button>
        <Button size="small" onClick={() => handleFeedback(false)}>
          👎 No
        </Button>
      </Box>
    </Box>
  );
};
```

## Implementation Timeline

### Week 1-2: Foundation
- [ ] Implement RecommendationContext
- [ ] Create enhancedRecommendationService
- [ ] Update ProfilePreferences with KNN integration

### Week 3-4: UI Components
- [ ] Develop KNNEnhancedMatchCard
- [ ] Create RecommendationSettings component
- [ ] Update FindGames with KNN support

### Week 5-6: Integration & Testing
- [ ] Integrate with existing components
- [ ] Add recommendation feedback system
- [ ] Implement A/B testing framework

### Week 7-8: Polish & Optimization
- [ ] Performance optimization
- [ ] User experience refinements
- [ ] Documentation and training

This integration plan ensures a smooth transition to KNN recommendations while maintaining backward compatibility and providing users with enhanced, explainable recommendations.
