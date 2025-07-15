import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Box } from '@mui/material';

/**
 * Virtual Scrolling List Component
 * Renders only visible items for optimal performance with large datasets
 */
const VirtualScrollList = ({
  items = [],
  itemHeight = 100,
  containerHeight = 400,
  renderItem,
  overscan = 5,
  onScroll,
  className,
  ...props
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  // Calculate visible items
  const visibleItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange;
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
      key: item.id || startIndex + index
    }));
  }, [items, visibleRange]);

  // Total height of all items
  const totalHeight = items.length * itemHeight;

  // Offset for visible items
  const offsetY = visibleRange.startIndex * itemHeight;

  // Handle scroll events
  const handleScroll = useCallback((event) => {
    const newScrollTop = event.target.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(event);
  }, [onScroll]);

  // Scroll to specific index
  const scrollToIndex = useCallback((index) => {
    if (containerRef.current) {
      const scrollTop = index * itemHeight;
      containerRef.current.scrollTop = scrollTop;
      setScrollTop(scrollTop);
    }
  }, [itemHeight]);

  // Scroll to top
  const scrollToTop = useCallback(() => {
    scrollToIndex(0);
  }, [scrollToIndex]);

  return (
    <Box
      ref={containerRef}
      className={className}
      onScroll={handleScroll}
      sx={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
        ...props.sx
      }}
      {...props}
    >
      {/* Total height container */}
      <Box sx={{ height: totalHeight, position: 'relative' }}>
        {/* Visible items container */}
        <Box
          sx={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map(({ item, index, key }) => (
            <Box
              key={key}
              sx={{
                height: itemHeight,
                position: 'relative'
              }}
            >
              {renderItem(item, index)}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

/**
 * Virtual Grid Component for grid layouts
 */
const VirtualGrid = ({
  items = [],
  itemWidth = 200,
  itemHeight = 200,
  containerWidth = 800,
  containerHeight = 600,
  renderItem,
  gap = 16,
  overscan = 5,
  onScroll,
  className,
  ...props
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  // Calculate columns per row
  const columnsPerRow = Math.floor((containerWidth + gap) / (itemWidth + gap));
  const totalRows = Math.ceil(items.length / columnsPerRow);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const rowHeight = itemHeight + gap;
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const endRow = Math.min(
      totalRows - 1,
      Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan
    );
    
    return { startRow, endRow };
  }, [scrollTop, itemHeight, gap, containerHeight, totalRows, overscan]);

  // Calculate visible items
  const visibleItems = useMemo(() => {
    const { startRow, endRow } = visibleRange;
    const startIndex = startRow * columnsPerRow;
    const endIndex = Math.min(items.length - 1, (endRow + 1) * columnsPerRow - 1);
    
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
      row: Math.floor((startIndex + index) / columnsPerRow),
      col: (startIndex + index) % columnsPerRow,
      key: item.id || startIndex + index
    }));
  }, [items, visibleRange, columnsPerRow]);

  // Total height of all rows
  const totalHeight = totalRows * (itemHeight + gap) - gap;

  // Handle scroll events
  const handleScroll = useCallback((event) => {
    const newScrollTop = event.target.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(event);
  }, [onScroll]);

  return (
    <Box
      ref={containerRef}
      className={className}
      onScroll={handleScroll}
      sx={{
        height: containerHeight,
        width: containerWidth,
        overflow: 'auto',
        position: 'relative',
        ...props.sx
      }}
      {...props}
    >
      {/* Total height container */}
      <Box sx={{ height: totalHeight, position: 'relative' }}>
        {/* Visible items container */}
        {visibleItems.map(({ item, index, row, col, key }) => (
          <Box
            key={key}
            sx={{
              position: 'absolute',
              top: row * (itemHeight + gap),
              left: col * (itemWidth + gap),
              width: itemWidth,
              height: itemHeight
            }}
          >
            {renderItem(item, index)}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

/**
 * Hook for virtual scrolling logic
 */
export const useVirtualScroll = ({
  items,
  itemHeight,
  containerHeight,
  overscan = 5
}) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange;
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
      key: item.id || startIndex + index
    }));
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;

  const handleScroll = useCallback((event) => {
    setScrollTop(event.target.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    scrollTop,
    setScrollTop
  };
};

export default VirtualScrollList;
export { VirtualGrid };
