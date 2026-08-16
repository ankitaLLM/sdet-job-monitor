import { describe, it, expect } from 'vitest';
const {
  resolveApplicationPortal,
  detectAtsProvider,
  isSafeHttpsUrl
} = require('../src/atsResolver');

describe('ATS & Career Portal Direct Resolution', () => {
  describe('detectAtsProvider', () => {
    it('accurately identifies major ATS providers from URL patterns', () => {
      expect(detectAtsProvider('https://boards.greenhouse.io/duolingo/jobs/12345')).toBe('greenhouse');
      expect(detectAtsProvider('https://jobs.lever.co/company/abc-123')).toBe('lever');
      expect(detectAtsProvider('https://pnc.wd5.myworkdayjobs.com/PNC/job/123')).toBe('workday');
      expect(detectAtsProvider('https://jobs.smartrecruiters.com/ServiceNow/456')).toBe('smartrecruiters');
      expect(detectAtsProvider('https://jobs.ashbyhq.com/org/789')).toBe('ashby');
      expect(detectAtsProvider('https://careers-us.icims.com/jobs/101')).toBe('icims');
      expect(detectAtsProvider('https://example.com')).toBeNull();
    });
  });

  describe('isSafeHttpsUrl (SSRF Guard)', () => {
    it('accepts legitimate public HTTPS URLs', () => {
      expect(isSafeHttpsUrl('https://boards.greenhouse.io/duolingo')).toBe(true);
      expect(isSafeHttpsUrl('https://careers.pnc.com/job/123')).toBe(true);
    });

    it('rejects HTTP, private IP, localhost, and link-local destinations', () => {
      expect(isSafeHttpsUrl('http://insecure.com')).toBe(false);
      expect(isSafeHttpsUrl('https://localhost:3000')).toBe(false);
      expect(isSafeHttpsUrl('https://127.0.0.1/admin')).toBe(false);
      expect(isSafeHttpsUrl('https://192.168.1.1/')).toBe(false);
      expect(isSafeHttpsUrl('https://10.0.0.1/')).toBe(false);
      expect(isSafeHttpsUrl('https://169.254.169.254/latest/meta-data')).toBe(false);
      expect(isSafeHttpsUrl('javascript:alert(1)')).toBe(false);
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
