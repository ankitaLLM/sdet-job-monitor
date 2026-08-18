/**
 * Curated Database, Employer Directory, and Transparent 100-Point Resume Fit Scoring Model
 * Specifically calibrated for Ankita Agrawal (11+ yrs Senior SDET / QA Lead)
 * Includes dedicated intelligence for:
 * 1. Clario peers (Life Sciences, Clinical Trials, HealthTech, Diagnostic Software & MedTech)
 * 2. Nutrien peers:
 *    - 🌱 Precision Agricultural Tech (AgTech / Digital Agronomy / Smart Farm Machinery)
 *    - 🌾 Agri-Finance (Commodity Trading, Farm Credit, Crop Insurance, Grain Settlement & Ag FinTech)
 */

const { resolveApplicationPortal } = require('./atsResolver');

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
  'nutrien', 'nutrien ag solutions', 'clario', 'ltk', 'westinghouse', 'ppg', 'ppg industries',
  'alcoa', 'fedex ground', 'giant eagle', 'matthews international', 'bayer', 'thermo fisher', 'thermo fisher scientific',
  'wabtec', 'koppers', 'msa safety', 'eaton', 'american eagle outfitters', 'aeo', 'bosch', 'siemens', 'pitt ohio',
  'argo ai', 'carnegie robotics', 're2 robotics', 'hefren tillotson', 'baird'
];

// Clario Peers: Clinical Trial Tech, Life Sciences, HealthTech, Diagnostic Software & MedTech
const CLARIO_PEERS = [
  'clario', 'medidata', 'medidata solutions', 'veeva', 'veeva systems', 'iqvia',
  'signant health', 'parexel', 'castor', 'suvoda', 'yprime', 'wcg clinical', 'wcg',
  'advarra', 'science 37', 'medable', 'epic', 'epic systems', 'cerner', 'oracle health',
  'tempus', 'tempus labs', 'flatiron health', 'flatiron', 'doximity', 'teladoc', 'teladoc health',
  'verily', 'verily life sciences', 'goodrx', 'definitive healthcare', 'komodo health',
  'change healthcare', 'optum', 'unitedhealth', 'philips', 'philips healthcare',
  'thermo fisher', 'thermo fisher scientific', 'illumina', 'ge healthcare', 'omnicell',
  'highmark', 'highmark health', 'upmc', 'upmc enterprises', 'bio-rad', 'bio rad', 'roche',
  'roche diagnostics', 'abbott', 'abbott laboratories', 'becton dickinson', 'bd',
  'medtronic', 'boston scientific', 'stryker', 'baxter', 'siemens healthineers',
  'charles river', 'charles river laboratories', 'labcorp', 'quest diagnostics',
  'pfizer', 'moderna', 'regeneron', 'vertex', 'gilead', 'biogen', 'amgen', 'novartis', 'astrazeneca', 'bristol myers squibb'
];

// Precision Agricultural Technology (AgTech / Digital Agronomy / Farm Robotics)
const AGTECH_COMPANIES = [
  'nutrien', 'nutrien ag solutions', 'corteva', 'corteva agriscience', 'granular',
  'bayer', 'bayer crop science', 'climate llc', 'climate fieldview', 'the climate corporation',
  'john deere', 'deere & company', 'deere', 'syngenta', 'syngenta group', 'syngenta digital', 'cropwise',
  'trimble', 'trimble agriculture', 'indigo ag', 'farmers business network', 'fbn',
  'winfield united', 'land o\'lakes', 'land olakes', 'cnh industrial', 'cnh', 'raven industries',
  'fmc', 'fmc corporation', 'mosaic', 'mosaic company', 'the mosaic company',
  'yara', 'yara international', 'agco', 'agco corporation', 'precision planting', 'fuse technologies',
  'kubota', 'semios', 'taranis', 'bushel', 'agvend'
];

