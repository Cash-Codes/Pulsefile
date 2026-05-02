# Timing breakdown

Reports timing details from the HTTP fetch.

## Fields

| Field | Meaning |
|---|---|
| `ttfbMs` | Time to first byte from request start. |
| `totalMs` | Wall-clock duration including body download. |
| `dnsMs`, `tcpMs`, `tlsMs` | Per-phase breakdown. **Not yet implemented** - these are reported as `0` in the current build. |

A future enhancement will add socket-level instrumentation to populate the per-phase fields.
