import ExcelJS from 'exceljs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCSV } from '../src/csv.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'outputs');
const report = JSON.parse(fs.readFileSync(path.join(output, 'report_summary.json'), 'utf8'));
const raw = readCSV(path.join(root, 'data', 'raw_orders.csv'));
const clean = readCSV(path.join(output, 'cleaned_orders.csv'));
const issues = readCSV(path.join(output, 'quality_issues.csv'));

if (
  raw.length !== report.metrics.raw_rows ||
  clean.length !== report.metrics.valid_orders ||
  issues.length !== report.metrics.rejected_rows
) {
  throw new Error('Dataset and JSON metrics do not reconcile. Run npm run clean first.');
}

const wb = new ExcelJS.Workbook();
wb.creator = 'Fajri | Synthetic Portfolio Case Study';
wb.created = new Date('2026-07-01T00:00:00Z');
wb.modified = new Date('2026-07-01T00:00:00Z');
wb.calcProperties.fullCalcOnLoad = true;
wb.views = [{ activeTab: 0, firstSheet: 0, visibility: 'visible' }];

const FONT = 'Aptos';
const COLOR = {
  navy: 'FF17253B',
  blue: 'FF2F67B1',
  accent: 'FF4D83C5',
  paleBlue: 'FFEAF1F8',
  light: 'FFF6F8FB',
  white: 'FFFFFFFF',
  text: 'FF223047',
  muted: 'FF667085',
  border: 'FFD9E2EC',
  red: 'FFB42318',
  paleRed: 'FFFDECEC'
};
const FORMAT = {
  idr: '"Rp" #,##0;[Red]("Rp" #,##0)',
  integer: '#,##0',
  percent: '0.00%',
  date: 'dd mmm yyyy',
  month: 'mmm yyyy'
};

const businessHeaders = {
  order_id: 'Order ID',
  order_date: 'Order Date',
  branch: 'Branch',
  sales_channel: 'Sales Channel',
  product_category: 'Product Category',
  quantity: 'Quantity',
  unit_price_idr: 'Unit Price',
  reported_total_idr: 'Reported Total',
  total_idr: 'Order Total',
  payment_status: 'Payment Status',
  fulfillment_status: 'Fulfillment Status',
  recognized_sales_idr: 'Recognized Sales',
  source_row: 'Source Row',
  issue_reason: 'Issue / Reason',
  name: 'Name',
  orders: 'Orders',
  gross_order_value_idr: 'Gross Order Value',
  term: 'Metric',
  definition: 'Definition'
};

const rawColumns = [
  { key: 'order_id', width: 20 },
  { key: 'order_date', width: 16 },
  { key: 'branch', width: 15 },
  { key: 'sales_channel', width: 17 },
  { key: 'product_category', width: 21 },
  { key: 'quantity', width: 11 },
  { key: 'unit_price_idr', width: 18 },
  { key: 'reported_total_idr', width: 20 },
  { key: 'payment_status', width: 17 },
  { key: 'fulfillment_status', width: 19 }
];
const cleanColumns = [
  { key: 'order_id', width: 20 },
  { key: 'order_date', width: 16, type: 'date' },
  { key: 'branch', width: 15 },
  { key: 'sales_channel', width: 17 },
  { key: 'product_category', width: 21 },
  { key: 'quantity', width: 11, type: 'integer' },
  { key: 'unit_price_idr', width: 18, type: 'idr' },
  { key: 'total_idr', width: 20, type: 'idr' },
  { key: 'payment_status', width: 17 },
  { key: 'fulfillment_status', width: 19 },
  { key: 'recognized_sales_idr', width: 21, type: 'idr' }
];

function parseIsoDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  if (!match) return value;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function parseMonth(value) {
  return parseIsoDate(`${value}-01`);
}

