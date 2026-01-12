'use client';

import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance, useSwitchChain, useChainId } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { Button } from '@/components/ui/button';
import { MNEE_CONTRACT_ADDRESS, SEPOLIA_CHAIN_ID, MNEE_DECIMALS } from '@/lib/constants';
import { formatUnits } from 'viem';
import { useDemoStore, DEMO_MNEE_BALANCE, DEMO_WALLET_ADDRESS } from '@/store/demo-store';
import { Eye, Wallet, Sparkles, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Premium WalletButton component
 * Mobile-first design with demo mode support
 */
export function WalletButton() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { isDemoMode: rawDemoMode, enableDemoMode, disableDemoMode } = useDemoStore();
  const [showDemoTooltip, setShowDemoTooltip] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Handle hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  
  // Only use demo mode after hydration
  const isDemoMode = isHydrated && rawDemoMode;
  const demoAddress = DEMO_WALLET_ADDRESS;
  
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

  // Show loading state during hydration
  if (!isHydrated) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2 px-3 sm:px-4">
        <Wallet className="w-4 h-4" />
        <span className="hidden sm:inline">Loading...</span>
      </Button>
    );
  }

  // If in demo mode, show premium demo wallet UI
  if (isDemoMode) {
    const formattedBalance = parseFloat(formatUnits(BigInt(DEMO_MNEE_BALANCE), MNEE_DECIMALS)).toLocaleString('en-US', {
      maximumFractionDigits: 0
    });
    const shortAddress = `${demoAddress.slice(0, 6)}...${demoAddress.slice(-4)}`;
    
    return (
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Demo Badge - Compact on mobile */}
        <div className="relative">
          <div className={cn(
            "flex items-center gap-1 px-2 py-1.5 rounded-lg",
            "bg-gradient-to-r from-amber-500/10 to-orange-500/10",
            "border border-amber-500/30",
            "transition-all duration-200"
          )}>
            <div className="relative">
              <Eye className="w-3.5 h-3.5 text-amber-500" />
              <Sparkles className="w-2 h-2 absolute -top-0.5 -right-0.5 text-amber-400 animate-pulse" />
            </div>
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 hidden xs:inline">
              Demo
            </span>
          </div>
        </div>
        
        {/* Balance + Address - Combined on mobile */}
        <button
          onClick={handleDemoToggle}
          className={cn(
            "flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg",
            "bg-secondary hover:bg-secondary/80",
            "border border-border",
            "transition-all duration-200 active:scale-95"
          )}
        >
          <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm tabular-nums">
              {formattedBalance}
            </span>
            <span className="text-xs text-muted-foreground hidden sm:inline">MNEE</span>
          </div>
          <div className="hidden sm:block w-px h-4 bg-border" />
          <span className="font-mono text-xs text-muted-foreground hidden sm:inline">
            {shortAddress}
          </span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>
    );
  }

  // If on wrong network, show switch prompt
  if (isWrongNetwork) {
    return (
      <Button 
        onClick={handleSwitchNetwork}
        variant="outline"
        size="sm"
        className="gap-2 border-yellow-500/50 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/10"
      >
        <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
        <span className="hidden sm:inline">Switch to</span> Sepolia
      </Button>
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
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Connect Wallet Button */}
                    <Button 
                      onClick={openConnectModal} 
                      size="sm"
                      className="gap-2 px-3 sm:px-4"
                    >
                      <Wallet className="w-4 h-4" />
                      <span className="hidden sm:inline">Connect</span>
                      <span className="sm:hidden">Wallet</span>
                    </Button>
                    
                    {/* Demo Button - Premium style */}
                    <div className="relative">
                      <Button 
                        onClick={handleDemoToggle}
                        onMouseEnter={() => setShowDemoTooltip(true)}
                        onMouseLeave={() => setShowDemoTooltip(false)}
                        variant="outline"
                        size="sm"
                        className={cn(
                          "gap-1.5 px-2.5 sm:px-3",
                          "border-amber-500/30 hover:border-amber-500/50",
                          "hover:bg-amber-500/10",
                          "transition-all duration-200"
                        )}
                      >
                        <div className="relative">
                          <Eye className="w-4 h-4 text-amber-500" />
                          <Sparkles className="w-2 h-2 absolute -top-0.5 -right-0.5 text-amber-400" />
                        </div>
                        <span className="text-amber-600 dark:text-amber-400 font-medium hidden sm:inline">
                          Demo
                        </span>
                      </Button>
                      
                      {/* Tooltip */}
                      {showDemoTooltip && (
                        <div className={cn(
                          "absolute top-full right-0 mt-2 p-3 w-56",
                          "bg-popover border rounded-lg shadow-lg",
                          "animate-in fade-in slide-in-from-top-2 duration-200",
                          "hidden sm:block z-50"
                        )}>
                          <p className="text-sm font-medium mb-1">Demo Mode</p>
                          <p className="text-xs text-muted-foreground">
                            Explore the platform with 50,000 virtual MNEE. No wallet required.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              if (chain.unsupported) {
                return (
                  <Button 
                    onClick={openChainModal} 
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    Wrong Network
                  </Button>
                );
              }

              return (
                <button
                  onClick={openAccountModal}
                  className={cn(
                    "flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg",
                    "bg-secondary hover:bg-secondary/80",
                    "border border-border",
                    "transition-all duration-200 active:scale-95"
                  )}
                >
                  <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
                  
                  {/* Balance */}
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-sm tabular-nums">
                      {isBalanceLoading ? (
                        <span className="inline-block w-12 h-4 bg-muted animate-pulse rounded" />
                      ) : mneeBalance ? (
                        parseFloat(formatUnits(mneeBalance.value, mneeBalance.decimals)).toFixed(0)
                      ) : (
                        '0'
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground hidden sm:inline">MNEE</span>
                  </div>
                  
                  <div className="hidden sm:block w-px h-4 bg-border" />
                  
                  {/* Address */}
                  <span className="font-mono text-xs text-muted-foreground hidden sm:inline">
                    {account.displayName}
                  </span>
                  
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </button>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
