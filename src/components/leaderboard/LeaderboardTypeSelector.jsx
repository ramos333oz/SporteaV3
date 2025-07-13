import React from 'react';
import {
  Box,
  Tabs,
  Tab,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
  Chip
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import GroupIcon from '@mui/icons-material/Group';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import PublicIcon from '@mui/icons-material/Public';
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';

/**
 * LeaderboardTypeSelector Component
 * Allows users to select leaderboard type, timeframe, and grouping
 * Following SporteaV3's design system with Material-UI best practices
 */
const LeaderboardTypeSelector = ({
  selectedType = 'xp',
  selectedTimeframe = 'all',
  selectedGroup = 'global',
  onTypeChange,
  onTimeframeChange,
  onGroupChange,
  friendsCount = 0
}) => {
  const leaderboardTypes = [
    {
      value: 'xp',
      label: 'Experience',
      icon: <TrendingUpIcon />,
      description: 'Total XP earned'
    },
    {
      value: 'level',
      label: 'Level',
      icon: <EmojiEventsIcon />,
      description: 'Current user level'
    }
  ];

  const timeframes = [
    { value: 'all', label: 'All Time' },
    { value: 'monthly', label: 'This Month' },
    { value: 'weekly', label: 'This Week' }
  ];

  const groupTypes = [
    {
      value: 'global',
      label: 'Global',
      icon: <PublicIcon />,
      description: 'All users'
    },
    {
      value: 'friends',
      label: 'Friends',
      icon: <PeopleIcon />,
      description: `Your friends (${friendsCount})`,
      disabled: friendsCount === 0
    },
    {
      value: 'level_tier',
      label: 'Level Tier',
      icon: <SchoolIcon />,
      description: 'Users in your level range'
    }
  ];

  return (
    <Box sx={{ mb: 3 }}>
      {/* Leaderboard Type Selection */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Leaderboard Type
        </Typography>
        <Tabs
          value={selectedType}
          onChange={(e, newValue) => onTypeChange(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              minHeight: 64,
              textTransform: 'none',
              fontWeight: 600
            }
          }}
        >
          {leaderboardTypes.map((type) => (
            <Tab
              key={type.value}
              value={type.value}
              icon={type.icon}
              iconPosition="start"
              label={
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {type.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {type.description}
                  </Typography>
                </Box>
              }
              sx={{ alignItems: 'flex-start', px: 3 }}
            />
          ))}
        </Tabs>
      </Box>

      {/* Timeframe Selection */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
          Timeframe
        </Typography>
        <ToggleButtonGroup
          value={selectedTimeframe}
          exclusive
          onChange={(e, newValue) => newValue && onTimeframeChange(newValue)}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              px: 2,
              py: 1,
              textTransform: 'none',
              fontWeight: 500,
              border: '1px solid',
              borderColor: 'divider',
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark'
                }
              }
            }
          }}
        >
          {timeframes.map((timeframe) => (
            <ToggleButton key={timeframe.value} value={timeframe.value}>
              {timeframe.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* Group Selection */}
      <Box>
        <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
          Competition Group
        </Typography>
        <ToggleButtonGroup
          value={selectedGroup}
          exclusive
          onChange={(e, newValue) => newValue && onGroupChange(newValue)}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              px: 2,
              py: 1,
              textTransform: 'none',
              fontWeight: 500,
              border: '1px solid',
              borderColor: 'divider',
              flexDirection: 'column',
              minWidth: 100,
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark'
                }
              },
              '&.Mui-disabled': {
                opacity: 0.5
              }
            }
          }}
        >
          {groupTypes.map((group) => (
            <ToggleButton 
              key={group.value} 
              value={group.value}
              disabled={group.disabled}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                {group.icon}
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {group.label}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {group.description}
              </Typography>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>
    </Box>
  );
};

export default LeaderboardTypeSelector;
