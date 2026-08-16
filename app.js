const { startServer } = require('./src/server');
const { startScheduler } = require('./src/scheduler');
const { initTransporter } = require('./src/notifier');
const { initDatabase } = require('./src/storage');

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║       Senior SDET & QA Automation Job Monitor v2.0          ║');
  console.log('║       Tailored for Ankita Agrawal (11+ Years Experience)    ║');
  console.log('║       Remote US + Pittsburgh Area • 3-Hour Scraping Cycles   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  // 1. Initialize persistent storage
  initDatabase();

  // 2. Initialize email notification service
  initTransporter();

  // 3. Start web dashboard server
  await startServer();

  // 4. Start scheduler (triggers initial scan immediately)
  startScheduler();
}

main().catch(err => {
  console.error('Fatal error starting SDET Job Monitor:', err);
  process.exit(1);
});
