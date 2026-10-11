import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {writeCSV} from '../src/csv.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const rnd=(()=>{let seed=26022026;return ()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)})();
const choose=items=>items[Math.floor(rnd()*items.length)];
const branches=['Jakarta','BEKASI',' bandung ','Bali'];
const channels=['online','RETAIL','Reseller'];
const categories=['Electronics','HOME LIVING','Accessories','Office Supplies'];
const statuses=['Paid','Paid','Paid','Pending','Refunded'];
const fulfillment=['Delivered','Delivered','Processing','Cancelled'];
const pricePoints=[65000,89000,125000,175000,240000,325000,450000,680000];
const pad=n=>String(n).padStart(2,'0');
const messyDate=(year,month,day,i)=>{
 const iso=`${year}-${pad(month)}-${pad(day)}`;
 if(i%4===0)return `${pad(day)}/${pad(month)}/${year}`;
 if(i%4===1)return `${pad(day)}-${pad(month)}-${year}`;
 if(i%4===2)return `${year}/${pad(month)}/${pad(day)}`;
 return iso;
};
const money=(n,i)=>i%3===0?`Rp ${n.toLocaleString('id-ID')}`:i%3===1?n.toLocaleString('en-US'):String(n);
const raw=[];
for(let i=1;i<=240;i++){
  const month=1+(i-1)%6; const day=1+Math.floor(rnd()*27);
  const quantity=1+Math.floor(rnd()*5);const price=choose(pricePoints);const total=quantity*price;
  raw.push({order_id:`ORD-2026-${String(i).padStart(4,'0')}`,order_date:messyDate(2026,month,day,i),branch:choose(branches),sales_channel:choose(channels),product_category:choose(categories),quantity:String(quantity),unit_price_idr:money(price,i),reported_total_idr:money(total,i+1),payment_status:choose(statuses),fulfillment_status:choose(fulfillment)});
}
// Inject issues into twelve otherwise unique source records.
for(let i=0;i<4;i++)raw[15+i].order_date='31/02/2026';
for(let i=0;i<4;i++)raw[35+i].unit_price_idr='N/A';
for(let i=0;i<4;i++)raw[55+i].reported_total_idr='999999999';
// Add exact repeats and conflicting repeats. These 15 extra rows must be rejected.
for(let i=0;i<12;i++)raw.push({...raw[80+i]});
for(let i=0;i<3;i++){ const source=raw[101+i]; const unit=Number(source.unit_price_idr.replace(/^Rp\s*/i,'').replace(/[\s.,]/g,'')); raw.push({...source,quantity:'8',reported_total_idr:String(unit*8)}); }
// Shuffle reproducibly so bad records and repeats look like ordinary file imports.
for(let i=raw.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[raw[i],raw[j]]=[raw[j],raw[i]];}
writeCSV(path.join(root,'data','raw_orders.csv'),raw,['order_id','order_date','branch','sales_channel','product_category','quantity','unit_price_idr','reported_total_idr','payment_status','fulfillment_status']);
console.log(`Generated ${raw.length} synthetic CSV rows (240 source orders + 15 duplicate copies).`);
