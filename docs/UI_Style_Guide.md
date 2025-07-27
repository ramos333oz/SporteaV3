# Sportea UI Style Guide
## Modern Tab Design & Chip-Based Filtering Patterns

*Version 1.0 - Created: July 27, 2025*

---

## Table of Contents
1. [Design System Specifications](#design-system-specifications)
2. [Component Styling Patterns](#component-styling-patterns)
3. [Theme Integration](#theme-integration)
4. [Reusable Code Snippets](#reusable-code-snippets)
5. [Implementation Guidelines](#implementation-guidelines)

---

## Design System Specifications

### Core Color Palette
```javascript
// Primary Colors (from Elegant Luxury theme)
primary: {
  main: '#9b2c2c',        // Primary red
  dark: '#7a2323',        // Darker red for hover states
  contrastText: '#ffffff'  // White text on primary background
}

// Background Colors
background: {
  paper: '#ffffff',       // White background for chips/cards
  default: '#faf7f5'      // Main background (Elegant Luxury)
}

// Grey Palette
grey: {
  50: '#fafafa',          // Light grey container backgrounds
  100: '#f5f5f5',         // Subtle borders and dividers
  500: '#9e9e9e'          // Secondary text color
}

// Text Colors
text: {
  primary: '#212121',     // Main text color
  secondary: '#757575'    // Secondary text color
}
```

### Spacing System
```javascript
// Material-UI spacing units (1 unit = 8px)
spacing: {
  0.5: '4px',   // Minimal spacing
  1: '8px',     // Small spacing
  1.5: '12px',  // Medium-small spacing
  2: '16px',    // Standard spacing
  3: '24px',    // Large spacing
}
```

### Border Radius Standards
```javascript
borderRadius: {
  1: '4px',     // Subtle rounding
  1.5: '6px',   // Chip border radius
  2: '8px',     // Container border radius
  3: '12px'     // Large container radius
}
```

### Shadow Specifications
```javascript
// Elevation shadows for interactive elements
shadows: {
  subtle: '0 1px 3px rgba(0,0,0,0.1)',      // Default chip shadow
  hover: '0 2px 6px rgba(0,0,0,0.15)',      // Hover state shadow
  container: '0 6px 20px rgba(0,0,0,0.08)'  // Container shadow
}
```

### Typography Scale
```javascript
typography: {
  // Headers and labels
  body2: {
    fontSize: '0.875rem',  // 14px - Filter labels
    fontWeight: 600,       // Semi-bold for emphasis
    lineHeight: 1.43
  },
  
  // Chip text
  chipText: {
    fontSize: '0.875rem',  // 14px - Consistent with body2
    fontWeight: 500,       // Medium weight
    lineHeight: 1.2
  }
}
```

---

## Component Styling Patterns

### Container Pattern (Paper Components)
```javascript
// Standard container for filters and tabs
const containerSx = {
  p: 2,                    // 16px padding
  mb: 3,                   // 24px margin bottom
  borderRadius: 2,         // 8px border radius
  bgcolor: 'grey.50',      // Light grey background
  boxShadow: '0 6px 20px rgba(0,0,0,0.08)' // Subtle elevation
}

// Usage example
<Paper sx={containerSx}>
  {/* Content */}
</Paper>
```

### Header Pattern (Filter/Tab Labels)
```javascript
// Standard header styling for sections
const headerSx = {
  mb: 1.5,                 // 12px margin bottom
  fontWeight: 600,         // Semi-bold
  color: 'text.secondary', // Grey text color
  display: 'flex',
  alignItems: 'center',
  gap: 1,                  // 8px gap between icon and text
  fontSize: '0.875rem'     // 14px font size
}

// Usage example
<Typography variant="body2" sx={headerSx}>
  <FilterListIcon sx={{ fontSize: '1.1rem' }} />
  Filter by Sport
</Typography>
```

### Scrollable Container Pattern
```javascript
// For horizontal/vertical scrolling content
const scrollContainerSx = {
  display: 'flex',
  flexWrap: 'wrap',        // Allow wrapping on small screens
  gap: 1,                  // 8px gap between items
  maxHeight: '120px',      // Limit height for vertical scroll
  overflowY: 'auto',       // Enable vertical scrolling
  
  // Custom scrollbar styling
  '&::-webkit-scrollbar': {
    width: '4px',
    height: '4px'
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent'
  },
  '&::-webkit-scrollbar-thumb': {
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '2px'
  }
}
```

---

## Interactive Element Patterns

### Modern Tab Styling
```javascript
// Tab container (Tabs component)
const tabContainerSx = {
  minHeight: 'auto',
  '& .MuiTabs-indicator': {
    display: 'none'         // Remove default underline
  },
  '& .MuiTab-root': {
    minHeight: 'auto',
    py: 1.5,               // 12px vertical padding
    px: 3,                 // 24px horizontal padding
    borderRadius: 1.5,     // 6px border radius
    textTransform: 'none', // Preserve text case
    fontWeight: 500,       // Medium font weight
    fontSize: '0.875rem',  // 14px font size
    color: 'text.secondary',
    transition: 'all 0.2s ease-in-out',
    
    // Hover state
    '&:hover': {
      bgcolor: 'action.hover',
      color: 'text.primary',
    },
    
    // Selected state
    '&.Mui-selected': {
      bgcolor: 'background.paper',
      color: 'primary.main',
      fontWeight: 600,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }
  }
}
```

### Chip-Based Filter Styling
```javascript
// Individual chip styling function
const getChipSx = (isActive) => ({
  borderRadius: 1.5,       // 6px border radius
  fontWeight: 500,         // Medium font weight
  fontSize: '0.875rem',    // 14px font size
  transition: 'all 0.2s ease-in-out',
  
  // Active state styling
  ...(isActive ? {
    bgcolor: 'primary.main',
    color: 'primary.contrastText',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    '&:hover': {
      bgcolor: 'primary.dark',
      boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
    }
  } : {
    // Inactive state styling
    bgcolor: 'background.paper',
    color: 'text.secondary',
    borderColor: 'divider',
    '&:hover': {
      bgcolor: 'action.hover',
      color: 'text.primary',
      borderColor: 'primary.main'
    }
  })
})

// Usage example
<Chip
  label="Option"
  variant={isActive ? 'filled' : 'outlined'}
  sx={getChipSx(isActive)}
  onClick={handleClick}
/>
```

---

## Theme Integration

### Elegant Luxury Theme Compatibility
```javascript
// Colors that integrate with existing theme
const themeColors = {
  primary: '#9b2c2c',      // Matches existing primary
  background: '#faf7f5',   // Matches existing background
  containerBg: 'grey.50',  // Light grey for containers
  textSecondary: '#757575' // Consistent secondary text
}

// Font integration
const themeFonts = {
  primary: 'Poppins',      // Body text and UI elements
  heading: 'Libre Baskerville', // Headings (when needed)
  mono: 'IBM Plex Mono'    // Code/technical elements
}
```

### Consistent Visual Hierarchy
```javascript
// Spacing hierarchy for consistent layouts
const spacingHierarchy = {
  componentGap: 1,         // 8px - Between related elements
  sectionGap: 1.5,         // 12px - Between sections
  containerPadding: 2,     // 16px - Internal container padding
  containerMargin: 3       // 24px - Between major components
}
```

---

## Reusable Code Snippets

### Modern Tab Template
```javascript
// Complete modern tab implementation
<Paper sx={{ mb: 3, borderRadius: 2, p: 1, bgcolor: 'grey.50' }}>
  <Tabs
    value={activeTab}
    onChange={handleTabChange}
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
    <Tab label="Option 1" />
    <Tab label="Option 2" />
    <Tab label="Option 3" />
  </Tabs>
</Paper>
```

### Chip Filter Template
```javascript
// Complete chip-based filter implementation
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
      Filter Label
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
    {options.map((option) => (
      <Chip
        key={option.id}
        label={option.name}
        icon={option.icon}
        onClick={() => handleOptionChange(option.id)}
        variant={selectedOption === option.id ? 'filled' : 'outlined'}
        sx={{
          borderRadius: 1.5,
          fontWeight: 500,
          fontSize: '0.875rem',
          transition: 'all 0.2s ease-in-out',
          ...(selectedOption === option.id ? {
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
```

---

## Implementation Guidelines

### When to Use Each Pattern

#### Modern Tabs
- **Use for**: Navigation between related views/content
- **Best for**: 2-5 options that are mutually exclusive
- **Examples**: List/Map/Calendar views, Settings categories

#### Chip Filters
- **Use for**: Filtering or selection from multiple options
- **Best for**: 3-15 options with clear visual icons
- **Examples**: Sport filters, Category filters, Tag selection

### Consistency Rules

1. **Container Backgrounds**: Always use `grey.50` for filter/tab containers
2. **Spacing**: Maintain consistent padding (2) and margins (3) for containers
3. **Border Radius**: Use 1.5 for interactive elements, 2 for containers
4. **Transitions**: Always use `0.2s ease-in-out` for smooth interactions
5. **Typography**: Use `0.875rem` and weight 500-600 for interactive elements

### Extension Guidelines

#### Adding New Interactive Elements
```javascript
// Base interactive element pattern
const baseInteractiveSx = {
  borderRadius: 1.5,
  fontWeight: 500,
  fontSize: '0.875rem',
  transition: 'all 0.2s ease-in-out',
  // Add specific styling based on component type
}
```

#### Maintaining Theme Consistency
- Always reference theme colors via Material-UI color tokens
- Use consistent spacing units (multiples of 8px)
- Maintain visual hierarchy with proper contrast ratios
- Test hover and active states for accessibility

---

## Advanced Implementation Patterns

### Responsive Design Considerations
```javascript
// Responsive chip container for mobile devices
const responsiveChipContainerSx = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 1,
  maxHeight: { xs: '80px', md: '120px' }, // Smaller on mobile
  overflowY: 'auto',

  // Mobile-specific scrollbar (thinner)
  '&::-webkit-scrollbar': {
    width: { xs: '2px', md: '4px' }
  }
}

// Responsive tab sizing
const responsiveTabSx = {
  '& .MuiTab-root': {
    py: { xs: 1, md: 1.5 },    // Less padding on mobile
    px: { xs: 2, md: 3 },      // Smaller horizontal padding
    fontSize: { xs: '0.8rem', md: '0.875rem' }
  }
}
```

### Accessibility Enhancements
```javascript
// ARIA labels and keyboard navigation
const accessibleChipProps = {
  role: 'button',
  'aria-pressed': isSelected,
  tabIndex: 0,
  onKeyDown: (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelection();
    }
  }
}

// High contrast mode support
const highContrastSx = {
  '@media (prefers-contrast: high)': {
    borderWidth: '2px',
    '&:focus': {
      outline: '3px solid',
      outlineColor: 'primary.main'
    }
  }
}
```

### Animation and Micro-interactions
```javascript
// Staggered animation for chip lists
const staggeredChipSx = (index) => ({
  animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both`,
  '@keyframes fadeInUp': {
    from: {
      opacity: 0,
      transform: 'translateY(10px)'
    },
    to: {
      opacity: 1,
      transform: 'translateY(0)'
    }
  }
})

// Loading state for interactive elements
const loadingStateSx = {
  opacity: 0.6,
  pointerEvents: 'none',
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '16px',
    height: '16px',
    border: '2px solid transparent',
    borderTop: '2px solid currentColor',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    transform: 'translate(-50%, -50%)'
  }
}
```

### Error and Validation States
```javascript
// Error state styling for filters
const errorStateSx = {
  borderColor: 'error.main',
  bgcolor: 'error.light',
  color: 'error.contrastText',
  '&:hover': {
    bgcolor: 'error.main',
    borderColor: 'error.dark'
  }
}

// Success state for confirmations
const successStateSx = {
  borderColor: 'success.main',
  bgcolor: 'success.light',
  color: 'success.contrastText'
}
```

---

## Component Variations

### Compact Filter Variant
```javascript
// For sidebars or limited space areas
const compactFilterSx = {
  p: 1.5,                  // Reduced padding
  mb: 2,                   // Reduced margin
  '& .MuiChip-root': {
    height: '28px',         // Smaller chip height
    fontSize: '0.75rem',    // Smaller font
    '& .MuiChip-label': {
      px: 1.5               // Reduced horizontal padding
    }
  }
}
```

### Premium/Featured Variant
```javascript
// For highlighting important filters or tabs
const premiumVariantSx = {
  background: 'linear-gradient(135deg, #9b2c2c 0%, #7a2323 100%)',
  boxShadow: '0 4px 15px rgba(155, 44, 44, 0.3)',
  '&:hover': {
    boxShadow: '0 6px 20px rgba(155, 44, 44, 0.4)',
    transform: 'translateY(-1px)'
  }
}
```

### Floating Action Variant
```javascript
// For floating filter panels (like map overlays)
const floatingVariantSx = {
  position: 'absolute',
  top: 16,
  right: 16,
  zIndex: 1000,
  backgroundColor: 'rgba(248, 247, 245, 0.95)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
}
```

---

## Testing and Quality Assurance

### Visual Regression Testing
```javascript
// Key visual states to test
const testStates = [
  'default',      // Initial state
  'hover',        // Mouse hover
  'active',       // Click/press state
  'selected',     // Selected state
  'disabled',     // Disabled state
  'loading',      // Loading state
  'error'         // Error state
]

// Responsive breakpoints to test
const testBreakpoints = [
  'mobile',       // 320px - 767px
  'tablet',       // 768px - 1023px
  'desktop'       // 1024px+
]
```

### Performance Considerations
```javascript
// Optimize for large lists
const virtualizedChipList = {
  // Use react-window for 50+ items
  maxVisibleItems: 50,
  itemHeight: 32,
  overscan: 5
}

// Debounced search for filter inputs
const debouncedSearch = useMemo(
  () => debounce((searchTerm) => {
    // Filter logic here
  }, 300),
  []
)
```

---

## Migration Guide

### Updating Existing Components

#### From Old Dropdown to Chip Filter
```javascript
// Before (old dropdown pattern)
<FormControl fullWidth>
  <InputLabel>Filter by Sport</InputLabel>
  <Select value={filter} onChange={handleChange}>
    <MenuItem value="all">All Sports</MenuItem>
    {/* ... more items */}
  </Select>
</FormControl>

// After (new chip pattern)
<Paper sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: 'grey.50' }}>
  <Box sx={{ mb: 1.5 }}>
    <Typography variant="body2" sx={{ /* header styles */ }}>
      <FilterListIcon sx={{ fontSize: '1.1rem' }} />
      Filter by Sport
    </Typography>
  </Box>
  <Box sx={{ /* chip container styles */ }}>
    {options.map(option => (
      <Chip key={option.id} /* chip props and styles */ />
    ))}
  </Box>
