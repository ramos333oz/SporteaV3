import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for debouncing values
 * @param {any} value - The value to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {any} - The debounced value
 */
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Custom hook for debounced search functionality
 * @param {function} searchFunction - Function to call when search is triggered
 * @param {number} delay - Delay in milliseconds (default: 300)
 * @returns {object} - Object with search methods and state
 */
export const useDebouncedSearch = (searchFunction, delay = 300) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const timeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  const debouncedSearch = useCallback(
    (term) => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Set new timeout
      timeoutRef.current = setTimeout(async () => {
        if (term.trim()) {
          setIsSearching(true);
          
          // Create new abort controller
          abortControllerRef.current = new AbortController();
          
          try {
            await searchFunction(term, abortControllerRef.current.signal);
          } catch (error) {
            if (error.name !== 'AbortError') {
              console.error('Search error:', error);
            }
          } finally {
            setIsSearching(false);
          }
        }
      }, delay);
    },
    [searchFunction, delay]
  );

  const handleSearchChange = useCallback(
    (event) => {
      const value = event.target.value;
      setSearchTerm(value);
      debouncedSearch(value);
    },
    [debouncedSearch]
  );

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsSearching(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    searchTerm,
    isSearching,
    handleSearchChange,
    clearSearch,
    setSearchTerm
  };
};

/**
 * Custom hook for debounced API calls
 * @param {function} apiFunction - API function to call
 * @param {number} delay - Delay in milliseconds (default: 500)
 * @returns {object} - Object with debounced call function and state
 */
export const useDebouncedApi = (apiFunction, delay = 500) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  const debouncedCall = useCallback(
    (...args) => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Set new timeout
      timeoutRef.current = setTimeout(async () => {
        setIsLoading(true);
        setError(null);
        
        // Create new abort controller
        abortControllerRef.current = new AbortController();
        
        try {
          const result = await apiFunction(...args, abortControllerRef.current.signal);
          return result;
        } catch (err) {
          if (err.name !== 'AbortError') {
            setError(err);
            throw err;
          }
        } finally {
          setIsLoading(false);
        }
      }, delay);
    },
    [apiFunction, delay]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    debouncedCall,
    isLoading,
    error,
    clearError: () => setError(null)
  };
};
