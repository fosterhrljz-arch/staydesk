import ExcelJS from 'exceljs';
export function download(data,name,type){const blob=new Blob([data],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
const safe=v=>typeof v==='string'&&/^[=+@\-\t\r]/.test(v)?"'"+v:v;
export async function exportTable(headers,rows,name,format){
 if(format==='csv'){download('\uFEFF'+[headers,...rows].map(r=>r.map(v=>'"'+String(safe(v)??'').replaceAll('"','""')+'"').join(',')).join('\r\n'),name+'.csv','text/csv;charset=utf-8');return;}
 const wb=new ExcelJS.Workbook();wb.creator='StayDesk';const ws=wb.addWorksheet('StayDesk');ws.addRow(headers);rows.forEach(r=>ws.addRow(r.map(safe)));ws.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};ws.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF12776B'}};ws.columns.forEach(c=>c.width=23);ws.autoFilter={from:{row:1,column:1},to:{row:rows.length+1,column:headers.length}};ws.views=[{state:'frozen',ySplit:1}];download(await wb.xlsx.writeBuffer(),name+'.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
