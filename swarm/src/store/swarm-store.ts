/**
 * Swarm Store - Zustand state management for swarms
 */

import { create } from 'zustand';
import type { Swarm } from '@/types';

interface SwarmState {
  // State
  swarms: Swarm[];
  selectedSwarm: Swarm | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setSwarms: (swarms: Swarm[]) => void;
  addSwarm: (swarm: Swarm) => void;
  updateSwarm: (id: string, updates: Partial<Swarm>) => void;
  removeSwarm: (id: string) => void;
  selectSwarm: (swarm: Swarm | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Computed helpers
  getSwarmById: (id: string) => Swarm | undefined;
  getSwarmsByOwner: (owner: string) => Swarm[];
  getActiveSwarms: () => Swarm[];
  getSwarmsSortedByRating: () => Swarm[];
}

export const useSwarmStore = create<SwarmState>((set, get) => ({
  // Initial state
  swarms: [],
  selectedSwarm: null,
  isLoading: false,
  error: null,

  // Actions
  setSwarms: (swarms) => set({ swarms }),
  
  addSwarm: (swarm) => set((state) => ({ 
    swarms: [...state.swarms, swarm] 
  })),
  
  updateSwarm: (id, updates) => set((state) => ({
    swarms: state.swarms.map((s) => 
      s.id === id ? { ...s, ...updates } : s
    ),
    selectedSwarm: state.selectedSwarm?.id === id 
      ? { ...state.selectedSwarm, ...updates }
      : state.selectedSwarm,
  })),
  
  removeSwarm: (id) => set((state) => ({
    swarms: state.swarms.filter((s) => s.id !== id),
    selectedSwarm: state.selectedSwarm?.id === id ? null : state.selectedSwarm,
  })),
  
  selectSwarm: (swarm) => set({ selectedSwarm: swarm }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),
  
  clearError: () => set({ error: null }),

  // Computed helpers
  getSwarmById: (id) => get().swarms.find((s) => s.id === id),
  
  getSwarmsByOwner: (owner) => 
    get().swarms.filter((s) => s.owner.toLowerCase() === owner.toLowerCase()),
  
  getActiveSwarms: () => 
    get().swarms.filter((s) => s.isActive),
  
  getSwarmsSortedByRating: () => 
    [...get().swarms].sort((a, b) => b.rating - a.rating),
}));
