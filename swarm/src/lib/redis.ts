import Redis from 'ioredis';

/**
 * Redis connection configuration
 * Uses Upstash or Railway Redis in production
 */
const getRedisConfig = () => {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    console.warn('REDIS_URL not set, using default localhost connection');
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    };
  }

  // Parse the Redis URL
  const url = new URL(redisUrl);
  
  return {
    host: url.hostname,
    port: parseInt(url.port) || 6379,
    password: url.password || undefined,
    username: url.username || undefined,
    maxRetriesPerRequest: null,
    // Enable TLS for production Redis (Upstash, Railway)
    tls: url.protocol === 'rediss:' ? {} : undefined,
  };
};

/**
 * Create a Redis connection
 */
export const createRedisConnection = () => {
  const config = getRedisConfig();
  return new Redis(config);
};

/**
 * Singleton Redis connection for the application
 */
let redisConnection: Redis | null = null;

export const getRedisConnection = () => {
  if (!redisConnection) {
    redisConnection = createRedisConnection();
  }
  return redisConnection;
};

export default getRedisConnection;
