/**
 * Pusher Server Configuration
 * 
 * Server-side Pusher client for triggering real-time events
 * Used by backend services to broadcast updates to connected clients
 */

import Pusher from 'pusher';

/**
 * Channel naming conventions:
 * - `job-{jobId}`: Job-specific events (progress, completion)
 * - `swarm-{swarmId}`: Swarm-specific events (payments, agent activity)
 * - `marketplace`: Global marketplace events (new jobs, new swarms)
 * - `user-{address}`: User-specific notifications
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
 * Pusher server instance (singleton)
 */
let pusherServer: Pusher | null = null;

/**
 * Get or create the Pusher server instance
 */
export function getPusherServer(): Pusher {
  if (!pusherServer) {
    const appId = process.env.PUSHER_APP_ID;
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const secret = process.env.PUSHER_SECRET;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2';

    if (!appId || !key || !secret) {
      console.warn('[Pusher] Missing configuration, using mock client');
      // Return a mock Pusher instance for development without Pusher
      return createMockPusher();
    }

    pusherServer = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    });
  }

  return pusherServer;
}

/**
 * Create a mock Pusher instance for development
 */
function createMockPusher(): Pusher {
  return {
    trigger: async (channel: string | string[], event: string, data: unknown) => {
      console.log(`[Pusher Mock] ${channel}:${event}`, data);
      return {} as Pusher.Response;
    },
    triggerBatch: async (batch: Pusher.BatchEvent[]) => {
      batch.forEach((event) => {
        console.log(`[Pusher Mock Batch] ${event.channel}:${event.name}`, event.data);
      });
      return {} as Pusher.Response;
    },
  } as unknown as Pusher;
}

/**
 * Trigger a job progress update
 */
export async function triggerJobProgress(
  jobId: string,
  data: {
    stage: 'routing' | 'processing' | 'qa' | 'complete';
    agentId: string;
    message: string;
    progress: number;
  }
) {
  const pusher = getPusherServer();
  const channel = PUSHER_CHANNELS.job(jobId);
  
  await pusher.trigger(channel, PUSHER_EVENTS.JOB_PROGRESS, {
    jobId,
    ...data,
    timestamp: Date.now(),
  });
}

/**
 * Trigger a job completion event
 */
export async function triggerJobCompleted(
  jobId: string,
  data: {
    resultHash: string;
    totalCost?: number;
  }
) {
  const pusher = getPusherServer();
  const channel = PUSHER_CHANNELS.job(jobId);
  
  await pusher.trigger(channel, PUSHER_EVENTS.JOB_COMPLETED, {
    jobId,
    ...data,
    timestamp: Date.now(),
  });
}

/**
 * Trigger a payment flow event
 */
export async function triggerPaymentFlow(
  swarmId: string,
  data: {
    id: string;
    fromAgent: string;
    toAgent: string;
    amount: string;
    jobId: string;
  }
) {
  const pusher = getPusherServer();
  const channel = PUSHER_CHANNELS.swarm(swarmId);
  
  await pusher.trigger(channel, PUSHER_EVENTS.PAYMENT_FLOW, {
    swarmId,
    ...data,
    timestamp: Date.now(),
  });
}

/**
 * Trigger an agent activity event
 */
export async function triggerAgentActivity(
  swarmId: string,
  data: {
    agentAddress: string;
    action: 'task_started' | 'task_completed' | 'payment_received';
    details: string;
  }
) {
  const pusher = getPusherServer();
  const channel = PUSHER_CHANNELS.swarm(swarmId);
  
  await pusher.trigger(channel, PUSHER_EVENTS.AGENT_ACTIVITY, {
    swarmId,
    ...data,
    timestamp: Date.now(),
  });
}

/**
 * Trigger a new job event on marketplace
 */
export async function triggerNewJob(data: {
  jobId: string;
  title: string;
  payment: string;
  clientAddr: string;
}) {
  const pusher = getPusherServer();
  
  await pusher.trigger(PUSHER_CHANNELS.marketplace, PUSHER_EVENTS.NEW_JOB, {
    ...data,
    timestamp: Date.now(),
  });
}

/**
 * Trigger a bid received event
 */
export async function triggerBidReceived(
  jobId: string,
  clientAddr: string,
  data: {
    bidId: string;
    swarmId: string;
    swarmName: string;
    price: string;
    estimatedTime: number;
  }
) {
  const pusher = getPusherServer();
  
  // Notify on job channel
  await pusher.trigger(PUSHER_CHANNELS.job(jobId), PUSHER_EVENTS.BID_RECEIVED, {
    jobId,
    ...data,
    timestamp: Date.now(),
  });
  
  // Also notify the job owner
  await pusher.trigger(PUSHER_CHANNELS.user(clientAddr), PUSHER_EVENTS.NOTIFICATION, {
    type: 'bid_received',
    message: `New bid received from ${data.swarmName}`,
    jobId,
    ...data,
    timestamp: Date.now(),
  });
}

export default getPusherServer;
