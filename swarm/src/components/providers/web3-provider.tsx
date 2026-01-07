'use client';

import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { wagmiConfig } from '@/lib/wagmi';
import '@rainbow-me/rainbowkit/styles.css';

interface Web3ProviderProps {
  children: React.ReactNode;
}

/**
 * Web3Provider wraps the application with Wagmi and RainbowKit providers
 * Enables wallet connection functionality throughout the app
 */
export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <RainbowKitProvider
        theme={{
          lightMode: lightTheme({
            accentColor: '#6366f1', // Indigo accent
            accentColorForeground: 'white',
            borderRadius: 'medium',
          }),
          darkMode: darkTheme({
            accentColor: '#6366f1',
            accentColorForeground: 'white',
            borderRadius: 'medium',
          }),
        }}
        modalSize="compact"
      >
        {children}
      </RainbowKitProvider>
    </WagmiProvider>
  );
}
