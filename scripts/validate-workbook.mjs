import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'outputs');
const workbookPath = path.join(output, 'sales_operational_report.xlsx');
const report = JSON.parse(fs.readFileSync(path.join(output, 'report_summary.json'), 'utf8'));
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(workbookPath);

const expectedSheets = [
  'Executive Summary',
  'Monthly Report',
  'Branch Report',
  'Clean Orders',
  'Quality Review',
  'Raw Inputs',
  'Definitions'
];
assert.deepEqual(wb.worksheets.map(sheet => sheet.name), expectedSheets, 'Worksheet order is incorrect.');

const executive = wb.getWorksheet('Executive Summary');
const kpiChecks = [
  ['A8', report.metrics.valid_orders, 'Total valid orders'],
  ['C8', report.metrics.recognized_sales_idr, 'Recognized sales'],
  ['E8', report.metrics.gross_order_value_idr, 'Gross order value'],
  ['G8', report.metrics.validation_rate_pct / 100, 'Validation rate'],
  ['A12', report.metrics.paid_orders, 'Paid orders'],
  ['C12', report.metrics.delivered_orders, 'Delivered orders'],
  ['E12', report.metrics.processing_orders, 'Processing orders'],
  ['G12', report.metrics.cancelled_orders, 'Cancelled orders']
];
for (const [address, expected, label] of kpiChecks) {
  const actual = executive.getCell(address).value;
  assert.equal(typeof actual, 'number', `${label} must remain numeric.`);
  assert.equal(actual, expected, `${label} does not reconcile with report_summary.json.`);
}
assert.match(executive.getCell('C8').numFmt, /Rp/, 'Executive IDR format is missing.');
assert.match(executive.getCell('E8').numFmt, /Rp/, 'Executive gross-order-value IDR format is missing.');
assert.equal(executive.getCell('G8').numFmt, '0.00%', 'Executive validation-rate format is incorrect.');
for (const address of ['A12', 'C12', 'E12', 'G12']) {
  assert.equal(executive.getCell(address).numFmt, '#,##0', `${address} must use a whole-number format.`);
}
assert.equal(executive.getCell('A2').value, 'SALES & OPERATIONAL REPORT');
assert.equal(executive.getCell('G4').value, 'Synthetic portfolio dataset');

const monthly = wb.getWorksheet('Monthly Report');
const branches = wb.getWorksheet('Branch Report');
const clean = wb.getWorksheet('Clean Orders');
const quality = wb.getWorksheet('Quality Review');
const raw = wb.getWorksheet('Raw Inputs');
const definitions = wb.getWorksheet('Definitions');

assert.equal(monthly.getCell('A6').value, 'Month');
assert.ok(monthly.getCell('A7').value instanceof Date, 'Monthly labels must be sortable Excel dates.');
assert.equal(monthly.getCell('A7').numFmt, 'mmm yyyy');
assert.equal(typeof monthly.getCell('C7').value, 'number');
assert.match(monthly.getCell('C7').numFmt, /Rp/);
assert.equal(branches.getCell('A6').value, 'Branch');
assert.deepEqual(report.branches.map(row => row.name), ['Bali', 'Bandung', 'Bekasi', 'Jakarta']);
assert.ok(clean.getCell('B2').value instanceof Date, 'Clean order dates must be stored as Excel dates.');
assert.equal(clean.getCell('B2').numFmt, 'dd mmm yyyy');
assert.equal(typeof clean.getCell('G2').value, 'number');
assert.match(clean.getCell('G2').numFmt, /Rp/);
assert.equal(quality.getCell('L18').value, 'Issue / Reason');
assert.equal(quality.getCell('A2').value, 'DATA QUALITY REVIEW');
assert.equal(raw.rowCount, report.metrics.raw_rows + 1);
assert.match(String(definitions.getCell('A5').value), /entirely synthetic data/i);

const freezeAndFilterChecks = [
  [monthly, 6],
  [branches, 6],
  [clean, 1],
  [quality, 18],
  [raw, 1],
  [definitions, 8]
];
for (const [sheet, expectedSplit] of freezeAndFilterChecks) {
  assert.equal(sheet.views[0]?.state, 'frozen', `${sheet.name} must use frozen panes.`);
  assert.equal(sheet.views[0]?.ySplit, expectedSplit, `${sheet.name} has the wrong frozen row.`);
  assert.ok(sheet.autoFilter, `${sheet.name} must have an autofilter.`);
}

for (const sheet of wb.worksheets) {
  sheet.eachRow(row => row.eachCell(cell => {
    if (cell.formula) {
      assert.doesNotMatch(cell.formula, /#REF!|#DIV\/0!|#VALUE!|#NAME\?|#N\/A|#NUM!|#NULL!/);
    }
  }));
}

const summary = wb.worksheets.map((sheet, index) => ({
  order: index + 1,
  name: sheet.name,
  rows: sheet.rowCount,
  columns: sheet.columnCount,
  frozenRows: sheet.views[0]?.ySplit ?? 0,
  autoFilter: sheet.autoFilter ?? null
}));
console.log(JSON.stringify({ workbook: path.relative(root, workbookPath), sheets: summary, kpis: Object.fromEntries(kpiChecks.map(([cell, value, label]) => [label, { cell, value }])) }, null, 2));