// Agri-Finance, Farm Credit, Commodity Trading & Crop FinTech
const AGRI_FINANCE_COMPANIES = [
  'cargill', 'adm', 'archer daniels midland', 'bunge', 'louis dreyfus', 'louis dreyfus company', 'ldc',
  'chs', 'chs inc', 'scoular', 'nutrien financial', 'john deere financial', 'deere financial',
  'cobank', 'farm credit', 'farm credit services of america', 'agfirst', 'agfirst farm credit',
  'agcountry', 'rabobank', 'fbn finance', 'producepay', 'acretrader', 'farmland lp', 'agvend', 'bushel'
];

// All Nutrien Peers (AgTech + Agri-Finance + Heavy Enterprise Operations)
const NUTRIEN_PEERS = [
  ...AGTECH_COMPANIES,
  ...AGRI_FINANCE_COMPANIES,
  'caterpillar', 'cat', 'rockwell automation', 'honeywell', 'honeywell connected enterprise',
  'siemens digital industries', 'siemens', 'emerson', 'emerson electric', 'schneider electric', 'abb',
  'hitachi energy', 'ingersoll rand', 'eaton', 'eaton corporation', 'westinghouse', 'westinghouse electric',
  'ppg', 'ppg industries', 'alcoa', 'wabtec', 'wabtec corporation', 'msa safety'
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

function matchesCompanyList(companyName, list) {
  if (!companyName) return false;
  const cleaned = cleanCompanyName(companyName);
  if (cleaned.length <= 1) return false;

  return list.some(item => {
    const cleanItem = cleanCompanyName(item);
    if (cleanItem.length === 0) return false;
    if (cleanItem.length <= 3) {
      const words = cleaned.split(' ');
      return words.includes(cleanItem);
    }
    return cleaned.includes(cleanItem) || cleanItem.includes(cleaned);
  });
}

/**
 * Checks if a company belongs to Top 100 Tech/Enterprise
 */
function isTop100Company(companyName) {
  return matchesCompanyList(companyName, TOP_100_TECH_ENTERPRISE);
}

/**
 * Checks if a company is a recognized Pittsburgh regional employer
 */
function isPittsburghCompany(companyName) {
  return matchesCompanyList(companyName, PITTSBURGH_COMPANIES);
}

/**
 * Checks if a company is a peer of Clario (Life Sciences / HealthTech)
 */
function isClarioPeer(companyName) {
  return matchesCompanyList(companyName, CLARIO_PEERS);
}

/**
 * Checks if a company is an AgTech company
 */
function isAgTechCompany(companyName) {
  return matchesCompanyList(companyName, AGTECH_COMPANIES);
}

/**
 * Checks if a company is an Agri-Finance company
 */
function isAgriFinanceCompany(companyName) {
  return matchesCompanyList(companyName, AGRI_FINANCE_COMPANIES);
}

/**
 * Checks if a company is a general peer of Nutrien
 */
function isNutrienPeer(companyName) {
  return matchesCompanyList(companyName, NUTRIEN_PEERS);
}

/**
 * Checks if a company is either a Clario or Nutrien peer
 */
function isPeerCompany(companyName) {
  return isClarioPeer(companyName) || isNutrienPeer(companyName);
}

/**
 * Classifies a job into AgTech or Agri-Finance based on company, title, and description
 */
function checkAgriClassification(title = '', company = '', description = '') {
  const isAgTechComp = isAgTechCompany(company);
  const isAgriFinComp = isAgriFinanceCompany(company);

  const fullText = `${title} ${company} ${description}`.toLowerCase();

  const agTechRegex = /\b(agtech|precision\s*ag|agronomy|agronomic|digital\s*farming|crop\s*planning|crop\s*protection|smart\s*farming|farm\s*machinery|tractor|telematics|seed|fertilizer|harvest|fieldview|cropwise)\b/i;
  const agriFinanceRegex = /\b(agri\s*finance|agricultural\s*finance|commodity\s*trading|grain\s*trading|farm\s*credit|crop\s*insurance|ag\s*lending|grain\s*settlement|ctrm|etrm|agricultural\s*commodity|crop\s*financing|origination|scale\s*ticket)\b/i;

  const textMatchesAgTech = agTechRegex.test(fullText);
  const textMatchesAgriFin = agriFinanceRegex.test(fullText);

  const isAgTech = isAgTechComp || textMatchesAgTech;
  const isAgriFinance = isAgriFinComp || textMatchesAgriFin;

  let agriCategory = null;
  if (isAgriFinance) {
    agriCategory = 'Agri-Finance & Commodities';
  } else if (isAgTech) {
    agriCategory = 'Precision AgTech';
  }

  return {
    isAgTech,
    isAgriFinance,
    agriCategory
  };
}

/**
 * Returns specific industry category for Clario & Nutrien peers
 */
function getPeerCategory(companyName, title = '', description = '') {
  if (isClarioPeer(companyName)) return 'Life Sciences & HealthTech';
  const agri = checkAgriClassification(title, companyName, description);
  if (agri.agriCategory) return agri.agriCategory;
  if (isNutrienPeer(companyName)) return 'AgTech & Industrial Tech';
  return null;
}

/**
 * Targeted skills dictionary with weighted points and specific regexes
 */
const SKILL_DEFINITIONS = [
  { name: 'AI / GenAI Testing', weight: 10, category: 'tech', regex: /\b(genai|ai\s*agent|llm|amazon\s*bedrock|prompt\s*engineering|ai\s*testing|agentic)\b/i },
  { name: 'Playwright', weight: 9, category: 'tech', regex: /\bplaywright\b/i },
  { name: 'WebdriverIO', weight: 8, category: 'tech', regex: /\b(webdriverio|wdio)\b/i },
  { name: 'Python / Pytest', weight: 7, category: 'tech', regex: /\b(python|pytest)\b/i },
  { name: 'CI/CD Jenkins', weight: 6, category: 'tech', regex: /\b(jenkins|ci\/cd|github\s*actions|pipeline)\b/i },
  { name: 'REST / GraphQL API', weight: 5, category: 'tech', regex: /\b(rest\s*assured|graphql|postman|api\s*testing|karate)\b/i },
  { name: 'Appium / Mobile', weight: 4, category: 'tech', regex: /\b(appium|mobile\s*testing|browserstack|ios|android)\b/i },
  { name: 'Selenium / Java', weight: 4, category: 'tech', regex: /\b(selenium|java|testng|junit)\b/i },
  { name: 'TypeScript / JS', weight: 4, category: 'tech', regex: /\b(typescript|javascript|node\.js)\b/i },
  { name: 'Cucumber / BDD', weight: 4, category: 'domain', regex: /\b(cucumber|bdd|gherkin)\b/i },
  { name: 'Validation / CSV', weight: 3, category: 'domain', regex: /\b(software\s*validation|csv\s*engineer|gamp|system\s*validation|21\s*cfr)\b/i },
  { name: 'SQL / Database', weight: 3, category: 'domain', regex: /\b(sql|database|mongodb)\b/i },
  { name: 'Performance / JMeter', weight: 2, category: 'domain', regex: /\b(jmeter|loadrunner|performance\s*testing)\b/i }
];

/**
 * Transparent 100-Point Candidate Resume Fit Scoring Algorithm
 * Calibrated against Ankita's 11+ years of experience
 * Evidence source: Evaluates ONLY the job title and job description (searchQuery and company are excluded)
 */
function analyzeJobFit(title, company, description = '') {
  const titleText = (title || '').toLowerCase();
  const descText = (description || '').toLowerCase();
  const fullEvidence = `${titleText} ${descText}`.trim();

  let roleScore = 0;
  let seniorityScore = 0;
  let techScore = 0;
  let domainScore = 0;
  const matchedSkills = [];
  const matchedTechSkills = [];
  const matchedDomainSkills = [];

  // 1. Role Alignment (0 to 25 points)
  if (/\bsdet\b|\bsoftware\s*(development\s*)?engineer\s*in\s*test\b/i.test(titleText)) {
    roleScore = 25;
  } else if (/\b(qa\s*automation|quality\s*engineering\s*lead|lead\s*qa|automation\s*engineer)/i.test(titleText)) {
    roleScore = 22;
  } else if (/\b(software\s*validation|validation\s*engineer|validation\s*lead|csv\s*engineer)/i.test(titleText)) {
    roleScore = 22;
  } else if (/\b(api\s*test|ai\s*test|test\s*automation)/i.test(titleText)) {
    roleScore = 20;
  } else if (/\b(quality\s*engineer|quality\s*assurance|qa\s*analyst|test\s*engineer)/i.test(titleText)) {
    roleScore = 18;
  } else {
    roleScore = 12;
  }

  // 2. Seniority Alignment (0 to 20 points)
  if (/\b(lead|principal|staff|architect|director|10\+\s*years?|11\+\s*years?)\b/i.test(fullEvidence)) {
    seniorityScore = 20;
  } else if (/\b(senior|sr\.?|specialist|8\+\s*years?|5\+\s*years?)\b/i.test(fullEvidence)) {
    seniorityScore = 18;
  } else if (/\b(intermediate|mid|ii|iii)\b/i.test(fullEvidence)) {
    seniorityScore = 12;
  } else if (/\b(junior|jr\.?|associate|entry|intern|graduate)\b/i.test(fullEvidence)) {
    seniorityScore = 0;
  } else {
    seniorityScore = 14;
  }

  // 3. Core Tech Stack (0 to 45 points) & Domain (0 to 10 points)
  let techPoints = 0;
  let domainPoints = 0;

  for (const skill of SKILL_DEFINITIONS) {
    const inTitle = skill.regex.test(titleText);
    const inDesc = descText ? skill.regex.test(descText) : false;

    if (inTitle || inDesc) {
      matchedSkills.push(skill.name);
      const points = inTitle ? Math.round(skill.weight * 1.25) : skill.weight;

      if (skill.category === 'tech') {
        matchedTechSkills.push(skill.name);
        techPoints += points;
      } else {
        matchedDomainSkills.push(skill.name);
        domainPoints += points;
      }
    }
  }

  // Density bonus strictly for matching multiple distinct technology skills
  if (matchedTechSkills.length >= 4) {
    techPoints += 12;
  } else if (matchedTechSkills.length >= 3) {
    techPoints += 8;
  } else if (matchedTechSkills.length >= 2) {
    techPoints += 4;
  }

  // Domain bonus for domain/validation depth (especially relevant for Clario/Nutrien CSV validation)
  if (matchedDomainSkills.length >= 2) {
    domainPoints += 4;
  }

  techScore = Math.min(techPoints, 45);
  domainScore = Math.min(domainPoints, 10);

  // Calculate composite score (0 - 100)
  let totalScore = roleScore + seniorityScore + techScore + domainScore;

  // Penalize negative non-software terms if any slipped in
  if (/\b(manual\s*only|hardware|electrician|manufacturing\s*line)\b/i.test(fullEvidence)) {
    totalScore -= 25;
  }

  totalScore = Math.max(25, Math.min(totalScore, 99));

  const hasDescription = Boolean(description && description.length > 50);

  return {
    score: totalScore,
    matchedSkills: Array.from(new Set(matchedSkills)),
    breakdown: {
      role: roleScore,
      seniority: seniorityScore,
      tech: techScore,
      domain: domainScore
    },
    confidence: hasDescription ? 'high' : (matchedSkills.length >= 2 ? 'medium' : 'low')
  };
}

module.exports = {
  isTop100Company,
  isPittsburghCompany,
  isClarioPeer,
  isNutrienPeer,
  isAgTechCompany,
  isAgriFinanceCompany,
  isPeerCompany,
  checkAgriClassification,
  getPeerCategory,
  analyzeJobFit,
  cleanCompanyName,
  TOP_100_TECH_ENTERPRISE,
  PITTSBURGH_COMPANIES,
  CLARIO_PEERS,
  NUTRIEN_PEERS,
  AGTECH_COMPANIES,
  AGRI_FINANCE_COMPANIES
};
