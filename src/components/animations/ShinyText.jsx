import React from 'react';
import './ShinyText.css';

/**
 * ShinyText Component
 * Creates a subtle shine animation effect on text
 * Integrates with Sportea's Elegant Luxury theme
 * 
 * @param {string} text - The text to animate
 * @param {boolean} disabled - Whether to disable the animation
 * @param {number} speed - Animation duration in seconds (default: 5)
 * @param {string} className - Additional CSS classes
 * @param {string} variant - Color variant: 'light' (for dark backgrounds) or 'dark' (for light backgrounds)
 * @param {number} delay - Animation delay in seconds (default: 0)
 */
const ShinyText = ({ 
  text, 
  disabled = false, 
  speed = 5, 
  className = '', 
  variant = 'light',
  delay = 0 
}) => {
  const animationDuration = `${speed}s`;
  const animationDelay = `${delay}s`;

  return (
    <span
      className={`shiny-text ${variant} ${disabled ? 'disabled' : ''} ${className}`}
      style={{ 
        animationDuration,
        animationDelay
      }}
    >
      {text}
    </span>
  );
};

export default ShinyText;
