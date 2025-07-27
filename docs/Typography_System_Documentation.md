# **🎨 Sportea Typography & Design System Documentation**

## **Overview**
This document defines the comprehensive design system for the Sportea application, including typography, colors, shadows, and spacing. The system uses CSS custom properties (variables) for consistent theming across all components while maintaining the "Elegant Luxury" aesthetic with full dark/light mode support.

## **Design System Architecture**

### **CSS Custom Properties Approach**
The design system is built on CSS custom properties defined in `:root` and `.dark` selectors, providing:
- **Semantic color naming** for consistent usage
- **Automatic dark/light mode switching**
- **Centralized design token management**
- **Easy theme customization and maintenance**

### **Font System (3 Font Families)**

#### **1. Libre Baskerville (Serif) - Headings & Titles**
- **CSS Variable**: `var(--font-serif)`
- **Usage**: Page titles, user names, card headers, important headings (h1-h6)
- **Characteristics**: Elegant, sophisticated, readable serif font
- **Weights**: 400 (regular), 700 (bold)
- **Google Fonts**: `'Libre Baskerville', serif`

#### **2. Poppins (Sans-serif) - Body Text & UI Elements**
- **CSS Variable**: `var(--font-sans)`
- **Usage**: Body text, captions, labels, buttons, navigation, form inputs
- **Characteristics**: Modern, clean, highly readable sans-serif
- **Weights**: 300 (light), 400 (regular), 500 (medium), 600 (semi-bold), 700 (bold)
- **Google Fonts**: `'Poppins', sans-serif`

#### **3. IBM Plex Mono (Monospace) - Code & Technical Elements**
- **CSS Variable**: `var(--font-mono)`
- **Usage**: Code snippets, technical data, IDs, timestamps
- **Characteristics**: Professional monospace font with excellent readability
- **Weights**: 400 (regular), 500 (medium), 600 (semi-bold)
- **Google Fonts**: `'IBM Plex Mono', monospace`

## **Color System**

### **Semantic Color Variables**
```css
/* Light Mode Colors */
:root {
  --background: #faf7f5;        /* Main background */
  --foreground: #1a1a1a;        /* Main text color */
  --primary: #9b2c2c;           /* Primary brand color */
  --primary-foreground: #ffffff; /* Text on primary */
  --secondary: #fdf2d6;         /* Secondary background */
  --secondary-foreground: #805500; /* Text on secondary */
  --muted: #f0ebe8;             /* Muted background */
  --muted-foreground: #57534e;   /* Muted text */
  --accent: #fef3c7;            /* Accent background */
  --accent-foreground: #7f1d1d;  /* Text on accent */
  --destructive: #991b1b;       /* Error/danger color */
  --destructive-foreground: #ffffff; /* Text on destructive */
  --border: #f5e8d2;            /* Border color */
  --input: #f5e8d2;             /* Input background */
  --ring: #9b2c2c;              /* Focus ring color */
}

/* Dark Mode Colors */
.dark {
  --background: #1c1917;
  --foreground: #f5f5f4;
  --primary: #b91c1c;
  --primary-foreground: #faf7f5;
  --secondary: #92400e;
  --secondary-foreground: #fef3c7;
  --muted: #292524;
  --muted-foreground: #d6d3d1;
  --accent: #b45309;
  --accent-foreground: #fef3c7;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --border: #44403c;
  --input: #44403c;
  --ring: #b91c1c;
}
```

## **Typography Scale & Material-UI Integration**

