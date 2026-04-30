# Composite score

The composite score is a weighted blend of the six check outcomes, scaled to 0–100, with a letter grade derived from the score.

## Weights

| Check | Weight |
|---|---|
| HTTP status | 30 |
| SSL certificate | 25 |
| Security headers | 20 |
| Redirects | 10 |
| Content match | 10 |
| Timing | 5 |

Each check contributes (weight × per-check score) where:
- `ok` or `na` → 1.0
- `warn` → 0.5
- `fail` or `error` → 0.0

## Grade thresholds

| Score | Grade |
|---|---|
| 90+ | A |
| 75–89 | B |
| 60–74 | C |
| 45–59 | D |
| <45 | F |
