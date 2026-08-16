import { describe, it, expect } from 'vitest';

function sanitizeCsvCell(str) {
  if (!str) return '""';
  let val = String(str);
  if (/^[=+\-@\t\r]/.test(val)) {
    val = "'" + val;
  }
  return `"${val.replace(/"/g, '""')}"`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

describe('Security Utilities & Sanitization', () => {
  describe('sanitizeCsvCell (CSV Formula Injection / DDE Prevention)', () => {
    it('escapes leading formula characters (=, +, -, @) with single quote prefix', () => {
      expect(sanitizeCsvCell('=cmd|"/C calc"!A0')).toBe(`"'=cmd|""/C calc""!A0"`);
      expect(sanitizeCsvCell('+12345')).toBe(`"'+12345"`);
      expect(sanitizeCsvCell('-500')).toBe(`"'-500"`);
      expect(sanitizeCsvCell('@SUM(1+1)')).toBe(`"'@SUM(1+1)"`);
    });

    it('wraps safe text in double quotes and escapes internal double quotes', () => {
      expect(sanitizeCsvCell('Senior SDET, "Lead"')).toBe(`"Senior SDET, ""Lead"""`);
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
    });
  });
});
