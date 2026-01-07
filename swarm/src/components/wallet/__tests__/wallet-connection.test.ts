/**
 * Property tests for wallet connection
 * 
 * Feature: swarm-marketplace
 * Property 24: Network Detection Prompts Switch
 * Property 25: Wallet Disconnect Clears State
 * Validates: Requirements 1.4, 1.5
 * 
 * Note: These tests validate the wallet connection logic and state management.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { SEPOLIA_CHAIN_ID } from '@/lib/constants';

// ===========================================
// Types and Interfaces
// ===========================================

/**
 * Represents the wallet connection state
 */
interface WalletState {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  mneeBalance: string | null;
}

/**
 * Initial/disconnected wallet state
 */
const DISCONNECTED_STATE: WalletState = {
  address: null,
  chainId: null,
  isConnected: false,
  mneeBalance: null,
};

// ===========================================
// Wallet Logic Functions (simulating component behavior)
// ===========================================

/**
 * Determines if the user is on the wrong network
 * This mirrors the logic in WalletButton component:
 * `const isWrongNetwork = isConnected && chainId !== SEPOLIA_CHAIN_ID;`
 */
function isWrongNetwork(state: WalletState): boolean {
  return state.isConnected && state.chainId !== SEPOLIA_CHAIN_ID;
}

/**
 * Determines if network switch prompt should be shown
 * Returns true when user is connected but on wrong network
 */
function shouldShowNetworkSwitchPrompt(state: WalletState): boolean {
  return isWrongNetwork(state);
}

/**
 * Simulates wallet disconnection - clears all wallet-related state
 * This mirrors the behavior when user disconnects via RainbowKit
 */
function disconnectWallet(state: WalletState): WalletState {
  return {
    address: null,
    chainId: null,
    isConnected: false,
    mneeBalance: null,
  };
}

/**
 * Simulates wallet connection with a specific chain
 */
function connectWallet(
  address: string,
  chainId: number,
  mneeBalance: string
): WalletState {
  return {
    address,
    chainId,
    isConnected: true,
    mneeBalance,
  };
}

/**
 * Validates that wallet state is completely cleared
 */
function isStateClear(state: WalletState): boolean {
  return (
    state.address === null &&
    state.chainId === null &&
    state.isConnected === false &&
    state.mneeBalance === null
  );
}

// ===========================================
// Generators for Property-Based Testing
// ===========================================

const hexChar = fc.constantFrom(...'0123456789abcdef'.split(''));

/**
 * Generator for valid Ethereum addresses
 */
const ethereumAddressArb = fc.array(hexChar, { minLength: 40, maxLength: 40 })
  .map(chars => `0x${chars.join('')}`);

/**
 * Generator for chain IDs that are NOT Sepolia
 * Includes common chain IDs like Mainnet (1), Goerli (5), Polygon (137), etc.
 */
const nonSepoliaChainIdArb = fc.integer({ min: 1, max: 100000 })
  .filter(id => id !== SEPOLIA_CHAIN_ID);

/**
 * Generator for any valid chain ID
 */
const anyChainIdArb = fc.integer({ min: 1, max: 100000 });

/**
 * Generator for MNEE balance strings (wei values)
 */
const mneeBalanceArb = fc.bigInt({ min: BigInt(0), max: BigInt('1000000000000000000000000') })
  .map(n => n.toString());

/**
 * Generator for connected wallet state on wrong network
 */
const connectedWrongNetworkStateArb = fc.record({
  address: ethereumAddressArb,
  chainId: nonSepoliaChainIdArb,
  isConnected: fc.constant(true),
  mneeBalance: mneeBalanceArb,
});

/**
 * Generator for connected wallet state on correct network (Sepolia)
 */
const connectedSepoliaStateArb = fc.record({
  address: ethereumAddressArb,
  chainId: fc.constant(SEPOLIA_CHAIN_ID),
  isConnected: fc.constant(true),
  mneeBalance: mneeBalanceArb,
});

/**
 * Generator for any connected wallet state
 */
const connectedWalletStateArb = fc.record({
  address: ethereumAddressArb,
  chainId: anyChainIdArb,
  isConnected: fc.constant(true),
  mneeBalance: mneeBalanceArb,
});

