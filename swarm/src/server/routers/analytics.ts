import { router, publicProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

/**
 * Default metrics when database is unavailable
 */
const DEFAULT_METRICS = {
  totalJobs: 0,
  completedJobs: 0,
  totalMneeVolume: '0',
  activeSwarms: 0,
  totalAgents: 0,
  completionRate: 0,
  avgCompletionTime: 0,
  costReductionPercent: 96,
};

/**
 * Analytics Router
 * 
 * Provides endpoints for dashboard metrics and analytics data
 * Includes graceful error handling for database connectivity issues
 */
export const analyticsRouter = router({
  /**
   * Get dashboard overview metrics
   * Returns total jobs, MNEE volume, active swarms, and cost reduction metric
   */
  getDashboardMetrics: publicProcedure.query(async () => {
    try {
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
            return sum + (diffMs / (1000 * 60 * 60));
          }
          return sum;
        }, 0);
        avgCompletionTime = Math.round((totalHours / completedJobsWithTime.length) * 10) / 10;
      }
      
      return {
        totalJobs,
        completedJobs,
        totalMneeVolume,
        activeSwarms,
        totalAgents,
        completionRate,
        avgCompletionTime,
        costReductionPercent: 96,
      };
    } catch (error) {
      console.error('[Analytics] getDashboardMetrics error:', error);
      return DEFAULT_METRICS;
    }
  }),

  /**
   * Get earnings over time data for charts
   */
  getEarningsOverTime: publicProcedure
    .input(z.object({
      days: z.number().min(1).max(365).default(30),
    }).optional())
    .query(async ({ input }) => {
      try {
        const days = input?.days || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);
        
        const jobs = await prisma.job.findMany({
          where: {
            status: 'COMPLETED',
            completedAt: { gte: startDate },
          },
          select: {
            payment: true,
            completedAt: true,
          },
          orderBy: { completedAt: 'asc' },
        });
        
        const earningsByDate = new Map<string, bigint>();
        
        jobs.forEach((job) => {
          if (job.completedAt) {
            const dateKey = job.completedAt.toISOString().split('T')[0];
            const current = earningsByDate.get(dateKey) || BigInt(0);
            earningsByDate.set(dateKey, current + BigInt(job.payment.toString()));
          }
        });
        
        const result: Array<{ date: string; earnings: string }> = [];
        const currentDate = new Date(startDate);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        
        while (currentDate <= today) {
          const dateKey = currentDate.toISOString().split('T')[0];
          const earnings = earningsByDate.get(dateKey) || BigInt(0);
          result.push({ date: dateKey, earnings: earnings.toString() });
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return result;
      } catch (error) {
        console.error('[Analytics] getEarningsOverTime error:', error);
        return [];
      }
    }),

  /**
   * Get job statistics by status
   */
  getJobStats: publicProcedure.query(async () => {
    try {
      const stats = await prisma.job.groupBy({
        by: ['status'],
        _count: { status: true },
      });
      
      return stats.map((s) => ({
        status: s.status,
        count: s._count.status,
      }));
    } catch (error) {
      console.error('[Analytics] getJobStats error:', error);
      return [];
    }
  }),

  /**
   * Get top performing swarms
   */
  getTopSwarms: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(20).default(5),
    }).optional())
    .query(async ({ input }) => {
      try {
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
              select: { earnings: true },
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
      } catch (error) {
        console.error('[Analytics] getTopSwarms error:', error);
        return [];
      }
    }),
});
