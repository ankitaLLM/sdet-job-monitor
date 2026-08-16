const cheerio = require('cheerio');
const config = require('./config');

/**
 * Coherent Browser Header Profiles
 */
const BROWSER_PROFILES = [
  {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    secChUa: '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    secChUaPlatform: '"Windows"',
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    acceptLanguage: 'en-US,en;q=0.9',
  },
  {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    secChUa: '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    secChUaPlatform: '"macOS"',
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    acceptLanguage: 'en-US,en;q=0.9',
  },
  {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
    secChUa: null,
    secChUaPlatform: null,
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    acceptLanguage: 'en-US,en;q=0.5',
  }
];

let sessionProfile = BROWSER_PROFILES[0];

function rotateSessionProfile() {
  sessionProfile = BROWSER_PROFILES[Math.floor(Math.random() * BROWSER_PROFILES.length)];
  return sessionProfile;
}

/**
 * Strict Inclusion and Exclusion rules for QA / SDET / Test Engineer / Validation jobs
 */
function isRelevantQATitle(title) {
  if (!title) return false;
  const t = title.toLowerCase();

  // 1. Strict Exclusions (hardware, physical/civil/aerospace engineering, technicians, non-tech trades)
  const excludePatterns = [
    /\b(hardware|spacecraft|aerospace|satellite|mechanical|civil|structural|electrical|electrician|electric)\b/i,
    /\b(manufacturing|assembly|welder|machinist|hvac|plumbing|plant\s*engineer|civil\s*engineer)\b/i,
    /\b(technician|lab\s*tech|field\s*service|quality\s*technician|test\s*technician|maintenance\s*tech)\b/i,
    /\b(sales|account\s*exec|marketing|nurse|medical\s*assistant|warehouse|driver|driverless\s*operator)\b/i,
    /\b(construction|safety\s*coordinator|environmental|chemical|biotech\s*lab)\b/i
  ];

  for (const pattern of excludePatterns) {
    if (pattern.test(t)) return false;
  }

  // 2. Strict Inclusions (Must explicitly be a Software QA, SDET, Test Engineer, Validation Engineer, or QE role)
  const includePatterns = [
    /\bsdet\b/i,
    /\bsoftware\s*(development\s*)?engineer\s*in\s*test\b/i,
    /\b(qa|quality\s*assurance)\b/i,
    /\bquality\s*(engineering|engineer|analyst|lead|manager|architect|specialist|consultant)\b/i,
    /\b(test|testing)\s*(engineer|automation|lead|analyst|architect|specialist|consultant|manager)\b/i,
    /\b(software\s*test|automation\s*test|api\s*test|mobile\s*test)\b/i,
    /\bautomation\s*(engineer|tester|architect|lead|specialist)\b/i,
    /\b(software\s*validation|system(s)?\s*validation|csv\s*engineer|validation\s*engineer|validation\s*lead|validation\s*specialist)\b/i,
    /\bapi\s*(automation|tester|testing|test)\b/i,
    /\b(ai\s*test|genai\s*qa|ai\s*quality|model\s*evaluat)\b/i,
    /\bqe\s*(lead|engineer|analyst|specialist|architect)\b/i
  ];

  return includePatterns.some(pattern => pattern.test(t));
}

/**
 * Sleep with optional jitter
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function sleepWithJitter(baseMs, jitterRatio = 0.3) {
  const variation = baseMs * jitterRatio;
  const actualMs = Math.round(baseMs - variation + Math.random() * (variation * 2));
  return sleep(actualMs);
}

/**
 * Parse HTTP-Date or integer seconds from Retry-After header
 */
function parseRetryAfter(headerValue) {
  if (!headerValue) return null;
  const seconds = parseInt(headerValue, 10);
  if (!isNaN(seconds) && seconds > 0) {
    return Math.min(seconds * 1000, 30000);
  }
  const dateMs = Date.parse(headerValue);
  if (!isNaN(dateMs)) {
    const diff = dateMs - Date.now();
    if (diff > 0) return Math.min(diff, 30000);
  }
  return null;
}

/**
 * Build LinkedIn job search URL with focused keywords and geoId support
 */
function buildSearchUrl(keywords, location, geoId = '', workplaceType = '', start = 0) {
  const params = new URLSearchParams({
    keywords: keywords,
    location: location,
    start: start.toString(),
    f_TPR: 'r86400', // Past 24 hours
    sortBy: 'DD',    // Most recent
  });

  if (geoId) {
    params.append('geoId', geoId);
  }

  if (workplaceType) {
    params.append('f_WT', workplaceType);
  }

  return `${config.linkedinBaseUrl}?${params.toString()}`;
}

