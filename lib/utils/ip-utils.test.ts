import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  extractClientIp,
  ipMatchesPattern,
  isIpAllowed,
  isValidIpPattern,
} from './ip-utils';

// ---------------------------------------------------------------------------
// ipMatchesPattern
// ---------------------------------------------------------------------------
describe('ipMatchesPattern', () => {
  // Acceptance-criteria cases
  it('exact match — same address returns true', () => {
    expect(ipMatchesPattern('192.168.1.5', '192.168.1.5')).toBe(true);
  });

  it('exact match — different address returns false', () => {
    expect(ipMatchesPattern('192.168.1.6', '192.168.1.5')).toBe(false);
  });

  it('CIDR /24 — address inside range returns true', () => {
    expect(ipMatchesPattern('10.0.0.5', '10.0.0.0/24')).toBe(true);
  });

  it('CIDR /24 — address outside range returns false', () => {
    expect(ipMatchesPattern('10.0.1.1', '10.0.0.0/24')).toBe(false);
  });

  it('CIDR /0 — 0.0.0.0/0 matches every address', () => {
    expect(ipMatchesPattern('0.0.0.0', '0.0.0.0/0')).toBe(true);
    expect(ipMatchesPattern('192.168.1.1', '0.0.0.0/0')).toBe(true);
    expect(ipMatchesPattern('255.255.255.255', '0.0.0.0/0')).toBe(true);
  });

  // Additional boundary cases
  it('CIDR /32 — exact host match', () => {
    expect(ipMatchesPattern('10.0.0.1', '10.0.0.1/32')).toBe(true);
    expect(ipMatchesPattern('10.0.0.2', '10.0.0.1/32')).toBe(false);
  });

  it('CIDR /8 — class-A network', () => {
    expect(ipMatchesPattern('10.1.2.3', '10.0.0.0/8')).toBe(true);
    expect(ipMatchesPattern('11.0.0.1', '10.0.0.0/8')).toBe(false);
  });

  it('CIDR /16 — class-B network', () => {
    expect(ipMatchesPattern('172.16.0.1', '172.16.0.0/16')).toBe(true);
    expect(ipMatchesPattern('172.17.0.1', '172.16.0.0/16')).toBe(false);
  });

  // Malformed inputs should return false, not throw
  it('malformed ip — returns false without throwing', () => {
    expect(ipMatchesPattern('not-an-ip', '10.0.0.0/24')).toBe(false);
  });

  it('malformed pattern — returns false without throwing', () => {
    expect(ipMatchesPattern('10.0.0.1', 'not-a-pattern')).toBe(false);
  });

  it('prefix > 32 — returns false', () => {
    expect(ipMatchesPattern('10.0.0.1', '10.0.0.0/33')).toBe(false);
  });

  it('octet out of range in ip — returns false', () => {
    expect(ipMatchesPattern('256.0.0.1', '256.0.0.0/24')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isIpAllowed
// ---------------------------------------------------------------------------
describe('isIpAllowed', () => {
  it('returns true when IP matches one of the patterns', () => {
    expect(isIpAllowed('10.0.0.5', ['192.168.1.0/24', '10.0.0.0/24'])).toBe(true);
  });

  it('returns false when IP matches none of the patterns', () => {
    expect(isIpAllowed('172.16.0.1', ['192.168.1.0/24', '10.0.0.0/24'])).toBe(false);
  });

  it('returns false for an empty patterns array', () => {
    expect(isIpAllowed('10.0.0.1', [])).toBe(false);
  });

  it('returns true for exact-match entry in list', () => {
    expect(isIpAllowed('192.168.1.5', ['192.168.1.5', '10.0.0.0/8'])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isValidIpPattern
// ---------------------------------------------------------------------------
describe('isValidIpPattern', () => {
  // Acceptance-criteria cases
  it('valid exact IPv4 address returns true', () => {
    expect(isValidIpPattern('192.168.1.1')).toBe(true);
  });

  it('valid CIDR notation returns true', () => {
    expect(isValidIpPattern('10.0.0.0/24')).toBe(true);
  });

  it('octet out of range returns false', () => {
    expect(isValidIpPattern('999.0.0.1')).toBe(false);
  });

  it('non-IP string returns false', () => {
    expect(isValidIpPattern('not-an-ip')).toBe(false);
  });

  // Additional cases
  it('CIDR with prefix 0 is valid', () => {
    expect(isValidIpPattern('0.0.0.0/0')).toBe(true);
  });

  it('CIDR with prefix 32 is valid', () => {
    expect(isValidIpPattern('10.0.0.1/32')).toBe(true);
  });

  it('CIDR with prefix > 32 is invalid', () => {
    expect(isValidIpPattern('10.0.0.0/33')).toBe(false);
  });

  it('missing octets is invalid', () => {
    expect(isValidIpPattern('192.168.1')).toBe(false);
  });

  it('IPv6 address is invalid (not supported)', () => {
    expect(isValidIpPattern('::1')).toBe(false);
  });

  it('empty string is invalid', () => {
    expect(isValidIpPattern('')).toBe(false);
  });

  it('boundary octets 0 and 255 are valid', () => {
    expect(isValidIpPattern('0.0.0.0')).toBe(true);
    expect(isValidIpPattern('255.255.255.255')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// extractClientIp
// ---------------------------------------------------------------------------
describe('extractClientIp', () => {
  function makeRequest(headers: Record<string, string>): Request {
    return new Request('http://localhost/', { headers });
  }

  it('returns first IP from x-forwarded-for', () => {
    const req = makeRequest({ 'x-forwarded-for': '10.0.0.1, 10.0.0.2' });
    expect(extractClientIp(req)).toBe('10.0.0.1');
  });

  it('returns IP from x-real-ip when x-forwarded-for is absent', () => {
    const req = makeRequest({ 'x-real-ip': '172.16.0.5' });
    expect(extractClientIp(req)).toBe('172.16.0.5');
  });

  it('prefers x-forwarded-for over x-real-ip', () => {
    const req = makeRequest({
      'x-forwarded-for': '192.168.1.10',
      'x-real-ip': '10.0.0.1',
    });
    expect(extractClientIp(req)).toBe('192.168.1.10');
  });

  it('returns null when no IP headers are present', () => {
    const req = makeRequest({});
    expect(extractClientIp(req)).toBeNull();
  });

  it('trims whitespace from extracted IP', () => {
    const req = makeRequest({ 'x-forwarded-for': '  10.0.0.1  ' });
    expect(extractClientIp(req)).toBe('10.0.0.1');
  });
});

// ---------------------------------------------------------------------------
// Property-based tests (fast-check)
// ---------------------------------------------------------------------------
describe('ipMatchesPattern — property tests', () => {
  const ipArb = fc.tuple(
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
  ).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`);

  it('an IP always matches its own exact pattern', () => {
    fc.assert(
      fc.property(ipArb, (ip) => {
        expect(ipMatchesPattern(ip, ip)).toBe(true);
      }),
    );
  });

  it('0.0.0.0/0 always matches any valid IPv4', () => {
    fc.assert(
      fc.property(ipArb, (ip) => {
        expect(ipMatchesPattern(ip, '0.0.0.0/0')).toBe(true);
      }),
    );
  });
});
