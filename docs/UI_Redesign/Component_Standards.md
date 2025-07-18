# Component Standards - Sportea App
*Generated: July 18, 2025*

## Overview

This document defines standardized component usage patterns for the Sportea application, ensuring consistent implementation across all pages and features.

## Core Component Library

### Based on shadcn/ui v4
The Sportea design system extends shadcn/ui components with sports-specific customizations while maintaining accessibility and modern design principles.

## Button Components

### Primary Buttons
**Usage**: Main actions, form submissions, primary CTAs
```tsx
<Button variant="default" size="default">
  Primary Action
</Button>
```

**Variants**:
- `default`: Maroon background, white text
- `destructive`: Error red for delete/remove actions
- `outline`: Maroon border, maroon text
- `secondary`: Gray background, dark text
- `ghost`: Transparent background, hover effects
- `link`: Text-only, underlined on hover

**Sizes**:
- `sm`: 8px 12px padding, 12px font
- `default`: 12px 16px padding, 14px font
- `lg`: 16px 24px padding, 16px font
- `icon`: Square button for icons only

### Icon Buttons
**Usage**: Toolbar actions, compact interfaces
```tsx
<Button variant="ghost" size="icon">
  <Icon className="h-4 w-4" />
</Button>
```

### Button with Icon
**Usage**: Enhanced actions with visual context
```tsx
<Button>
  <Icon className="mr-2 h-4 w-4" />
  Action Text
</Button>
```

## Card Components

### Standard Card
**Usage**: General content containers
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    Content goes here
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### User Card
**Usage**: Displaying user information consistently
```tsx
<Card className="user-card">
  <CardContent className="flex items-center space-x-4 p-4">
    <Avatar>
      <AvatarImage src={user.avatar} />
      <AvatarFallback>{user.initials}</AvatarFallback>
    </Avatar>
    <div className="flex-1">
      <CardTitle className="text-sm">{user.name}</CardTitle>
      <CardDescription>{user.role}</CardDescription>
    </div>
    <Button variant="outline" size="sm">
      View Profile
    </Button>
  </CardContent>
</Card>
```

### Match Card
**Usage**: Displaying sports matches consistently
```tsx
<Card className="match-card">
  <CardHeader>
    <div className="flex items-center justify-between">
      <Badge variant="secondary">{sport}</Badge>
      <Badge variant={isPublic ? "default" : "outline"}>
        {isPublic ? "Public" : "Private"}
      </Badge>
    </div>
    <CardTitle>{matchTitle}</CardTitle>
    <CardDescription>{description}</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      <div className="flex items-center text-sm text-muted-foreground">
        <Calendar className="mr-2 h-4 w-4" />
        {dateTime}
      </div>
      <div className="flex items-center text-sm text-muted-foreground">
        <MapPin className="mr-2 h-4 w-4" />
        {location}
      </div>
      <div className="flex items-center text-sm text-muted-foreground">
        <Users className="mr-2 h-4 w-4" />
        {currentPlayers}/{maxPlayers} players
      </div>
    </div>
    <Progress value={playerPercentage} className="mt-4" />
  </CardContent>
  <CardFooter>
    <Button className="w-full">Join Match</Button>
  </CardFooter>
</Card>
```

## Form Components

### Standard Form Layout
**Usage**: All forms should follow this pattern
```tsx
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
    <FormField
      control={form.control}
      name="fieldName"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Field Label</FormLabel>
          <FormControl>
            <Input placeholder="Placeholder text" {...field} />
          </FormControl>
          <FormDescription>
            Optional helper text
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
    <Button type="submit">Submit</Button>
  </form>
</Form>
```

### Input Variants
```tsx
// Standard text input
<Input type="text" placeholder="Enter text" />

// Email input
<Input type="email" placeholder="Enter email" />

// Password input
<Input type="password" placeholder="Enter password" />

// Search input
<Input type="search" placeholder="Search..." className="search-input" />
```

### Select Components
```tsx
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

## Navigation Components

### Sidebar Navigation
**Usage**: Main application navigation
```tsx
<div className="sidebar">
  <div className="sidebar-header">
    <img src="/logo.png" alt="Sportea" className="logo" />
  </div>
  <nav className="sidebar-nav">
    <NavItem href="/home" icon={Home} active>Home</NavItem>
    <NavItem href="/find" icon={Search}>Find</NavItem>
    <NavItem href="/host" icon={Plus}>Host</NavItem>
    <NavItem href="/friends" icon={Users}>Friends</NavItem>
    <NavItem href="/leaderboard" icon={Trophy}>Leaderboard</NavItem>
    <NavItem href="/profile" icon={User}>Profile</NavItem>
  </nav>
  <div className="sidebar-footer">
    <UserProfile />
    <Button variant="ghost" onClick={signOut}>
      <LogOut className="mr-2 h-4 w-4" />
      Sign Out
    </Button>
  </div>
