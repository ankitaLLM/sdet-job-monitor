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
 * Parse job listings from LinkedIn HTML response
 * Returns { jobs, rawCardCount, diagnostics }
 */
function parseJobListings(html, searchQuery, locationLabel) {
  const $ = cheerio.load(html);
  const jobs = [];
  let rawCardCount = 0;
  const diagnostics = { malformedCards: 0, nonQACards: 0 };

  // Check for LinkedIn checkpoint / authwall block markers
  const htmlSnippet = html.slice(0, 2000).toLowerCase();
  if (htmlSnippet.includes('authwall') || htmlSnippet.includes('challenge') || htmlSnippet.includes('security verification')) {
    throw new Error('LinkedIn authwall or security challenge detected');
  }

  // Find explicit cards
  const cards = $('.base-card, .job-search-card, li:has(.base-card)');
  rawCardCount = cards.length;

  cards.each((_, element) => {
    try {
      const $el = $(element);
      const $card = $el.hasClass('base-card') || $el.hasClass('job-search-card') ? $el : $el.find('.base-card, .job-search-card').first();

      const title = (
        $card.find('.base-search-card__title').text().trim() ||
        $card.find('h3').text().trim() ||
        $el.find('h3').text().trim()
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
        $el.find('h4').text().trim()
      );

      const location = (
        $card.find('.job-search-card__location').text().trim() ||
        $card.find('.base-search-card__metadata span').text().trim() ||
        ''
      );

      const datePosted = (
        $card.find('time').attr('datetime') ||
        $el.find('time').attr('datetime') ||
        ''
      );

      const listDate = (
        $card.find('time').text().trim() ||
        $el.find('time').text().trim() ||
        ''
      );

      // Extract explicit job ID from data-entity-urn if available
      let jobId = '';
      const urn = $card.attr('data-entity-urn') || $el.attr('data-entity-urn') || '';
      if (urn) {
        const urnMatch = urn.match(/jobPosting:(\d+)/);
        if (urnMatch) jobId = urnMatch[1];
      }

      // Extract job URL
      let jobUrl = (
        $card.find('a.base-card__full-link').attr('href') ||
        $card.find('a').first().attr('href') ||
        $el.find('a.base-card__full-link').attr('href') ||
        $el.find('a').first().attr('href') ||
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
 * Fetch with full jitter exponential backoff
 */
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const response = await fetch(url, options);

      // Handle rate limits or temporary server errors
      if ([408, 425, 429, 500, 502, 503, 504].includes(response.status)) {
        attempt++;
        if (attempt > maxRetries) {
          throw new Error(`HTTP ${response.status} after ${maxRetries} retries`);
        }

        // Inspect Retry-After header
        const retryAfterHeader = response.headers.get('retry-after');
        let delayMs = 2500 * Math.pow(2, attempt) + Math.random() * 1000;
        if (retryAfterHeader) {
          const parsedSeconds = parseInt(retryAfterHeader, 10);
          if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
            delayMs = Math.min(parsedSeconds * 1000, 30000);
          }
        }

        console.warn(`  ⚠️ HTTP ${response.status}. Retrying in ${(delayMs/1000).toFixed(1)}s (attempt ${attempt}/${maxRetries})...`);
        await sleep(delayMs);
        continue;
      }

      return response;
    } catch (err) {
      attempt++;
      if (attempt > maxRetries) throw err;
      const delayMs = 2000 * Math.pow(2, attempt) + Math.random() * 1000;
      console.warn(`  ⚠️ Network error: ${err.message}. Retrying in ${(delayMs/1000).toFixed(1)}s...`);
      await sleep(delayMs);
    }
  }
}

/**
 * Fetch jobs for a single search query and location track
 */
async function fetchJobsForQuery(query, locationQuery, geoId, workplaceType, locationLabel) {
  const allJobs = [];
  const profile = sessionProfile;

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
      const response = await fetchWithRetry(url, {
        signal: AbortSignal.timeout(12000),
        headers
      });

      if (!response || !response.ok) {
        console.warn(`  ⚠️ HTTP ${response ? response.status : 'No response'} for "${query}" in ${locationLabel}`);
        break;
      }

      const html = await response.text();
      if (!html || html.trim().length < 100) {
        break;
      }

      const { jobs, rawCardCount, diagnostics } = parseJobListings(html, query, locationLabel);
      allJobs.push(...jobs);

      // CRITICAL FIX: Base pagination continuation on RAW card count, not QA count
      if (rawCardCount < 8) {
        // Less than 8 raw cards received means we reached the final page
        break;
      }

      if (page < config.maxPagesPerQuery - 1) {
        await sleepWithJitter(config.requestDelay, 0.25);
      }
    } catch (err) {
      console.error(`  ❌ Error fetching "${query}" in ${locationLabel} page ${page + 1}:`, err.message);
      break;
    }
  }

  return allJobs;
}

/**
 * Run a full dual-track scan across Remote US and Pittsburgh Local for all QA/SDET queries
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
  const MAX_CONSECUTIVE_ERRORS = 3;
  let step = 1;
  const totalSteps = config.jobTitles.length * tracks.length;

  for (const track of tracks) {
    console.log(`\n📌 Scanning Track: ${track.label}`);

    for (let i = 0; i < config.jobTitles.length; i++) {
      const query = config.jobTitles[i];
      console.log(`   [${step}/${totalSteps}] Searching: "${query}" in ${track.label}`);

      try {
        const jobs = await fetchJobsForQuery(query, track.location, track.geoId, track.wt, track.label);
        allJobs.push(...jobs);
        console.log(`     Found ${jobs.length} validated SDET/QA listings`);
        consecutiveErrors = 0;
      } catch (err) {
        console.error(`     Failed query "${query}": ${err.message}`);
        consecutiveErrors++;
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          console.warn(`  ⚠️ Circuit breaker triggered after ${consecutiveErrors} consecutive errors. Completing scan gracefully.`);
          break;
        }
      }

      step++;
      await sleepWithJitter(config.requestDelay, 0.3);
    }
  }

  console.log(`\n✅ Scan complete. Found ${allJobs.length} strictly validated SDET/QA listings.`);
  return allJobs;
}

module.exports = {
  runFullScan,
  fetchJobsForQuery,
  isRelevantQATitle,
  parseJobListings,
  buildSearchUrl
};