function titleCaseCode(value) {
  return String(value)
    .toLowerCase()
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function reportPeriod() {
  return report.reporting_period.replace(/\s*-\s*/, ' – ');
}

function baseSheet(name, { tabColor = COLOR.blue, frozenRows = 0, zoomScale = 100 } = {}) {
  return wb.addWorksheet(name, {
    properties: { defaultRowHeight: 20, tabColor: { argb: tabColor } },
    views: [{
      state: frozenRows ? 'frozen' : 'normal',
      ySplit: frozenRows || undefined,
      topLeftCell: frozenRows ? `A${frozenRows + 1}` : undefined,
      showGridLines: false,
      zoomScale,
      zoomScaleNormal: 100
    }]
  });
}

function styleTitle(sheet, title, subtitle, { endColumn = 4 } = {}) {
  const end = sheet.getColumn(endColumn).letter;
  sheet.mergeCells(`A2:${end}2`);
  sheet.getCell('A2').value = title;
  sheet.getCell('A2').font = { name: FONT, size: 16, bold: true, color: { argb: COLOR.navy } };
  sheet.getCell('A2').alignment = { vertical: 'middle' };
  sheet.getRow(2).height = 27;

  sheet.mergeCells(`A3:${end}3`);
  sheet.getCell('A3').value = subtitle;
  sheet.getCell('A3').font = { name: FONT, size: 10, italic: true, color: { argb: COLOR.muted } };
  sheet.getCell('A3').alignment = { vertical: 'middle' };
  sheet.getRow(3).height = 21;

  sheet.getRow(4).height = 7;
  for (let col = 1; col <= endColumn; col++) {
    const cell = sheet.getCell(4, col);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.blue } };
  }
}

function styleSectionBand(sheet, row, text, startColumn = 1, endColumn = 8) {
  const start = sheet.getColumn(startColumn).letter;
  const end = sheet.getColumn(endColumn).letter;
  sheet.mergeCells(`${start}${row}:${end}${row}`);
  const cell = sheet.getCell(row, startColumn);
  cell.value = text;
  cell.font = { name: FONT, size: 10, bold: true, color: { argb: COLOR.white } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.navy } };
  cell.alignment = { vertical: 'middle' };
  sheet.getRow(row).height = 24;
}

function styleTableHeader(row) {
  row.height = 29;
  row.eachCell(cell => {
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: COLOR.white } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.navy } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      right: { style: 'thin', color: { argb: 'FF5A6880' } },
      bottom: { style: 'thin', color: { argb: COLOR.navy } }
    };
  });
}

function valueForColumn(record, column) {
  const value = record[column.key] ?? '';
  if (column.type === 'integer' || column.type === 'idr') return Number(value || 0);
  if (column.type === 'date') return parseIsoDate(value);
  if (column.type === 'month') return parseMonth(value);
  return value;
}

function writeTable(sheet, startRow, columns, records, { issueColumnKey } = {}) {
  const header = sheet.getRow(startRow);
  header.values = columns.map(column => column.header ?? businessHeaders[column.key] ?? column.key);
  styleTableHeader(header);

  for (const record of records) {
    const row = sheet.addRow(columns.map(column => valueForColumn(record, column)));
    row.height = 22;
    row.eachCell((cell, columnNumber) => {
      const column = columns[columnNumber - 1];
      cell.font = { name: FONT, size: 10, color: { argb: COLOR.text } };
      cell.alignment = {
        horizontal: column.type === 'integer' || column.type === 'idr' ? 'right' : column.type === 'date' || column.type === 'month' ? 'center' : 'left',
        vertical: 'middle',
        wrapText: column.key === issueColumnKey
      };
      cell.border = { bottom: { style: 'hair', color: { argb: COLOR.border } } };
      if ((row.number - startRow) % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.light } };
      }
      if (column.key === issueColumnKey) {
        cell.font = { name: FONT, size: 10, bold: true, color: { argb: COLOR.red } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.paleRed } };
      }
    });
  }

  columns.forEach((column, index) => {
    const excelColumn = sheet.getColumn(index + 1);
    excelColumn.width = column.width ?? 16;
    if (column.type === 'integer') excelColumn.numFmt = FORMAT.integer;
    if (column.type === 'idr') excelColumn.numFmt = FORMAT.idr;
    if (column.type === 'date') excelColumn.numFmt = FORMAT.date;
    if (column.type === 'month') excelColumn.numFmt = FORMAT.month;
  });

  const endRow = startRow + records.length;
  sheet.autoFilter = {
    from: { row: startRow, column: 1 },
    to: { row: endRow, column: columns.length }
  };
  return { startRow, endRow };
}

