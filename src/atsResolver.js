/**
 * ATS & Career Portal Direct Resolution Engine
 * Resolves job postings to direct Applicant Tracking System (ATS) portals
 * (Greenhouse, Lever, Workday, SmartRecruiters, Ashby, iCIMS) and verified corporate career sites.
 */

// Curated Company Registry with verified ATS providers and career domains
const COMPANY_REGISTRY = {
  // Pittsburgh & Local Regional Leaders
  'duolingo': { domain: 'duolingo.com', ats: 'greenhouse', board: 'duolingo', careerUrl: 'https://careers.duolingo.com/' },
  'pnc': { domain: 'pnc.com', ats: 'workday', careerUrl: 'https://careers.pnc.com/' },
  'pnc bank': { domain: 'pnc.com', ats: 'workday', careerUrl: 'https://careers.pnc.com/' },
  'highmark': { domain: 'highmarkhealth.org', ats: 'workday', careerUrl: 'https://careers.highmarkhealth.org/' },
  'highmark health': { domain: 'highmarkhealth.org', ats: 'workday', careerUrl: 'https://careers.highmarkhealth.org/' },
  'upmc': { domain: 'upmc.com', ats: 'taleo', careerUrl: 'https://careers.upmc.com/' },
  'ansys': { domain: 'ansys.com', ats: 'workday', careerUrl: 'https://www.ansys.com/careers' },
  'dick\'s sporting goods': { domain: 'dickssportinggoods.jobs', ats: 'workday', careerUrl: 'https://www.dickssportinggoods.jobs/' },
  'dicks sporting goods': { domain: 'dickssportinggoods.jobs', ats: 'workday', careerUrl: 'https://www.dickssportinggoods.jobs/' },
  'motional': { domain: 'motional.com', ats: 'greenhouse', board: 'motional', careerUrl: 'https://motional.com/careers' },
  'aurora': { domain: 'aurora.tech', ats: 'greenhouse', board: 'aurorainnovation', careerUrl: 'https://aurora.tech/careers' },
  'aurora innovation': { domain: 'aurora.tech', ats: 'greenhouse', board: 'aurorainnovation', careerUrl: 'https://aurora.tech/careers' },
  'stack av': { domain: 'stack.av', ats: 'greenhouse', board: 'stackav', careerUrl: 'https://stack.av/careers' },
  'shield ai': { domain: 'shield.ai', ats: 'greenhouse', board: 'shieldai', careerUrl: 'https://shield.ai/careers' },
  'gecko robotics': { domain: 'geckorobotics.com', ats: 'greenhouse', board: 'geckorobotics', careerUrl: 'https://www.geckorobotics.com/careers' },
  'thermo fisher scientific': { domain: 'thermofisher.com', ats: 'workday', careerUrl: 'https://jobs.thermofisher.com/' },
  'thermo fisher': { domain: 'thermofisher.com', ats: 'workday', careerUrl: 'https://jobs.thermofisher.com/' },
  'hitachi energy': { domain: 'hitachienergy.com', ats: 'workday', careerUrl: 'https://www.hitachienergy.com/careers' },
  'omnicell': { domain: 'omnicell.com', ats: 'workday', careerUrl: 'https://careers.omnicell.com/' },
  'ingersoll rand': { domain: 'irco.com', ats: 'workday', careerUrl: 'https://careers.irco.com/' },
  'philips': { domain: 'philips.com', ats: 'workday', careerUrl: 'https://www.careers.philips.com/' },
  'bny mellon': { domain: 'bnymellon.com', ats: 'workday', careerUrl: 'https://www.bnymellon.com/us/en/careers.html' },
  'nutrien': { domain: 'nutrien.com', ats: 'workday', careerUrl: 'https://www.nutrien.com/careers' },
  'ltk': { domain: 'rewardstyle.com', ats: 'greenhouse', board: 'ltk', careerUrl: 'https://company.shopltk.com/careers' },

  // Top Tier Tech & Cloud Leaders
  'google': { domain: 'google.com', careerUrl: 'https://www.google.com/about/careers/applications/jobs/results/' },
  'microsoft': { domain: 'microsoft.com', careerUrl: 'https://jobs.careers.microsoft.com/global/en/search' },
  'amazon': { domain: 'amazon.jobs', careerUrl: 'https://www.amazon.jobs/en/search' },
  'apple': { domain: 'apple.com', careerUrl: 'https://jobs.apple.com/en-us/search' },
  'meta': { domain: 'metacareers.com', careerUrl: 'https://www.metacareers.com/jobs' },
  'salesforce': { domain: 'salesforce.com', careerUrl: 'https://careers.salesforce.com/en/jobs/' },
  'snowflake': { domain: 'snowflake.com', ats: 'greenhouse', board: 'snowflake', careerUrl: 'https://careers.snowflake.com/' },
  'databricks': { domain: 'databricks.com', ats: 'greenhouse', board: 'databricks', careerUrl: 'https://www.databricks.com/company/careers' },
  'stripe': { domain: 'stripe.com', ats: 'greenhouse', board: 'stripe', careerUrl: 'https://stripe.com/jobs/search' },
  'netflix': { domain: 'netflix.com', ats: 'greenhouse', careerUrl: 'https://jobs.netflix.com/search' },
  'uber': { domain: 'uber.com', ats: 'greenhouse', careerUrl: 'https://www.uber.com/us/en/careers/list/' },
  'lyft': { domain: 'lyft.com', ats: 'greenhouse', board: 'lyft', careerUrl: 'https://www.lyft.com/careers' },
  'airbnb': { domain: 'airbnb.com', ats: 'greenhouse', board: 'airbnb', careerUrl: 'https://careers.airbnb.com/positions/' },
  'servicenow': { domain: 'servicenow.com', ats: 'smartrecruiters', careerUrl: 'https://careers.servicenow.com/jobs/' },
  'workday': { domain: 'workday.com', ats: 'workday', careerUrl: 'https://workday.wd5.myworkdayjobs.com/Workday' },
  'atlassian': { domain: 'atlassian.com', ats: 'greenhouse', board: 'atlassian', careerUrl: 'https://www.atlassian.com/company/careers' },
  'hubspot': { domain: 'hubspot.com', ats: 'greenhouse', board: 'hubspot', careerUrl: 'https://www.hubspot.com/careers/jobs' },
  'twilio': { domain: 'twilio.com', ats: 'greenhouse', board: 'twilio', careerUrl: 'https://www.twilio.com/en-us/company/jobs' },
  'datadog': { domain: 'datadoghq.com', ats: 'greenhouse', board: 'datadog', careerUrl: 'https://careers.datadoghq.com/' },
  'crowdstrike': { domain: 'crowdstrike.com', ats: 'workday', careerUrl: 'https://crowdstrike.wd5.myworkdayjobs.com/crowdstrikecareers' },
  'palo alto networks': { domain: 'paloaltonetworks.com', ats: 'smartrecruiters', careerUrl: 'https://jobs.smartrecruiters.com/PaloAltoNetworks' },
  'cloudflare': { domain: 'cloudflare.com', ats: 'greenhouse', board: 'cloudflare', careerUrl: 'https://www.cloudflare.com/careers/jobs/' },
  'okta': { domain: 'okta.com', ats: 'greenhouse', board: 'okta', careerUrl: 'https://www.okta.com/company/careers/' },
  'mongodb': { domain: 'mongodb.com', ats: 'greenhouse', board: 'mongodb', careerUrl: 'https://www.mongodb.com/company/careers' },
};

