import { initTRPC } from '@trpc/server';
import { ZodError } from 'zod';
import superjson from 'superjson';

/**
 * Context for tRPC procedures
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Context {
  // Add user session, wallet address, etc. here when needed
}

/**
 * Create context for each request
 */
export const createContext = async (): Promise<Context> => {
  return {};
};

/**
 * Initialize tRPC
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Export reusable router and procedure helpers
 */
export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

/**
 * Middleware to log procedure calls (development only)
 */
export const loggerMiddleware = middleware(async ({ path, type, next }) => {
  const start = Date.now();
  const result = await next();
  const durationMs = Date.now() - start;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[tRPC] ${type} ${path} - ${durationMs}ms`);
  }
  
  return result;
});

/**
 * Procedure with logging
 */
export const loggedProcedure = publicProcedure.use(loggerMiddleware);
