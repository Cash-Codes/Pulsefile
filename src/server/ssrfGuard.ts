import dns from 'node:dns/promises';
import net from 'node:net';

export type SsrfErrorCode = 'invalid_url' | 'invalid_scheme' | 'private_ip' | 'dns_failure';

export class SsrfError extends Error {
  constructor(public readonly code: SsrfErrorCode, message: string) {
    super(message);
    this.name = 'SsrfError';
  }
}

export interface ValidatedUrl {
  original: string;
  host: string;
  port: number;
  scheme: 'http' | 'https';
  pathname: string;
  /**
   * The resolved IP from DNS. Callers MUST connect to this IP and pass `host`
   * as the `Host` header / SNI - re-resolving DNS at request time defeats
   * the rebind window this guard protects against.
   */
  resolvedIp: string;
}

const PRIVATE_V4_STRING_PREFIXES = ['0.', '10.', '127.', '169.254.', '192.168.'];

function startsWithAnyPrefix(addr: string, prefixes: string[]): boolean {
  return prefixes.some((p) => addr.startsWith(p));
}

function isPrivateV4(addr: string): boolean {
  if (startsWithAnyPrefix(addr, PRIVATE_V4_STRING_PREFIXES)) return true;
  // 172.16.0.0/12 - covers 172.16.0.0 through 172.31.255.255
  if (addr.startsWith('172.')) {
    const second = Number(addr.split('.')[1]);
    if (second >= 16 && second <= 31) return true;
  }
  // 100.64.0.0/10 - carrier-grade NAT (100.64.0.0-100.127.255.255)
  if (addr.startsWith('100.')) {
    const second = Number(addr.split('.')[1]);
    if (second >= 64 && second <= 127) return true;
  }
  // Multicast 224.0.0.0/4 and reserved 240.0.0.0/4 (incl. 255.255.255.255)
  const firstOctet = Number(addr.split('.')[0]);
  if (firstOctet >= 224) return true;
  return false;
}

function isPrivateV6(addr: string): boolean {
  const lower = addr.toLowerCase();
  if (lower === '::1') return true;
  // Unspecified address ::
  if (lower === '::' || lower === '::0') return true;
  // fc00::/7 - first byte 0xfc or 0xfd
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  // fe80::/10 link-local
  if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true;
  return false;
}

function extractMappedV4(addr: string): string | null {
  // IPv4-mapped IPv6: ::ffff:0:0/96. Two textual forms:
  //   - ::ffff:c0a8:0001 (hex pairs)
  //   - ::ffff:192.168.0.1 (mixed)
  const lower = addr.toLowerCase();
  const m1 = lower.match(/^::ffff:([0-9.]+)$/);
  if (m1 && m1[1]) return m1[1];
  const m2 = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (m2 && m2[1] && m2[2]) {
    const hi = parseInt(m2[1], 16);
    const lo = parseInt(m2[2], 16);
    return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
  }
  return null;
}

export async function validateAndPin(input: string): Promise<ValidatedUrl> {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new SsrfError('invalid_url', `Could not parse URL: ${input}`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new SsrfError('invalid_scheme', `Only http/https allowed, got ${parsed.protocol}`);
  }
  const scheme = parsed.protocol === 'https:' ? 'https' : 'http';
  const port = parsed.port ? Number(parsed.port) : (scheme === 'https' ? 443 : 80);
  const hostRaw = parsed.hostname;
  const host = hostRaw.startsWith('[') && hostRaw.endsWith(']') ? hostRaw.slice(1, -1) : hostRaw;

  let address: string;
  let family: number;
  if (net.isIP(host)) {
    address = host;
    family = net.isIPv6(host) ? 6 : 4;

    if (family === 4 && isPrivateV4(address)) {
      throw new SsrfError('private_ip', `Refusing to connect to private IP ${address}`);
    }
    if (family === 6) {
      const mapped = extractMappedV4(address);
      if (mapped && isPrivateV4(mapped)) {
        throw new SsrfError('private_ip', `Refusing to connect to IPv4-mapped private IP ${mapped}`);
      }
      if (isPrivateV6(address)) {
        throw new SsrfError('private_ip', `Refusing to connect to private IP ${address}`);
      }
    }
  } else {
    let looked: Array<{ address: string; family: number }>;
    try {
      looked = await dns.lookup(host, { all: true });
    } catch (e) {
      throw new SsrfError('dns_failure', `DNS lookup failed for ${host}`);
    }
    for (const entry of looked) {
      if (entry.family === 4 && isPrivateV4(entry.address)) {
        throw new SsrfError('private_ip', `Refusing to connect: ${host} resolves to private IP ${entry.address}`);
      }
      if (entry.family === 6) {
        const mapped = extractMappedV4(entry.address);
        if (mapped && isPrivateV4(mapped)) {
          throw new SsrfError('private_ip', `Refusing to connect: ${host} resolves to IPv4-mapped private IP ${mapped}`);
        }
        if (isPrivateV6(entry.address)) {
          throw new SsrfError('private_ip', `Refusing to connect: ${host} resolves to private IPv6 ${entry.address}`);
        }
      }
    }
    const first = looked[0];
    if (!first) {
      throw new SsrfError('dns_failure', `DNS lookup returned no addresses for ${host}`);
    }
    address = first.address;
    family = first.family;
  }

  return {
    original: input,
    host,
    port,
    scheme,
    pathname: parsed.pathname + parsed.search,
    resolvedIp: address,
  };
}
