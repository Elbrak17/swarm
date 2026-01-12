'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance, useSwitchChain, useChainId } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { Button } from '@/components/ui/button';
import { MNEE_CONTRACT_ADDRESS, SEPOLIA_CHAIN_ID, MNEE_DECIMALS } from '@/lib/constants';
import { formatUnits } from 'viem';
import { useDemoStore, DEMO_MNEE_BALANCE } from '@/store/demo-store';
import { Eye } from 'lucide-react';

/**
 * WalletButton component provides wallet connection functionality
 * - Displays connect button when disconnected
 * - Shows address and MNEE balance when connected
 * - Prompts network switch when on wrong chain
 * - Supports demo mode for users without wallets
 */
export function WalletButton() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { isDemoMode, demoAddress, enableDemoMode, disableDemoMode } = useDemoStore();
  
  // Fetch MNEE token balance
  const { data: mneeBalance, isLoading: isBalanceLoading } = useBalance({
    address,
    token: MNEE_CONTRACT_ADDRESS,
    query: {
      enabled: isConnected && chainId === SEPOLIA_CHAIN_ID && !isDemoMode,
    },
  });

  // Check if user is on wrong network
  const isWrongNetwork = isConnected && chainId !== SEPOLIA_CHAIN_ID && !isDemoMode;

  // Handle network switch
  const handleSwitchNetwork = () => {
    switchChain?.({ chainId: sepolia.id });
  };

  // Handle demo mode toggle
  const handleDemoToggle = () => {
    if (isDemoMode) {
      disableDemoMode();
    } else {
      enableDemoMode();
    }
  };

  // If in demo mode, show demo wallet UI
  if (isDemoMode && !isConnected) {
    const formattedBalance = parseFloat(formatUnits(BigInt(DEMO_MNEE_BALANCE), MNEE_DECIMALS)).toFixed(0);
    const shortAddress = `${demoAddress.slice(0, 6)}...${demoAddress.slice(-4)}`;
    
    return (
      <div className="flex items-center gap-2">
        {/* Demo indicator */}
        <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 rounded-md">
          <Eye className="w-3 h-3 text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Demo</span>
        </div>
        
        {/* Demo MNEE Balance */}
        <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-secondary rounded-md">
          <span className="text-sm font-medium">
            {formattedBalance} MNEE
          </span>
        </div>

        {/* Demo Address Button */}
        <Button
          onClick={handleDemoToggle}
          variant="outline"
          size="sm"
          className="font-mono"
          title="Exit demo mode"
        >
          {shortAddress}
        </Button>
      </div>
    );
  }

  // If on wrong network, show switch prompt
  if (isWrongNetwork) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-yellow-600 dark:text-yellow-400">
          Wrong Network
        </span>
        <Button 
          onClick={handleSwitchNetwork}
          variant="outline"
          size="sm"
        >
          Switch to Sepolia
        </Button>
      </div>
    );
  }

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <div className="flex items-center gap-2">
                    <Button onClick={openConnectModal} variant="default">
                      Connect Wallet
                    </Button>
                    <Button 
                      onClick={handleDemoToggle} 
                      variant="ghost" 
                      size="sm"
                      className="text-muted-foreground"
                      title="Try the platform without a wallet"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Demo
                    </Button>
                  </div>
                );
              }

              if (chain.unsupported) {
                return (
                  <Button onClick={openChainModal} variant="destructive">
                    Wrong Network
                  </Button>
                );
              }

              return (
                <div className="flex items-center gap-3">
                  {/* MNEE Balance Display */}
                  <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-secondary rounded-md">
                    <span className="text-sm font-medium">
                      {isBalanceLoading ? (
                        '...'
                      ) : mneeBalance ? (
                        `${parseFloat(formatUnits(mneeBalance.value, mneeBalance.decimals)).toFixed(2)} MNEE`
                      ) : (
                        '0 MNEE'
                      )}
                    </span>
                  </div>

                  {/* Account Button */}
                  <Button
                    onClick={openAccountModal}
                    variant="outline"
                    size="sm"
                    className="font-mono"
                  >
                    {account.displayName}
                  </Button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
