const { runFullScan } = require('../src/scraper');
const { processScanResults, getStats } = require('../src/storage');
const { sendNotification, initTransporter } = require('../src/notifier');
const config = require('../src/config');

async function runCliScrape() {
  console.log('🚀 Running GitHub Actions Scraper for Ankita Agrawal...');
  
  initTransporter();

  // 1. Run full LinkedIn scan with diagnostics and description enrichment
  const { jobs: scrapedJobs, scanHealth } = await runFullScan();

  // 2. Process and store in data/jobs.json & automatically export sanitized public projection
  const { newJobs, totalJobs, scanCount } = processScanResults(scrapedJobs, scanHealth);
  console.log(`📋 Updated local database and synchronized sanitized public projection (${totalJobs} total active jobs)`);

  const stats = getStats();

  // 3. Send notification email with stats summary
  console.log(`📧 Sending refresh summary & stats to ${config.gmail.notifyEmail}...`);
  await sendNotification(newJobs, stats);
  console.log('📊 Scan completed successfully:', stats);
}

runCliScrape().catch(err => {
  console.error('❌ CLI Scraper failed:', err);
  process.exit(1);
});
