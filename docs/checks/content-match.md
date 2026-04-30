# Content match check

Optional substring match against the response body.

## Outcomes

- `na` - no expectation was provided in the request.
- `ok` - the expected substring was found.
- `fail` - the expected substring was absent.

## Fields

| Field | Meaning |
|---|---|
| `expected` | The substring that was searched for, or `null` if no expectation. |
| `matched` | Whether the substring was found. |
| `snippet` | ~60 characters of context around the match (or `null`). |

Matching is case-sensitive.
