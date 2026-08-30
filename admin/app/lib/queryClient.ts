import { QueryClient } from '@tanstack/react-query';

/**
 * One QueryClient for the app. Defaults live here, never at a call site — a
 * per-call `staleTime` is how two screens end up showing different data for the
 * same record.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
