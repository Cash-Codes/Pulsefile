# SSL check

Inspects the TLS certificate chain presented by the host on port 443.

## Outcomes

- `ok` - certificate is currently valid and expires more than 14 days from now (`healthy`).
- `warn` - certificate expires within the next 14 days (`expiring_soon`).
- `fail` - certificate has already expired (`expired`).
- `error` - could not establish a TLS connection (e.g., the host is HTTP-only or unreachable on 443).

## Fields

| Field | Meaning |
|---|---|
| `subject` | Distinguished name of the certificate subject. |
| `issuer` | Distinguished name of the issuing CA. |
| `validFrom` | ISO timestamp of the certificate's `notBefore`. |
| `validTo` | ISO timestamp of the certificate's `notAfter`. |
| `daysUntilExpiry` | Integer days from now until `validTo`. |
| `sanList` | Array of Subject Alternative Names (DNS entries and IPs). |

The SSL check skips chain validation - it inspects the presented cert even if it would otherwise fail trust verification.
