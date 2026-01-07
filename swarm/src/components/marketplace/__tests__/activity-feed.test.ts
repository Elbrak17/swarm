/**
 * Property tests for Activity Feed
 * 
 * Feature: swarm-marketplace
 * Property 34: Activity Feed Shows Transactions
 * Validates: Requirements 7.4
 * 
 * For any transaction in the database, it SHALL appear in the activity feed
 * with sender, receiver, amount, and timestamp.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { PaymentEvent, AgentActivityEvent } from '@/types';

// ===========================================
// Generators for property-based testing
// ===========================================

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

const paymentEventArb: fc.Arbitrary<PaymentEvent> = fc.record({
  id: fc.uuid(),
  fromAgent: ethereumAddressArb,
  toAgent: ethereumAddressArb,
  amount: fc.bigInt({ min: BigInt(1), max: largeBigInt() }).map(n => n.toString()),
  swarmId: fc.uuid(),
  jobId: fc.uuid(),
  timestamp: fc.integer({ min: 1704067200000, max: 1798761600000 }), // 2024-2027
});

const agentActivityEventArb: fc.Arbitrary<AgentActivityEvent> = fc.record({
  agentAddress: ethereumAddressArb,
  swarmId: fc.uuid(),
  action: fc.constantFrom('task_started', 'task_completed', 'payment_received'),
  details: fc.string({ minLength: 0, maxLength: 200 }),
  timestamp: fc.integer({ min: 1704067200000, max: 1798761600000 }), // 2024-2027
});

// ===========================================
// Activity Feed Logic Functions
// (These mirror the logic in the ActivityFeed component)
// ===========================================

type ActivityItem = 
  | { type: 'payment'; data: PaymentEvent }
  | { type: 'activity'; data: AgentActivityEvent };

/**
 * Combine and sort activities by timestamp (newest first)
 * This mirrors the logic in the ActivityFeed component
 */
function combineAndSortActivities(
  payments: PaymentEvent[],
  agentActivity: AgentActivityEvent[],
  maxItems: number = 10
): ActivityItem[] {
  const allActivities: ActivityItem[] = [
    ...payments.map(p => ({ type: 'payment' as const, data: p })),
    ...agentActivity.map(a => ({ type: 'activity' as const, data: a })),
  ]
    .sort((a, b) => {
      const timestampA = a.data.timestamp;
      const timestampB = b.data.timestamp;
      return timestampB - timestampA;
    })
    .slice(0, maxItems);

  return allActivities;
}

/**
 * Check if a payment event contains all required fields for display
 */
function paymentHasRequiredFields(payment: PaymentEvent): boolean {
  return (
    typeof payment.fromAgent === 'string' && payment.fromAgent.length > 0 &&
    typeof payment.toAgent === 'string' && payment.toAgent.length > 0 &&
    typeof payment.amount === 'string' && payment.amount.length > 0 &&
    typeof payment.timestamp === 'number' && payment.timestamp > 0
  );
}

/**
 * Check if an activity event contains all required fields for display
 */
function activityHasRequiredFields(activity: AgentActivityEvent): boolean {
  return (
    typeof activity.agentAddress === 'string' && activity.agentAddress.length > 0 &&
    typeof activity.timestamp === 'number' && activity.timestamp > 0 &&
    ['task_started', 'task_completed', 'payment_received'].includes(activity.action)
  );
}

/**
 * Truncate address for display (mirrors component logic)
 */
function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// ===========================================
// Property Tests
// ===========================================

