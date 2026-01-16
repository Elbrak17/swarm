'use client';

import { useEffect } from 'react';
import { useDemoStore } from '@/store/demo-store';
import { DemoBanner } from '@/components/demo/demo-banner';

/**
 * Demo Environment Layout
 * 
 * This layout wraps all /demo/* routes and automatically enables demo mode.
 * When user enters /demo/*, they're in the virtual environment.
 * When they leave, demo mode is disabled.
 */
export default function DemoLayout({ children }: { children: React.ReactNode }) {
  const { enableDemoMode, disableDemoMode } = useDemoStore();

  useEffect(() => {
    // Enter demo environment
    enableDemoMode();
    
    // Exit demo environment when leaving
    return () => {
      disableDemoMode();
    };
  }, [enableDemoMode, disableDemoMode]);

  return (
    <>
      <DemoBanner />
      {children}
    </>
  );
}
