/**
 * useMarketplaceEvents Hook
 * 
 * Subscribe to global marketplace events via Pusher
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

interface UseMarketplaceEventsOptions {
  /** Whether to automatically subscribe on mount */
  autoSubscribe?: boolean;
}

interface UseMarketplaceEventsReturn {
  /** Recent payments across all swarms */
  payments: PaymentEvent[];
  /** Recent agent activity across all swarms */
  agentActivity: AgentActivityEvent[];
  /** Whether Pusher is connected */
  isConnected: boolean;
  /** Connection error if any */
  connectionError: string | null;
  /** Manually subscribe to marketplace events */
  subscribe: () => void;
  /** Manually unsubscribe from marketplace events */
  unsubscribe: () => void;
}

/**
 * Hook to subscribe to global marketplace events
 */
export function useMarketplaceEvents(
  options: UseMarketplaceEventsOptions = {}
): UseMarketplaceEventsReturn {
  const { autoSubscribe = true } = options;
  
  const {
    payments,
    agentActivity,
    addPayment,
    addAgentActivity,
    setConnected,
    setConnectionError,
    isConnected,
    connectionError,
  } = useRealtimeStore();

  const subscribe = useCallback(() => {
    const client = getPusherClient();
    if (!client) {
      setConnectionError('Pusher client not available');
      return;
    }

    const channel = subscribeToChannel(PUSHER_CHANNELS.marketplace);
    
    if (!channel) {
      setConnectionError('Failed to subscribe to marketplace channel');
      return;
    }

    // Handle new job events
    channel.bind(PUSHER_EVENTS.NEW_JOB, (data: { jobId: string; title: string; payment: string }) => {
      console.log('[Marketplace] New job:', data);
      // Could add to a jobs list if needed
    });

    // Handle new swarm events
    channel.bind(PUSHER_EVENTS.NEW_SWARM, (data: { swarmId: string; name: string }) => {
      console.log('[Marketplace] New swarm:', data);
      // Could add to a swarms list if needed
    });

    // Handle payment flow events (broadcast to marketplace)
    channel.bind(PUSHER_EVENTS.PAYMENT_FLOW, (data: PaymentEvent) => {
      console.log('[Marketplace] Payment:', data);
      addPayment(data);
    });

    // Handle agent activity events (broadcast to marketplace)
    channel.bind(PUSHER_EVENTS.AGENT_ACTIVITY, (data: AgentActivityEvent) => {
      console.log('[Marketplace] Agent activity:', data);
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
  }, [addPayment, addAgentActivity, setConnected, setConnectionError]);

  const unsubscribe = useCallback(() => {
    unsubscribeFromChannel(PUSHER_CHANNELS.marketplace);
  }, []);

  // Auto-subscribe on mount if enabled
  useEffect(() => {
    if (autoSubscribe) {
      subscribe();
    }

    return () => {
      unsubscribe();
    };
  }, [autoSubscribe, subscribe, unsubscribe]);

  return {
    payments,
    agentActivity,
    isConnected,
    connectionError,
    subscribe,
    unsubscribe,
  };
}

export default useMarketplaceEvents;
