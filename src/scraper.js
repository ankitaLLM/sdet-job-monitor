const cheerio = require('cheerio');
const config = require('./config');

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
 * Get a random user-agent string
 */
function getRandomUserAgent() {
  const agents = config.userAgents;
  return agents[Math.floor(Math.random() * agents.length)];
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Build LinkedIn job search URL with focused keywords
 */
function buildSearchUrl(keywords, location, workplaceType = '', start = 0) {
  // Wrap in exact search keywords to reduce generic LinkedIn query expansion
  const query = `"${keywords}"`;

  const params = new URLSearchParams({
    keywords: query,
    location: location,
    start: start.toString(),
    f_TPR: 'r86400', // Past 24 hours
    sortBy: 'DD',    // Most recent
  });

  if (workplaceType) {
    params.append('f_WT', workplaceType);
  }

  return `${config.linkedinBaseUrl}?${params.toString()}`;
}

/**
 * Parse job listings from LinkedIn HTML response with strict title validation
 */
function parseJobListings(html, searchQuery, locationLabel) {
  const $ = cheerio.load(html);
  const jobs = [];

  $('li').each((_, element) => {
    try {
      const $el = $(element);
      const $card = $el.find('.base-card, .job-search-card');

      const title = (
        $card.find('.base-search-card__title').text().trim() ||
        $card.find('h3').text().trim() ||
        $el.find('h3').text().trim()
      );

      // STRICT VALIDATION: Ignore non-QA/SDET/Test Engineer jobs completely
      if (!isRelevantQATitle(title)) {
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
      }

      let jobId = '';
      if (jobUrl) {
        const idMatch = jobUrl.match(/(\d{8,})/);
        if (idMatch) {
          jobId = idMatch[1];
        }
      }

      if (title && (company || jobUrl)) {
        jobs.push({
          id: jobId || `${title}-${company}-${location}`.replace(/\s+/g, '-').toLowerCase(),
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
      // Ignore malformed individual cards
    }
  });

  return jobs;
}

/**
 * Fetch jobs for a single search query and location track
 */
async function fetchJobsForQuery(query, locationQuery, workplaceType, locationLabel) {
  const allJobs = [];

  for (let page = 0; page < config.maxPagesPerQuery; page++) {
    const start = page * 25;
    const url = buildSearchUrl(query, locationQuery, workplaceType, start);

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(12000),
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        console.warn(`  ⚠️ HTTP ${response.status} for query "${query}" in ${locationLabel} (page ${page + 1})`);
        break;
      }

      const html = await response.text();

      if (!html || html.trim().length < 50) {
        break;
      }

      const jobs = parseJobListings(html, query, locationLabel);
      allJobs.push(...jobs);

      if (jobs.length < 5) {
        break;
      }

      if (page < config.maxPagesPerQuery - 1) {
        await sleep(config.requestDelay);
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
  console.log('🔍 Starting strict LinkedIn SDET & QA job scan for Ankita Agrawal...');
  console.log(`   Job titles: ${config.jobTitles.join(', ')}`);
  console.log(`   Tracks: Remote US & Pittsburgh Area`);

  const allJobs = [];
  const tracks = [
    { label: '🌐 Remote (US)', location: config.locations.remote.locationQuery, wt: config.locations.remote.workplaceType },
    { label: '📍 Pittsburgh Area', location: config.locations.pittsburgh.locationQuery, wt: config.locations.pittsburgh.workplaceType }
  ];

  let step = 1;
  const totalSteps = config.jobTitles.length * tracks.length;

  for (const track of tracks) {
    console.log(`\n📌 Scanning Track: ${track.label}`);

    for (let i = 0; i < config.jobTitles.length; i++) {
      const query = config.jobTitles[i];
      console.log(`   [${step}/${totalSteps}] Searching: "${query}" in ${track.label}`);

      const jobs = await fetchJobsForQuery(query, track.location, track.wt, track.label);
      allJobs.push(...jobs);
      console.log(`     Found ${jobs.length} validated SDET/QA listings`);
      step++;

      await sleep(config.requestDelay);
    }
  }

  console.log(`\n✅ Scan complete. Found ${allJobs.length} strictly validated SDET/QA listings.`);
  return allJobs;
}

module.exports = { runFullScan, fetchJobsForQuery, isRelevantQATitle };
