const sum=(rows,key)=>rows.reduce((s,r)=>s+Number(r[key]||0),0);
function group(rows,key){
  const grouped=new Map();
  for(const r of rows){const k=r[key]; if(!grouped.has(k))grouped.set(k,[]);grouped.get(k).push(r);}
  return Array.from(grouped,([name,items])=>({name,orders:items.length,recognized_sales_idr:sum(items,'recognized_sales_idr'),gross_order_value_idr:sum(items,'total_idr')})).sort((a,b)=>a.name.localeCompare(b.name));
}
export function buildReport(raw,cleaned,rejected){
  const monthly=group(cleaned.map(r=>({...r,month:r.order_date.slice(0,7)})),'month');
  const branches=group(cleaned,'branch');
  const channels=group(cleaned,'sales_channel');
  const byIssue=Object.fromEntries([...new Set(rejected.flatMap(r=>r.issue_reason.split(';')))].sort().map(code=>[code,rejected.filter(r=>r.issue_reason.split(';').includes(code)).length]));
  const metrics={raw_rows:raw.length,valid_orders:cleaned.length,rejected_rows:rejected.length,duplicates: (byIssue.DUPLICATE_ORDER||0)+(byIssue.CONFLICTING_DUPLICATE||0),recognized_sales_idr:sum(cleaned,'recognized_sales_idr'),gross_order_value_idr:sum(cleaned,'total_idr'),paid_orders:cleaned.filter(r=>r.payment_status==='Paid').length,delivered_orders:cleaned.filter(r=>r.fulfillment_status==='Delivered').length,processing_orders:cleaned.filter(r=>r.fulfillment_status==='Processing').length,cancelled_orders:cleaned.filter(r=>r.fulfillment_status==='Cancelled').length,validation_rate_pct:Number((100*cleaned.length/raw.length).toFixed(2))};
  return {project:'Automated Sales & Operational Reporting',data_type:'100% synthetic / fictional retail operations',reporting_period:'January-June 2026',metrics,issues_by_reason:byIssue,monthly,branches,channels,definitions:{recognized_sales_idr:'Total amount for Paid orders whose fulfillment status is not Cancelled. Refunded and Pending payments are excluded.',rejected_rows:'Rows rejected from calculations due to invalid input, exact duplicate, or conflicting duplicate. Reviewed separately.',validation_rate_pct:'Accepted cleaned orders / total raw rows, including duplicate source rows.',processing_orders:'Accepted orders with fulfillment status Processing, independently of payment status.'}};
}
