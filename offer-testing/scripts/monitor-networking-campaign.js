#!/usr/bin/env node

/**
 * Monitor Networking Campaign
 * 
 * Real-time dashboard showing:
 * - Campaign progress (sent, pending, failed)
 * - Send rate (messages/hour)
 * - Errors and warnings
 * - Recent activity
 * 
 * Run this in a separate terminal while sending
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REFRESH_INTERVAL = 5000; // 5 seconds

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Import supabase client
const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Clear screen helper
function clearScreen() {
  console.log('\x1Bc');
}

// Format date helper
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// Calculate send rate
let previousSentCount = 0;
let previousTimestamp = Date.now();

async function fetchCampaignStats() {
  // Get campaign
  const { data: campaign, error: campaignError } = await supabase
    .from('networking_campaign_batches')
    .select('*')
    .eq('name', 'networking-holidays-2025')
    .single();

  if (campaignError) {
    throw new Error(`Failed to fetch campaign: ${campaignError.message}`);
  }

  // Get outreach counts by status
  const { data: stats, error: statsError } = await supabase
    .from('networking_outreach')
    .select('status')
    .eq('batch_id', campaign.id);

  if (statsError) {
    throw new Error(`Failed to fetch stats: ${statsError.message}`);
  }

  const statusCounts = stats.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});

  // Get recent activity (last 10 sent)
  const { data: recentActivity, error: activityError } = await supabase
    .from('networking_outreach')
    .select(`
      status,
      sent_at,
      linkedin_connections!inner(first_name, linkedin_url)
    `)
    .eq('batch_id', campaign.id)
    .not('sent_at', 'is', null)
    .order('sent_at', { ascending: false })
    .limit(10);

  if (activityError) {
    console.error('Warning: Failed to fetch recent activity');
  }

  // Get errors (failed messages)
  const { data: errors, error: errorsError } = await supabase
    .from('networking_outreach')
    .select(`
      skip_reason,
      linkedin_connections!inner(first_name, linkedin_url)
    `)
    .eq('batch_id', campaign.id)
    .eq('status', 'failed')
    .limit(5);

  if (errorsError) {
    console.error('Warning: Failed to fetch errors');
  }

  return {
    campaign,
    statusCounts,
    recentActivity: recentActivity || [],
    errors: errors || []
  };
}

function renderDashboard(data) {
  clearScreen();
  
  const { campaign, statusCounts, recentActivity, errors } = data;

  const pending = statusCounts.pending || 0;
  const sent = statusCounts.sent || 0;
  const failed = statusCounts.failed || 0;
  const replied = statusCounts.replied || 0;
  const total = campaign.total_target_count || 0;

  const percentComplete = total > 0 ? ((sent / total) * 100).toFixed(1) : 0;

  // Calculate send rate
  const now = Date.now();
  const timeDiff = (now - previousTimestamp) / 1000 / 60; // minutes
  const sentDiff = sent - previousSentCount;
  const sendRate = timeDiff > 0 ? (sentDiff / timeDiff).toFixed(1) : 0;
  
  previousSentCount = sent;
  previousTimestamp = now;

  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║           NETWORKING CAMPAIGN MONITOR                             ║');
  console.log('║           networking-holidays-2025                                ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  console.log(`📊 Campaign Status: ${campaign.status.toUpperCase()}`);
  console.log(`⏰ Last Updated: ${formatDate(campaign.updated_at)}\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📈 PROGRESS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total Target:     ${total}`);
  console.log(`✅ Sent:          ${sent} (${percentComplete}%)`);
  console.log(`⏳ Pending:       ${pending}`);
  console.log(`❌ Failed:        ${failed}`);
  console.log(`💬 Replied:       ${replied}`);
  console.log();

  // Progress bar
  const barLength = 50;
  const filledLength = Math.round((sent / total) * barLength);
  const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
  console.log(`Progress: [${bar}] ${percentComplete}%\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 SEND RATE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Current Rate:     ${sendRate} messages/minute`);
  console.log(`Target Rate:      ~0.8-1.5 messages/minute (50/day with delays)`);
  console.log();

  if (recentActivity.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📬 RECENT ACTIVITY (Last 10)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    recentActivity.slice(0, 5).forEach(activity => {
      const name = activity.linkedin_connections?.first_name || 'Unknown';
      const time = formatDate(activity.sent_at);
      console.log(`  ✓ ${name.padEnd(20)} ${time}`);
    });
    console.log();
  }

  if (errors.length > 0) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  ERRORS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    errors.forEach(error => {
      const name = error.linkedin_connections?.first_name || 'Unknown';
      const reason = error.skip_reason || 'Unknown error';
      console.log(`  ❌ ${name}: ${reason}`);
    });
    console.log();
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💡 TIPS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  • Monitor the send rate - should be slow and steady');
  console.log('  • Check for errors - may need to adjust campaign');
  console.log('  • Press Ctrl+C to stop monitoring (campaign keeps running)');
  console.log('  • Campaign will auto-pause outside business hours\n');

  console.log(`🔄 Refreshing every ${REFRESH_INTERVAL / 1000} seconds...`);
}

async function monitor() {
  console.log('🚀 Starting campaign monitor...\n');
  console.log('Fetching initial data...\n');

  try {
    // Initial fetch
    const data = await fetchCampaignStats();
    renderDashboard(data);

    // Set up refresh interval
    setInterval(async () => {
      try {
        const data = await fetchCampaignStats();
        renderDashboard(data);
      } catch (error) {
        console.error('❌ Error fetching stats:', error.message);
      }
    }, REFRESH_INTERVAL);

  } catch (error) {
    console.error('❌ Failed to start monitor:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Monitoring stopped. Campaign is still running.');
  console.log('💡 Run this script again anytime to check progress.\n');
  process.exit(0);
});

// Start monitoring
monitor();

