import { Queue, Worker, Job } from 'bullmq';
import { createRedisConnection } from './redis';

/**
 * Queue names for different job types
 */
export const QUEUE_NAMES = {
  JOB_EXECUTION: 'job-execution',
  NOTIFICATIONS: 'notifications',
} as const;

/**
 * Job execution payload type
 */
export interface JobExecutionPayload {
  jobId: string;
  swarmId: string;
  jobDescription: string;
  requirements: string;
  onChainJobId: number;
}

/**
 * Notification payload type
 */
export interface NotificationPayload {
  type: 'job_progress' | 'payment_flow' | 'bid_received' | 'job_completed';
  channel: string;
  data: Record<string, unknown>;
}

/**
 * Job progress update type
 */
export interface JobProgressUpdate {
  jobId: string;
  stage: 'routing' | 'processing' | 'qa' | 'complete';
  agentId: string;
  message: string;
  progress: number; // 0-100
}

/**
 * Create the job execution queue
 */
export const createJobExecutionQueue = () => {
  const connection = createRedisConnection();
  
  return new Queue<JobExecutionPayload>(QUEUE_NAMES.JOB_EXECUTION, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: {
        count: 100, // Keep last 100 completed jobs
      },
      removeOnFail: {
        count: 50, // Keep last 50 failed jobs
      },
    },
  });
};

/**
 * Create the notifications queue
 */
export const createNotificationsQueue = () => {
  const connection = createRedisConnection();
  
  return new Queue<NotificationPayload>(QUEUE_NAMES.NOTIFICATIONS, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 500,
      },
      removeOnComplete: {
        count: 1000,
      },
      removeOnFail: {
        count: 100,
      },
    },
  });
};

/**
 * Singleton queue instances
 */
let jobExecutionQueue: Queue<JobExecutionPayload> | null = null;
let notificationsQueue: Queue<NotificationPayload> | null = null;

export const getJobExecutionQueue = () => {
  if (!jobExecutionQueue) {
    jobExecutionQueue = createJobExecutionQueue();
  }
  return jobExecutionQueue;
};

export const getNotificationsQueue = () => {
  if (!notificationsQueue) {
    notificationsQueue = createNotificationsQueue();
  }
  return notificationsQueue;
};

/**
 * Add a job execution task to the queue
 */
export const queueJobExecution = async (payload: JobExecutionPayload) => {
  const queue = getJobExecutionQueue();
  
  const job = await queue.add('execute', payload, {
    jobId: `job-${payload.jobId}`,
  });
  
  console.log(`[Queue] Job execution queued: ${job.id}`);
  return job;
};

/**
 * Add a notification to the queue
 */
export const queueNotification = async (payload: NotificationPayload) => {
  const queue = getNotificationsQueue();
  
  const job = await queue.add('notify', payload);
  
  console.log(`[Queue] Notification queued: ${job.id}`);
  return job;
};

/**
 * Export types for workers
 */
export type { Queue, Worker, Job };
