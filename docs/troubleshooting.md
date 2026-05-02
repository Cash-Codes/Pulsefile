# Troubleshooting

## "Refusing to connect to private IP" error

Pulse Check refuses to probe URLs that resolve to private, loopback, link-local, or unique-local IP addresses. This is a hard SSRF guard. Use a publicly resolvable URL instead.

## "tls_unreachable" on the SSL check

The TLS connection to port 443 failed. Common causes:
- The site is HTTP-only.
- A firewall is blocking 443 from Cloud Run.
- The host returns no certificate (uncommon).

## Long latency

The check timeout is 4 seconds per probe. Slow sites may report `error` outcomes if individual checks exceed that.

## My result looks wrong

Pulse Check is a snapshot, not a monitor. If the site recovered between your check and viewing the result, the report still reflects the moment of the request. Re-run the check.

## HTTP tile shows `ok` next to a `content: fail` tile on the same request

A few users have reported reports where the HTTP check tile reads `ok` even though the content-match tile next to it reads `fail`. The expectation is that a failed content match should pull the HTTP tile down — but the report still shows them as inconsistent. Under investigation; we don't yet have a public ETA or workaround.

## Why is my apex domain getting a low score?

Each check measures the URL you submit, not the final URL after redirects. If `https://example.com` returns a 301 to `https://www.example.com`, the security-headers check is auditing the redirect response (which usually has only HSTS), not the final destination. To score the destination, submit the post-redirect URL directly.
