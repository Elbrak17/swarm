/**
 * Wagmi Configuration for SWARM Marketplace
 * 
 * Configures wallet connection with Sepolia testnet and RainbowKit
 */

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';
import { http } from 'wagmi';
import { SEPOLIA_RPC_URL, WALLETCONNECT_PROJECT_ID } from './constants';

/**
 * Wagmi configuration with RainbowKit defaults
 * Supports MetaMask, WalletConnect, Coinbase Wallet
 */
export const wagmiConfig = getDefaultConfig({
  appName: 'SWARM Marketplace',
  projectId: WALLETCONNECT_PROJECT_ID || 'demo-project-id',
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(SEPOLIA_RPC_URL || undefined),
  },
  ssr: true,
});

/**
 * Supported chain ID for the application
 */
export const SUPPORTED_CHAIN_ID = sepolia.id;
