const fs = require('fs');
const path = require('path');
const config = require('./config');
const {
  isTop100Company,
  isPittsburghCompany,
  buildCompanyCareersUrl,
  analyzeJobFit
} = require('./companies');
const { isRelevantQATitle } = require('./scraper');

const APPLICATION_STATUSES = ['New', 'Viewed', 'Applied', 'Interviewing', 'Offer', 'Rejected'];

// Ensure data directory exists
function ensureDataDir() {
  const dir = path.resolve(config.dataDir);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Get the jobs file path
 */
function getJobsFilePath() {
  return path.join(path.resolve(config.dataDir), 'jobs.json');
}

/**
 * Enrich raw scraped job with intelligent metadata
 */
function enrichJob(job) {
  const isTop100 = isTop100Company(job.company);
  const isPghCompany = isPittsburghCompany(job.company);
  const locLower = (job.location || '').toLowerCase();
  const isPghLocation = locLower.includes('pittsburgh') || locLower.includes('pa') || locLower.includes('pennsylvania');
  const isPgh = isPghCompany || isPghLocation;

  // Determine workplace type tag
  let workplaceType = 'Remote';
  if (locLower.includes('remote') || (job.locationQuery && job.locationQuery.includes('Remote'))) {
    workplaceType = 'Remote';
  } else if (locLower.includes('hybrid')) {
    workplaceType = 'Hybrid';
  } else if (isPghLocation) {
    workplaceType = 'Pittsburgh Area';
  } else if (job.location) {
    workplaceType = job.location;
  }

  // Calculate resume skill fit
  const fit = analyzeJobFit(job.title, job.company, job.searchQuery);

  return {
    ...job,
    isTop100,
    isPittsburgh: isPgh,
    workplaceType,
    matchScore: fit.score,
    matchedSkills: fit.matchedSkills,
    companyApplyUrl: job.companyApplyUrl || buildCompanyCareersUrl(job.company, job.title),
    applicationStatus: job.applicationStatus || 'New',
    notes: job.notes || '',
    isRead: job.isRead || false,
    isNew: job.isNew !== undefined ? job.isNew : true,
    firstSeen: job.firstSeen || new Date().toISOString()
  };
}

/**
 * Load existing jobs from the JSON file with strict relevance filtering
 */
function loadJobs() {
  ensureDataDir();
  const filePath = getJobsFilePath();

  if (!fs.existsSync(filePath)) {
    return { jobs: [], lastScan: null, scanCount: 0 };
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    if (data.jobs && Array.isArray(data.jobs)) {
      // Strictly retain ONLY validated QA, SDET, Test Engineer, Validation roles
      data.jobs = data.jobs
        .filter(job => isRelevantQATitle(job.title))
        .map(job => enrichJob(job));
    }
    return data;
  } catch (err) {
    console.error('❌ Error loading jobs file:', err.message);
    return { jobs: [], lastScan: null, scanCount: 0 };
  }
}

/**
 * Save jobs to the JSON file
 */
function saveJobs(data) {
  ensureDataDir();
  const filePath = getJobsFilePath();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Initialize database
 */
function initDatabase() {
  ensureDataDir();
  const filePath = getJobsFilePath();
  console.log(`💾 Data storage initialized: ${filePath}`);
}

/**
 * Merge newly scraped jobs with existing stored jobs.
 */
function mergeJobs(existingJobs, scrapedJobs) {
  const existingMap = new Map();
  existingJobs.forEach(j => {
    if (j.id && isRelevantQATitle(j.title)) {
      existingMap.set(j.id, j);
    }
  });

  const newJobs = [];

  for (const rawJob of scrapedJobs) {
    if (!rawJob.id || !isRelevantQATitle(rawJob.title)) continue;

    if (!existingMap.has(rawJob.id)) {
      const enriched = enrichJob({
        ...rawJob,
        firstSeen: new Date().toISOString(),
        isNew: true,
        isRead: false
      });
      existingMap.set(rawJob.id, enriched);
      newJobs.push(enriched);
    }
  }

  // Mark old "new" jobs as no longer new after 24 hours
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const allJobs = Array.from(existingMap.values()).map(job => {
    const updated = { ...job };
    if (updated.isNew && new Date(updated.firstSeen).getTime() < oneDayAgo) {
      updated.isNew = false;
    }
    return updated;
  });

  // Sort by firstSeen descending (newest first)
  allJobs.sort((a, b) => new Date(b.firstSeen) - new Date(a.firstSeen));

  // Cap at 1000 jobs to maintain lightweight storage
  const trimmed = allJobs.slice(0, 1000);

  return { allJobs: trimmed, newJobs };
}

/**
 * Process scan results
 */
function processScanResults(scrapedJobs) {
  const data = loadJobs();
  const { allJobs, newJobs } = mergeJobs(data.jobs, scrapedJobs);

  const updatedData = {
    jobs: allJobs,
    lastScan: new Date().toISOString(),
    scanCount: (data.scanCount || 0) + 1,
  };

  saveJobs(updatedData);

  return { newJobs, totalJobs: allJobs.length, scanCount: updatedData.scanCount };
}

/**
 * Get filtered jobs
 */
function getJobs(filters = {}) {
  const data = loadJobs();
  let jobs = data.jobs || [];

  if (filters.category && filters.category !== 'all') {
    jobs = jobs.filter(j =>
      j.searchQuery && j.searchQuery.toLowerCase().includes(filters.category.toLowerCase())
    );
  }

  if (filters.locationType) {
    if (filters.locationType === 'remote') {
      jobs = jobs.filter(j => (j.workplaceType === 'Remote' || (j.location && j.location.toLowerCase().includes('remote'))));
    } else if (filters.locationType === 'pittsburgh') {
      jobs = jobs.filter(j => j.isPittsburgh);
    }
  }

  if (filters.isTop100 !== undefined) {
    jobs = jobs.filter(j => j.isTop100 === filters.isTop100);
  }

  if (filters.isPittsburgh !== undefined) {
    jobs = jobs.filter(j => j.isPittsburgh === filters.isPittsburgh);
  }

  if (filters.applicationStatus && filters.applicationStatus !== 'all') {
    jobs = jobs.filter(j => (j.applicationStatus || 'New') === filters.applicationStatus);
  }

  if (filters.isNew !== undefined) {
    jobs = jobs.filter(j => j.isNew === filters.isNew);
  }

  if (filters.isRead !== undefined) {
    jobs = jobs.filter(j => j.isRead === filters.isRead);
  }

  if (filters.search) {
    const q = filters.search.toLowerCase();
    jobs = jobs.filter(j =>
      (j.title && j.title.toLowerCase().includes(q)) ||
      (j.company && j.company.toLowerCase().includes(q)) ||
      (j.location && j.location.toLowerCase().includes(q)) ||
      (j.matchedSkills && j.matchedSkills.some(s => s.toLowerCase().includes(q))) ||
      (j.notes && j.notes.toLowerCase().includes(q))
    );
  }

  return jobs;
}

/**
 * Get aggregate statistics
 */
function getStats() {
  const data = loadJobs();
  const jobs = data.jobs || [];

  const categories = {};
  for (const job of jobs) {
    const cat = job.searchQuery || 'Other';
    categories[cat] = (categories[cat] || 0) + 1;
  }

  const appliedCount = jobs.filter(j => ['Applied', 'Interviewing', 'Offer'].includes(j.applicationStatus)).length;
  const remoteCount = jobs.filter(j => j.workplaceType === 'Remote' || (j.location && j.location.toLowerCase().includes('remote'))).length;
  const pittsburghCount = jobs.filter(j => j.isPittsburgh).length;
  const top100Count = jobs.filter(j => j.isTop100).length;

  return {
    totalJobs: jobs.length,
    newJobs: jobs.filter(j => j.isNew).length,
    unreadJobs: jobs.filter(j => !j.isRead).length,
    appliedJobs: appliedCount,
    remoteJobs: remoteCount,
    pittsburghJobs: pittsburghCount,
    top100Jobs: top100Count,
    categories,
    lastScan: data.lastScan,
    scanCount: data.scanCount || 0,
  };
}

/**
 * Mark a single job as read
 */
function markJobRead(jobId) {
  const data = loadJobs();
  const job = data.jobs.find(j => j.id === jobId);
  if (job) {
    job.isRead = true;
    job.isNew = false;
    saveJobs(data);
    return true;
  }
  return false;
}

/**
 * Mark all jobs as read
 */
function markAllRead() {
  const data = loadJobs();
  for (const job of data.jobs) {
    job.isRead = true;
    job.isNew = false;
  }
  saveJobs(data);
}

/**
 * Update application status and optional notes
 */
function setApplicationStatus(opts = {}) {
  const data = loadJobs();
  const status = opts.status && APPLICATION_STATUSES.includes(opts.status) ? opts.status : 'Applied';

  let job = null;
  if (opts.id) job = data.jobs.find(j => j.id === opts.id);

  if (!job && opts.company && opts.title) {
    const co = opts.company.toLowerCase();
    const ti = opts.title.toLowerCase();
    job = data.jobs.find(j =>
      j.company && j.company.toLowerCase().includes(co) &&
      j.title && j.title.toLowerCase().includes(ti)
    );
  }

  if (!job) return { success: false, error: 'No matching job found' };

  job.applicationStatus = status;
  if (opts.notes !== undefined) {
    job.notes = opts.notes;
  }
  if (status === 'Applied' && !job.appliedAt) {
    job.appliedAt = new Date().toISOString();
  }
  if (status !== 'New') {
    job.isRead = true;
    job.isNew = false;
  }
  saveJobs(data);
  return { success: true, job };
}

/**
 * Update notes for a job
 */
function updateJobNotes(jobId, notes) {
  const data = loadJobs();
  const job = data.jobs.find(j => j.id === jobId);
  if (job) {
    job.notes = notes;
    saveJobs(data);
    return { success: true, job };
  }
  return { success: false, error: 'Job not found' };
}

module.exports = {
  initDatabase,
  loadJobs,
  processScanResults,
  getJobs,
  getStats,
  markJobRead,
  markAllRead,
  setApplicationStatus,
  updateJobNotes,
  APPLICATION_STATUSES
};
