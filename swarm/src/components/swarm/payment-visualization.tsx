/**
 * PaymentVisualization Component
 * 
 * 2D visualization of agent nodes with animated payment flows
 * Shows agents as nodes and payments as animated edges
 */

'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwarmPayments } from '@/hooks/use-swarm-payments';
import { cn } from '@/lib/utils';
import { formatUnits } from 'viem';
import type { PaymentEvent } from '@/types';

interface AgentData {
  id: string;
  address: string;
  role: string;
}

interface PaymentVisualizationProps {
  swarmId: string;
  agents: AgentData[];
  className?: string;
}

/**
 * Agent role colors
 */
const ROLE_COLORS = {
  ROUTER: {
    bg: 'bg-blue-500',
    border: 'border-blue-400',
    glow: 'shadow-blue-500/50',
  },
  WORKER: {
    bg: 'bg-yellow-500',
    border: 'border-yellow-400',
    glow: 'shadow-yellow-500/50',
  },
  QA: {
    bg: 'bg-purple-500',
    border: 'border-purple-400',
    glow: 'shadow-purple-500/50',
  },
} as const;

/**
 * Calculate node positions in a circle layout
 */
function calculateNodePositions(count: number, radius: number = 120) {
  const positions: { x: number; y: number }[] = [];
  const centerX = 150;
  const centerY = 150;
  
  for (let i = 0; i < count; i++) {
    const angle = (i * 2 * Math.PI) / count - Math.PI / 2; // Start from top
    positions.push({
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    });
  }
  
  return positions;
}

/**
 * Truncate address for display
 */
function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Agent node component
 */
