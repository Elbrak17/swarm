/**
 * Property tests for CrewAI integration
 * 
 * Feature: swarm-marketplace
 * Property 21: Task Completion Is Recorded
 * Property 22: Completed Job Has Result Hash
 * Validates: Requirements 5.4, 5.5
 * 
 * Note: These tests validate the logic for task completion recording
 * and result hash generation without requiring actual CrewAI service.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createHash } from 'crypto';

/**
 * Types matching the CrewAI integration
 */
interface CrewAITaskResult {
  agent_address: string;
  task_name: string;
  output: string;
  tokens_used: number;
  execution_time_ms: number;
}

interface CrewAIJobResult {
  job_id: string;
  success: boolean;
  final_output: string;
  task_results: CrewAITaskResult[];
  total_cost_usd: number;
  result_hash: string;
}

interface Agent {
  id: string;
  address: string;
  role: 'ROUTER' | 'WORKER' | 'QA';
  swarmId: string;
  earnings: bigint;
  tasksCompleted: number;
}

interface Job {
  id: string;
  onChainId: number;
  title: string;
  description: string;
  payment: bigint;
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'DISPUTED';
  clientAddr: string;
  swarmId?: string;
  resultHash?: string;
  completedAt?: Date;
}

/**
 * Simulates the result hash generation logic from CustomerSupportCrew
 * This mirrors the _generate_result_hash method in customer_support_crew.py
 */
function generateResultHash(content: string): string {
  const hash = createHash('sha256').update(content).digest('hex');
  return `ipfs://${hash.slice(0, 46)}`;
}

/**
 * Simulates updating agent earnings based on task results
 * This mirrors the updateAgentEarnings function in job-execution-worker.ts
 */
function updateAgentEarnings(
  agents: Agent[],
  taskResults: CrewAITaskResult[],
  jobPayment: bigint
): Agent[] {
  // Calculate total execution time for proportional distribution
  const totalExecutionTime = taskResults.reduce(
    (sum, r) => sum + r.execution_time_ms,
    0
  );

  if (totalExecutionTime === 0) {
    return agents;
  }

  // Create a map for quick agent lookup
  const agentMap = new Map(agents.map(a => [a.address.toLowerCase(), { ...a }]));

  // Update each agent's earnings and task count
  for (const taskResult of taskResults) {
    const agentAddress = taskResult.agent_address.toLowerCase();
    const agent = agentMap.get(agentAddress);

    if (agent) {
      const proportion = taskResult.execution_time_ms / totalExecutionTime;
      const earnings = BigInt(Math.floor(Number(jobPayment) * proportion));
      
      agent.earnings = agent.earnings + earnings;
      agent.tasksCompleted = agent.tasksCompleted + 1;
      
      agentMap.set(agentAddress, agent);
    }
  }

  return Array.from(agentMap.values());
}

/**
 * Simulates completing a job with CrewAI results
 * This mirrors the job completion logic in job-execution-worker.ts
 */
function completeJobWithResults(
  job: Job,
  crewAIResult: CrewAIJobResult
): Job {
  if (!crewAIResult.success) {
    return job;
  }

  // Use the result hash from CrewAI or generate one
  const resultHash = crewAIResult.result_hash || 
    `ipfs://${Buffer.from(JSON.stringify(crewAIResult)).toString('base64').slice(0, 46)}`;

  return {
    ...job,
    status: 'COMPLETED',
    resultHash,
    completedAt: new Date(),
  };
}

/**
 * Counts total tasks completed across all agents
 */
function countTotalTasksCompleted(agents: Agent[]): number {
  return agents.reduce((sum, agent) => sum + agent.tasksCompleted, 0);
}

// Generators for property-based testing
const hexChar = fc.constantFrom(...'0123456789abcdef'.split(''));

const ethereumAddressArb = fc.array(hexChar, { minLength: 40, maxLength: 40 })
  .map(chars => `0x${chars.join('')}`);

const agentRoleArb = fc.constantFrom('ROUTER', 'WORKER', 'QA') as fc.Arbitrary<'ROUTER' | 'WORKER' | 'QA'>;

// Helper to create large BigInt without exponentiation
const largeBigInt = (): bigint => {
  let result = BigInt(10);
  for (let i = 0; i < 18; i++) {
    result = result * BigInt(10);
  }
  return result;
};