function setPrintLayout(sheet, printArea, orientation = 'landscape') {
  sheet.pageSetup = {
    orientation,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
    margins: { left: 0.3, right: 0.3, top: 0.45, bottom: 0.45, header: 0.15, footer: 0.15 },
    printArea
  };
}

// Executive Summary
const executive = baseSheet('Executive Summary', { tabColor: COLOR.blue, zoomScale: 90 });
for (let col = 1; col <= 8; col++) executive.getColumn(col).width = 16;
executive.mergeCells('A2:H2');
executive.getCell('A2').value = 'SALES & OPERATIONAL REPORT';
executive.getCell('A2').font = { name: FONT, size: 18, bold: true, color: { argb: COLOR.navy } };
executive.getCell('A2').alignment = { vertical: 'middle' };
executive.getRow(2).height = 31;
executive.mergeCells('A3:H3');
executive.getCell('A3').value = 'Automated Data Quality & Business Reporting';
executive.getCell('A3').font = { name: FONT, size: 11, color: { argb: COLOR.muted } };
executive.getCell('A3').alignment = { vertical: 'middle' };
executive.mergeCells('A4:F4');
executive.getCell('A4').value = reportPeriod();
executive.getCell('A4').font = { name: FONT, size: 10, bold: true, color: { argb: COLOR.blue } };
executive.mergeCells('G4:H4');
executive.getCell('G4').value = 'Synthetic portfolio dataset';
executive.getCell('G4').font = { name: FONT, size: 9, italic: true, color: { argb: COLOR.muted } };
executive.getCell('G4').alignment = { horizontal: 'right' };
executive.getRow(4).height = 22;
for (let col = 1; col <= 8; col++) {
  executive.getCell(5, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.blue } };
}
executive.getRow(5).height = 7;

const kpis = [
  { label: 'TOTAL VALID ORDERS', value: report.metrics.valid_orders, format: FORMAT.integer },
  { label: 'RECOGNIZED SALES', value: report.metrics.recognized_sales_idr, format: FORMAT.idr },
  { label: 'GROSS ORDER VALUE', value: report.metrics.gross_order_value_idr, format: FORMAT.idr },
  { label: 'VALIDATION RATE', value: report.metrics.validation_rate_pct / 100, format: FORMAT.percent },
  { label: 'PAID ORDERS', value: report.metrics.paid_orders, format: FORMAT.integer },
  { label: 'DELIVERED ORDERS', value: report.metrics.delivered_orders, format: FORMAT.integer },
  { label: 'PROCESSING ORDERS', value: report.metrics.processing_orders, format: FORMAT.integer },
  { label: 'CANCELLED ORDERS', value: report.metrics.cancelled_orders, format: FORMAT.integer }
];
const cardColumns = [['A', 'B'], ['C', 'D'], ['E', 'F'], ['G', 'H']];
kpis.forEach((kpi, index) => {
  const group = index % 4;
  const labelRow = index < 4 ? 7 : 11;
  const valueStart = labelRow + 1;
  const [start, end] = cardColumns[group];
  executive.mergeCells(`${start}${labelRow}:${end}${labelRow}`);
  executive.mergeCells(`${start}${valueStart}:${end}${valueStart + 1}`);
  const labelCell = executive.getCell(`${start}${labelRow}`);
  const valueCell = executive.getCell(`${start}${valueStart}`);
  labelCell.value = kpi.label;
  labelCell.font = { name: FONT, size: 9, bold: true, color: { argb: COLOR.blue } };
  labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.paleBlue } };
  labelCell.alignment = { horizontal: 'left', vertical: 'middle' };
  valueCell.value = kpi.value;
  valueCell.numFmt = kpi.format;
  valueCell.font = { name: FONT, size: 16, bold: true, color: { argb: COLOR.navy } };
  valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.white } };
  valueCell.alignment = { horizontal: 'left', vertical: 'middle' };
  for (let row = labelRow; row <= valueStart + 1; row++) {
    for (let col = executive.getColumn(start).number; col <= executive.getColumn(end).number; col++) {
      executive.getCell(row, col).border = {
        top: row === labelRow ? { style: 'medium', color: { argb: COLOR.blue } } : undefined,
        bottom: row === valueStart + 1 ? { style: 'thin', color: { argb: COLOR.border } } : undefined,
        left: col === executive.getColumn(start).number ? { style: 'thin', color: { argb: COLOR.border } } : undefined,
        right: col === executive.getColumn(end).number ? { style: 'thin', color: { argb: COLOR.border } } : undefined
      };
    }
  }
});
executive.getRow(7).height = 23;
executive.getRow(8).height = 22;
executive.getRow(9).height = 22;
executive.getRow(11).height = 23;
executive.getRow(12).height = 22;
executive.getRow(13).height = 22;

