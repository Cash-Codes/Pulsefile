import { useEffect, useState } from 'react';
import { PulseInput } from './components/PulseInput';
import { ScoreCircle } from './components/ScoreCircle';
import { CheckTile } from './components/CheckTile';
import { RecentChecks } from './components/RecentChecks';
import type { PulseReport } from '../shared/pulseReport';

const RECENTS_KEY = 'pulsefile.recents.v1';

function loadRecents(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENTS_KEY) ?? '[]'); } catch { return []; }
}

function saveRecents(items: string[]) {
  localStorage.setItem(RECENTS_KEY, JSON.stringify(items.slice(0, 5)));
}

function buildShareUrl(url: string) {
  const params = new URLSearchParams({ url, autorun: '1' });
  return `${window.location.origin}/?${params.toString()}`;
}

function labelForError(body: { error?: string; code?: string }): string {
  if (body.error === 'invalid_url') {
    if (body.code === 'dns_failure') return 'Couldn’t resolve';
    if (body.code === 'invalid_scheme') return 'Bad scheme';
    return 'Invalid URL';
  }
  if (body.error === 'ssrf_blocked') return 'Blocked';
  if (body.error === 'rate_limited') return 'Slow down';
  if (body.error === 'invalid_json' || body.error === 'invalid_request') return 'Bad request';
  if (body.error === 'internal_error') return 'Server error';
  return 'Error';
}

