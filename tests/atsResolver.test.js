import { describe, it, expect } from 'vitest';
const {
  resolveApplicationPortal,
  detectAtsProvider,
  matchesHostname
} = require('../src/atsResolver');

describe('ATS & Career Portal Direct Resolution', () => {
  describe('detectAtsProvider (Strict Parsed-Hostname Matching)', () => {
    it('accurately identifies major ATS providers from exact hostnames and subdomains', () => {
      expect(detectAtsProvider('https://boards.greenhouse.io/duolingo/jobs/12345')).toBe('greenhouse');
      expect(detectAtsProvider('https://job-boards.greenhouse.io/snowflake/jobs/678')).toBe('greenhouse');
      expect(detectAtsProvider('https://jobs.lever.co/company/abc-123')).toBe('lever');
      expect(detectAtsProvider('https://pnc.wd5.myworkdayjobs.com/PNC/job/123')).toBe('workday');
      expect(detectAtsProvider('https://jobs.smartrecruiters.com/ServiceNow/456')).toBe('smartrecruiters');
      expect(detectAtsProvider('https://jobs.ashbyhq.com/org/789')).toBe('ashby');
      expect(detectAtsProvider('https://careers-us.icims.com/jobs/101')).toBe('icims');
    });

    it('strictly prevents attacker domain bypasses such as greenhouse.io.attacker.example', () => {
      expect(detectAtsProvider('https://greenhouse.io.attacker.example/job/123')).toBeNull();
      expect(detectAtsProvider('https://lever.co.phishing.site/job')).toBeNull();
      expect(detectAtsProvider('https://myworkdayjobs.com.fake.org/test')).toBeNull();
    });
  });

  describe('matchesHostname helper', () => {
    it('matches exact domain and valid subdomains only', () => {
      expect(matchesHostname('boards.greenhouse.io', 'greenhouse.io')).toBe(true);
      expect(matchesHostname('greenhouse.io', 'greenhouse.io')).toBe(true);
      expect(matchesHostname('attacker-greenhouse.io', 'greenhouse.io')).toBe(false);
      expect(matchesHostname('greenhouse.io.attacker.com', 'greenhouse.io')).toBe(false);
    });
  });

  describe('resolveApplicationPortal', () => {
    it('resolves direct ATS portal from company registry for Duolingo', () => {
      const portal = resolveApplicationPortal('Duolingo', 'Senior SDET');
      expect(portal.provider).toBe('greenhouse');
      expect(portal.applyUrl).toContain('boards.greenhouse.io/duolingo');
      expect(portal.confidence).toBeGreaterThanOrEqual(0.90);
    });

    it('resolves verified Workday career portal for PNC Bank', () => {
      const portal = resolveApplicationPortal('PNC Bank', 'Quality Engineer');
      expect(portal.provider).toBe('workday');
      expect(portal.applyUrl).toBe('https://careers.pnc.com/');
      expect(portal.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('falls back safely to Google career search for unknown companies', () => {
      const portal = resolveApplicationPortal('Random New Startup', 'SDET Lead');
      expect(portal.provider).toBe('google-jobs-search');
      expect(portal.applyUrl).toContain('https://www.google.com/search?q=');
      expect(portal.confidence).toBe(0.60);
    });
  });
});