/**
 * Parse job listings from LinkedIn HTML response with deduplication
 * Returns { jobs, rawCardCount, diagnostics }
 */
function parseJobListings(html, searchQuery, locationLabel) {
  const $ = cheerio.load(html);
  const jobs = [];
  const seenIds = new Set();
  let rawCardCount = 0;
  const diagnostics = { malformedCards: 0, nonQACards: 0, duplicateCards: 0 };

  // Check for LinkedIn checkpoint / authwall block markers
  const htmlSnippet = html.slice(0, 2000).toLowerCase();
  if (htmlSnippet.includes('authwall') || htmlSnippet.includes('challenge') || htmlSnippet.includes('security verification')) {
    throw new Error('LinkedIn authwall or security challenge detected');
  }

  // Single explicit root selector to avoid nested duplicate matching
  let cards = $('ul.jobs-search__results-list > li, .jobs-search__results-list > li');
  if (cards.length === 0) {
    cards = $('.base-card.job-search-card');
  }

  rawCardCount = cards.length;

  cards.each((_, element) => {
    try {
      const $card = $(element);

      const title = (
        $card.find('.base-search-card__title').text().trim() ||
        $card.find('h3').text().trim()
      );

      if (!title) {
        diagnostics.malformedCards++;
        return;
      }

      // Filter by QA/SDET relevance
      if (!isRelevantQATitle(title)) {
        diagnostics.nonQACards++;
        return;
      }

      const company = (
        $card.find('.base-search-card__subtitle a').text().trim() ||
        $card.find('h4 a').text().trim() ||
        $card.find('.base-search-card__subtitle').text().trim() ||
        $card.find('h4').text().trim()
      );

      const location = (
        $card.find('.job-search-card__location').text().trim() ||
        $card.find('.base-search-card__metadata span').text().trim() ||
        ''
      );

      const datePosted = (
        $card.find('time').attr('datetime') ||
        ''
      );

      const listDate = (
        $card.find('time').text().trim() ||
        ''
      );

      // Extract explicit job ID from data-entity-urn if available
      let jobId = '';
      const urn = $card.find('.base-card').attr('data-entity-urn') || $card.attr('data-entity-urn') || '';
      if (urn) {
        const urnMatch = urn.match(/jobPosting:(\d+)/);
        if (urnMatch) jobId = urnMatch[1];
      }

      // Extract job URL
      let jobUrl = (
        $card.find('a.base-card__full-link').attr('href') ||
        $card.find('a').first().attr('href') ||
        ''
      );

      if (jobUrl) {
        jobUrl = jobUrl.split('?')[0].trim();
        if (!jobId) {
          const idMatch = jobUrl.match(/(\d{8,})/);
          if (idMatch) jobId = idMatch[1];
        }
      }

      if (title && (company || jobUrl)) {
        const safeId = jobId || `${title}-${company}-${location}`.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

        // In-page deduplication
        if (seenIds.has(safeId)) {
          diagnostics.duplicateCards++;
          return;
        }
        seenIds.add(safeId);

        jobs.push({
          id: safeId,
          title,
          company,
          location: location || locationLabel,
          datePosted,
          listDate,
          url: jobUrl,
          searchQuery,
          locationQuery: locationLabel,
          firstSeen: new Date().toISOString(),
          isNew: true,
          isRead: false,
        });
      }
    } catch (err) {
      diagnostics.malformedCards++;
    }
  });

  return { jobs, rawCardCount, diagnostics };
}

/**
 * Fetch with full jitter exponential backoff and fresh abort timeouts
 */
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const signal = AbortSignal.timeout(12000);
      const response = await fetch(url, { ...options, signal });

      if ([408, 425, 429, 500, 502, 503, 504].includes(response.status)) {
        attempt++;
        if (attempt > maxRetries) {
          const err = new Error(`HTTP ${response.status} after ${maxRetries} retries`);
          err.status = response.status;
          throw err;
        }

        const retryAfter = parseRetryAfter(response.headers.get('retry-after'));
        let delayMs = retryAfter || (2500 * Math.pow(2, attempt) + Math.random() * 1000);
        delayMs = Math.min(delayMs, 30000);

        console.warn(`  ⚠️ HTTP ${response.status}. Retrying in ${(delayMs/1000).toFixed(1)}s (attempt ${attempt}/${maxRetries})...`);
        await sleep(delayMs);
        continue;
      }

      return response;
    } catch (err) {
      attempt++;
      if (attempt > maxRetries) throw err;
      const delayMs = Math.min(2000 * Math.pow(2, attempt) + Math.random() * 1000, 20000);
      console.warn(`  ⚠️ Network error: ${err.message}. Retrying in ${(delayMs/1000).toFixed(1)}s...`);
      await sleep(delayMs);
    }
  }
}

