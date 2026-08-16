import { describe, it, expect } from 'vitest';
const {
  escapeHtml,
  sanitizeCsvCell,
  isPrivateIp,
  isSafeIpOrHostname,
  sanitizeSafeHttpsUrl
} = require('../src/security');

describe('Canonical Security Utilities (src/security.js)', () => {
  describe('sanitizeCsvCell (CSV Formula Injection / DDE Prevention)', () => {
    it('escapes leading formula characters (=, +, -, @, \\t, \\r) with single quote prefix', () => {
      expect(sanitizeCsvCell('=cmd|"/C calc"!A0')).toBe(`"'=cmd|""/C calc""!A0"`);
      expect(sanitizeCsvCell('+12345')).toBe(`"'+12345"`);
      expect(sanitizeCsvCell('-500')).toBe(`"'-500"`);
      expect(sanitizeCsvCell('@SUM(1+1)')).toBe(`"'@SUM(1+1)"`);
      expect(sanitizeCsvCell('\tTabInjected')).toBe(`"'\tTabInjected"`);
    });

    it('wraps safe text in double quotes and escapes internal double quotes', () => {
      expect(sanitizeCsvCell('Senior SDET, "Lead"')).toBe(`"Senior SDET, ""Lead"""`);
    });

    it('handles null and undefined safely', () => {
      expect(sanitizeCsvCell(null)).toBe('""');
      expect(sanitizeCsvCell(undefined)).toBe('""');
    });
  });

  describe('escapeHtml (XSS Prevention)', () => {
    it('escapes HTML tags, quotes, and ampersands', () => {
      const malicious = '<script>alert("XSS")</script>&foo=\'bar\'';
      const escaped = escapeHtml(malicious);
      expect(escaped).not.toContain('<script>');
      expect(escaped).toContain('&lt;script&gt;');
      expect(escaped).toContain('&amp;');
      expect(escaped).toContain('&quot;');
      expect(escaped).toContain('&#039;');
    });

    it('handles null and undefined safely', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });
  });

  describe('isPrivateIp (IPv4 and IPv6 CIDR verification)', () => {
    it('identifies 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.0.0/16', () => {
      expect(isPrivateIp('10.0.0.1')).toBe(true);
      expect(isPrivateIp('10.255.255.255')).toBe(true);
      expect(isPrivateIp('172.16.0.1')).toBe(true);
      expect(isPrivateIp('172.31.255.254')).toBe(true);
      expect(isPrivateIp('172.32.0.1')).toBe(false); // Public range
      expect(isPrivateIp('192.168.1.1')).toBe(true);
      expect(isPrivateIp('127.0.0.1')).toBe(true);
      expect(isPrivateIp('169.254.169.254')).toBe(true);
      expect(isPrivateIp('0.0.0.0')).toBe(true);
    });

    it('identifies IPv6 loopback, link-local, and unique local addresses', () => {
      expect(isPrivateIp('::1')).toBe(true);
      expect(isPrivateIp('fe80::1')).toBe(true);
      expect(isPrivateIp('fc00::1')).toBe(true);
      expect(isPrivateIp('fd12:3456:789a::1')).toBe(true);
    });

    it('allows public IP addresses', () => {
      expect(isPrivateIp('8.8.8.8')).toBe(false);
      expect(isPrivateIp('142.250.190.46')).toBe(false);
    });
  });

  describe('isSafeIpOrHostname & sanitizeSafeHttpsUrl', () => {
    it('accepts legitimate public HTTPS URLs', () => {
      expect(isSafeIpOrHostname('https://boards.greenhouse.io/duolingo')).toBe(true);
      expect(sanitizeSafeHttpsUrl('https://boards.greenhouse.io/duolingo')).toBe('https://boards.greenhouse.io/duolingo');
    });

    it('rejects HTTP, localhost, private IPs, and malicious schemes', () => {
      expect(isSafeIpOrHostname('http://boards.greenhouse.io')).toBe(false);
      expect(isSafeIpOrHostname('https://localhost:3000')).toBe(false);
      expect(isSafeIpOrHostname('https://127.0.0.1/admin')).toBe(false);
      expect(isSafeIpOrHostname('https://169.254.169.254/latest/meta-data')).toBe(false);
      expect(sanitizeSafeHttpsUrl('javascript:alert(1)')).toBe('#');
    });
  });
});
