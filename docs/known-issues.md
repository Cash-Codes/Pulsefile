# Known issues and limitations

These are real product limitations in the current build. They are NOT bugs - they reflect intentional v1 scope.

- **Per-phase timing not populated.** `dnsMs`, `tcpMs`, `tlsMs` always report 0. Only `ttfbMs` and `totalMs` are real. (Tracked: socket-level instrumentation.)
- **No application-level rate limiting.** The service relies on Cloud Run concurrency caps. If abused, add a token bucket.
- **No persistent history.** Recent checks are stored in your browser's `localStorage` only. Clearing site data wipes them.
- **Single-region probe.** All checks fire from the Cloud Run region the service is deployed to. Geographic latency is not represented.
- **Body capped at 1 MB.** Larger response bodies are truncated for the content-match check.
- **HTTP-only sites get an SSL error.** The SSL check requires HTTPS. For `http://` URLs the SSL tile reads `tls_unreachable`.
- **Checks measure the requested URL, not the post-redirect URL.** A submitted apex that redirects to `www.` will have its security-headers and content-match checks audit the redirect response, not the final destination. Submit the destination URL directly to score it.
