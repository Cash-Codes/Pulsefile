import { Agent, request, getGlobalDispatcher } from 'undici';
import net from 'node:net';
import dns from 'node:dns';
import type { RedirectsResult, RedirectHop, CheckErrorOutcome } from '../shared/pulseReport.js';
import { validateAndPin, SsrfError, type ValidatedUrl } from '../server/ssrfGuard.js';

export interface TraceOpts {
  maxHops: number;
  timeoutMs: number;
}

/**
 * Build an undici Agent that pins DNS resolution for the target host.
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

export async function traceRedirects(
  startUrl: string,
  opts: TraceOpts,
): Promise<RedirectsResult | CheckErrorOutcome> {
  const hops: RedirectHop[] = [];
  let current = startUrl;
  let capped = false;

  // In tests, MockAgent is installed as the global dispatcher and intercepts
  // requests. The pinned Agent must be bypassed in that path.
  const usePinning = !(process.env.NODE_ENV === 'test' || process.env.VITEST);

  try {
    for (let i = 0; i <= opts.maxHops; i++) {
      // SSRF re-check on every hop - security feature, not optional.
      const validated = await validateAndPin(current);
      const url = buildUrl(validated);

      const startedAt = performance.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
      const dispatcher = usePinning ? buildPinnedAgent(validated) : getGlobalDispatcher();

      let res;
      try {
        res = await request(url, {
          method: 'HEAD',
          headers: { 'user-agent': 'pulsefile-pulse/1.0' },
          signal: controller.signal,
          dispatcher,
        });
      } finally {
        clearTimeout(timer);
      }

      const latencyMs = Math.round(performance.now() - startedAt);
      const code = res.statusCode;
      // Drain body so undici frees the socket.
      for await (const _ of res.body) {
        void _;
      }

      if (code >= 300 && code < 400) {
        const location = Array.isArray(res.headers.location)
          ? res.headers.location[0]
          : res.headers.location;
        if (!location) {
          // 3xx without Location - terminal.
          return { status: 'warn', hops, finalUrl: url, capped: false };
        }
        const next = new URL(location, url).toString();
        if (i === opts.maxHops) {
          capped = true;
          break;
        }
        hops.push({ fromUrl: url, toUrl: next, status: code, latencyMs });
        current = next;
        continue;
      }

      // Terminal (non-3xx).
      return { status: 'ok', hops, finalUrl: url, capped: false };
    }
  } catch (e) {
    if (e instanceof SsrfError) {
      return {
        status: 'error',
        code: `redirect_${e.code}`,
        message: `Redirect chain blocked: ${e.message}`,
      };
    }
    return { status: 'error', code: 'redirect_failed', message: (e as Error).message };
  }

  return {
    status: 'warn',
    hops,
    finalUrl: hops.at(-1)?.toUrl ?? startUrl,
    capped,
  };
}
