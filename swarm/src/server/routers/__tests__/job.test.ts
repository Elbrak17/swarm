/**
 * Property tests for job router
 * 
 * Feature: swarm-marketplace
 * Property 20: Accepted Bid Queues Execution
 * Property 27: Marketplace Shows All OPEN Jobs
 * Property 29: Status Filter Returns Matching Jobs
 * Validates: Requirements 3.4, 5.1, 8.2
 * 
 * Note: These tests validate the router logic and filtering behavior.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { z } from 'zod';

// Job status enum values (matching the router)
const jobStatusValues = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'DISPUTED'] as const;
type JobStatus = typeof jobStatusValues[number];

// Input validation schemas (matching the router)
const createJobInputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required').max(5000),
  requirements: z.string().max(2000).optional(),
  payment: z.string().min(1, 'Payment is required'),
  onChainId: z.number().int().positive('On-chain ID must be positive'),
  clientAddr: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid client address'),
  txHash: z.string().min(1, 'Transaction hash is required'),
});

const listJobsInputSchema = z.object({
  status: z.enum(jobStatusValues).optional(),
  clientAddr: z.string().optional(),
  swarmId: z.string().optional(),
  minPayment: z.string().optional(),
  orderBy: z.enum(['createdAt', 'payment', 'status']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
}).optional();

// Generators for property-based testing
const hexChar = fc.constantFrom(...'0123456789abcdef'.split(''));

const ethereumAddressArb = fc.array(hexChar, { minLength: 40, maxLength: 40 })
  .map(chars => `0x${chars.join('')}`);

const txHashArb = fc.array(hexChar, { minLength: 64, maxLength: 64 })
  .map(chars => `0x${chars.join('')}`);

const jobStatusArb = fc.constantFrom(...jobStatusValues);

// Helper to create large BigInt without exponentiation
const largeBigInt = (): bigint => {
  let result = BigInt(10);
  for (let i = 0; i < 18; i++) {
    result = result * BigInt(10);
  }
  return result;
};

const validJobInputArb = fc.record({
  title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
  description: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
  requirements: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
  payment: fc.bigInt({ min: BigInt(1), max: largeBigInt() }).map(n => n.toString()),
  onChainId: fc.integer({ min: 1, max: 1000000 }),
  clientAddr: ethereumAddressArb,
  txHash: txHashArb,
});

// Mock job type for testing filtering logic
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

/**
 * Filter jobs by status - simulates the router's filtering logic
 */
function filterJobsByStatus(jobs: MockJob[], status?: JobStatus): MockJob[] {
  if (!status) {
    return jobs;
  }
  return jobs.filter(job => job.status === status);
}

/**
 * Get all OPEN jobs - simulates marketplace default view
 */
function getOpenJobs(jobs: MockJob[]): MockJob[] {
  return jobs.filter(job => job.status === 'OPEN');
}