styleSectionBand(executive, 15, 'DATA QUALITY SUMMARY');
executive.getCell('A17').value = 'Record Summary';
executive.getCell('B17').value = 'Value';
executive.getCell('E17').value = 'Issue Category';
executive.getCell('F17').value = 'Records';
for (const address of ['A17', 'B17', 'E17', 'F17']) {
  const cell = executive.getCell(address);
  cell.font = { name: FONT, size: 10, bold: true, color: { argb: COLOR.white } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.blue } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
}
executive.getRow(17).height = 24;
const qualitySummary = [
  ['Raw Records', report.metrics.raw_rows, FORMAT.integer],
  ['Valid Records', report.metrics.valid_orders, FORMAT.integer],
  ['Rejected Records', report.metrics.rejected_rows, FORMAT.integer],
  ['Duplicate Records', report.metrics.duplicates, FORMAT.integer],
  ['Validation Rate', report.metrics.validation_rate_pct / 100, FORMAT.percent]
];
qualitySummary.forEach(([label, value, format], index) => {
  const row = 18 + index;
  executive.getCell(row, 1).value = label;
  executive.getCell(row, 2).value = value;
  executive.getCell(row, 2).numFmt = format;
});
const issueSummary = Object.entries(report.issues_by_reason);
issueSummary.forEach(([code, count], index) => {
  const row = 18 + index;
  executive.getCell(row, 5).value = titleCaseCode(code);
  executive.getCell(row, 6).value = count;
  executive.getCell(row, 6).numFmt = FORMAT.integer;
});
for (let row = 18; row <= Math.max(22, 17 + issueSummary.length); row++) {
  for (const col of [1, 2, 5, 6]) {
    const cell = executive.getCell(row, col);
    cell.font = { name: FONT, size: 10, color: { argb: COLOR.text }, bold: col === 2 || col === 6 };
    cell.alignment = { horizontal: col === 2 || col === 6 ? 'right' : 'left', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: row % 2 === 0 ? COLOR.light : COLOR.white } };
    cell.border = { bottom: { style: 'hair', color: { argb: COLOR.border } } };
  }
  executive.getRow(row).height = 21;
}

styleSectionBand(executive, 25, 'MONTHLY PERFORMANCE');
const executiveMonthlyColumns = [
  { key: 'name', header: 'Month', width: 16, type: 'month' },
  { key: 'orders', header: 'Orders', width: 14, type: 'integer' },
  { key: 'recognized_sales_idr', header: 'Recognized Sales', width: 22, type: 'idr' },
  { key: 'gross_order_value_idr', header: 'Gross Order Value', width: 22, type: 'idr' }
];
writeTable(executive, 27, executiveMonthlyColumns, report.monthly);
executive.autoFilter = undefined;
for (let col = 1; col <= 8; col++) executive.getColumn(col).width = 16;
executive.getCell('C12').numFmt = FORMAT.integer;
executive.mergeCells('A35:H35');
executive.getCell('A35').value = 'Automated workflow: synthetic CSV → validation → cleaning → duplicate detection → aggregation → Excel report.';
executive.getCell('A35').font = { name: FONT, size: 9, italic: true, color: { argb: COLOR.muted } };
executive.getCell('A35').alignment = { vertical: 'middle' };
executive.getRow(35).height = 22;
setPrintLayout(executive, 'A1:H35');

