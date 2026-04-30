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

export function App() {
  const [report, setReport] = useState<PulseReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  const [initialUrl, setInitialUrl] = useState<string>('');

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
    setPending(true); setError(null); setReport(null);
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
        const next = [url, ...recents.filter((r) => r !== url)].slice(0, 5);
        setRecents(next); saveRecents(next);
      }
    } catch (e: any) {
      setError(e.message ?? 'network error');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="app">
      <div className="hero">
        <h1>Pulsefile</h1>
        <p>One-shot URL health snapshot — HTTP, SSL, redirects, headers, content, timing.</p>
      </div>
      <PulseInput initialUrl={initialUrl} onSubmit={runPulse} disabled={pending} />
      {error && <div className="error-banner">{error}</div>}
      {report && (
        <>
          <ScoreCircle score={report.composite} durationMs={report.durationMs} />
          <div className="tiles">
            <CheckTile
              name="HTTP"
              outcome={report.checks.http}
              detail={(o) => o.status === 'error' ? o.message : `${o.httpStatus} · ${o.latencyMs}ms · ${o.responseSizeBytes} bytes`}
            />
            <CheckTile
              name="SSL"
              outcome={report.checks.ssl}
              detail={(o) => o.status === 'error' ? o.message : `${o.classification} · ${o.daysUntilExpiry}d left\n${o.subject}`}
            />
            <CheckTile
              name="Redirects"
              outcome={report.checks.redirects}
              detail={(o) => o.status === 'error' ? o.message : `${o.hops.length} hop(s)${o.capped ? ' (capped)' : ''}\n${o.finalUrl}`}
            />
            <CheckTile
              name="Security headers"
              outcome={report.checks.securityHeaders}
              detail={(o) => o.status === 'error' ? o.message : `${o.scoreOutOf100}/100 · ${o.headers.filter((h: any) => h.present).length}/6 set`}
            />
            <CheckTile
              name="Content match"
              outcome={report.checks.content}
              detail={(o) => o.status === 'na' ? 'no expectation provided' : o.matched ? `matched: ${o.expected}` : `not matched: ${o.expected}`}
            />
            <CheckTile
              name="Timing"
              outcome={report.checks.timing}
              detail={(o) => o.status === 'error' ? o.message : `ttfb ${o.ttfbMs}ms · total ${o.totalMs}ms`}
            />
          </div>
        </>
      )}
      <RecentChecks items={recents} onPick={runPulse} />
    </div>
  );
}
