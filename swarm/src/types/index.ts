/**
 * SWARM Marketplace Types
 * 
 * Frontend type definitions matching the Prisma schema
 */

import { JobStatus, AgentRole } from '@/lib/constants';

// ===========================================
// Agent Types
// ===========================================

export interface Agent {
  id: string;
  address: string;
  role: AgentRole;
  swarmId: string;
  earnings: string; // Wei as string
  tasksCompleted: number;
  createdAt: Date;
}

// ===========================================
// Swarm Types
// ===========================================

export interface Swarm {
  id: string;
  onChainId: string;
  name: string;
  description: string;
  owner: string;
  budget: string; // Wei as string
  rating: number;
  isActive: boolean;
  agents: Agent[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SwarmCreateInput {
  name: string;
  description: string;
  agents: Array<{
    address: string;
    role: AgentRole;
  }>;
}

// ===========================================
// Job Types
// ===========================================

export interface Job {
  id: string;
  onChainId: number;
  title: string;
  description: string;
  requirements?: string;
  payment: string; // Wei as string
  status: JobStatus;
  clientAddr: string;
  swarmId?: string;
  swarm?: Swarm;
  bids: Bid[];
  resultHash?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface JobCreateInput {
  title: string;
  description: string;
  requirements?: string;
  payment: string; // Wei as string
}

export interface JobFilters {
  status?: JobStatus | null;
  minPayment?: string | null;
  clientAddr?: string | null;
}

// ===========================================
// Bid Types
// ===========================================

export interface Bid {
  id: string;
  jobId: string;
  swarmId: string;
  swarm?: Swarm;
  price: string; // Wei as string
  estimatedTime: number; // hours
  message?: string;
  isAccepted: boolean;
  createdAt: Date;
}

export interface BidCreateInput {
  jobId: string;
  swarmId: string;
  price: string;
  estimatedTime: number;
  message?: string;
}

// ===========================================
// Real-time Event Types
// ===========================================

export interface PaymentEvent {
  id: string;
  fromAgent: string;
  toAgent: string;
  amount: string;
  swarmId: string;
  jobId: string;
  timestamp: number;
}

export interface AgentActivityEvent {
  agentAddress: string;
  swarmId: string;
  action: 'task_started' | 'task_completed' | 'payment_received';
  details: string;
  timestamp: number;
}

export interface JobProgressUpdate {
  jobId: string;
  stage: 'routing' | 'processing' | 'qa' | 'complete';
  agentId: string;
  message: string;
  progress: number; // 0-100
}

// ===========================================
// Transaction Types
// ===========================================

export type TxType = 'JOB_ESCROW' | 'PAYMENT_RELEASE' | 'AGENT_PAYMENT' | 'BUDGET_ADD';
export type TxStatus = 'PENDING' | 'CONFIRMED' | 'FAILED';

export interface Transaction {
  id: string;
  txHash: string;
  type: TxType;
  fromAddr: string;
  toAddr: string;
  amount: string;
  jobId?: string;
  swarmId?: string;
  status: TxStatus;
  createdAt: Date;
  confirmedAt?: Date;
}
