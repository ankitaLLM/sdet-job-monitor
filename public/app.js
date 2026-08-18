/* ══════════════════════════════════════════════════════════════
   Ankita Agrawal — Senior SDET & QA Job Monitor Frontend App
   Resilient Dual-Mode (Node API + GitHub Pages Static Hosting)
   Hardened with Offline Outbox, Dynamic Polling, and Strict URL Guards
   ══════════════════════════════════════════════════════════════ */

let allJobs = [];
let filteredJobs = [];
let isStaticMode = false;
let isServerOnline = true;
let currentRequestGen = 0;
let activeAbortController = null;
let isFlushingOutbox = false;

// Filter state
let currentCategory = 'all';
let locationFilter = 'all'; // 'all', 'remote', 'pittsburgh'
let top100Only = false;
let peerFilter = false;
let agTechOnly = false;
let agriFinanceOnly = false;
let unreadOnly = false;
let statusFilter = 'all';
let searchQuery = '';
let currentSort = 'newest';

let activeEditingJobId = null;
let autoRefreshInterval = null;
let scanPollingInterval = null;

const STATUS_OPTIONS = ['New', 'Viewed', 'Applied', 'Interviewing', 'Offer', 'Rejected'];

// Unified Local Storage Record for GitHub Pages static mode and offline caching
const USER_RECORDS_KEY = 'ankita_sdet_user_records_v2';
const PENDING_MUTATIONS_KEY = 'ankita_sdet_pending_mutations_v2';

