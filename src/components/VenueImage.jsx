import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Skeleton } from '@mui/material';

/**
 * VenueImage component with smooth transitions and loading states
 * Uses Framer Motion for aesthetic animations
 */
const VenueImage = ({
  src,
  alt,
  width = '100%',
  height = '150px',
  borderRadius = 1,
  fallbackText = 'Venue Image',
  style = {},
  ...props
}) => {
  const [imageState, setImageState] = useState('loading'); // 'loading', 'loaded', 'error'
  const [imageSrc, setImageSrc] = useState(null);

  useEffect(() => {
    if (!src) {
      setImageState('error');
      return;
    }

    setImageState('loading');
    
    // Create a new image to preload
    const img = new Image();
    
    img.onload = () => {
      setImageSrc(src);
      setImageState('loaded');
    };
    
    img.onerror = () => {
      setImageState('error');
    };
    
    img.src = src;
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  // Generate fallback placeholder URL
  const getFallbackUrl = () => {
    const encodedText = encodeURIComponent(fallbackText);
    return `https://placehold.co/500x300/e0e0e0/7a7a7a?text=${encodedText}`;
  };

  // Animation variants for smooth transitions
  const imageVariants = {
    loading: {
      opacity: 0,
      scale: 1.05,
      filter: 'blur(4px)',
    },
    loaded: {
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94], // Custom easing for smooth feel
      },
    },
    error: {
      opacity: 0.8,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        duration: 0.4,
        ease: 'easeOut',
      },
    },
  };

  // Hover animation variants
  const hoverVariants = {
    rest: {
      scale: 1,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
    hover: {
      scale: 1.02,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
  };

  // Skeleton loading animation
  const skeletonVariants = {
    loading: {
      opacity: 1,
    },
    loaded: {
      opacity: 0,
      transition: {
        duration: 0.3,
      },
    },
  };

  const containerStyle = {
    width,
    height,
    borderRadius,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#f5f5f5',
    ...style,
  };

  return (
    <Box sx={containerStyle} {...props}>
      {/* Loading skeleton */}
      <AnimatePresence>
        {imageState === 'loading' && (
          <motion.div
            variants={skeletonVariants}
            initial="loading"
            exit="loaded"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 2,
            }}
          >
            <Skeleton
              variant="rectangular"
              width="100%"
              height="100%"
              animation="wave"
              sx={{
                borderRadius: 0,
                transform: 'none', // Prevent MUI skeleton transform
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main image with smooth transitions */}
      <motion.div
        variants={hoverVariants}
        initial="rest"
        whileHover="hover"
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
        }}
      >
        <motion.img
          src={imageState === 'loaded' ? imageSrc : getFallbackUrl()}
          alt={alt}
          variants={imageVariants}
          initial="loading"
          animate={imageState}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            display: 'block',
          }}
          loading="lazy"
        />
      </motion.div>

      {/* Subtle overlay for better text readability if needed */}
      <motion.div
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 0.1 }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 100%)',
          pointerEvents: 'none',
        }}
      />
    </Box>
  );
};

export default VenueImage;
