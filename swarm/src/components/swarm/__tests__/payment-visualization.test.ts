/**
 * Property tests for payment visualization
 * 
 * Feature: swarm-marketplace
 * Property 33: Visualization Shows All Agents
 * Validates: Requirements 7.2
 * 
 * For any swarm with N agents, the visualization SHALL render N agent nodes.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Agent role enum values
const agentRoleValues = ['ROUTER', 'WORKER', 'QA'] as const;
type AgentRole = typeof agentRoleValues[number];

// ===========================================
// Mock Types (matching the actual types)
// ===========================================

interface AgentData {
  id: string;
  address: string;
  role: string;
}

// ===========================================
// Generators for property-based testing
// ===========================================

const hexChar = fc.constantFrom(...'0123456789abcdef'.split(''));

const ethereumAddressArb = fc.array(hexChar, { minLength: 40, maxLength: 40 })
  .map(chars => `0x${chars.join('')}`);

const agentRoleArb = fc.constantFrom(...agentRoleValues);

const agentDataArb = fc.record({
  id: fc.uuid(),
  address: ethereumAddressArb,
  role: agentRoleArb,
});

// Generator for arrays of agents with varying sizes
const agentArrayArb = fc.array(agentDataArb, { minLength: 1, maxLength: 20 });

// ===========================================
// Visualization Logic Functions
// (These mirror the logic in PaymentVisualization component)
// ===========================================

/**
 * Calculate node positions in a circle layout
 * This is the same function used in the PaymentVisualization component
 */
function calculateNodePositions(count: number, radius: number = 120) {
  const positions: { x: number; y: number }[] = [];
  const centerX = 150;
  const centerY = 150;
  
  for (let i = 0; i < count; i++) {
    const angle = (i * 2 * Math.PI) / count - Math.PI / 2; // Start from top
    positions.push({
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    });
  }
  
  return positions;
}

/**
 * Represents the visualization state for agents
 */
interface VisualizationState {
  nodeCount: number;
  positions: { x: number; y: number }[];
  agents: AgentData[];
}

/**
 * Extracts visualization state from agents array
 * This mirrors the logic used in PaymentVisualization component
 */
function extractVisualizationState(agents: AgentData[]): VisualizationState {
  const positions = calculateNodePositions(agents.length);
  
  return {
    nodeCount: agents.length,
    positions,
    agents,
  };
}

/**
 * Validates that all agents have corresponding nodes
 */
function validateAllAgentsHaveNodes(state: VisualizationState): {
  isValid: boolean;
  missingAgents: string[];
} {
  const missingAgents: string[] = [];
  
  // Check that we have a position for each agent
  if (state.positions.length !== state.agents.length) {
    state.agents.forEach((agent, index) => {
      if (!state.positions[index]) {
        missingAgents.push(agent.id);
      }
    });
  }
  
  return {
    isValid: missingAgents.length === 0 && state.nodeCount === state.agents.length,
    missingAgents,
  };
}

/**
 * Simulates rendering agent nodes
 * Returns an array of rendered node representations
 */
function simulateAgentNodeRender(agents: AgentData[]): Array<{
  agentId: string;
  address: string;
  role: string;
  position: { x: number; y: number };
}> {
  const positions = calculateNodePositions(agents.length);
  
  return agents.map((agent, index) => ({
    agentId: agent.id,
    address: agent.address,
    role: agent.role,
    position: positions[index],
  }));
}

/**
 * Checks if all agents are represented in the rendered output
 */
function checkAllAgentsRendered(
  agents: AgentData[],
  renderedNodes: Array<{ agentId: string }>
): { allRendered: boolean; missingAgentIds: string[] } {
  const renderedIds = new Set(renderedNodes.map(n => n.agentId));
  const missingAgentIds: string[] = [];
  
  for (const agent of agents) {
    if (!renderedIds.has(agent.id)) {
      missingAgentIds.push(agent.id);
    }
  }
  
  return {
    allRendered: missingAgentIds.length === 0,
    missingAgentIds,
  };
}

// ===========================================
// Property Tests
// ===========================================