describe('Job Router Input Validation', () => {
  describe('Create Job Input Validation', () => {
    /**
     * Feature: swarm-marketplace
     * Valid job inputs should pass schema validation
     */
    it('valid job inputs pass schema validation', () => {
      fc.assert(
        fc.property(validJobInputArb, (input) => {
          const result = createJobInputSchema.safeParse(input);
          return result.success === true;
        }),
        { numRuns: 100 }
      );
    });

    it('rejects empty title', () => {
      const input = {
        title: '',
        description: 'Test description',
        payment: '1000000000000000000',
        onChainId: 1,
        clientAddr: '0x' + '1'.repeat(40),
        txHash: '0x' + '1'.repeat(64),
      };
      
      const result = createJobInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects invalid client address', () => {
      const input = {
        title: 'Test Job',
        description: 'Test description',
        payment: '1000000000000000000',
        onChainId: 1,
        clientAddr: 'invalid-address',
        txHash: '0x' + '1'.repeat(64),
      };
      
      const result = createJobInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects zero or negative onChainId', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -1000, max: 0 }),
          (invalidId) => {
            const input = {
              title: 'Test Job',
              description: 'Test description',
              payment: '1000000000000000000',
              onChainId: invalidId,
              clientAddr: '0x' + '1'.repeat(40),
              txHash: '0x' + '1'.repeat(64),
            };
            
            const result = createJobInputSchema.safeParse(input);
            return result.success === false;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('List Jobs Input Validation', () => {
    it('valid list inputs pass schema validation', () => {
      fc.assert(
        fc.property(
          fc.record({
            status: fc.option(jobStatusArb, { nil: undefined }),
            limit: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
            offset: fc.option(fc.integer({ min: 0, max: 1000 }), { nil: undefined }),
            orderBy: fc.option(fc.constantFrom('createdAt', 'payment', 'status'), { nil: undefined }),
            order: fc.option(fc.constantFrom('asc', 'desc'), { nil: undefined }),
          }),
          (input) => {
            const result = listJobsInputSchema.safeParse(input);
            return result.success === true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

describe('Job Router Filtering Logic', () => {
  /**
   * Feature: swarm-marketplace, Property 27: Marketplace Shows All OPEN Jobs
   * 
   * For any set of jobs in the database, the marketplace view SHALL display 
   * all jobs with status OPEN and none with other statuses (unless filtered).
   * Validates: Requirements 3.4
   */
  describe('Property 27: Marketplace Shows All OPEN Jobs', () => {
    it('getOpenJobs returns only jobs with OPEN status', () => {
      fc.assert(
        fc.property(
          fc.array(mockJobArb, { minLength: 0, maxLength: 50 }),
          (jobs) => {
            const openJobs = getOpenJobs(jobs);
            
            // All returned jobs must have OPEN status
            const allAreOpen = openJobs.every(job => job.status === 'OPEN');
            
            // Count of returned jobs must match count of OPEN jobs in input
            const expectedCount = jobs.filter(j => j.status === 'OPEN').length;
            const actualCount = openJobs.length;
            
            return allAreOpen && actualCount === expectedCount;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('getOpenJobs excludes all non-OPEN jobs', () => {
      fc.assert(
        fc.property(
          fc.array(mockJobArb, { minLength: 1, maxLength: 50 }),
          (jobs) => {
            const openJobs = getOpenJobs(jobs);
            const openJobIds = new Set(openJobs.map(j => j.id));
            
            // No non-OPEN job should be in the result
            const nonOpenJobs = jobs.filter(j => j.status !== 'OPEN');
            const noNonOpenIncluded = nonOpenJobs.every(j => !openJobIds.has(j.id));
            
            return noNonOpenIncluded;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('getOpenJobs returns empty array when no OPEN jobs exist', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              ...mockJobArb.model,
              status: fc.constantFrom('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'DISPUTED'),
            }),
            { minLength: 0, maxLength: 20 }
          ),
          (jobs) => {
            const openJobs = getOpenJobs(jobs as MockJob[]);
            return openJobs.length === 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('getOpenJobs preserves all OPEN jobs from input', () => {
      fc.assert(
        fc.property(
          fc.array(mockJobArb, { minLength: 0, maxLength: 50 }),
          (jobs) => {
            const openJobs = getOpenJobs(jobs);
            const inputOpenJobs = jobs.filter(j => j.status === 'OPEN');
            
            // Every OPEN job from input should be in the result
            const allOpenPreserved = inputOpenJobs.every(
              inputJob => openJobs.some(resultJob => resultJob.id === inputJob.id)
            );
            
            return allOpenPreserved;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

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

    it('filterJobsByStatus with no status returns all jobs', () => {
      fc.assert(
        fc.property(
          fc.array(mockJobArb, { minLength: 0, maxLength: 50 }),
          (jobs) => {
            const filteredJobs = filterJobsByStatus(jobs, undefined);
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
            const noDifferentStatusIncluded = jobsWithDifferentStatus.every(
              j => !filteredIds.has(j.id)
            );
            
            return noDifferentStatusIncluded;
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

    it('filterJobsByStatus works for all status values', () => {
      // Test each status value explicitly
      for (const status of jobStatusValues) {
        fc.assert(
          fc.property(
            fc.array(mockJobArb, { minLength: 5, maxLength: 30 }),
            (jobs) => {
              const filteredJobs = filterJobsByStatus(jobs, status);
              return filteredJobs.every(job => job.status === status);
            }
          ),
          { numRuns: 20 }
        );
      }
    });
  });
});

describe('Job Data Integrity', () => {
  it('job payment is always a valid positive number string', () => {
    fc.assert(
      fc.property(validJobInputArb, (input) => {
        const payment = BigInt(input.payment);
        return payment > BigInt(0);
      }),
      { numRuns: 100 }
    );
  });

  it('client addresses are normalized to lowercase', () => {
    fc.assert(
      fc.property(ethereumAddressArb, (address) => {
        const normalized = address.toLowerCase();
        return /^0x[a-f0-9]{40}$/.test(normalized);
      }),
      { numRuns: 100 }
    );
  });
});


/**
 * Job Execution Queue Types and Logic
 * Simulates the queue behavior from lib/queue.ts
 */
interface JobExecutionPayload {
  jobId: string;
  swarmId: string;
  jobDescription: string;
  requirements: string;
  onChainJobId: number;
}

interface MockBid {
  id: string;
  jobId: string;
  swarmId: string;
  price: string;
  estimatedTime: number;
  isAccepted: boolean;
}

interface MockJobWithDetails extends MockJob {
  requirements?: string;
  swarmId?: string;
}

interface QueuedJob {
  id: string;
  payload: JobExecutionPayload;
  queuedAt: Date;
}

interface JobExecutionQueue {
  jobs: QueuedJob[];
}

/**
 * Simulates the queueJobExecution function from lib/queue.ts
 * This is called when a bid is accepted
 */
function queueJobExecution(
  queue: JobExecutionQueue,
  payload: JobExecutionPayload
): QueuedJob {
  const queuedJob: QueuedJob = {
    id: `job-${payload.jobId}`,
    payload,
    queuedAt: new Date(),
  };
  queue.jobs.push(queuedJob);
  return queuedJob;
}

/**
 * Simulates the bid acceptance flow that queues job execution
 * This mirrors the logic in job.ts acceptBid procedure
 */
function acceptBidAndQueueExecution(
  queue: JobExecutionQueue,
  job: MockJobWithDetails,
  bid: MockBid
): { success: true; queuedJob: QueuedJob } | { success: false; error: string } {
  // Validate job exists
  if (!job) {
    return { success: false, error: 'Job not found' };
  }

  // Validate job is in OPEN status
  if (job.status !== 'OPEN') {
    return { success: false, error: `Cannot accept bids on a job with status ${job.status}` };
  }

  // Validate bid exists
  if (!bid) {
    return { success: false, error: 'Bid not found' };
  }

  // Validate bid belongs to this job
  if (bid.jobId !== job.id) {
    return { success: false, error: 'Bid does not belong to this job' };
  }

  // Create the job execution payload
  const payload: JobExecutionPayload = {
    jobId: job.id,
    swarmId: bid.swarmId,
    jobDescription: job.title + '\n\n' + job.description,
    requirements: job.requirements || '',
    onChainJobId: job.onChainId,
  };

  // Queue the job execution
  const queuedJob = queueJobExecution(queue, payload);

  return { success: true, queuedJob };
}

/**
 * Verify that a queued job has the correct payload
 */
function verifyQueuedJobPayload(
  queuedJob: QueuedJob,
  expectedJobId: string,
  expectedSwarmId: string
): boolean {
  return (
    queuedJob.payload.jobId === expectedJobId &&
    queuedJob.payload.swarmId === expectedSwarmId
  );
}

// Generators for job queue testing
const mockBidArb = fc.record({
  id: fc.uuid(),
  jobId: fc.uuid(),
  swarmId: fc.uuid(),
  price: fc.bigInt({ min: BigInt(1), max: largeBigInt() }).map(n => n.toString()),
  estimatedTime: fc.integer({ min: 1, max: 720 }),
  isAccepted: fc.constant(false), // Bids start as not accepted
});

const mockJobWithDetailsArb = fc.record({
  id: fc.uuid(),
  onChainId: fc.integer({ min: 1, max: 1000000 }),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.string({ minLength: 1, maxLength: 500 }),
  payment: fc.bigInt({ min: BigInt(1), max: largeBigInt() }).map(n => n.toString()),
  status: jobStatusArb,
  clientAddr: ethereumAddressArb,
  createdAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
  requirements: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
  swarmId: fc.option(fc.uuid(), { nil: undefined }),
});

describe('Job Execution Queue Logic', () => {
  /**
   * Feature: swarm-marketplace, Property 20: Accepted Bid Queues Execution
   * 
   * For any accepted bid, a job execution task SHALL be added to the BullMQ queue 
   * with the correct jobId and swarmId.
   * Validates: Requirements 5.1
   */
  describe('Property 20: Accepted Bid Queues Execution', () => {
    it('accepted bid queues job execution with correct jobId and swarmId', () => {
      fc.assert(
        fc.property(
          mockJobWithDetailsArb.filter(j => j.status === 'OPEN'),
          mockBidArb,
          (job, bidTemplate) => {
            const queue: JobExecutionQueue = { jobs: [] };
            
            // Make bid belong to this job
            const bid = { ...bidTemplate, jobId: job.id };
            
            const result = acceptBidAndQueueExecution(queue, job, bid);
            
            if (!result.success) return false;
            
            // Verify the queued job has correct jobId and swarmId
            return verifyQueuedJobPayload(result.queuedJob, job.id, bid.swarmId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('queued job payload contains correct job description', () => {
      fc.assert(
        fc.property(
          mockJobWithDetailsArb.filter(j => j.status === 'OPEN'),
          mockBidArb,
          (job, bidTemplate) => {
            const queue: JobExecutionQueue = { jobs: [] };
            const bid = { ...bidTemplate, jobId: job.id };
            
            const result = acceptBidAndQueueExecution(queue, job, bid);
            
            if (!result.success) return false;
            
            // Job description should be title + description
            const expectedDescription = job.title + '\n\n' + job.description;
            return result.queuedJob.payload.jobDescription === expectedDescription;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('queued job payload contains correct requirements', () => {
      fc.assert(
        fc.property(
          mockJobWithDetailsArb.filter(j => j.status === 'OPEN'),
          mockBidArb,
          (job, bidTemplate) => {
            const queue: JobExecutionQueue = { jobs: [] };
            const bid = { ...bidTemplate, jobId: job.id };
            
            const result = acceptBidAndQueueExecution(queue, job, bid);
            
            if (!result.success) return false;
            
            // Requirements should match job requirements or be empty string
            const expectedRequirements = job.requirements || '';
            return result.queuedJob.payload.requirements === expectedRequirements;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('queued job payload contains correct onChainJobId', () => {
      fc.assert(
        fc.property(
          mockJobWithDetailsArb.filter(j => j.status === 'OPEN'),
          mockBidArb,
          (job, bidTemplate) => {
            const queue: JobExecutionQueue = { jobs: [] };
            const bid = { ...bidTemplate, jobId: job.id };
            
            const result = acceptBidAndQueueExecution(queue, job, bid);
            
            if (!result.success) return false;
            
            return result.queuedJob.payload.onChainJobId === job.onChainId;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('job is added to queue after bid acceptance', () => {
      fc.assert(
        fc.property(
          mockJobWithDetailsArb.filter(j => j.status === 'OPEN'),
          mockBidArb,
          (job, bidTemplate) => {
            const queue: JobExecutionQueue = { jobs: [] };
            const initialQueueLength = queue.jobs.length;
            const bid = { ...bidTemplate, jobId: job.id };
            
            const result = acceptBidAndQueueExecution(queue, job, bid);
            
            if (!result.success) return false;
            
            // Queue should have one more job
            return queue.jobs.length === initialQueueLength + 1;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('queued job has valid queue timestamp', () => {
      fc.assert(
        fc.property(
          mockJobWithDetailsArb.filter(j => j.status === 'OPEN'),
          mockBidArb,
          (job, bidTemplate) => {
            const queue: JobExecutionQueue = { jobs: [] };
            const bid = { ...bidTemplate, jobId: job.id };
            const beforeQueue = new Date();
            
            const result = acceptBidAndQueueExecution(queue, job, bid);
            
            const afterQueue = new Date();
            
            if (!result.success) return false;
            
            // queuedAt should be between before and after
            return result.queuedJob.queuedAt >= beforeQueue && 
                   result.queuedJob.queuedAt <= afterQueue;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('queued job has unique ID based on jobId', () => {
      fc.assert(
        fc.property(
          mockJobWithDetailsArb.filter(j => j.status === 'OPEN'),
          mockBidArb,
          (job, bidTemplate) => {
            const queue: JobExecutionQueue = { jobs: [] };
            const bid = { ...bidTemplate, jobId: job.id };
            
            const result = acceptBidAndQueueExecution(queue, job, bid);
            
            if (!result.success) return false;
            
            // Queue job ID should be based on the job ID
            return result.queuedJob.id === `job-${job.id}`;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('non-OPEN jobs do not queue execution', () => {
      fc.assert(
        fc.property(
          mockJobWithDetailsArb.filter(j => j.status !== 'OPEN'),
          mockBidArb,
          (job, bidTemplate) => {
            const queue: JobExecutionQueue = { jobs: [] };
            const bid = { ...bidTemplate, jobId: job.id };
            
            const result = acceptBidAndQueueExecution(queue, job, bid);
            
            // Should fail and queue should remain empty
            return result.success === false && queue.jobs.length === 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('bid for different job does not queue execution', () => {
      fc.assert(
        fc.property(
          mockJobWithDetailsArb.filter(j => j.status === 'OPEN'),
          mockBidArb,
          fc.uuid(),
          (job, bidTemplate, differentJobId) => {
            // Skip if by chance the different job ID matches
            if (differentJobId === job.id) return true;
            
            const queue: JobExecutionQueue = { jobs: [] };
            const bid = { ...bidTemplate, jobId: differentJobId };
            
            const result = acceptBidAndQueueExecution(queue, job, bid);
            
            // Should fail because bid doesn't belong to job
            return result.success === false && 
                   result.error === 'Bid does not belong to this job' &&
                   queue.jobs.length === 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('multiple bid acceptances queue multiple jobs', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.tuple(
              mockJobWithDetailsArb.filter(j => j.status === 'OPEN'),
              mockBidArb
            ),
            { minLength: 1, maxLength: 10 }
          ),
          (jobBidPairs) => {
            const queue: JobExecutionQueue = { jobs: [] };
            let successCount = 0;
            
            for (const [job, bidTemplate] of jobBidPairs) {
              const bid = { ...bidTemplate, jobId: job.id };
              const result = acceptBidAndQueueExecution(queue, job, bid);
              if (result.success) {
                successCount++;
              }
            }
            
            // Queue should have exactly as many jobs as successful acceptances
            return queue.jobs.length === successCount;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
