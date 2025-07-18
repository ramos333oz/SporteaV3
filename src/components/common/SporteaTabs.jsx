import React from 'react';
import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';

// Mural-inspired tab variants
const tabsVariants = cva(
  "flex border-b border-gray-200",
  {
    variants: {
      variant: {
        default: "bg-white",
        elevated: "bg-white shadow-sm rounded-t-lg",
      },
      size: {
        sm: "text-sm",
        default: "text-base",
        lg: "text-lg",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const tabVariants = cva(
  "px-4 py-3 font-medium transition-all duration-200 border-b-2 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300",
        active: "text-brand-primary border-brand-primary",
      },
      size: {
        sm: "px-3 py-2 text-sm",
        default: "px-4 py-3 text-base",
        lg: "px-6 py-4 text-lg",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export function SporteaTabs({ 
  children, 
  className, 
  variant = "default", 
  size = "default",
  ...props 
}) {
  return (
    <div className={cn(tabsVariants({ variant, size }), className)} {...props}>
      {children}
    </div>
  );
}

export function SporteaTab({ 
  children, 
  active = false, 
  onClick, 
  className, 
  size = "default",
  disabled = false,
  ...props 
}) {
  return (
    <button
      className={cn(
        tabVariants({ 
          variant: active ? "active" : "default", 
          size 
        }),
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      role="tab"
      aria-selected={active}
      {...props}
    >
      {children}
    </button>
  );
}

// Full-width tab variant for mobile-friendly layouts
export function SporteaTabsFullWidth({ 
  children, 
  className, 
  variant = "default", 
  size = "default",
  ...props 
}) {
  return (
    <div className={cn(tabsVariants({ variant, size }), "w-full", className)} {...props}>
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            className: cn(child.props.className, "flex-1 text-center")
          });
        }
        return child;
      })}
    </div>
  );
}

// Tab panel component for content
export function SporteaTabPanel({ 
  children, 
  active = false, 
  className,
  ...props 
}) {
  if (!active) return null;
  
  return (
    <div 
      className={cn("mt-4", className)} 
      role="tabpanel"
      {...props}
    >
      {children}
    </div>
  );
}

export default SporteaTabs;
