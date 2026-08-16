/**
 * Curated Database and Matcher for:
 * 1. Top 100 US Tech & Enterprise Employers
 * 2. Pittsburgh & Greater Area Tech & Regional Anchors
 * 3. Direct Company Careers Portal / ATS search links
 * 4. Ankita Agrawal Resume Skill Matcher (11+ yrs SDET / QA / Validation / AI)
 */

// Top 100 Tech Giants, Cloud Leaders, High-Growth SaaS & Enterprise Employers
const TOP_100_TECH_ENTERPRISE = [
  'google', 'alphabet', 'amazon', 'microsoft', 'meta', 'facebook', 'apple', 'netflix', 'salesforce', 'oracle',
  'cisco', 'adobe', 'intel', 'nvidia', 'uber', 'lyft', 'stripe', 'airbnb', 'ebay', 'paypal', 'splunk', 'workday',
  'servicenow', 'broadcom', 'vmware', 'ibm', 'deloitte', 'accenture', 'capgemini', 'cognizant', 'infosys', 'wipro',
  'tata consultancy', 'tcs', 'ernst & young', 'ey', 'pwc', 'kpmg', 'jpmorgan', 'chase', 'goldman sachs', 'morgan stanley',
  'citi', 'citigroup', 'bank of america', 'wells fargo', 'capital one', 'walmart', 'target', 'qualcomm', 'amd', 'tesla',
  'bytedance', 'tiktok', 'zoom', 'snowflake', 'databricks', 'hubspot', 'atlassian', 'twilio', 'pinterest', 'snap',
  'robinhood', 'coinbase', 'plaid', 'instacart', 'doordash', 'wayfair', 'slack', 'github', 'gitlab', 'elastic',
  'mongodb', 'confluent', 'okta', 'crowdstrike', 'palo alto networks', 'cloudflare', 'fastly', 'f5', 'citrix', 'red hat',
  'hpe', 'hp', 'dell', 'lenovo', 'samsung', 'sony', 'sap', 'intuit', 'autodesk', 'synopsys', 'cadence', 'asml',
  'applied materials', 'micron', 'western digital', 'netapp', 'nutanix', 'pure storage', 'rubrik', 'cohesity',
  'datadog', 'zscaler', 'box', 'dropbox', 'visa', 'mastercard', 'fidelity', 'vanguard', 'optum', 'unitedhealth',
  'pnc', 'pnc bank', 'bny mellon', 'highmark', 'upmc', 'nike', 'disney', 'warner bros', 'spotify', 'etsy', 'home depot', 'pfizer', 'johnson & johnson'
];

// Pittsburgh & Greater Regional Tech & Enterprise Employers
const PITTSBURGH_COMPANIES = [
  'duolingo', 'pnc', 'pnc bank', 'bny mellon', 'bank of new york mellon', 'highmark', 'highmark health',
  'upmc', 'university of pittsburgh medical center', 'ansys', 'dick\'s sporting goods', 'dicks sporting goods',
  'philips', 'philips healthcare', 'philips respironics', 'carnegie mellon', 'cmu', 'software engineering institute',
  'sei', 'aurora', 'aurora innovation', 'stack av', 'shield ai', 'gecko robotics', 'seegrid', 'abridge',
  'locomation', 'astrobotic', 'motional', 'near earth autonomy', 'hitachi energy', 'omnicell', 'ingersoll rand',
  'nutrien', 'nutrien ag solutions', 'ltk', 'westinghouse', 'ppg', 'ppg industries',
  'alcoa', 'fedex ground', 'giant eagle', 'matthews international', 'bayer', 'thermo fisher', 'thermo fisher scientific',
  'wabtec', 'koppers', 'msa safety', 'eaton', 'american eagle outfitters', 'aeo', 'bosch', 'siemens', 'pitt ohio',
  'argo ai', 'carnegie robotics', 're2 robotics', 'hefren tillotson', 'baird'
];

/**
 * Normalizes company names for exact and substring matching
 */
function cleanCompanyName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/\b(inc|corp|llc|ltd|co|corporation|incorporated|limited|llp|plc|group|technologies|solutions|systems|services)\b/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if a company belongs to Top 100 Tech/Enterprise
 */
function isTop100Company(companyName) {
  if (!companyName) return false;
  const cleaned = cleanCompanyName(companyName);
  if (cleaned.length <= 1) return false;

  return TOP_100_TECH_ENTERPRISE.some(sponsor => {
    const cleanSponsor = cleanCompanyName(sponsor);
    if (cleanSponsor.length === 0) return false;
    if (cleanSponsor.length <= 3) {
      const words = cleaned.split(' ');
      return words.includes(cleanSponsor);
    }
    return cleaned.includes(cleanSponsor) || cleanSponsor.includes(cleaned);
  });
}

