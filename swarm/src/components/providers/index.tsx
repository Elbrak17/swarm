'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { trpc, createTRPCClient } from '@/lib/trpc';
import { Web3Provider } from './web3-provider';
import { Toaster } from '@/components/ui/toaster';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { DemoBanner } from '@/components/demo';

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Combined Providers component that wraps the application with all necessary providers
 * - Error Boundary for catching React errors
 * - React Query for data fetching
 * - tRPC for API calls
 * - Web3 (Wagmi + RainbowKit) for wallet connection
 * - Toast notifications
 * - Demo mode banner
 * 
 * Requirements: 12.1, 12.2 - Error handling with user-friendly messages
 */
export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 1000, // 5 seconds
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [trpcClient] = useState(() => createTRPCClient());

  return (
    <ErrorBoundary showRetry>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <Web3Provider>
            <DemoBanner />
            {children}
            <Toaster />
          </Web3Provider>
        </QueryClientProvider>
      </trpc.Provider>
    </ErrorBoundary>
  );
}

export { TRPCProvider } from './trpc-provider';
export { Web3Provider } from './web3-provider';
