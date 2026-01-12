'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Demo mode store
 * Allows users to explore the platform without a real wallet
 */

// Demo wallet address (clearly fake)
export const DEMO_WALLET_ADDRESS = '0xDEMO000000000000000000000000000000000000' as const;
export const DEMO_MNEE_BALANCE = '10000000000000000000000'; // 10,000 MNEE (in wei, 18 decimals)

interface DemoState {
  isDemoMode: boolean;
  demoAddress: string;
  demoBalance: string;
  
  // Actions
  enableDemoMode: () => void;
  disableDemoMode: () => void;
  toggleDemoMode: () => void;
}

export const useDemoStore = create<DemoState>()(
  persist(
    (set, get) => ({
      isDemoMode: false,
      demoAddress: DEMO_WALLET_ADDRESS,
      demoBalance: DEMO_MNEE_BALANCE,
      
      enableDemoMode: () => set({ isDemoMode: true }),
      disableDemoMode: () => set({ isDemoMode: false }),
      toggleDemoMode: () => set({ isDemoMode: !get().isDemoMode }),
    }),
    {
      name: 'swarm-demo-mode',
    }
  )
);

/**
 * Hook to check if an action requires a real wallet
 * Returns a function that shows a toast if in demo mode
 */
export function useDemoGuard() {
  const { isDemoMode } = useDemoStore();
  
  const guardAction = (action: () => void, actionName: string = 'This action') => {
    if (isDemoMode) {
      // Return false to indicate action was blocked
      return { blocked: true, message: `${actionName} requires a real wallet. Connect your wallet to continue.` };
    }
    action();
    return { blocked: false };
  };
  
  return { isDemoMode, guardAction };
}