function AgentNode({ 
  agent, 
  position, 
  isActive,
  recentPayment,
}: { 
  agent: AgentData; 
  position: { x: number; y: number };
  isActive: boolean;
  recentPayment: PaymentEvent | null;
}) {
  const colors = ROLE_COLORS[agent.role as keyof typeof ROLE_COLORS] || ROLE_COLORS.WORKER;
  
  return (
    <motion.div
      className="absolute"
      style={{ 
        left: position.x - 30, 
        top: position.y - 30,
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      {/* Node circle */}
      <motion.div
        className={cn(
          'w-[60px] h-[60px] rounded-full flex items-center justify-center',
          'border-2 cursor-pointer transition-all',
          colors.bg,
          colors.border,
          isActive && `shadow-lg ${colors.glow}`
        )}
        animate={isActive ? { scale: [1, 1.1, 1] } : {}}
        transition={{ repeat: isActive ? Infinity : 0, duration: 1 }}
      >
        <span className="text-white text-xl">
          {agent.role === 'ROUTER' && '🔀'}
          {agent.role === 'WORKER' && '⚙️'}
          {agent.role === 'QA' && '✅'}
        </span>
      </motion.div>
      
      {/* Label */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <span className="text-xs font-medium">{agent.role}</span>
      </div>
      
      {/* Address tooltip */}
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <span className="text-xs text-muted-foreground">
          {truncateAddress(agent.address)}
        </span>
      </div>

      {/* Payment indicator */}
      <AnimatePresence>
        {recentPayment && (
          <motion.div
            className="absolute -right-2 -top-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
          >
            +{formatUnits(BigInt(recentPayment.amount), 18).slice(0, 6)}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Animated payment edge between two nodes
 */
function PaymentEdge({
  from,
  to,
  amount,
  onComplete,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  amount: string;
  onComplete: () => void;
}) {
  return (
    <svg className="absolute inset-0 pointer-events-none" style={{ width: 300, height: 300 }}>
      {/* Static line */}
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke="currentColor"
        strokeWidth="2"
        className="text-muted-foreground/30"
      />
      
      {/* Animated payment dot */}
      <motion.circle
        r="8"
        fill="#22c55e"
        initial={{ cx: from.x, cy: from.y }}
        animate={{ cx: to.x, cy: to.y }}
        transition={{ duration: 1, ease: 'easeInOut' }}
        onAnimationComplete={onComplete}
      />
      
      {/* Amount label following the dot */}
      <motion.text
        className="text-xs fill-green-500 font-medium"
        initial={{ x: from.x, y: from.y - 15 }}
        animate={{ x: to.x, y: to.y - 15 }}
        transition={{ duration: 1, ease: 'easeInOut' }}
      >
        {formatUnits(BigInt(amount), 18).slice(0, 6)} MNEE
      </motion.text>
    </svg>
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
      <div className="flex items-center gap-2 text-sm text-destructive">
        <span className="w-2 h-2 rounded-full bg-destructive" />
        Error: {error}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
 * Main PaymentVisualization component
 */
export function PaymentVisualization({ 
  swarmId, 
  agents, 
  className 
}: PaymentVisualizationProps) {
  const { payments, isConnected, connectionError } = useSwarmPayments(swarmId);
  const [activePayments, setActivePayments] = useState<PaymentEvent[]>([]);
  const [recentPayments, setRecentPayments] = useState<Map<string, PaymentEvent>>(new Map());

  // Calculate node positions
  const nodePositions = useMemo(() => 
    calculateNodePositions(agents.length),
    [agents.length]
  );

  // Create address to index mapping
  const addressToIndex = useMemo(() => {
    const map = new Map<string, number>();
    agents.forEach((agent, index) => {
      map.set(agent.address.toLowerCase(), index);
    });
    return map;
  }, [agents]);

  // Handle new payments - animate them
  useEffect(() => {
    if (payments.length > 0) {
      const latestPayment = payments[0];
      
      // Check if this payment involves agents in this swarm
      const fromIndex = addressToIndex.get(latestPayment.fromAgent.toLowerCase());
      const toIndex = addressToIndex.get(latestPayment.toAgent.toLowerCase());
      
      if (fromIndex !== undefined && toIndex !== undefined) {
        // Add to active animations
        setActivePayments(prev => [...prev, latestPayment]);
        
        // Mark receiving agent as having recent payment
        setRecentPayments(prev => {
          const next = new Map(prev);
          next.set(latestPayment.toAgent.toLowerCase(), latestPayment);
          return next;
        });
        
        // Clear recent payment indicator after 3 seconds
        setTimeout(() => {
          setRecentPayments(prev => {
            const next = new Map(prev);
            next.delete(latestPayment.toAgent.toLowerCase());
            return next;
          });
        }, 3000);
      }
    }
  }, [payments, addressToIndex]);

  // Remove completed payment animations
  const handlePaymentComplete = (paymentId: string) => {
    setActivePayments(prev => prev.filter(p => p.id !== paymentId));
  };

  if (agents.length === 0) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        No agents in this swarm
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Payment Flow</h3>
        <ConnectionStatus isConnected={isConnected} error={connectionError} />
      </div>

      {/* Visualization container */}
      <div className="relative w-[300px] h-[300px] mx-auto bg-secondary/20 rounded-lg">
        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl">🐝</div>
            <div className="text-xs text-muted-foreground">Swarm</div>
          </div>
        </div>

        {/* Agent nodes */}
        {agents.map((agent, index) => (
          <AgentNode
            key={agent.id}
            agent={agent}
            position={nodePositions[index]}
            isActive={activePayments.some(
              p => p.fromAgent.toLowerCase() === agent.address.toLowerCase() ||
                   p.toAgent.toLowerCase() === agent.address.toLowerCase()
            )}
            recentPayment={recentPayments.get(agent.address.toLowerCase()) || null}
          />
        ))}

        {/* Payment animations */}
        <AnimatePresence>
          {activePayments.map((payment) => {
            const fromIndex = addressToIndex.get(payment.fromAgent.toLowerCase());
            const toIndex = addressToIndex.get(payment.toAgent.toLowerCase());
            
            if (fromIndex === undefined || toIndex === undefined) return null;
            
            return (
              <PaymentEdge
                key={payment.id}
                from={nodePositions[fromIndex]}
                to={nodePositions[toIndex]}
                amount={payment.amount}
                onComplete={() => handlePaymentComplete(payment.id)}
              />
            );
          })}
        </AnimatePresence>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Router</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span>Worker</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span>QA</span>
        </div>
      </div>

      {/* Recent payments list */}
      {payments.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Recent Payments</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {payments.slice(0, 5).map((payment) => (
              <div 
                key={payment.id} 
                className="flex items-center justify-between text-xs bg-secondary/50 rounded p-2"
              >
                <span className="text-muted-foreground">
                  {truncateAddress(payment.fromAgent)} → {truncateAddress(payment.toAgent)}
                </span>
                <span className="font-medium text-green-500">
                  +{formatUnits(BigInt(payment.amount), 18).slice(0, 8)} MNEE
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PaymentVisualization;
