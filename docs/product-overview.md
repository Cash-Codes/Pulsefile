# Pulse Check - overview

Pulsefile's Pulse Check is a one-shot URL health snapshot. You submit a public URL; the service runs six probes from a Cloud Run container and returns a single dense report with a composite 0–100 score and an A–F grade.

## What Pulse Check measures

- **HTTP status** - response code, latency, response size.
- **SSL certificate** - issuer, validity window, days until expiry, SAN list.
- **Redirect chain** - every hop, capped at 10, with per-hop latency.
- **Security headers** - six canonical headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy).
- **Content match** - optional substring match against the response body.
- **Timing breakdown** - TTFB and total latency.

## What Pulse Check is not

It is a **snapshot, not a monitor.** Pulse Check does not run scheduled background checks, store history, or send alerts. Each call is stateless and request-scoped. For continuous uptime monitoring you would need a different product.

## Sharing a result

A result is reproducible by URL. Append `?url=<encoded>&autorun=1` to any Pulsefile page to re-run a check on load.
