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

## Why is my apex domain getting a low score?

Each check measures the URL you submit, not the final URL after redirects. If `https://example.com` returns a 301 to `https://www.example.com`, the security-headers check is auditing the redirect response (which usually has only HSTS), not the final destination. To score the destination, submit the post-redirect URL directly.
