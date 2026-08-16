import { describe, it, expect } from 'vitest';
const {
  isRelevantQATitle,
  parseJobListings,
  buildSearchUrl,
  parseRetryAfter
} = require('../src/scraper');

describe('Scraper & Title Validation Engine', () => {
  describe('isRelevantQATitle', () => {
    it('accepts legitimate Senior SDET, QA, and Test Automation titles', () => {
      expect(isRelevantQATitle('Senior SDET')).toBe(true);
      expect(isRelevantQATitle('Lead Software Development Engineer in Test')).toBe(true);
      expect(isRelevantQATitle('Senior QA Automation Engineer')).toBe(true);
      expect(isRelevantQATitle('Quality Engineering Lead')).toBe(true);
      expect(isRelevantQATitle('Software Validation Engineer')).toBe(true);
      expect(isRelevantQATitle('AI Test Automation Engineer')).toBe(true);
      expect(isRelevantQATitle('API Automation Engineer')).toBe(true);
      expect(isRelevantQATitle('Quality Engineer Principal - MLOps')).toBe(true);
      expect(isRelevantQATitle('Quality Engineer Specialist Senior (Mainframe/SQL/API QE)')).toBe(true);
      expect(isRelevantQATitle('QA Engineer, AI Products')).toBe(true);
      expect(isRelevantQATitle('Lead Engineer (Design Quality Assurance)')).toBe(true);
      expect(isRelevantQATitle('Principal Software Engineer - Quality Assurance')).toBe(true);
    });

    it('strictly rejects hardware, aerospace, spacecraft, and physical engineering roles', () => {
      expect(isRelevantQATitle('Spacecraft System Engineer')).toBe(false);
      expect(isRelevantQATitle('Electric Hardware Engineer')).toBe(false);
      expect(isRelevantQATitle('Aerospace Systems Engineer')).toBe(false);
      expect(isRelevantQATitle('Mechanical Design Engineer')).toBe(false);
      expect(isRelevantQATitle('Civil Engineer')).toBe(false);
      expect(isRelevantQATitle('Structural Quality Inspector')).toBe(false);
      expect(isRelevantQATitle('Electrical Maintenance Engineer')).toBe(false);
    });

    it('strictly rejects technician, trade, and non-software roles', () => {
      expect(isRelevantQATitle('Test Technician')).toBe(false);
      expect(isRelevantQATitle('Quality Technician II')).toBe(false);
      expect(isRelevantQATitle('Lab Technician')).toBe(false);
      expect(isRelevantQATitle('Field Service Technician')).toBe(false);
      expect(isRelevantQATitle('Sales Representative')).toBe(false);
      expect(isRelevantQATitle('Medical Assistant')).toBe(false);
    });

    it('rejects generic software engineer titles that lack test/QA/validation keywords', () => {
      expect(isRelevantQATitle('Software Engineer III')).toBe(false);
      expect(isRelevantQATitle('Systems Engineer')).toBe(false);
      expect(isRelevantQATitle('Full Stack Developer')).toBe(false);
      expect(isRelevantQATitle('Backend Java Developer')).toBe(false);
    });
  });

  describe('parseJobListings with in-page deduplication', () => {
    it('parses valid HTML card fixtures with explicit data-entity-urn and filters non-QA cards', () => {
      const mockHtml = `
        <ul class="jobs-search__results-list">
          <li>
            <div class="base-card job-search-card" data-entity-urn="urn:li:jobPosting:4453030568">
              <h3 class="base-search-card__title">Senior SDET - Playwright</h3>
              <h4 class="base-search-card__subtitle"><a href="#">Acme Tech</a></h4>
              <span class="job-search-card__location">Pittsburgh, PA</span>
              <time datetime="2026-08-15">2 hours ago</time>
              <a class="base-card__full-link" href="https://www.linkedin.com/jobs/view/4453030568?refId=123"></a>
            </div>
          </li>
          <li>
            <div class="base-card job-search-card" data-entity-urn="urn:li:jobPosting:9999999999">
              <h3 class="base-search-card__title">Spacecraft System Engineer</h3>
              <h4 class="base-search-card__subtitle"><a href="#">AeroCorp</a></h4>
              <span class="job-search-card__location">Houston, TX</span>
              <time datetime="2026-08-15">3 hours ago</time>
              <a class="base-card__full-link" href="https://www.linkedin.com/jobs/view/9999999999?refId=456"></a>
            </div>
          </li>
        </ul>
      `;

      const result = parseJobListings(mockHtml, 'Senior SDET', '📍 Pittsburgh Area');
      expect(result.rawCardCount).toBe(2);
      expect(result.jobs.length).toBe(1);
      expect(result.jobs[0].id).toBe('4453030568');
      expect(result.jobs[0].title).toBe('Senior SDET - Playwright');
      expect(result.jobs[0].company).toBe('Acme Tech');
      expect(result.diagnostics.nonQACards).toBe(1);
    });

    it('deduplicates identical cards on the same page', () => {
      const duplicateHtml = `
        <ul class="jobs-search__results-list">
          <li>
            <div class="base-card job-search-card" data-entity-urn="urn:li:jobPosting:11111111">
              <h3 class="base-search-card__title">Senior SDET</h3>
              <h4 class="base-search-card__subtitle">Cloud Corp</h4>
            </div>
          </li>
          <li>
            <div class="base-card job-search-card" data-entity-urn="urn:li:jobPosting:11111111">
              <h3 class="base-search-card__title">Senior SDET</h3>
              <h4 class="base-search-card__subtitle">Cloud Corp</h4>
            </div>
          </li>
        </ul>
      `;

      const result = parseJobListings(duplicateHtml, 'Senior SDET', 'Remote');
      expect(result.jobs.length).toBe(1);
      expect(result.diagnostics.duplicateCards).toBe(1);
    });

    it('throws error when LinkedIn authwall or security checkpoint is encountered', () => {
      const authwallHtml = `<html><head><title>LinkedIn Security Verification</title></head><body>Please complete the security challenge (authwall)</body></html>`;
      expect(() => parseJobListings(authwallHtml, 'SDET', 'US')).toThrow(/authwall|security/i);
    });
  });

  describe('parseRetryAfter', () => {
    it('parses integer seconds correctly', () => {
      expect(parseRetryAfter('5')).toBe(5000);
      expect(parseRetryAfter('20')).toBe(20000);
    });

    it('caps retry delay at 30 seconds', () => {
      expect(parseRetryAfter('120')).toBe(30000);
    });

    it('handles null/invalid headers', () => {
      expect(parseRetryAfter(null)).toBeNull();
      expect(parseRetryAfter('invalid-header')).toBeNull();
    });
  });

  describe('buildSearchUrl', () => {
    it('constructs well-formed URLs with geoId and workplace filters', () => {
      const url = buildSearchUrl('Senior SDET', 'Pittsburgh, Pennsylvania', '106093475', '', 0);
      expect(url).toContain('keywords=Senior+SDET');
      expect(url).toContain('geoId=106093475');
      expect(url).toContain('sortBy=DD');
      expect(url).toContain('f_TPR=r86400');
    });
  });
});