/**
 * SSRF & Protocol Safety Guard
 */
function isSafeHttpsUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') return false;
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'https:') return false;

    const hostname = parsed.hostname.toLowerCase();
    // Disallow loopback and private IP blocks
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('169.254.') ||
      hostname.endsWith('.local') ||
      hostname === '[::1]'
    ) {
      return false;
    }

    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Identify ATS provider from URL pattern
 */
function detectAtsProvider(url) {
  if (!url) return null;
  const u = url.toLowerCase();
  if (u.includes('greenhouse.io')) return 'greenhouse';
  if (u.includes('jobs.lever.co')) return 'lever';
  if (u.includes('myworkdayjobs.com')) return 'workday';
  if (u.includes('smartrecruiters.com')) return 'smartrecruiters';
  if (u.includes('ashbyhq.com')) return 'ashby';
  if (u.includes('icims.com')) return 'icims';
  if (u.includes('taleo.net')) return 'taleo';
  return null;
}

/**
 * Clean company name for dictionary lookup
 */
function normalizeCompanyKey(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/\b(inc|corp|llc|ltd|co|corporation|incorporated|limited|group)\b/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolve direct application URL for a job posting
 * Returns { applyUrl, provider, source, confidence, resolutionStatus }
 */
function resolveApplicationPortal(companyName, jobTitle, rawApplyUrl = '') {
  // 1. If explicit ATS apply URL is already present and valid
  if (rawApplyUrl && isSafeHttpsUrl(rawApplyUrl)) {
    const provider = detectAtsProvider(rawApplyUrl);
    if (provider) {
      return {
        applyUrl: rawApplyUrl,
        provider,
        source: 'ats-direct',
        confidence: 0.98,
        resolutionStatus: 'resolved'
      };
    }
  }

  // 2. Check company registry
  const key = normalizeCompanyKey(companyName);
  const entry = COMPANY_REGISTRY[key];

  if (entry) {
    if (entry.ats === 'greenhouse' && entry.board) {
      const boardUrl = `https://boards.greenhouse.io/${entry.board}`;
      return {
        applyUrl: boardUrl,
        provider: 'greenhouse',
        source: 'company-ats-registry',
        confidence: 0.92,
        resolutionStatus: 'resolved'
      };
    }

    if (entry.careerUrl && isSafeHttpsUrl(entry.careerUrl)) {
      return {
        applyUrl: entry.careerUrl,
        provider: entry.ats || 'corporate-portal',
        source: 'company-career-portal',
        confidence: 0.88,
        resolutionStatus: 'resolved'
      };
    }
  }

  // 3. Fallback: Google Jobs / Official Company Search Requisition
  const cleanComp = (companyName || '').trim();
  const cleanTitl = (jobTitle || '').trim();
  const query = `${cleanComp} careers ${cleanTitl} apply`.trim();
  const fallbackUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

  return {
    applyUrl: fallbackUrl,
    provider: 'google-jobs-search',
    source: 'google-fallback',
    confidence: 0.60,
    resolutionStatus: 'fallback'
  };
}

module.exports = {
  resolveApplicationPortal,
  detectAtsProvider,
  isSafeHttpsUrl,
  COMPANY_REGISTRY
};