</Paper>
```

#### From Old Tabs to Modern Tabs
```javascript
// Before (old tab pattern)
<Tabs value={tab} onChange={handleChange}>
  <Tab label="Option 1" />
  <Tab label="Option 2" />
</Tabs>

// After (new modern pattern)
<Paper sx={{ mb: 3, borderRadius: 2, p: 1, bgcolor: 'grey.50' }}>
  <Tabs
    value={tab}
    onChange={handleChange}
    sx={{ /* modern tab styles */ }}
  >
    <Tab label="Option 1" />
    <Tab label="Option 2" />
  </Tabs>
</Paper>
```

---

## Troubleshooting Common Issues

### Theme Integration Problems
```javascript
// Issue: Colors not matching theme
// Solution: Always use theme tokens
const correctColorUsage = {
  // ❌ Wrong - hardcoded colors
  color: '#9b2c2c',

  // ✅ Correct - theme tokens
  color: 'primary.main'
}
```

### Performance Issues
```javascript
// Issue: Slow rendering with many chips
// Solution: Virtualization and memoization
const OptimizedChipList = React.memo(({ items, selectedItems }) => {
  const memoizedChips = useMemo(() =>
    items.map(item => (
      <Chip key={item.id} /* props */ />
    )),
    [items, selectedItems]
  )

  return <Box>{memoizedChips}</Box>
})
```

### Accessibility Issues
```javascript
// Issue: Poor keyboard navigation
// Solution: Proper focus management
const handleKeyNavigation = (event, index) => {
  switch (event.key) {
    case 'ArrowRight':
      focusNextChip(index + 1)
      break
    case 'ArrowLeft':
      focusPreviousChip(index - 1)
      break
    case 'Home':
      focusFirstChip()
      break
    case 'End':
      focusLastChip()
      break
  }
}
```

---

## Version History

### v1.0 (July 27, 2025)
- Initial documentation
- Modern tab design patterns
- Chip-based filtering patterns
- Theme integration guidelines
- Reusable code snippets

---

*This style guide should be updated whenever new UI patterns are established or existing patterns are modified. For questions or suggestions, please contact the UI/UX team.*