const agentArb = fc.record({
  id: fc.uuid(),
  address: ethereumAddressArb,
  role: agentRoleArb,
  swarmId: fc.uuid(),
  earnings: fc.bigInt({ min: BigInt(0), max: largeBigInt() }),
  tasksCompleted: fc.integer({ min: 0, max: 1000 }),
});

const taskResultArb = fc.record({
  agent_address: ethereumAddressArb,
  task_name: fc.constantFrom('ticket_classification', 'issue_resolution', 'quality_assurance'),
  output: fc.string({ minLength: 1, maxLength: 500 }),
  tokens_used: fc.integer({ min: 0, max: 10000 }),
  execution_time_ms: fc.integer({ min: 1, max: 60000 }), // At least 1ms to avoid division by zero
});

const successfulJobResultArb = fc.record({
  job_id: fc.uuid(),
  success: fc.constant(true),
  final_output: fc.string({ minLength: 1, maxLength: 1000 }),
  task_results: fc.array(taskResultArb, { minLength: 1, maxLength: 5 }),
  total_cost_usd: fc.float({ min: 0, max: 1 }),
  result_hash: fc.string({ minLength: 10, maxLength: 60 }).map(s => `ipfs://${s}`),
});

const failedJobResultArb = fc.record({
  job_id: fc.uuid(),
  success: fc.constant(false),
  final_output: fc.string({ minLength: 1, maxLength: 500 }).map(s => `Error: ${s}`),
  task_results: fc.array(taskResultArb, { minLength: 0, maxLength: 3 }),
  total_cost_usd: fc.constant(0),
  result_hash: fc.string({ minLength: 10, maxLength: 60 }).map(s => `ipfs://${s}`),
});

const jobArb = fc.record({
  id: fc.uuid(),
  onChainId: fc.integer({ min: 1, max: 1000000 }),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.string({ minLength: 1, maxLength: 500 }),
  payment: fc.bigInt({ min: BigInt(1), max: largeBigInt() }),
  status: fc.constantFrom('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'DISPUTED') as fc.Arbitrary<Job['status']>,
  clientAddr: ethereumAddressArb,
  swarmId: fc.option(fc.uuid(), { nil: undefined }),
  resultHash: fc.option(fc.string({ minLength: 10, maxLength: 60 }).map(s => `ipfs://${s}`), { nil: undefined }),
  completedAt: fc.option(fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }), { nil: undefined }),
});

