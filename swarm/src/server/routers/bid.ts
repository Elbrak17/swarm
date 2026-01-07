import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import prisma from '@/lib/prisma';
import { TRPCError } from '@trpc/server';
import { Decimal } from '@prisma/client-runtime-utils';

/**
 * Input schema for creating a bid
 */
const createBidInput = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
  swarmId: z.string().min(1, 'Swarm ID is required'),
  price: z.string().min(1, 'Price is required'), // Wei as string
  estimatedTime: z.number().int().positive('Estimated time must be positive'), // hours
  message: z.string().max(1000).optional(),
});

/**
 * Bid router with CRUD operations
 */
export const bidRouter = router({
  /**
   * Create a new bid on a job
   * Requirements: 4.1, 4.5, 4.6
   */
  create: publicProcedure
    .input(createBidInput)
    .mutation(async ({ input }) => {
      // Get the job to validate status
      const job = await prisma.job.findUnique({
        where: { id: input.jobId },
      });

      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job not found',
        });
      }

      // Validate job is in OPEN status (Requirement 4.6)
      if (job.status !== 'OPEN') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot bid on a job with status ${job.status}. Only OPEN jobs accept bids.`,
        });
      }

      // Get the swarm to validate it exists and is active
      const swarm = await prisma.swarm.findUnique({
        where: { id: input.swarmId },
      });

      if (!swarm) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Swarm not found',
        });
      }

      if (!swarm.isActive) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot bid with an inactive swarm',
        });
      }

      // Check for duplicate bid (Requirement 4.5)
      const existingBid = await prisma.bid.findUnique({
        where: {
          jobId_swarmId: {
            jobId: input.jobId,
            swarmId: input.swarmId,
          },
        },
      });

      if (existingBid) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This swarm has already bid on this job',
        });
      }

      // Create the bid
      const bid = await prisma.bid.create({
        data: {
          jobId: input.jobId,
          swarmId: input.swarmId,
          price: new Decimal(input.price),
          estimatedTime: input.estimatedTime,
          message: input.message,
        },
        include: {
          swarm: {
            include: {
              agents: true,
            },
          },
          job: true,
        },
      });

      return bid;
    }),

  /**
   * List bids for a specific job
   * Requirements: 4.3
   */
  listByJob: publicProcedure
    .input(z.object({
      jobId: z.string().min(1, 'Job ID is required'),
      orderBy: z.enum(['createdAt', 'price', 'estimatedTime']).optional(),
      order: z.enum(['asc', 'desc']).optional(),
    }))
    .query(async ({ input }) => {
      const { jobId, orderBy = 'createdAt', order = 'desc' } = input;

      // Verify job exists
      const job = await prisma.job.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Job not found',
        });
      }

      const orderByField = orderBy as string;
      const bids = await prisma.bid.findMany({
        where: { jobId },
        include: {
          swarm: {
            include: {
              agents: true,
            },
          },
        },
        orderBy: { [orderByField]: order },
      });

      return bids;
    }),

  /**
   * List bids by a specific swarm
   */
  listBySwarm: publicProcedure
    .input(z.object({
      swarmId: z.string().min(1, 'Swarm ID is required'),
      isAccepted: z.boolean().optional(),
      orderBy: z.enum(['createdAt', 'price']).optional(),
      order: z.enum(['asc', 'desc']).optional(),
      limit: z.number().min(1).max(100).optional(),
      offset: z.number().min(0).optional(),
    }))
    .query(async ({ input }) => {
      const { swarmId, isAccepted, orderBy = 'createdAt', order = 'desc', limit = 20, offset = 0 } = input;

      // Verify swarm exists
      const swarm = await prisma.swarm.findUnique({
        where: { id: swarmId },
      });

      if (!swarm) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Swarm not found',
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = { swarmId };
      
      if (isAccepted !== undefined) {
        where.isAccepted = isAccepted;
      }

      const orderByField = orderBy as string;
      const [bids, total] = await Promise.all([
        prisma.bid.findMany({
          where,
          include: {
            job: true,
          },
          orderBy: { [orderByField]: order },
          take: limit,
          skip: offset,
        }),
        prisma.bid.count({ where }),
      ]);

      return {
        bids,
        total,
        hasMore: offset + bids.length < total,
      };
    }),

  /**
   * Get a single bid by ID
   */
  getById: publicProcedure
    .input(z.object({
      id: z.string().min(1, 'Bid ID is required'),
    }))
    .query(async ({ input }) => {
      const bid = await prisma.bid.findUnique({
        where: { id: input.id },
        include: {
          swarm: {
            include: {
              agents: true,
            },
          },
          job: true,
        },
      });

      if (!bid) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Bid not found',
        });
      }

      return bid;
    }),

  /**
   * Withdraw a bid (only if job is still OPEN)
   */
  withdraw: publicProcedure
    .input(z.object({
      bidId: z.string().min(1, 'Bid ID is required'),
      swarmOwner: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid owner address'),
    }))
    .mutation(async ({ input }) => {
      const bid = await prisma.bid.findUnique({
        where: { id: input.bidId },
        include: {
          swarm: true,
          job: true,
        },
      });

      if (!bid) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Bid not found',
        });
      }

      // Verify the swarm owner
      if (bid.swarm.owner.toLowerCase() !== input.swarmOwner.toLowerCase()) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the swarm owner can withdraw bids',
        });
      }

      // Can only withdraw if job is still OPEN
      if (bid.job.status !== 'OPEN') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot withdraw bid on a job that is no longer OPEN',
        });
      }

      // Can't withdraw an accepted bid
      if (bid.isAccepted) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot withdraw an accepted bid',
        });
      }

      await prisma.bid.delete({
        where: { id: input.bidId },
      });

      return { success: true };
    }),
});

export type BidRouter = typeof bidRouter;
