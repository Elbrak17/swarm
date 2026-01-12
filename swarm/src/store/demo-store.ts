'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Full Demo Mode Store
 * Simulates the entire SWARM marketplace experience without real blockchain transactions
 * Like OKX demo trading - everything works but with simulated data
 */

// Demo wallet configuration
export const DEMO_WALLET_ADDRESS = '0xDEMO000000000000000000000000000000000001' as const;
export const DEMO_MNEE_BALANCE = '50000000000000000000000'; // 50,000 MNEE starting balance

// Types for demo data
export interface DemoAgent {
  id: string;
  address: string;
  role: 'ROUTER' | 'WORKER' | 'QA';
}

export interface DemoSwarm {
  id: string;
  onChainId: string;
  name: string;
  description: string;
  owner: string;
  budget: string;
  rating: number;
  isActive: boolean;
  agents: DemoAgent[];
  createdAt: string;
}

export interface DemoBid {
  id: string;
  jobId: string;
  swarmId: string;
  swarmName: string;
  price: string;
  estimatedTime: number;
  message?: string;
  isAccepted: boolean;
  createdAt: string;
}

export interface DemoJob {
  id: string;
  onChainId: number;
  title: string;
  description: string;
  requirements?: string;
  payment: string;
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
  clientAddr: string;
  swarmId?: string;
  swarmName?: string;
  bids: DemoBid[];
  resultHash?: string;
  createdAt: string;
  completedAt?: string;
}

export interface DemoTransaction {
  id: string;
  txHash: string;
  type: 'JOB_ESCROW' | 'PAYMENT_RELEASE' | 'SWARM_REGISTER' | 'BID_ACCEPT';
  amount: string;
  description: string;
  timestamp: string;
}

interface DemoState {
  // Mode
  isDemoMode: boolean;
  
  // Wallet
  demoAddress: string;
  demoBalance: string;
  
  // Data
  demoSwarms: DemoSwarm[];
  demoJobs: DemoJob[];
  demoTransactions: DemoTransaction[];
  
  // Counters for IDs
  nextJobId: number;
  nextSwarmId: number;
  
  // Actions - Mode
  enableDemoMode: () => void;
  disableDemoMode: () => void;
  resetDemoData: () => void;
  
  // Actions - Swarm
  createDemoSwarm: (data: {
    name: string;
    description: string;
    agents: { address: string; role: 'ROUTER' | 'WORKER' | 'QA' }[];
  }) => Promise<DemoSwarm>;
  
  // Actions - Job
  createDemoJob: (data: {
    title: string;
    description: string;
    requirements?: string;
    payment: string;
  }) => Promise<DemoJob>;
  
  // Actions - Bid
  createDemoBid: (data: {
    jobId: string;
    swarmId: string;
    price: string;
    estimatedTime: number;
    message?: string;
  }) => Promise<DemoBid>;
  
  acceptDemoBid: (jobId: string, bidId: string) => Promise<void>;
  
  // Actions - Job Execution
  startDemoJobExecution: (jobId: string) => Promise<void>;
  completeDemoJob: (jobId: string) => Promise<void>;
  
  // Getters
  getDemoSwarm: (id: string) => DemoSwarm | undefined;
  getDemoJob: (id: string) => DemoJob | undefined;
  getDemoSwarmsByOwner: (owner: string) => DemoSwarm[];
  getOpenDemoJobs: () => DemoJob[];
  getDemoJobsByClient: (clientAddr: string) => DemoJob[];
}

// Helper to generate fake tx hash
const generateTxHash = () => {
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
};

