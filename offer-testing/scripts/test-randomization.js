#!/usr/bin/env node

/**
 * Test Randomization - Quick Test Script
 * 
 * This script simulates what happens in the cron job to show
 * that randomization is working.
 * 
 * Run: node scripts/test-randomization.js
 */

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testRandomization() {
  console.log('🧪 Testing Randomization Logic\n');
  console.log('Simulating 5 cron runs to show variance:\n');
  
  const results = [];
  
  for (let i = 1; i <= 5; i++) {
    const cronStartTime = new Date();
    const cronMinute = cronStartTime.getMinutes();
    const cronSecond = cronStartTime.getSeconds();
    
    // Simulate cron starting at exact 5-minute mark (e.g., 8:00:00, 8:05:00)
    const simulatedCronTime = new Date(cronStartTime);
    simulatedCronTime.setSeconds(0);
    simulatedCronTime.setMilliseconds(0);
    
    // Add random delay (same as production code)
    const randomDelayMs = Math.floor(Math.random() * 90000) + 1000; // 1-90 seconds
    const randomDelaySeconds = Math.floor(randomDelayMs / 1000);
    
    // Calculate when message would actually be sent
    const actualSendTime = new Date(simulatedCronTime.getTime() + randomDelayMs);
    
    results.push({
      cronRun: i,
      cronTime: simulatedCronTime.toISOString(),
      delaySeconds: randomDelaySeconds,
      actualSendTime: actualSendTime.toISOString(),
      sendTimeFormatted: actualSendTime.toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    });
    
    console.log(`Run ${i}:`);
    console.log(`  Cron starts:    ${simulatedCronTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}:00`);
    console.log(`  Random delay:   ${randomDelaySeconds} seconds`);
    console.log(`  Message sent:   ${actualSendTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);
    console.log('');
    
    // Small delay between runs for readability
    await sleep(500);
  }
  
  console.log('📊 Summary:');
  console.log('─'.repeat(60));
  console.log('Run | Cron Time | Delay | Actual Send Time');
  console.log('─'.repeat(60));
  results.forEach(r => {
    const cronTimeStr = new Date(r.cronTime).toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    console.log(` ${r.cronRun}  | ${cronTimeStr}:00  | ${String(r.delaySeconds).padStart(2)}s   | ${r.sendTimeFormatted}`);
  });
  console.log('─'.repeat(60));
  
  console.log('\n✅ Test Complete!');
  console.log('\nWhat to look for:');
  console.log('• Each run has a different delay (1-90 seconds)');
  console.log('• Send times vary (not always :00 or :05)');
  console.log('• Pattern looks natural, not robotic\n');
}

testRandomization().catch(console.error);

