import { useRef, useState, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import { Box } from '@mui/material';

const AnimatedItem = ({ children, delay = 0, index, onMouseEnter, onClick }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { amount: 0.5, triggerOnce: false });
  
  return (
    <motion.div
      ref={ref}
      data-index={index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      initial={{ scale: 0.7, opacity: 0 }}
      animate={inView ? { scale: 1, opacity: 1 } : { scale: 0.7, opacity: 0 }}
      transition={{ duration: 0.2, delay }}
      style={{ marginBottom: '1rem', cursor: 'pointer' }}
    >
      {children}
    </motion.div>
  );
};

const AnimatedList = ({
  items = [],
  onItemSelect,
  showGradients = true,
  enableArrowNavigation = true,
  className = '',
  itemClassName = '',
  displayScrollbar = true,
  initialSelectedIndex = -1,
  maxHeight = '400px',
  containerSx = {},
}) => {
  const listRef = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex);
  const [keyboardNav, setKeyboardNav] = useState(false);
  const [topGradientOpacity, setTopGradientOpacity] = useState(0);
  const [bottomGradientOpacity, setBottomGradientOpacity] = useState(1);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    setTopGradientOpacity(Math.min(scrollTop / 50, 1));
    const bottomDistance = scrollHeight - (scrollTop + clientHeight);
    setBottomGradientOpacity(
      scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 50, 1)
    );
  };

  useEffect(() => {
    if (!enableArrowNavigation) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
      } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        if (selectedIndex >= 0 && selectedIndex < items.length) {
          e.preventDefault();
          if (onItemSelect) {
            onItemSelect(items[selectedIndex], selectedIndex);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedIndex, onItemSelect, enableArrowNavigation]);

  useEffect(() => {
    if (!keyboardNav || selectedIndex < 0 || !listRef.current) return;
    const container = listRef.current;
    const selectedItem = container.querySelector(`[data-index="${selectedIndex}"]`);
    if (selectedItem) {
      const extraMargin = 50;
      const containerScrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const itemTop = selectedItem.offsetTop;
      const itemBottom = itemTop + selectedItem.offsetHeight;
      if (itemTop < containerScrollTop + extraMargin) {
        container.scrollTo({ top: itemTop - extraMargin, behavior: 'smooth' });
      } else if (itemBottom > containerScrollTop + containerHeight - extraMargin) {
        container.scrollTo({
          top: itemBottom - containerHeight + extraMargin,
          behavior: 'smooth',
        });
      }
    }
    setKeyboardNav(false);
  }, [selectedIndex, keyboardNav]);

  return (
    <Box 
      className={className}
      sx={{
        position: 'relative',
        width: '100%',
        ...containerSx
      }}
    >
      <Box
        ref={listRef}
        onScroll={handleScroll}
        sx={{
          maxHeight,
          overflowY: 'auto',
          padding: 2,
          // Custom scrollbar styling following UI Style Guide
          '&::-webkit-scrollbar': {
            width: displayScrollbar ? '8px' : '0px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'grey.100',
            borderRadius: 1,
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'grey.400',
            borderRadius: 1,
            '&:hover': {
              backgroundColor: 'grey.500',
            },
          },
          // Hide scrollbar when displayScrollbar is false
          ...(displayScrollbar ? {} : {
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
          }),
        }}
      >
        {items.map((item, index) => (
          <AnimatedItem
            key={item.id || index}
            delay={0.1}
            index={index}
            onMouseEnter={() => setSelectedIndex(index)}
            onClick={() => {
              setSelectedIndex(index);
              if (onItemSelect) {
                onItemSelect(item, index);
              }
            }}
          >
            <Box 
              className={`${selectedIndex === index ? 'selected' : ''} ${itemClassName}`}
              sx={{
                p: 2,
                borderRadius: 2,
                backgroundColor: selectedIndex === index ? 'action.selected' : 'background.paper',
                border: '1px solid',
                borderColor: selectedIndex === index ? 'primary.main' : 'divider',
                transition: 'all 0.2s ease-in-out',
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'action.hover',
                  borderColor: 'primary.main',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                },
              }}
            >
              {item}
            </Box>
          </AnimatedItem>
        ))}
      </Box>
      {showGradients && (
        <>
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '50px',
              background: 'linear-gradient(to bottom, var(--background), transparent)',
              pointerEvents: 'none',
              transition: 'opacity 0.3s ease',
              opacity: topGradientOpacity,
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '100px',
              background: 'linear-gradient(to top, var(--background), transparent)',
              pointerEvents: 'none',
              transition: 'opacity 0.3s ease',
              opacity: bottomGradientOpacity,
            }}
          />
        </>
      )}
    </Box>
  );
};

export default AnimatedList;
