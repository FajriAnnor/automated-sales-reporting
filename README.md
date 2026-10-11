# Automated Sales & Operational Reporting

**A reproducible JavaScript data-cleaning and Excel-reporting project for Fajri's Data Analyst portfolio.**

> **Portfolio demo:** All customer-free transactions, amounts, branches, and outcomes in this repository are **100% synthetic**. They do not represent real sales from any employer. This is a fictional retail operations scenario inspired by practical reporting tasks.

## Why this project?

Raw spreadsheets often contain duplicate orders, inconsistent dates, mixed Indonesian currency formats, missing prices, and mismatched totals. This project demonstrates how to validate these inputs before preparing trustworthy operational reports—without building another dashboard.

### End-to-end workflow

`Synthetic raw CSV → JavaScript validation / cleaning → quality review + clean CSV → Excel report / case study`

## Run it locally

**Requires Node.js 20+.**

```bash
npm install
npm run demo      # regenerate dummy source, clean records, export XLSX
npm test
```

To run without installing packages, you can run the main pipeline using Node's built-in modules:

```bash
node scripts/generate-demo.mjs
node scripts/run-pipeline.mjs
node --test tests/*.test.mjs
```

Only the Excel export script requires the `exceljs` dependency. Sample reports are already included in `outputs/` for review.

## Project structure

```text
data/raw_orders.csv               Deliberately messy synthetic input
src/csv.mjs                      CSV parsing/writing
src/cleaner.mjs                  Input normalization + quality checks
src/analytics.mjs                Report aggregations + metric definitions
scripts/generate-demo.mjs        Reproducible synthetic data generator
scripts/run-pipeline.mjs         Cleaning + exported CSV and JSON
scripts/export-excel.mjs         Export multi-sheet Excel workbook
outputs/cleaned_orders.csv       Accepted normalized transactions
outputs/quality_issues.csv       Rejected rows + audit reasons
outputs/monthly_summary.csv      Monthly aggregates
outputs/branch_summary.csv       Branch aggregates
outputs/report_summary.json      Validated metrics + definitions
outputs/sales_operational_report.xlsx   Example Excel deliverable
docs/CASE_STUDY.md               Problem → approach → results → limits
docs/PORTFOLIO_COPY.md           Copy for portfolio website (EN / ID)
tests/pipeline.test.mjs          Deterministic regression tests
```

## Quality policy

- No row is silently 'repaired' when amounts, dates, or IDs cannot be validated.
- Exact duplicate order IDs are rejected with the reason `DUPLICATE_ORDER`.
- A repeated order ID with conflicting values is flagged `CONFLICTING_DUPLICATE`.
- Broken dates, missing prices, and total mismatches go into `quality_issues.csv` for review.
- Only accepted records enter report aggregates.
- Recognized sales = Paid orders *not* Cancelled. This is a demo metric, not a formal accounting revenue recognition policy.
- No client, customer, service-account, or database credentials are stored here.

## Visual presentation

For portfolio Project 02, feature a **before/after cleaning comparison, code/workflow thumbnail, Excel deliverables, and an audit log** rather than another analytics dashboard. See `docs/PORTFOLIO_COPY.md`.

## Important scope

This project does **not** use PostgreSQL and does **not** rely on external APIs. Google Sheets → PostgreSQL integration is deliberately reserved for a separate future project.

## Verified demo output

The included deterministic dataset contains **255 raw records**, **228 accepted clean orders**, and **27 quarantined rows**, including **15 duplicate/conflicting order IDs**. These metrics are from the synthetic sample, not measured employer results. A before/after walkthrough grounded in the actual included records is in `docs/BEFORE_AFTER_EXAMPLES.md`.

The provided Excel workbook contains **7 sheets**: Executive Summary, Raw Inputs, Clean Orders, Quality Review, Monthly Report, Branch Report, and Definitions. The Executive Summary references underlying records through Excel formulas, while the application output in JSON/CSV is the canonical source for the case study.

## Publish as a separate GitHub repository

After extracting this project in VS Code, check the dataset and `.gitignore`, then run:

```bash
git init -b main
git add .
git commit -m "Add synthetic sales cleaning and automated reporting case study"
gh repo create FajriAnnor/automated-sales-reporting --public --source=. --remote=origin --push
```

This repo should remain separate from `fajri-data-porto`, `rto-request-monitoring`, and `wedison-web`. No Vercel deployment is needed: it is a command-line data-processing project, **not a web app**.

To connect its Case Study to the main portfolio afterward, see `docs/CODEX_PORTFOLIO_PROMPT.md`. Do not put a GitHub link on the site until the real repository has been created.