describe('CrewAI Integration Property Tests', () => {
  /**
   * Feature: swarm-marketplace, Property 21: Task Completion Is Recorded
   * 
   * For any agent task completion, the agent's tasksCompleted count SHALL increment by 1.
   * Validates: Requirements 5.4
   */
  describe('Property 21: Task Completion Is Recorded', () => {
    it('each task result increments the corresponding agent tasksCompleted by 1', () => {
      fc.assert(
        fc.property(
          fc.array(agentArb, { minLength: 1, maxLength: 5 }),
          fc.bigInt({ min: BigInt(1000000), max: largeBigInt() }),
          (agents, jobPayment) => {
            // Create task results that match the agent addresses
            const taskResults: CrewAITaskResult[] = agents.map(agent => ({
              agent_address: agent.address,
              task_name: 'test_task',
              output: 'test output',
              tokens_used: 100,
              execution_time_ms: 1000,
            }));

            const initialTaskCounts = agents.map(a => a.tasksCompleted);
            const updatedAgents = updateAgentEarnings(agents, taskResults, jobPayment);

            // Each agent should have tasksCompleted incremented by 1
            return updatedAgents.every((agent, i) => 
              agent.tasksCompleted === initialTaskCounts[i] + 1
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('total tasks completed increases by number of task results', () => {
      fc.assert(
        fc.property(
          fc.array(agentArb, { minLength: 1, maxLength: 5 }),
          fc.bigInt({ min: BigInt(1000000), max: largeBigInt() }),
          (agents, jobPayment) => {
            // Create task results that match the agent addresses
            const taskResults: CrewAITaskResult[] = agents.map(agent => ({
              agent_address: agent.address,
              task_name: 'test_task',
              output: 'test output',
              tokens_used: 100,
              execution_time_ms: 1000,
            }));

            const initialTotal = countTotalTasksCompleted(agents);
            const updatedAgents = updateAgentEarnings(agents, taskResults, jobPayment);
            const finalTotal = countTotalTasksCompleted(updatedAgents);

            // Total should increase by number of task results
            return finalTotal === initialTotal + taskResults.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('agents not in task results have unchanged tasksCompleted', () => {
      fc.assert(
        fc.property(
          fc.array(agentArb, { minLength: 2, maxLength: 5 }),
          fc.bigInt({ min: BigInt(1000000), max: largeBigInt() }),
          (agents, jobPayment) => {
            // Only create task results for the first agent
            const taskResults: CrewAITaskResult[] = [{
              agent_address: agents[0].address,
              task_name: 'test_task',
              output: 'test output',
              tokens_used: 100,
              execution_time_ms: 1000,
            }];

            const updatedAgents = updateAgentEarnings(agents, taskResults, jobPayment);
            
            // Find agents that weren't in task results
            const taskAddresses = new Set(taskResults.map(t => t.agent_address.toLowerCase()));
            
            // Agents not in task results should have unchanged tasksCompleted
            return updatedAgents.every((agent, i) => {
              if (taskAddresses.has(agent.address.toLowerCase())) {
                return agent.tasksCompleted === agents[i].tasksCompleted + 1;
              }
              return agent.tasksCompleted === agents[i].tasksCompleted;
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('multiple tasks for same agent increment count multiple times', () => {
      fc.assert(
        fc.property(
          agentArb,
          fc.integer({ min: 1, max: 5 }),
          fc.bigInt({ min: BigInt(1000000), max: largeBigInt() }),
          (agent, taskCount, jobPayment) => {
            const agents = [agent];
            
            // Create multiple task results for the same agent
            const taskResults: CrewAITaskResult[] = Array.from({ length: taskCount }, (_, i) => ({
              agent_address: agent.address,
              task_name: `task_${i}`,
              output: 'test output',
              tokens_used: 100,
              execution_time_ms: 1000,
            }));

            const initialCount = agent.tasksCompleted;
            const updatedAgents = updateAgentEarnings(agents, taskResults, jobPayment);

            // Agent should have tasksCompleted incremented by taskCount
            return updatedAgents[0].tasksCompleted === initialCount + taskCount;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('task completion recording is idempotent for same task results', () => {
      fc.assert(
        fc.property(
          fc.array(agentArb, { minLength: 1, maxLength: 3 }),
          fc.bigInt({ min: BigInt(1000000), max: largeBigInt() }),
          (agents, jobPayment) => {
            const taskResults: CrewAITaskResult[] = agents.map(agent => ({
              agent_address: agent.address,
              task_name: 'test_task',
              output: 'test output',
              tokens_used: 100,
              execution_time_ms: 1000,
            }));

            // Apply once
            const firstUpdate = updateAgentEarnings(agents, taskResults, jobPayment);
            
            // Apply again to the updated agents (simulating duplicate processing)
            const secondUpdate = updateAgentEarnings(firstUpdate, taskResults, jobPayment);

            // Second update should add another increment (not idempotent by design)
            // This validates that each call properly increments
            return secondUpdate.every((agent, i) => 
              agent.tasksCompleted === agents[i].tasksCompleted + 2
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('empty task results do not change tasksCompleted', () => {
      fc.assert(
        fc.property(
          fc.array(agentArb, { minLength: 1, maxLength: 5 }),
          fc.bigInt({ min: BigInt(1000000), max: largeBigInt() }),
          (agents, jobPayment) => {
            const taskResults: CrewAITaskResult[] = [];
            const initialCounts = agents.map(a => a.tasksCompleted);
            const updatedAgents = updateAgentEarnings(agents, taskResults, jobPayment);

            // No changes should occur with empty task results
            return updatedAgents.every((agent, i) => 
              agent.tasksCompleted === initialCounts[i]
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: swarm-marketplace, Property 22: Completed Job Has Result Hash
   * 
   * For any completed job, the job SHALL have a result hash.
   * Validates: Requirements 5.5
   */
  describe('Property 22: Completed Job Has Result Hash', () => {
    it('successful job completion always produces a result hash', () => {
      fc.assert(
        fc.property(
          jobArb.filter(j => j.status === 'IN_PROGRESS'),
          successfulJobResultArb,
          (job, crewAIResult) => {
            const completedJob = completeJobWithResults(job, crewAIResult);
            
            // Completed job must have a result hash
            return completedJob.resultHash !== undefined && 
                   completedJob.resultHash !== null &&
                   completedJob.resultHash.length > 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('result hash starts with ipfs:// prefix', () => {
      fc.assert(
        fc.property(
          jobArb.filter(j => j.status === 'IN_PROGRESS'),
          successfulJobResultArb,
          (job, crewAIResult) => {
            const completedJob = completeJobWithResults(job, crewAIResult);
            
            // Result hash should have ipfs:// prefix
            return completedJob.resultHash?.startsWith('ipfs://') ?? false;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('completed job status is COMPLETED', () => {
      fc.assert(
        fc.property(
          jobArb.filter(j => j.status === 'IN_PROGRESS'),
          successfulJobResultArb,
          (job, crewAIResult) => {
            const completedJob = completeJobWithResults(job, crewAIResult);
            
            return completedJob.status === 'COMPLETED';
          }
        ),
        { numRuns: 100 }
      );
    });

    it('completed job has completedAt timestamp', () => {
      fc.assert(
        fc.property(
          jobArb.filter(j => j.status === 'IN_PROGRESS'),
          successfulJobResultArb,
          (job, crewAIResult) => {
            const completedJob = completeJobWithResults(job, crewAIResult);
            
            return completedJob.completedAt !== undefined &&
                   completedJob.completedAt instanceof Date;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('failed job does not change status or add result hash', () => {
      fc.assert(
        fc.property(
          jobArb.filter(j => j.status === 'IN_PROGRESS'),
          failedJobResultArb,
          (job, crewAIResult) => {
            const resultJob = completeJobWithResults(job, crewAIResult);
            
            // Failed job should remain unchanged
            return resultJob.status === job.status &&
                   resultJob.resultHash === job.resultHash;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('result hash is deterministic for same content', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 1000 }),
          (content) => {
            const hash1 = generateResultHash(content);
            const hash2 = generateResultHash(content);
            
            return hash1 === hash2;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('different content produces different result hashes', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 500 }),
          fc.string({ minLength: 1, maxLength: 500 }),
          (content1, content2) => {
            // Skip if contents are the same
            if (content1 === content2) return true;
            
            const hash1 = generateResultHash(content1);
            const hash2 = generateResultHash(content2);
            
            return hash1 !== hash2;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('result hash has consistent length', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 2000 }),
          (content) => {
            const hash = generateResultHash(content);
            
            // ipfs:// (7 chars) + 46 char hash = 53 chars total
            return hash.length === 53;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('CrewAI result hash is used when provided', () => {
      fc.assert(
        fc.property(
          jobArb.filter(j => j.status === 'IN_PROGRESS'),
          successfulJobResultArb,
          (job, crewAIResult) => {
            const completedJob = completeJobWithResults(job, crewAIResult);
            
            // Should use the hash from CrewAI result
            return completedJob.resultHash === crewAIResult.result_hash;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('all completed jobs in a batch have unique result hashes', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.tuple(
              jobArb.filter(j => j.status === 'IN_PROGRESS'),
              successfulJobResultArb
            ),
            { minLength: 2, maxLength: 10 }
          ),
          (jobResultPairs) => {
            // Ensure each CrewAI result has a unique hash
            const uniqueHashes = new Set(jobResultPairs.map(([_, r]) => r.result_hash));
            if (uniqueHashes.size !== jobResultPairs.length) {
              // If input hashes aren't unique, skip this test case
              return true;
            }
            
            const completedJobs = jobResultPairs.map(([job, result]) => 
              completeJobWithResults(job, result)
            );
            
            const resultHashes = completedJobs.map(j => j.resultHash);
            const uniqueResultHashes = new Set(resultHashes);
            
            return uniqueResultHashes.size === completedJobs.length;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

describe('Result Hash Generation', () => {
  it('generates valid IPFS-style hash', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 1000 }),
        (content) => {
          const hash = generateResultHash(content);
          
          // Should start with ipfs://
          const hasPrefix = hash.startsWith('ipfs://');
          
          // Should have hex characters after prefix
          const hashPart = hash.slice(7);
          const isValidHex = /^[a-f0-9]+$/.test(hashPart);
          
          return hasPrefix && isValidHex;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('hash is collision-resistant for similar inputs', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 10, maxLength: 100 }),
        (baseContent) => {
          // Create similar but different inputs
          const content1 = baseContent + 'a';
          const content2 = baseContent + 'b';
          
          const hash1 = generateResultHash(content1);
          const hash2 = generateResultHash(content2);
          
          return hash1 !== hash2;
        }
      ),
      { numRuns: 100 }
    );
  });
});
