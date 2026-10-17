/**
 * KindLink Visitor IP Extraction & Network Prefix Utilities
 *
 * Requirements:
 * 1. Extract real client IP from Render / proxy forwarding headers:
 *    - x-forwarded-for (left-most non-private IP)
 *    - x-real-ip
 *    - socket remote address
 * 2. Handle IPv4 and IPv6.
 * 3. Ignore private, loopback (127.0.0.1, ::1), and CGNAT addresses:
 *    - 10.0.0.0/8
 *    - 172.16.0.0/12
 *    - 192.168.0.0/16
 *    - 100.64.0.0/10 (CGNAT)
 *    - 127.0.0.0/8 (Loopback)
 *    - 169.254.0.0/16 (Link-local)
 *    - fc00::/7 (IPv6 ULA)
 *    - fe80::/10 (IPv6 Link-Local)
 * 4. Network prefix extraction:
 *    - IPv4: /24 (e.g. 203.0.113.0/24)
 *    - IPv6: /48 (e.g. 2001:db8:85a3::/48)
 * 5. Strict privacy invariant: Never persist the full IP address.
 */

// Type definition for request or headers object
export interface RequestLike {
  headers: Headers | Record<string, string | string[] | undefined>;
  ip?: string;
}

/**
 * Checks if a string is a valid IPv4 address.
 */
export function isIPv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return false;
    const n = parseInt(part, 10);
    if (n < 0 || n > 255) return false;
    if (part.length > 1 && part.startsWith('0')) return false; // no leading zero
  }
  return true;
}

/**
 * Checks if a string is a valid IPv6 address.
 */
export function isIPv6(ip: string): boolean {
  if (ip.includes('.')) {
    // IPv4-mapped IPv6 like ::ffff:192.168.1.1
    if (ip.startsWith('::ffff:')) {
      return isIPv4(ip.slice(7));
    }
    return false;
  }
  const parts = ip.split(':');
  if (parts.length < 3 || parts.length > 8) return false;
  const emptyParts = parts.filter((p) => p === '');
  if (emptyParts.length > 2) return false;
  if (emptyParts.length > 0 && !ip.includes('::')) return false;

  for (const part of parts) {
    if (part === '') continue;
    if (!/^[0-9a-fA-F]{1,4}$/.test(part)) return false;
  }
  return true;
}

/**
 * Strips port from IPv4 (e.g. 1.2.3.4:8080) or IPv6 (e.g. [2001:db8::1]:443).
 */
export function cleanIp(rawIp: string): string {
  let ip = rawIp.trim();
  // Check bracketed IPv6 with port
  if (ip.startsWith('[') && ip.includes(']')) {
    const endBracket = ip.indexOf(']');
    return ip.slice(1, endBracket);
  }
  // Check IPv4 with port: contains exactly one ':' and dots
  if (ip.includes('.') && ip.includes(':') && ip.split(':').length === 2) {
    return ip.split(':')[0].trim();
  }
  return ip;
}

/**
 * Determines whether an IP is private, loopback, CGNAT, link-local, or reserved.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  const cleaned = cleanIp(ip);

  // Check IPv4-mapped IPv6
  if (cleaned.startsWith('::ffff:')) {
    return isPrivateOrReservedIp(cleaned.slice(7));
  }

  // IPv4 checks
  if (isIPv4(cleaned)) {
    const octets = cleaned.split('.').map((p) => parseInt(p, 10));
    const [b0, b1] = octets;

    // 0.0.0.0/8 - "This network"
    if (b0 === 0) return true;

    // 10.0.0.0/8 - Private
    if (b0 === 10) return true;

    // 100.64.0.0/10 - Carrier-Grade NAT (CGNAT) 100.64.0.0 – 100.127.255.255
    if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;

    // 127.0.0.0/8 - Loopback
    if (b0 === 127) return true;

    // 169.254.0.0/16 - Link-local
    if (b0 === 169 && b1 === 254) return true;

    // 172.16.0.0/12 - Private (172.16.0.0 – 172.31.255.255)
    if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;

    // 192.168.0.0/16 - Private
    if (b0 === 192 && b1 === 168) return true;

    // 198.18.0.0/15 - Benchmarking
    if (b0 === 198 && (b1 === 18 || b1 === 19)) return true;

    // 224.0.0.0/4 - Multicast
    if (b0 >= 224 && b0 <= 239) return true;

    // 240.0.0.0/4 - Reserved (includes 255.255.255.255 broadcast)
    if (b0 >= 240) return true;

    return false;
  }

  // IPv6 checks
  if (isIPv6(cleaned)) {
    const lower = cleaned.toLowerCase();

    // Loopback ::1 or unspecified ::
    if (lower === '::1' || lower === '::' || lower === '0:0:0:0:0:0:0:1') return true;

    // Unique Local Addresses (fc00::/7 - starts with fc or fd)
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;

    // Link-local unicast (fe80::/10 - starts with fe8, fe9, fea, feb)
    if (/^fe[89ab]/i.test(lower)) return true;

    // Multicast (ff00::/8)
    if (lower.startsWith('ff')) return true;

    // Discard prefix (100::/64)
    if (lower.startsWith('100:')) return true;

    // Documentation / example prefix (2001:db8::/32)
    if (lower.startsWith('2001:db8:') || lower === '2001:db8::') return true;

    return false;
  }

  // If neither valid IPv4 nor IPv6, treat as invalid/reserved
  return true;
}

/**
 * Extracts the real client IP from incoming request or headers.
 * Looks for:
 * 1. x-forwarded-for: left-most non-private IP
 * 2. x-real-ip
 * 3. socket / connection remote address (if provided in Request)
 *
 * Returns null if no valid public IP is found.
 */
