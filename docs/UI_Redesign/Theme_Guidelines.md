# Theme Guidelines - Sportea App
*Generated: July 18, 2025*

## Overview

This document establishes comprehensive theming guidelines for the Sportea application, ensuring consistent visual identity and brand presence across all user interfaces.

## Brand Identity

### Core Brand Values
- **Athletic Excellence**: Promoting sports participation and skill development
- **Community Connection**: Fostering relationships among UiTM students
- **Accessibility**: Inclusive design for all users and skill levels
- **Reliability**: Trustworthy platform for sports coordination

### Visual Personality
- **Energetic**: Dynamic, vibrant design that reflects sports enthusiasm
- **Professional**: Clean, organized interface that builds trust
- **Modern**: Contemporary design language that appeals to students
- **Friendly**: Approachable, welcoming user experience

## Color Theme Implementation

### Primary Brand Color (Maroon)
**Hex**: #800020
**Usage**: 
- Primary buttons and CTAs
- Active navigation states
- Brand elements and logos
- Important status indicators
- Focus states and selections

**Implementation**:
```css
:root {
  --primary: 0 100% 25%;           /* HSL: 340° 100% 25% */
  --primary-foreground: 0 0% 98%;  /* White text on primary */
}
```

### Secondary Color Palette

#### Athletic Blue
**Hex**: #1E40AF
**Usage**:
- Secondary actions
- Information states
- Links and navigation
- Complementary accents

#### Success Green
**Hex**: #059669
**Usage**:
- Success messages
- Completed states
- Achievement indicators
- Positive feedback

#### Warning Orange
**Hex**: #D97706
**Usage**:
- Warning messages
- Attention states
- Pending actions
- Caution indicators

#### Error Red
**Hex**: #DC2626
**Usage**:
- Error messages
- Destructive actions
- Failed states
- Critical alerts

### Neutral Color System

#### Light Theme (Default)
```css
:root {
  --background: 0 0% 100%;         /* Pure white */
  --foreground: 222.2 84% 4.9%;    /* Near black text */
  
  --card: 0 0% 100%;               /* White cards */
  --card-foreground: 222.2 84% 4.9%;
  
  --popover: 0 0% 100%;            /* White popovers */
  --popover-foreground: 222.2 84% 4.9%;
  
  --muted: 210 40% 96%;            /* Light gray backgrounds */
  --muted-foreground: 215.4 16.3% 46.9%;
  
  --accent: 210 40% 96%;           /* Subtle accents */
  --accent-foreground: 222.2 84% 4.9%;
  
  --border: 214.3 31.8% 91.4%;     /* Light borders */
  --input: 214.3 31.8% 91.4%;      /* Input borders */
  --ring: 0 100% 25%;              /* Focus rings (maroon) */
}
```

#### Dark Theme (Optional)
```css
[data-theme="dark"] {
  --background: 222.2 84% 4.9%;    /* Dark background */
  --foreground: 210 40% 98%;       /* Light text */
  
  --card: 222.2 84% 4.9%;          /* Dark cards */
  --card-foreground: 210 40% 98%;
  
  --popover: 222.2 84% 4.9%;       /* Dark popovers */
  --popover-foreground: 210 40% 98%;
  
  --muted: 217.2 32.6% 17.5%;      /* Dark gray backgrounds */
  --muted-foreground: 215 20.2% 65.1%;
  
  --accent: 217.2 32.6% 17.5%;     /* Dark accents */
  --accent-foreground: 210 40% 98%;
  
  --border: 217.2 32.6% 17.5%;     /* Dark borders */
  --input: 217.2 32.6% 17.5%;      /* Dark input borders */
  --ring: 0 100% 35%;              /* Lighter focus rings */
}
```

## Typography Theme

### Font Selection
**Primary**: Inter
- Modern, clean sans-serif
- Excellent readability at all sizes
- Sports-appropriate without being overly casual
- Great multilingual support

**Implementation**:
```css
:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

### Type Scale Implementation
```css
:root {
  /* Display sizes */
  --text-display-large: 3rem;      /* 48px */
  --text-display-medium: 2.25rem;  /* 36px */
  --text-display-small: 1.875rem;  /* 30px */
  
  /* Heading sizes */
  --text-heading-1: 1.5rem;        /* 24px */
  --text-heading-2: 1.25rem;       /* 20px */
  --text-heading-3: 1.125rem;      /* 18px */
  --text-heading-4: 1rem;          /* 16px */
  
  /* Body sizes */
  --text-body-large: 1rem;         /* 16px */
  --text-body-medium: 0.875rem;    /* 14px */
  --text-body-small: 0.75rem;      /* 12px */
  
  /* Line heights */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;
}
```

## Component Theming

### Button Themes
```css
/* Primary Button */
.btn-primary {
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border: 1px solid hsl(var(--primary));
}