export function App() {
  const [report, setReport] = useState<PulseReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  const [initialUrl, setInitialUrl] = useState<string>('');
  const [errorLabel, setErrorLabel] = useState<string>('Error');
  const [pulseCount, setPulseCount] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => { setRecents(loadRecents()); }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const url = params.get('url');
    if (url) {
      setInitialUrl(url);
      if (params.get('autorun') === '1') runPulse(url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runPulse(url: string) {
    setPending(true); setError(null); setReport(null); setCopied(false);
    try {
      const res = await fetch('/api/pulse', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const body = await res.json();
      if (!res.ok) {
        setErrorLabel(labelForError(body));
        setError(body.message ?? body.error ?? 'request failed');
      } else {
        setReport(body);
        setPulseCount((n) => n + 1);
        const next = [url, ...recents.filter((r) => r !== url)].slice(0, 5);
        setRecents(next); saveRecents(next);
      }
    } catch (e: any) {
      setErrorLabel('Network');
      setError(e.message ?? 'network error');
    } finally {
      setPending(false);
    }
  }

  async function copyShareLink() {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(buildShareUrl(report.requestedUrl));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard unavailable; quietly do nothing */ }
  }

  const stationLabel = pulseCount === 0
    ? 'live'
    : `${pulseCount} pulse${pulseCount === 1 ? '' : 's'}`;

  return (
    <div className="app">
      <nav className="topbar" aria-label="primary">
        <a className="brand" href="/" aria-label="Pulsefile home">
          <svg className="brand__mark" viewBox="0 0 24 24" aria-hidden focusable="false">
            <path
              d="M3 12 H7 L9 7.5 L12 16.5 L14.5 11 L16.5 13 H21"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="brand__text">Pulsefile</span>
        </a>
        <div className="topbar__meta">
          <span className="status-pill" title="Session activity">
            <span className="status-pill__dot" aria-hidden />
            <span className="status-pill__text">{stationLabel}</span>
          </span>
        </div>
      </nav>

      <header className="hero">
        <span className="hero__eyebrow">Web diagnostic · single round-trip</span>
        <h1 className="hero__title">
          URL health, <em>in one pulse.</em>
        </h1>
        <p className="hero__lede">
          Submit any URL - Pulsefile probes HTTP, SSL, redirects, security headers,
          contentand timing in a single round-trip and returns one composite reading.
        </p>
      </header>

      <main className="main">
        <PulseInput initialUrl={initialUrl} onSubmit={runPulse} disabled={pending} />

        {error && (
          <div className="error-banner" role="alert">
            <span className="error-banner__label">{errorLabel}</span>
            <span className="error-banner__text">{error}</span>
          </div>
        )}

        {report && (
          <section className="report" aria-live="polite">
            <div className="report__score">
              <ScoreCircle score={report.composite} durationMs={report.durationMs} />
            </div>
            <div className="panel">
              <div className="panel__heading">
                <span className="panel__title">Probe results</span>
                <span className="panel__url" title={report.requestedUrl}>
                  {report.requestedUrl.replace(/^https?:\/\//, '')}
                </span>
              </div>
              <div className="panel__rows">
                <CheckTile
                  index={0}
                  name="HTTP"
                  outcome={report.checks.http}
                  summary={(o) => o.status === 'error'
                    ? 'unreachable'
                    : `${o.httpStatus} · ${o.latencyMs} ms · ${(o.responseSizeBytes / 1024).toFixed(1)} kB`}
                  detail={(o) => o.status === 'error' ? o.message : ''}
                />
                <CheckTile
                  index={1}
                  name="SSL"
                  outcome={report.checks.ssl}
                  summary={(o) => o.status === 'error'
                    ? 'no handshake'
                    : `${o.classification} · ${o.daysUntilExpiry}d`}
                  detail={(o) => o.status === 'error'
                    ? o.message
                    : `subject  ${o.subject}\nissuer   ${o.issuer}\nvalid    ${o.validFrom.slice(0, 10)} → ${o.validTo.slice(0, 10)}\nSAN      ${o.sanList.join(', ')}`}
                />
                <CheckTile
                  index={2}
                  name="Redirects"
                  outcome={report.checks.redirects}
                  summary={(o) => o.status === 'error'
                    ? 'chain blocked'
                    : `${o.hops.length} hop${o.hops.length === 1 ? '' : 's'}${o.capped ? ' · capped' : ''}`}
                  detail={(o) => o.status === 'error'
                    ? o.message
                    : o.hops.length === 0
                      ? `final  ${o.finalUrl}`
                      : `${o.hops.map((h: any, i: number) => `${String(i + 1).padStart(2, ' ')}. ${h.status} ${h.fromUrl}\n    → ${h.toUrl} (${h.latencyMs} ms)`).join('\n')}\nfinal  ${o.finalUrl}`}
                />
                <CheckTile
                  index={3}
                  name="Headers"
                  outcome={report.checks.securityHeaders}
                  summary={(o) => o.status === 'error'
                    ? 'no response'
                    : `${o.scoreOutOf100} / 100 · ${o.headers.filter((h: any) => h.present).length} of 6`}
                  detail={(o) => o.status === 'error'
                    ? o.message
                    : o.headers.map((h: any) => `${h.present ? '+' : '-'}  ${h.name}${h.present ? `\n   ${h.value}` : `\n   ${h.recommendation}`}`).join('\n')}
                />
                <CheckTile
                  index={4}
                  name="Content"
                  outcome={report.checks.content}
                  summary={(o) =>
                    o.status === 'na' ? 'no expectation' :
                    o.matched ? `matched "${o.expected}"` :
                    `missing "${o.expected}"`}
                  detail={(o) => o.status === 'na'
                    ? 'Provide an "expect" string to assert a substring match against the body.'
                    : (o.snippet ?? '')}
                />
                <CheckTile
                  index={5}
                  name="Timing"
                  outcome={report.checks.timing}
                  summary={(o) => o.status === 'error'
                    ? 'no response'
                    : `ttfb ${o.ttfbMs} ms · total ${o.totalMs} ms`}
                  detail={(o) => o.status === 'error'
                    ? o.message
                    : `dns  ${o.dnsMs} ms\ntcp  ${o.tcpMs} ms\ntls  ${o.tlsMs} ms\nttfb ${o.ttfbMs} ms\ntotal ${o.totalMs} ms\n\n(per-phase timing pending socket-level instrumentation)`}
                />
              </div>
              <div className="share-row">
                <span className="share-row__label">Share</span>
                <button type="button" className="share-row__btn" onClick={copyShareLink}>
                  {copied ? 'Link copied' : 'Copy permalink'}
                </button>
              </div>
            </div>
          </section>
        )}

        <RecentChecks items={recents} onPick={runPulse} />
      </main>

      <footer className="colophon">
        <span>Pulsefile · diagnostic instrument</span>
        <span>
          <a href="https://github.com/cash-codes/AI_support_engineer" target="_blank" rel="noreferrer">
            companion · AI Support Engineer
          </a>
        </span>
      </footer>
    </div>
  );
}