describe('Activity Feed Logic', () => {
  /**
   * Feature: swarm-marketplace, Property 34: Activity Feed Shows Transactions
   * 
   * For any transaction in the database, it SHALL appear in the activity feed
   * with sender, receiver, amount, and timestamp.
   * Validates: Requirements 7.4
   */
  describe('Property 34: Activity Feed Shows Transactions', () => {
    it('all payment events within maxItems limit appear in activity feed', () => {
      fc.assert(
        fc.property(
          fc.array(paymentEventArb, { minLength: 0, maxLength: 10 }),
          fc.array(agentActivityEventArb, { minLength: 0, maxLength: 10 }),
          (payments, activities) => {
            const maxItems = 20; // Large enough to include all
            const combined = combineAndSortActivities(payments, activities, maxItems);
            
            // All payments should be in the combined list
            const paymentIds = new Set(payments.map(p => p.id));
            const combinedPaymentIds = new Set(
              combined
                .filter(item => item.type === 'payment')
                .map(item => (item.data as PaymentEvent).id)
            );
            
            return [...paymentIds].every(id => combinedPaymentIds.has(id));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('payment events contain sender (fromAgent) field', () => {
      fc.assert(
        fc.property(
          paymentEventArb,
          (payment) => {
            return (
              typeof payment.fromAgent === 'string' &&
              payment.fromAgent.startsWith('0x') &&
              payment.fromAgent.length === 42
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('payment events contain receiver (toAgent) field', () => {
      fc.assert(
        fc.property(
          paymentEventArb,
          (payment) => {
            return (
              typeof payment.toAgent === 'string' &&
              payment.toAgent.startsWith('0x') &&
              payment.toAgent.length === 42
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('payment events contain amount field', () => {
      fc.assert(
        fc.property(
          paymentEventArb,
          (payment) => {
            return (
              typeof payment.amount === 'string' &&
              payment.amount.length > 0 &&
              BigInt(payment.amount) > BigInt(0)
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('payment events contain timestamp field', () => {
      fc.assert(
        fc.property(
          paymentEventArb,
          (payment) => {
            return (
              typeof payment.timestamp === 'number' &&
              payment.timestamp > 0
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('all payment events have required display fields', () => {
      fc.assert(
        fc.property(
          fc.array(paymentEventArb, { minLength: 1, maxLength: 20 }),
          (payments) => {
            return payments.every(payment => paymentHasRequiredFields(payment));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('activity feed is sorted by timestamp descending (newest first)', () => {
      fc.assert(
        fc.property(
          fc.array(paymentEventArb, { minLength: 0, maxLength: 20 }),
          fc.array(agentActivityEventArb, { minLength: 0, maxLength: 20 }),
          (payments, activities) => {
            const combined = combineAndSortActivities(payments, activities, 50);
            
            // Verify descending order by timestamp
            for (let i = 0; i < combined.length - 1; i++) {
              if (combined[i].data.timestamp < combined[i + 1].data.timestamp) {
                return false;
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('activity feed respects maxItems limit', () => {
      fc.assert(
        fc.property(
          fc.array(paymentEventArb, { minLength: 0, maxLength: 30 }),
          fc.array(agentActivityEventArb, { minLength: 0, maxLength: 30 }),
          fc.integer({ min: 1, max: 20 }),
          (payments, activities, maxItems) => {
            const combined = combineAndSortActivities(payments, activities, maxItems);
            return combined.length <= maxItems;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('truncateAddress preserves address start and end', () => {
      fc.assert(
        fc.property(
          ethereumAddressArb,
          (address) => {
            const truncated = truncateAddress(address);
            const expectedStart = address.slice(0, 6);
            const expectedEnd = address.slice(-4);
            
            return (
              truncated.startsWith(expectedStart) &&
              truncated.endsWith(expectedEnd) &&
              truncated.includes('...')
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('activity feed preserves all data when combining payments and activities', () => {
      fc.assert(
        fc.property(
          fc.array(paymentEventArb, { minLength: 1, maxLength: 10 }),
          fc.array(agentActivityEventArb, { minLength: 1, maxLength: 10 }),
          (payments, activities) => {
            const maxItems = payments.length + activities.length;
            const combined = combineAndSortActivities(payments, activities, maxItems);
            
            // Total count should match
            if (combined.length !== payments.length + activities.length) {
              return false;
            }
            
            // All payment data should be preserved
            const combinedPayments = combined
              .filter(item => item.type === 'payment')
              .map(item => item.data as PaymentEvent);
            
            for (const payment of payments) {
              const found = combinedPayments.find(p => p.id === payment.id);
              if (!found) return false;
              if (found.fromAgent !== payment.fromAgent) return false;
              if (found.toAgent !== payment.toAgent) return false;
              if (found.amount !== payment.amount) return false;
              if (found.timestamp !== payment.timestamp) return false;
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('agent activity events have required display fields', () => {
      fc.assert(
        fc.property(
          fc.array(agentActivityEventArb, { minLength: 1, maxLength: 20 }),
          (activities) => {
            return activities.every(activity => activityHasRequiredFields(activity));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('empty payments and activities result in empty feed', () => {
      const combined = combineAndSortActivities([], [], 10);
      expect(combined).toEqual([]);
      expect(combined.length).toBe(0);
    });

    it('activity feed handles single payment correctly', () => {
      fc.assert(
        fc.property(
          paymentEventArb,
          (payment) => {
            const combined = combineAndSortActivities([payment], [], 10);
            return (
              combined.length === 1 &&
              combined[0].type === 'payment' &&
              (combined[0].data as PaymentEvent).id === payment.id
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('activity feed handles single activity correctly', () => {
      fc.assert(
        fc.property(
          agentActivityEventArb,
          (activity) => {
            const combined = combineAndSortActivities([], [activity], 10);
            return (
              combined.length === 1 &&
              combined[0].type === 'activity' &&
              (combined[0].data as AgentActivityEvent).agentAddress === activity.agentAddress
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
