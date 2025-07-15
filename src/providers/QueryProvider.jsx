import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Create a client with optimized settings for performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Keep data in cache for 10 minutes
      cacheTime: 10 * 60 * 1000,
      // Retry failed requests 2 times
      retry: 2,
      // Don't refetch on window focus for better performance
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect unless data is stale
      refetchOnReconnect: 'always',
      // Use background refetching for better UX
      refetchInterval: false,
      // Enable background updates
      refetchIntervalInBackground: false,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
});

/**
 * Query Provider component that wraps the app with React Query
 * Provides caching, background updates, and optimistic updates
 */
const QueryProvider = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Only show devtools in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
};

export default QueryProvider;
export { queryClient };