// Reader-facing aggregate reports
const monthly = baseSheet('Monthly Report', { tabColor: COLOR.navy, frozenRows: 6 });
styleTitle(monthly, 'MONTHLY PERFORMANCE', `${reportPeriod()} | Validated orders`, { endColumn: 4 });
const monthlyColumns = [
  { key: 'name', header: 'Month', width: 18, type: 'month' },
  { key: 'orders', header: 'Orders', width: 14, type: 'integer' },
  { key: 'recognized_sales_idr', header: 'Recognized Sales', width: 23, type: 'idr' },
  { key: 'gross_order_value_idr', header: 'Gross Order Value', width: 23, type: 'idr' }
];
writeTable(monthly, 6, monthlyColumns, report.monthly);
setPrintLayout(monthly, `A1:D${6 + report.monthly.length}`);

const branches = baseSheet('Branch Report', { tabColor: COLOR.navy, frozenRows: 6 });
styleTitle(branches, 'BRANCH PERFORMANCE', `${reportPeriod()} | Standardized branch names`, { endColumn: 4 });
const branchColumns = [
  { key: 'name', header: 'Branch', width: 18 },
  { key: 'orders', header: 'Orders', width: 14, type: 'integer' },
  { key: 'recognized_sales_idr', header: 'Recognized Sales', width: 23, type: 'idr' },
  { key: 'gross_order_value_idr', header: 'Gross Order Value', width: 23, type: 'idr' }
];
writeTable(branches, 6, branchColumns, report.branches);
setPrintLayout(branches, `A1:D${6 + report.branches.length}`);

// Validated data output
const cleanSheet = baseSheet('Clean Orders', { tabColor: COLOR.accent, frozenRows: 1, zoomScale: 90 });
writeTable(cleanSheet, 1, cleanColumns, clean);
setPrintLayout(cleanSheet, `A1:K${clean.length + 1}`);

// Data-quality review and rejected records
const issueSheet = baseSheet('Quality Review', { tabColor: COLOR.red, frozenRows: 18, zoomScale: 85 });
for (let col = 1; col <= 12; col++) issueSheet.getColumn(col).width = col === 12 ? 30 : 14;
styleTitle(issueSheet, 'DATA QUALITY REVIEW', 'Records rejected or flagged during automated validation.', { endColumn: 12 });
const reviewCards = [
  { label: 'REJECTED RECORDS', value: report.metrics.rejected_rows, format: FORMAT.integer, start: 1, end: 4 },
  { label: 'DUPLICATE RECORDS', value: report.metrics.duplicates, format: FORMAT.integer, start: 5, end: 8 },
  { label: 'VALIDATION RATE', value: report.metrics.validation_rate_pct / 100, format: FORMAT.percent, start: 9, end: 12 }
];
for (const card of reviewCards) {
  const start = issueSheet.getColumn(card.start).letter;
  const end = issueSheet.getColumn(card.end).letter;
  issueSheet.mergeCells(`${start}6:${end}6`);
  issueSheet.mergeCells(`${start}7:${end}8`);
  const label = issueSheet.getCell(6, card.start);
  const value = issueSheet.getCell(7, card.start);
  label.value = card.label;
  label.font = { name: FONT, size: 9, bold: true, color: { argb: COLOR.blue } };
  label.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.paleBlue } };
  label.alignment = { horizontal: 'center', vertical: 'middle' };
  value.value = card.value;
  value.numFmt = card.format;
  value.font = { name: FONT, size: 16, bold: true, color: { argb: COLOR.navy } };
  value.alignment = { horizontal: 'center', vertical: 'middle' };
  value.border = { bottom: { style: 'thin', color: { argb: COLOR.border } } };
}
styleSectionBand(issueSheet, 10, 'ISSUE BREAKDOWN', 1, 4);
issueSheet.getCell('A11').value = 'Issue Category';
issueSheet.getCell('B11').value = 'Records';
for (const address of ['A11', 'B11']) {
  const cell = issueSheet.getCell(address);
  cell.font = { name: FONT, size: 10, bold: true, color: { argb: COLOR.white } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.blue } };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
}
issueSummary.forEach(([code, count], index) => {
  const row = 12 + index;
  issueSheet.getCell(row, 1).value = titleCaseCode(code);
  issueSheet.getCell(row, 2).value = count;
  issueSheet.getCell(row, 2).numFmt = FORMAT.integer;
  for (const col of [1, 2]) {
    const cell = issueSheet.getCell(row, col);
    cell.font = { name: FONT, size: 10, color: { argb: COLOR.text }, bold: col === 2 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: row % 2 === 0 ? COLOR.light : COLOR.white } };
    cell.alignment = { horizontal: col === 2 ? 'right' : 'left', vertical: 'middle' };
    cell.border = { bottom: { style: 'hair', color: { argb: COLOR.border } } };
  }
});
styleSectionBand(issueSheet, 17, 'RECORDS REQUIRING REVIEW', 1, 12);
const issueColumns = [
  ...rawColumns,
  { key: 'source_row', width: 13, type: 'integer' },
  { key: 'issue_reason', width: 30 }
];
writeTable(issueSheet, 18, issueColumns, issues, { issueColumnKey: 'issue_reason' });
setPrintLayout(issueSheet, `A1:L${18 + issues.length}`);

