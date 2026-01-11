'use client';

import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { formatUnits } from 'viem';
import { MNEE_DECIMALS } from '@/lib/constants';
import { Zap, Clock, Shield, Users } from 'lucide-react';

/**
 * Animated counter component
 */
function AnimatedCounter({ 
  value, 
  suffix = '',
  duration = 1000 
}: { 
  value: number; 
  suffix?: string;
  duration?: number;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const startValue = displayValue;
    const diff = value - startValue;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startValue + diff * easeOut;
      
      setDisplayValue(Math.round(current * 100) / 100);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return (
    <span>
      {displayValue.toLocaleString()}{suffix}
    </span>
  );
}

/**
 * Format MNEE amount from wei
 */
function formatMnee(weiAmount: string): number {
  try {
    const formatted = formatUnits(BigInt(weiAmount), MNEE_DECIMALS);
    return parseFloat(formatted);
  } catch {
    return 0;
  }
}

/**
 * LiveStats component for the landing page
 * Displays real-time platform metrics with auto-refresh
 */
export function LiveStats() {
  const { data: metrics, isLoading } = trpc.analytics.getDashboardMetrics.useQuery(
    undefined,
    {
      refetchInterval: 10000, // Refresh every 10 seconds
      staleTime: 5000,
    }
  );

  const stats = [
    {
      icon: <Zap className="w-6 h-6 text-green-600 dark:text-green-400" />,
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      value: metrics?.completedJobs || 0,
      suffix: '',
      label: 'Jobs Completed',
    },
    {
      icon: <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      value: formatMnee(metrics?.totalMneeVolume || '0'),
      suffix: ' MNEE',
      label: 'Total Transacted',
    },
    {
      icon: <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />,
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      value: metrics?.avgCompletionTime || 0,
      suffix: 'h',
      label: 'Avg Completion',
    },
    {
      icon: <Users className="w-6 h-6 text-amber-600 dark:text-amber-400" />,
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      value: metrics?.activeSwarms || 0,
      suffix: '',
      label: 'Active Swarms',
    },
  ];

  return (
    <section className="container py-16">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 max-w-4xl mx-auto">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="flex flex-col items-center p-6 rounded-2xl bg-white dark:bg-slate-800/50 shadow-lg border border-slate-200 dark:border-slate-700"
          >
            <div className={`w-12 h-12 rounded-full ${stat.bgColor} flex items-center justify-center mb-4`}>
              {stat.icon}
            </div>
            <div className="text-2xl md:text-3xl font-bold text-primary mb-1">
              {isLoading ? (
                <span className="animate-pulse">...</span>
              ) : (
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              )}
            </div>
            <div className="text-sm text-muted-foreground text-center">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
      
      {/* Live indicator */}
      <div className="flex items-center justify-center gap-2 mt-6 text-sm text-muted-foreground">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        Live data • Auto-refreshes every 10s
      </div>
    </section>
  );
}

export default LiveStats;
