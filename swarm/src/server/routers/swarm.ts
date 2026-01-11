import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import prisma from '@/lib/prisma';
import { TRPCError } from '@trpc/server';
import { Decimal } from '@prisma/client-runtime-utils';

/**
 * Input schema for creating a swarm
 */
const createSwarmInput = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().min(1, 'Description is required').max(1000),
  onChainId: z.string().min(1, 'On-chain ID is required'),
  owner: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  agents: z.array(z.object({
    address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid agent address'),
    role: z.enum(['ROUTER', 'WORKER', 'QA']),
  })).min(1, 'At least one agent is required'),
});

/**
 * Input schema for adding budget to a swarm
 */
const addBudgetInput = z.object({
  swarmId: z.string().min(1, 'Swarm ID is required'),
  amount: z.string().min(1, 'Amount is required'), // Wei as string
  txHash: z.string().min(1, 'Transaction hash is required'),
});

/**
 * Swarm router with CRUD operations
 */
export const swarmRouter = router({
  /**
   * Create a new swarm with on-chain registration
   * Requirements: 2.1
   */
  create: publicProcedure
    .input(createSwarmInput)
    .mutation(async ({ input }) => {
      try {
        // Check if swarm with this onChainId already exists
        const existing = await prisma.swarm.findUnique({
          where: { onChainId: input.onChainId },
        });

        if (existing) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Swarm with this on-chain ID already exists',
          });
        }

        // Create swarm with agents in a transaction
        const swarm = await prisma.swarm.create({
          data: {
            onChainId: input.onChainId,
            name: input.name,
            description: input.description,
            owner: input.owner.toLowerCase(),
            budget: new Decimal(0),
            agents: {
              create: input.agents.map((agent) => ({
                address: agent.address.toLowerCase(),
                role: agent.role,
              })),
            },
          },
          include: {
            agents: true,
          },
        });

        return swarm;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error('Error creating swarm:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create swarm',
        });
      }
    }),

  /**
   * List all swarms with optional filtering
   * Requirements: 2.5
   */
  list: publicProcedure
    .input(z.object({
      owner: z.string().optional(),
      isActive: z.boolean().optional(),
      orderBy: z.enum(['rating', 'createdAt', 'budget']).optional(),
      order: z.enum(['asc', 'desc']).optional(),
      limit: z.number().min(1).max(100).optional(),
      offset: z.number().min(0).optional(),
    }).optional())
    .query(async ({ input }) => {
      try {
        const { owner, isActive, orderBy = 'createdAt', order = 'desc', limit = 20, offset = 0 } = input || {};

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = {};
        
        if (owner) {
          where.owner = owner.toLowerCase();
        }
        
        if (isActive !== undefined) {
          where.isActive = isActive;
        }

        const orderByField = orderBy as string;
        const [swarms, total] = await Promise.all([
          prisma.swarm.findMany({
            where,
            include: {
              agents: true,
              _count: {
                select: { jobs: true, bids: true },
              },
            },
            orderBy: { [orderByField]: order },
            take: limit,
            skip: offset,
          }),
          prisma.swarm.count({ where }),
        ]);

        return {
          swarms,
          total,
          hasMore: offset + swarms.length < total,
        };
      } catch (error) {
        console.error('[Swarm] list error:', error);
        return { swarms: [], total: 0, hasMore: false };
      }
    }),

  /**
   * Get a single swarm by ID
   * Requirements: 2.5
   */
  getById: publicProcedure
    .input(z.object({
      id: z.string().min(1, 'Swarm ID is required'),
    }))
    .query(async ({ input }) => {
      const swarm = await prisma.swarm.findUnique({
        where: { id: input.id },
        include: {
          agents: true,
          jobs: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          bids: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
              job: true,
            },
          },
        },
      });

      if (!swarm) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Swarm not found',
        });
      }

      return swarm;
    }),

  /**
   * Get a swarm by on-chain ID
   */
  getByOnChainId: publicProcedure
    .input(z.object({
      onChainId: z.string().min(1, 'On-chain ID is required'),
    }))
    .query(async ({ input }) => {
      const swarm = await prisma.swarm.findUnique({
        where: { onChainId: input.onChainId },
        include: {
          agents: true,
        },
      });

      if (!swarm) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Swarm not found',
        });
      }

      return swarm;
    }),

  /**
   * Add budget to a swarm
   * Requirements: 2.3
   */
  addBudget: publicProcedure
    .input(addBudgetInput)
    .mutation(async ({ input }) => {
      const swarm = await prisma.swarm.findUnique({
        where: { id: input.swarmId },
      });

      if (!swarm) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Swarm not found',
        });
      }

      // Update swarm budget and create transaction record
      const [updatedSwarm] = await prisma.$transaction([
        prisma.swarm.update({
          where: { id: input.swarmId },
          data: {
            budget: {
              increment: new Decimal(input.amount),
            },
          },
          include: {
            agents: true,
          },
        }),
        prisma.transaction.create({
          data: {
            txHash: input.txHash,
            type: 'BUDGET_ADD',
            fromAddr: swarm.owner,
            toAddr: swarm.onChainId, // Contract address
            amount: new Decimal(input.amount),
            swarmId: input.swarmId,
            status: 'CONFIRMED',
            confirmedAt: new Date(),
          },
        }),
      ]);

      return updatedSwarm;
    }),

  /**
   * Update swarm rating
   */
  updateRating: publicProcedure
    .input(z.object({
      swarmId: z.string().min(1),
      rating: z.number().min(0).max(5),
    }))
    .mutation(async ({ input }) => {
      const swarm = await prisma.swarm.findUnique({
        where: { id: input.swarmId },
      });

      if (!swarm) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Swarm not found',
        });
      }

      // Calculate new weighted average rating
      // For simplicity, we'll just update directly
      // In production, you'd track rating count and calculate properly
      const updatedSwarm = await prisma.swarm.update({
        where: { id: input.swarmId },
        data: { rating: input.rating },
        include: { agents: true },
      });

      return updatedSwarm;
    }),

  /**
   * Deactivate a swarm
   */
  deactivate: publicProcedure
    .input(z.object({
      swarmId: z.string().min(1),
      owner: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    }))
    .mutation(async ({ input }) => {
      const swarm = await prisma.swarm.findUnique({
        where: { id: input.swarmId },
      });

      if (!swarm) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Swarm not found',
        });
      }

      if (swarm.owner.toLowerCase() !== input.owner.toLowerCase()) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the swarm owner can deactivate the swarm',
        });
      }

      const updatedSwarm = await prisma.swarm.update({
        where: { id: input.swarmId },
        data: { isActive: false },
        include: { agents: true },
      });

      return updatedSwarm;
    }),
});

export type SwarmRouter = typeof swarmRouter;
