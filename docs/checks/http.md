# HTTP check

Measures whether the URL returns a successful HTTP response and how quickly.

## Outcomes

- `ok` - 2xx response code.
- `warn` - 3xx response code (redirect chain reported separately).
- `fail` - 4xx or 5xx response code.

## Fields

| Field | Meaning |
|---|---|
| `httpStatus` | The numeric response code. |
| `latencyMs` | Wall-clock time from request start to body fully received. |
| `responseSizeBytes` | Total bytes received in the response body. |

## Notes

The HTTP check uses a `GET` with `User-Agent: pulsefile-pulse/1.0`. It does not follow redirects automatically (the redirects check handles that separately). A hard 4-second timeout per check applies.