.btn-primary:hover {
  background-color: hsl(var(--primary) / 0.9);
}

/* Secondary Button */
.btn-secondary {
  background-color: transparent;
  color: hsl(var(--primary));
  border: 1px solid hsl(var(--primary));
}

.btn-secondary:hover {
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}
```

### Card Themes
```css
/* Standard Card */
.card {
  background-color: hsl(var(--card));
  color: hsl(var(--card-foreground));
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
}

/* Featured Card */
.card-featured {
  border-color: hsl(var(--primary));
  border-top: 4px solid hsl(var(--primary));
  box-shadow: 0 4px 6px -1px rgb(128 0 32 / 0.1);
}
```

### Form Themes
```css
/* Input Fields */
.input {
  background-color: hsl(var(--background));
  border: 1px solid hsl(var(--input));
  color: hsl(var(--foreground));
}

.input:focus {
  border-color: hsl(var(--ring));
  box-shadow: 0 0 0 3px hsl(var(--ring) / 0.2);
}

/* Labels */
.label {
  color: hsl(var(--foreground));
  font-weight: 500;
}
```

## Sports-Specific Theming

### Sport Color Associations
```css
:root {
  --sport-basketball: 255 140 0;    /* Orange */
  --sport-football: 0 128 0;        /* Green */
  --sport-badminton: 255 215 0;     /* Gold */
  --sport-tennis: 50 205 50;        /* Lime green */
  --sport-volleyball: 30 144 255;   /* Dodger blue */
  --sport-futsal: 255 69 0;         /* Red orange */
  --sport-squash: 138 43 226;       /* Blue violet */
}
```

### Achievement Themes
```css
:root {
  --achievement-bronze: 205 127 50;  /* Bronze */
  --achievement-silver: 192 192 192; /* Silver */
  --achievement-gold: 255 215 0;     /* Gold */
  --achievement-platinum: 229 228 226; /* Platinum */
  --achievement-diamond: 185 242 255; /* Diamond */
}
```

## Responsive Theme Adjustments

### Mobile Theme Considerations
- Larger touch targets (minimum 44px)
- Increased contrast for outdoor viewing
- Simplified color schemes for smaller screens
- Optimized font sizes for readability

### Tablet Theme Considerations
- Balanced spacing for medium screens
- Adaptive layouts that work in both orientations
- Touch-friendly interactions with hover alternatives

### Desktop Theme Considerations
- Rich hover states and micro-interactions
- Detailed information density
- Keyboard navigation support
- Multi-column layouts

## Accessibility Theme Requirements

### Color Contrast Standards
- **Normal text**: Minimum 4.5:1 contrast ratio
- **Large text**: Minimum 3:1 contrast ratio
- **Interactive elements**: Clear visual distinction
- **Focus indicators**: High contrast, visible borders

### Color Independence
- Information not conveyed by color alone
- Pattern or text alternatives for color-coded content
- Sufficient contrast in all color combinations

### Motion and Animation
- Respect `prefers-reduced-motion` settings
- Subtle, purposeful animations
- No flashing or strobing effects

## Theme Customization

### CSS Custom Properties
All theme values use CSS custom properties for easy customization:

```css
/* Override primary color */
:root {
  --primary: 220 100% 50%; /* Blue instead of maroon */
}

/* Override spacing */
:root {
  --spacing-unit: 8px; /* 8px base instead of 4px */
}
```

### Component Variants
Create theme variants for special use cases:

```css
/* High contrast theme */
[data-theme="high-contrast"] {
  --foreground: 0 0% 0%;
  --background: 0 0% 100%;
  --border: 0 0% 0%;
}

/* Sports event theme */
[data-theme="event"] {
  --primary: var(--achievement-gold);
  --accent: var(--sport-basketball);
}
```

## Implementation Best Practices

### 1. Consistent Application
- Use theme variables consistently across all components
- Avoid hardcoded color values
- Test theme changes across all components

### 2. Performance Considerations
- Minimize CSS custom property usage in animations
- Use efficient selectors for theme switching
- Optimize for paint and layout performance

### 3. Maintenance
- Document all theme customizations
- Test accessibility with each theme variant
- Validate color combinations regularly

### 4. Future-Proofing
- Design themes to be extensible
- Plan for additional color schemes
- Consider internationalization needs

---

*These guidelines ensure consistent, accessible, and maintainable theming across the entire Sportea application.*