function getUserRecords() {
  try {
    return JSON.parse(localStorage.getItem(USER_RECORDS_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

function saveUserRecord(jobId, updates) {
  try {
    const records = getUserRecords();
    records[jobId] = {
      ...(records[jobId] || {}),
      ...updates,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(USER_RECORDS_KEY, JSON.stringify(records));
  } catch (err) {
    console.warn('LocalStorage write failed (quota exceeded?):', err.message);
  }
}

function getPendingMutations() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_MUTATIONS_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function queueMutation(mutation) {
  if (isStaticMode) return; // Static GitHub Pages mode does not use an API outbox
  try {
    const queue = getPendingMutations();
    queue.push({ ...mutation, timestamp: Date.now() });
    localStorage.setItem(PENDING_MUTATIONS_KEY, JSON.stringify(queue));
  } catch (e) {}
}

async function flushPendingMutations() {
  if (isStaticMode || isFlushingOutbox) return;
  const queue = getPendingMutations();
  if (!queue.length) return;

  isFlushingOutbox = true;
  const remaining = [];

  for (const item of queue) {
    try {
      let res = null;
      if (item.action === 'status') {
        res = await fetch('/api/jobs/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: item.id, status: item.status, notes: item.notes })
        });
      } else if (item.action === 'notes') {
        res = await fetch(`/api/jobs/${encodeURIComponent(item.id)}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: item.notes })
        });
      } else if (item.action === 'read') {
        res = await fetch(`/api/jobs/${encodeURIComponent(item.id)}/read`, { method: 'POST' });
      } else if (item.action === 'read-all') {
        res = await fetch('/api/jobs/read-all', { method: 'POST' });
      }

      if (!res || !res.ok) {
        remaining.push(item);
      }
    } catch (err) {
      remaining.push(item);
    }
  }

  try {
    localStorage.setItem(PENDING_MUTATIONS_KEY, JSON.stringify(remaining));
  } catch (e) {}
  isFlushingOutbox = false;
}

// ─── Multi-Tab Realtime Synchronization ──────────────────────
window.addEventListener('storage', (event) => {
  if (event.key === USER_RECORDS_KEY) {
    loadData();
  }
});

// ─── IndexedDB Offline Catalog Cache ─────────────────────────
const IDB_NAME = 'sdet_job_monitor_db';
const IDB_STORE = 'jobs_catalog';

function openJobsDB() {
  return new Promise((resolve) => {
    if (!window.indexedDB) return resolve(null);
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

async function cacheJobsInIDB(jobs) {
  try {
    const db = await openJobsDB();
    if (!db) return;
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.clear();
    jobs.forEach(j => store.put(j));
  } catch (e) {}
}

async function loadJobsFromIDB() {
  try {
    const db = await openJobsDB();
    if (!db) return [];
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}

// ─── Initialization ──────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  isStaticMode = window.location.hostname.endsWith('github.io') || window.location.protocol === 'file:';

  loadData();
  startAutoPolling();
});

function startAutoPolling() {
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
  const intervalMs = isStaticMode ? 3 * 60 * 1000 : 30 * 1000;
  autoRefreshInterval = setInterval(loadData, intervalMs);
}

// ─── Resilient Data Loading with Monotonic Generation ─────────

async function loadData() {
  const reqGen = ++currentRequestGen;
  if (activeAbortController) {
    activeAbortController.abort();
  }
  activeAbortController = new AbortController();
  const signal = activeAbortController.signal;

  try {
    let rawJobs = [];
    let lastScanTime = null;
    let scanCountVal = 1;

    if (!isStaticMode) {
      try {
        const [jobsRes, statsRes] = await Promise.all([
          fetch('/api/jobs', { signal }),
          fetch('/api/stats', { signal })
        ]);

        if (jobsRes.ok && reqGen === currentRequestGen) {
          const jobsData = await jobsRes.json();
          if (jobsData.success && Array.isArray(jobsData.jobs)) {
            rawJobs = jobsData.jobs;
            isServerOnline = true;
            flushPendingMutations();
          }
        }

        if (statsRes.ok && reqGen === currentRequestGen) {
          const statsData = await statsRes.json();
          updateKPIs(statsData);
          updateScanStatus(statsData);
        }
      } catch (e) {
        if (e.name === 'AbortError') return;
        isServerOnline = false;
      }
    }

    if (isStaticMode || !isServerOnline) {
      try {
        const cacheBuster = `?_t=${Math.floor(Date.now() / 60000)}`;
        const staticRes = await fetch(`./data/jobs.json${cacheBuster}`, { signal });
        if (staticRes.ok && reqGen === currentRequestGen) {
          const staticData = await staticRes.json();
          rawJobs = Array.isArray(staticData) ? staticData : (staticData.jobs || []);
          lastScanTime = staticData.lastScan;
          scanCountVal = staticData.scanCount;
          cacheJobsInIDB(rawJobs);
        }
      } catch (e) {
        if (e.name === 'AbortError') return;
        rawJobs = await loadJobsFromIDB();
      }
    }

    if (reqGen !== currentRequestGen) return;

    const userRecords = getUserRecords();
    allJobs = rawJobs.map(j => {
      const rec = userRecords[j.id] || {};
      return {
        ...j,
        applicationStatus: rec.status || j.applicationStatus || 'New',
        notes: rec.notes !== undefined ? rec.notes : (j.notes || ''),
        isRead: rec.isRead !== undefined ? rec.isRead : Boolean(j.isRead)
      };
    });

    if (isStaticMode || !isServerOnline) {
      computeAndSetStaticStats(lastScanTime, scanCountVal);
    }

    applyAllFilters();
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('Failed to load jobs data:', err);
    }
  }
}

function computeAndSetStaticStats(lastScan, scanCount) {
  const total = allJobs.length;
  const newJobs = allJobs.filter(j => j.isNew).length;
  const remoteJobs = allJobs.filter(j => j.workplaceType === 'Remote' || (j.location && j.location.toLowerCase().includes('remote'))).length;
  const pittsburghJobs = allJobs.filter(j => j.isPittsburgh).length;
  const top100Jobs = allJobs.filter(j => j.isTop100).length;
  const peerJobs = allJobs.filter(j => j.isPeerCompany).length;
  const appliedJobs = allJobs.filter(j => ['Applied', 'Interviewing', 'Offer'].includes(j.applicationStatus)).length;

  updateKPIs({
    totalJobs: total,
    newJobs,
    remoteJobs,
    pittsburghJobs,
    top100Jobs,
    peerJobs,
    appliedJobs,
    scanCount: scanCount || 1
  });

  const lastScanLabel = document.getElementById('lastScanLabel');
  const statusLabel = document.getElementById('scanStatusLabel');
  if (statusLabel) {
    statusLabel.textContent = isStaticMode ? 'GitHub Actions Active (Every 3h)' : 'Offline Local Cache';
  }
  if (lastScanLabel && lastScan) {
    lastScanLabel.textContent = `• Updated: ${formatTimeAgo(lastScan)}`;
  }
}

// ─── Update KPIs and Status ──────────────────────────────────

function updateKPIs(stats) {
  setAnimatedNumber('kpiTotal', stats.totalJobs || 0);
  setAnimatedNumber('kpiNew', stats.newJobs || 0);
  setAnimatedNumber('kpiRemote', stats.remoteJobs || 0);
  setAnimatedNumber('kpiPittsburgh', stats.pittsburghJobs || 0);
  setAnimatedNumber('kpiTop100', stats.top100Jobs || 0);
  setAnimatedNumber('kpiPeer', stats.peerJobs || 0);
  setAnimatedNumber('kpiApplied', stats.appliedJobs || 0);

  const scansEl = document.getElementById('kpiScansCount');
  if (scansEl) {
    scansEl.textContent = `${stats.scanCount || 1} scans completed`;
  }
}

function setAnimatedNumber(elementId, target) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const current = parseInt(el.textContent, 10) || 0;
  if (current === target) return;

  const duration = 300;
  const start = performance.now();

  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const value = Math.round(current + (target - current) * progress);
    el.textContent = value;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function updateScanStatus(stats) {
  const statusLabel = document.getElementById('scanStatusLabel');
  const dot = document.querySelector('.status-indicator-dot');
  const lastScanLabel = document.getElementById('lastScanLabel');
  const btnScan = document.getElementById('btnScanNow');

  if (stats.isScanning) {
    if (statusLabel) statusLabel.textContent = 'Scanning LinkedIn...';
    if (dot) dot.classList.add('scanning');
    if (btnScan) {
      btnScan.classList.add('scanning');
      document.getElementById('btnScanText').textContent = 'Scanning...';
    }
  } else {
    if (statusLabel) statusLabel.textContent = 'Auto-Scanning Active';
    if (dot) dot.classList.remove('scanning');
    if (btnScan) {
      btnScan.classList.remove('scanning');
      document.getElementById('btnScanText').textContent = 'Scan Now';
    }
  }

  if (lastScanLabel && stats.lastScan) {
    lastScanLabel.textContent = `• Last scan: ${formatTimeAgo(stats.lastScan)}`;
  }
}

// ─── Filter Logic ────────────────────────────────────────────

function selectCategory(cat, btn) {
  currentCategory = cat;
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  if (btn) btn.classList.add('active');
  applyAllFilters();
}

function toggleLocationFilter(type) {
  locationFilter = (locationFilter === type) ? 'all' : type;
  updateToggleButtons();
  applyAllFilters();
}

function toggleTop100Filter() {
  top100Only = !top100Only;
  updateToggleButtons();
  applyAllFilters();
}

function togglePeerFilter() {
  peerFilter = !peerFilter;
  updateToggleButtons();
  applyAllFilters();
}

function toggleAgTechFilter() {
  agTechOnly = !agTechOnly;
  if (agTechOnly) agriFinanceOnly = false;
  updateToggleButtons();
  applyAllFilters();
}

function toggleAgriFinanceFilter() {
  agriFinanceOnly = !agriFinanceOnly;
  if (agriFinanceOnly) agTechOnly = false;
  updateToggleButtons();
  applyAllFilters();
}

function toggleUnreadFilter() {
  unreadOnly = !unreadOnly;
  updateToggleButtons();
  applyAllFilters();
}

function updateToggleButtons() {
  const btnRemote = document.getElementById('toggleRemote');
  const btnPgh = document.getElementById('togglePittsburgh');
  const btnTop100 = document.getElementById('toggleTop100');
  const btnAgTech = document.getElementById('toggleAgTech');
  const btnAgriFinance = document.getElementById('toggleAgriFinance');
  const btnPeer = document.getElementById('togglePeer');
  const btnUnread = document.getElementById('toggleUnreadOnly');

  if (btnRemote) btnRemote.classList.toggle('active', locationFilter === 'remote');
  if (btnPgh) btnPgh.classList.toggle('active', locationFilter === 'pittsburgh');
  if (btnTop100) btnTop100.classList.toggle('active', top100Only);
  if (btnAgTech) btnAgTech.classList.toggle('active', agTechOnly);
  if (btnAgriFinance) btnAgriFinance.classList.toggle('active', agriFinanceOnly);
  if (btnPeer) btnPeer.classList.toggle('active', peerFilter);
  if (btnUnread) btnUnread.classList.toggle('active', unreadOnly);
}

function handleStatusFilterChange(val) {
  statusFilter = val;
  applyAllFilters();
}

function handleSearchInput(val) {
  searchQuery = val.trim().toLowerCase();
  const clearBtn = document.getElementById('btnClearSearch');
  if (clearBtn) clearBtn.style.display = searchQuery ? 'inline-block' : 'none';
  applyAllFilters();
}

function clearSearch() {
  const input = document.getElementById('searchInput');
  if (input) input.value = '';
  searchQuery = '';
  const clearBtn = document.getElementById('btnClearSearch');
  if (clearBtn) clearBtn.style.display = 'none';
  applyAllFilters();
}

function handleSortChange(val) {
  currentSort = val;
  applyAllFilters();
}

function quickFilter(type) {
  resetAllFilters(false);
  if (type === 'new') {
    filteredJobs = allJobs.filter(j => j.isNew);
  } else if (type === 'remote') {
    locationFilter = 'remote';
  } else if (type === 'pittsburgh') {
    locationFilter = 'pittsburgh';
  } else if (type === 'top100') {
    top100Only = true;
  } else if (type === 'peer') {
    peerFilter = true;
  } else if (type === 'agtech') {
    agTechOnly = true;
  } else if (type === 'agrifinance') {
    agriFinanceOnly = true;
  } else if (type === 'applied') {
    statusFilter = 'Applied';
  }
  updateToggleButtons();
  applyAllFilters();
}

function resetAllFilters(reapply = true) {
  currentCategory = 'all';
  locationFilter = 'all';
  top100Only = false;
  peerFilter = false;
  agTechOnly = false;
  agriFinanceOnly = false;
  unreadOnly = false;
  statusFilter = 'all';
  searchQuery = '';

  const input = document.getElementById('searchInput');
  if (input) input.value = '';
  const clearBtn = document.getElementById('btnClearSearch');
  if (clearBtn) clearBtn.style.display = 'none';

  const statusSel = document.getElementById('statusFilterSelect');
  if (statusSel) statusSel.value = 'all';

  document.querySelectorAll('.filter-pill').forEach((p, idx) => {
    p.classList.toggle('active', idx === 0);
  });

  updateToggleButtons();
  if (reapply) applyAllFilters();
}

function applyAllFilters() {
  filteredJobs = allJobs.filter(job => {
    if (currentCategory !== 'all') {
      const q = (job.searchQuery || '').toLowerCase();
      const t = (job.title || '').toLowerCase();
      const c = (job.company || '').toLowerCase();

      if (currentCategory === 'SDET' && !q.includes('sdet') && !t.includes('sdet')) return false;
      if (currentCategory === 'Automation' && !q.includes('automation') && !t.includes('automation')) return false;
      if (currentCategory === 'Quality Assurance' && !q.includes('quality assurance') && !t.includes('quality assurance') && !t.includes('qa') && !t.includes('quality analyst')) return false;
      if (currentCategory === 'Lead' && !q.includes('lead') && !t.includes('lead') && !t.includes('principal') && !t.includes('manager')) return false;
      if (currentCategory === 'AI' && !q.includes('ai') && !t.includes('ai') && !t.includes('genai')) return false;
      if (currentCategory === 'Validation' && !q.includes('validation') && !t.includes('validation')) return false;
      if (currentCategory === 'API' && !q.includes('api') && !t.includes('api')) return false;
      if (currentCategory === 'Life Sciences' && !job.isClarioPeer && !q.includes('sciences') && !q.includes('health') && !t.includes('validation') && !c.includes('clario')) return false;
      if (currentCategory === 'AgTech' && !job.isAgTech && !q.includes('agtech') && !t.includes('agtech') && !c.includes('nutrien')) return false;
      if (currentCategory === 'AgriFinance' && !job.isAgriFinance && !q.includes('finance') && !q.includes('commodity') && !t.includes('trading') && !t.includes('finance') && !c.includes('cargill')) return false;
    }

    if (locationFilter === 'remote') {
      const isRemote = job.workplaceType === 'Remote' || (job.location && job.location.toLowerCase().includes('remote'));
      if (!isRemote) return false;
    } else if (locationFilter === 'pittsburgh') {
      if (!job.isPittsburgh) return false;
    }

    if (top100Only && !job.isTop100) return false;
    if (peerFilter && !job.isPeerCompany) return false;
    if (agTechOnly && !job.isAgTech) return false;
    if (agriFinanceOnly && !job.isAgriFinance) return false;
    if (unreadOnly && job.isRead) return false;

    if (statusFilter !== 'all') {
      if ((job.applicationStatus || 'New') !== statusFilter) return false;
    }

    if (searchQuery) {
      const q = searchQuery;
      const titleMatch = (job.title || '').toLowerCase().includes(q);
      const companyMatch = (job.company || '').toLowerCase().includes(q);
      const locationMatch = (job.location || '').toLowerCase().includes(q);
      const skillMatch = (job.matchedSkills || []).some(s => s.toLowerCase().includes(q));
      const notesMatch = (job.notes || '').toLowerCase().includes(q);

      if (!titleMatch && !companyMatch && !locationMatch && !skillMatch && !notesMatch) {
        return false;
      }
    }

    return true;
  });

  if (currentSort === 'match') {
    filteredJobs.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  } else if (currentSort === 'company') {
    filteredJobs.sort((a, b) => (a.company || '').localeCompare(b.company || ''));
  } else {
    filteredJobs.sort((a, b) => new Date(b.firstSeen || 0) - new Date(a.firstSeen || 0));
  }

  renderJobsFeed();
}

// ─── Safe Rendering with Event Delegation ─────────────────────

function sanitizeSafeHttpsUrl(url) {
  if (!url || typeof url !== 'string') return '#';
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:') {
      const host = parsed.hostname.toLowerCase();
      if (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host.startsWith('10.') ||
        host.startsWith('192.168.') ||
        host.startsWith('172.16.')
      ) {
        return '#';
      }
      return parsed.href;
    }
  } catch (e) {}
  return '#';
}

function renderJobsFeed() {
  const feed = document.getElementById('jobsFeed');
  const empty = document.getElementById('emptyFeed');
  const loader = document.getElementById('feedLoader');
  const countText = document.getElementById('resultsCountText');

  if (loader) loader.style.display = 'none';

  if (countText) {
    countText.innerHTML = `Showing <strong>${filteredJobs.length}</strong> matching openings (from ${allJobs.length} total)`;
  }

  if (filteredJobs.length === 0) {
    feed.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';

  feed.innerHTML = filteredJobs.map(job => {
    const isNewClass = job.isNew ? 'is-new-card' : '';
    const isReadClass = job.isRead ? 'is-read-card' : '';
    const currentStatus = job.applicationStatus || 'New';

    let workplaceClass = 'remote';
    let workplaceLabel = '🌐 Remote';
    if (job.isPittsburgh) {
      workplaceClass = 'pittsburgh';
      workplaceLabel = '📍 Pittsburgh Area';
    } else if (job.workplaceType === 'Hybrid') {
      workplaceClass = 'hybrid';
      workplaceLabel = '🏢 Hybrid';
    }

    const skillsHtml = (job.matchedSkills || []).map(skill => 
      `<span class="skill-tag">${escapeHtml(skill)}</span>`
    ).join('');

    const notesHtml = job.notes ? `
      <div class="notes-preview">
        <strong>Notes:</strong> ${escapeHtml(job.notes)}
      </div>
    ` : '';

    const safeApplyUrl = sanitizeSafeHttpsUrl(job.companyApplyUrl);
    const safeLinkedInUrl = sanitizeSafeHttpsUrl(job.url);
    const safeId = escapeHtml(String(job.id || ''));

    const scoreDisplay = job.matchScore ? `⚡ ${job.matchScore}% Match` : 'Not Scored';
    const confidenceTag = job.scoreConfidence ? `(${job.scoreConfidence} conf)` : '';

    return `
      <article class="job-card ${isNewClass} ${isReadClass}" id="card-${safeId}" data-job-id="${safeId}">
        <div class="job-card-top">
          <div class="job-main-info">
            <div class="job-title-row">
              <h2 class="job-title">${escapeHtml(job.title)}</h2>
            </div>

            <div class="job-company-row">
              <span>🏢 ${escapeHtml(job.company || 'Unknown Company')}</span>
              <div class="job-badges">
                ${job.isTop100 ? `<span class="badge-top100">⭐ Top 100 Tech</span>` : ''}
                ${job.isPittsburgh ? `<span class="badge-pittsburgh">📍 Pittsburgh Local</span>` : ''}
                ${job.isClarioPeer ? `<span class="badge-clario" title="Peer of Clario (Life Sciences / Clinical Trials / HealthTech)">🏥 Clario Peer (Life Sciences)</span>` : ''}
                ${job.isAgriFinance ? `<span class="badge-agrifinance" title="Agri-Finance / Commodity Trading / Crop FinTech">🌾 Agri-Finance & Trading</span>` : (job.isAgTech ? `<span class="badge-agtech" title="Precision AgTech / Digital Agronomy">🌱 Precision AgTech</span>` : (job.isNutrienPeer ? `<span class="badge-nutrien" title="Nutrien Peer">🌱 Nutrien Peer</span>` : (job.isPeerCompany ? `<span class="badge-peer">🌿 Industry Peer</span>` : '')))}
              </div>
            </div>
          </div>

          <div class="match-score-badge" title="Calibrated 100-pt fit with Ankita's 11+ yrs SDET experience ${confidenceTag}">
            <span>${scoreDisplay}</span>
          </div>
        </div>

        <div class="job-metadata-line">
          <span class="workplace-pill ${workplaceClass}">${workplaceLabel}</span>
          <span class="job-meta-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            ${escapeHtml(job.location || 'United States')}
          </span>
          ${job.listDate ? `
            <span class="job-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${escapeHtml(job.listDate)}
            </span>
          ` : ''}
          <span class="job-meta-item">
            Found ${formatTimeAgo(job.firstSeen)}
          </span>
        </div>

        <div class="skills-cloud">
          ${skillsHtml}
        </div>

        ${notesHtml}

        <div class="job-card-actions">
          <div class="card-action-links">
            <a href="${safeApplyUrl}" target="_blank" rel="noopener noreferrer" class="btn-apply-company" data-action="apply">
              🚀 Apply on Company Site →
            </a>
            <a href="${safeLinkedInUrl}" target="_blank" rel="noopener noreferrer" class="btn-view-linkedin" data-action="linkedin">
              View on LinkedIn
            </a>
            <button class="btn-card-tool" data-action="pitch" title="Generate tailored intro pitch">
              📝 Pitch
            </button>
            <button class="btn-card-tool" data-action="notes" title="Add / edit notes for this job">
              💬 ${job.notes ? 'Edit Notes' : 'Notes'}
            </button>
          </div>

          <div class="card-status-tracker">
            <select class="status-dropdown status-${escapeHtml(currentStatus)}" data-action="status-select">
              ${STATUS_OPTIONS.map(s => `
                <option value="${s}" ${currentStatus === s ? 'selected' : ''}>${s === 'New' ? 'Status: New' : s}</option>
              `).join('')}
            </select>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// ─── Event Delegation for Feed Interactions ──────────────────

document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-action]');
  if (!target) return;

  const card = target.closest('.job-card');
  if (!card) return;
  const jobId = card.getAttribute('data-job-id');
  if (!jobId) return;

  const action = target.getAttribute('data-action');

  if (action === 'apply' || action === 'linkedin') {
    markJobAsRead(jobId);
  } else if (action === 'pitch') {
    openPitchModal(jobId);
  } else if (action === 'notes') {
    openNotesModal(jobId);
  }
});

document.addEventListener('change', (e) => {
  if (e.target && e.target.getAttribute('data-action') === 'status-select') {
    const card = e.target.closest('.job-card');
    if (!card) return;
    const jobId = card.getAttribute('data-job-id');
    if (jobId) {
      changeJobStatus(jobId, e.target.value);
    }
  }
});

// ─── Actions & Handlers ──────────────────────────────────────

async function triggerManualScan() {
  if (isStaticMode) {
    showToast('On GitHub Pages, new jobs refresh automatically every 3 hours via GitHub Actions!', 'info');
    return;
  }

  const btn = document.getElementById('btnScanNow');
  btn.classList.add('scanning');
  document.getElementById('btnScanText').textContent = 'Scanning...';

  try {
    const res = await fetch('/api/scan', { method: 'POST' });
    const data = await res.json();

    if (data.success) {
      showToast('LinkedIn scan initiated across Remote US & Pittsburgh tracks!', 'info');

      if (scanPollingInterval) clearInterval(scanPollingInterval);
      scanPollingInterval = setInterval(async () => {
        try {
          const sRes = await fetch('/api/stats');
          if (sRes.ok) {
            const stats = await sRes.json();
            updateKPIs(stats);
            updateScanStatus(stats);
            if (!stats.isScanning) {
              clearInterval(scanPollingInterval);
              scanPollingInterval = null;
              loadData();
              showToast('LinkedIn scan completed successfully!', 'success');
            }
          }
        } catch (e) {
          clearInterval(scanPollingInterval);
          scanPollingInterval = null;
        }
      }, 3000);
    } else {
      showToast(data.message || 'Scan already active', 'warning');
      btn.classList.remove('scanning');
      document.getElementById('btnScanText').textContent = 'Scan Now';
    }
  } catch (err) {
    showToast('Failed to trigger scan', 'error');
    btn.classList.remove('scanning');
    document.getElementById('btnScanText').textContent = 'Scan Now';
  }
}

async function markJobAsRead(jobId) {
  const job = allJobs.find(j => j.id === jobId);
  if (job) {
    job.isRead = true;
    job.isNew = false;
    const card = document.getElementById(`card-${jobId}`);
    if (card) {
      card.classList.remove('is-new-card');
      card.classList.add('is-read-card');
    }
  }

  saveUserRecord(jobId, { isRead: true });

  if (!isStaticMode) {
    if (isServerOnline) {
      try {
        const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/read`, { method: 'POST' });
        if (!res.ok) queueMutation({ action: 'read', id: jobId });
      } catch (e) {
        queueMutation({ action: 'read', id: jobId });
      }
    } else {
      queueMutation({ action: 'read', id: jobId });
    }
  }
}

async function markAllAsRead() {
  allJobs.forEach(j => {
    j.isRead = true;
    j.isNew = false;
    saveUserRecord(j.id, { isRead: true });
  });
  applyAllFilters();

  if (!isStaticMode) {
    if (isServerOnline) {
      try {
        const res = await fetch('/api/jobs/read-all', { method: 'POST' });
        if (!res.ok) queueMutation({ action: 'read-all' });
        loadData();
      } catch (e) {
        queueMutation({ action: 'read-all' });
      }
    } else {
      queueMutation({ action: 'read-all' });
    }
  }
  showToast('All job postings marked as read', 'success');
}

async function changeJobStatus(jobId, status) {
  const job = allJobs.find(j => j.id === jobId);
  if (job) {
    job.applicationStatus = status;
    job.isRead = true;
    job.isNew = false;
  }

  saveUserRecord(jobId, { status, isRead: true });

  if (isStaticMode) {
    computeAndSetStaticStats();
    applyAllFilters();
    showToast(`Updated status to "${status}"`, 'success');
    return;
  }

  if (!isServerOnline) {
    queueMutation({ action: 'status', id: jobId, status });
    showToast(`Status saved locally: "${status}"`, 'info');
    return;
  }

  try {
    const res = await fetch('/api/jobs/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: jobId, status })
    });
    if (res.ok) {
      applyAllFilters();
      showToast(`Updated status to "${status}"`, 'success');
    } else {
      queueMutation({ action: 'status', id: jobId, status });
      showToast(`Status queued locally: "${status}"`, 'info');
    }
  } catch (e) {
    queueMutation({ action: 'status', id: jobId, status });
    showToast(`Status saved locally: "${status}"`, 'info');
  }
}

// ─── Pitch Modal ─────────────────────────────────────────────

function generatePitchForJob(job) {
  return `Hi Hiring Team at ${job.company || 'the team'},\n\nI am writing to express my strong interest in the ${job.title} role. With over 11+ years of Quality Engineering & SDET experience, I specialize in designing scalable test automation frameworks (Playwright, WebdriverIO, Selenium, REST Assured, Appium) and integrating AI-assisted quality workflows (Amazon Bedrock, Agentic AI).\n\nKey Highlights of my experience:\n• Architected data-driven & BDD automation frameworks across Web, Mobile (iOS/Android), and REST/GraphQL APIs with parallel CI/CD execution.\n• Engineered AI-driven defect and testing workflows, driving significant time savings and 100% traceability across distributed agile teams.\n• Proven track record across enterprise platforms, financial systems, healthcare, and e-commerce.\n\nI am authorized to work in the US without sponsorship and would love to discuss how my skill set aligns with your engineering goals.\n\nBest regards,\nAnkita Agrawal\nPittsburgh, PA`;
}

async function openPitchModal(jobId) {
  const job = allJobs.find(j => j.id === jobId);
  if (!job) return;

  document.getElementById('pitchModalTitle').textContent = `Intro Pitch: ${job.title}`;
  document.getElementById('pitchModalSub').textContent = `Targeted for ${job.company || 'Hiring Team'} • Ankita Agrawal`;
  document.getElementById('pitchContent').value = generatePitchForJob(job);
  document.getElementById('pitchModal').style.display = 'flex';
}

function closePitchModal() {
  document.getElementById('pitchModal').style.display = 'none';
}

function copyPitchText() {
  const text = document.getElementById('pitchContent').value;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Pitch copied to clipboard! Ready to paste.', 'success');
    closePitchModal();
  }).catch(() => {
    showToast('Please select and copy manually', 'warning');
  });
}

// ─── Notes Modal ─────────────────────────────────────────────

function openNotesModal(jobId) {
  activeEditingJobId = jobId;
  const job = allJobs.find(j => j.id === jobId);
  if (!job) return;

  document.getElementById('notesModalTitle').textContent = `Notes: ${job.company}`;
  document.getElementById('notesModalSub').textContent = job.title;
  document.getElementById('notesContent').value = job.notes || '';
  document.getElementById('notesModal').style.display = 'flex';
}

function closeNotesModal() {
  document.getElementById('notesModal').style.display = 'none';
  activeEditingJobId = null;
}

async function saveJobNotes() {
  if (!activeEditingJobId) return;
  const notes = document.getElementById('notesContent').value.trim();
  const job = allJobs.find(j => j.id === activeEditingJobId);
  if (job) job.notes = notes;

  saveUserRecord(activeEditingJobId, { notes });

  if (isStaticMode) {
    closeNotesModal();
    applyAllFilters();
    showToast('Notes saved successfully!', 'success');
    return;
  }

  if (!isServerOnline) {
    queueMutation({ action: 'notes', id: activeEditingJobId, notes });
    closeNotesModal();
    applyAllFilters();
    showToast('Notes saved locally (will sync when online)', 'info');
    return;
  }

  try {
    const res = await fetch(`/api/jobs/${encodeURIComponent(activeEditingJobId)}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes })
    });
    if (res.ok) {
      closeNotesModal();
      applyAllFilters();
      showToast('Notes saved successfully!', 'success');
    } else {
      queueMutation({ action: 'notes', id: activeEditingJobId, notes });
      closeNotesModal();
      applyAllFilters();
      showToast('Notes saved locally (will sync when online)', 'info');
    }
  } catch (e) {
    queueMutation({ action: 'notes', id: activeEditingJobId, notes });
    closeNotesModal();
    applyAllFilters();
    showToast('Notes saved locally (will sync when online)', 'info');
  }
}

// ─── CSV Export with Formula Injection Guard ─────────────────

function sanitizeCsvCell(str) {
  if (!str) return '""';
  let val = String(str);
  if (/^[=+\-@\t\r]/.test(val)) {
    val = "'" + val;
  }
  return `"${val.replace(/"/g, '""')}"`;
}

function exportToCSV() {
  if (filteredJobs.length === 0) {
    showToast('No jobs to export', 'warning');
    return;
  }

  const headers = ['Title', 'Company', 'Location', 'WorkplaceType', 'MatchScore', 'ATSProvider', 'Status', 'DatePosted', 'ApplyURL', 'LinkedInURL', 'Notes'];
  const rows = filteredJobs.map(j => [
    sanitizeCsvCell(j.title),
    sanitizeCsvCell(j.company),
    sanitizeCsvCell(j.location),
    sanitizeCsvCell(j.workplaceType || 'Remote'),
    sanitizeCsvCell(j.matchScore ? `${j.matchScore}%` : 'Not Scored'),
    sanitizeCsvCell(j.atsProvider || 'Direct'),
    sanitizeCsvCell(j.applicationStatus || 'New'),
    sanitizeCsvCell(j.listDate || ''),
    sanitizeCsvCell(j.companyApplyUrl || ''),
    sanitizeCsvCell(j.url || ''),
    sanitizeCsvCell(j.notes || '')
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Ankita_SDET_Jobs_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Exported filtered jobs to CSV!', 'success');
}

// ─── Toast & Helpers ─────────────────────────────────────────

function showToast(message, type = 'info') {
  const stack = document.getElementById('toastStack');
  const item = document.createElement('div');
  item.className = 'toast-item';
  item.textContent = message;
  stack.appendChild(item);

  setTimeout(() => {
    item.style.opacity = '0';
    item.style.transform = 'translateX(100%)';
    item.style.transition = 'all 0.25s ease';
    setTimeout(() => { if (item.parentNode) item.remove(); }, 250);
  }, 4000);
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return 'Just now';
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
