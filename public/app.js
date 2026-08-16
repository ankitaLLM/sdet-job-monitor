/* ══════════════════════════════════════════════════════════════
   Ankita Agrawal — Senior SDET & QA Job Monitor Frontend App
   Supports both Full Node Server & GitHub Pages Static Hosting
   ══════════════════════════════════════════════════════════════ */

let allJobs = [];
let filteredJobs = [];
let isStaticMode = false;

// Filter state
let currentCategory = 'all';
let locationFilter = 'all'; // 'all', 'remote', 'pittsburgh'
let top100Only = false;
let unreadOnly = false;
let statusFilter = 'all';
let searchQuery = '';
let currentSort = 'newest';

let activeEditingJobId = null;
let autoRefreshInterval = null;

const STATUS_OPTIONS = ['New', 'Viewed', 'Applied', 'Interviewing', 'Offer', 'Rejected'];

// Local storage keys for GitHub Pages static mode
const STORAGE_STATUSES_KEY = 'ankita_sdet_job_statuses';
const STORAGE_NOTES_KEY = 'ankita_sdet_job_notes';
const STORAGE_READ_KEY = 'ankita_sdet_job_read';

function getLocalStatuses() {
  try { return JSON.parse(localStorage.getItem(STORAGE_STATUSES_KEY) || '{}'); } catch(e) { return {}; }
}
function saveLocalStatus(id, status) {
  const data = getLocalStatuses();
  data[id] = status;
  localStorage.setItem(STORAGE_STATUSES_KEY, JSON.stringify(data));
}

function getLocalNotes() {
  try { return JSON.parse(localStorage.getItem(STORAGE_NOTES_KEY) || '{}'); } catch(e) { return {}; }
}
function saveLocalNote(id, note) {
  const data = getLocalNotes();
  data[id] = note;
  localStorage.setItem(STORAGE_NOTES_KEY, JSON.stringify(data));
}

function getLocalRead() {
  try { return JSON.parse(localStorage.getItem(STORAGE_READ_KEY) || '{}'); } catch(e) { return {}; }
}
function markLocalRead(id) {
  const data = getLocalRead();
  data[id] = true;
  localStorage.setItem(STORAGE_READ_KEY, JSON.stringify(data));
}

// ─── Initialization ──────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  startAutoPolling();
});

function startAutoPolling() {
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
  autoRefreshInterval = setInterval(loadData, 30000);
}

// ─── Data Loading ────────────────────────────────────────────

async function loadData() {
  try {
    // Try Node.js API first
    let jobsLoaded = false;
    try {
      const jobsRes = await fetch('/api/jobs');
      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        if (jobsData.success && Array.isArray(jobsData.jobs)) {
          allJobs = jobsData.jobs;
          isStaticMode = false;
          jobsLoaded = true;

          const statsRes = await fetch('/api/stats');
          if (statsRes.ok) {
            const statsData = await statsRes.json();
            updateKPIs(statsData);
            updateScanStatus(statsData);
          }
        }
      }
    } catch (e) {
      // API not available, switch to static mode
    }

    // Static mode fallback (GitHub Pages)
    if (!jobsLoaded) {
      isStaticMode = true;
      const staticRes = await fetch('./data/jobs.json');
      if (staticRes.ok) {
        const staticData = await staticRes.json();
        let rawJobs = Array.isArray(staticData) ? staticData : (staticData.jobs || []);

        // Overlay localStorage data
        const localStatuses = getLocalStatuses();
        const localNotes = getLocalNotes();
        const localReads = getLocalRead();

        allJobs = rawJobs.map(j => ({
          ...j,
          applicationStatus: localStatuses[j.id] || j.applicationStatus || 'New',
          notes: localNotes[j.id] !== undefined ? localNotes[j.id] : (j.notes || ''),
          isRead: localReads[j.id] || j.isRead || false
        }));

        computeAndSetStaticStats(staticData.lastScan, staticData.scanCount);
      }
    }

    applyAllFilters();
  } catch (err) {
    console.error('Failed to load jobs data:', err);
  }
}

