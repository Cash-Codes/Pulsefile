# Security headers check

Audits the six canonical security headers and computes a sub-score.

## Headers checked

| Header | Recommendation |
|---|---|
| `Strict-Transport-Security` | Set HSTS with `max-age >= 31536000`. |
| `Content-Security-Policy` | Start with `default-src 'self'`. |
| `X-Frame-Options` | Set to `DENY`. |
| `X-Content-Type-Options` | Set to `nosniff`. |
| `Referrer-Policy` | Use `no-referrer` or `strict-origin`. |
| `Permissions-Policy` | Restrict powerful features explicitly. |

## Outcomes

| Sub-score | Status |
|---|---|
| 80–100 | `ok` |
| 40–79 | `warn` |
| 0–39 | `fail` |

The sub-score is `(headers present) / 6 × 100`, rounded.