### **Headings (Libre Baskerville - var(--font-serif))**
```css
h1: {
  fontFamily: 'var(--font-serif)',
  fontSize: '2rem',      // 32px
  fontWeight: 700,
  lineHeight: 1.2,
  letterSpacing: '-0.02em'
}

h2: {
  fontFamily: 'var(--font-serif)',
  fontSize: '1.75rem',   // 28px
  fontWeight: 700,
  lineHeight: 1.3,
  letterSpacing: '-0.01em'
}

h3: {
  fontFamily: 'var(--font-serif)',
  fontSize: '1.5rem',    // 24px
  fontWeight: 600,
  lineHeight: 1.3,
  letterSpacing: '0'
}

h4: {
  fontFamily: 'var(--font-serif)',
  fontSize: '1.25rem',   // 20px
  fontWeight: 600,
  lineHeight: 1.4,
  letterSpacing: '0'
}

h5: {
  fontFamily: 'var(--font-serif)',
  fontSize: '1.125rem',  // 18px
  fontWeight: 600,
  lineHeight: 1.4,
  letterSpacing: '0'
}

h6: {
  fontFamily: 'var(--font-serif)',
  fontSize: '1rem',      // 16px
  fontWeight: 600,
  lineHeight: 1.4,
  letterSpacing: '0'
}
```

### **Body Text (Poppins - var(--font-sans))**
```css
body1: {
  fontFamily: 'var(--font-sans)',
  fontSize: '1rem',      // 16px
  fontWeight: 400,
  lineHeight: 1.5,
  letterSpacing: '0'
}

body2: {
  fontFamily: 'var(--font-sans)',
  fontSize: '0.875rem',  // 14px
  fontWeight: 400,
  lineHeight: 1.43,
  letterSpacing: '0.01em'
}

caption: {
  fontFamily: 'var(--font-sans)',
  fontSize: '0.75rem',   // 12px
  fontWeight: 500,
  lineHeight: 1.33,
  letterSpacing: '0.03em'
}
```

### **UI Elements (Poppins - var(--font-sans))**
```css
button: {
  fontFamily: 'var(--font-sans)',
  fontSize: '0.875rem',  // 14px
  fontWeight: 500,
  lineHeight: 1.43,
  letterSpacing: '0.02em',
  textTransform: 'none'
}

subtitle1: {
  fontFamily: 'var(--font-sans)',
  fontSize: '1rem',      // 16px
  fontWeight: 500,
  lineHeight: 1.5,
  letterSpacing: '0.01em'
}

subtitle2: {
  fontFamily: 'var(--font-sans)',
  fontSize: '0.875rem',  // 14px
  fontWeight: 600,
  lineHeight: 1.43,
  letterSpacing: '0.01em'
}
```

### **Technical Elements (IBM Plex Mono - var(--font-mono))**
```css
overline: {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.75rem',   // 12px
  fontWeight: 400,
  lineHeight: 1.33,
  letterSpacing: '0.08em',
  textTransform: 'uppercase'
}
```

## **Shadow & Spacing System**

### **Shadow Variables**
```css
:root {
  --shadow-2xs: 1px 1px 16px -2px hsl(0 63% 18% / 0.06);
  --shadow-xs: 1px 1px 16px -2px hsl(0 63% 18% / 0.06);
  --shadow-sm: 1px 1px 16px -2px hsl(0 63% 18% / 0.12), 1px 1px 2px -3px hsl(0 63% 18% / 0.12);
  --shadow: 1px 1px 16px -2px hsl(0 63% 18% / 0.12), 1px 1px 2px -3px hsl(0 63% 18% / 0.12);
  --shadow-md: 1px 1px 16px -2px hsl(0 63% 18% / 0.12), 1px 2px 4px -3px hsl(0 63% 18% / 0.12);
  --shadow-lg: 1px 1px 16px -2px hsl(0 63% 18% / 0.12), 1px 4px 6px -3px hsl(0 63% 18% / 0.12);
  --shadow-xl: 1px 1px 16px -2px hsl(0 63% 18% / 0.12), 1px 8px 10px -3px hsl(0 63% 18% / 0.12);
  --shadow-2xl: 1px 1px 16px -2px hsl(0 63% 18% / 0.30);
}
```

### **Spacing & Layout Variables**
```css
:root {
  --radius: 0.375rem;           /* Border radius */
  --spacing: 0.25rem;           /* Base spacing unit */
  --tracking-normal: 0em;       /* Letter spacing */
}
```

## **Component-Specific Guidelines**

