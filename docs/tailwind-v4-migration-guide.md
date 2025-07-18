# Tailwind CSS v4 Migration Guide - Sportea

## 🎯 Migration Strategy

**Approach**: Gradual, safe migration with rollback capability

## Phase 1: Preparation

### 1.1 Install v4 Dependencies
```bash
# Install Tailwind v4 (when ready to migrate)
npm install tailwindcss@next @tailwindcss/vite@next

# Remove v3 dependencies
npm uninstall postcss autoprefixer
```

### 1.2 Update Configuration Files

#### Vite Configuration (vite.config.js)
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(), // ✅ v4 Vite plugin
    react()
  ],
  // ... rest of config
})
```

#### CSS Import Changes (src/index.css)
```css
/* ❌ v3 Directives */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ✅ v4 Import */
@import "tailwindcss";
```

### 1.3 Configuration Migration

#### From tailwind.config.js to CSS
```css
/* ✅ v4 CSS Configuration */
@theme {
  /* Fonts */
  --font-sans: 'Poppins', 'Inter', system-ui, sans-serif;
  --font-serif: 'Libre Baskerville', 'Georgia', serif;
  --font-mono: 'IBM Plex Mono', 'Fira Code', monospace;
  
  /* Colors (keep existing HSL variables) */
  --color-primary: hsl(var(--primary));
  --color-secondary: hsl(var(--secondary));
  
  /* Spacing */
  --spacing-section: var(--section-spacing);
  --spacing-card: var(--card-padding);
  
  /* Border Radius */
  --radius: 0.75rem;
}
```

## Phase 2: Component Updates

### 2.1 Utility Class Changes

#### Shadow Updates
```html
<!-- ❌ v3 -->
<div class="shadow-sm">
<div class="shadow">

<!-- ✅ v4 -->
<div class="shadow-xs">
<div class="shadow-sm">
```

#### Ring Updates
```html
<!-- ❌ v3 -->
<button class="focus:ring">

<!-- ✅ v4 -->
<button class="focus:ring-3">
```

#### Border Updates
```html
<!-- ❌ v3 (implicit gray-200) -->
<div class="border">

<!-- ✅ v4 (explicit color) -->
<div class="border border-gray-200">
```

### 2.2 Custom Utilities Migration

#### From @layer utilities to @utility
```css
/* ❌ v3 */
@layer utilities {
  .sportea-gradient {
    background: linear-gradient(135deg, var(--primary), var(--primary-light));
  }
}

/* ✅ v4 */
@utility sportea-gradient {
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light));
}
```

## Phase 3: Testing Strategy

### 3.1 Component Testing Checklist
- [ ] All buttons render correctly
- [ ] Card components maintain styling
- [ ] Form inputs work properly
- [ ] Navigation components function
- [ ] Responsive breakpoints work
- [ ] Dark mode toggles correctly
- [ ] Custom utilities apply properly

### 3.2 Browser Testing
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge
- [ ] Mobile browsers

### 3.3 Performance Testing
- [ ] Build size comparison
- [ ] Development server speed
- [ ] Hot reload performance
- [ ] Production build time

## Phase 4: Rollback Strategy

### 4.1 Quick Rollback Commands
```bash
# Restore v3 setup
git checkout main -- package.json tailwind.config.js postcss.config.js vite.config.js
npm install
npm run dev
```

### 4.2 Rollback Checklist
- [ ] Restore package.json dependencies
- [ ] Restore configuration files
- [ ] Restore CSS imports
- [ ] Test application functionality
- [ ] Verify all components work

## Migration Risks & Mitigation

### High Risk Areas
1. **Custom Utilities**: May need complete rewrite
2. **Plugin Dependencies**: Check v4 compatibility
3. **Build Process**: Vite integration changes
4. **shadcn/ui Components**: May need updates

### Mitigation Strategies
1. **Gradual Migration**: One component type at a time
2. **Comprehensive Testing**: Test every component
3. **Backup Strategy**: Keep v3 branch available
4. **Team Communication**: Ensure everyone understands changes

## Success Criteria

### Migration Complete When:
- [ ] All components render correctly
- [ ] No console errors
- [ ] Performance is equal or better
- [ ] All tests pass
- [ ] Team is comfortable with new workflow

### Performance Targets
- Build time: ≤ current v3 time
- Bundle size: ≤ current v3 size
- Development server: ≤ current v3 startup time

## Emergency Contacts

- **Rollback Decision**: If >2 critical issues found
- **Team Lead Approval**: Required before production deployment
- **Testing Sign-off**: All team members must test their areas

## Timeline

- **Week 1**: Setup and basic migration
- **Week 2**: Component updates and testing
- **Week 3**: Performance optimization and final testing
- **Week 4**: Production deployment (if all criteria met)

## Notes

- Keep v3 branch available for 30 days post-migration
- Document any custom solutions for future reference
- Update team documentation and onboarding materials
