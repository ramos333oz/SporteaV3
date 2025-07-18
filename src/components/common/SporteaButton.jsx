import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"
import { cva } from "class-variance-authority"

// Mural-inspired button variants for Sportea
const sporteaButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
  {
    variants: {
      variant: {
        primary: "bg-brand-primary hover:bg-brand-primary-dark text-white shadow-sm hover:shadow-md hover:-translate-y-0.5",
        secondary: "bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 shadow-sm",
        athletic: "bg-gradient-to-r from-brand-primary to-brand-primary-light hover:from-brand-primary-dark hover:to-brand-primary text-white shadow-md hover:shadow-lg hover:-translate-y-1",
        success: "bg-mural-green hover:bg-mural-green/90 text-white shadow-sm hover:shadow-md",
        warning: "bg-mural-orange hover:bg-mural-orange/90 text-white shadow-sm hover:shadow-md",
        danger: "bg-red-500 hover:bg-red-600 text-white shadow-sm hover:shadow-md",
        ghost: "hover:bg-gray-100 text-gray-700",
        outline: "border border-brand-primary bg-transparent text-brand-primary hover:bg-brand-primary hover:text-white shadow-sm",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-md",
        default: "h-10 px-4 text-sm rounded-md",
        lg: "h-12 px-6 text-base rounded-lg",
        icon: "h-10 w-10 rounded-md",
      },
      intensity: {
        subtle: "opacity-90 hover:opacity-100",
        normal: "",
        bold: "font-semibold shadow-lg hover:shadow-xl",
        intense: "font-bold shadow-xl hover:shadow-2xl hover:scale-105",
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
      intensity: "normal",
    },
  }
)

function SporteaButton({
  className,
  variant = "primary",
  size = "default",
  intensity = "normal",
  asChild = false,
  children,
  ...props
}) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      className={cn(sporteaButtonVariants({ variant, size, intensity, className }))}
      {...props}
    >
      {children}
    </Comp>
  )
}

// Specific button components for common Sportea actions
function JoinMatchButton({ className, ...props }) {
  return (
    <SporteaButton
      sport="athletic"
      intensity="bold"
      className={cn("w-full", className)}
      {...props}
    >
      Join Match
    </SporteaButton>
  )
}

function HostMatchButton({ className, ...props }) {
  return (
    <SporteaButton
      sport="primary"
      intensity="bold"
      className={cn("", className)}
      {...props}
    >
      Host a Match
    </SporteaButton>
  )
}

function ViewProfileButton({ className, ...props }) {
  return (
    <SporteaButton
      variant="outline"
      size="sm"
      className={cn("", className)}
      {...props}
    >
      View Profile
    </SporteaButton>
  )
}

function AddFriendButton({ className, ...props }) {
  return (
    <SporteaButton
      sport="success"
      size="sm"
      className={cn("", className)}
      {...props}
    >
      Add Friend
    </SporteaButton>
  )
}

function BlockUserButton({ className, ...props }) {
  return (
    <SporteaButton
      sport="danger"
      variant="outline"
      size="sm"
      className={cn("", className)}
      {...props}
    >
      Block
    </SporteaButton>
  )
}

export {
  SporteaButton,
  JoinMatchButton,
  HostMatchButton,
  ViewProfileButton,
  AddFriendButton,
  BlockUserButton,
  sporteaButtonVariants
}