function computeAndSetStaticStats(lastScan, scanCount) {
  const total = allJobs.length;
  const newJobs = allJobs.filter(j => j.isNew).length;
  const remoteJobs = allJobs.filter(j => j.workplaceType === 'Remote' || (j.location && j.location.toLowerCase().includes('remote'))).length;
  const pittsburghJobs = allJobs.filter(j => j.isPittsburgh).length;
  const top100Jobs = allJobs.filter(j => j.isTop100).length;
  const appliedJobs = allJobs.filter(j => ['Applied', 'Interviewing', 'Offer'].includes(j.applicationStatus)).length;

  updateKPIs({
    totalJobs: total,
    newJobs,
    remoteJobs,
    pittsburghJobs,
    top100Jobs,
    appliedJobs,
    scanCount: scanCount || 1
  });

  const lastScanLabel = document.getElementById('lastScanLabel');
  const statusLabel = document.getElementById('scanStatusLabel');
  if (statusLabel) statusLabel.textContent = 'GitHub Actions Active (Every 3h)';
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

  const duration = 350;
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

function toggleUnreadFilter() {
  unreadOnly = !unreadOnly;
  updateToggleButtons();
  applyAllFilters();
}

function updateToggleButtons() {
  const btnRemote = document.getElementById('toggleRemote');
  const btnPgh = document.getElementById('togglePittsburgh');
  const btnTop100 = document.getElementById('toggleTop100');
  const btnUnread = document.getElementById('toggleUnreadOnly');

  if (btnRemote) btnRemote.classList.toggle('active', locationFilter === 'remote');
  if (btnPgh) btnPgh.classList.toggle('active', locationFilter === 'pittsburgh');
  if (btnTop100) btnTop100.classList.toggle('active', top100Only);
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
    // 1. Category filter
    if (currentCategory !== 'all') {
      const q = (job.searchQuery || '').toLowerCase();
      const t = (job.title || '').toLowerCase();
      if (currentCategory === 'SDET' && !q.includes('sdet') && !t.includes('sdet')) return false;
      if (currentCategory === 'Automation' && !q.includes('automation') && !t.includes('automation')) return false;
      if (currentCategory === 'Quality Assurance' && !q.includes('quality assurance') && !t.includes('quality assurance') && !t.includes('qa') && !t.includes('quality analyst')) return false;
      if (currentCategory === 'Lead' && !q.includes('lead') && !t.includes('lead') && !t.includes('principal') && !t.includes('manager')) return false;
      if (currentCategory === 'AI' && !q.includes('ai') && !t.includes('ai') && !t.includes('genai')) return false;
      if (currentCategory === 'Validation' && !q.includes('validation') && !t.includes('validation')) return false;
      if (currentCategory === 'API' && !q.includes('api') && !t.includes('api')) return false;
    }

    // 2. Location filter
    if (locationFilter === 'remote') {
      const isRemote = job.workplaceType === 'Remote' || (job.location && job.location.toLowerCase().includes('remote'));
      if (!isRemote) return false;
    } else if (locationFilter === 'pittsburgh') {
      if (!job.isPittsburgh) return false;
    }

    // 3. Top 100 filter
    if (top100Only && !job.isTop100) return false;

    // 4. Unread filter
    if (unreadOnly && job.isRead) return false;

    // 5. Status filter
    if (statusFilter !== 'all') {
      if ((job.applicationStatus || 'New') !== statusFilter) return false;
    }

    // 6. Search query
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

  // Sort
  if (currentSort === 'match') {
    filteredJobs.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  } else if (currentSort === 'company') {
    filteredJobs.sort((a, b) => (a.company || '').localeCompare(b.company || ''));
  } else {
    // Newest first
    filteredJobs.sort((a, b) => new Date(b.firstSeen || 0) - new Date(a.firstSeen || 0));
  }

  renderJobsFeed();
}

// ─── Rendering ───────────────────────────────────────────────

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

    return `
      <article class="job-card ${isNewClass} ${isReadClass}" id="card-${job.id}">
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
              </div>
            </div>
          </div>

          <div class="match-score-badge" title="Calculated fit with Ankita's 11+ yrs SDET experience">
            <span>⚡ ${job.matchScore || 85}% Match</span>
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
            <a href="${job.companyApplyUrl}" target="_blank" rel="noopener noreferrer" class="btn-apply-company" onclick="markJobAsRead('${job.id}')">
              🚀 Apply on Company Site →
            </a>
            <a href="${job.url}" target="_blank" rel="noopener noreferrer" class="btn-view-linkedin" onclick="markJobAsRead('${job.id}')">
              View on LinkedIn
            </a>
            <button class="btn-card-tool" onclick="openPitchModal('${job.id}')" title="Generate tailored intro pitch">
              📝 Pitch
            </button>
            <button class="btn-card-tool" onclick="openNotesModal('${job.id}')" title="Add / edit notes for this job">
              💬 ${job.notes ? 'Edit Notes' : 'Notes'}
            </button>
          </div>

          <div class="card-status-tracker">
            <select class="status-dropdown status-${currentStatus}" onchange="changeJobStatus('${job.id}', this.value)">
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
      setTimeout(loadData, 6000);
      setTimeout(loadData, 18000);
      setTimeout(loadData, 35000);
    } else {
      showToast(data.message || 'Scan already active', 'warning');
    }
  } catch (err) {
    showToast('Failed to trigger scan', 'error');
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

  if (isStaticMode) {
    markLocalRead(jobId);
    return;
  }

  try {
    await fetch(`/api/jobs/${jobId}/read`, { method: 'POST' });
  } catch (e) {
    console.error('Failed to mark read:', e);
  }
}

async function markAllAsRead() {
  allJobs.forEach(j => {
    j.isRead = true;
    j.isNew = false;
    if (isStaticMode) markLocalRead(j.id);
  });
  applyAllFilters();

  if (!isStaticMode) {
    try {
      await fetch('/api/jobs/read-all', { method: 'POST' });
      loadData();
    } catch (e) {}
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

  if (isStaticMode) {
    saveLocalStatus(jobId, status);
    markLocalRead(jobId);
    computeAndSetStaticStats();
    applyAllFilters();
    showToast(`Updated status to "${status}"`, 'success');
    return;
  }

  try {
    const res = await fetch('/api/jobs/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: jobId, status })
    });
    const data = await res.json();
    if (data.success) {
      applyAllFilters();
      showToast(`Updated status to "${status}"`, 'success');
    }
  } catch (e) {
    showToast('Failed to update status', 'error');
  }
}

// ─── Pitch Modal ─────────────────────────────────────────────

function generatePitchForJob(job) {
  return `Hi Hiring Team at ${job.company || 'the team'},\n\nI am writing to express my strong interest in the ${job.title} role. With over 11+ years of Quality Engineering & SDET experience, I specialize in designing scalable test automation frameworks (Playwright, WebdriverIO, Selenium, REST Assured, Appium) and integrating AI-assisted quality workflows (Amazon Bedrock, Agentic AI).\n\nKey Highlights of my experience:\n• Architected data-driven & BDD automation frameworks across Web, Mobile (iOS/Android), and REST/GraphQL APIs with parallel CI/CD execution.\n• Engineered AI-driven defect and testing workflows, driving significant time savings and 100% traceability across distributed agile teams.\n• Proven track record across enterprise platforms, financial systems, healthcare, and e-commerce.\n\nI am authorized to work in the US without sponsorship and would love to discuss how my skill set aligns with your engineering goals.\n\nBest regards,\nAnkita Agrawal\nPittsburgh, PA | ankita.vinculum@gmail.com | +1-716-400-6921`;
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

  if (isStaticMode) {
    saveLocalNote(activeEditingJobId, notes);
    closeNotesModal();
    applyAllFilters();
    showToast('Notes saved successfully!', 'success');
    return;
  }

  try {
    const res = await fetch(`/api/jobs/${activeEditingJobId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes })
    });
    const data = await res.json();
    if (data.success) {
      closeNotesModal();
      applyAllFilters();
      showToast('Notes saved successfully!', 'success');
    }
  } catch (e) {
    showToast('Failed to save notes', 'error');
  }
}

// ─── CSV Export ──────────────────────────────────────────────

function exportToCSV() {
  if (filteredJobs.length === 0) {
    showToast('No jobs to export', 'warning');
    return;
  }

  const headers = ['Title', 'Company', 'Location', 'WorkplaceType', 'MatchScore', 'Status', 'DatePosted', 'ApplyURL', 'LinkedInURL', 'Notes'];
  const rows = filteredJobs.map(j => [
    `"${(j.title || '').replace(/"/g, '""')}"`,
    `"${(j.company || '').replace(/"/g, '""')}"`,
    `"${(j.location || '').replace(/"/g, '""')}"`,
    `"${j.workplaceType || 'Remote'}"`,
    `${j.matchScore || 85}%`,
    `"${j.applicationStatus || 'New'}"`,
    `"${j.listDate || ''}"`,
    `"${j.companyApplyUrl || ''}"`,
    `"${j.url || ''}"`,
    `"${(j.notes || '').replace(/"/g, '""')}"`
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
