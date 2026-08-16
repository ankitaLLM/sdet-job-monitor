/**
 * Canonical Security Utilities
 * Centralized sanitization for XSS, CSV formula injection, SSRF, and HTML escaping.
 */

/**
 * Escapes special HTML characters to prevent XSS in DOM and email templates
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitizes CSV cell content to prevent CSV Formula Injection (DDE attacks)
 * Prefixes leading =, +, -, @, \t, \r characters with a single quote.
 */
function sanitizeCsvCell(str) {
  if (str === null || str === undefined) return '""';
  let val = String(str);
  if (/^[=+\-@\t\r]/.test(val)) {
    val = "'" + val;
  }
  return `"${val.replace(/"/g, '""')}"`;
}

/**
 * Validates whether an IP address belongs to a private, loopback, or link-local range.
 */
function isPrivateIp(ipStr) {
  if (!ipStr || typeof ipStr !== 'string') return false;

  // Normalize IPv6 representation
  const cleanIp = ipStr.replace(/^\[|\]$/g, '').toLowerCase();

  // IPv6 checks
  if (cleanIp === '::1' || cleanIp === '::') return true;
  if (cleanIp.startsWith('fe80:') || cleanIp.startsWith('fc00:') || cleanIp.startsWith('fd')) return true;
  if (cleanIp.startsWith('::ffff:')) {
    // IPv4-mapped IPv6
    return isPrivateIp(cleanIp.replace('::ffff:', ''));
  }

  // IPv4 checks
  const parts = cleanIp.split('.').map(p => parseInt(p, 10));
  if (parts.length === 4 && parts.every(p => !isNaN(p) && p >= 0 && p <= 255)) {
    const [a, b] = parts;
    if (a === 0) return true;                           // 0.0.0.0/8
    if (a === 10) return true;                          // 10.0.0.0/8
    if (a === 127) return true;                         // 127.0.0.0/8 (Loopback)
    if (a === 169 && b === 254) return true;            // 169.254.0.0/16 (Link-local)
    if (a === 172 && b >= 16 && b <= 31) return true;   // 172.16.0.0/12 (Private B)
    if (a === 192 && b === 168) return true;           // 192.168.0.0/16 (Private C)
    if (a >= 224) return true;                          // 224.0.0.0/4 (Multicast / Reserved)
  }

  return false;
}

/**
 * SSRF & Hostname Safety Guard
 * Verifies that a URL uses HTTPS and does not point to internal, private, or local targets.
 */
function isSafeIpOrHostname(urlString) {
  if (!urlString || typeof urlString !== 'string') return false;
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'https:') return false;

    const hostname = parsed.hostname.toLowerCase();

    // Check hostnames
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.lan') ||
      hostname.endsWith('.invalid')
    ) {
      return false;
    }

    // Check IP address directly
    if (isPrivateIp(hostname)) {
      return false;
    }

    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Returns a validated HTTPS URL or a safe fallback ('#')
 */
function sanitizeSafeHttpsUrl(url) {
  if (isSafeIpOrHostname(url)) {
    return url;
  }
  return '#';
}

module.exports = {
  escapeHtml,
  sanitizeCsvCell,
  isPrivateIp,
  isSafeIpOrHostname,
  sanitizeSafeHttpsUrl
};
