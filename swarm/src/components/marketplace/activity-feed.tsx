/**
 * ActivityFeed Component
 * 
 * Displays recent transactions and agent activity with real-time updates
 */

'use client';

import { useMarketplaceEvents } from '@/hooks/use-marketplace-events';
import { cn } from '@/lib/utils';
import { formatUnits } from 'viem';
import { motion, AnimatePresence } from 'framer-motion';
import type { PaymentEvent, AgentActivityEvent } from '@/types';

interface ActivityFeedProps {
  className?: string;
  maxItems?: number;
  showHeader?: boolean;
}

/**
 * Truncate address for display
 */
function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format timestamp to relative time
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) {
    return 'Just now';
  } else if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  } else if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diff / 86400000);
    return `${days}d ago`;
  }
}

/**
 * Activity item types
 */
type ActivityItem = 
  | { type: 'payment'; data: PaymentEvent }
  | { type: 'activity'; data: AgentActivityEvent };

/**
 * Payment activity item
 */
function PaymentItem({ payment }: { payment: PaymentEvent }) {
  const amount = formatUnits(BigInt(payment.amount), 18);
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg"
    >
      {/* Icon */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
        <span className="text-green-500">💸</span>
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-green-500">Payment</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground text-xs">
            {formatRelativeTime(payment.timestamp)}
          </span>
        </div>
        <div className="text-sm mt-1">
          <span className="font-mono text-xs">{truncateAddress(payment.fromAgent)}</span>
          <span className="mx-2 text-muted-foreground">→</span>
          <span className="font-mono text-xs">{truncateAddress(payment.toAgent)}</span>
        </div>
        <div className="text-sm font-medium text-green-500 mt-1">
          +{parseFloat(amount).toFixed(4)} MNEE
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Agent activity item
 */
function AgentActivityItem({ activity }: { activity: AgentActivityEvent }) {
  const actionConfig = {
    task_started: {
      icon: '🚀',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/20',
      label: 'Task Started',
    },
    task_completed: {
      icon: '✅',
      color: 'text-green-500',
      bgColor: 'bg-green-500/20',
      label: 'Task Completed',
    },
    payment_received: {
      icon: '💰',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/20',
      label: 'Payment Received',
    },
  };

  const config = actionConfig[activity.action];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg"
    >
      {/* Icon */}
      <div className={cn(
        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
        config.bgColor
      )}>
        <span>{config.icon}</span>
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span className={cn('font-medium', config.color)}>{config.label}</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground text-xs">
            {formatRelativeTime(activity.timestamp)}
          </span>
        </div>
        <div className="text-sm mt-1">
          <span className="font-mono text-xs">{truncateAddress(activity.agentAddress)}</span>
        </div>
        {activity.details && (
          <div className="text-xs text-muted-foreground mt-1 truncate">
            {activity.details}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Connection status indicator
 */
function ConnectionStatus({ 
  isConnected, 
  error 
}: { 
  isConnected: boolean; 
  error: string | null;
}) {
  if (error) {
    return (
      <div className="flex items-center gap-2 text-xs text-destructive">
        <span className="w-2 h-2 rounded-full bg-destructive" />
        Error
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span 
        className={cn(
          'w-2 h-2 rounded-full',
          isConnected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'
        )} 
      />
      {isConnected ? 'Live' : 'Connecting...'}
    </div>
  );
}

/**
 * Empty state component
 */
function EmptyState() {
  return (
    <div className="text-center py-8">
      <div className="text-4xl mb-2">📭</div>
      <p className="text-sm text-muted-foreground">No recent activity</p>
      <p className="text-xs text-muted-foreground mt-1">
        Transactions will appear here in real-time
      </p>
    </div>
  );
}

/**
 * Main ActivityFeed component
 */
export function ActivityFeed({ 
  className, 
  maxItems = 10,
  showHeader = true,
}: ActivityFeedProps) {
  const { 
    payments, 
    agentActivity, 
    isConnected, 
    connectionError 
  } = useMarketplaceEvents();

  // Combine and sort all activities by timestamp
  const allActivities: ActivityItem[] = [
    ...payments.map(p => ({ type: 'payment' as const, data: p })),
    ...agentActivity.map(a => ({ type: 'activity' as const, data: a })),
  ]
    .sort((a, b) => {
      const timestampA = a.type === 'payment' ? a.data.timestamp : a.data.timestamp;
      const timestampB = b.type === 'payment' ? b.data.timestamp : b.data.timestamp;
      return timestampB - timestampA;
    })
    .slice(0, maxItems);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Activity Feed</h3>
          <ConnectionStatus isConnected={isConnected} error={connectionError} />
        </div>
      )}

      {/* Activity list */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {allActivities.length === 0 ? (
            <EmptyState />
          ) : (
            allActivities.map((item) => {
              const key = item.type === 'payment' 
                ? `payment-${item.data.id}` 
                : `activity-${item.data.agentAddress}-${item.data.timestamp}`;
              
              return item.type === 'payment' ? (
                <PaymentItem key={key} payment={item.data} />
              ) : (
                <AgentActivityItem key={key} activity={item.data} />
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default ActivityFeed;