### **User Cards (InstagramStyleUserCard & FindPlayers)**
- **User Names**: `Typography variant="h6"` (Libre Baskerville, 1rem, weight 600)
- **Usernames (@)**: `Typography variant="body2"` (Poppins, 0.875rem, weight 400)
- **Details (Faculty, Sports)**: `Typography variant="body2"` (Poppins, 0.875rem, weight 400)
- **Buttons**: `Button` component (Poppins, 0.875rem, weight 500)

### **Navigation & Headers**
- **Page Titles**: `Typography variant="h1"` (Libre Baskerville, h1 scale)
- **Section Headers**: `Typography variant="h2-h4"` (Libre Baskerville, h2-h4 scale)
- **Navigation Items**: `Button` component (Poppins, button scale)

### **Forms & Inputs**
- **Labels**: `Typography variant="subtitle2"` (Poppins, subtitle2 scale)
- **Input Text**: `Typography variant="body1"` (Poppins, body1 scale)
- **Helper Text**: `Typography variant="caption"` (Poppins, caption scale)

### **Cards & Containers**
- **Background**: `var(--card)` with `var(--card-foreground)` text
- **Borders**: `var(--border)` color
- **Shadows**: Use appropriate `var(--shadow-*)` based on elevation

## **Implementation Strategy**

### **Phase 1: CSS Variables Foundation**
1. ✅ **CSS Custom Properties**: Defined in `src/index.css` with light/dark mode support
2. ✅ **Font Loading**: Google Fonts imported with display=swap optimization
3. ✅ **Material-UI Integration**: Theme configured to use CSS variables

### **Phase 2: Component Standardization**
1. **Typography Components**: Ensure all text uses Material-UI Typography variants
2. **Color Usage**: Replace hardcoded colors with CSS custom properties
3. **Shadow & Spacing**: Apply consistent shadow and spacing variables

### **Phase 3: Application-Wide Consistency**
1. **Component Audit**: Review all components for typography consistency
2. **Theme Integration**: Ensure all components inherit from centralized theme
3. **Dark Mode Testing**: Verify proper dark/light mode switching

### **Phase 4: Performance & Accessibility**
1. **Font Optimization**: Optimize font loading and subset usage
2. **Accessibility Compliance**: Ensure WCAG AA standards
3. **Performance Monitoring**: Monitor font loading performance

## **Usage Guidelines**

### **CSS Custom Properties Usage**
```css
/* Correct: Use semantic color variables */
.my-component {
  background-color: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-md);
}

/* Correct: Use font variables */
.heading {
  font-family: var(--font-serif);
}

.body-text {
  font-family: var(--font-sans);
}

.code-block {
  font-family: var(--font-mono);
}
```

### **Material-UI Typography Usage**
```jsx
// Correct: Use Typography variants
<Typography variant="h1">Page Title</Typography>
<Typography variant="h6">User Name</Typography>
<Typography variant="body1">Main content</Typography>
<Typography variant="caption">Small details</Typography>

// Correct: Button inherits theme typography
<Button variant="contained">Action Button</Button>
```

## **Accessibility & Performance Standards**

### **Accessibility Requirements**
- **Minimum font size**: 12px (0.75rem) - caption variant
- **Line height**: Minimum 1.2 for headings, 1.4+ for body text
- **Contrast ratios**: WCAG AA standards maintained in both light/dark modes
- **Font weights**: 400+ for body text, 600+ for emphasis
- **Focus indicators**: Use `var(--ring)` for focus states

### **Performance Optimization**
- ✅ **Google Fonts**: Loaded with `display=swap` for better performance
- ✅ **Font Fallbacks**: System fonts maintained as fallbacks
- ✅ **CSS Variables**: Efficient theme switching without JavaScript
- ✅ **Subset Loading**: Only required character sets loaded

## **Implementation Status & File Structure**

### **Core Files**

