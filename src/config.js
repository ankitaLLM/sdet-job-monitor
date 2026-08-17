require('dotenv').config();

const config = {
  // Gmail settings (for notifications to Ankita)
  gmail: {
    user: process.env.GMAIL_USER || '',
    appPassword: process.env.GMAIL_APP_PASSWORD || '',
    notifyEmail: process.env.NOTIFY_EMAIL || 'ankita.vinculum@gmail.com, vijayvargiya.shubham@gmail.com',
  },

  // Server settings (Port 3001)
  port: parseInt(process.env.PORT, 10) || 3001,

  // Targeted Job Titles for Ankita (11+ yrs SDET / QA / Validation / AI Testing)
  jobTitles: (process.env.JOB_TITLES || '').split(',').map(t => t.trim()).filter(Boolean),

  defaultJobTitles: [
    'Senior SDET',
    'Lead SDET',
    'QA Automation Engineer',
    'Senior Quality Assurance',
    'QA Lead',
    'Software Validation Engineer',
    'AI Test Automation',
    'API Test Engineer',
    'Life Sciences QA Engineer',
    'AgTech Quality Engineer'
  ],

  // Dual Scraping Locations
  locations: {
    remote: {
      name: 'Remote (US)',
      locationQuery: 'United States',
      workplaceType: '2' // LinkedIn f_WT=2 for Remote
    },
    pittsburgh: {
      name: 'Pittsburgh & Area',
      locationQuery: 'Pittsburgh, Pennsylvania, United States',
      workplaceType: '' // All (On-site, Hybrid, Remote)
    }
  },

  // Cron schedule: Every 3 hours
  cronSchedule: process.env.CRON_SCHEDULE || '0 */3 * * *',

  // LinkedIn guest API base URL
  linkedinBaseUrl: 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search',
  linkedinSearchUrl: 'https://www.linkedin.com/jobs/search',

  // How many pages to fetch per search query (25 results per page)
  maxPagesPerQuery: 2,

  // Delay between requests in milliseconds
  requestDelay: 2200,

  // Data directory
  dataDir: process.env.DATA_DIR || './data',

  // User-agent strings for rotation
  userAgents: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  ]
};

if (config.jobTitles.length === 0) {
  config.jobTitles = config.defaultJobTitles;
}

module.exports = config;
