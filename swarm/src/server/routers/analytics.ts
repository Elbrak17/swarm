import { router, publicProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

/**
 * Analytics Router
 * 
 * Provides endpoints for dashboard metrics and analytics data
 */
export const analyticsRouter = router({
  /**
   * Get dashboard overview metrics
   * Returns total jobs, MNEE volume, active swarms, and cost reduction metric
   */
  getDashboardMetrics: publicProcedure.query(async () => {
    // Get total jobs count
    const totalJobs = await prisma.job.count();
    
    // Get completed jobs count
    const completedJobs = await prisma.job.count({
      where: { status: 'COMPLETED' },
    });
    
    // Get total MNEE volume from completed jobs
    const volumeResult = await prisma.job.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { payment: true },
    });
    const totalMneeVolume = volumeResult._sum.payment?.toString() || '0';
    
    // Get active swarms count
    const activeSwarms = await prisma.swarm.count({
      where: { isActive: true },
    });
    
    // Get total agents count
    const totalAgents = await prisma.agent.count();
    
    // Calculate completion rate
    const completionRate = totalJobs > 0 
      ? Math.round((completedJobs / totalJobs) * 100) 
      : 0;
    
    // Calculate average completion time (in hours)
    const completedJobsWithTime = await prisma.job.findMany({
      where: { 
        status: 'COMPLETED',
        completedAt: { not: null },
      },
      select: {
        createdAt: true,
        completedAt: true,
      },
    });
    
    let avgCompletionTime = 0;
    if (completedJobsWithTime.length > 0) {
      const totalHours = completedJobsWithTime.reduce((sum, job) => {
        if (job.completedAt) {
          const diffMs = job.completedAt.getTime() - job.createdAt.getTime();
          return sum + (diffMs / (1000 * 60 * 60)); // Convert to hours
        }
        return sum;
      }, 0);
      avgCompletionTime = Math.round((totalHours / completedJobsWithTime.length) * 10) / 10;
    }
    
    // Cost reduction metric (96% as per requirements)
    // Traditional support: ~$15/ticket, AI swarm: ~$0.60/ticket
    const costReductionPercent = 96;
    
    return {
      totalJobs,
      completedJobs,
      totalMneeVolume,
      activeSwarms,
      totalAgents,
      completionRate,
      avgCompletionTime,
      costReductionPercent,
    };
  }),

  /**
   * Get earnings over time data for charts
   * Returns daily earnings aggregated by date
   */
  getEarningsOverTime: publicProcedure
    .input(z.object({
      days: z.number().min(1).max(365).default(30),
    }).optional())
    .query(async ({ input }) => {
      const days = input?.days || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);
      
      // Get completed jobs within the date range
      const jobs = await prisma.job.findMany({
        where: {
          status: 'COMPLETED',
          completedAt: {
            gte: startDate,
          },
        },
        select: {
          payment: true,
          completedAt: true,
        },
        orderBy: {
          completedAt: 'asc',
        },
      });
      
      // Aggregate by date
      const earningsByDate = new Map<string, bigint>();
      
      jobs.forEach((job) => {
        if (job.completedAt) {
          const dateKey = job.completedAt.toISOString().split('T')[0];
          const current = earningsByDate.get(dateKey) || BigInt(0);
          earningsByDate.set(dateKey, current + BigInt(job.payment.toString()));
        }
      });
      
      // Generate all dates in range and fill with data
      const result: Array<{ date: string; earnings: string }> = [];
      const currentDate = new Date(startDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      while (currentDate <= today) {
        const dateKey = currentDate.toISOString().split('T')[0];
        const earnings = earningsByDate.get(dateKey) || BigInt(0);
        result.push({
          date: dateKey,
          earnings: earnings.toString(),
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return result;
    }),

  /**
   * Get job statistics by status
   */
  getJobStats: publicProcedure.query(async () => {
    const stats = await prisma.job.groupBy({
      by: ['status'],
      _count: { status: true },
    });
    
    return stats.map((s) => ({
      status: s.status,
      count: s._count.status,
    }));
  }),

  /**
   * Get top performing swarms
   */
  getTopSwarms: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(20).default(5),
    }).optional())
    .query(async ({ input }) => {
      const limit = input?.limit || 5;
      
      const swarms = await prisma.swarm.findMany({
        where: { isActive: true },
        orderBy: { rating: 'desc' },
        take: limit,
        include: {
          _count: {
            select: {
              jobs: { where: { status: 'COMPLETED' } },
              agents: true,
            },
          },
          agents: {
            select: {
              earnings: true,
            },
          },
        },
      });
      
      return swarms.map((swarm) => {
        const totalEarnings = swarm.agents.reduce(
          (sum, agent) => sum + BigInt(agent.earnings.toString()),
          BigInt(0)
        );
        
        return {
          id: swarm.id,
          name: swarm.name,
          rating: swarm.rating,
          completedJobs: swarm._count.jobs,
          agentCount: swarm._count.agents,
          totalEarnings: totalEarnings.toString(),
        };
      });
    }),
});
