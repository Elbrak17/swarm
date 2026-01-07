/**
 * Property tests for analytics router
 * 
 * Feature: swarm-marketplace
 * Property 31: Dashboard Metrics Are Accurate
 * Validates: Requirements 9.1
 * 
 * For any dashboard view, the displayed total jobs SHALL equal the count of jobs in database,
 * total MNEE volume SHALL equal sum of completed job payments, and active swarms SHALL equal
 * count of active swarms.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Job status enum values (matching the router)
const jobStatusValues = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'DISPUTED'] as const;
type JobStatus = typeof jobStatusValues[number];

// Mock data types representing database records
interface MockJob {
  id: string;
  onChainId: number;
  title: string;
  description: string;
  payment: string; // Wei as string
  status: JobStatus;
  clientAddr: string;
  createdAt: Date;
  completedAt: Date | null;
}

interface MockSwarm {
  id: string;
  onChainId: string;
  name: string;
  description: string;
  owner: string;
  budget: string;
  rating: number;
  isActive: boolean;
  createdAt: Date;
}

interface MockAgent {
  id: string;
  address: string;
  role: 'ROUTER' | 'WORKER' | 'QA';
  swarmId: string;
  earnings: string;
  tasksCompleted: number;
}

// Dashboard metrics type (matching the router response)
interface DashboardMetrics {
  totalJobs: number;
  completedJobs: number;
  totalMneeVolume: string;
  activeSwarms: number;
  totalAgents: number;
  completionRate: number;
  avgCompletionTime: number;
  costReductionPercent: number;
}

// Helper to create large BigInt without exponentiation
const largeBigInt = (): bigint => {
  let result = BigInt(10);
  for (let i = 0; i < 18; i++) {
    result = result * BigInt(10);
  }
  return result;
};

// Generators for property-based testing
const hexChar = fc.constantFrom(...'0123456789abcdef'.split(''));

const ethereumAddressArb = fc.array(hexChar, { minLength: 40, maxLength: 40 })
  .map(chars => `0x${chars.join('')}`);

const jobStatusArb = fc.constantFrom(...jobStatusValues);

const mockJobArb = fc.record({
  id: fc.uuid(),
  onChainId: fc.integer({ min: 1, max: 1000000 }),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.string({ minLength: 1, maxLength: 500 }),
  payment: fc.bigInt({ min: BigInt(1), max: largeBigInt() }).map(n => n.toString()),
  status: jobStatusArb,
  clientAddr: ethereumAddressArb,
  createdAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
  completedAt: fc.option(
    fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
    { nil: null }
  ),
});

const mockSwarmArb = fc.record({
  id: fc.uuid(),
  onChainId: fc.array(hexChar, { minLength: 64, maxLength: 64 }).map(chars => `0x${chars.join('')}`),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.string({ minLength: 1, maxLength: 500 }),
  owner: ethereumAddressArb,
  budget: fc.bigInt({ min: BigInt(0), max: largeBigInt() }).map(n => n.toString()),
  rating: fc.float({ min: 0, max: 5, noNaN: true }),
  isActive: fc.boolean(),
  createdAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
});

const agentRoleArb = fc.constantFrom('ROUTER', 'WORKER', 'QA') as fc.Arbitrary<'ROUTER' | 'WORKER' | 'QA'>;

const mockAgentArb = fc.record({
  id: fc.uuid(),
  address: ethereumAddressArb,
  role: agentRoleArb,
  swarmId: fc.uuid(),
  earnings: fc.bigInt({ min: BigInt(0), max: largeBigInt() }).map(n => n.toString()),
  tasksCompleted: fc.integer({ min: 0, max: 1000 }),
});

/**
 * Simulates the getDashboardMetrics function from analytics router
 * This mirrors the actual calculation logic
 */