// Original synthetic source records, retained without visual cleanup of the values.
const rawSheet = baseSheet('Raw Inputs', { tabColor: COLOR.muted, frozenRows: 1, zoomScale: 90 });
writeTable(rawSheet, 1, rawColumns, raw);
setPrintLayout(rawSheet, `A1:J${raw.length + 1}`);

// Definitions and portfolio disclaimer
const definitions = baseSheet('Definitions', { tabColor: COLOR.accent, frozenRows: 8 });
definitions.getColumn(1).width = 28;
definitions.getColumn(2).width = 92;
styleTitle(definitions, 'REPORT DEFINITIONS', 'Business rules and data-quality terms used throughout this workbook.', { endColumn: 2 });
definitions.mergeCells('A5:B6');
definitions.getCell('A5').value = 'This workbook uses entirely synthetic data created for portfolio demonstration purposes. It does not contain real customer, company, or transaction records.';
definitions.getCell('A5').font = { name: FONT, size: 10, bold: true, color: { argb: COLOR.navy } };
definitions.getCell('A5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.paleBlue } };
definitions.getCell('A5').alignment = { vertical: 'middle', wrapText: true };
definitions.getCell('A5').border = { left: { style: 'medium', color: { argb: COLOR.blue } } };
definitions.getRow(5).height = 26;
definitions.getRow(6).height = 26;
const definitionRows = [
  { term: 'Raw Records', definition: 'All rows imported from the synthetic source CSV before validation or duplicate handling.' },
  { term: 'Valid Orders', definition: 'Records that pass validation and duplicate checks and are included in business reporting.' },
  { term: 'Rejected Records', definition: report.definitions.rejected_rows },
  { term: 'Duplicate Records', definition: 'Exact or conflicting repeat order IDs rejected from the validated dataset.' },
  { term: 'Recognized Sales', definition: `Revenue associated with orders that meet the project's recognized-sales business rule. ${report.definitions.recognized_sales_idr}` },
  { term: 'Gross Order Value', definition: 'Total value of valid orders before recognized-sales filtering.' },
  { term: 'Paid Orders', definition: 'Valid orders with payment status Paid, regardless of fulfillment status.' },
  { term: 'Delivered Orders', definition: 'Valid orders with fulfillment status Delivered, regardless of payment status.' },
  { term: 'Processing Orders', definition: report.definitions.processing_orders },
  { term: 'Cancelled Orders', definition: 'Valid orders with fulfillment status Cancelled, regardless of payment status.' },
  { term: 'Validation Rate', definition: 'Valid records divided by total raw records.' },
  { term: 'Date Normalization', definition: 'Supported source date formats are standardized to valid dates within January–June 2026.' },
  { term: 'Reproducibility', definition: 'Run npm run demo to regenerate the fixed-seed synthetic data, quality outputs, aggregations, and workbook.' }
];
writeTable(definitions, 8, [
  { key: 'term', header: 'Metric', width: 28 },
  { key: 'definition', header: 'Definition', width: 92 }
], definitionRows);
for (let row = 9; row <= 8 + definitionRows.length; row++) {
  definitions.getRow(row).height = 38;
  definitions.getCell(row, 2).alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
}
setPrintLayout(definitions, `A1:B${8 + definitionRows.length}`, 'portrait');

const destination = path.join(output, 'sales_operational_report.xlsx');
await wb.xlsx.writeFile(destination);
console.log(`Exported ${path.relative(root, destination)} with ${wb.worksheets.length} polished worksheets.`);
