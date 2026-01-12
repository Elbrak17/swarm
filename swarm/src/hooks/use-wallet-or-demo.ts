'use client';

import { useAccount } from 'wagmi';
import { useDemoStore, DEMO_WALLET_ADDRESS, DEMO_MNEE_BALANCE } from '@/store/demo-store';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook that provides wallet state, supporting both real wallets and demo mode
 * Use this instead of useAccount() when you want to support demo mode
 */
export function useWalletOrDemo() {
  const { address: realAddress, isConnected: isReallyConnected } = useAccount();
  const { isDemoMode, demoAddress, demoBalance } = useDemoStore();
  const { toast } = useToast();

  // Effective connection state
  const isConnected = isReallyConnected || isDemoMode;
  const address = isReallyConnected ? realAddress : (isDemoMode ? demoAddress as `0x${string}` : undefined);
  const balance = isDemoMode ? demoBalance : undefined;

  /**
   * Guard function for actions that require a real wallet
   * Shows a toast and returns false if in demo mode
   */
  const requireRealWallet = (actionName: string = 'This action'): boolean => {
    if (isDemoMode && !isReallyConnected) {
      toast({
        title: 'Real Wallet Required',
        description: `${actionName} requires a connected wallet. Please connect your wallet to continue.`,
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  /**
   * Check if user can perform on-chain actions
   */
  const canPerformOnChainActions = isReallyConnected && !isDemoMode;

  return {
    // Connection state
    isConnected,
    address,
    balance,
    
    // Mode flags
    isDemoMode,
    isReallyConnected,
    canPerformOnChainActions,
    
    // Guard function
    requireRealWallet,
  };
}
