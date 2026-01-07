/**
 * useJobProgress Hook
 * 
 * Subscribe to real-time job progress updates via Pusher
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
import type { JobProgressUpdate } from '@/types';

interface UseJobProgressOptions {
  /** Whether to automatically subscribe on mount */
  autoSubscribe?: boolean;
}

interface UseJobProgressReturn {
  /** Current progress update for the job */
  progress: JobProgressUpdate | undefined;
  /** Whether Pusher is connected */
  isConnected: boolean;
  /** Connection error if any */
  connectionError: string | null;
  /** Manually subscribe to job progress */
  subscribe: () => void;
  /** Manually unsubscribe from job progress */
  unsubscribe: () => void;
}

/**
 * Hook to subscribe to real-time job progress updates
 */
export function useJobProgress(
  jobId: string | undefined,
  options: UseJobProgressOptions = {}
): UseJobProgressReturn {
  const { autoSubscribe = true } = options;
  
  const {
    updateJobProgress,
    clearJobProgress,
    getJobProgress,
    setConnected,
    setConnectionError,
    isConnected,
    connectionError,
  } = useRealtimeStore();

  const progress = jobId ? getJobProgress(jobId) : undefined;

  const subscribe = useCallback(() => {
    if (!jobId) return;

    const client = getPusherClient();
    if (!client) {
      setConnectionError('Pusher client not available');
      return;
    }

    const channelName = PUSHER_CHANNELS.job(jobId);
    const channel = subscribeToChannel(channelName);
    
    if (!channel) {
      setConnectionError('Failed to subscribe to channel');
      return;
    }

    // Handle job progress events
    channel.bind(PUSHER_EVENTS.JOB_PROGRESS, (data: JobProgressUpdate) => {
      console.log('[JobProgress] Received update:', data);
      updateJobProgress(data);
    });

    // Handle job completion
    channel.bind(PUSHER_EVENTS.JOB_COMPLETED, (data: { jobId: string }) => {
      console.log('[JobProgress] Job completed:', data);
      // Update progress to 100% complete
      updateJobProgress({
        jobId: data.jobId,
        stage: 'complete',
        agentId: '',
        message: 'Job completed successfully',
        progress: 100,
      });
    });

    // Handle job started
    channel.bind(PUSHER_EVENTS.JOB_STARTED, (data: { jobId: string }) => {
      console.log('[JobProgress] Job started:', data);
      updateJobProgress({
        jobId: data.jobId,
        stage: 'routing',
        agentId: '',
        message: 'Job execution started',
        progress: 0,
      });
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
  }, [jobId, updateJobProgress, setConnected, setConnectionError]);

  const unsubscribe = useCallback(() => {
    if (!jobId) return;
    
    const channelName = PUSHER_CHANNELS.job(jobId);
    unsubscribeFromChannel(channelName);
    clearJobProgress(jobId);
  }, [jobId, clearJobProgress]);

  // Auto-subscribe on mount if enabled
  useEffect(() => {
    if (autoSubscribe && jobId) {
      subscribe();
    }

    return () => {
      if (jobId) {
        unsubscribe();
      }
    };
  }, [jobId, autoSubscribe, subscribe, unsubscribe]);

  return {
    progress,
    isConnected,
    connectionError,
    subscribe,
    unsubscribe,
  };
}

export default useJobProgress;
