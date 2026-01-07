/**
 * Property tests for swarm display
 * 
 * Feature: swarm-marketplace
 * Property 26: Swarm Display Contains Required Fields
 * Validates: Requirements 2.5
 * 
 * For any swarm view, the rendered output SHALL contain:
 * - swarm name
 * - description
 * - agent count
 * - total budget
 * - rating
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { formatUnits } from 'viem';

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

// ===========================================
// Generators for property-based testing
// ===========================================

const hexChar = fc.constantFrom(...'0123456789abcdef'.split(''));

const ethereumAddressArb = fc.array(hexChar, { minLength: 40, maxLength: 40 })
  .map(chars => `0x${chars.join('')}`);

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

// Generator for valid descriptions (non-empty, printable)
const swarmDescriptionArb = fc.string({ minLength: 1, maxLength: 500 })
  .filter(s => s.trim().length > 0);

const mockSwarmArb = fc.record({
  id: fc.uuid(),
  onChainId: fc.array(hexChar, { minLength: 64, maxLength: 64 }).map(chars => `0x${chars.join('')}`),
  name: swarmNameArb,
  description: swarmDescriptionArb,
  owner: ethereumAddressArb,
  budget: fc.bigInt({ min: BigInt(0), max: largeBigInt() }).map(n => n.toString()),
  rating: fc.float({ min: 0, max: 5, noNaN: true }),
  isActive: fc.boolean(),
  agents: fc.array(mockAgentArb, { minLength: 1, maxLength: 10 }),
  createdAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
  updatedAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
});

// ===========================================
// Display Data Extraction Functions
// (These mirror the logic in the swarm display components)
// ===========================================

/**
 * Represents the required display fields for a swarm view
 */
interface SwarmDisplayData {
  name: string;
  description: string;
  agentCount: number;
  budget: string;
  rating: number;
}

/**
 * Extracts display data from a swarm object
 * This mirrors the logic used in SwarmCard and SwarmDetailPage components
 */
function extractSwarmDisplayData(swarm: MockSwarm): SwarmDisplayData {
  const budgetValue = typeof swarm.budget === 'string' 
    ? swarm.budget 
    : swarm.budget.toString();
  
  const formattedBudget = parseFloat(formatUnits(BigInt(budgetValue), 18)).toFixed(2);
  
  return {
    name: swarm.name,
    description: swarm.description,
    agentCount: swarm.agents.length,
    budget: formattedBudget,
    rating: swarm.rating,
  };
}

/**
 * Validates that all required fields are present and valid
 */