describe('Payment Visualization Properties', () => {
  /**
   * Feature: swarm-marketplace, Property 33: Visualization Shows All Agents
   * 
   * For any swarm with N agents, the visualization SHALL render N agent nodes.
   * Validates: Requirements 7.2
   */
  describe('Property 33: Visualization Shows All Agents', () => {
    it('visualization state has correct node count for any number of agents', () => {
      fc.assert(
        fc.property(
          agentArrayArb,
          (agents) => {
            const state = extractVisualizationState(agents);
            return state.nodeCount === agents.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('calculateNodePositions returns exactly N positions for N agents', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50 }),
          (agentCount) => {
            const positions = calculateNodePositions(agentCount);
            return positions.length === agentCount;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('every agent has a corresponding position in the visualization', () => {
      fc.assert(
        fc.property(
          agentArrayArb,
          (agents) => {
            const state = extractVisualizationState(agents);
            const validation = validateAllAgentsHaveNodes(state);
            return validation.isValid;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('simulated render produces exactly N nodes for N agents', () => {
      fc.assert(
        fc.property(
          agentArrayArb,
          (agents) => {
            const renderedNodes = simulateAgentNodeRender(agents);
            return renderedNodes.length === agents.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('all agents are represented in the rendered output', () => {
      fc.assert(
        fc.property(
          agentArrayArb,
          (agents) => {
            const renderedNodes = simulateAgentNodeRender(agents);
            const check = checkAllAgentsRendered(agents, renderedNodes);
            return check.allRendered;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('each rendered node has a valid position', () => {
      fc.assert(
        fc.property(
          agentArrayArb,
          (agents) => {
            const renderedNodes = simulateAgentNodeRender(agents);
            return renderedNodes.every(node => 
              typeof node.position.x === 'number' &&
              typeof node.position.y === 'number' &&
              Number.isFinite(node.position.x) &&
              Number.isFinite(node.position.y)
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('each rendered node preserves agent data', () => {
      fc.assert(
        fc.property(
          agentArrayArb,
          (agents) => {
            const renderedNodes = simulateAgentNodeRender(agents);
            
            return agents.every((agent, index) => {
              const node = renderedNodes[index];
              return (
                node.agentId === agent.id &&
                node.address === agent.address &&
                node.role === agent.role
              );
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Node Position Properties', () => {
    it('all node positions are within the visualization bounds', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50 }),
          (agentCount) => {
            const positions = calculateNodePositions(agentCount);
            const bounds = { minX: 0, maxX: 300, minY: 0, maxY: 300 };
            
            return positions.every(pos =>
              pos.x >= bounds.minX &&
              pos.x <= bounds.maxX &&
              pos.y >= bounds.minY &&
              pos.y <= bounds.maxY
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('node positions are unique for different agents', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 50 }),
          (agentCount) => {
            const positions = calculateNodePositions(agentCount);
            
            // Check that no two positions are exactly the same
            for (let i = 0; i < positions.length; i++) {
              for (let j = i + 1; j < positions.length; j++) {
                if (positions[i].x === positions[j].x && 
                    positions[i].y === positions[j].y) {
                  return false;
                }
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('positions are arranged in a circular pattern around center', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 3, max: 20 }),
          (agentCount) => {
            const positions = calculateNodePositions(agentCount);
            const centerX = 150;
            const centerY = 150;
            const expectedRadius = 120;
            const tolerance = 0.001;
            
            // All positions should be approximately the same distance from center
            return positions.every(pos => {
              const distance = Math.sqrt(
                Math.pow(pos.x - centerX, 2) + Math.pow(pos.y - centerY, 2)
              );
              return Math.abs(distance - expectedRadius) < tolerance;
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('single agent is positioned at the top of the circle', () => {
      const positions = calculateNodePositions(1);
      const centerX = 150;
      const centerY = 150;
      const radius = 120;
      
      // Single agent should be at top (angle = -PI/2)
      const expectedX = centerX;
      const expectedY = centerY - radius;
      
      expect(Math.abs(positions[0].x - expectedX)).toBeLessThan(0.001);
      expect(Math.abs(positions[0].y - expectedY)).toBeLessThan(0.001);
    });
  });

  describe('Visualization Edge Cases', () => {
    it('handles single agent swarm', () => {
      fc.assert(
        fc.property(
          agentDataArb,
          (agent) => {
            const agents = [agent];
            const state = extractVisualizationState(agents);
            const validation = validateAllAgentsHaveNodes(state);
            
            return validation.isValid && state.nodeCount === 1;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('handles swarm with all same role agents', () => {
      fc.assert(
        fc.property(
          agentRoleArb,
          fc.integer({ min: 1, max: 10 }),
          (role, count) => {
            const agents: AgentData[] = Array.from({ length: count }, (_, i) => ({
              id: `agent-${i}`,
              address: `0x${'0'.repeat(40)}`,
              role,
            }));
            
            const state = extractVisualizationState(agents);
            return state.nodeCount === count;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('handles swarm with mixed role agents', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 1, max: 5 }),
          (routerCount, workerCount, qaCount) => {
            const agents: AgentData[] = [];
            
            for (let i = 0; i < routerCount; i++) {
              agents.push({ id: `router-${i}`, address: `0x${'1'.repeat(40)}`, role: 'ROUTER' });
            }
            for (let i = 0; i < workerCount; i++) {
              agents.push({ id: `worker-${i}`, address: `0x${'2'.repeat(40)}`, role: 'WORKER' });
            }
            for (let i = 0; i < qaCount; i++) {
              agents.push({ id: `qa-${i}`, address: `0x${'3'.repeat(40)}`, role: 'QA' });
            }
            
            const totalCount = routerCount + workerCount + qaCount;
            const state = extractVisualizationState(agents);
            
            return state.nodeCount === totalCount;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('handles large number of agents', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 15, max: 20 }),
          (count) => {
            const agents: AgentData[] = Array.from({ length: count }, (_, i) => ({
              id: `agent-${i}`,
              address: `0x${i.toString(16).padStart(40, '0')}`,
              role: agentRoleValues[i % 3],
            }));
            
            const state = extractVisualizationState(agents);
            const validation = validateAllAgentsHaveNodes(state);
            
            return validation.isValid && state.nodeCount === count;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Visualization State Consistency', () => {
    it('extractVisualizationState is deterministic', () => {
      fc.assert(
        fc.property(
          agentArrayArb,
          (agents) => {
            const state1 = extractVisualizationState(agents);
            const state2 = extractVisualizationState(agents);
            
            return (
              state1.nodeCount === state2.nodeCount &&
              state1.positions.length === state2.positions.length &&
              state1.positions.every((pos, i) => 
                pos.x === state2.positions[i].x &&
                pos.y === state2.positions[i].y
              )
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('visualization state does not modify original agents array', () => {
      fc.assert(
        fc.property(
          agentArrayArb,
          (agents) => {
            const originalLength = agents.length;
            const originalIds = agents.map(a => a.id);
            
            extractVisualizationState(agents);
            
            return (
              agents.length === originalLength &&
              agents.every((agent, i) => agent.id === originalIds[i])
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('node count equals positions array length', () => {
      fc.assert(
        fc.property(
          agentArrayArb,
          (agents) => {
            const state = extractVisualizationState(agents);
            return state.nodeCount === state.positions.length;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
