# Design System Specification - Sportea App
*Generated: July 18, 2025*

## Overview

This specification defines the comprehensive design system for the Sportea application, establishing consistent visual language, component standards, and interaction patterns to replace the current inconsistent UI.

## Design Principles

### 1. Sports-Focused Identity
- **Athletic Energy**: Dynamic, energetic visual elements that reflect sports culture
- **Team Spirit**: Collaborative and community-focused design language
- **Performance**: Clean, efficient interfaces that support quick actions
- **Accessibility**: Inclusive design for all skill levels and abilities

### 2. Professional Polish
- **Consistency**: Unified visual language across all touchpoints
- **Clarity**: Clear information hierarchy and intuitive navigation
- **Confidence**: Trustworthy, reliable interface that builds user confidence
- **Modern**: Contemporary design that feels current and engaging

## Color System

### Primary Colors
```
Maroon (Primary Brand)
- Primary: #800020 (Main brand color)
- Primary Light: #A0002A (Hover states, lighter accents)
- Primary Dark: #600018 (Active states, emphasis)
- Primary Muted: #80002033 (Backgrounds, subtle accents)
```

### Secondary Colors
```
Athletic Blue
- Secondary: #1E40AF (Complementary to maroon)
- Secondary Light: #3B82F6 (Information, links)
- Secondary Dark: #1E3A8A (Active states)

Success Green
- Success: #059669 (Success states, achievements)
- Success Light: #10B981 (Positive feedback)
- Success Dark: #047857 (Confirmation actions)

Warning Orange
- Warning: #D97706 (Warnings, attention)
- Warning Light: #F59E0B (Caution states)
- Warning Dark: #B45309 (Alert actions)

Error Red
- Error: #DC2626 (Errors, destructive actions)
- Error Light: #EF4444 (Error feedback)
- Error Dark: #B91C1C (Critical alerts)
```

### Neutral Colors
```
Gray Scale
- Gray 50: #F9FAFB (Lightest backgrounds)
- Gray 100: #F3F4F6 (Card backgrounds)
- Gray 200: #E5E7EB (Borders, dividers)
- Gray 300: #D1D5DB (Disabled states)
- Gray 400: #9CA3AF (Placeholder text)
- Gray 500: #6B7280 (Secondary text)
- Gray 600: #4B5563 (Primary text)
- Gray 700: #374151 (Headings)
- Gray 800: #1F2937 (Dark backgrounds)
- Gray 900: #111827 (Darkest text)
```

## Typography System

### Font Family
```
Primary: Inter (Modern, readable, sports-appropriate)
Fallback: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
```

### Type Scale
```
Display Large: 48px / 56px (Hero headings)
Display Medium: 36px / 44px (Page titles)
Display Small: 30px / 36px (Section headers)

Heading 1: 24px / 32px (Main headings)
Heading 2: 20px / 28px (Sub headings)
Heading 3: 18px / 24px (Component titles)
Heading 4: 16px / 24px (Card titles)

Body Large: 16px / 24px (Primary body text)
Body Medium: 14px / 20px (Secondary text)
Body Small: 12px / 16px (Captions, labels)

Label Large: 14px / 20px (Form labels)
Label Medium: 12px / 16px (Button text)
Label Small: 11px / 16px (Badges, tags)
```

### Font Weights
```
Light: 300 (Subtle text)
Regular: 400 (Body text)
Medium: 500 (Emphasis)
Semibold: 600 (Headings)
Bold: 700 (Strong emphasis)
```

## Spacing System

### Base Unit: 4px
```
Space 1: 4px (Tight spacing)
Space 2: 8px (Small gaps)
Space 3: 12px (Medium gaps)
Space 4: 16px (Standard spacing)
Space 5: 20px (Large gaps)
Space 6: 24px (Section spacing)
Space 8: 32px (Large sections)
Space 10: 40px (Page sections)
Space 12: 48px (Major sections)
Space 16: 64px (Page margins)
Space 20: 80px (Large margins)
Space 24: 96px (Extra large margins)
```

### Component Spacing
```
Button Padding: 12px 16px (Medium), 8px 12px (Small), 16px 24px (Large)
Card Padding: 16px (Standard), 24px (Large cards)
Form Spacing: 16px (Between fields), 8px (Label to input)
Section Gaps: 32px (Between major sections)
```

## Component Standards

### Buttons

#### Primary Button
- **Background**: Maroon Primary
- **Text**: White
- **Border**: None
- **Border Radius**: 6px
- **Padding**: 12px 16px
- **Font**: Medium 14px
- **Hover**: Maroon Primary Light
- **Active**: Maroon Primary Dark
- **Disabled**: Gray 300 background, Gray 400 text

#### Secondary Button
- **Background**: Transparent
- **Text**: Maroon Primary
- **Border**: 1px solid Maroon Primary
- **Border Radius**: 6px
- **Padding**: 12px 16px
- **Font**: Medium 14px
- **Hover**: Maroon Primary background, White text
- **Active**: Maroon Primary Dark background

#### Ghost Button
- **Background**: Transparent
- **Text**: Gray 600
- **Border**: None
- **Padding**: 12px 16px
- **Hover**: Gray 100 background
- **Active**: Gray 200 background

