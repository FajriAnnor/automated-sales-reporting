# Before / After — examples taken from the actual synthetic dataset

These are **not** real employee, customer, or employer records. All examples below were obtained from the included deterministic files, so the portfolio can cite them accurately.

## Example A — valid record normalized automatically

| Field | Before (`data/raw_orders.csv`) | After (`outputs/cleaned_orders.csv`) |
|---|---|---|
| Order ID | `ORD-2026-0113` | `ORD-2026-0113` |
| Date | `22-05-2026` | `2026-05-22` |
| Branch | ` bandung ` | `Bandung` |
| Category | `HOME LIVING` | `Home Living` |
| Unit price | `89000` | `89000` |
| Total | `Rp 178.000` | `178000` |
| Result | Raw record | Accepted, normalized |

## Example B — invalid date held for review

- Order ID: `ORD-2026-0016`
- Raw date: `31/02/2026`
- Reason: `INVALID_DATE`
- Output: retained in `outputs/quality_issues.csv`, **not** included in the clean report

## Example C — missing/invalid price held for review

- Order ID: `ORD-2026-0036`
- Raw unit price: `N/A`
- Reason: `INVALID_PRICE`
- Output: retained in `outputs/quality_issues.csv`, **not** included in the clean report

## Example D — mismatched total held for review

- Order ID: `ORD-2026-0058`
- Raw quantity: `5`
- Raw unit price: `65,000`
- Reported total: `999999999`
- Expected total: `325000`
- Reason: `TOTAL_MISMATCH`
- Output: retained in `outputs/quality_issues.csv`, **not** silently corrected

## Final QA outcome

| Metric | Computed result |
|---|---:|
| Total imported rows | 255 |
| Accepted normalized orders | 228 |
| Rows flagged for review | 27 |
| Duplicate or conflicting order IDs | 15 |
| Invalid dates | 4 |
| Invalid prices | 4 |
| Mismatched totals | 4 |
| Acceptance rate | 89.41% |

## Presentation guidance

On the public portfolio, show examples A–D as a readable before/after and issue-review interaction. **Do not present quarantined records as successfully auto-corrected.** The purpose of the audit is to refuse unsupported data, not to hide bad inputs.
