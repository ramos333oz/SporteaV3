# Sportea UI Component Templates
## Ready-to-Use Code Templates for Modern UI Components

*Companion to UI_Style_Guide.md - Version 1.0*

---

## Modern Tab Component Template

### Basic Tab Implementation
```jsx
import React, { useState } from 'react';
import { Paper, Tabs, Tab, Box } from '@mui/material';

const ModernTabs = ({ tabs, defaultTab = 0, onTabChange }) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    onTabChange?.(newValue);
  };

  return (
    <Paper sx={{ mb: 3, borderRadius: 2, p: 1, bgcolor: 'grey.50' }}>
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant="fullWidth"
        sx={{
          minHeight: 'auto',
          '& .MuiTabs-indicator': {
            display: 'none',
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
        {tabs.map((tab, index) => (
          <Tab 
            key={index} 
            label={tab.label} 
            icon={tab.icon} 
            iconPosition={tab.iconPosition || 'start'}
          />
        ))}
      </Tabs>
    </Paper>
  );
};

// Usage Example
const ExampleUsage = () => {
  const tabs = [
    { label: 'List View', icon: <ListIcon /> },
    { label: 'Map View', icon: <MapIcon /> },
    { label: 'Calendar', icon: <CalendarIcon /> }
  ];

  return (
    <ModernTabs 
      tabs={tabs} 
      onTabChange={(index) => console.log('Tab changed to:', index)}
    />
  );
};
```

### Tab with Content Panels
```jsx
import React, { useState } from 'react';
import { Paper, Tabs, Tab, Box, Typography } from '@mui/material';

const TabPanel = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`tabpanel-${index}`}
    aria-labelledby={`tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </div>
);

