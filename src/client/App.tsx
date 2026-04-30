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

const ECG_PATH =
  'M 0 14 L 60 14 L 80 14 L 90 12 L 105 16 L 115 4 L 122 24 L 132 14 L ' +
  '180 14 L 200 14 L 230 14 L 250 12 L 260 16 L 268 14 L 320 14 L ' +
  '360 14 L 380 14 L 400 12 L 415 16 L 425 4 L 432 24 L 442 14 L ' +
  '500 14 L 540 14 L 600 14';

export function App() {
  const [report, setReport] = useState<PulseReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  const [initialUrl, setInitialUrl] = useState<string>('');
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
        setError(body.message ?? body.error ?? 'request failed');
      } else {
        setReport(body);
        setPulseCount((n) => n + 1);
        const next = [url, ...recents.filter((r) => r !== url)].slice(0, 5);
        setRecents(next); saveRecents(next);
      }
    } catch (e: any) {
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

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: '2-digit',
  });
  const stationLabel = pulseCount === 0
    ? 'Station idle · 0 pulses'
    : `Station active · ${pulseCount} pulse${pulseCount === 1 ? '' : 's'}`;

  return (
    <div className="app">
      <header className="masthead">
        <div className="masthead__rule" />
        <div className="masthead__meta">
          <span><span className="dot" />{stationLabel}</span>
          <span>{today.toUpperCase()}</span>
          <span>VOL · I — Issue 0001</span>
        </div>
        <h1 className="masthead__brand">
          Pulsefile<span className="accent">.</span>
        </h1>
        <svg
          className="masthead__ecg"
          viewBox="0 0 600 28"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path className="ecg-floor" d="M 0 14 L 600 14" />
          <path className="ecg-trace" d={ECG_PATH} />
        </svg>
        <p className="masthead__tag">
          A diagnostic instrument for the open web. Submit any URL and Pulsefile takes
          its <em>pulse</em> — six probes, one composite reading, in a single round-trip.
        </p>
      </header>

      <PulseInput initialUrl={initialUrl} onSubmit={runPulse} disabled={pending} />

      {error && (
        <div className="error-banner">
          <span className="error-banner__label">Error</span>
          <span>{error}</span>
        </div>
      )}

      {report && (
        <section className="report" aria-live="polite">
          <div>
            <ScoreCircle score={report.composite} durationMs={report.durationMs} />
          </div>
          <div className="panel">
            <div className="panel__heading">
              <span>Probe results</span>
              <span>{report.requestedUrl.replace(/^https?:\/\//, '')}</span>
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
                {copied ? 'link copied to clipboard' : 'copy a permalink to this report'}
              </button>
            </div>
          </div>
        </section>
      )}

      <RecentChecks items={recents} onPick={runPulse} />

      <footer className="colophon">
        <span>Pulsefile · diagnostic instrument · v0.1</span>
        <span>
          <a href="https://github.com/cash-codes/AI_support_engineer" target="_blank" rel="noreferrer">
            companion · AI Support Engineer
          </a>
        </span>
      </footer>
    </div>
  );
}