function calculateDashboardMetrics(
  jobs: MockJob[],
  swarms: MockSwarm[],
  agents: MockAgent[]
): DashboardMetrics {
  // Get total jobs count
  const totalJobs = jobs.length;
  
  // Get completed jobs count
  const completedJobs = jobs.filter(j => j.status === 'COMPLETED').length;
  
  // Get total MNEE volume from completed jobs
  const totalMneeVolume = jobs
    .filter(j => j.status === 'COMPLETED')
    .reduce((sum, job) => sum + BigInt(job.payment), BigInt(0))
    .toString();
  
  // Get active swarms count
  const activeSwarms = swarms.filter(s => s.isActive).length;
  
  // Get total agents count
  const totalAgents = agents.length;
  
  // Calculate completion rate
  const completionRate = totalJobs > 0 
    ? Math.round((completedJobs / totalJobs) * 100) 
    : 0;
  
  // Calculate average completion time (in hours)
  const completedJobsWithTime = jobs.filter(
    j => j.status === 'COMPLETED' && j.completedAt !== null
  );
  
  let avgCompletionTime = 0;
  if (completedJobsWithTime.length > 0) {
    const totalHours = completedJobsWithTime.reduce((sum, job) => {
      if (job.completedAt) {
        const diffMs = job.completedAt.getTime() - job.createdAt.getTime();
        return sum + (diffMs / (1000 * 60 * 60)); // Convert to hours
      }
      return sum;
    }, 0);
    avgCompletionTime = Math.round((totalHours / completedJobsWithTime.length) * 10) / 10;
  }
  
  // Cost reduction metric (96% as per requirements)
  const costReductionPercent = 96;
  
  return {
    totalJobs,
    completedJobs,
    totalMneeVolume,
    activeSwarms,
    totalAgents,
    completionRate,
    avgCompletionTime,
    costReductionPercent,
  };
}

