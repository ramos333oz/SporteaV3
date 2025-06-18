import React, { useState, useEffect, useRef } from 'react';

/**
 * LazyImage component that loads images only when they enter the viewport
 * 
 * @param {Object} props Component props
 * @param {string} props.src The actual image source to load when visible
 * @param {string} [props.placeholderSrc] Optional custom placeholder image source
 * @param {string} [props.alt] Alt text for the image
 * @param {Object} [props.style] Inline styles for the image
 * @param {string} [props.className] CSS class for the image
 * @param {number} [props.threshold=0] Intersection threshold (0-1)
 * @param {string} [props.rootMargin='100px'] Margin around root
 * @returns {React.ReactElement} The LazyImage component
 */
const LazyImage = ({
  src,
  placeholderSrc = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  alt = '',
  style = {},
  className = '',
  threshold = 0,
  rootMargin = '100px',
  ...rest
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef(null);

  // Set up the Intersection Observer
  useEffect(() => {
    // Skip if image reference is not available
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // When the image enters viewport
        if (entries.some(entry => entry.isIntersecting)) {
          setIsVisible(true);
          // Once detected as visible, no need to observe anymore
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    // Start observing the image element
    observer.observe(imgRef.current);

    // Clean up the observer when component unmounts
    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [threshold, rootMargin]);

  // Handler for image load event
  const handleImageLoaded = () => {
    setIsLoaded(true);
  };

  // Handle error in case the real image fails to load
  const handleImageError = () => {
    console.error(`Error loading image: ${src}`);
  };

  // Apply base styles and passed styles to maintain dimensions
  const combinedStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'opacity 0.3s ease-in-out',
    ...style,
  };

  return (
    <img
      ref={imgRef}
      src={isVisible ? src : placeholderSrc}
      alt={alt}
      className={className}
      style={{
        ...combinedStyle,
        opacity: isVisible && isLoaded ? 1 : 0.5,
      }}
      onLoad={isVisible ? handleImageLoaded : undefined}
      onError={isVisible ? handleImageError : undefined}
      {...rest}
    />
  );
};

export default LazyImage; 