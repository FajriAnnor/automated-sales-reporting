import test from 'node:test';import assert from 'node:assert/strict';
import {readCSV,toCSV,parseCSV} from '../src/csv.mjs';
import {cleanRows,normalizeDate,parseIdr} from '../src/cleaner.mjs';
import {buildReport} from '../src/analytics.mjs';
test('Indonesian date formats and amount formatting normalize correctly',()=>{
  assert.equal(normalizeDate('02/10/2026'),null); // dataset is Jan-Jun only
  assert.equal(normalizeDate('02/03/2026'),'2026-03-02');
  assert.equal(normalizeDate('2026/06/30'),'2026-06-30');
  assert.equal(normalizeDate('31/02/2026'),null);
  assert.equal(parseIdr('Rp 1.250.000'),1250000);
  assert.equal(parseIdr('1,250,000'),1250000);
  assert.equal(parseIdr('N/A'),null);
});
test('CSV escaped commas and quotes round trip',()=>{
  assert.deepEqual(parseCSV(toCSV([{a:'a,"b"',b:'ok'}],['a','b'])),[{a:'a,"b"',b:'ok'}]);
});
test('Synthetic project validates, segregates issues and reconciles totals',()=>{
  const raw=readCSV(new URL('../data/raw_orders.csv',import.meta.url));
  const {cleaned,rejected}=cleanRows(raw);
  const report=buildReport(raw,cleaned,rejected);
  assert.equal(raw.length,255);
  assert.equal(cleaned.length,228);
  assert.equal(rejected.length,27);
  assert.equal(report.metrics.duplicates,15);
  assert.equal(report.monthly.reduce((a,r)=>a+r.orders,0),228);
  assert.equal(report.branches.reduce((a,r)=>a+r.orders,0),228);
  assert.equal(report.monthly.reduce((a,r)=>a+r.recognized_sales_idr,0),report.metrics.recognized_sales_idr);
  assert.equal(new Set(cleaned.map(r=>r.order_id)).size,228);
  assert.ok(rejected.some(r=>r.issue_reason==='TOTAL_MISMATCH'));
  assert.ok(rejected.some(r=>r.issue_reason==='CONFLICTING_DUPLICATE'));
});