</div>
```

### Tab Navigation
**Usage**: Section navigation within pages
```tsx
<Tabs defaultValue="tab1" className="w-full">
  <TabsList className="grid w-full grid-cols-3">
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
    <TabsTrigger value="tab3">Tab 3</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">
    Content for tab 1
  </TabsContent>
  <TabsContent value="tab2">
    Content for tab 2
  </TabsContent>
  <TabsContent value="tab3">
    Content for tab 3
  </TabsContent>
</Tabs>
```

### Breadcrumb Navigation
**Usage**: Page hierarchy navigation
```tsx
<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/home">Home</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbLink href="/find">Find Games</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>Basketball</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

## Data Display Components

### Avatar Components
**Usage**: User profile pictures and fallbacks
```tsx
<Avatar>
  <AvatarImage src={user.profilePicture} alt={user.name} />
  <AvatarFallback>{user.initials}</AvatarFallback>
</Avatar>

// Size variants
<Avatar className="h-8 w-8">  // Small
<Avatar className="h-10 w-10"> // Default
<Avatar className="h-12 w-12"> // Large
```

### Badge Components
**Usage**: Status indicators, tags, labels
```tsx
<Badge variant="default">Active</Badge>
<Badge variant="secondary">Pending</Badge>
<Badge variant="destructive">Cancelled</Badge>
<Badge variant="outline">Draft</Badge>
```

### Progress Components
**Usage**: Match capacity, loading states, progress tracking
```tsx
<Progress value={75} className="w-full" />

// With label
<div className="space-y-2">
  <div className="flex justify-between text-sm">
    <span>Players</span>
    <span>8/12</span>
  </div>
  <Progress value={67} />
</div>
```

## Feedback Components

### Alert Components
**Usage**: Important messages and notifications
```tsx
<Alert>
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Heads up!</AlertTitle>
  <AlertDescription>
    You can add components to your app using the cli.
  </AlertDescription>
</Alert>

// Variants
<Alert variant="default">    // Info (blue)
<Alert variant="destructive"> // Error (red)
```

### Toast Notifications
**Usage**: Temporary feedback messages
```tsx
// Success toast
toast({
  title: "Success!",
  description: "Your match has been created.",
})

// Error toast
toast({
  variant: "destructive",
  title: "Error",
  description: "Something went wrong.",
})
```

### Loading States
**Usage**: Async operations feedback
```tsx
// Button loading
<Button disabled>
  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  Loading...
</Button>

// Skeleton loading
<div className="space-y-2">
  <Skeleton className="h-4 w-[250px]" />
  <Skeleton className="h-4 w-[200px]" />
</div>
```

## Layout Components

### Page Layout
**Usage**: Standard page structure
```tsx
<div className="page-layout">
  <Sidebar />
  <main className="main-content">
    <PageHeader>
      <PageTitle>Page Title</PageTitle>
      <PageActions>
        <Button>Primary Action</Button>
      </PageActions>
    </PageHeader>
    <PageContent>
      {/* Page content */}
    </PageContent>
  </main>
</div>
```

### Grid Layouts
**Usage**: Responsive content grids
```tsx
// Card grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map(item => (
    <Card key={item.id}>
      {/* Card content */}
    </Card>
  ))}
</div>

// Two-column layout
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2">
    {/* Main content */}
  </div>
  <div>
    {/* Sidebar content */}
  </div>
</div>
```

## Component Composition Rules

### 1. Consistent Spacing
- Use the spacing scale (4px base unit)
- Apply consistent gaps between related elements
- Use larger gaps between unrelated sections

### 2. Color Usage
- Primary (maroon) for main actions and brand elements
- Secondary colors for supporting actions
- Neutral grays for text and backgrounds
- Semantic colors (red, green, yellow) for status

### 3. Typography Hierarchy
- Use consistent heading levels
- Maintain proper contrast ratios
- Apply consistent line heights and spacing

### 4. Interactive States
- All interactive elements must have hover states
- Focus states for keyboard navigation
- Loading states for async operations
- Disabled states when appropriate

### 5. Responsive Behavior
- Mobile-first approach
- Consistent breakpoint usage
- Appropriate touch targets (minimum 44px)
- Readable text sizes across devices

## Implementation Guidelines

### 1. Component Naming
- Use descriptive, consistent naming
- Follow shadcn/ui conventions
- Add sports-specific prefixes when needed

### 2. Customization
- Extend shadcn/ui components rather than replacing
- Use CSS custom properties for theming
- Maintain accessibility standards

### 3. Testing
- Test all interactive states
- Verify keyboard navigation
- Check responsive behavior
- Validate accessibility compliance

---

*These standards ensure consistent, professional UI implementation across the entire Sportea application.*