// Helper to generate unique ID
const generateId = () => {
  return `demo_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

// Helper to simulate blockchain delay
const simulateBlockchainDelay = () => new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

// Initial demo data - some pre-existing swarms and jobs to make it feel alive
const INITIAL_DEMO_SWARMS: DemoSwarm[] = [
  {
    id: 'demo_swarm_1',
    onChainId: '0x1111111111111111111111111111111111111111111111111111111111111111',
    name: 'Customer Support Elite',
    description: 'Specialized in handling customer inquiries with 99% satisfaction rate. Our agents work 24/7 to resolve issues quickly.',
    owner: '0xABCD000000000000000000000000000000000001',
    budget: '5000000000000000000000',
    rating: 4.8,
    isActive: true,
    agents: [
      { id: 'agent_1', address: '0xAgent1000000000000000000000000000000001', role: 'ROUTER' },
      { id: 'agent_2', address: '0xAgent2000000000000000000000000000000002', role: 'WORKER' },
      { id: 'agent_3', address: '0xAgent3000000000000000000000000000000003', role: 'QA' },
    ],
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo_swarm_2',
    onChainId: '0x2222222222222222222222222222222222222222222222222222222222222222',
    name: 'Tech Support Wizards',
    description: 'Expert technical support team specializing in software troubleshooting and IT assistance.',
    owner: '0xABCD000000000000000000000000000000000002',
    budget: '3000000000000000000000',
    rating: 4.5,
    isActive: true,
    agents: [
      { id: 'agent_4', address: '0xAgent4000000000000000000000000000000004', role: 'ROUTER' },
      { id: 'agent_5', address: '0xAgent5000000000000000000000000000000005', role: 'WORKER' },
      { id: 'agent_6', address: '0xAgent6000000000000000000000000000000006', role: 'WORKER' },
      { id: 'agent_7', address: '0xAgent7000000000000000000000000000000007', role: 'QA' },
    ],
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const INITIAL_DEMO_JOBS: DemoJob[] = [
  {
    id: 'demo_job_1',
    onChainId: 1,
    title: 'Handle 100 Customer Support Tickets',
    description: 'We need a swarm to process and respond to 100 customer support tickets. Tickets include billing inquiries, product questions, and general support requests.',
    requirements: 'Must maintain professional tone. Response time under 2 hours per ticket.',
    payment: '500000000000000000000', // 500 MNEE
    status: 'OPEN',
    clientAddr: '0xClient00000000000000000000000000000001',
    bids: [],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo_job_2',
    onChainId: 2,
    title: 'Technical Documentation Review',
    description: 'Review and improve our API documentation. Check for accuracy, clarity, and completeness.',
    payment: '300000000000000000000', // 300 MNEE
    status: 'OPEN',
    clientAddr: '0xClient00000000000000000000000000000002',
    bids: [
      {
        id: 'demo_bid_1',
        jobId: 'demo_job_2',
        swarmId: 'demo_swarm_2',
        swarmName: 'Tech Support Wizards',
        price: '280000000000000000000',
        estimatedTime: 48,
        message: 'We have extensive experience with technical documentation.',
        isAccepted: false,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const useDemoStore = create<DemoState>()(
  persist(
    (set, get) => ({
      // Initial state
      isDemoMode: false,
      demoAddress: DEMO_WALLET_ADDRESS,
      demoBalance: DEMO_MNEE_BALANCE,
      demoSwarms: INITIAL_DEMO_SWARMS,
      demoJobs: INITIAL_DEMO_JOBS,
      demoTransactions: [],
      nextJobId: 100,
      nextSwarmId: 100,

      // Mode actions
      enableDemoMode: () => set({ isDemoMode: true }),
      disableDemoMode: () => set({ isDemoMode: false }),
      
      resetDemoData: () => set({
        demoBalance: DEMO_MNEE_BALANCE,
        demoSwarms: INITIAL_DEMO_SWARMS,
        demoJobs: INITIAL_DEMO_JOBS,
        demoTransactions: [],
        nextJobId: 100,
        nextSwarmId: 100,
      }),

      // Create swarm
      createDemoSwarm: async (data) => {
        await simulateBlockchainDelay();
        
        const state = get();
        const swarmId = generateId();
        const onChainId = `0x${state.nextSwarmId.toString(16).padStart(64, '0')}`;
        const txHash = generateTxHash();
        
        const newSwarm: DemoSwarm = {
          id: swarmId,
          onChainId,
          name: data.name,
          description: data.description,
          owner: state.demoAddress,
          budget: '0',
          rating: 0,
          isActive: true,
          agents: data.agents.map((a, i) => ({
            id: `${swarmId}_agent_${i}`,
            address: a.address,
            role: a.role,
          })),
          createdAt: new Date().toISOString(),
        };
        
        const newTx: DemoTransaction = {
          id: generateId(),
          txHash,
          type: 'SWARM_REGISTER',
          amount: '0',
          description: `Registered swarm: ${data.name}`,
          timestamp: new Date().toISOString(),
        };
        
        set({
          demoSwarms: [...state.demoSwarms, newSwarm],
          demoTransactions: [newTx, ...state.demoTransactions],
          nextSwarmId: state.nextSwarmId + 1,
        });
        
        return newSwarm;
      },

      // Create job
      createDemoJob: async (data) => {
        await simulateBlockchainDelay();
        
        const state = get();
        const jobId = generateId();
        const txHash = generateTxHash();
        const paymentBigInt = BigInt(data.payment);
        const balanceBigInt = BigInt(state.demoBalance);
        
        // Check balance
        if (paymentBigInt > balanceBigInt) {
          throw new Error('Insufficient MNEE balance');
        }
        
        const newJob: DemoJob = {
          id: jobId,
          onChainId: state.nextJobId,
          title: data.title,
          description: data.description,
          requirements: data.requirements,
          payment: data.payment,
          status: 'OPEN',
          clientAddr: state.demoAddress,
          bids: [],
          createdAt: new Date().toISOString(),
        };
        
        const newTx: DemoTransaction = {
          id: generateId(),
          txHash,
          type: 'JOB_ESCROW',
          amount: data.payment,
          description: `Created job: ${data.title}`,
          timestamp: new Date().toISOString(),
        };
        
        // Deduct from balance
        const newBalance = (balanceBigInt - paymentBigInt).toString();
        
        set({
          demoJobs: [...state.demoJobs, newJob],
          demoTransactions: [newTx, ...state.demoTransactions],
          demoBalance: newBalance,
          nextJobId: state.nextJobId + 1,
        });
        
        return newJob;
      },

      // Create bid
      createDemoBid: async (data) => {
        await simulateBlockchainDelay();
        
        const state = get();
        const job = state.demoJobs.find(j => j.id === data.jobId);
        const swarm = state.demoSwarms.find(s => s.id === data.swarmId);
        
        if (!job) throw new Error('Job not found');
        if (!swarm) throw new Error('Swarm not found');
        if (job.status !== 'OPEN') throw new Error('Job is not open for bids');
        if (job.bids.some(b => b.swarmId === data.swarmId)) {
          throw new Error('This swarm has already bid on this job');
        }
        
        const newBid: DemoBid = {
          id: generateId(),
          jobId: data.jobId,
          swarmId: data.swarmId,
          swarmName: swarm.name,
          price: data.price,
          estimatedTime: data.estimatedTime,
          message: data.message,
          isAccepted: false,
          createdAt: new Date().toISOString(),
        };
        
        const updatedJobs = state.demoJobs.map(j => 
          j.id === data.jobId 
            ? { ...j, bids: [...j.bids, newBid] }
            : j
        );
        
        set({ demoJobs: updatedJobs });
        
        return newBid;
      },

      // Accept bid
      acceptDemoBid: async (jobId, bidId) => {
        await simulateBlockchainDelay();
        
        const state = get();
        const job = state.demoJobs.find(j => j.id === jobId);
        
        if (!job) throw new Error('Job not found');
        if (job.status !== 'OPEN') throw new Error('Job is not open');
        
        const bid = job.bids.find(b => b.id === bidId);
        if (!bid) throw new Error('Bid not found');
        
        const swarm = state.demoSwarms.find(s => s.id === bid.swarmId);
        const txHash = generateTxHash();
        
        const newTx: DemoTransaction = {
          id: generateId(),
          txHash,
          type: 'BID_ACCEPT',
          amount: bid.price,
          description: `Accepted bid from ${bid.swarmName} for job: ${job.title}`,
          timestamp: new Date().toISOString(),
        };
        
        const updatedJobs = state.demoJobs.map(j => 
          j.id === jobId 
            ? { 
                ...j, 
                status: 'ASSIGNED' as const,
                swarmId: bid.swarmId,
                swarmName: swarm?.name,
                bids: j.bids.map(b => 
                  b.id === bidId ? { ...b, isAccepted: true } : b
                ),
              }
            : j
        );
        
        set({ 
          demoJobs: updatedJobs,
          demoTransactions: [newTx, ...state.demoTransactions],
        });
      },

      // Start job execution
      startDemoJobExecution: async (jobId) => {
        await simulateBlockchainDelay();
        
        const state = get();
        const updatedJobs = state.demoJobs.map(j => 
          j.id === jobId && j.status === 'ASSIGNED'
            ? { ...j, status: 'IN_PROGRESS' as const }
            : j
        );
        
        set({ demoJobs: updatedJobs });
      },

      // Complete job
      completeDemoJob: async (jobId) => {
        await simulateBlockchainDelay();
        
        const state = get();
        const job = state.demoJobs.find(j => j.id === jobId);
        
        if (!job) throw new Error('Job not found');
        
        const acceptedBid = job.bids.find(b => b.isAccepted);
        const txHash = generateTxHash();
        const resultHash = `ipfs://Qm${generateId().replace('demo_', '')}`;
        
        const newTx: DemoTransaction = {
          id: generateId(),
          txHash,
          type: 'PAYMENT_RELEASE',
          amount: acceptedBid?.price || job.payment,
          description: `Payment released for job: ${job.title}`,
          timestamp: new Date().toISOString(),
        };
        
        // Update swarm rating
        const updatedSwarms = state.demoSwarms.map(s => 
          s.id === job.swarmId
            ? { ...s, rating: Math.min(5, s.rating + 0.1) }
            : s
        );
        
        const updatedJobs = state.demoJobs.map(j => 
          j.id === jobId
            ? { 
                ...j, 
                status: 'COMPLETED' as const,
                resultHash,
                completedAt: new Date().toISOString(),
              }
            : j
        );
        
        set({ 
          demoJobs: updatedJobs,
          demoSwarms: updatedSwarms,
          demoTransactions: [newTx, ...state.demoTransactions],
        });
      },

      // Getters
      getDemoSwarm: (id) => get().demoSwarms.find(s => s.id === id),
      getDemoJob: (id) => get().demoJobs.find(j => j.id === id),
      getDemoSwarmsByOwner: (owner) => get().demoSwarms.filter(s => 
        s.owner.toLowerCase() === owner.toLowerCase()
      ),
      getOpenDemoJobs: () => get().demoJobs.filter(j => j.status === 'OPEN'),
      getDemoJobsByClient: (clientAddr) => get().demoJobs.filter(j => 
        j.clientAddr.toLowerCase() === clientAddr.toLowerCase()
      ),
    }),
    {
      name: 'swarm-demo-store',
      partialize: (state) => ({
        isDemoMode: state.isDemoMode,
        demoBalance: state.demoBalance,
        demoSwarms: state.demoSwarms,
        demoJobs: state.demoJobs,
        demoTransactions: state.demoTransactions,
        nextJobId: state.nextJobId,
        nextSwarmId: state.nextSwarmId,
      }),
    }
  )
);

/**
 * Hook to check if user is in demo mode and get demo address
 */
export function useDemoGuard() {
  const { isDemoMode, demoAddress } = useDemoStore();
  return { isDemoMode, demoAddress };
}