### Cards

#### Standard Card
- **Background**: White
- **Border**: 1px solid Gray 200
- **Border Radius**: 8px
- **Padding**: 16px
- **Shadow**: 0 1px 3px rgba(0, 0, 0, 0.1)
- **Hover**: 0 4px 6px rgba(0, 0, 0, 0.1)

#### Featured Card
- **Background**: White
- **Border**: 1px solid Maroon Primary
- **Border Radius**: 8px
- **Padding**: 20px
- **Shadow**: 0 4px 6px rgba(128, 0, 32, 0.1)
- **Accent**: Maroon gradient top border (4px)

#### User Card
- **Background**: White
- **Border**: 1px solid Gray 200
- **Border Radius**: 8px
- **Padding**: 12px
- **Layout**: Avatar + Content + Actions
- **Hover**: Gray 50 background

### Forms

#### Input Fields
- **Background**: White
- **Border**: 1px solid Gray 300
- **Border Radius**: 6px
- **Padding**: 8px 12px
- **Font**: Regular 14px
- **Focus**: Maroon Primary border, 0 0 0 3px Maroon Primary Muted
- **Error**: Error Red border
- **Disabled**: Gray 100 background, Gray 400 text

#### Labels
- **Font**: Medium 14px
- **Color**: Gray 700
- **Margin**: 0 0 4px 0

#### Helper Text
- **Font**: Regular 12px
- **Color**: Gray 500
- **Margin**: 4px 0 0 0

### Navigation

#### Sidebar Navigation
- **Background**: Gray 800
- **Width**: 240px
- **Item Padding**: 12px 16px
- **Item Font**: Medium 14px
- **Item Color**: Gray 300
- **Active Item**: Maroon Primary background, White text
- **Hover**: Gray 700 background

#### Tabs
- **Background**: Transparent
- **Border Bottom**: 2px solid Gray 200
- **Active Border**: 2px solid Maroon Primary
- **Padding**: 12px 16px
- **Font**: Medium 14px
- **Color**: Gray 600
- **Active Color**: Maroon Primary

## Interaction Patterns

### Hover States
- **Buttons**: Background color change + subtle scale (1.02x)
- **Cards**: Shadow elevation increase
- **Links**: Color change + underline
- **Icons**: Color change + subtle scale

### Focus States
- **Interactive Elements**: 3px solid focus ring in Maroon Primary Muted
- **Keyboard Navigation**: Clear focus indicators
- **Skip Links**: Available for accessibility

### Loading States
- **Buttons**: Spinner + disabled state
- **Cards**: Skeleton loading
- **Lists**: Progressive loading with placeholders
- **Images**: Blur-to-clear loading

### Error States
- **Forms**: Red border + error message
- **Pages**: Error card with retry action
- **Network**: Connection status indicator
- **Validation**: Inline error messages

## Responsive Design

### Breakpoints
```
Mobile: 320px - 767px
Tablet: 768px - 1023px
Desktop: 1024px - 1439px
Large Desktop: 1440px+
```

### Layout Patterns
- **Mobile**: Single column, stacked navigation
- **Tablet**: Two column where appropriate, collapsible sidebar
- **Desktop**: Multi-column layouts, persistent sidebar
- **Large Desktop**: Wider containers, more whitespace

## Accessibility Standards

### Color Contrast
- **Text on Background**: Minimum 4.5:1 ratio
- **Large Text**: Minimum 3:1 ratio
- **Interactive Elements**: Clear visual distinction

### Keyboard Navigation
- **Tab Order**: Logical, predictable flow
- **Focus Indicators**: Visible, high contrast
- **Shortcuts**: Common keyboard shortcuts supported

### Screen Readers
- **Semantic HTML**: Proper heading hierarchy
- **ARIA Labels**: Descriptive labels for complex interactions
- **Alt Text**: Meaningful descriptions for images

## Animation Guidelines

### Timing
- **Micro Interactions**: 150-200ms
- **Page Transitions**: 300-400ms
- **Loading States**: Continuous, smooth

### Easing
- **Standard**: cubic-bezier(0.4, 0.0, 0.2, 1)
- **Decelerate**: cubic-bezier(0.0, 0.0, 0.2, 1)
- **Accelerate**: cubic-bezier(0.4, 0.0, 1, 1)

### Principles
- **Purposeful**: Animations should enhance understanding
- **Subtle**: Not distracting from content
- **Consistent**: Same timing and easing across similar interactions

## Implementation Guidelines

### Component Library
- **Base Components**: Built with shadcn/ui foundation
- **Custom Components**: Extended for sports-specific needs
- **Composition**: Components designed for reusability

### Design Tokens
- **Colors**: CSS custom properties for easy theming
- **Spacing**: Consistent spacing scale
- **Typography**: Systematic font sizing and weights

### Documentation
- **Component Docs**: Usage guidelines and examples
- **Design Tokens**: Reference for developers
- **Patterns**: Common UI patterns and implementations

---

*This specification serves as the foundation for implementing a consistent, professional design system across the Sportea application.*
