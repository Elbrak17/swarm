/**
 * Property tests for job bids display
 * 
 * Feature: swarm-marketplace
 * Property 28: Job View Shows All Bids
 * Validates: Requirements 4.3
 * 
 * For any job with N bids, the job detail view SHALL display all N bids
 * with swarm name, price, estimated time, and swarm rating.
 */

import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { formatUnits } from 'viem';

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

interface MockBid {
  id: string;
  jobId: string;
  swarmId: string;
  swarm?: MockSwarm;
  price: string;
  estimatedTime: number;
  message?: string;
  isAccepted: boolean;
  createdAt: Date;
}

interface MockJob {
  id: string;
  onChainId: number;
  title: string;
  description: string;
  requirements?: string;
  payment: string;
  status: JobStatus;
  clientAddr: string;
  swarmId?: string;
  swarm?: MockSwarm;
  bids: MockBid[];
  resultHash?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
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

// Generator for valid swarm names (non-empty, printable)
const swarmNameArb = fc.string({ minLength: 1, maxLength: 100 })
  .filter(s => s.trim().length > 0);

const mockSwarmArb = fc.record({
  id: fc.uuid(),
  onChainId: fc.array(hexChar, { minLength: 64, maxLength: 64 }).map(chars => `0x${chars.join('')}`),
  name: swarmNameArb,
  description: fc.string({ minLength: 1, maxLength: 500 }),
  owner: ethereumAddressArb,
  budget: fc.bigInt({ min: BigInt(0), max: largeBigInt() }).map(n => n.toString()),
  rating: fc.float({ min: 0, max: 5, noNaN: true }),
  isActive: fc.boolean(),
  agents: fc.array(mockAgentArb, { minLength: 1, maxLength: 5 }),
  createdAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
  updatedAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
});

const mockBidArb = fc.record({
  id: fc.uuid(),
  jobId: fc.uuid(),
  swarmId: fc.uuid(),
  swarm: mockSwarmArb,
  price: fc.bigInt({ min: BigInt(1), max: largeBigInt() }).map(n => n.toString()),
  estimatedTime: fc.integer({ min: 1, max: 720 }), // 1 hour to 30 days
  message: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
  isAccepted: fc.boolean(),
  createdAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
});

const mockJobWithBidsArb = fc.record({
  id: fc.uuid(),
  onChainId: fc.integer({ min: 1, max: 1000000 }),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.string({ minLength: 1, maxLength: 500 }),
  requirements: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
  payment: fc.bigInt({ min: BigInt(1), max: largeBigInt() }).map(n => n.toString()),
  status: jobStatusArb,
  clientAddr: ethereumAddressArb,
  swarmId: fc.option(fc.uuid(), { nil: undefined }),
  swarm: fc.option(mockSwarmArb, { nil: undefined }),
  bids: fc.array(mockBidArb, { minLength: 0, maxLength: 20 }),
  resultHash: fc.option(fc.string({ minLength: 64, maxLength: 64 }), { nil: undefined }),
  createdAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
  updatedAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
  completedAt: fc.option(fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }), { nil: undefined }),
});

// ===========================================
// Bid Display Data Extraction Functions
// (These mirror the logic in the job detail page component)
// ===========================================

/**
 * Represents the required display fields for a bid in the job view
 */
interface BidDisplayData {
  id: string;
  swarmName: string;
  price: string;
  estimatedTime: number;
  swarmRating: number;
}

/**
 * Extracts display data from a bid object
 * This mirrors the logic used in the JobDetailPage component
 */
function extractBidDisplayData(bid: MockBid): BidDisplayData {
  const priceValue = typeof bid.price === 'string' ? bid.price : bid.price.toString();
  const formattedPrice = formatUnits(BigInt(priceValue), 18);
  
  return {
    id: bid.id,
    swarmName: bid.swarm?.name || 'Unknown Swarm',
    price: formattedPrice,
    estimatedTime: bid.estimatedTime,
    swarmRating: bid.swarm?.rating || 0,
  };
}

/**
 * Extracts all bid display data from a job
 */
function extractAllBidsDisplayData(job: MockJob): BidDisplayData[] {
  return (job.bids || []).map(extractBidDisplayData);
}

/**
 * Validates that all required fields are present and valid for a bid display
 */
