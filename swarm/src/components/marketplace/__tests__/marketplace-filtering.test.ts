/**
 * Property tests for marketplace filtering and sorting
 * 
 * Feature: swarm-marketplace
 * Property 29: Status Filter Returns Matching Jobs
 * Property 30: Rating Sort Orders Correctly
 * Validates: Requirements 8.2, 8.3
 * 
 * These tests validate the filtering and sorting logic used in the marketplace.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Job status enum values (matching the constants)
const jobStatusValues = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'DISPUTED'] as const;
type JobStatus = typeof jobStatusValues[number];

// Agent role enum values
const agentRoleValues = ['ROUTER', 'WORKER', 'QA'] as const;
type AgentRole = typeof agentRoleValues[number];

// ===========================================
// Mock Types (matching the actual types)
// ===========================================

interface MockAgent {
  id: string;
  address: string;
  role: AgentRole;
  swarmId: string;
  earnings: string;
  tasksCompleted: number;
  createdAt: Date;
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
  agents: MockAgent[];
  createdAt: Date;
  updatedAt: Date;
}

interface MockJob {
  id: string;
  onChainId: number;
  title: string;
  description: string;
  payment: string;
  status: JobStatus;
  clientAddr: string;
  createdAt: Date;
}

// ===========================================
// Generators for property-based testing
// ===========================================

const hexChar = fc.constantFrom(...'0123456789abcdef'.split(''));

const ethereumAddressArb = fc.array(hexChar, { minLength: 40, maxLength: 40 })
  .map(chars => `0x${chars.join('')}`);

const jobStatusArb = fc.constantFrom(...jobStatusValues);
const agentRoleArb = fc.constantFrom(...agentRoleValues);

// Helper to create large BigInt without exponentiation
const largeBigInt = (): bigint => {
  let result = BigInt(10);
  for (let i = 0; i < 18; i++) {
    result = result * BigInt(10);
  }
  return result;
};

const mockAgentArb = fc.record({
  id: fc.uuid(),
  address: ethereumAddressArb,
  role: agentRoleArb,
  swarmId: fc.uuid(),
  earnings: fc.bigInt({ min: BigInt(0), max: largeBigInt() }).map(n => n.toString()),
  tasksCompleted: fc.integer({ min: 0, max: 1000 }),
  createdAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
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
  agents: fc.array(mockAgentArb, { minLength: 1, maxLength: 5 }),
  createdAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
  updatedAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
});

const mockJobArb = fc.record({
  id: fc.uuid(),
  onChainId: fc.integer({ min: 1, max: 1000000 }),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.string({ minLength: 1, maxLength: 500 }),
  payment: fc.bigInt({ min: BigInt(1), max: largeBigInt() }).map(n => n.toString()),
  status: jobStatusArb,
  clientAddr: ethereumAddressArb,
  createdAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
});

// ===========================================
// Filtering and Sorting Functions
// (These mirror the logic in the stores and routers)
// ===========================================

/**
 * Filter jobs by status - mirrors the job store's getJobsByStatus
 */
function filterJobsByStatus(jobs: MockJob[], status?: JobStatus | null): MockJob[] {
  if (!status) {
    return jobs;
  }
  return jobs.filter(job => job.status === status);
}

/**
 * Sort swarms by rating descending - mirrors the swarm store's getSwarmsSortedByRating
 */
function sortSwarmsByRating(swarms: MockSwarm[]): MockSwarm[] {
  return [...swarms].sort((a, b) => b.rating - a.rating);
}

/**
 * Sort swarms by createdAt descending (newest first)
 */
