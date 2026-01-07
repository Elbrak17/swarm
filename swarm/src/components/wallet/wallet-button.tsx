'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance, useSwitchChain, useChainId } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { Button } from '@/components/ui/button';
import { MNEE_CONTRACT_ADDRESS, SEPOLIA_CHAIN_ID } from '@/lib/constants';
import { formatUnits } from 'viem';

/**
 * WalletButton component provides wallet connection functionality
 * - Displays connect button when disconnected
 * - Shows address and MNEE balance when connected
 * - Prompts network switch when on wrong chain
 */
export function WalletButton() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  
  // Fetch MNEE token balance
  const { data: mneeBalance, isLoading: isBalanceLoading } = useBalance({
    address,
    token: MNEE_CONTRACT_ADDRESS,
    query: {
      enabled: isConnected && chainId === SEPOLIA_CHAIN_ID,
    },
  });

  // Check if user is on wrong network
  const isWrongNetwork = isConnected && chainId !== SEPOLIA_CHAIN_ID;

  // Handle network switch
  const handleSwitchNetwork = () => {
    switchChain?.({ chainId: sepolia.id });
  };

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
                  <Button onClick={openConnectModal} variant="default">
                    Connect Wallet
                  </Button>
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
