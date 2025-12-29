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

const { execSync } = require('child_process');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

// Check if this is a cron run
// Railway cron jobs may set different environment variables
const isCronRun = process.argv.includes('--cron') ||
                  process.env.RAILWAY_STATIC_URL ||
                  process.env.CRON_JOB === 'true' ||
                  process.env.RAILWAY_DEPLOYMENT_TRIGGER === 'CRON' ||
                  // Fallback: check if we have cron-specific environment
                  (process.env.RAILWAY_ENVIRONMENT && !process.env.PORT);

console.log(`🚀 Railway Service Starting...`);
console.log(`📅 Mode: ${isCronRun ? 'CRON JOB' : 'WEB APP'}`);
console.log(`⏰ Time: ${new Date().toISOString()}`);

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
