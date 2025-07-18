import * as React from "react"
import { cn } from "@/lib/utils"

// Main page layout wrapper
function PageLayout({ children, className, ...props }) {
  return (
    <div 
      className={cn(
        "min-h-screen bg-background text-foreground",
        className
      )} 
      {...props}
    >
      {children}
    </div>
  )
}

// Page header component
function PageHeader({ 
  title, 
  description, 
  actions, 
  breadcrumbs,
  className,
  ...props 
}) {
  return (
    <header 
      className={cn(
        "border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className
      )} 
      {...props}
    >
      <div className="container mx-auto px-4 py-6">
        {breadcrumbs && (
          <div className="mb-4">
            {breadcrumbs}
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            {title && (
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center space-x-2">
              {actions}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

// Page content wrapper
function PageContent({ children, className, ...props }) {
  return (
    <main 
      className={cn(
        "container mx-auto px-4 py-6",
        className
      )} 
      {...props}
    >
      {children}
    </main>
  )
}

// Section wrapper for organizing content
function PageSection({ 
  title, 
  description, 
  children, 
  className,
  headerClassName,
  ...props 
}) {
  return (
    <section 
      className={cn(
        "space-y-6",
        className
      )} 
      {...props}
    >
      {(title || description) && (
        <div className={cn("space-y-2", headerClassName)}>
          {title && (
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </section>
  )
}

// Grid layout for cards and content
function ContentGrid({ 
  children, 
  columns = "auto-fit", 
  minWidth = "300px",
  gap = "6",
  className,
  ...props 
}) {
  const gridClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    "auto-fit": `grid-cols-[repeat(auto-fit,minmax(${minWidth},1fr))]`
  }

  const gapClasses = {
    2: "gap-2",
    3: "gap-3",
    4: "gap-4",
    6: "gap-6",
    8: "gap-8"
  }

  return (
    <div 
      className={cn(
        "grid",
        gridClasses[columns] || gridClasses["auto-fit"],
        gapClasses[gap] || "gap-6",
        className
      )} 
      {...props}
    >
      {children}
    </div>
  )
}

// Two column layout
function TwoColumnLayout({ 
  sidebar, 
  main, 
  sidebarWidth = "1/3",
  className,
  ...props 
}) {
  const sidebarWidths = {
    "1/4": "lg:w-1/4",
    "1/3": "lg:w-1/3", 
    "2/5": "lg:w-2/5"
  }

  const mainWidths = {
    "1/4": "lg:w-3/4",
    "1/3": "lg:w-2/3",
    "2/5": "lg:w-3/5"
  }

  return (
    <div 
      className={cn(
        "flex flex-col lg:flex-row gap-6",
        className
      )} 
      {...props}
    >
      <aside className={cn(
        "w-full",
        sidebarWidths[sidebarWidth] || "lg:w-1/3"
      )}>
        {sidebar}
      </aside>
      <main className={cn(
        "w-full",
        mainWidths[sidebarWidth] || "lg:w-2/3"
      )}>
        {main}
      </main>
    </div>
  )
}

// Empty state component
function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actions,
  className,
  ...props 
}) {
  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-4",
        className
      )} 
      {...props}
    >
      {Icon && (
        <Icon className="h-12 w-12 text-muted-foreground mb-4" />
      )}
      {title && (
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-muted-foreground mb-6 max-w-md">
          {description}
        </p>
      )}
      {actions && (
        <div className="flex flex-col sm:flex-row gap-3">
          {actions}
        </div>
      )}
    </div>
  )
}

// Loading state component
function LoadingState({ 
  title = "Loading...", 
  description,
  className,
  ...props 
}) {
  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-4",
        className
      )} 
      {...props}
    >
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-muted-foreground max-w-md">
          {description}
        </p>
      )}
    </div>
  )
}

export {
  PageLayout,
  PageHeader,
  PageContent,
  PageSection,
  ContentGrid,
  TwoColumnLayout,
  EmptyState,
  LoadingState
}
