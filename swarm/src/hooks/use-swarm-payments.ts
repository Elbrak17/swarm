/**
 * useSwarmPayments Hook
 * 
 * Subscribe to real-time payment flow events for a swarm via Pusher
 */

'use client';

import { useEffect, useCallback } from 'react';
import { useRealtimeStore } from '@/store/realtime-store';
import { 
  getPusherClient, 
  subscribeToChannel, 
  unsubscribeFromChannel,
  PUSHER_CHANNELS,
  PUSHER_EVENTS,
} from '@/lib/pusher-client';
import type { PaymentEvent, AgentActivityEvent } from '@/types';

interface UseSwarmPaymentsOptions {
  /** Whether to automatically subscribe on mount */
  autoSubscribe?: boolean;
}

interface UseSwarmPaymentsReturn {
  /** Recent payments for this swarm */
  payments: PaymentEvent[];
  /** Recent agent activity for this swarm */
  agentActivity: AgentActivityEvent[];
  /** Whether Pusher is connected */
  isConnected: boolean;
  /** Connection error if any */
  connectionError: string | null;
  /** Manually subscribe to swarm events */
  subscribe: () => void;
  /** Manually unsubscribe from swarm events */
  unsubscribe: () => void;
}

/**
 * Hook to subscribe to real-time payment flow events for a swarm
 */
export function useSwarmPayments(
  swarmId: string | undefined,
  options: UseSwarmPaymentsOptions = {}
): UseSwarmPaymentsReturn {
  const { autoSubscribe = true } = options;
  
  const {
    addPayment,
    addAgentActivity,
    getPaymentsBySwarm,
    getActivityBySwarm,
    setConnected,
    setConnectionError,
    isConnected,
    connectionError,
  } = useRealtimeStore();

  const payments = swarmId ? getPaymentsBySwarm(swarmId) : [];
  const agentActivity = swarmId ? getActivityBySwarm(swarmId) : [];

  const subscribe = useCallback(() => {
    if (!swarmId) return;

    const client = getPusherClient();
    if (!client) {
      setConnectionError('Pusher client not available');
      return;
    }

    const channelName = PUSHER_CHANNELS.swarm(swarmId);
    const channel = subscribeToChannel(channelName);
    
    if (!channel) {
      setConnectionError('Failed to subscribe to channel');
      return;
    }

    // Handle payment flow events
    channel.bind(PUSHER_EVENTS.PAYMENT_FLOW, (data: PaymentEvent) => {
      console.log('[SwarmPayments] Payment received:', data);
      addPayment(data);
    });

    // Handle agent activity events
    channel.bind(PUSHER_EVENTS.AGENT_ACTIVITY, (data: AgentActivityEvent) => {
      console.log('[SwarmPayments] Agent activity:', data);
      addAgentActivity(data);
    });

    // Update connection state
    client.connection.bind('connected', () => {
      setConnected(true);
      setConnectionError(null);
    });

    client.connection.bind('disconnected', () => {
      setConnected(false);
    });

    client.connection.bind('error', (error: Error) => {
      setConnectionError(error.message);
    });

    // Set initial connection state
    setConnected(client.connection.state === 'connected');
  }, [swarmId, addPayment, addAgentActivity, setConnected, setConnectionError]);

  const unsubscribe = useCallback(() => {
    if (!swarmId) return;
    
    const channelName = PUSHER_CHANNELS.swarm(swarmId);
    unsubscribeFromChannel(channelName);
  }, [swarmId]);

  // Auto-subscribe on mount if enabled
  useEffect(() => {
    if (autoSubscribe && swarmId) {
      subscribe();
    }

    return () => {
      if (swarmId) {
        unsubscribe();
      }
    };
  }, [swarmId, autoSubscribe, subscribe, unsubscribe]);

  return {
    payments,
    agentActivity,
    isConnected,
    connectionError,
    subscribe,
    unsubscribe,
  };
}

export default useSwarmPayments;
