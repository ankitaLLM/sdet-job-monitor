const fs = require('fs');
const path = require('path');
const { runFullScan } = require('../src/scraper');
const { processScanResults, getStats } = require('../src/storage');
const { sendNotification, initTransporter } = require('../src/notifier');
const config = require('../src/config');

async function runCliScrape() {
  console.log('🚀 Running GitHub Actions Scraper for Ankita Agrawal...');
  
  initTransporter();

  // 1. Run full LinkedIn scan
  const scrapedJobs = await runFullScan();

  // 2. Process and store in data/jobs.json
  const { newJobs, totalJobs, scanCount } = processScanResults(scrapedJobs);

  // 3. Also copy jobs.json and stats to public/data/jobs.json for GitHub Pages static hosting
  const publicDataDir = path.join(__dirname, '..', 'public', 'data');
  if (!fs.existsSync(publicDataDir)) {
    fs.mkdirSync(publicDataDir, { recursive: true });
  }

  const jobsDataPath = path.join(__dirname, '..', 'data', 'jobs.json');
  const publicJobsDataPath = path.join(publicDataDir, 'jobs.json');

  if (fs.existsSync(jobsDataPath)) {
    const rawData = fs.readFileSync(jobsDataPath, 'utf-8');
    fs.writeFileSync(publicJobsDataPath, rawData, 'utf-8');
    console.log(`📋 Copied jobs database to public/data/jobs.json for GitHub Pages`);
  }

  const stats = getStats();

  // 4. Send notification email with stats summary
  console.log(`📧 Sending refresh summary & stats to ${config.gmail.notifyEmail}...`);
  await sendNotification(newJobs, stats);
  console.log('📊 Scan completed successfully:', stats);
}

runCliScrape().catch(err => {
  console.error('❌ CLI Scraper failed:', err);
  process.exit(1);
});
