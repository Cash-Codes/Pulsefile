# Redirects check

Walks the redirect chain manually, recording each hop. Caps at the value of `MAX_REDIRECT_HOPS` (default 10).

## Outcomes

- `ok` - chain terminates at a non-3xx response within the cap.
- `warn` - chain hits the cap (the final hop is reported with `capped: true`).
- `error` - a hop along the chain failed validation (e.g., redirect to a private IP - see SSRF guard).

## Fields

| Field | Meaning |
|---|---|
| `hops[]` | Each entry: `fromUrl`, `toUrl`, `status`, `latencyMs`. |
| `finalUrl` | The URL after the last successful hop. |
| `capped` | `true` if the chain was truncated at the cap. |

Each hop runs the SSRF guard fresh - a redirect to a private IP is rejected at that hop.
