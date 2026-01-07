/**
 * Realtime Store - Zustand state management for Pusher events
 */

import { create } from 'zustand';
import type { PaymentEvent, AgentActivityEvent, JobProgressUpdate } from '@/types';

// Maximum number of events to keep in memory
const MAX_EVENTS = 100;

interface RealtimeState {
  // State
  payments: PaymentEvent[];
  agentActivity: AgentActivityEvent[];
  jobProgress: Map<string, JobProgressUpdate>;
  isConnected: boolean;
  connectionError: string | null;

  // Actions
  addPayment: (payment: PaymentEvent) => void;
  addAgentActivity: (activity: AgentActivityEvent) => void;
  updateJobProgress: (update: JobProgressUpdate) => void;
  clearJobProgress: (jobId: string) => void;
  setConnected: (connected: boolean) => void;
  setConnectionError: (error: string | null) => void;
  clearOldEvents: () => void;
  reset: () => void;

  // Computed helpers
  getPaymentsBySwarm: (swarmId: string) => PaymentEvent[];
  getPaymentsByJob: (jobId: string) => PaymentEvent[];
  getActivityBySwarm: (swarmId: string) => AgentActivityEvent[];
  getJobProgress: (jobId: string) => JobProgressUpdate | undefined;
  getRecentPayments: (count?: number) => PaymentEvent[];
  getRecentActivity: (count?: number) => AgentActivityEvent[];
}

export const useRealtimeStore = create<RealtimeState>((set, get) => ({
  // Initial state
  payments: [],
  agentActivity: [],
  jobProgress: new Map(),
  isConnected: false,
  connectionError: null,

  // Actions
  addPayment: (payment) => set((state) => {
    const payments = [payment, ...state.payments].slice(0, MAX_EVENTS);
    return { payments };
  }),

  addAgentActivity: (activity) => set((state) => {
    const agentActivity = [activity, ...state.agentActivity].slice(0, MAX_EVENTS);
    return { agentActivity };
  }),

  updateJobProgress: (update) => set((state) => {
    const jobProgress = new Map(state.jobProgress);
    jobProgress.set(update.jobId, update);
    return { jobProgress };
  }),

  clearJobProgress: (jobId) => set((state) => {
    const jobProgress = new Map(state.jobProgress);
    jobProgress.delete(jobId);
    return { jobProgress };
  }),

  setConnected: (isConnected) => set({ isConnected }),

  setConnectionError: (connectionError) => set({ connectionError }),

  clearOldEvents: () => set((state) => {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    return {
      payments: state.payments.filter((p) => p.timestamp > oneHourAgo),
      agentActivity: state.agentActivity.filter((a) => a.timestamp > oneHourAgo),
    };
  }),

  reset: () => set({
    payments: [],
    agentActivity: [],
    jobProgress: new Map(),
    isConnected: false,
    connectionError: null,
  }),

  // Computed helpers
  getPaymentsBySwarm: (swarmId) =>
    get().payments.filter((p) => p.swarmId === swarmId),

  getPaymentsByJob: (jobId) =>
    get().payments.filter((p) => p.jobId === jobId),

  getActivityBySwarm: (swarmId) =>
    get().agentActivity.filter((a) => a.swarmId === swarmId),

  getJobProgress: (jobId) =>
    get().jobProgress.get(jobId),

  getRecentPayments: (count = 10) =>
    get().payments.slice(0, count),

  getRecentActivity: (count = 10) =>
    get().agentActivity.slice(0, count),
}));