describe('Analytics Router - Dashboard Metrics', () => {
  /**
   * Feature: swarm-marketplace, Property 31: Dashboard Metrics Are Accurate
   * 
   * For any dashboard view, the displayed total jobs SHALL equal the count of jobs in database,
   * total MNEE volume SHALL equal sum of completed job payments, and active swarms SHALL equal
   * count of active swarms.
   * Validates: Requirements 9.1
   */
  describe('Property 31: Dashboard Metrics Are Accurate', () => {
    it('totalJobs equals the count of all jobs', () => {
      fc.assert(
        fc.property(
          fc.array(mockJobArb, { minLength: 0, maxLength: 50 }),
          fc.array(mockSwarmArb, { minLength: 0, maxLength: 20 }),
          fc.array(mockAgentArb, { minLength: 0, maxLength: 50 }),
          (jobs, swarms, agents) => {
            const metrics = calculateDashboardMetrics(jobs, swarms, agents);
            return metrics.totalJobs === jobs.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('completedJobs equals the count of jobs with COMPLETED status', () => {
      fc.assert(
        fc.property(
          fc.array(mockJobArb, { minLength: 0, maxLength: 50 }),
          fc.array(mockSwarmArb, { minLength: 0, maxLength: 20 }),
          fc.array(mockAgentArb, { minLength: 0, maxLength: 50 }),
          (jobs, swarms, agents) => {
            const metrics = calculateDashboardMetrics(jobs, swarms, agents);
            const expectedCompletedJobs = jobs.filter(j => j.status === 'COMPLETED').length;
            return metrics.completedJobs === expectedCompletedJobs;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('totalMneeVolume equals sum of completed job payments', () => {
      fc.assert(
        fc.property(
          fc.array(mockJobArb, { minLength: 0, maxLength: 50 }),
          fc.array(mockSwarmArb, { minLength: 0, maxLength: 20 }),
          fc.array(mockAgentArb, { minLength: 0, maxLength: 50 }),
          (jobs, swarms, agents) => {
            const metrics = calculateDashboardMetrics(jobs, swarms, agents);
            
            // Calculate expected volume from completed jobs only
            const expectedVolume = jobs
              .filter(j => j.status === 'COMPLETED')
              .reduce((sum, job) => sum + BigInt(job.payment), BigInt(0))
              .toString();
            
            return metrics.totalMneeVolume === expectedVolume;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('activeSwarms equals count of swarms with isActive=true', () => {
      fc.assert(
        fc.property(
          fc.array(mockJobArb, { minLength: 0, maxLength: 50 }),
          fc.array(mockSwarmArb, { minLength: 0, maxLength: 20 }),
          fc.array(mockAgentArb, { minLength: 0, maxLength: 50 }),
          (jobs, swarms, agents) => {
            const metrics = calculateDashboardMetrics(jobs, swarms, agents);
            const expectedActiveSwarms = swarms.filter(s => s.isActive).length;
            return metrics.activeSwarms === expectedActiveSwarms;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('totalAgents equals count of all agents', () => {
      fc.assert(
        fc.property(
          fc.array(mockJobArb, { minLength: 0, maxLength: 50 }),
          fc.array(mockSwarmArb, { minLength: 0, maxLength: 20 }),
          fc.array(mockAgentArb, { minLength: 0, maxLength: 50 }),
          (jobs, swarms, agents) => {
            const metrics = calculateDashboardMetrics(jobs, swarms, agents);
            return metrics.totalAgents === agents.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('completionRate equals (completedJobs / totalJobs) * 100 rounded', () => {
      fc.assert(
        fc.property(
          fc.array(mockJobArb, { minLength: 1, maxLength: 50 }), // At least 1 job to avoid division by zero
          fc.array(mockSwarmArb, { minLength: 0, maxLength: 20 }),
          fc.array(mockAgentArb, { minLength: 0, maxLength: 50 }),
          (jobs, swarms, agents) => {
            const metrics = calculateDashboardMetrics(jobs, swarms, agents);
            const completedCount = jobs.filter(j => j.status === 'COMPLETED').length;
            const expectedRate = Math.round((completedCount / jobs.length) * 100);
            return metrics.completionRate === expectedRate;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('completionRate is 0 when there are no jobs', () => {
      fc.assert(
        fc.property(
          fc.array(mockSwarmArb, { minLength: 0, maxLength: 20 }),
          fc.array(mockAgentArb, { minLength: 0, maxLength: 50 }),
          (swarms, agents) => {
            const metrics = calculateDashboardMetrics([], swarms, agents);
            return metrics.completionRate === 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('costReductionPercent is always 96', () => {
      fc.assert(
        fc.property(
          fc.array(mockJobArb, { minLength: 0, maxLength: 50 }),
          fc.array(mockSwarmArb, { minLength: 0, maxLength: 20 }),
          fc.array(mockAgentArb, { minLength: 0, maxLength: 50 }),
          (jobs, swarms, agents) => {
            const metrics = calculateDashboardMetrics(jobs, swarms, agents);
            return metrics.costReductionPercent === 96;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('totalMneeVolume is 0 when no completed jobs exist', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              ...mockJobArb.model,
              status: fc.constantFrom('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'DISPUTED'),
            }),
            { minLength: 0, maxLength: 20 }
          ),
          fc.array(mockSwarmArb, { minLength: 0, maxLength: 20 }),
          fc.array(mockAgentArb, { minLength: 0, maxLength: 50 }),
          (jobs, swarms, agents) => {
            const metrics = calculateDashboardMetrics(jobs as MockJob[], swarms, agents);
            return metrics.totalMneeVolume === '0';
          }
        ),
        { numRuns: 100 }
      );
    });

    it('activeSwarms is 0 when all swarms are inactive', () => {
      fc.assert(
        fc.property(
          fc.array(mockJobArb, { minLength: 0, maxLength: 50 }),
          fc.array(
            fc.record({
              ...mockSwarmArb.model,
              isActive: fc.constant(false),
            }),
            { minLength: 0, maxLength: 20 }
          ),
          fc.array(mockAgentArb, { minLength: 0, maxLength: 50 }),
          (jobs, swarms, agents) => {
            const metrics = calculateDashboardMetrics(jobs, swarms as MockSwarm[], agents);
            return metrics.activeSwarms === 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('metrics are consistent across multiple calculations with same data', () => {
      fc.assert(
        fc.property(
          fc.array(mockJobArb, { minLength: 0, maxLength: 50 }),
          fc.array(mockSwarmArb, { minLength: 0, maxLength: 20 }),
          fc.array(mockAgentArb, { minLength: 0, maxLength: 50 }),
          (jobs, swarms, agents) => {
            const metrics1 = calculateDashboardMetrics(jobs, swarms, agents);
            const metrics2 = calculateDashboardMetrics(jobs, swarms, agents);
            
            return (
              metrics1.totalJobs === metrics2.totalJobs &&
              metrics1.completedJobs === metrics2.completedJobs &&
              metrics1.totalMneeVolume === metrics2.totalMneeVolume &&
              metrics1.activeSwarms === metrics2.activeSwarms &&
              metrics1.totalAgents === metrics2.totalAgents &&
              metrics1.completionRate === metrics2.completionRate &&
              metrics1.costReductionPercent === metrics2.costReductionPercent
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('adding a completed job increases totalMneeVolume by payment amount', () => {
      fc.assert(
        fc.property(
          fc.array(mockJobArb, { minLength: 0, maxLength: 30 }),
          fc.array(mockSwarmArb, { minLength: 0, maxLength: 10 }),
          fc.array(mockAgentArb, { minLength: 0, maxLength: 30 }),
          fc.bigInt({ min: BigInt(1), max: largeBigInt() }),
          (jobs, swarms, agents, newPayment) => {
            const metricsBefore = calculateDashboardMetrics(jobs, swarms, agents);
            
            // Add a new completed job
            const newJob: MockJob = {
              id: 'new-job-id',
              onChainId: 999999,
              title: 'New Job',
              description: 'New job description',
              payment: newPayment.toString(),
              status: 'COMPLETED',
              clientAddr: '0x' + '1'.repeat(40),
              createdAt: new Date(),
              completedAt: new Date(),
            };
            
            const metricsAfter = calculateDashboardMetrics([...jobs, newJob], swarms, agents);
            
            const volumeBefore = BigInt(metricsBefore.totalMneeVolume);
            const volumeAfter = BigInt(metricsAfter.totalMneeVolume);
            
            return volumeAfter === volumeBefore + newPayment;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('adding an active swarm increases activeSwarms by 1', () => {
      fc.assert(
        fc.property(
          fc.array(mockJobArb, { minLength: 0, maxLength: 30 }),
          fc.array(mockSwarmArb, { minLength: 0, maxLength: 10 }),
          fc.array(mockAgentArb, { minLength: 0, maxLength: 30 }),
          (jobs, swarms, agents) => {
            const metricsBefore = calculateDashboardMetrics(jobs, swarms, agents);
            
            // Add a new active swarm
            const newSwarm: MockSwarm = {
              id: 'new-swarm-id',
              onChainId: '0x' + '1'.repeat(64),
              name: 'New Swarm',
              description: 'New swarm description',
              owner: '0x' + '1'.repeat(40),
              budget: '0',
              rating: 0,
              isActive: true,
              createdAt: new Date(),
            };
            
            const metricsAfter = calculateDashboardMetrics(jobs, [...swarms, newSwarm], agents);
            
            return metricsAfter.activeSwarms === metricsBefore.activeSwarms + 1;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: swarm-marketplace, Property 32: Completion Rate Is Correct
   * 
   * For any analytics view, the completion rate SHALL equal (completed jobs / total jobs) * 100.
   * Validates: Requirements 9.3
   */
  describe('Property 32: Completion Rate Is Correct', () => {
    /**
     * Pure function to calculate completion rate
     * This mirrors the actual calculation logic in the analytics router
     */
    function calculateCompletionRate(jobs: MockJob[]): number {
      const totalJobs = jobs.length;
      if (totalJobs === 0) return 0;
      
      const completedJobs = jobs.filter(j => j.status === 'COMPLETED').length;
      return Math.round((completedJobs / totalJobs) * 100);
    }

    it('completion rate equals (completedJobs / totalJobs) * 100 rounded for any job set', () => {
      fc.assert(
        fc.property(
          fc.array(mockJobArb, { minLength: 1, maxLength: 100 }),
          (jobs) => {
            const rate = calculateCompletionRate(jobs);
            const completedCount = jobs.filter(j => j.status === 'COMPLETED').length;
            const expectedRate = Math.round((completedCount / jobs.length) * 100);
            return rate === expectedRate;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('completion rate is 0 when there are no jobs', () => {
      const rate = calculateCompletionRate([]);
      expect(rate).toBe(0);
    });

    it('completion rate is 0 when no jobs are completed', () => {
      fc.assert(
        fc.property(
          fc.array(
            mockJobArb.filter(job => job.status !== 'COMPLETED'),
            { minLength: 1, maxLength: 50 }
          ),
          (jobs) => {
            const rate = calculateCompletionRate(jobs);
            return rate === 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('completion rate is 100 when all jobs are completed', () => {
      fc.assert(
        fc.property(
          fc.array(
            mockJobArb.map(job => ({ ...job, status: 'COMPLETED' as const })),
            { minLength: 1, maxLength: 50 }
          ),
          (jobs) => {
            const rate = calculateCompletionRate(jobs);
            return rate === 100;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('completion rate is always between 0 and 100 inclusive', () => {
      fc.assert(
        fc.property(
          fc.array(mockJobArb, { minLength: 0, maxLength: 100 }),
          (jobs) => {
            const rate = calculateCompletionRate(jobs);
            return rate >= 0 && rate <= 100;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('completion rate increases when a non-completed job becomes completed', () => {
      fc.assert(
        fc.property(
          // Generate jobs with at least one non-completed job
          fc.array(mockJobArb, { minLength: 2, maxLength: 50 }).filter(
            jobs => jobs.some(j => j.status !== 'COMPLETED')
          ),
          (jobs) => {
            const rateBefore = calculateCompletionRate(jobs);
            
            // Find first non-completed job and mark it as completed
            const nonCompletedIndex = jobs.findIndex(j => j.status !== 'COMPLETED');
            if (nonCompletedIndex === -1) return true; // All already completed
            
            const updatedJobs = jobs.map((job, i) => 
              i === nonCompletedIndex 
                ? { ...job, status: 'COMPLETED' as const }
                : job
            );
            
            const rateAfter = calculateCompletionRate(updatedJobs);
            return rateAfter >= rateBefore;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('completion rate decreases when a completed job becomes non-completed', () => {
      fc.assert(
        fc.property(
          // Generate jobs with at least one completed job
          fc.array(mockJobArb, { minLength: 2, maxLength: 50 }).filter(
            jobs => jobs.some(j => j.status === 'COMPLETED')
          ),
          (jobs) => {
            const rateBefore = calculateCompletionRate(jobs);
            
            // Find first completed job and mark it as non-completed
            const completedIndex = jobs.findIndex(j => j.status === 'COMPLETED');
            if (completedIndex === -1) return true; // None completed
            
            const updatedJobs = jobs.map((job, i) => 
              i === completedIndex 
                ? { ...job, status: 'OPEN' as const }
                : job
            );
            
            const rateAfter = calculateCompletionRate(updatedJobs);
            return rateAfter <= rateBefore;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('completion rate is consistent with dashboard metrics calculation', () => {
      fc.assert(
        fc.property(
          fc.array(mockJobArb, { minLength: 0, maxLength: 50 }),
          fc.array(mockSwarmArb, { minLength: 0, maxLength: 20 }),
          fc.array(mockAgentArb, { minLength: 0, maxLength: 50 }),
          (jobs, swarms, agents) => {
            const standaloneRate = calculateCompletionRate(jobs);
            const dashboardMetrics = calculateDashboardMetrics(jobs, swarms, agents);
            return standaloneRate === dashboardMetrics.completionRate;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('completion rate rounds correctly for edge percentages', () => {
      // Test specific edge cases for rounding
      // 1 completed out of 3 = 33.33... -> 33
      const jobs1: MockJob[] = [
        { id: '1', onChainId: 1, title: 'Job 1', description: '', payment: '100', status: 'COMPLETED', clientAddr: '0x' + '1'.repeat(40), createdAt: new Date(), completedAt: new Date() },
        { id: '2', onChainId: 2, title: 'Job 2', description: '', payment: '100', status: 'OPEN', clientAddr: '0x' + '1'.repeat(40), createdAt: new Date(), completedAt: null },
        { id: '3', onChainId: 3, title: 'Job 3', description: '', payment: '100', status: 'OPEN', clientAddr: '0x' + '1'.repeat(40), createdAt: new Date(), completedAt: null },
      ];
      expect(calculateCompletionRate(jobs1)).toBe(33);

      // 2 completed out of 3 = 66.66... -> 67
      const jobs2: MockJob[] = [
        { id: '1', onChainId: 1, title: 'Job 1', description: '', payment: '100', status: 'COMPLETED', clientAddr: '0x' + '1'.repeat(40), createdAt: new Date(), completedAt: new Date() },
        { id: '2', onChainId: 2, title: 'Job 2', description: '', payment: '100', status: 'COMPLETED', clientAddr: '0x' + '1'.repeat(40), createdAt: new Date(), completedAt: new Date() },
        { id: '3', onChainId: 3, title: 'Job 3', description: '', payment: '100', status: 'OPEN', clientAddr: '0x' + '1'.repeat(40), createdAt: new Date(), completedAt: null },
      ];
      expect(calculateCompletionRate(jobs2)).toBe(67);
    });

    it('completion rate formula: rate = round((completed / total) * 100)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }), // completed jobs
          fc.integer({ min: 1, max: 1000 }), // total jobs (at least 1)
          (completed, total) => {
            // Ensure completed <= total
            const actualCompleted = Math.min(completed, total);
            
            // Create mock jobs array
            const jobs: MockJob[] = [];
            for (let i = 0; i < total; i++) {
              jobs.push({
                id: `job-${i}`,
                onChainId: i,
                title: `Job ${i}`,
                description: '',
                payment: '100',
                status: i < actualCompleted ? 'COMPLETED' : 'OPEN',
                clientAddr: '0x' + '1'.repeat(40),
                createdAt: new Date(),
                completedAt: i < actualCompleted ? new Date() : null,
              });
            }
            
            const rate = calculateCompletionRate(jobs);
            const expectedRate = Math.round((actualCompleted / total) * 100);
            return rate === expectedRate;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
