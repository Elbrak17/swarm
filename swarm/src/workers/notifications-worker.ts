import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '@/lib/redis';
import { QUEUE_NAMES, NotificationPayload } from '@/lib/queue';
import { getPusherServer } from '@/lib/pusher-server';
import type Pusher from 'pusher';

/**
 * Get the Pusher server instance for triggering events
 */
function getPusherClient(): Pusher {
  return getPusherServer();
}

/**
 * Process a notification task
 */
async function processNotification(job: Job<NotificationPayload>): Promise<void> {
  const { type, channel, data } = job.data;
  
  console.log(`[Notifications] Processing: ${type} -> ${channel}`);
  
  try {
    const pusher = getPusherClient();
    
    // Map notification types to Pusher events
    const eventMap: Record<NotificationPayload['type'], string> = {
      job_progress: 'progress-update',
      payment_flow: 'payment-flow',
      bid_received: 'bid-received',
      job_completed: 'job-completed',
    };
    
    const event = eventMap[type] || type;
    
    await pusher.trigger(channel, event, {
      ...data,
      timestamp: Date.now(),
    });
    
    console.log(`[Notifications] Sent: ${type} -> ${channel}`);
  } catch (error) {
    console.error(`[Notifications] Failed to send: ${type}`, error);
    throw error; // Re-throw to trigger retry
  }
}

/**
 * Create and start the notifications worker
 */
export function createNotificationsWorker(): Worker<NotificationPayload> {
  const connection = createRedisConnection();
  
  const worker = new Worker<NotificationPayload>(
    QUEUE_NAMES.NOTIFICATIONS,
    processNotification,
    {
      connection,
      concurrency: 10, // Process up to 10 notifications concurrently
      limiter: {
        max: 100,
        duration: 1000, // Max 100 notifications per second
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(`[Notifications] Job ${job.id} completed`);
  });

  worker.on('failed', (job, error) => {
    console.error(`[Notifications] Job ${job?.id} failed:`, error.message);
  });

  worker.on('error', (error) => {
    console.error('[Notifications] Worker error:', error);
  });

  console.log('[Notifications] Notifications worker started');
  
  return worker;
}

export default createNotificationsWorker;
