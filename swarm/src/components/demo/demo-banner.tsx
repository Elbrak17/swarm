'use client';

import { useState, useEffect } from 'react';
import { useDemoStore } from '@/store/demo-store';
import { 
  Eye, 
  X, 
  RefreshCw, 
  Wallet, 
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatUnits } from 'viem';
import { MNEE_DECIMALS } from '@/lib/constants';
import { cn } from '@/lib/utils';

/**
 * Premium Demo Mode Banner
 * Mobile-first design with expandable details
 */
export function DemoBanner() {
  const { 
    isDemoMode: rawDemoMode, 
    demoBalance, 
    disableDemoMode, 
    resetDemoData, 
    demoTransactions,
    demoSwarms,
    demoJobs 
  } = useDemoStore();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Only use demo mode after hydration
  const isDemoMode = isHydrated && rawDemoMode;

  // Animate on balance change
  useEffect(() => {
    if (isDemoMode) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 600);
      return () => clearTimeout(timer);
    }
  }, [demoBalance, isDemoMode]);

  if (!isDemoMode) return null;

  const formattedBalance = parseFloat(formatUnits(BigInt(demoBalance), MNEE_DECIMALS)).toLocaleString('en-US', {
    maximumFractionDigits: 0
  });
  const txCount = demoTransactions.length;
  const swarmCount = demoSwarms.length;
  const jobCount = demoJobs.length;

  return (
    <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-lg">
      {/* Main Banner - Always visible */}
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between h-12 sm:h-10">
          {/* Left: Demo indicator + Balance */}
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1"
          >
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className="relative">
                <Eye className="w-4 h-4" />
                <Sparkles className="w-2 h-2 absolute -top-0.5 -right-0.5 text-yellow-200 animate-pulse" />
              </div>
              <span className="font-semibold text-sm hidden xs:inline">Demo</span>
            </div>
            
            {/* Balance - prominent on mobile */}
            <div className={cn(
              "flex items-center gap-1.5 px-2 py-0.5 bg-white/20 rounded-full transition-all duration-300",
              isAnimating && "scale-110 bg-white/30"
            )}>
              <Wallet className="w-3 h-3" />
              <span className="font-bold text-sm tabular-nums">{formattedBalance}</span>
              <span className="text-xs opacity-80">MNEE</span>
            </div>

            {/* Expand indicator - mobile */}
            <div className="sm:hidden">
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 opacity-70" />
              ) : (
                <ChevronDown className="w-4 h-4 opacity-70" />
              )}
            </div>

            {/* Desktop stats */}
            <div className="hidden sm:flex items-center gap-3 text-xs opacity-90">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {txCount} tx
              </span>
              <span>•</span>
              <span>{swarmCount} swarms</span>
              <span>•</span>
              <span>{jobCount} jobs</span>
            </div>
          </button>

          {/* Right: Actions */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                resetDemoData();
              }}
              className="h-7 px-2 sm:px-3 text-white hover:bg-white/20 hover:text-white"
              title="Reset demo data"
            >
              <RefreshCw className="w-3.5 h-3.5 sm:mr-1" />
              <span className="hidden sm:inline text-xs">Reset</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                disableDemoMode();
              }}
              className="h-7 px-2 sm:px-3 text-white hover:bg-white/20 hover:text-white"
              title="Exit demo mode"
            >
              <X className="w-3.5 h-3.5 sm:mr-1" />
              <span className="hidden sm:inline text-xs">Exit</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Expanded Details - Mobile */}
      <div className={cn(
        "sm:hidden overflow-hidden transition-all duration-300 ease-out",
        isExpanded ? "max-h-32 opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="container mx-auto px-3 pb-3">
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/20">
            <div className="text-center p-2 bg-white/10 rounded-lg">
              <div className="text-lg font-bold">{txCount}</div>
              <div className="text-[10px] uppercase tracking-wide opacity-80">Transactions</div>
            </div>
            <div className="text-center p-2 bg-white/10 rounded-lg">
              <div className="text-lg font-bold">{swarmCount}</div>
              <div className="text-[10px] uppercase tracking-wide opacity-80">Swarms</div>
            </div>
            <div className="text-center p-2 bg-white/10 rounded-lg">
              <div className="text-lg font-bold">{jobCount}</div>
              <div className="text-[10px] uppercase tracking-wide opacity-80">Jobs</div>
            </div>
          </div>
          <p className="text-[10px] text-center mt-2 opacity-70">
            Demo mode • Simulated data • No real transactions
          </p>
        </div>
      </div>
    </div>
  );
}