#### **1. src/index.css (Lines 1-98)**
- ✅ **CSS Custom Properties**: Complete light/dark mode variable system
- ✅ **Font Variables**: `--font-sans`, `--font-serif`, `--font-mono` defined
- ✅ **Color System**: Semantic color variables for consistent theming
- ✅ **Shadow System**: Comprehensive shadow scale with HSL values
- ✅ **Google Fonts**: Optimized loading with display=swap

#### **2. src/App.jsx (Lines 93-199)**
- ✅ **Material-UI Integration**: Theme configured to use CSS variables
- ✅ **Typography Scale**: Complete h1-h6, body, subtitle, button variants
- ✅ **Font Family Mapping**: CSS variables properly referenced
- ✅ **Consistent Sizing**: Standardized font sizes and line heights

### **Design System Architecture**

#### **Current Implementation**
```css
/* CSS Variables Foundation */
:root {
  /* Colors */
  --background: #faf7f5;
  --foreground: #1a1a1a;
  --primary: #9b2c2c;

  /* Typography */
  --font-sans: Poppins, sans-serif;
  --font-serif: Libre Baskerville, serif;
  --font-mono: IBM Plex Mono, monospace;

  /* Shadows & Spacing */
  --shadow-md: 1px 1px 16px -2px hsl(0 63% 18% / 0.12);
  --radius: 0.375rem;
  --spacing: 0.25rem;
}

/* Material-UI Theme Integration */
typography: {
  fontFamily: 'var(--font-sans)',
  h1: { fontFamily: 'var(--font-serif)' },
  h2: { fontFamily: 'var(--font-serif)' },
  // ... complete typography scale
}
```

## **Development Guidelines**

### **Best Practices**

#### **✅ Do's**
- **Use CSS Variables**: Always use `var(--*)` for colors, fonts, and spacing
- **Material-UI Typography**: Use Typography variants (h1-h6, body1, body2, caption)
- **Semantic Colors**: Use semantic variables (`--primary`, `--background`) not specific colors
- **Theme Inheritance**: Let components inherit from centralized theme
- **Consistent Variants**: Use h6 for user names, body2 for details, caption for small text

#### **❌ Don'ts**
- **No Manual Overrides**: Don't add manual fontFamily or color overrides
- **No Inline Styles**: Avoid inline font or color styles
- **No Hardcoded Values**: Don't use hardcoded colors or font families
- **No Theme Bypassing**: Don't override theme typography without justification

### **Component Implementation Examples**

#### **User Card Component**
```jsx
// Correct Implementation
<Card sx={{ backgroundColor: 'var(--card)', color: 'var(--card-foreground)' }}>
  <Typography variant="h6">{userName}</Typography>
  <Typography variant="body2" color="var(--muted-foreground)">
    {userDetails}
  </Typography>
  <Button variant="contained" sx={{ backgroundColor: 'var(--primary)' }}>
    Connect
  </Button>
</Card>
```

#### **Page Header Component**
```jsx
// Correct Implementation
<Box sx={{ backgroundColor: 'var(--background)' }}>
  <Typography variant="h1" sx={{ color: 'var(--foreground)' }}>
    Page Title
  </Typography>
  <Typography variant="h4" sx={{ color: 'var(--muted-foreground)' }}>
    Subtitle
  </Typography>
</Box>
```

## **Testing & Verification Checklist**

### **Typography Consistency**
- [ ] All headings use Libre Baskerville (var(--font-serif))
- [ ] All body text uses Poppins (var(--font-sans))
- [ ] All technical elements use IBM Plex Mono (var(--font-mono))
- [ ] No manual font family overrides exist

### **Color System**
- [ ] All components use CSS custom properties
- [ ] Dark mode switching works correctly
- [ ] Semantic color usage is consistent
- [ ] No hardcoded color values exist

### **Accessibility & Performance**
- [ ] Minimum 12px font size maintained
- [ ] WCAG AA contrast ratios met
- [ ] Font loading optimized with display=swap
- [ ] System font fallbacks working

### **Component Integration**
- [ ] Material-UI theme properly configured
- [ ] All Typography variants working correctly
- [ ] Button components inherit theme typography
- [ ] Form elements use consistent styling
