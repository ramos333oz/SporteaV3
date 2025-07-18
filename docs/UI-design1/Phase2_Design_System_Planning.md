# Phase 2: Design System Planning - Sportea Web Application

## Overview
This document outlines the comprehensive plan for implementing a unified design system based on the Mural-inspired specifications from design.json, using shadcn/ui as the foundation component library.

## Design System Specifications Analysis

### Target Design System: Mural-Inspired
**Key Characteristics:**
- **Primary Brand Color**: #FF4757 (Red/Pink)
- **Typography**: Inter font family
- **Border Radius**: 8px-16px consistently
- **Shadows**: Subtle depth with card shadows
- **Spacing**: 8px grid system (4px, 8px, 16px, 24px, 32px, 48px, 64px, 96px)
- **Component Style**: Clean, minimal with purposeful white space

### Color Palette Implementation
```css
/* Primary Colors */
--primary: #FF4757 (Brand Red)
--primary-dark: #E63946
--primary-light: #FF6B7A

/* Secondary Colors */
--secondary-blue: #4A90E2
--secondary-green: #2ECC71
--secondary-purple: #9B59B6

/* Neutrals */
--gray-50: #F8F9FA
--gray-100: #F1F3F4
--gray-200: #E8EAED
--gray-300: #DADCE0
--gray-400: #BDC1C6
--gray-500: #9AA0A6
--gray-600: #80868B
--gray-700: #5F6368
--gray-800: #3C4043
--gray-900: #202124
```

## shadcn/ui Component Mapping

### Core Components Needed
1. **Button** ✅ - Already analyzed, needs customization for Sportea variants
2. **Card** ✅ - Perfect for match cards, sport cards, profile sections
3. **Sidebar** ✅ - Modern replacement for current MUI-based navigation
4. **Input** - For search, forms, and filters
5. **Tabs** - For navigation within pages (Find, Profile, Host)
6. **Badge** - For sport types, skill levels, status indicators
7. **Avatar** - User profile pictures and sport icons
8. **Progress** - XP bars, match capacity indicators
9. **Dialog** - Modals for match details, confirmations
10. **Select** - Dropdowns for filters and preferences

### Additional Components for Sportea
11. **Alert** - Notifications and status messages
12. **Skeleton** - Loading states
13. **Tooltip** - Helpful information on hover
14. **Separator** - Visual dividers
15. **Sheet** - Mobile-friendly overlays

## Component Migration Strategy

### Phase 2A: Foundation Setup
**Tasks:**
1. **Update Tailwind Configuration**
   - Implement design.json color tokens
   - Add Inter font family
   - Configure spacing scale (8px grid)
   - Set up border radius tokens

2. **Install Required shadcn/ui Components**
   ```bash
   npx shadcn@latest add button card sidebar input tabs badge avatar progress dialog select alert skeleton tooltip separator sheet
   ```

3. **Create Sportea Design Tokens**
   - Extend shadcn/ui CSS variables
   - Add sport-specific colors
   - Define component-specific tokens

### Phase 2B: Core Component Development
**Priority Order:**
1. **SporteaButton Enhancement**
   - Extend existing SporteaButton with design.json specs
   - Add new variants: athletic, success, warning, danger
   - Implement proper hover animations

2. **SporteaCard System**
   - Replace multiple card variants with unified system
   - Match card, sport card, profile card variants
   - Consistent padding, shadows, and border radius

3. **SporteaSidebar**
   - Replace MUI-based navigation
   - Implement collapsible sidebar
   - Add proper active states and icons

### Phase 2C: Page-Specific Components
**Home Page Components:**
- LiveMatchBoard redesign
- RecommendationsList cards
- Popular sports grid

**Find Page Components:**
- Search input with filters
- Match listing cards
- Tab navigation system

**Profile Page Components:**
- Profile header card
- Stats and preferences sections
- Achievement badges

**Host Page Components:**
- Match management cards
- Action buttons
- Status indicators