export function getClientIp(
  request: RequestLike | Request | Headers | { headers: Headers | Record<string, string | string[] | undefined>; ip?: string }
): string | null {
  let headers: Headers | null = null;
  let directIp: string | null = null;

  if (request instanceof Headers) {
    headers = request;
  } else if ('headers' in request && request.headers) {
    if (request.headers instanceof Headers) {
      headers = request.headers;
    } else {
      // Record<string, string | string[] | undefined>
      const map = new Map<string, string>();
      for (const [k, v] of Object.entries(request.headers)) {
        if (typeof v === 'string') {
          map.set(k.toLowerCase(), v);
        } else if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'string') {
          map.set(k.toLowerCase(), v[0]);
        }
      }
      headers = {
        get: (name: string) => map.get(name.toLowerCase()) || null,
      } as unknown as Headers;
    }
  }

  if ('ip' in request && typeof (request as { ip?: string }).ip === 'string') {
    directIp = (request as { ip?: string }).ip || null;
  }

  if (headers) {
    // 1. Check x-forwarded-for (can contain a chain: "client, proxy1, proxy2")
    const xForwardedFor = headers.get('x-forwarded-for');
    if (xForwardedFor) {
      const candidates = xForwardedFor.split(',').map((s) => cleanIp(s.trim()));
      for (const candidate of candidates) {
        if (candidate && !isPrivateOrReservedIp(candidate)) {
          return candidate;
        }
      }
    }

    // 2. Check x-real-ip
    const xRealIp = headers.get('x-real-ip');
    if (xRealIp) {
      const cleaned = cleanIp(xRealIp.trim());
      if (cleaned && !isPrivateOrReservedIp(cleaned)) {
        return cleaned;
      }
    }

    // 3. Check cf-connecting-ip / fastly-client-ip
    const cfIp = headers.get('cf-connecting-ip') || headers.get('true-client-ip');
    if (cfIp) {
      const cleaned = cleanIp(cfIp.trim());
      if (cleaned && !isPrivateOrReservedIp(cleaned)) {
        return cleaned;
      }
    }
  }

  // 4. Check direct IP from request object
  if (directIp) {
    const cleaned = cleanIp(directIp.trim());
    if (cleaned && !isPrivateOrReservedIp(cleaned)) {
      return cleaned;
    }
  }

  return null;
}

/**
 * Expands an IPv6 address into 8 fully-padded 4-hex-digit groups.
 */
function expandIPv6(ip: string): string[] | null {
  let cleaned = cleanIp(ip).toLowerCase();
  if (cleaned.startsWith('::ffff:')) {
    return null; // IPv4 mapped
  }

  const parts = cleaned.split('::');
  if (parts.length > 2) return null;

  let left = parts[0] ? parts[0].split(':').filter(Boolean) : [];
  let right = parts[1] ? parts[1].split(':').filter(Boolean) : [];

  if (parts.length === 2) {
    const missing = 8 - (left.length + right.length);
    const middle = new Array(missing).fill('0000');
    const full = [...left, ...middle, ...right];
    return full.map((h) => h.padStart(4, '0'));
  }

  if (left.length === 8) {
    return left.map((h) => h.padStart(4, '0'));
  }

  return null;
}

/**
 * Computes network prefix for IP caching and rate-limiting:
 * - IPv4: /24 (e.g. 203.0.113.195 -> 203.0.113.0/24)
 * - IPv6: /48 (e.g. 2001:db8:85a3:8d3::1 -> 2001:db8:85a3::/48)
 *
 * Ensures privacy invariant: full IP address is NEVER stored in cache.
 */
export function getIpNetworkPrefix(ip: string): string {
  const cleaned = cleanIp(ip);

  // Check IPv4-mapped IPv6
  if (cleaned.startsWith('::ffff:')) {
    return getIpNetworkPrefix(cleaned.slice(7));
  }

  // IPv4 -> /24
  if (isIPv4(cleaned)) {
    const octets = cleaned.split('.');
    return `${octets[0]}.${octets[1]}.${octets[2]}.0/24`;
  }

  // IPv6 -> /48
  if (isIPv6(cleaned)) {
    const expanded = expandIPv6(cleaned);
    if (expanded && expanded.length >= 3) {
      // First 3 groups of 16-bits = 48 bits
      const g0 = parseInt(expanded[0], 16).toString(16);
      const g1 = parseInt(expanded[1], 16).toString(16);
      const g2 = parseInt(expanded[2], 16).toString(16);
      return `${g0}:${g1}:${g2}::/48`;
    }
    // Fallback: take first 3 segments
    const parts = cleaned.split(':').filter(Boolean);
    const prefix = parts.slice(0, 3).join(':');
    return `${prefix}::/48`;
  }

  // Fallback
  return cleaned;
}
