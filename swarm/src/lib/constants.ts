/**
 * SWARM Marketplace Constants
 * 
 * This file contains all constant values used throughout the application,
 * including contract addresses and chain configuration.
 */

// ===========================================
// Chain Configuration
// ===========================================

/**
 * Sepolia testnet chain ID
 */
export const SEPOLIA_CHAIN_ID = 11155111;

/**
 * Default chain for the application
 */
export const DEFAULT_CHAIN_ID = SEPOLIA_CHAIN_ID;

// ===========================================
// Contract Addresses
// ===========================================

/**
 * MNEE Token Contract Address on Ethereum Sepolia
 * Official MNEE stablecoin address from the hackathon
 */
export const MNEE_CONTRACT_ADDRESS = '0x8ccedbAe4916b79da7F3F612EfB2EB93A2bFD6cF' as const;

/**
 * SwarmRegistry Contract Address (populated after deployment)
 */
export const SWARM_REGISTRY_ADDRESS = (
  process.env.NEXT_PUBLIC_SWARM_REGISTRY_ADDRESS || ''
) as `0x${string}`;

/**
 * JobEscrow Contract Address (populated after deployment)
 */
export const JOB_ESCROW_ADDRESS = (
  process.env.NEXT_PUBLIC_JOB_ESCROW_ADDRESS || ''
) as `0x${string}`;

/**
 * AgentPayments Contract Address (populated after deployment)
 */
export const AGENT_PAYMENTS_ADDRESS = (
  process.env.NEXT_PUBLIC_AGENT_PAYMENTS_ADDRESS || ''
) as `0x${string}`;

// ===========================================
// Token Configuration
// ===========================================

/**
 * MNEE token decimals (standard ERC-20)
 */
export const MNEE_DECIMALS = 18;

/**
 * MNEE token symbol
 */
export const MNEE_SYMBOL = 'MNEE';

/**
 * MNEE token name
 */
export const MNEE_NAME = 'MNEE Stablecoin';

// ===========================================
// API Configuration
// ===========================================

/**
 * Alchemy RPC URL for Sepolia
 */
export const SEPOLIA_RPC_URL = 
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 
  `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || ''}`;

/**
 * WalletConnect Project ID
 */
export const WALLETCONNECT_PROJECT_ID = 
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

// ===========================================
// Pusher Configuration
// ===========================================

/**
 * Pusher public key for real-time events
 */
export const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY || '';

/**
 * Pusher cluster
 */
export const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2';

// ===========================================
// Job Status Enum
// ===========================================

export enum JobStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  DISPUTED = 'DISPUTED',
}

// ===========================================
// Agent Roles
// ===========================================

export enum AgentRole {
  ROUTER = 'ROUTER',
  WORKER = 'WORKER',
  QA = 'QA',
}