## Design Token Implementation

### CSS Variables Structure
```css
:root {
  /* Mural-Inspired Brand Colors */
  --brand-primary: #FF4757;
  --brand-primary-dark: #E63946;
  --brand-primary-light: #FF6B7A;
  
  /* shadcn/ui Integration */
  --primary: var(--brand-primary);
  --primary-foreground: #FFFFFF;
  
  /* Component Tokens */
  --card-radius: 12px;
  --button-radius: 8px;
  --input-radius: 8px;
  
  /* Spacing Scale (8px grid) */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;
  --spacing-3xl: 64px;
  --spacing-4xl: 96px;
  
  /* Typography */
  --font-family-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  
  /* Shadows */
  --shadow-card: 0 2px 8px rgba(0, 0, 0, 0.12);
  --shadow-hover: 0 4px 16px rgba(0, 0, 0, 0.15);
}
```

### Typography System
```css
/* Font Sizes (design.json) */
--text-xs: 12px;
--text-sm: 14px;
--text-base: 16px;
--text-lg: 18px;
--text-xl: 20px;
--text-2xl: 24px;
--text-3xl: 32px;
--text-4xl: 40px;

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

## Component Specifications

### SporteaButton (Enhanced)
```typescript
// Variants based on design.json
variants: {
  variant: {
    primary: "bg-brand-primary hover:bg-brand-primary-dark",
    secondary: "border border-gray-300 hover:bg-gray-50",
    athletic: "bg-gradient-to-r from-brand-primary to-brand-primary-light",
    success: "bg-secondary-green hover:bg-secondary-green/90",
    warning: "bg-orange-500 hover:bg-orange-600",
    danger: "bg-red-500 hover:bg-red-600"
  },
  size: {
    sm: "h-8 px-3 text-sm",
    default: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base"
  }
}
```

### SporteaCard System
```typescript
// Card variants for different use cases
variants: {
  variant: {
    default: "bg-white border border-gray-200 shadow-card",
    match: "bg-white border border-gray-200 shadow-card hover:shadow-hover",
    sport: "bg-white border border-gray-200 shadow-card cursor-pointer",
    profile: "bg-white border border-gray-200 shadow-card"
  },
  size: {
    sm: "p-4",
    default: "p-6",
    lg: "p-8"
  }
}
```

## Migration Roadmap

### Week 1: Foundation
- [ ] Update Tailwind config with design.json tokens
- [ ] Install and configure shadcn/ui components
- [ ] Create base design token system
- [ ] Set up Inter font family

### Week 2: Core Components
- [ ] Enhance SporteaButton with new variants
- [ ] Create unified SporteaCard system
- [ ] Implement SporteaSidebar
- [ ] Create SporteaInput components

### Week 3: Page Components
- [ ] Migrate Home page components
- [ ] Migrate Find page components
- [ ] Migrate Host page components
- [ ] Migrate Profile page components

### Week 4: Polish & Testing
- [ ] Implement hover animations
- [ ] Add loading states and skeletons
- [ ] Test responsive behavior
- [ ] Performance optimization

## Quality Assurance Checklist

### Design Consistency
- [ ] All components use design.json color palette
- [ ] Consistent border radius (8px-16px)
- [ ] Proper spacing using 8px grid
- [ ] Inter font family applied
- [ ] Consistent shadow system

### Component Standards
- [ ] All buttons use SporteaButton variants
- [ ] All cards use SporteaCard system
- [ ] Consistent input styling
- [ ] Proper hover states
- [ ] Accessible focus states

### Performance
- [ ] No unused MUI components
- [ ] Optimized bundle size
- [ ] Fast loading times
- [ ] Smooth animations

## Next Steps
1. Begin Phase 2A: Foundation Setup
2. Create detailed component specifications
3. Start migration with core components
4. Test each component thoroughly before proceeding

This plan ensures a systematic approach to creating a consistent, modern design system that aligns with the Mural-inspired specifications while maintaining all existing functionality.
