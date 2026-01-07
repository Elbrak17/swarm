/**
 * Worker entry point
 * Run this file to start all background workers
 * 
 * Usage: npx tsx src/workers/index.ts
 */

import { createJobExecutionWorker } from './job-execution-worker';
import { createNotificationsWorker } from './notifications-worker';

async function main() {
  console.log('[Workers] Starting background workers...');
  
  // Start workers
  const jobWorker = createJobExecutionWorker();
  const notificationsWorker = createNotificationsWorker();
  
  console.log('[Workers] All workers started');
  
  // Handle graceful shutdown
  const shutdown = async () => {
    console.log('[Workers] Shutting down...');
    
    await Promise.all([
      jobWorker.close(),
      notificationsWorker.close(),
    ]);
    
    console.log('[Workers] Shutdown complete');
    process.exit(0);
  };
  
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('[Workers] Fatal error:', error);
  process.exit(1);
});
