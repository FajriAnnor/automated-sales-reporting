# Case Study — Automated Sales & Operational Reporting

## 01. Overview

This independent portfolio project demonstrates a reproducible approach to turning inconsistent spreadsheet exports into validated operational data and a structured Excel reporting package. The fictional scenario is a small retail business with six months of transactions.

**All transactions and statistics are synthetic.** The project is informed by practical reporting workflows but does not reproduce any employer's actual sales, customers, records, or outcomes.

## 02. Business Problem

Business reports are unreliable when exported sheets contain duplicate order IDs, inconsistent date formats, inconsistent IDR formats, missing prices, and totals that do not reconcile with quantity × unit price. A manual recheck is time-consuming and risks including unsupported amounts in business KPIs.

## 03. Data Sources

Input: `data/raw_orders.csv` (generated locally by `scripts/generate-demo.mjs`). 255 imported rows representing 240 synthetic source orders plus 15 additional duplicate entries. Fields include order date, branch, sales channel, product category, quantity, unit price, reported total, payment status, and fulfillment status.

The generator uses a fixed seeded pseudo-random sequence, so the test input is deterministic.

## 04. Cleaning & Validation

JavaScript cleaning is implemented in `src/cleaner.mjs`:

1. Normalize `DD/MM/YYYY`, `DD-MM-YYYY`, `YYYY/MM/DD`, and ISO-formatted dates to `YYYY-MM-DD`.
2. Parse formatted Indonesian rupiah values as integer IDR.
3. Standardize branch, channel, product category, payment, and fulfillment labels.
4. Reject records with invalid dates, prices, IDs, quantities, or categorical values.
5. Recalculate `quantity × unit_price` and reject rows with mismatched reported totals.
6. Detect exact duplicate order IDs and conflicting repeats; keep a rejected-row audit log.
7. Export accepted rows separately from records requiring manual review.

**Reject instead of silently fixing ambiguous records.** No excluded rows contribute to KPI aggregates.

## 05. Automation Workflow

`Synthetic Source → Parse & Normalize → Validate → Deduplicate → Clean CSV + Quality Issues CSV → Monthly/Branch Summaries → Excel Report`

Run `npm run demo` to rebuild every stage. Run `npm test` to check the expected quality outcomes and reconciliation behavior.

## 06. Outputs

- `outputs/cleaned_orders.csv` — 228 clean, standardized records.
- `outputs/quality_issues.csv` — 27 excluded source rows, each with issue reason(s).
- `outputs/monthly_summary.csv` — 6 monthly summaries.
- `outputs/branch_summary.csv` — 4 branch summaries.
- `outputs/report_summary.json` — KPI definitions and derived metrics.
- `outputs/sales_operational_report.xlsx` — Excel reporting deliverable.

## 07. Findings & Checks

The deterministic sample produces:

| Metric | Result |
| --- | ---: |
| Raw rows | 255 |
| Accepted clean orders | 228 |
| Rejected rows | 27 |
| Duplicates and conflicting repeat IDs | 15 |
| Invalid dates | 4 |
| Invalid prices | 4 |
| Mismatched totals | 4 |
| Validated share of raw records | 89.41% |
| Demo recognized sales | Rp 86,406,000 |

The recognized-sales metric includes accepted records marked **Paid** and **not Cancelled**. This is a project-specific operational metric and is not intended to establish formal accounting revenue-recognition policy.

The exercise illustrates that **quality checks should precede reports**, not that a real business improved by any particular percentage.

## 08. Tech Stack and Limitations

JavaScript (Node.js 20+), standard Node libraries for parsing/cleaning, and ExcelJS for reproducible XLSX generation. The report file shipped with this starter is generated from the same validated synthetic data.

Limits: no production data source, live Google Sheets connection, PostgreSQL backend, user authentication, or scheduled cloud automation. Future PostgreSQL integration is intentionally out of scope. Source transaction amounts are generated, not financial claims about a real business.

## Visual direction for the portfolio case study

- Hero artwork: code editor + before/after spreadsheet illustration, **not another KPI dashboard**.
- Interactive before/after: show the same sample order IDs before/after clean, with excluded rows marked clearly.
- Workflow: arrows connecting raw file, JavaScript validation, quality review, and Excel report.
- Deliverables: show links only when verified assets exist.
- Reveal numbers directly from `outputs/report_summary.json`, never copy unsupported outcome figures.
