'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useDemoStore, DEMO_WALLET_ADDRESS } from '@/store/demo-store';

/**
 * Hook that provides wallet state, supporting both real wallets and demo mode
 * Use this instead of useAccount() when you want to support demo mode
 */
export function useWalletOrDemo() {
  const { address: realAddress, isConnected: isReallyConnected } = useAccount();
  
  // Handle hydration - wait for client-side state
  const [isHydrated, setIsHydrated] = useState(false);
  
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  
  const { 
    isDemoMode: rawDemoMode, 
    demoAddress, 
    demoBalance,
    demoSwarms,
    demoJobs,
    createDemoSwarm,
    createDemoJob,
    createDemoBid,
    acceptDemoBid,
    startDemoJobExecution,
    completeDemoJob,
    getDemoSwarm,
    getDemoJob,
    getDemoSwarmsByOwner,
    getOpenDemoJobs,
    getDemoJobsByClient,
  } = useDemoStore();
  
  // Only use demo mode after hydration to avoid SSR mismatch
  const isDemoMode = isHydrated && rawDemoMode;

  // Effective connection state - demo mode counts as "connected"
  const isConnected = isReallyConnected || isDemoMode;
  const address = isReallyConnected ? realAddress : (isDemoMode ? demoAddress as `0x${string}` : undefined);
  const balance = isDemoMode ? demoBalance : undefined;

  /**
   * Check if user can perform real on-chain actions
   */
  const canPerformOnChainActions = isReallyConnected && !isDemoMode;

  /**
   * Get user's swarms (demo or real based on mode)
   */
  const getUserSwarms = () => {
    if (isDemoMode) {
      return getDemoSwarmsByOwner(DEMO_WALLET_ADDRESS);
    }
    return [];
  };

  /**
   * Get user's jobs (demo or real based on mode)
   */
  const getUserJobs = () => {
    if (isDemoMode) {
      return getDemoJobsByClient(DEMO_WALLET_ADDRESS);
    }
    return [];
  };

  return {
    // Connection state
    isConnected,
    address,
    balance,
    isHydrated,
    
    // Mode flags
    isDemoMode,
    isReallyConnected,
    canPerformOnChainActions,
    
    // Demo data
    demoSwarms,
    demoJobs,
    
    // Demo actions
    createDemoSwarm,
    createDemoJob,
    createDemoBid,
    acceptDemoBid,
    startDemoJobExecution,
    completeDemoJob,
    
    // Demo getters
    getDemoSwarm,
    getDemoJob,
    getDemoSwarmsByOwner,
    getOpenDemoJobs,
    getDemoJobsByClient,
    getUserSwarms,
    getUserJobs,
  };
}
