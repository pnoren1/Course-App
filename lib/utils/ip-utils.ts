/**
 * IP utility functions for the IP-restriction feature.
 *
 * All functions are pure TypeScript with no external imports so they are
 * safe to use in both Node.js API routes and the Next.js Edge Runtime
 * (middleware).
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Converts a dotted-decimal IPv4 string to a 32-bit unsigned integer.
 * Returns NaN if the string is not a valid IPv4 address.
 */
function ipToUint32(ip: string): number {
  const parts = ip.split('.');
  if (parts.length !== 4) return NaN;
  let result = 0;
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return NaN;
    const octet = parseInt(part, 10);
    if (octet < 0 || octet > 255) return NaN;
    result = (result * 256 + octet) >>> 0;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extracts the client IP address from an incoming Request.
 *
 * Reads `x-forwarded-for` (first entry) first, then `x-real-ip`.
 * Returns `null` when neither header is present.
 *
 * @param request - The incoming HTTP Request object.
 */
export function extractClientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    const trimmed = realIp.trim();
    if (trimmed) return trimmed;
  }

  return null;
}

/**
 * Checks whether an IPv4 address matches a given pattern.
 *
 * Supports two pattern formats:
 * - Exact match:  `"192.168.1.5"`
 * - CIDR range:   `"10.0.0.0/24"`
 *
 * Returns `false` for any malformed input rather than throwing.
 *
 * @param ip      - The client IP address to test.
 * @param pattern - An exact IPv4 address or a CIDR notation string.
 */
export function ipMatchesPattern(ip: string, pattern: string): boolean {
  try {
    const slashIndex = pattern.indexOf('/');

    if (slashIndex === -1) {
      // Exact match
      return ip.trim() === pattern.trim();
    }

    // CIDR match
    const networkAddress = pattern.slice(0, slashIndex);
    const prefixLengthStr = pattern.slice(slashIndex + 1);

    if (!/^\d+$/.test(prefixLengthStr)) return false;
    const prefixLength = parseInt(prefixLengthStr, 10);
    if (prefixLength < 0 || prefixLength > 32) return false;

    const ipInt = ipToUint32(ip.trim());
    const networkInt = ipToUint32(networkAddress.trim());

    if (isNaN(ipInt) || isNaN(networkInt)) return false;

    if (prefixLength === 0) return true; // 0.0.0.0/0 matches everything

    const mask = (0xffffffff << (32 - prefixLength)) >>> 0;
    return (ipInt & mask) >>> 0 === (networkInt & mask) >>> 0;
  } catch {
    return false;
  }
}

/**
 * Returns `true` when the given IP address matches at least one of the
 * provided patterns.  An empty `patterns` array always returns `false`.
 *
 * @param ip       - The client IP address to test.
 * @param patterns - Array of exact IPv4 addresses or CIDR strings.
 */
export function isIpAllowed(ip: string, patterns: string[]): boolean {
  return patterns.some((pattern) => ipMatchesPattern(ip, pattern));
}

/**
 * Validates that `pattern` is a syntactically valid IPv4 address or CIDR
 * notation string, suitable for storage in `group_ip_allowlist.ip_pattern`.
 *
 * Accepts:
 * - Exact address: `"192.168.1.1"` (all octets 0–255)
 * - CIDR range:    `"10.0.0.0/24"` (prefix length 0–32)
 *
 * @param pattern - The string to validate.
 */
export function isValidIpPattern(pattern: string): boolean {
  const trimmed = pattern.trim();
  const slashIndex = trimmed.indexOf('/');

  if (slashIndex === -1) {
    // Must be a valid IPv4 address
    return isValidIpv4(trimmed);
  }

  // CIDR: validate both parts
  const address = trimmed.slice(0, slashIndex);
  const prefixStr = trimmed.slice(slashIndex + 1);

  if (!isValidIpv4(address)) return false;
  if (!/^\d+$/.test(prefixStr)) return false;

  const prefix = parseInt(prefixStr, 10);
  return prefix >= 0 && prefix <= 32;
}

/** Returns true for a valid dotted-decimal IPv4 address string. */
function isValidIpv4(address: string): boolean {
  // Must match x.x.x.x where each x is a decimal number
  if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(address)) return false;
  return address.split('.').every((part) => {
    const n = parseInt(part, 10);
    return n >= 0 && n <= 255;
  });
}
