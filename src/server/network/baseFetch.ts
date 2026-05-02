import { Agent, request, getGlobalDispatcher } from 'undici';
import net from 'node:net';
import dns from 'node:dns';
import type { ValidatedUrl } from '../ssrfGuard.js';

export interface TimingBreakdown {
  dnsMs: number;
  tcpMs: number;
  tlsMs: number;
  ttfbMs: number;
  totalMs: number;
}

export interface BaseFetchResult {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  bodyBytes: number;
  timing: TimingBreakdown;
}

export interface BaseFetchOpts {
  timeoutMs: number;
}

const MAX_BODY_BYTES = 1_000_000; // 1 MB cap

/**
 * Build an undici Agent that pins DNS resolution for the target host.
 * Any other host (e.g., during tests using MockAgent) falls through to the
 * default node:dns lookup, so we never accidentally re-resolve the target.
 *
 * In production, this guarantees the connection goes to the IP that the
 * SSRF guard validated, not to whatever DNS returns at request time.
 */
function buildPinnedAgent(target: ValidatedUrl): Agent {
  const pinnedFamily: 4 | 6 = net.isIPv6(target.resolvedIp) ? 6 : 4;
  return new Agent({
    connect: {
      lookup: (hostname, options, callback) => {
        if (hostname === target.host) {
          if (options && (options as any).all) {
            (callback as any)(null, [{ address: target.resolvedIp, family: pinnedFamily }]);
          } else {
            (callback as any)(null, target.resolvedIp, pinnedFamily);
          }
        } else {
          // Defensive fallback - should not be reached for the target host.
          dns.lookup(hostname, options, callback);
        }
      },
    },
  });
}

function buildUrl(target: ValidatedUrl): string {
  const isDefaultPort =
    (target.scheme === 'https' && target.port === 443) ||
    (target.scheme === 'http' && target.port === 80);
  return `${target.scheme}://${target.host}${isDefaultPort ? '' : `:${target.port}`}${target.pathname}`;
}

function normalizeHeaders(raw: Record<string, string | string[] | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined) continue;
    out[key.toLowerCase()] = Array.isArray(value) ? value.join(', ') : value;
  }
  return out;
}

export async function baseFetch(target: ValidatedUrl, opts: BaseFetchOpts): Promise<BaseFetchResult> {
  const url = buildUrl(target);
  const startedAt = performance.now();
  let ttfbMs = 0;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);

  // Use the global dispatcher in tests (where MockAgent has been installed),
  // and a pinned Agent in production.
  const dispatcher =
    process.env.NODE_ENV === 'test' || process.env.VITEST
      ? getGlobalDispatcher()
      : buildPinnedAgent(target);

  try {
    // Note: undici's top-level `request()` does NOT follow redirects by default.
    // We rely on this behavior explicitly - a redirect should be surfaced as a
    // 3xx response so checks can flag it, not silently followed (which would
    // also bypass our SSRF guard for the redirect target).
    const response = await request(url, {
      method: 'GET',
      headers: { 'user-agent': 'pulsefile-pulse/1.0' },
      signal: controller.signal,
      dispatcher,
    });
    ttfbMs = performance.now() - startedAt;

    const chunks: Buffer[] = [];
    let totalBytes = 0;
    for await (const chunk of response.body) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buf.byteLength;
      if (totalBytes <= MAX_BODY_BYTES) chunks.push(buf);
    }

    const totalMs = performance.now() - startedAt;
    const headers = normalizeHeaders(response.headers);

    return {
      statusCode: response.statusCode,
      headers,
      body: Buffer.concat(chunks).toString('utf8'),
      bodyBytes: totalBytes,
      timing: {
        dnsMs: 0,
        tcpMs: 0,
        tlsMs: 0,
        ttfbMs: Math.round(ttfbMs),
        totalMs: Math.round(totalMs),
      },
    };
  } finally {
    clearTimeout(timer);
  }
}