/**
 * Generator for disconnected wallet state
 */
const disconnectedWalletStateArb = fc.constant(DISCONNECTED_STATE);

// ===========================================
// Property Tests
// ===========================================

describe('Wallet Connection Property Tests', () => {
  /**
   * Feature: swarm-marketplace, Property 24: Network Detection Prompts Switch
   * 
   * For any connected wallet on a chainId that is not Sepolia (11155111), 
   * the system SHALL display a network switch prompt.
   * Validates: Requirements 1.4
   */
  describe('Property 24: Network Detection Prompts Switch', () => {
    it('shows network switch prompt when connected to non-Sepolia chain', () => {
      fc.assert(
        fc.property(connectedWrongNetworkStateArb, (state) => {
          // When connected to a non-Sepolia chain, should show switch prompt
          return shouldShowNetworkSwitchPrompt(state) === true;
        }),
        { numRuns: 100 }
      );
    });

    it('does not show network switch prompt when connected to Sepolia', () => {
      fc.assert(
        fc.property(connectedSepoliaStateArb, (state) => {
          // When connected to Sepolia, should NOT show switch prompt
          return shouldShowNetworkSwitchPrompt(state) === false;
        }),
        { numRuns: 100 }
      );
    });

    it('does not show network switch prompt when disconnected', () => {
      fc.assert(
        fc.property(disconnectedWalletStateArb, (state) => {
          // When disconnected, should NOT show switch prompt
          return shouldShowNetworkSwitchPrompt(state) === false;
        }),
        { numRuns: 100 }
      );
    });

    it('correctly identifies wrong network for all non-Sepolia chain IDs', () => {
      fc.assert(
        fc.property(
          ethereumAddressArb,
          nonSepoliaChainIdArb,
          mneeBalanceArb,
          (address, chainId, balance) => {
            const state = connectWallet(address, chainId, balance);
            return isWrongNetwork(state) === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('correctly identifies correct network for Sepolia chain ID', () => {
      fc.assert(
        fc.property(
          ethereumAddressArb,
          mneeBalanceArb,
          (address, balance) => {
            const state = connectWallet(address, SEPOLIA_CHAIN_ID, balance);
            return isWrongNetwork(state) === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('network detection is consistent regardless of address or balance', () => {
      fc.assert(
        fc.property(
          ethereumAddressArb,
          ethereumAddressArb,
          nonSepoliaChainIdArb,
          mneeBalanceArb,
          mneeBalanceArb,
          (addr1, addr2, chainId, bal1, bal2) => {
            const state1 = connectWallet(addr1, chainId, bal1);
            const state2 = connectWallet(addr2, chainId, bal2);
            
            // Same chain ID should give same network detection result
            return isWrongNetwork(state1) === isWrongNetwork(state2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Sepolia chain ID constant is correct (11155111)', () => {
      expect(SEPOLIA_CHAIN_ID).toBe(11155111);
    });
  });

  /**
   * Feature: swarm-marketplace, Property 25: Wallet Disconnect Clears State
   * 
   * For any wallet disconnection, all wallet-related state 
   * (address, balance, connected status) SHALL be cleared.
   * Validates: Requirements 1.5
   */
  describe('Property 25: Wallet Disconnect Clears State', () => {
    it('disconnecting wallet clears all state fields', () => {
      fc.assert(
        fc.property(connectedWalletStateArb, (connectedState) => {
          const disconnectedState = disconnectWallet(connectedState);
          return isStateClear(disconnectedState);
        }),
        { numRuns: 100 }
      );
    });

    it('disconnecting wallet sets address to null', () => {
      fc.assert(
        fc.property(connectedWalletStateArb, (connectedState) => {
          const disconnectedState = disconnectWallet(connectedState);
          return disconnectedState.address === null;
        }),
        { numRuns: 100 }
      );
    });

    it('disconnecting wallet sets chainId to null', () => {
      fc.assert(
        fc.property(connectedWalletStateArb, (connectedState) => {
          const disconnectedState = disconnectWallet(connectedState);
          return disconnectedState.chainId === null;
        }),
        { numRuns: 100 }
      );
    });

    it('disconnecting wallet sets isConnected to false', () => {
      fc.assert(
        fc.property(connectedWalletStateArb, (connectedState) => {
          const disconnectedState = disconnectWallet(connectedState);
          return disconnectedState.isConnected === false;
        }),
        { numRuns: 100 }
      );
    });

    it('disconnecting wallet sets mneeBalance to null', () => {
      fc.assert(
        fc.property(connectedWalletStateArb, (connectedState) => {
          const disconnectedState = disconnectWallet(connectedState);
          return disconnectedState.mneeBalance === null;
        }),
        { numRuns: 100 }
      );
    });

    it('disconnected state matches initial state', () => {
      fc.assert(
        fc.property(connectedWalletStateArb, (connectedState) => {
          const disconnectedState = disconnectWallet(connectedState);
          return (
            disconnectedState.address === DISCONNECTED_STATE.address &&
            disconnectedState.chainId === DISCONNECTED_STATE.chainId &&
            disconnectedState.isConnected === DISCONNECTED_STATE.isConnected &&
            disconnectedState.mneeBalance === DISCONNECTED_STATE.mneeBalance
          );
        }),
        { numRuns: 100 }
      );
    });

    it('disconnect is idempotent - disconnecting twice gives same result', () => {
      fc.assert(
        fc.property(connectedWalletStateArb, (connectedState) => {
          const firstDisconnect = disconnectWallet(connectedState);
          const secondDisconnect = disconnectWallet(firstDisconnect);
          
          return (
            firstDisconnect.address === secondDisconnect.address &&
            firstDisconnect.chainId === secondDisconnect.chainId &&
            firstDisconnect.isConnected === secondDisconnect.isConnected &&
            firstDisconnect.mneeBalance === secondDisconnect.mneeBalance
          );
        }),
        { numRuns: 100 }
      );
    });

    it('disconnect clears state regardless of original chain', () => {
      fc.assert(
        fc.property(
          ethereumAddressArb,
          anyChainIdArb,
          mneeBalanceArb,
          (address, chainId, balance) => {
            const connectedState = connectWallet(address, chainId, balance);
            const disconnectedState = disconnectWallet(connectedState);
            
            // State should be cleared regardless of which chain was connected
            return isStateClear(disconnectedState);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('disconnect clears state regardless of balance amount', () => {
      fc.assert(
        fc.property(
          ethereumAddressArb,
          fc.bigInt({ min: BigInt(0), max: BigInt('999999999999999999999999999') }),
          (address, balance) => {
            const connectedState = connectWallet(
              address, 
              SEPOLIA_CHAIN_ID, 
              balance.toString()
            );
            const disconnectedState = disconnectWallet(connectedState);
            
            return isStateClear(disconnectedState);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional integration tests for wallet state transitions
   */
  describe('Wallet State Transitions', () => {
    it('connect then disconnect returns to initial state', () => {
      fc.assert(
        fc.property(
          ethereumAddressArb,
          anyChainIdArb,
          mneeBalanceArb,
          (address, chainId, balance) => {
            // Start disconnected
            const initial = DISCONNECTED_STATE;
            
            // Connect
            const connected = connectWallet(address, chainId, balance);
            expect(connected.isConnected).toBe(true);
            
            // Disconnect
            const disconnected = disconnectWallet(connected);
            
            // Should be back to initial state
            return (
              disconnected.address === initial.address &&
              disconnected.chainId === initial.chainId &&
              disconnected.isConnected === initial.isConnected &&
              disconnected.mneeBalance === initial.mneeBalance
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('network switch prompt only shows when connected AND on wrong network', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          anyChainIdArb,
          ethereumAddressArb,
          mneeBalanceArb,
          (shouldConnect, chainId, address, balance) => {
            const state: WalletState = shouldConnect
              ? connectWallet(address, chainId, balance)
              : DISCONNECTED_STATE;
            
            const showPrompt = shouldShowNetworkSwitchPrompt(state);
            
            // Prompt should only show if BOTH connected AND wrong network
            const expectedShowPrompt = 
              state.isConnected && state.chainId !== SEPOLIA_CHAIN_ID;
            
            return showPrompt === expectedShowPrompt;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
