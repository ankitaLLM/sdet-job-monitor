const express = require('express');
const path = require('path');
const config = require('./config');
const {
  getJobs,
  getStats,
  markJobRead,
  markAllRead,
  setApplicationStatus,
  updateJobNotes,
  APPLICATION_STATUSES
} = require('./storage');
const { executeScan, getLastScanResult, isScanRunning } = require('./scheduler');

const app = express();

// Middleware
app.use(express.json());

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Serve frontend static assets
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── API Routes ────────────────────────────────────────

/**
 * GET /api/jobs — Return filtered jobs
 */
app.get('/api/jobs', (req, res) => {
  try {
    const filters = {};
    if (req.query.category) filters.category = req.query.category;
    if (req.query.locationType) filters.locationType = req.query.locationType;
    if (req.query.isTop100 !== undefined) filters.isTop100 = req.query.isTop100 === 'true';
    if (req.query.isPittsburgh !== undefined) filters.isPittsburgh = req.query.isPittsburgh === 'true';
    if (req.query.isNew !== undefined) filters.isNew = req.query.isNew === 'true';
    if (req.query.isRead !== undefined) filters.isRead = req.query.isRead === 'true';
    if (req.query.applicationStatus) filters.applicationStatus = req.query.applicationStatus;
    if (req.query.search) filters.search = req.query.search;

    const jobs = getJobs(filters);
    res.json({ success: true, count: jobs.length, jobs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/stats — Return dashboard stats
 */
app.get('/api/stats', (req, res) => {
  try {
    const stats = getStats();
    stats.isScanning = isScanRunning();
    stats.lastScanResult = getLastScanResult();
    stats.cronSchedule = config.cronSchedule;
    res.json({ success: true, ...stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/scan — Trigger manual scan
 */
app.post('/api/scan', async (req, res) => {
  if (isScanRunning()) {
    return res.json({ success: false, message: 'Scan already in progress' });
  }

  res.json({ success: true, message: 'Scan started' });

  // Run in background
  executeScan().catch(err => {
    console.error('Manual scan error:', err.message);
  });
});

/**
 * POST /api/jobs/:id/read — Mark job as read
 */
app.post('/api/jobs/:id/read', (req, res) => {
  const success = markJobRead(req.params.id);
  res.json({ success });
});

/**
 * POST /api/jobs/read-all — Mark all as read
 */
app.post('/api/jobs/read-all', (req, res) => {
  markAllRead();
  res.json({ success: true });
});

/**
 * POST /api/jobs/status — Update application status
 */
app.post('/api/jobs/status', (req, res) => {
  try {
    const result = setApplicationStatus(req.body || {});
    res.status(result.success ? 200 : 404).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/jobs/:id/notes — Update personal notes
 */
app.post('/api/jobs/:id/notes', (req, res) => {
  try {
    const result = updateJobNotes(req.params.id, req.body.notes || '');
    res.status(result.success ? 200 : 404).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/statuses — Valid statuses
 */
app.get('/api/statuses', (req, res) => {
  res.json({ success: true, statuses: APPLICATION_STATUSES });
});

/**
 * GET /api/pitch/:id — Generate quick tailored pitch snippet
 */
app.get('/api/pitch/:id', (req, res) => {
  try {
    const jobs = getJobs();
    const job = jobs.find(j => j.id === req.params.id);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

    const pitch = `Hi Hiring Team at ${job.company || 'the team'},\n\nI am writing to express my strong interest in the ${job.title} role. With over 11+ years of Quality Engineering & SDET experience, I specialize in designing scalable test automation frameworks (Playwright, WebdriverIO, Selenium, REST Assured, Appium) and integrating AI-assisted quality workflows (Amazon Bedrock, Agentic AI).\n\nKey Highlights of my experience:\n• Architected data-driven & BDD automation frameworks across Web, Mobile (iOS/Android), and REST/GraphQL APIs with parallel CI/CD execution.\n• Engineered AI-driven defect and testing workflows, driving significant time savings and 100% traceability across distributed agile teams.\n• Proven track record across enterprise platforms, financial systems, healthcare, and e-commerce.\n\nI am authorized to work in the US without sponsorship and would love to discuss how my skill set aligns with your engineering goals.\n\nBest regards,\nAnkita Agrawal\nPittsburgh, PA | ankita.vinculum@gmail.com | +1-716-400-6921`;

    res.json({ success: true, pitch, jobTitle: job.title, company: job.company });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Start the Express web server
 */
function startServer() {
  return new Promise((resolve) => {
    app.listen(config.port, () => {
      console.log(`\n🌐 SDET Job Dashboard: http://localhost:${config.port}`);
      console.log(`📡 API Endpoints:       http://localhost:${config.port}/api/stats\n`);
      resolve();
    });
  });
}

module.exports = { startServer, app };