/**
 * Fetch job description snippet and extract external apply URL from LinkedIn detail endpoint
 * Returns { description, rawApplyUrl }
 */
async function fetchJobDescription(jobId, jobUrl) {
  if (!jobId || !/^\d+$/.test(jobId)) return { description: '', rawApplyUrl: '' };
  const detailUrl = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`;

  try {
    const profile = sessionProfile;
    const response = await fetch(detailUrl, {
      signal: AbortSignal.timeout(6000),
      headers: {
        'User-Agent': profile.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': profile.acceptLanguage
      }
    });

    if (!response.ok) return { description: '', rawApplyUrl: '' };
    const html = await response.text();
    const $ = cheerio.load(html);

    const descText = (
      $('.show-more-less-html__markup').text().trim() ||
      $('.description__text').text().trim() ||
      $('.decoratedJobPosting__description').text().trim() ||
      ''
    );

    // Extract external apply URL if present
    let rawApplyUrl = '';
    const applyAnchor = $(
      'a.apply-button, a[data-tracking-control-name*="apply"], a.sign-up-modal__link, a[href*="myworkdayjobs.com"], a[href*="greenhouse.io"], a[href*="lever.co"], a[href*="smartrecruiters.com"], a[href*="ashbyhq.com"], a[href*="icims.com"]'
    ).first();

    if (applyAnchor.length > 0) {
      const href = applyAnchor.attr('href');
      if (href && href.startsWith('https://')) {
        rawApplyUrl = href.split('?')[0];
      }
    }

    return {
      description: descText.slice(0, 3000),
      rawApplyUrl
    };
  } catch (e) {
    return { description: '', rawApplyUrl: '' };
  }
}

/**
 * Fetch jobs for a single search query and location track
 */
async function fetchJobsForQuery(query, locationQuery, geoId, workplaceType, locationLabel) {
  const allJobs = [];
  const profile = sessionProfile;
  let queryStatus = 'healthy';
  let totalRawCards = 0;
  const aggregateDiagnostics = { malformedCards: 0, nonQACards: 0, duplicateCards: 0 };
  let descriptionAttempts = 0;
  let descriptionSuccesses = 0;
  let exactAtsCount = 0;

  const headers = {
    'User-Agent': profile.userAgent,
    'Accept': profile.accept,
    'Accept-Language': profile.acceptLanguage,
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
  };

  if (profile.secChUa) headers['Sec-Ch-Ua'] = profile.secChUa;
  if (profile.secChUaPlatform) headers['Sec-Ch-Ua-Platform'] = profile.secChUaPlatform;

  for (let page = 0; page < config.maxPagesPerQuery; page++) {
    const start = page * 25;
    const url = buildSearchUrl(query, locationQuery, geoId, workplaceType, start);

    try {
      const response = await fetchWithRetry(url, { headers });

      if (!response || !response.ok) {
        queryStatus = response && response.status === 429 ? 'throttled' : 'failed';
        break;
      }

      const html = await response.text();
      if (!html || html.trim().length < 100) {
        if (page === 0) queryStatus = 'empty';
        break;
      }

      const { jobs, rawCardCount, diagnostics } = parseJobListings(html, query, locationLabel);
      totalRawCards += rawCardCount;
      aggregateDiagnostics.malformedCards += diagnostics.malformedCards;
      aggregateDiagnostics.nonQACards += diagnostics.nonQACards;
      aggregateDiagnostics.duplicateCards += diagnostics.duplicateCards;

      if (rawCardCount === 0 && html.length > 300) {
        queryStatus = 'drift_or_empty';
      }

      allJobs.push(...jobs);

      if (rawCardCount < 8) {
        break;
      }

      if (page < config.maxPagesPerQuery - 1) {
        await sleepWithJitter(config.requestDelay, 0.25);
      }
    } catch (err) {
      if (err.message.includes('authwall') || err.message.includes('challenge')) {
        queryStatus = 'blocked';
      } else if (err.status === 429 || err.message.includes('429')) {
        queryStatus = 'throttled';
      } else {
        queryStatus = 'failed';
      }
      break;
    }
  }

  // Enrich listings with description snippet and external apply link
  for (let i = 0; i < Math.min(allJobs.length, 5); i++) {
    const job = allJobs[i];
    if (job.id && /^\d+$/.test(job.id)) {
      descriptionAttempts++;
      const { description, rawApplyUrl } = await fetchJobDescription(job.id, job.url);
      if (description) {
        job.description = description;
        descriptionSuccesses++;
      }
      if (rawApplyUrl) {
        job.rawApplyUrl = rawApplyUrl;
        exactAtsCount++;
      }
      await sleep(200);
    }
  }

  return {
    jobs: allJobs,
    rawCardCount: totalRawCards,
    status: queryStatus,
    diagnostics: aggregateDiagnostics,
    metrics: {
      descriptionAttempts,
      descriptionSuccesses,
      exactAtsCount
    }
  };
}

/**
 * Run a full dual-track scan across Remote US and Pittsburgh Local with health metrics
 */
async function runFullScan() {
  rotateSessionProfile();
  console.log('🔍 Starting resilient LinkedIn SDET & QA scan for Ankita Agrawal...');
  console.log(`   Job titles: ${config.jobTitles.join(', ')}`);

  const allJobs = [];
  const tracks = [
    { label: '🌐 Remote (US)', location: 'United States', geoId: '103644278', wt: '2' },
    { label: '📍 Pittsburgh Area', location: 'Pittsburgh, Pennsylvania, United States', geoId: '106093475', wt: '' }
  ];

  let consecutiveErrors = 0;
  let totalErrors = 0;
  let totalDescAttempts = 0;
  let totalDescSuccesses = 0;
  let totalExactAts = 0;
  const MAX_CONSECUTIVE_ERRORS = 3;
  let step = 1;
  const totalSteps = config.jobTitles.length * tracks.length;
  let scanHealth = 'healthy';

  for (const track of tracks) {
    console.log(`\n📌 Scanning Track: ${track.label}`);

    for (let i = 0; i < config.jobTitles.length; i++) {
      const query = config.jobTitles[i];
      console.log(`   [${step}/${totalSteps}] Searching: "${query}" in ${track.label}`);

      const result = await fetchJobsForQuery(query, track.location, track.geoId, track.wt, track.label);

      if (result.metrics) {
        totalDescAttempts += result.metrics.descriptionAttempts;
        totalDescSuccesses += result.metrics.descriptionSuccesses;
        totalExactAts += result.metrics.exactAtsCount;
      }

      if (result.status === 'throttled' || result.status === 'blocked' || result.status === 'failed') {
        consecutiveErrors++;
        totalErrors++;
        console.warn(`     ⚠️ Query returned status "${result.status}"`);

        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          console.warn(`  ⚠️ Circuit breaker tripped after ${consecutiveErrors} consecutive errors. Halting scan to safeguard IP.`);
          scanHealth = 'degraded';
          break;
        }
      } else {
        consecutiveErrors = 0;
        allJobs.push(...result.jobs);
        console.log(`     Found ${result.jobs.length} validated SDET/QA listings`);
      }

      step++;
      await sleepWithJitter(config.requestDelay, 0.3);
    }

    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      break;
    }
  }

  // CORRECTED HEALTH CLASSIFICATION: failed takes priority if zero jobs returned with errors
  if (allJobs.length === 0 && totalErrors > 0) {
    scanHealth = 'failed';
  } else if (totalErrors > 0 || scanHealth === 'degraded') {
    scanHealth = 'degraded';
  } else {
    scanHealth = 'healthy';
  }

  const descSuccessRate = totalDescAttempts > 0 ? `${Math.round((totalDescSuccesses / totalDescAttempts) * 100)}%` : 'N/A';

  console.log(`\n✅ Scan complete (${scanHealth}). Found ${allJobs.length} strictly validated SDET/QA listings.`);
  console.log(`   📊 Telemetry: Descriptions ${totalDescSuccesses}/${totalDescAttempts} (${descSuccessRate}) | Exact ATS: ${totalExactAts}`);

  return {
    jobs: allJobs,
    scanHealth,
    metrics: {
      totalScraped: allJobs.length,
      descriptionAttempts: totalDescAttempts,
      descriptionSuccesses: totalDescSuccesses,
      descriptionSuccessRate: descSuccessRate,
      exactAtsResolutionCount: totalExactAts,
      totalErrors
    }
  };
}

module.exports = {
  runFullScan,
  fetchJobsForQuery,
  fetchJobDescription,
  isRelevantQATitle,
  parseJobListings,
  buildSearchUrl,
  parseRetryAfter
};