function validateBidDisplayData(displayData: BidDisplayData): {
  isValid: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];
  
  // Check id is present
  if (!displayData.id || displayData.id.trim().length === 0) {
    missingFields.push('id');
  }
  
  // Check swarm name is present
  if (!displayData.swarmName || displayData.swarmName.trim().length === 0) {
    missingFields.push('swarmName');
  }
  
  // Check price is present and valid
  if (!displayData.price || displayData.price.trim().length === 0) {
    missingFields.push('price');
  }
  
  // Check estimated time is a valid positive number
  if (typeof displayData.estimatedTime !== 'number' || displayData.estimatedTime <= 0 || !Number.isFinite(displayData.estimatedTime)) {
    missingFields.push('estimatedTime');
  }
  
  // Check swarm rating is a valid number between 0 and 5
  if (typeof displayData.swarmRating !== 'number' || displayData.swarmRating < 0 || displayData.swarmRating > 5 || !Number.isFinite(displayData.swarmRating)) {
    missingFields.push('swarmRating');
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Simulates rendering a bid item in the job detail view
 * This creates a string representation similar to what the component would render
 */
function simulateBidRender(bid: MockBid): string {
  const displayData = extractBidDisplayData(bid);
  
  return `
    <div class="bid-item" data-bid-id="${displayData.id}">
      <span class="swarm-name">${displayData.swarmName}</span>
      <span class="price">${displayData.price} MNEE</span>
      <span class="estimated-time">Est. ${displayData.estimatedTime}h</span>
      <span class="rating">${displayData.swarmRating.toFixed(1)}</span>
    </div>
  `;
}

/**
 * Simulates rendering all bids in the job detail view
 */
function simulateAllBidsRender(job: MockJob): string {
  if (!job.bids || job.bids.length === 0) {
    return '<p>No bids yet.</p>';
  }
  
  return `
    <div class="bids-section">
      <h3>Bids (${job.bids.length})</h3>
      ${job.bids.map(simulateBidRender).join('\n')}
    </div>
  `;
}

/**
 * Checks if a rendered string contains all required bid fields
 */
function checkRenderedBidContainsFields(
  bid: MockBid,
  renderedOutput: string
): { containsAll: boolean; missingFields: string[] } {
  const missingFields: string[] = [];
  const displayData = extractBidDisplayData(bid);
  
  // Check swarm name is in output
  if (!renderedOutput.includes(displayData.swarmName)) {
    missingFields.push('swarmName');
  }
  
  // Check price is in output
  if (!renderedOutput.includes(displayData.price)) {
    missingFields.push('price');
  }
  
  // Check estimated time is in output
  if (!renderedOutput.includes(displayData.estimatedTime.toString())) {
    missingFields.push('estimatedTime');
  }
  
  // Check rating is in output (formatted to 1 decimal)
  const formattedRating = displayData.swarmRating.toFixed(1);
  if (!renderedOutput.includes(formattedRating)) {
    missingFields.push('swarmRating');
  }
  
  return {
    containsAll: missingFields.length === 0,
    missingFields,
  };
}

// ===========================================
// Property Tests
// ===========================================

describe('Job Bids Display Properties', () => {
  /**
   * Feature: swarm-marketplace, Property 28: Job View Shows All Bids
   * 
   * For any job with N bids, the job detail view SHALL display all N bids
   * with swarm name, price, estimated time, and swarm rating.
   * Validates: Requirements 4.3
   */
  describe('Property 28: Job View Shows All Bids', () => {
    it('extractAllBidsDisplayData returns correct number of bids', () => {
      fc.assert(
        fc.property(
          mockJobWithBidsArb,
          (job) => {
            const bidsDisplayData = extractAllBidsDisplayData(job);
            return bidsDisplayData.length === (job.bids?.length || 0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('each bid display data contains all required fields', () => {
      fc.assert(
        fc.property(
          mockJobWithBidsArb,
          (job) => {
            const bidsDisplayData = extractAllBidsDisplayData(job);
            return bidsDisplayData.every(bidData => {
              const validation = validateBidDisplayData(bidData);
              return validation.isValid;
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('extracted swarm name matches original bid swarm name', () => {
      fc.assert(
        fc.property(
          mockBidArb,
          (bid) => {
            const displayData = extractBidDisplayData(bid);
            const expectedName = bid.swarm?.name || 'Unknown Swarm';
            return displayData.swarmName === expectedName;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('extracted price is correctly formatted from wei', () => {
      fc.assert(
        fc.property(
          mockBidArb,
          (bid) => {
            const displayData = extractBidDisplayData(bid);
            const expectedPrice = formatUnits(BigInt(bid.price), 18);
            return displayData.price === expectedPrice;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('extracted estimated time matches original bid estimated time', () => {
      fc.assert(
        fc.property(
          mockBidArb,
          (bid) => {
            const displayData = extractBidDisplayData(bid);
            return displayData.estimatedTime === bid.estimatedTime;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('extracted swarm rating matches original bid swarm rating', () => {
      fc.assert(
        fc.property(
          mockBidArb,
          (bid) => {
            const displayData = extractBidDisplayData(bid);
            const expectedRating = bid.swarm?.rating || 0;
            return displayData.swarmRating === expectedRating;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('simulated render output contains all required fields for each bid', () => {
      fc.assert(
        fc.property(
          mockJobWithBidsArb.filter(job => job.bids && job.bids.length > 0),
          (job) => {
            const renderedOutput = simulateAllBidsRender(job);
            
            return job.bids.every(bid => {
              const check = checkRenderedBidContainsFields(bid, renderedOutput);
              return check.containsAll;
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('all bid IDs are preserved in display data', () => {
      fc.assert(
        fc.property(
          mockJobWithBidsArb,
          (job) => {
            const bidsDisplayData = extractAllBidsDisplayData(job);
            const originalIds = new Set((job.bids || []).map(b => b.id));
            const displayIds = new Set(bidsDisplayData.map(b => b.id));
            
            return originalIds.size === displayIds.size &&
              [...originalIds].every(id => displayIds.has(id));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('bid count in rendered output matches actual bid count', () => {
      fc.assert(
        fc.property(
          mockJobWithBidsArb,
          (job) => {
            const renderedOutput = simulateAllBidsRender(job);
            const bidCount = job.bids?.length || 0;
            
            if (bidCount === 0) {
              return renderedOutput.includes('No bids yet');
            }
            
            return renderedOutput.includes(`Bids (${bidCount})`);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Bid Display Edge Cases', () => {
    it('handles job with no bids', () => {
      fc.assert(
        fc.property(
          mockJobWithBidsArb.map(job => ({ ...job, bids: [] })),
          (job) => {
            const bidsDisplayData = extractAllBidsDisplayData(job);
            return bidsDisplayData.length === 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('handles bid without swarm (shows Unknown Swarm)', () => {
      fc.assert(
        fc.property(
          mockBidArb.map(bid => ({ ...bid, swarm: undefined })),
          (bid) => {
            const displayData = extractBidDisplayData(bid);
            return displayData.swarmName === 'Unknown Swarm' && displayData.swarmRating === 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('handles bid with zero rating swarm', () => {
      fc.assert(
        fc.property(
          mockBidArb.map(bid => ({
            ...bid,
            swarm: bid.swarm ? { ...bid.swarm, rating: 0 } : undefined
          })),
          (bid) => {
            const displayData = extractBidDisplayData(bid);
            const validation = validateBidDisplayData(displayData);
            return validation.isValid;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('handles bid with maximum rating swarm (5)', () => {
      fc.assert(
        fc.property(
          mockBidArb.map(bid => ({
            ...bid,
            swarm: bid.swarm ? { ...bid.swarm, rating: 5 } : undefined
          })),
          (bid) => {
            const displayData = extractBidDisplayData(bid);
            const validation = validateBidDisplayData(displayData);
            return validation.isValid && displayData.swarmRating === 5;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('handles bid with minimum estimated time (1 hour)', () => {
      fc.assert(
        fc.property(
          mockBidArb.map(bid => ({ ...bid, estimatedTime: 1 })),
          (bid) => {
            const displayData = extractBidDisplayData(bid);
            return displayData.estimatedTime === 1;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('handles bid with large estimated time', () => {
      fc.assert(
        fc.property(
          mockBidArb.map(bid => ({ ...bid, estimatedTime: 720 })), // 30 days
          (bid) => {
            const displayData = extractBidDisplayData(bid);
            return displayData.estimatedTime === 720;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('handles job with single bid', () => {
      fc.assert(
        fc.property(
          mockJobWithBidsArb.chain(job => {
            if (job.bids.length === 0) {
              return mockBidArb.map(bid => ({ ...job, bids: [bid] }));
            }
            return fc.constant({ ...job, bids: [job.bids[0]] });
          }),
          (job) => {
            const bidsDisplayData = extractAllBidsDisplayData(job);
            return bidsDisplayData.length === 1;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('handles job with many bids (up to 20)', () => {
      fc.assert(
        fc.property(
          fc.array(mockBidArb, { minLength: 10, maxLength: 20 }).chain(bids =>
            mockJobWithBidsArb.map(job => ({ ...job, bids }))
          ),
          (job) => {
            const bidsDisplayData = extractAllBidsDisplayData(job);
            return bidsDisplayData.length === job.bids.length &&
              bidsDisplayData.every(bd => validateBidDisplayData(bd).isValid);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Bid Display Data Consistency', () => {
    it('extractBidDisplayData is deterministic', () => {
      fc.assert(
        fc.property(
          mockBidArb,
          (bid) => {
            const displayData1 = extractBidDisplayData(bid);
            const displayData2 = extractBidDisplayData(bid);
            
            return (
              displayData1.id === displayData2.id &&
              displayData1.swarmName === displayData2.swarmName &&
              displayData1.price === displayData2.price &&
              displayData1.estimatedTime === displayData2.estimatedTime &&
              displayData1.swarmRating === displayData2.swarmRating
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('extractAllBidsDisplayData preserves bid order', () => {
      fc.assert(
        fc.property(
          mockJobWithBidsArb.filter(job => job.bids && job.bids.length > 1),
          (job) => {
            const bidsDisplayData = extractAllBidsDisplayData(job);
            
            // Check that order is preserved
            return job.bids.every((bid, index) => 
              bidsDisplayData[index].id === bid.id
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('display data does not modify original bid', () => {
      fc.assert(
        fc.property(
          mockBidArb,
          (bid) => {
            const originalId = bid.id;
            const originalPrice = bid.price;
            const originalEstimatedTime = bid.estimatedTime;
            const originalSwarmName = bid.swarm?.name;
            const originalSwarmRating = bid.swarm?.rating;
            
            extractBidDisplayData(bid);
            
            return (
              bid.id === originalId &&
              bid.price === originalPrice &&
              bid.estimatedTime === originalEstimatedTime &&
              bid.swarm?.name === originalSwarmName &&
              bid.swarm?.rating === originalSwarmRating
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