const TabbedContent = ({ tabs }) => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <>
      {/* Tab Headers */}
      <Paper sx={{ mb: 3, borderRadius: 2, p: 1, bgcolor: 'grey.50' }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
          sx={{
            minHeight: 'auto',
            '& .MuiTabs-indicator': { display: 'none' },
            '& .MuiTab-root': {
              minHeight: 'auto',
              py: 1.5, px: 3,
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
          {tabs.map((tab, index) => (
            <Tab key={index} label={tab.label} />
          ))}
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {tabs.map((tab, index) => (
        <TabPanel key={index} value={activeTab} index={index}>
          {tab.content}
        </TabPanel>
      ))}
    </>
  );
};
```

---

## Chip Filter Component Template

### Basic Chip Filter
```jsx
import React, { useState } from 'react';
import { Paper, Box, Typography, Chip } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';

const ChipFilter = ({ 
  options, 
  selectedValue, 
  onSelectionChange, 
  label = "Filter Options",
  icon = <FilterListIcon />,
  multiSelect = false 
}) => {
  const [selected, setSelected] = useState(
    multiSelect ? (selectedValue || []) : (selectedValue || 'all')
  );

  const handleChipClick = (optionId) => {
    let newSelection;
    
    if (multiSelect) {
      if (optionId === 'all') {
        newSelection = [];
      } else {
        newSelection = selected.includes(optionId)
          ? selected.filter(id => id !== optionId)
          : [...selected.filter(id => id !== 'all'), optionId];
      }
    } else {
      newSelection = optionId;
    }
    
    setSelected(newSelection);
    onSelectionChange?.(newSelection);
  };

  const isChipActive = (optionId) => {
    if (multiSelect) {
      return optionId === 'all' ? selected.length === 0 : selected.includes(optionId);
    }
    return selected === optionId;
  };

  const getChipSx = (isActive) => ({
    borderRadius: 1.5,
    fontWeight: 500,
    fontSize: '0.875rem',
    transition: 'all 0.2s ease-in-out',
    ...(isActive ? {
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
  });

  return (
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
          {icon && React.cloneElement(icon, { sx: { fontSize: '1.1rem' } })}
          {label}
        </Typography>
      </Box>
      
      <Box sx={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: 1,
        maxHeight: '120px',
        overflowY: 'auto',
        '&::-webkit-scrollbar': { width: '4px' },
        '&::-webkit-scrollbar-track': { background: 'transparent' },
        '&::-webkit-scrollbar-thumb': { 
          background: 'rgba(0,0,0,0.2)', 
          borderRadius: '2px' 
        },
      }}>
        {/* All option */}
        <Chip
          label="All"
          onClick={() => handleChipClick('all')}
          variant={isChipActive('all') ? 'filled' : 'outlined'}
          sx={getChipSx(isChipActive('all'))}
        />
        
        {/* Individual options */}
        {options.map((option) => (
          <Chip
            key={option.id}
            label={option.name}
            icon={option.icon}
            onClick={() => handleChipClick(option.id)}
            variant={isChipActive(option.id) ? 'filled' : 'outlined'}
            sx={getChipSx(isChipActive(option.id))}
          />
        ))}
      </Box>
    </Paper>
  );
};

// Usage Example
const FilterExample = () => {
  const sportOptions = [
    { id: 'basketball', name: 'Basketball', icon: <BasketballIcon /> },
    { id: 'football', name: 'Football', icon: <FootballIcon /> },
    { id: 'tennis', name: 'Tennis', icon: <TennisIcon /> }
  ];

  return (
    <ChipFilter
      options={sportOptions}
      label="Filter by Sport"
      icon={<FilterListIcon />}
      onSelectionChange={(selected) => console.log('Selected:', selected)}
    />
  );
};
```

### Advanced Multi-Select Chip Filter
```jsx
import React, { useState, useCallback } from 'react';
import { Paper, Box, Typography, Chip, Badge } from '@mui/material';

const MultiSelectChipFilter = ({ 
  options, 
  selectedValues = [], 
  onSelectionChange, 
  label,
  maxVisible = 10,
  showCount = true 
}) => {
  const [selected, setSelected] = useState(selectedValues);
  const [showAll, setShowAll] = useState(false);

  const handleChipClick = useCallback((optionId) => {
    const newSelection = selected.includes(optionId)
      ? selected.filter(id => id !== optionId)
      : [...selected, optionId];
    
    setSelected(newSelection);
    onSelectionChange?.(newSelection);
  }, [selected, onSelectionChange]);

  const clearAll = () => {
    setSelected([]);
    onSelectionChange?.([]);
  };

  const visibleOptions = showAll ? options : options.slice(0, maxVisible);
  const hasMore = options.length > maxVisible;

  return (
    <Paper sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: 'grey.50' }}>
      {/* Header with count */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 1.5 
      }}>
        <Typography variant="body2" sx={{ 
          fontWeight: 600, 
          color: 'text.secondary',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <FilterListIcon sx={{ fontSize: '1.1rem' }} />
          {label}
          {showCount && selected.length > 0 && (
            <Badge badgeContent={selected.length} color="primary" />
          )}
        </Typography>
        
        {selected.length > 0 && (
          <Chip
            label="Clear All"
            size="small"
            variant="outlined"
            onClick={clearAll}
            sx={{ fontSize: '0.75rem' }}
          />
        )}
      </Box>

      {/* Chip List */}
      <Box sx={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: 1,
        maxHeight: '120px',
        overflowY: 'auto',
        '&::-webkit-scrollbar': { width: '4px' },
        '&::-webkit-scrollbar-track': { background: 'transparent' },
        '&::-webkit-scrollbar-thumb': { 
          background: 'rgba(0,0,0,0.2)', 
          borderRadius: '2px' 
        },
      }}>
        {visibleOptions.map((option) => (
          <Chip
            key={option.id}
            label={option.name}
            icon={option.icon}
            onClick={() => handleChipClick(option.id)}
            variant={selected.includes(option.id) ? 'filled' : 'outlined'}
            sx={{
              borderRadius: 1.5,
              fontWeight: 500,
              fontSize: '0.875rem',
              transition: 'all 0.2s ease-in-out',
              ...(selected.includes(option.id) ? {
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
        
        {/* Show More/Less Toggle */}
        {hasMore && (
          <Chip
            label={showAll ? 'Show Less' : `+${options.length - maxVisible} More`}
            variant="outlined"
            size="small"
            onClick={() => setShowAll(!showAll)}
            sx={{
              fontSize: '0.75rem',
              color: 'text.secondary',
              borderStyle: 'dashed'
            }}
          />
        )}
      </Box>
    </Paper>
  );
};
```

---

## Utility Functions and Hooks

### Custom Hook for Filter State Management
```jsx
import { useState, useCallback, useMemo } from 'react';

export const useFilterState = (initialFilters = {}) => {
  const [filters, setFilters] = useState(initialFilters);

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const clearFilter = useCallback((key) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({});
  }, []);

  const hasActiveFilters = useMemo(() => {
    return Object.keys(filters).length > 0;
  }, [filters]);

  return {
    filters,
    updateFilter,
    clearFilter,
    clearAllFilters,
    hasActiveFilters
  };
};
```

### Theme Integration Utilities
```jsx
import { useTheme } from '@mui/material/styles';

export const useModernStyles = () => {
  const theme = useTheme();

  return {
    containerSx: {
      p: 2,
      mb: 3,
      borderRadius: 2,
      bgcolor: 'grey.50',
      boxShadow: '0 6px 20px rgba(0,0,0,0.08)'
    },
    
    headerSx: {
      mb: 1.5,
      fontWeight: 600,
      color: 'text.secondary',
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      fontSize: '0.875rem'
    },
    
    chipActiveSx: {
      bgcolor: 'primary.main',
      color: 'primary.contrastText',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      '&:hover': {
        bgcolor: 'primary.dark',
        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
      },
    },
    
    chipInactiveSx: {
      bgcolor: 'background.paper',
      color: 'text.secondary',
      borderColor: 'divider',
      '&:hover': {
        bgcolor: 'action.hover',
        color: 'text.primary',
        borderColor: 'primary.main',
      },
    }
  };
};
```

---

## Integration Examples

### Complete Filter Page Implementation
```jsx
import React from 'react';
import { Box, Container } from '@mui/material';
import { ModernTabs } from './ModernTabs';
import { ChipFilter } from './ChipFilter';
import { useFilterState } from './hooks/useFilterState';

const FilterPage = () => {
  const { filters, updateFilter } = useFilterState();
  
  const viewTabs = [
    { label: 'List View' },
    { label: 'Map View' },
    { label: 'Calendar' }
  ];
  
  const sportOptions = [
    { id: 'basketball', name: 'Basketball', icon: <BasketballIcon /> },
    { id: 'football', name: 'Football', icon: <FootballIcon /> },
    // ... more options
  ];

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        {/* View Mode Tabs */}
        <ModernTabs 
          tabs={viewTabs}
          onTabChange={(index) => updateFilter('viewMode', index)}
        />
        
        {/* Sport Filter */}
        <ChipFilter
          options={sportOptions}
          label="Filter by Sport"
          selectedValue={filters.sport}
          onSelectionChange={(value) => updateFilter('sport', value)}
        />
        
        {/* Content based on filters */}
        <Box>
          {/* Your filtered content here */}
        </Box>
      </Box>
    </Container>
  );
};
```

---

*These templates provide production-ready code that follows the Sportea design system. Copy and modify as needed for your specific use cases.*
