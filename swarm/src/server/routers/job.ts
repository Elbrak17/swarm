import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import prisma from '@/lib/prisma';
import { TRPCError } from '@trpc/server';
import { Decimal } from '@prisma/client-runtime-utils';
import { queueJobExecution, queueNotification } from '@/lib/queue';

/**
 * Job status enum values for validation
 */
const jobStatusValues = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'DISPUTED'] as const;

/**
 * Input schema for creating a job
 */
const createJobInput = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required').max(5000),
  requirements: z.string().max(2000).optional(),
  payment: z.string().min(1, 'Payment is required'), // Wei as string
  onChainId: z.number().int().positive('On-chain ID must be positive'),
  clientAddr: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid client address'),
  txHash: z.string().min(1, 'Transaction hash is required'),
});

/**
 * Input schema for accepting a bid
 */
const acceptBidInput = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
  bidId: z.string().min(1, 'Bid ID is required'),
  clientAddr: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid client address'),
});

/**
 * Job router with CRUD operations
 */
export const jobRouter = router({
  /**
   * Create a new job with escrow
   * Requirements: 3.1, 3.3
   */
  create: publicProcedure
    .input(createJobInput)
    .mutation(async ({ input }) => {
      try {
        // Check if job with this onChainId already exists
        const existing = await prisma.job.findUnique({
          where: { onChainId: input.onChainId },
        });

        if (existing) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Job with this on-chain ID already exists',
          });
        }

        // Create job and transaction record in a transaction
        const [job] = await prisma.$transaction([
          prisma.job.create({
            data: {
              onChainId: input.onChainId,
              title: input.title,
              description: input.description,
              requirements: input.requirements,
              payment: new Decimal(input.payment),
              clientAddr: input.clientAddr.toLowerCase(),
              status: 'OPEN',
            },
            include: {
              bids: true,
            },
          }),
          prisma.transaction.create({
            data: {
              txHash: input.txHash,
              type: 'JOB_ESCROW',
              fromAddr: input.clientAddr.toLowerCase(),
              toAddr: 'escrow', // Will be replaced with actual escrow contract
              amount: new Decimal(input.payment),
              status: 'CONFIRMED',
              confirmedAt: new Date(),
            },
          }),
        ]);

        return job;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error('Error creating job:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create job',
        });
      }
    }),

  /**
   * List jobs with optional filtering
   * Requirements: 3.4
   */
  list: publicProcedure
    .input(z.object({
      status: z.enum(jobStatusValues).optional(),
      clientAddr: z.string().optional(),
      swarmId: z.string().optional(),
      minPayment: z.string().optional(),
      orderBy: z.enum(['createdAt', 'payment', 'status']).optional(),
      order: z.enum(['asc', 'desc']).optional(),
      limit: z.number().min(1).max(100).optional(),
      offset: z.number().min(0).optional(),
    }).optional())
    .query(async ({ input }) => {
      const { 
        status, 
        clientAddr, 
        swarmId,
        minPayment,
        orderBy = 'createdAt', 
        order = 'desc', 
        limit = 20, 
        offset = 0 
      } = input || {};

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {};
      
      if (status) {
        where.status = status;
      }
      
      if (clientAddr) {
        where.clientAddr = clientAddr.toLowerCase();
      }

      if (swarmId) {
        where.swarmId = swarmId;
      }

      if (minPayment) {
        where.payment = {
          gte: new Decimal(minPayment),
        };
      }

      const orderByField = orderBy as string;
      const [jobs, total] = await Promise.all([
        prisma.job.findMany({
          where,
          include: {
            swarm: {
              include: {
                agents: true,
              },
            },
            bids: {
              include: {
                swarm: true,
              },
            },
          },
          orderBy: { [orderByField]: order },
          take: limit,
          skip: offset,
        }),
        prisma.job.count({ where }),
      ]);

      return {
        jobs,
        total,
        hasMore: offset + jobs.length < total,
      };
    }),

  /**
   * Get a single job by ID with bids
   * Requirements: 4.3
   */
  getById: publicProcedure
    .input(z.object({
      id: z.string().min(1, 'Job ID is required'),
    }))
    .query(async ({ input }) => {
      const job = await prisma.job.findUnique({
        where: { id: input.id },
        include: {
          swarm: {
            include: {
              agents: true,
            },
          },
          bids: {
            include: {
              swarm: {
                include: {
                  agents: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job not found',
        });
      }

      return job;
    }),

  /**
   * Get a job by on-chain ID
   */
  getByOnChainId: publicProcedure
    .input(z.object({
      onChainId: z.number().int().positive(),
    }))
    .query(async ({ input }) => {
      const job = await prisma.job.findUnique({
        where: { onChainId: input.onChainId },
        include: {
          swarm: {
            include: {
              agents: true,
            },
          },
          bids: {
            include: {
              swarm: true,
            },
          },
        },
      });

      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job not found',
        });
      }

      return job;
    }),

  /**
   * Accept a bid on a job
   * Requirements: 4.4
   */
  acceptBid: publicProcedure
    .input(acceptBidInput)
    .mutation(async ({ input }) => {
      // Get the job
      const job = await prisma.job.findUnique({
        where: { id: input.jobId },
        include: { bids: true },
      });

      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job not found',
        });
      }

      // Verify the client owns this job
      if (job.clientAddr.toLowerCase() !== input.clientAddr.toLowerCase()) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the job client can accept bids',
        });
      }

      // Verify job is in OPEN status
      if (job.status !== 'OPEN') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot accept bids on a job with status ${job.status}`,
        });
      }

      // Get the bid
      const bid = await prisma.bid.findUnique({
        where: { id: input.bidId },
        include: { swarm: true },
      });

      if (!bid) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Bid not found',
        });
      }

      // Verify bid belongs to this job
      if (bid.jobId !== input.jobId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Bid does not belong to this job',
        });
      }

      // Update job and bid in a transaction
      const [updatedJob] = await prisma.$transaction([
        prisma.job.update({
          where: { id: input.jobId },
          data: {
            status: 'ASSIGNED',
            swarmId: bid.swarmId,
          },
          include: {
            swarm: {
              include: {
                agents: true,
              },
            },
            bids: {
              include: {
                swarm: true,
              },
            },
          },
        }),
        prisma.bid.update({
          where: { id: input.bidId },
          data: { isAccepted: true },
        }),
      ]);

      // Queue job execution via BullMQ
      // Requirements: 5.1 - WHEN a bid is accepted, THE System SHALL queue the job for CrewAI execution
      try {
        await queueJobExecution({
          jobId: updatedJob.id,
          swarmId: bid.swarmId,
          jobDescription: updatedJob.title + '\n\n' + updatedJob.description,
          requirements: updatedJob.requirements || '',
          onChainJobId: updatedJob.onChainId,
        });

        // Send notification that bid was accepted
        await queueNotification({
          type: 'bid_received',
          channel: `swarm-${bid.swarmId}`,
          data: {
            jobId: updatedJob.id,
            bidId: bid.id,
            status: 'accepted',
            message: 'Your bid has been accepted! Job execution starting...',
          },
        });
      } catch (queueError) {
        console.error('Failed to queue job execution:', queueError);
        // Don't fail the bid acceptance if queuing fails
        // The job can be manually triggered later
      }

      return updatedJob;
    }),

  /**
   * Start job execution
   */
  startJob: publicProcedure
    .input(z.object({
      jobId: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const job = await prisma.job.findUnique({
        where: { id: input.jobId },
      });

      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job not found',
        });
      }

      if (job.status !== 'ASSIGNED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot start a job with status ${job.status}`,
        });
      }

      const updatedJob = await prisma.job.update({
        where: { id: input.jobId },
        data: { status: 'IN_PROGRESS' },
        include: {
          swarm: {
            include: {
              agents: true,
            },
          },
        },
      });

      return updatedJob;
    }),

  /**
   * Complete a job
   */
  completeJob: publicProcedure
    .input(z.object({
      jobId: z.string().min(1),
      resultHash: z.string().min(1, 'Result hash is required'),
    }))
    .mutation(async ({ input }) => {
      const job = await prisma.job.findUnique({
        where: { id: input.jobId },
      });

      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job not found',
        });
      }

      if (job.status !== 'IN_PROGRESS') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot complete a job with status ${job.status}`,
        });
      }

      const updatedJob = await prisma.job.update({
        where: { id: input.jobId },
        data: {
          status: 'COMPLETED',
          resultHash: input.resultHash,
          completedAt: new Date(),
        },
        include: {
          swarm: {
            include: {
              agents: true,
            },
          },
        },
      });

      return updatedJob;
    }),
});

export type JobRouter = typeof jobRouter;