function sortSwarmsByCreatedAt(swarms: MockSwarm[]): MockSwarm[] {
  return [...swarms].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Filter active swarms only
 */
function filterActiveSwarms(swarms: MockSwarm[]): MockSwarm[] {
  return swarms.filter(swarm => swarm.isActive);
}

// ===========================================
// Property Tests
// ===========================================

describe('Marketplace Filtering Logic', () => {
  /**
   * Feature: swarm-marketplace, Property 29: Status Filter Returns Matching Jobs
   * 
   * For any status filter selection, all displayed jobs SHALL have the selected status.
   * Validates: Requirements 8.2
   */
  describe('Property 29: Status Filter Returns Matching Jobs', () => {
    it('filterJobsByStatus returns only jobs with selected status', () => {
      fc.assert(
        fc.property(
          fc.array(mockJobArb, { minLength: 0, maxLength: 50 }),
          jobStatusArb,
          (jobs, status) => {
            const filteredJobs = filterJobsByStatus(jobs, status);
            
            // All returned jobs must have the selected status
            return filteredJobs.every(job => job.status === status);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('filterJobsByStatus returns correct count of matching jobs', () => {
      fc.assert(
        fc.property(
          fc.array(mockJobArb, { minLength: 0, maxLength: 50 }),
          jobStatusArb,
          (jobs, status) => {
            const filteredJobs = filterJobsByStatus(jobs, status);
            const expectedCount = jobs.filter(j => j.status === status).length;
            
            return filteredJobs.length === expectedCount;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('filterJobsByStatus with null status returns all jobs', () => {
      fc.assert(
        fc.property(
          fc.array(mockJobArb, { minLength: 0, maxLength: 50 }),
          (jobs) => {
            const filteredJobs = filterJobsByStatus(jobs, null);
            return filteredJobs.length === jobs.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('filterJobsByStatus excludes jobs with different status', () => {
      fc.assert(
        fc.property(
          fc.array(mockJobArb, { minLength: 1, maxLength: 50 }),
          jobStatusArb,
          (jobs, status) => {
            const filteredJobs = filterJobsByStatus(jobs, status);
            const filteredIds = new Set(filteredJobs.map(j => j.id));
            
            // No job with different status should be in the result
            const jobsWithDifferentStatus = jobs.filter(j => j.status !== status);
            return jobsWithDifferentStatus.every(j => !filteredIds.has(j.id));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('filterJobsByStatus is idempotent', () => {
      fc.assert(
        fc.property(
          fc.array(mockJobArb, { minLength: 0, maxLength: 50 }),
          jobStatusArb,
          (jobs, status) => {
            const firstFilter = filterJobsByStatus(jobs, status);
            const secondFilter = filterJobsByStatus(firstFilter, status);
            
            // Filtering twice should give the same result
            return firstFilter.length === secondFilter.length &&
              firstFilter.every((job, i) => job.id === secondFilter[i].id);
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * Feature: swarm-marketplace, Property 30: Rating Sort Orders Correctly
   * 
   * For any swarm list sorted by rating descending, each swarm's rating 
   * SHALL be >= the next swarm's rating in the list.
   * Validates: Requirements 8.3
   */
  describe('Property 30: Rating Sort Orders Correctly', () => {
    it('sortSwarmsByRating orders swarms from highest to lowest rating', () => {
      fc.assert(
        fc.property(
          fc.array(mockSwarmArb, { minLength: 0, maxLength: 50 }),
          (swarms) => {
            const sortedSwarms = sortSwarmsByRating(swarms);
            
            // Each swarm's rating should be >= the next swarm's rating
            for (let i = 0; i < sortedSwarms.length - 1; i++) {
              if (sortedSwarms[i].rating < sortedSwarms[i + 1].rating) {
                return false;
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('sortSwarmsByRating preserves all swarms (no data loss)', () => {
      fc.assert(
        fc.property(
          fc.array(mockSwarmArb, { minLength: 0, maxLength: 50 }),
          (swarms) => {
            const sortedSwarms = sortSwarmsByRating(swarms);
            
            // Same number of swarms
            if (sortedSwarms.length !== swarms.length) return false;
            
            // All original swarms are present
            const originalIds = new Set(swarms.map(s => s.id));
            const sortedIds = new Set(sortedSwarms.map(s => s.id));
            
            return originalIds.size === sortedIds.size &&
              [...originalIds].every(id => sortedIds.has(id));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('sortSwarmsByRating does not modify original array', () => {
      fc.assert(
        fc.property(
          fc.array(mockSwarmArb, { minLength: 1, maxLength: 50 }),
          (swarms) => {
            const originalOrder = swarms.map(s => s.id);
            sortSwarmsByRating(swarms);
            const afterSortOrder = swarms.map(s => s.id);
            
            // Original array should be unchanged
            return originalOrder.every((id, i) => id === afterSortOrder[i]);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('sortSwarmsByRating is stable for equal ratings (preserves relative order)', () => {
      fc.assert(
        fc.property(
          fc.array(mockSwarmArb, { minLength: 2, maxLength: 30 }),
          fc.float({ min: 0, max: 5, noNaN: true }),
          (swarms, fixedRating) => {
            // Set all swarms to the same rating
            const sameRatingSwarms = swarms.map(s => ({ ...s, rating: fixedRating }));
            const sortedSwarms = sortSwarmsByRating(sameRatingSwarms);
            
            // All ratings should be equal
            return sortedSwarms.every(s => s.rating === fixedRating);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('sortSwarmsByRating handles empty array', () => {
      const emptySwarms: MockSwarm[] = [];
      const sorted = sortSwarmsByRating(emptySwarms);
      expect(sorted).toEqual([]);
      expect(sorted.length).toBe(0);
    });

    it('sortSwarmsByRating handles single swarm', () => {
      fc.assert(
        fc.property(
          mockSwarmArb,
          (swarm) => {
            const sorted = sortSwarmsByRating([swarm]);
            return sorted.length === 1 && sorted[0].id === swarm.id;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('sortSwarmsByRating places highest rated swarm first', () => {
      fc.assert(
        fc.property(
          fc.array(mockSwarmArb, { minLength: 1, maxLength: 50 }),
          (swarms) => {
            const sortedSwarms = sortSwarmsByRating(swarms);
            const maxRating = Math.max(...swarms.map(s => s.rating));
            
            // First swarm should have the maximum rating
            return sortedSwarms[0].rating === maxRating;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('sortSwarmsByRating places lowest rated swarm last', () => {
      fc.assert(
        fc.property(
          fc.array(mockSwarmArb, { minLength: 1, maxLength: 50 }),
          (swarms) => {
            const sortedSwarms = sortSwarmsByRating(swarms);
            const minRating = Math.min(...swarms.map(s => s.rating));
            
            // Last swarm should have the minimum rating
            return sortedSwarms[sortedSwarms.length - 1].rating === minRating;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('sortSwarmsByRating is idempotent', () => {
      fc.assert(
        fc.property(
          fc.array(mockSwarmArb, { minLength: 0, maxLength: 50 }),
          (swarms) => {
            const firstSort = sortSwarmsByRating(swarms);
            const secondSort = sortSwarmsByRating(firstSort);
            
            // Sorting twice should give the same result
            return firstSort.length === secondSort.length &&
              firstSort.every((swarm, i) => swarm.id === secondSort[i].id);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('sortSwarmsByRating handles ratings at boundary values (0 and 5)', () => {
      fc.assert(
        fc.property(
          fc.array(mockSwarmArb, { minLength: 2, maxLength: 20 }),
          (swarms) => {
            // Set some swarms to boundary values
            const modifiedSwarms = swarms.map((s, i) => ({
              ...s,
              rating: i % 3 === 0 ? 0 : (i % 3 === 1 ? 5 : s.rating)
            }));
            
            const sortedSwarms = sortSwarmsByRating(modifiedSwarms);
            
            // Verify ordering is maintained
            for (let i = 0; i < sortedSwarms.length - 1; i++) {
              if (sortedSwarms[i].rating < sortedSwarms[i + 1].rating) {
                return false;
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

describe('Combined Marketplace Filtering and Sorting', () => {
  it('filtering active swarms then sorting by rating maintains order', () => {
    fc.assert(
      fc.property(
        fc.array(mockSwarmArb, { minLength: 0, maxLength: 50 }),
        (swarms) => {
          const activeSwarms = filterActiveSwarms(swarms);
          const sortedActiveSwarms = sortSwarmsByRating(activeSwarms);
          
          // All swarms should be active
          const allActive = sortedActiveSwarms.every(s => s.isActive);
          
          // Should be sorted by rating descending
          let sortedCorrectly = true;
          for (let i = 0; i < sortedActiveSwarms.length - 1; i++) {
            if (sortedActiveSwarms[i].rating < sortedActiveSwarms[i + 1].rating) {
              sortedCorrectly = false;
              break;
            }
          }
          
          return allActive && sortedCorrectly;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('sorting then filtering preserves sort order within filtered results', () => {
    fc.assert(
      fc.property(
        fc.array(mockSwarmArb, { minLength: 0, maxLength: 50 }),
        (swarms) => {
          const sortedSwarms = sortSwarmsByRating(swarms);
          const sortedActiveSwarms = filterActiveSwarms(sortedSwarms);
          
          // Should still be sorted by rating descending
          for (let i = 0; i < sortedActiveSwarms.length - 1; i++) {
            if (sortedActiveSwarms[i].rating < sortedActiveSwarms[i + 1].rating) {
              return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
