import fs from 'node:fs';

export function parseCSV(text) {
  const result=[]; let row=[],field='',inQuotes=false;
  const source=text.replace(/^\uFEFF/, '');
  for(let i=0;i<source.length;i++) {
    const ch=source[i];
    if(ch==='"') {
      if(inQuotes && source[i+1]==='"'){field+='"';i++;}
      else inQuotes=!inQuotes;
    } else if(ch===',' && !inQuotes) {row.push(field);field='';}
    else if((ch==='\n'||ch==='\r') && !inQuotes) {
      if(ch==='\r' && source[i+1]==='\n') i++;
      row.push(field);field='';
      if(row.some(v=>v!==''))result.push(row);
      row=[];
    } else field+=ch;
  }
  if(inQuotes) throw new Error('Unclosed quote in CSV');
  if(field || row.length) {row.push(field); result.push(row);}
  if(!result.length) return [];
  const [headers,...rows]=result;
  return rows.map((r,i)=>{
    if(r.length!==headers.length) throw new Error(`CSV column count mismatch on data line ${i+2}`);
    return Object.fromEntries(headers.map((h,j)=>[h,r[j]]));
  });
}

function quote(v) { const s=String(v??'');return /[",\r\n]/.test(s)?'"'+s.replaceAll('"','""')+'"':s; }
export function toCSV(rows, headers) {
  return [headers.join(','),...rows.map(row=>headers.map(h=>quote(row[h])).join(','))].join('\n')+'\n';
}
export function readCSV(path) {return parseCSV(fs.readFileSync(path,'utf8'));}
export function writeCSV(path,rows,headers) {fs.writeFileSync(path,toCSV(rows,headers),'utf8');}