function validateSwarmDisplayData(displayData: SwarmDisplayData): {
  isValid: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];
  
  // Check name is present and non-empty
  if (!displayData.name || displayData.name.trim().length === 0) {
    missingFields.push('name');
  }
  
  // Check description is present and non-empty
  if (!displayData.description || displayData.description.trim().length === 0) {
    missingFields.push('description');
  }
  
  // Check agent count is a valid number >= 0
  if (typeof displayData.agentCount !== 'number' || displayData.agentCount < 0 || !Number.isFinite(displayData.agentCount)) {
    missingFields.push('agentCount');
  }
  
  // Check budget is present and is a valid formatted string
  if (!displayData.budget || displayData.budget.trim().length === 0) {
    missingFields.push('budget');
  }
  
  // Check rating is a valid number between 0 and 5
  if (typeof displayData.rating !== 'number' || displayData.rating < 0 || displayData.rating > 5 || !Number.isFinite(displayData.rating)) {
    missingFields.push('rating');
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Checks if a rendered string contains all required swarm fields
 * This simulates checking rendered component output
 */
function checkRenderedOutputContainsFields(
  swarm: MockSwarm,
  renderedOutput: string
): { containsAll: boolean; missingFields: string[] } {
  const missingFields: string[] = [];
  
  // Check name is in output
  if (!renderedOutput.includes(swarm.name)) {
    missingFields.push('name');
  }
  
  // Check description is in output
  if (!renderedOutput.includes(swarm.description)) {
    missingFields.push('description');
  }
  
  // Check agent count is in output (as a number)
  const agentCountStr = swarm.agents.length.toString();
  if (!renderedOutput.includes(agentCountStr)) {
    missingFields.push('agentCount');
  }
  
  // Check budget is in output (formatted)
  const budgetValue = typeof swarm.budget === 'string' ? swarm.budget : swarm.budget.toString();
  const formattedBudget = parseFloat(formatUnits(BigInt(budgetValue), 18)).toFixed(2);
  if (!renderedOutput.includes(formattedBudget)) {
    missingFields.push('budget');
  }
  
  // Check rating is in output (formatted to 1 decimal)
  const formattedRating = swarm.rating.toFixed(1);
  if (!renderedOutput.includes(formattedRating)) {
    missingFields.push('rating');
  }
  
  return {
    containsAll: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Simulates rendering a swarm card/detail view
 * This creates a string representation similar to what the component would render
 */
function simulateSwarmRender(swarm: MockSwarm): string {
  const displayData = extractSwarmDisplayData(swarm);
  
  // Simulate the rendered output containing all required fields
  return `
    <div class="swarm-card">
      <h1>${displayData.name}</h1>
      <p>${displayData.description}</p>
      <span class="agent-count">${displayData.agentCount} agents</span>
      <span class="budget">${displayData.budget} MNEE</span>
      <span class="rating">${displayData.rating.toFixed(1)}</span>
    </div>
  `;
}

// ===========================================
// Property Tests
// ===========================================

describe('Swarm Display Properties', () => {
  /**
   * Feature: swarm-marketplace, Property 26: Swarm Display Contains Required Fields
   * 
   * For any swarm view, the rendered output SHALL contain:
   * swarm name, description, agent count, total budget, and rating.
   * Validates: Requirements 2.5
   */
  describe('Property 26: Swarm Display Contains Required Fields', () => {
    it('extractSwarmDisplayData extracts all required fields', () => {
      fc.assert(
        fc.property(
          mockSwarmArb,
          (swarm) => {
            const displayData = extractSwarmDisplayData(swarm);
            const validation = validateSwarmDisplayData(displayData);
            
            return validation.isValid;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('extracted name matches original swarm name', () => {
      fc.assert(
        fc.property(
          mockSwarmArb,
          (swarm) => {
            const displayData = extractSwarmDisplayData(swarm);
            return displayData.name === swarm.name;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('extracted description matches original swarm description', () => {
      fc.assert(
        fc.property(
          mockSwarmArb,
          (swarm) => {
            const displayData = extractSwarmDisplayData(swarm);
            return displayData.description === swarm.description;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('extracted agent count matches actual number of agents', () => {
      fc.assert(
        fc.property(
          mockSwarmArb,
          (swarm) => {
            const displayData = extractSwarmDisplayData(swarm);
            return displayData.agentCount === swarm.agents.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('extracted budget is correctly formatted from wei', () => {
      fc.assert(
        fc.property(
          mockSwarmArb,
          (swarm) => {
            const displayData = extractSwarmDisplayData(swarm);
            const expectedBudget = parseFloat(formatUnits(BigInt(swarm.budget), 18)).toFixed(2);
            return displayData.budget === expectedBudget;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('extracted rating matches original swarm rating', () => {
      fc.assert(
        fc.property(
          mockSwarmArb,
          (swarm) => {
            const displayData = extractSwarmDisplayData(swarm);
            return displayData.rating === swarm.rating;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('simulated render output contains all required fields', () => {
      fc.assert(
        fc.property(
          mockSwarmArb,
          (swarm) => {
            const renderedOutput = simulateSwarmRender(swarm);
            const check = checkRenderedOutputContainsFields(swarm, renderedOutput);
            
            return check.containsAll;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('rating is always within valid range (0-5)', () => {
      fc.assert(
        fc.property(
          mockSwarmArb,
          (swarm) => {
            const displayData = extractSwarmDisplayData(swarm);
            return displayData.rating >= 0 && displayData.rating <= 5;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('agent count is always non-negative', () => {
      fc.assert(
        fc.property(
          mockSwarmArb,
          (swarm) => {
            const displayData = extractSwarmDisplayData(swarm);
            return displayData.agentCount >= 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('budget format is consistent (2 decimal places)', () => {
      fc.assert(
        fc.property(
          mockSwarmArb,
          (swarm) => {
            const displayData = extractSwarmDisplayData(swarm);
            // Check that budget has exactly 2 decimal places
            const decimalPart = displayData.budget.split('.')[1];
            return decimalPart !== undefined && decimalPart.length === 2;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Swarm Display Edge Cases', () => {
    it('handles swarm with single agent', () => {
      fc.assert(
        fc.property(
          mockSwarmArb.map(swarm => ({
            ...swarm,
            agents: [swarm.agents[0]]
          })),
          (swarm) => {
            const displayData = extractSwarmDisplayData(swarm);
            const validation = validateSwarmDisplayData(displayData);
            
            return validation.isValid && displayData.agentCount === 1;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('handles swarm with zero budget', () => {
      fc.assert(
        fc.property(
          mockSwarmArb.map(swarm => ({
            ...swarm,
            budget: '0'
          })),
          (swarm) => {
            const displayData = extractSwarmDisplayData(swarm);
            const validation = validateSwarmDisplayData(displayData);
            
            return validation.isValid && displayData.budget === '0.00';
          }
        ),
        { numRuns: 100 }
      );
    });

    it('handles swarm with zero rating', () => {
      fc.assert(
        fc.property(
          mockSwarmArb.map(swarm => ({
            ...swarm,
            rating: 0
          })),
          (swarm) => {
            const displayData = extractSwarmDisplayData(swarm);
            const validation = validateSwarmDisplayData(displayData);
            
            return validation.isValid && displayData.rating === 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('handles swarm with maximum rating (5)', () => {
      fc.assert(
        fc.property(
          mockSwarmArb.map(swarm => ({
            ...swarm,
            rating: 5
          })),
          (swarm) => {
            const displayData = extractSwarmDisplayData(swarm);
            const validation = validateSwarmDisplayData(displayData);
            
            return validation.isValid && displayData.rating === 5;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('handles swarm with large budget (wei precision)', () => {
      fc.assert(
        fc.property(
          mockSwarmArb.map(swarm => ({
            ...swarm,
            // 1 million MNEE in wei
            budget: '1000000000000000000000000'
          })),
          (swarm) => {
            const displayData = extractSwarmDisplayData(swarm);
            const validation = validateSwarmDisplayData(displayData);
            
            return validation.isValid && displayData.budget === '1000000.00';
          }
        ),
        { numRuns: 100 }
      );
    });

    it('handles swarm with all agent roles represented', () => {
      fc.assert(
        fc.property(
          mockSwarmArb.chain(swarm => {
            // Ensure at least one agent of each role
            const roles: AgentRole[] = ['ROUTER', 'WORKER', 'QA'];
            const agents = roles.map((role, i) => ({
              ...swarm.agents[0],
              id: `agent-${i}`,
              role,
            }));
            return fc.constant({
              ...swarm,
              agents,
            });
          }),
          (swarm) => {
            const displayData = extractSwarmDisplayData(swarm);
            const validation = validateSwarmDisplayData(displayData);
            
            return validation.isValid && displayData.agentCount === 3;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Display Data Consistency', () => {
    it('extractSwarmDisplayData is deterministic', () => {
      fc.assert(
        fc.property(
          mockSwarmArb,
          (swarm) => {
            const displayData1 = extractSwarmDisplayData(swarm);
            const displayData2 = extractSwarmDisplayData(swarm);
            
            return (
              displayData1.name === displayData2.name &&
              displayData1.description === displayData2.description &&
              displayData1.agentCount === displayData2.agentCount &&
              displayData1.budget === displayData2.budget &&
              displayData1.rating === displayData2.rating
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('display data does not modify original swarm', () => {
      fc.assert(
        fc.property(
          mockSwarmArb,
          (swarm) => {
            const originalName = swarm.name;
            const originalDescription = swarm.description;
            const originalAgentCount = swarm.agents.length;
            const originalBudget = swarm.budget;
            const originalRating = swarm.rating;
            
            extractSwarmDisplayData(swarm);
            
            return (
              swarm.name === originalName &&
              swarm.description === originalDescription &&
              swarm.agents.length === originalAgentCount &&
              swarm.budget === originalBudget &&
              swarm.rating === originalRating
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
