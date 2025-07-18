import React from 'react';
import { motion } from 'framer-motion';
import { SporteaButton, JoinMatchButton, HostMatchButton, ViewProfileButton, AddFriendButton, BlockUserButton } from './SporteaButton';

// Animation variants
const buttonVariants = {
  initial: { scale: 1 },
  hover: { 
    scale: 1.02,
    transition: { type: "spring", stiffness: 400, damping: 17 }
  },
  tap: { 
    scale: 0.98,
    transition: { type: "spring", stiffness: 400, damping: 17 }
  }
};

const athleticVariants = {
  initial: { scale: 1, rotateX: 0 },
  hover: { 
    scale: 1.05,
    rotateX: 5,
    transition: { type: "spring", stiffness: 300, damping: 20 }
  },
  tap: { 
    scale: 0.95,
    rotateX: -2,
    transition: { type: "spring", stiffness: 400, damping: 17 }
  }
};

const pulseVariants = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.02, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// Animated SporteaButton wrapper
const MotionSporteaButton = motion(SporteaButton);

function AnimatedSporteaButton({ 
  animation = "default", 
  children, 
  ...props 
}) {
  const getVariants = () => {
    switch (animation) {
      case "athletic":
        return athleticVariants;
      case "pulse":
        return pulseVariants;
      default:
        return buttonVariants;
    }
  };

  return (
    <MotionSporteaButton
      variants={getVariants()}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
      animate={animation === "pulse" ? "animate" : "initial"}
      {...props}
    >
      {children}
    </MotionSporteaButton>
  );
}

// Animated specialized buttons
function AnimatedJoinMatchButton({ animation = "athletic", ...props }) {
  const MotionJoinButton = motion(JoinMatchButton);
  
  return (
    <MotionJoinButton
      variants={athleticVariants}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
      {...props}
    />
  );
}

function AnimatedHostMatchButton({ animation = "default", ...props }) {
  const MotionHostButton = motion(HostMatchButton);
  
  return (
    <MotionHostButton
      variants={buttonVariants}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
      {...props}
    />
  );
}

function AnimatedViewProfileButton({ ...props }) {
  const MotionViewButton = motion(ViewProfileButton);
  
  return (
    <MotionViewButton
      variants={buttonVariants}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
      {...props}
    />
  );
}

function AnimatedAddFriendButton({ ...props }) {
  const MotionAddFriendButton = motion(AddFriendButton);
  
  return (
    <MotionAddFriendButton
      variants={buttonVariants}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
      {...props}
    />
  );
}

// Page transition animations
const pageVariants = {
  initial: { 
    opacity: 0, 
    x: -20,
    transition: { duration: 0.3 }
  },
  in: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.3, ease: "easeOut" }
  },
  out: { 
    opacity: 0, 
    x: 20,
    transition: { duration: 0.2, ease: "easeIn" }
  }
};

const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" }
  }
};

// Card animation variants
const cardVariants = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { duration: 0.4, ease: "easeOut" }
  },
  hover: {
    y: -4,
    scale: 1.02,
    transition: { type: "spring", stiffness: 300, damping: 20 }
  },
  tap: {
    scale: 0.98,
    transition: { type: "spring", stiffness: 400, damping: 17 }
  }
};

// Loading animation
const loadingVariants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear"
    }
  }
};

// Notification badge animation
const badgeVariants = {
  initial: { scale: 0 },
  animate: { 
    scale: 1,
    transition: { type: "spring", stiffness: 500, damping: 15 }
  },
  exit: { 
    scale: 0,
    transition: { duration: 0.2 }
  }
};

export {
  AnimatedSporteaButton,
  AnimatedJoinMatchButton,
  AnimatedHostMatchButton,
  AnimatedViewProfileButton,
  AnimatedAddFriendButton,
  pageVariants,
  staggerContainer,
  staggerItem,
  cardVariants,
  loadingVariants,
  badgeVariants
};
