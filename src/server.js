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

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// JSON Body Parser with strict payload size limit
app.use(express.json({ limit: '100kb' }));

// Restrict CORS to localhost/same-origin
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    `http://localhost:${config.port}`,
    `http://127.0.0.1:${config.port}`,
    'https://ankitallm.github.io'
  ];

  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // Same-origin request
    res.header('Access-Control-Allow-Origin', `http://127.0.0.1:${config.port}`);
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Rate limiting state for /api/scan to prevent abuse
let lastScanTriggerTime = 0;
const SCAN_COOLDOWN_MS = 60 * 1000; // 60s minimum interval

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
    res.status(500).json({ success: false, error: 'Internal server error' });
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
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/scan — Trigger manual scan with cooldown rate limiting
 */
app.post('/api/scan', async (req, res) => {
  const now = Date.now();
  if (now - lastScanTriggerTime < SCAN_COOLDOWN_MS) {
    const waitSec = Math.ceil((SCAN_COOLDOWN_MS - (now - lastScanTriggerTime)) / 1000);
    return res.status(429).json({ success: false, message: `Scan cooldown active. Please wait ${waitSec}s.` });
  }

  if (isScanRunning()) {
    return res.json({ success: false, message: 'Scan already in progress' });
  }

  lastScanTriggerTime = now;
  res.json({ success: true, message: 'Scan started' });

  // Run scan in background
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
    const { id, status, notes } = req.body || {};
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid job ID is required' });
    }
    const result = setApplicationStatus({ id, status, notes });
    res.status(result.success ? 200 : 404).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/jobs/:id/notes — Update personal notes
 */
app.post('/api/jobs/:id/notes', (req, res) => {
  try {
    const notes = typeof req.body.notes === 'string' ? req.body.notes.slice(0, 5000) : '';
    const result = updateJobNotes(req.params.id, notes);
    res.status(result.success ? 200 : 404).json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/statuses — Valid statuses
 */
app.get('/api/statuses', (req, res) => {
  res.json({ success: true, statuses: APPLICATION_STATUSES });
});

/**
 * GET /api/pitch/:id — Generate quick tailored pitch snippet without exposed PII
 */
app.get('/api/pitch/:id', (req, res) => {
  try {
    const jobs = getJobs();
    const job = jobs.find(j => j.id === req.params.id);
    if (!job) return res.status(404).json({ success: false, error: 'Job not found' });

    const pitch = `Hi Hiring Team at ${job.company || 'the team'},\n\nI am writing to express my strong interest in the ${job.title} role. With over 11+ years of Quality Engineering & SDET experience, I specialize in designing scalable test automation frameworks (Playwright, WebdriverIO, Selenium, REST Assured, Appium) and integrating AI-assisted quality workflows (Amazon Bedrock, Agentic AI).\n\nKey Highlights of my experience:\n• Architected data-driven & BDD automation frameworks across Web, Mobile (iOS/Android), and REST/GraphQL APIs with parallel CI/CD execution.\n• Engineered AI-driven defect and testing workflows, driving significant time savings and 100% traceability across distributed agile teams.\n• Proven track record across enterprise platforms, financial systems, healthcare, and e-commerce.\n\nI am authorized to work in the US without sponsorship and would love to discuss how my skill set aligns with your engineering goals.\n\nBest regards,\nAnkita Agrawal\nPittsburgh, PA`;

    res.json({ success: true, pitch, jobTitle: job.title, company: job.company });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * Start the Express web server (bound to 127.0.0.1 localhost by default)
 */
function startServer() {
  const host = process.env.HOST || '127.0.0.1';
  return new Promise((resolve) => {
    app.listen(config.port, host, () => {
      console.log(`\n🌐 SDET Job Dashboard: http://${host}:${config.port}`);
      console.log(`📡 API Endpoints:       http://${host}:${config.port}/api/stats\n`);
      resolve();
    });
  });
}

module.exports = { startServer, app };
