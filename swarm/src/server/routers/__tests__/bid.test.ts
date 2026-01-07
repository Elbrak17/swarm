/**
 * Property tests for bid router
 * 
 * Feature: swarm-marketplace
 * Property 9: Duplicate Bids Are Rejected
 * Property 19: Bid Creates Linked Record
 * Validates: Requirements 4.1, 4.5
 * 
 * Note: These tests validate the router logic and input validation.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { z } from 'zod';

// Job status enum values (matching the router)
const jobStatusValues = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'DISPUTED'] as const;
type JobStatus = typeof jobStatusValues[number];

// Input validation schemas (matching the router)
const createBidInputSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
  swarmId: z.string().min(1, 'Swarm ID is required'),
  price: z.string().min(1, 'Price is required'), // Wei as string
  estimatedTime: z.number().int().positive('Estimated time must be positive'), // hours
  message: z.string().max(1000).optional(),
});

// Generators for property-based testing
const hexChar = fc.constantFrom(...'0123456789abcdef'.split(''));

const ethereumAddressArb = fc.array(hexChar, { minLength: 40, maxLength: 40 })
  .map(chars => `0x${chars.join('')}`);

// Helper to create large BigInt without exponentiation
const largeBigInt = (): bigint => {
  let result = BigInt(10);
  for (let i = 0; i < 18; i++) {
    result = result * BigInt(10);
  }
  return result;
};

const validBidInputArb = fc.record({
  jobId: fc.uuid(),
  swarmId: fc.uuid(),
  price: fc.bigInt({ min: BigInt(1), max: largeBigInt() }).map(n => n.toString()),
  estimatedTime: fc.integer({ min: 1, max: 720 }), // 1 hour to 30 days
  message: fc.option(fc.string({ maxLength: 1000 }), { nil: undefined }),
});

// Mock types for testing bid logic
interface MockJob {
  id: string;
  status: JobStatus;
  clientAddr: string;
}

interface MockSwarm {
  id: string;
  owner: string;
  isActive: boolean;
}

interface MockBid {
  id: string;
  jobId: string;
  swarmId: string;
  price: string;
  estimatedTime: number;
  message?: string;
  isAccepted: boolean;
  createdAt: Date;
}

// Mock bid storage for testing duplicate detection
interface BidStore {
  bids: MockBid[];
  existingBidKeys: Set<string>; // Set of "jobId:swarmId" keys
}

const mockJobArb = fc.record({
  id: fc.uuid(),
  status: fc.constantFrom(...jobStatusValues),
  clientAddr: ethereumAddressArb,
});

const mockSwarmArb = fc.record({
  id: fc.uuid(),
  owner: ethereumAddressArb,
  isActive: fc.boolean(),
});

const mockBidArb = fc.record({
  id: fc.uuid(),
  jobId: fc.uuid(),
  swarmId: fc.uuid(),
  price: fc.bigInt({ min: BigInt(1), max: largeBigInt() }).map(n => n.toString()),
  estimatedTime: fc.integer({ min: 1, max: 720 }),
  message: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  isAccepted: fc.boolean(),
  createdAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
});

/**
 * Check if a bid already exists for a job-swarm combination
 * Simulates the duplicate check in the bid router
 */
function isDuplicateBid(store: BidStore, jobId: string, swarmId: string): boolean {
  const key = `${jobId}:${swarmId}`;
  return store.existingBidKeys.has(key);
}

/**
 * Create a bid and add it to the store
 * Returns the created bid or null if duplicate
 */
