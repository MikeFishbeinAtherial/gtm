#!/usr/bin/env node

/**
 * Smart Service Starter for Railway
 *
 * This script detects whether it's being run by:
 * 1. Regular deployment (starts Next.js web app)
 * 2. Cron job (runs message queue processor)
 *
 * Usage:
 *   node scripts/start-service.js          # For regular deployment
 *   node scripts/start-service.js --cron   # For cron jobs
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Check if this is a cron run
// Railway cron jobs may set different environment variables
const cronSignals = {
  argv: process.argv.includes('--cron'),
  cronJobEnv: process.env.CRON_JOB === 'true',
  cronEnv: process.env.CRON === 'true',
  railwayCronEnv: process.env.RAILWAY_CRON === 'true',
  railwayRunType: process.env.RAILWAY_RUN_TYPE === 'CRON',
  railwayDeploymentTrigger: process.env.RAILWAY_DEPLOYMENT_TRIGGER === 'CRON',
  railwayStaticUrl: Boolean(process.env.RAILWAY_STATIC_URL),
  railwayEnvNoPort: Boolean(process.env.RAILWAY_ENVIRONMENT && !process.env.PORT)
};

const isCronRun = Object.values(cronSignals).some(Boolean);

console.log(`🚀 Railway Service Starting...`);
console.log(`📅 Mode: ${isCronRun ? 'CRON JOB' : 'WEB APP'}`);
console.log(`⏰ Time: ${new Date().toISOString()}`);
console.log(`🧭 Cron detection: ${JSON.stringify(cronSignals)}`);

if (isCronRun) {
  console.log('📋 Running message queue processor...');
  try {
    // Run the message queue processor
    execSync('node scripts/process-message-queue.js', {
      cwd: projectRoot,
      stdio: 'inherit'
    });
    console.log('✅ Cron job completed successfully');
  } catch (error) {
    console.error('❌ Cron job failed:', error.message);
    process.exit(1);
  }
} else {
  console.log('🌐 Starting Next.js web application...');
  try {
    // Start the Next.js application
    execSync('npm start', {
      cwd: projectRoot,
      stdio: 'inherit'
    });
  } catch (error) {
    console.error('❌ Web app failed to start:', error.message);
    process.exit(1);
  }
}
