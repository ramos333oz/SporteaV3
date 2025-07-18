# Tailwind v4 Component Migration Checklist

## 🔄 **Critical Utility Class Changes**

### **Shadow Utilities**
```html
<!-- ❌ v3 → ✅ v4 -->
shadow-sm → shadow-xs
shadow → shadow-sm
shadow-md → shadow-md (no change)
shadow-lg → shadow-lg (no change)
```

### **Ring Utilities**
```html
<!-- ❌ v3 → ✅ v4 -->
focus:ring → focus:ring-3
ring → ring-1 (new default)
```

### **Border Utilities**
```html
<!-- ❌ v3 → ✅ v4 -->
border → border border-gray-200 (explicit color needed)
divide-y → divide-y divide-gray-200 (explicit color needed)
```

### **Outline Utilities**
```html
<!-- ❌ v3 → ✅ v4 -->
outline-none → outline-hidden (for accessibility)
outline outline-2 → outline-2 (implicit solid style)
```

### **Space Utilities**
```html
<!-- ❌ v3 → ✅ v4 (performance improvement) -->
space-y-4 → flex flex-col gap-4 (recommended)
space-x-4 → flex gap-4 (recommended)
```

## 📋 **Component-by-Component Migration**

### **✅ SporteaButton (Priority: HIGH)**
- [ ] Update shadow classes: `shadow-sm` → `shadow-xs`
- [ ] Update ring classes: `focus:ring` → `focus:ring-3`
- [ ] Test all variants (primary, secondary, athletic, etc.)
- [ ] Verify hover/focus states work
- [ ] Check disabled states

### **✅ SporteaCard (Priority: HIGH)**
- [ ] Update shadow classes for elevation
- [ ] Verify border colors are explicit
- [ ] Test hover effects and transitions
- [ ] Check responsive behavior

### **✅ Navigation Components (Priority: HIGH)**
- [ ] Update active state styling
- [ ] Verify hover effects
- [ ] Test mobile navigation
- [ ] Check accessibility focus states

### **✅ Form Components (Priority: HIGH)**
- [ ] Update input focus rings
- [ ] Verify border colors
- [ ] Test validation states
- [ ] Check placeholder styling

### **✅ Modal/Dialog Components (Priority: MEDIUM)**
- [ ] Update backdrop styling
- [ ] Verify z-index layers
- [ ] Test focus management
- [ ] Check responsive behavior

### **✅ Tab Components (Priority: MEDIUM)**
- [ ] Migrate to modern shadcn/ui tabs
- [ ] Update active state styling
- [ ] Test keyboard navigation
- [ ] Verify content switching

## 🧪 **Testing Strategy**

### **Visual Regression Testing**
```bash
# Take screenshots before migration
npm run screenshot:before

# After migration
npm run screenshot:after

# Compare differences
npm run screenshot:compare
```

### **Component Testing Checklist**
- [ ] **Desktop Chrome**: All components render correctly
- [ ] **Desktop Firefox**: All components render correctly  
- [ ] **Desktop Safari**: All components render correctly
- [ ] **Mobile Chrome**: Responsive behavior works
- [ ] **Mobile Safari**: Touch interactions work
- [ ] **Dark Mode**: All themes work correctly
- [ ] **Accessibility**: Screen readers work properly

### **Performance Testing**
- [ ] **Build Size**: Compare v3 vs v4 bundle size
- [ ] **Build Time**: Compare compilation speed
- [ ] **Runtime Performance**: Check for any regressions
- [ ] **Development Server**: Hot reload speed

## 🚨 **Common Migration Issues & Solutions**

### **Issue 1: Implicit Border Colors**
```html
<!-- ❌ Problem: Borders become currentColor -->
<div class="border">

<!-- ✅ Solution: Explicit color -->
<div class="border border-gray-200">
```

### **Issue 2: Ring Default Width**
```html
<!-- ❌ Problem: Ring too thin -->
<button class="focus:ring">

<!-- ✅ Solution: Explicit width -->
<button class="focus:ring-3">
```

### **Issue 3: Shadow Scale Changes**
```html
<!-- ❌ Problem: Shadows look different -->
<div class="shadow-sm">

<!-- ✅ Solution: Update scale -->
<div class="shadow-xs">
```

### **Issue 4: Space Utilities Performance**
```html
<!-- ❌ Problem: Space utilities may cause layout issues -->
<div class="space-y-4">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

<!-- ✅ Solution: Use flex with gap -->
<div class="flex flex-col gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

## 🔧 **Migration Scripts**

### **Automated Class Updates**
```bash
# Find and replace common patterns
find src -name "*.jsx" -exec sed -i 's/shadow-sm/shadow-xs/g' {} \;
find src -name "*.jsx" -exec sed -i 's/focus:ring"/focus:ring-3"/g' {} \;
find src -name "*.jsx" -exec sed -i 's/class="border"/class="border border-gray-200"/g' {} \;
```

### **Verification Script**
```bash
# Check for remaining v3 patterns
grep -r "shadow-sm" src/
grep -r "focus:ring\"" src/
grep -r "class=\"border\"" src/
```

## 📊 **Migration Progress Tracking**

### **Component Status**
- [ ] SporteaButton: ⏳ In Progress
- [ ] SporteaCard: ❌ Not Started  
- [ ] Navigation: ❌ Not Started
- [ ] Forms: ❌ Not Started
- [ ] Modals: ❌ Not Started
- [ ] Tabs: ❌ Not Started

### **Page Status**
- [ ] Home: ❌ Not Started
- [ ] Login/Register: ❌ Not Started
- [ ] Profile: ❌ Not Started
- [ ] Find: ❌ Not Started
- [ ] Host: ❌ Not Started
- [ ] Friends: ❌ Not Started
- [ ] Leaderboard: ❌ Not Started

## 🎯 **Success Criteria**

### **Migration Complete When:**
- [ ] All components render identically to v3
- [ ] No console errors or warnings
- [ ] All tests pass
- [ ] Performance is equal or better than v3
- [ ] Team approves visual changes
- [ ] Accessibility standards maintained

### **Rollback Triggers**
- More than 3 critical visual regressions
- Performance degradation >20%
- Any accessibility regressions
- Team consensus to rollback

## 📞 **Support Resources**

- **Tailwind v4 Docs**: https://tailwindcss.com/docs/upgrade-guide
- **Migration Tool**: `npx @tailwindcss/upgrade`
- **Community Discord**: Tailwind CSS Discord
- **Rollback Guide**: `docs/tailwind-v4-migration-guide.md`
