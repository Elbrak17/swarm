import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '@/lib/redis';
import { 
  QUEUE_NAMES, 
  JobExecutionPayload, 
  JobProgressUpdate,
  queueNotification 
} from '@/lib/queue';
import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client-runtime-utils';

/**
 * CrewAI task result from the Python service
 */
interface CrewAITaskResult {
  agent_address: string;
  task_name: string;
  output: string;
  tokens_used: number;
  execution_time_ms: number;
}

/**
 * CrewAI job result from the Python service
 */
interface CrewAIJobResult {
  job_id: string;
  success: boolean;
  final_output: string;
  task_results: CrewAITaskResult[];
  total_cost_usd: number;
  result_hash: string;
}

/**
 * Process a job execution task
 * This worker calls the CrewAI service to execute the job
 * Requirements: 5.1, 5.2, 5.3, 6.1
 */
async function processJobExecution(job: Job<JobExecutionPayload>): Promise<void> {
  const { jobId, swarmId, jobDescription, requirements, onChainJobId } = job.data;
  
  console.log(`[Worker] Processing job execution: ${jobId}`);
  
  try {
    // Update job status to IN_PROGRESS
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'IN_PROGRESS' },
    });

    // Send progress update: routing stage
    await sendProgressUpdate({
      jobId,
      stage: 'routing',
      agentId: 'router',
      message: 'Analyzing job requirements and routing to appropriate agents',
      progress: 10,
    });

    // Call CrewAI service
    const crewAIUrl = process.env.CREWAI_SERVICE_URL || 'http://localhost:8000';
    
    const response = await fetch(`${crewAIUrl}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        job_id: jobId,
        title: jobDescription,
        description: jobDescription,
        requirements: requirements || '',
        swarm_id: swarmId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`CrewAI service returned ${response.status}: ${errorText}`);
    }

    const result: CrewAIJobResult = await response.json();

    // Check if CrewAI execution was successful
    if (!result.success) {
      throw new Error(`CrewAI execution failed: ${result.final_output}`);
    }

    // Use the result hash from CrewAI or generate one
    const resultHash = result.result_hash || 
      `ipfs://${Buffer.from(JSON.stringify(result)).toString('base64').slice(0, 46)}`;

    // Update job as completed
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        resultHash,
        completedAt: new Date(),
      },
    });

    // Update agent earnings based on task results
    await updateAgentEarnings(swarmId, result.task_results, jobId);

    // Send progress update: complete
    await sendProgressUpdate({
      jobId,
      stage: 'complete',
      agentId: 'system',
      message: 'Job completed successfully',
      progress: 100,
    });

    // Queue notification for job completion
    await queueNotification({
      type: 'job_completed',
      channel: `job-${jobId}`,
      data: {
        jobId,
        swarmId,
        resultHash,
        onChainJobId,
        completedAt: new Date().toISOString(),
        taskResults: result.task_results,
        totalCostUsd: result.total_cost_usd,
      },
    });

    // Queue payment flow notification for visualization
    await queueNotification({
      type: 'payment_flow',
      channel: `swarm-${swarmId}`,
      data: {
        jobId,
        swarmId,
        onChainJobId,
        status: 'ready_for_payment',
        message: 'Job completed, ready for payment release',
      },
    });

    console.log(`[Worker] Job execution completed: ${jobId}`);
  } catch (error) {
    console.error(`[Worker] Job execution failed: ${jobId}`, error);
    
    // Send failure notification
    await queueNotification({
      type: 'job_progress',
      channel: `job-${jobId}`,
      data: {
        jobId,
        stage: 'error',
        agentId: 'system',
        message: error instanceof Error ? error.message : 'Job execution failed',
        progress: 0,
      },
    });
    
    throw error; // Re-throw to trigger BullMQ retry
  }
}

/**
 * Update agent earnings in the database based on task results
 * Requirements: 6.3
 */
async function updateAgentEarnings(
  swarmId: string, 
  taskResults: CrewAITaskResult[],
  jobId: string
): Promise<void> {
  try {
    // Get the job payment amount
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { payment: true },
    });

    if (!job) {
      console.warn(`[Worker] Job ${jobId} not found for earnings update`);
      return;
    }

    // Calculate total execution time for proportional distribution
    const totalExecutionTime = taskResults.reduce(
      (sum, r) => sum + r.execution_time_ms, 
      0
    );

    if (totalExecutionTime === 0) {
      console.warn(`[Worker] No execution time recorded for job ${jobId}`);
      return;
    }

    // Update each agent's earnings proportionally
    for (const taskResult of taskResults) {
      const proportion = taskResult.execution_time_ms / totalExecutionTime;
      const earnings = job.payment.mul(new Decimal(proportion));

      // Find agent by address in this swarm
      const agent = await prisma.agent.findFirst({
        where: {
          swarmId,
          address: taskResult.agent_address.toLowerCase(),
        },
      });

      if (agent) {
        await prisma.agent.update({
          where: { id: agent.id },
          data: {
            earnings: { increment: earnings },
            tasksCompleted: { increment: 1 },
          },
        });

        console.log(`[Worker] Updated earnings for agent ${agent.address}: +${earnings}`);
      } else {
        console.warn(`[Worker] Agent ${taskResult.agent_address} not found in swarm ${swarmId}`);
      }
    }
  } catch (error) {
    console.error(`[Worker] Failed to update agent earnings:`, error);
    // Don't throw - earnings update failure shouldn't fail the job
  }
}

/**
 * Send a progress update via the notifications queue
 */
async function sendProgressUpdate(update: JobProgressUpdate): Promise<void> {
  await queueNotification({
    type: 'job_progress',
    channel: `job-${update.jobId}`,
    data: update as unknown as Record<string, unknown>,
  });
}

/**
 * Create and start the job execution worker
 */
export function createJobExecutionWorker(): Worker<JobExecutionPayload> {
  const connection = createRedisConnection();
  
  const worker = new Worker<JobExecutionPayload>(
    QUEUE_NAMES.JOB_EXECUTION,
    processJobExecution,
    {
      connection,
      concurrency: 5, // Process up to 5 jobs concurrently
      limiter: {
        max: 10,
        duration: 1000, // Max 10 jobs per second
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, error) => {
    console.error(`[Worker] Job ${job?.id} failed:`, error.message);
  });

  worker.on('error', (error) => {
    console.error('[Worker] Worker error:', error);
  });

  console.log('[Worker] Job execution worker started');
  
  return worker;
}

export default createJobExecutionWorker;