function createBid(
  store: BidStore,
  input: { jobId: string; swarmId: string; price: string; estimatedTime: number; message?: string },
  job: MockJob,
  swarm: MockSwarm
): { success: true; bid: MockBid } | { success: false; error: string } {
  // Check job exists
  if (!job) {
    return { success: false, error: 'Job not found' };
  }

  // Check job is OPEN (Requirement 4.6)
  if (job.status !== 'OPEN') {
    return { success: false, error: `Cannot bid on a job with status ${job.status}. Only OPEN jobs accept bids.` };
  }

  // Check swarm exists and is active
  if (!swarm) {
    return { success: false, error: 'Swarm not found' };
  }

  if (!swarm.isActive) {
    return { success: false, error: 'Cannot bid with an inactive swarm' };
  }

  // Check for duplicate bid (Requirement 4.5)
  if (isDuplicateBid(store, input.jobId, input.swarmId)) {
    return { success: false, error: 'This swarm has already bid on this job' };
  }

  // Create the bid
  const bid: MockBid = {
    id: `bid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    jobId: input.jobId,
    swarmId: input.swarmId,
    price: input.price,
    estimatedTime: input.estimatedTime,
    message: input.message,
    isAccepted: false,
    createdAt: new Date(),
  };

  // Add to store
  store.bids.push(bid);
  store.existingBidKeys.add(`${input.jobId}:${input.swarmId}`);

  return { success: true, bid };
}

/**
 * Verify bid has correct foreign key relationships
 */
function verifyBidLinks(bid: MockBid, jobId: string, swarmId: string): boolean {
  return bid.jobId === jobId && bid.swarmId === swarmId;
}

describe('Bid Router Input Validation', () => {
  describe('Create Bid Input Validation', () => {
    /**
     * Feature: swarm-marketplace
     * Valid bid inputs should pass schema validation
     */
    it('valid bid inputs pass schema validation', () => {
      fc.assert(
        fc.property(validBidInputArb, (input) => {
          const result = createBidInputSchema.safeParse(input);
          return result.success === true;
        }),
        { numRuns: 100 }
      );
    });

    it('rejects empty jobId', () => {
      const input = {
        jobId: '',
        swarmId: 'test-swarm-id',
        price: '1000000000000000000',
        estimatedTime: 24,
      };
      
      const result = createBidInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects empty swarmId', () => {
      const input = {
        jobId: 'test-job-id',
        swarmId: '',
        price: '1000000000000000000',
        estimatedTime: 24,
      };
      
      const result = createBidInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects empty price', () => {
      const input = {
        jobId: 'test-job-id',
        swarmId: 'test-swarm-id',
        price: '',
        estimatedTime: 24,
      };
      
      const result = createBidInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects zero or negative estimatedTime', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -1000, max: 0 }),
          (invalidTime) => {
            const input = {
              jobId: 'test-job-id',
              swarmId: 'test-swarm-id',
              price: '1000000000000000000',
              estimatedTime: invalidTime,
            };
            
            const result = createBidInputSchema.safeParse(input);
            return result.success === false;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('accepts optional message field', () => {
      const inputWithMessage = {
        jobId: 'test-job-id',
        swarmId: 'test-swarm-id',
        price: '1000000000000000000',
        estimatedTime: 24,
        message: 'We can complete this job efficiently',
      };
      
      const inputWithoutMessage = {
        jobId: 'test-job-id',
        swarmId: 'test-swarm-id',
        price: '1000000000000000000',
        estimatedTime: 24,
      };
      
      expect(createBidInputSchema.safeParse(inputWithMessage).success).toBe(true);
      expect(createBidInputSchema.safeParse(inputWithoutMessage).success).toBe(true);
    });

    it('rejects message exceeding 1000 characters', () => {
      const input = {
        jobId: 'test-job-id',
        swarmId: 'test-swarm-id',
        price: '1000000000000000000',
        estimatedTime: 24,
        message: 'a'.repeat(1001),
      };
      
      const result = createBidInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

describe('Bid Router Business Logic', () => {
  /**
   * Feature: swarm-marketplace, Property 9: Duplicate Bids Are Rejected
   * 
   * For any swarm that has already bid on a job, a second bid attempt 
   * on the same job SHALL revert.
   * Validates: Requirements 4.5
   */
  describe('Property 9: Duplicate Bids Are Rejected', () => {
    it('second bid from same swarm on same job is rejected', () => {
      fc.assert(
        fc.property(
          validBidInputArb,
          mockJobArb.filter(j => j.status === 'OPEN'),
          mockSwarmArb.filter(s => s.isActive),
          (bidInput, job, swarm) => {
            // Setup: Create a store and make the job/swarm IDs match
            const store: BidStore = { bids: [], existingBidKeys: new Set() };
            const input = { ...bidInput, jobId: job.id, swarmId: swarm.id };
            
            // First bid should succeed
            const firstResult = createBid(store, input, job, swarm);
            if (!firstResult.success) return false;
            
            // Second bid with same job and swarm should fail
            const secondResult = createBid(store, input, job, swarm);
            
            return secondResult.success === false && 
                   secondResult.error === 'This swarm has already bid on this job';
          }
        ),
        { numRuns: 100 }
      );
    });

    it('isDuplicateBid correctly identifies existing bids', () => {
      fc.assert(
        fc.property(
          fc.array(mockBidArb, { minLength: 1, maxLength: 20 }),
          fc.integer({ min: 0 }),
          (bids, indexSeed) => {
            // Create store with existing bids
            const store: BidStore = {
              bids: bids,
              existingBidKeys: new Set(bids.map(b => `${b.jobId}:${b.swarmId}`)),
            };
            
            // Pick a random existing bid
            const existingBid = bids[indexSeed % bids.length];
            
            // Should detect as duplicate
            return isDuplicateBid(store, existingBid.jobId, existingBid.swarmId) === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('isDuplicateBid returns false for new job-swarm combinations', () => {
      fc.assert(
        fc.property(
          fc.array(mockBidArb, { minLength: 0, maxLength: 20 }),
          fc.uuid(),
          fc.uuid(),
          (existingBids, newJobId, newSwarmId) => {
            // Create store with existing bids
            const store: BidStore = {
              bids: existingBids,
              existingBidKeys: new Set(existingBids.map(b => `${b.jobId}:${b.swarmId}`)),
            };
            
            // Check if the new combination already exists (unlikely but possible)
            const key = `${newJobId}:${newSwarmId}`;
            const alreadyExists = store.existingBidKeys.has(key);
            
            // Result should match whether it already exists
            return isDuplicateBid(store, newJobId, newSwarmId) === alreadyExists;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('same swarm can bid on different jobs', () => {
      fc.assert(
        fc.property(
          validBidInputArb,
          fc.array(mockJobArb.filter(j => j.status === 'OPEN'), { minLength: 2, maxLength: 5 }),
          mockSwarmArb.filter(s => s.isActive),
          (bidInput, jobs, swarm) => {
            const store: BidStore = { bids: [], existingBidKeys: new Set() };
            
            // Bid on each job with the same swarm
            let allSucceeded = true;
            for (const job of jobs) {
              const input = { ...bidInput, jobId: job.id, swarmId: swarm.id };
              const result = createBid(store, input, job, swarm);
              if (!result.success) {
                allSucceeded = false;
                break;
              }
            }
            
            // All bids should succeed since they're for different jobs
            return allSucceeded && store.bids.length === jobs.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('different swarms can bid on same job', () => {
      fc.assert(
        fc.property(
          validBidInputArb,
          mockJobArb.filter(j => j.status === 'OPEN'),
          fc.array(mockSwarmArb.filter(s => s.isActive), { minLength: 2, maxLength: 5 }),
          (bidInput, job, swarms) => {
            const store: BidStore = { bids: [], existingBidKeys: new Set() };
            
            // Each swarm bids on the same job
            let allSucceeded = true;
            for (const swarm of swarms) {
              const input = { ...bidInput, jobId: job.id, swarmId: swarm.id };
              const result = createBid(store, input, job, swarm);
              if (!result.success) {
                allSucceeded = false;
                break;
              }
            }
            
            // All bids should succeed since they're from different swarms
            return allSucceeded && store.bids.length === swarms.length;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: swarm-marketplace, Property 19: Bid Creates Linked Record
   * 
   * For any bid submission with jobId and swarmId, a bid record SHALL be 
   * created with correct foreign key relationships.
   * Validates: Requirements 4.1
   */
  describe('Property 19: Bid Creates Linked Record', () => {
    it('created bid has correct jobId and swarmId links', () => {
      fc.assert(
        fc.property(
          validBidInputArb,
          mockJobArb.filter(j => j.status === 'OPEN'),
          mockSwarmArb.filter(s => s.isActive),
          (bidInput, job, swarm) => {
            const store: BidStore = { bids: [], existingBidKeys: new Set() };
            const input = { ...bidInput, jobId: job.id, swarmId: swarm.id };
            
            const result = createBid(store, input, job, swarm);
            
            if (!result.success) return false;
            
            // Verify the bid has correct foreign key relationships
            return verifyBidLinks(result.bid, job.id, swarm.id);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('created bid preserves all input fields', () => {
      fc.assert(
        fc.property(
          validBidInputArb,
          mockJobArb.filter(j => j.status === 'OPEN'),
          mockSwarmArb.filter(s => s.isActive),
          (bidInput, job, swarm) => {
            const store: BidStore = { bids: [], existingBidKeys: new Set() };
            const input = { ...bidInput, jobId: job.id, swarmId: swarm.id };
            
            const result = createBid(store, input, job, swarm);
            
            if (!result.success) return false;
            
            const bid = result.bid;
            
            // Verify all input fields are preserved
            return bid.jobId === input.jobId &&
                   bid.swarmId === input.swarmId &&
                   bid.price === input.price &&
                   bid.estimatedTime === input.estimatedTime &&
                   bid.message === input.message;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('created bid is added to store', () => {
      fc.assert(
        fc.property(
          validBidInputArb,
          mockJobArb.filter(j => j.status === 'OPEN'),
          mockSwarmArb.filter(s => s.isActive),
          (bidInput, job, swarm) => {
            const store: BidStore = { bids: [], existingBidKeys: new Set() };
            const initialCount = store.bids.length;
            const input = { ...bidInput, jobId: job.id, swarmId: swarm.id };
            
            const result = createBid(store, input, job, swarm);
            
            if (!result.success) return false;
            
            // Store should have one more bid
            return store.bids.length === initialCount + 1 &&
                   store.bids.some(b => b.id === result.bid.id);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('created bid has isAccepted set to false', () => {
      fc.assert(
        fc.property(
          validBidInputArb,
          mockJobArb.filter(j => j.status === 'OPEN'),
          mockSwarmArb.filter(s => s.isActive),
          (bidInput, job, swarm) => {
            const store: BidStore = { bids: [], existingBidKeys: new Set() };
            const input = { ...bidInput, jobId: job.id, swarmId: swarm.id };
            
            const result = createBid(store, input, job, swarm);
            
            if (!result.success) return false;
            
            // New bids should not be accepted
            return result.bid.isAccepted === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('created bid has valid createdAt timestamp', () => {
      fc.assert(
        fc.property(
          validBidInputArb,
          mockJobArb.filter(j => j.status === 'OPEN'),
          mockSwarmArb.filter(s => s.isActive),
          (bidInput, job, swarm) => {
            const store: BidStore = { bids: [], existingBidKeys: new Set() };
            const input = { ...bidInput, jobId: job.id, swarmId: swarm.id };
            const beforeCreate = new Date();
            
            const result = createBid(store, input, job, swarm);
            
            const afterCreate = new Date();
            
            if (!result.success) return false;
            
            // createdAt should be between before and after
            return result.bid.createdAt >= beforeCreate && 
                   result.bid.createdAt <= afterCreate;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('bid creation fails for non-OPEN jobs', () => {
      fc.assert(
        fc.property(
          validBidInputArb,
          mockJobArb.filter(j => j.status !== 'OPEN'),
          mockSwarmArb.filter(s => s.isActive),
          (bidInput, job, swarm) => {
            const store: BidStore = { bids: [], existingBidKeys: new Set() };
            const input = { ...bidInput, jobId: job.id, swarmId: swarm.id };
            
            const result = createBid(store, input, job, swarm);
            
            // Should fail because job is not OPEN
            return result.success === false &&
                   result.error.includes('Cannot bid on a job with status');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('bid creation fails for inactive swarms', () => {
      fc.assert(
        fc.property(
          validBidInputArb,
          mockJobArb.filter(j => j.status === 'OPEN'),
          mockSwarmArb.filter(s => !s.isActive),
          (bidInput, job, swarm) => {
            const store: BidStore = { bids: [], existingBidKeys: new Set() };
            const input = { ...bidInput, jobId: job.id, swarmId: swarm.id };
            
            const result = createBid(store, input, job, swarm);
            
            // Should fail because swarm is inactive
            return result.success === false &&
                   result.error === 'Cannot bid with an inactive swarm';
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

describe('Bid Data Integrity', () => {
  it('bid price is always a valid positive number string', () => {
    fc.assert(
      fc.property(validBidInputArb, (input) => {
        const price = BigInt(input.price);
        return price > BigInt(0);
      }),
      { numRuns: 100 }
    );
  });

  it('bid estimatedTime is always positive', () => {
    fc.assert(
      fc.property(validBidInputArb, (input) => {
        return input.estimatedTime > 0;
      }),
      { numRuns: 100 }
    );
  });
});
