const cron = require('node-cron');
const config = require('./config');
const { runFullScan } = require('./scraper');
const { processScanResults } = require('./storage');
const { sendNotification } = require('./notifier');

let isScanning = false;
let lastScanResult = null;

/**
 * Execute a single scan cycle: scrape → store & enrich → notify
 */
async function executeScan() {
  if (isScanning) {
    console.log('⏳ Scan already in progress, skipping...');
    return { skipped: true };
  }

  isScanning = true;
  const startTime = Date.now();

  try {
    // 1. Scrape LinkedIn across Remote and Pittsburgh tracks
    const scrapedJobs = await runFullScan();

    // 2. Process, enrich, and store results
    const { newJobs, totalJobs, scanCount } = processScanResults(scrapedJobs);

    // 3. Send email summary notification
    let emailResult = { sent: false, reason: 'Email transporter not configured' };
    const stats = { totalJobs, scanCount, remoteJobs: 0, pittsburghJobs: 0, top100Jobs: 0 };
    emailResult = await sendNotification(newJobs, stats);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    lastScanResult = {
      timestamp: new Date().toISOString(),
      scrapedCount: scrapedJobs.length,
      newJobsCount: newJobs.length,
      totalJobs,
      scanCount,
      emailSent: emailResult.sent,
      emailReason: emailResult.reason || null,
      durationSeconds: parseFloat(elapsed),
    };

    console.log(`\n📊 Scan Summary:`);
    console.log(`   Scraped: ${scrapedJobs.length} | New: ${newJobs.length} | Total Stored: ${totalJobs}`);
    console.log(`   Email: ${emailResult.sent ? '✅ Sent to ' + config.gmail.notifyEmail : `⏭️ ${emailResult.reason}`}`);
    console.log(`   Duration: ${elapsed}s | Scan #${scanCount}`);
    console.log(`   Next scan: ${getNextScanTime()}\n`);

    return lastScanResult;
  } catch (err) {
    console.error('❌ Scan failed:', err.message);
    lastScanResult = {
      timestamp: new Date().toISOString(),
      error: err.message,
    };
    return lastScanResult;
  } finally {
    isScanning = false;
  }
}

/**
 * Get next scheduled scan time based on cron schedule
 */
function getNextScanTime() {
  const schedule = config.cronSchedule;
  const now = new Date();
  const next = new Date(now);
  next.setMinutes(0, 0, 0);

  const everyNHoursMatch = schedule.match(/^0\s+\*\/(\d+)\s+\*\s+\*\s+\*$/);
  if (everyNHoursMatch) {
    const n = parseInt(everyNHoursMatch[1], 10);
    const currentHour = now.getHours();
    let nextHour = currentHour + 1;
    while (nextHour % n !== 0) {
      nextHour++;
    }
    next.setHours(nextHour);
    return next.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  if (schedule === '0 * * * *') {
    next.setHours(now.getHours() + 1);
    return next.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  return 'Every 3 hours';
}

/**
 * Start the cron scheduler
 */
function startScheduler() {
  console.log(`⏰ Scheduler active: "${config.cronSchedule}" (every 3 hours)`);
  console.log(`   Job titles: ${config.jobTitles.join(', ')}`);
  console.log(`   Target Locations: Remote US & Pittsburgh Area\n`);

  // Run initial scan on startup
  console.log('🚀 Initiating startup scan...\n');
  executeScan();

  // Schedule recurring 3-hour scans
  cron.schedule(config.cronSchedule, () => {
    console.log(`\n⏰ Scheduled 3-hour scan triggered at ${new Date().toLocaleString()}`);
    executeScan();
  });
}

function getLastScanResult() {
  return lastScanResult;
}

function isScanRunning() {
  return isScanning;
}

module.exports = { startScheduler, executeScan, getLastScanResult, isScanRunning };
