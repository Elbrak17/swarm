import { router } from '../trpc';
import { swarmRouter } from './swarm';
import { jobRouter } from './job';
import { bidRouter } from './bid';
import { analyticsRouter } from './analytics';

/**
 * Main application router combining all sub-routers
 */
export const appRouter = router({
  swarm: swarmRouter,
  job: jobRouter,
  bid: bidRouter,
  analytics: analyticsRouter,
});

/**
 * Export type definition of the API
 */
export type AppRouter = typeof appRouter;
