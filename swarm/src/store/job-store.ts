/**
 * Job Store - Zustand state management for jobs
 */

import { create } from 'zustand';
import type { Job, JobFilters } from '@/types';
import { JobStatus } from '@/lib/constants';

interface JobState {
  // State
  jobs: Job[];
  selectedJob: Job | null;
  filters: JobFilters;
  isLoading: boolean;
  error: string | null;

  // Actions
  setJobs: (jobs: Job[]) => void;
  addJob: (job: Job) => void;
  updateJob: (id: string, updates: Partial<Job>) => void;
  removeJob: (id: string) => void;
  selectJob: (job: Job | null) => void;
  setFilters: (filters: Partial<JobFilters>) => void;
  clearFilters: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Computed helpers
  getJobById: (id: string) => Job | undefined;
  getJobsByStatus: (status: JobStatus) => Job[];
  getJobsByClient: (clientAddr: string) => Job[];
  getFilteredJobs: () => Job[];
  getOpenJobs: () => Job[];
}

export const useJobStore = create<JobState>((set, get) => ({
  // Initial state
  jobs: [],
  selectedJob: null,
  filters: {
    status: null,
    minPayment: null,
    clientAddr: null,
  },
  isLoading: false,
  error: null,

  // Actions
  setJobs: (jobs) => set({ jobs }),

  addJob: (job) => set((state) => ({
    jobs: [job, ...state.jobs],
  })),

  updateJob: (id, updates) => set((state) => ({
    jobs: state.jobs.map((j) =>
      j.id === id ? { ...j, ...updates } : j
    ),
    selectedJob: state.selectedJob?.id === id
      ? { ...state.selectedJob, ...updates }
      : state.selectedJob,
  })),

  removeJob: (id) => set((state) => ({
    jobs: state.jobs.filter((j) => j.id !== id),
    selectedJob: state.selectedJob?.id === id ? null : state.selectedJob,
  })),

  selectJob: (job) => set({ selectedJob: job }),

  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters },
  })),

  clearFilters: () => set({
    filters: {
      status: null,
      minPayment: null,
      clientAddr: null,
    },
  }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  // Computed helpers
  getJobById: (id) => get().jobs.find((j) => j.id === id),

  getJobsByStatus: (status) =>
    get().jobs.filter((j) => j.status === status),

  getJobsByClient: (clientAddr) =>
    get().jobs.filter((j) => j.clientAddr.toLowerCase() === clientAddr.toLowerCase()),

  getFilteredJobs: () => {
    const { jobs, filters } = get();
    let filtered = [...jobs];

    if (filters.status) {
      filtered = filtered.filter((j) => j.status === filters.status);
    }

    if (filters.minPayment) {
      filtered = filtered.filter((j) => 
        BigInt(j.payment) >= BigInt(filters.minPayment!)
      );
    }

    if (filters.clientAddr) {
      filtered = filtered.filter((j) => 
        j.clientAddr.toLowerCase() === filters.clientAddr!.toLowerCase()
      );
    }

    return filtered;
  },

  getOpenJobs: () =>
    get().jobs.filter((j) => j.status === JobStatus.OPEN),
}));
