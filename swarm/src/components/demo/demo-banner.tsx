'use client';

import { useDemoStore } from '@/store/demo-store';
import { Eye, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatUnits } from 'viem';
import { MNEE_DECIMALS } from '@/lib/constants';

/**
 * Demo Mode Banner
 * Displays at the top of the page when demo mode is active
 */
export function DemoBanner() {
  const { isDemoMode, demoBalance, disableDemoMode, resetDemoData, demoTransactions } = useDemoStore();

  if (!isDemoMode) return null;

  const formattedBalance = parseFloat(formatUnits(BigInt(demoBalance), MNEE_DECIMALS)).toLocaleString();
  const txCount = demoTransactions.length;

  return (
    <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Eye className="w-4 h-4" />
          <span className="font-medium text-sm">Mode Démo</span>
          <span className="text-xs opacity-90">
            • Solde: {formattedBalance} MNEE • {txCount} transaction{txCount !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetDemoData}
            className="h-7 text-white hover:bg-white/20 hover:text-white"
            title="Réinitialiser les données démo"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Reset
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={disableDemoMode}
            className="h-7 text-white hover:bg-white/20 hover:text-white"
            title="Quitter le mode démo"
          >
            <X className="w-3 h-3 mr-1" />
            Quitter
          </Button>
        </div>
      </div>
    </div>
  );
}
