/**
 * Pusher Client Configuration
 * 
 * Client-side Pusher configuration for subscribing to real-time events
 * Used by frontend components to receive live updates
 */

'use client';

import Pusher from 'pusher-js';
import type { Channel } from 'pusher-js';

/**
 * Re-export channel naming conventions from server config
 * These are shared between client and server
 */
export const PUSHER_CHANNELS = {
  job: (jobId: string) => `job-${jobId}`,
  swarm: (swarmId: string) => `swarm-${swarmId}`,
  marketplace: 'marketplace',
  user: (address: string) => `user-${address.toLowerCase()}`,
} as const;

/**
 * Event types for each channel
 */
export const PUSHER_EVENTS = {
  // Job channel events
  JOB_PROGRESS: 'job-progress',
  JOB_COMPLETED: 'job-completed',
  JOB_STARTED: 'job-started',
  
  // Swarm channel events
  PAYMENT_FLOW: 'payment-flow',
  AGENT_ACTIVITY: 'agent-activity',
  
  // Marketplace channel events
  NEW_JOB: 'new-job',
  NEW_SWARM: 'new-swarm',
  BID_RECEIVED: 'bid-received',
  
  // User channel events
  NOTIFICATION: 'notification',
} as const;

/**
 * Pusher client instance (singleton)
 */
let pusherClient: Pusher | null = null;

/**
 * Get or create the Pusher client instance
 */
export function getPusherClient(): Pusher | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!pusherClient) {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2';

    if (!key) {
      console.warn('[Pusher Client] Missing NEXT_PUBLIC_PUSHER_KEY');
      return null;
    }

    pusherClient = new Pusher(key, {
      cluster,
      // Enable encrypted connection
      forceTLS: true,
      // Reconnection settings
      activityTimeout: 120000, // 2 minutes
      pongTimeout: 30000, // 30 seconds
    });

    // Log connection state changes
    pusherClient.connection.bind('state_change', (states: { current: string; previous: string }) => {
      console.log(`[Pusher] Connection state: ${states.previous} -> ${states.current}`);
    });

    pusherClient.connection.bind('error', (error: Error) => {
      console.error('[Pusher] Connection error:', error);
    });
  }

  return pusherClient;
}

/**
 * Subscribe to a channel
 */
export function subscribeToChannel(channelName: string): Channel | null {
  const client = getPusherClient();
  if (!client) return null;

  const channel = client.subscribe(channelName);
  
  channel.bind('pusher:subscription_succeeded', () => {
    console.log(`[Pusher] Subscribed to ${channelName}`);
  });

  channel.bind('pusher:subscription_error', (error: Error) => {
    console.error(`[Pusher] Subscription error for ${channelName}:`, error);
  });

  return channel;
}

/**
 * Unsubscribe from a channel
 */
export function unsubscribeFromChannel(channelName: string): void {
  const client = getPusherClient();
  if (!client) return;

  client.unsubscribe(channelName);
  console.log(`[Pusher] Unsubscribed from ${channelName}`);
}

/**
 * Disconnect the Pusher client
 */
export function disconnectPusher(): void {
  if (pusherClient) {
    pusherClient.disconnect();
    pusherClient = null;
    console.log('[Pusher] Disconnected');
  }
}

/**
 * Get connection state
 */
export function getConnectionState(): string {
  const client = getPusherClient();
  return client?.connection.state || 'disconnected';
}

/**
 * Check if connected
 */
export function isConnected(): boolean {
  return getConnectionState() === 'connected';
}

export default getPusherClient;
