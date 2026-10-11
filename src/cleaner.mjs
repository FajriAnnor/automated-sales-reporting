const BRANCHES = {jakarta:'Jakarta',bekasi:'Bekasi',bandung:'Bandung',bali:'Bali'};
const CHANNELS = {online:'Online',retail:'Retail',reseller:'Reseller'};
const CATEGORIES = {'accessories':'Accessories','home living':'Home Living','office supplies':'Office Supplies','electronics':'Electronics'};
const PAYMENTS = {paid:'Paid',pending:'Pending',refunded:'Refunded'};
const FULFILLMENT = {delivered:'Delivered',processing:'Processing',cancelled:'Cancelled'};
const pad=n=>String(n).padStart(2,'0');
export function normalizeDate(input){
  const s=String(input||'').trim();
  let y,m,d;
  if(/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(s)) [y,m,d]=s.split(/[-/]/).map(Number);
  else if(/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(s)) [d,m,y]=s.split(/[/-]/).map(Number);
  else return null;
  const dt=new Date(Date.UTC(y,m-1,d));
  if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==m-1||dt.getUTCDate()!==d||y!==2026||m<1||m>6) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}
export function parseIdr(value){
  const normalized=String(value??'').trim().replace(/^Rp\s*/i,'').replace(/[\s.,]/g,'');
  return /^\d+$/.test(normalized) && Number.isSafeInteger(Number(normalized))?Number(normalized):null;
}
const canon=(v,map)=>map[String(v??'').trim().replace(/\s+/g,' ').toLowerCase()]??null;
export function normalizeRow(row){
  const errors=[];
  const orderId=String(row.order_id??'').trim().toUpperCase();
  if(!/^ORD-2026-\d{4}$/.test(orderId)) errors.push('INVALID_ORDER_ID');
  const date=normalizeDate(row.order_date);
  if(!date) errors.push('INVALID_DATE');
  const branch=canon(row.branch,BRANCHES);if(!branch)errors.push('INVALID_BRANCH');
  const channel=canon(row.sales_channel,CHANNELS);if(!channel)errors.push('INVALID_CHANNEL');
  const category=canon(row.product_category,CATEGORIES);if(!category)errors.push('INVALID_CATEGORY');
  const qty=Number(String(row.quantity??'').trim());if(!Number.isInteger(qty)||qty<=0)errors.push('INVALID_QUANTITY');
  const price=parseIdr(row.unit_price_idr);if(price===null||price<=0)errors.push('INVALID_PRICE');
  const reported=parseIdr(row.reported_total_idr);if(reported===null)errors.push('INVALID_REPORTED_TOTAL');
  const pay=canon(row.payment_status,PAYMENTS);if(!pay)errors.push('INVALID_PAYMENT');
  const fulfillment=canon(row.fulfillment_status,FULFILLMENT);if(!fulfillment)errors.push('INVALID_FULFILLMENT');
  const computed=qty*price;
  if(!errors.length && computed!==reported) errors.push('TOTAL_MISMATCH');
  const cleaned={order_id:orderId,order_date:date,branch,sales_channel:channel,product_category:category,quantity:qty,unit_price_idr:price,total_idr:computed,payment_status:pay,fulfillment_status:fulfillment,
  recognized_sales_idr:pay==='Paid'&&fulfillment!=='Cancelled'?computed:0};
  return {cleaned,errors};
}
function rowFingerprint(record){return JSON.stringify(record);}
export function cleanRows(rawRows){
  const seen=new Map(); const cleaned=[]; const rejected=[];
  rawRows.forEach((raw,index)=>{
    const {cleaned:record,errors}=normalizeRow(raw);
    if(!errors.length && seen.has(record.order_id)){
      errors.push(rowFingerprint(seen.get(record.order_id))===rowFingerprint(record)?'DUPLICATE_ORDER':'CONFLICTING_DUPLICATE');
    }
    if(errors.length) rejected.push({...raw, source_row:index+2,issue_reason:errors.join(';')});
    else {seen.set(record.order_id,record);cleaned.push(record);}
  });
  return {cleaned,rejected};
}