/**
 * Checks if a company is a recognized Pittsburgh regional employer
 */
function isPittsburghCompany(companyName) {
  if (!companyName) return false;
  const cleaned = cleanCompanyName(companyName);
  if (cleaned.length <= 1) return false;

  return PITTSBURGH_COMPANIES.some(co => {
    const cleanCo = cleanCompanyName(co);
    if (cleanCo.length <= 3) {
      const words = cleaned.split(' ');
      return words.includes(cleanCo);
    }
    return cleaned.includes(cleanCo) || cleanCo.includes(cleaned);
  });
}

/**
 * Generates direct search link to company's official career portal or direct Google Job requisition
 */
function buildCompanyCareersUrl(companyName, jobTitle) {
  const query = `${companyName || ''} careers ${jobTitle || ''}`.trim();
  return `https://www.google.com/search?q=${encodeURIComponent(query + ' apply')}`;
}

/**
 * Ankita's core skill keywords for automatic matching and scoring
 */
const ANKITA_SKILLS = [
  { name: 'Playwright', regex: /\bplaywright\b/i },
  { name: 'WebdriverIO', regex: /\bwebdriverio\b|\bwdio\b/i },
  { name: 'Selenium', regex: /\bselenium\b/i },
  { name: 'Cucumber / BDD', regex: /\bcucumber\b|\bbdd\b|\bgberkin\b/i },
  { name: 'REST Assured / API', regex: /\brest\s*assured\b|\brest\b|\bapi\s*testing\b|\bpostman\b|\bgraphql\b/i },
  { name: 'Appium / Mobile', regex: /\bappium\b|\bmobile\s*testing\b|\bios\b|\bandroid\b|\bbrowserstack\b/i },
  { name: 'AI / GenAI Testing', regex: /\bai\b|\bgenai\b|\bbedrock\b|\bllm\b|\bagentic\b|\bcopilot\b/i },
  { name: 'Python / Pytest', regex: /\bpython\b|\bpytest\b/i },
  { name: 'Java / TestNG', regex: /\bjava\b|\btestng\b|\bjunit\b/i },
  { name: 'TypeScript / JS', regex: /\btypescript\b|\bjavascript\b|\bnode(\.js)?\b/i },
  { name: 'CI/CD Jenkins', regex: /\bjenkins\b|\bci\/cd\b|\bgithub\s*actions\b/i },
  { name: 'Validation', regex: /\bvalidation\b|\bcsv\b|\bgamp\b|\bcomplian(ce|t)\b/i },
  { name: 'SQL / DB', regex: /\bsql\b|\bdatabase\b|\bmongodb\b/i },
  { name: 'Performance / JMeter', regex: /\bjmeter\b|\bloadrunner\b|\bperformance\b/i },
  { name: 'Senior / Lead', regex: /\bsenior\b|\blead\b|\bprincipal\b|\bstaff\b|\b10\+\s*years\b|\b8\+\s*years\b/i }
];

/**
 * Calculates match score and matched skills from job title and search context
 */
function analyzeJobFit(title, company, searchQuery, description = '') {
  const fullText = `${title || ''} ${company || ''} ${searchQuery || ''} ${description || ''}`.toLowerCase();
  const matchedSkills = [];

  for (const skill of ANKITA_SKILLS) {
    if (skill.regex.test(fullText)) {
      matchedSkills.push(skill.name);
    }
  }

  // Base score based on role title match
  let score = 75; // Baseline high fit due to targeted scraping

  if (/\bsenior\b|\blead\b|\bprincipal\b|\bstaff\b/i.test(title)) score += 10;
  if (/\bsdet\b|\btest\s*automation\b|\bquality\s*engineer/i.test(title)) score += 10;
  if (/\bai\b|\bgenai\b|\bagentic\b/i.test(title)) score += 15;
  if (matchedSkills.length >= 3) score += 5;

  score = Math.min(score, 99);

  return {
    score,
    matchedSkills: Array.from(new Set(matchedSkills))
  };
}

module.exports = {
  isTop100Company,
  isPittsburghCompany,
  buildCompanyCareersUrl,
  analyzeJobFit,
  cleanCompanyName,
  TOP_100_TECH_ENTERPRISE,
  PITTSBURGH_COMPANIES
};
