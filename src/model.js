export const DAY=86400000;
export const dateToday=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
export const addDays=(d,n)=>new Date(Date.parse(d+'T12:00:00Z')+n*DAY).toISOString().slice(0,10);
export const nights=(a,b)=>Math.round((Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/DAY);
export const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!isNaN(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
export const uid=()=>globalThis.crypto?.randomUUID?.()||`id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const overlap=(a,b,c,d)=>a<d&&c<b;
export const moneyRound=n=>Math.round(n*100)/100;
export const paid=r=>moneyRound(r.payments.reduce((s,p)=>s+p.amount,0));
export const total=r=>r.status==='cancelled'?0:moneyRound(nights(r.arrival,r.departure)*r.rate);
export const balance=r=>moneyRound(total(r)-paid(r));
export const currentRoom=(r,date)=>r.segments.find(s=>s.start<=date&&s.end>date)?.roomId||r.segments.at(-1)?.roomId;
export const occupant=(db,id)=>db.reservations.find(r=>r.status==='inhouse'&&currentRoom(r,db.today)===id);
// Inventory reflects actual checkout. A same-day departure can still carry a
// minimum one-night charge without reserving the now-vacant room for tonight.
export function calendarSegments(r){
 if(r.status==='cancelled')return [];
 return r.segments.map(s=>({...s,end:r.status==='checkedout'&&r.checkedOutOn&&s.end>r.checkedOutOn?r.checkedOutOn:s.end})).filter(s=>s.start<s.end);
}
export function freeRoom(db,id,start,end,exclude){return !db.reservations.some(r=>r.id!==exclude&&(calendarSegments(r).some(s=>s.roomId===id&&overlap(start,end,s.start,s.end))||(r.status==='inhouse'&&r.departure<db.today&&currentRoom(r,db.today)===id&&start<=db.today&&end>db.today)));}
export function bookableRoom(db,id,start,end,exclude){const room=db.rooms.find(r=>r.id===id);return !!room&&(!room.createdOn||start>=room.createdOn)&&!(room.maintenance&&end>db.today)&&validDate(start)&&validDate(end)&&end>start&&freeRoom(db,id,start,end,exclude);}
export const reservedTonight=(db,id,date=db.today)=>db.reservations.some(r=>r.status==='confirmed'&&r.segments.some(s=>s.roomId===id&&s.start<=date&&s.end>date));
export function availability(db,date=db.today){
 const end=addDays(date,1),available=db.rooms.filter(r=>bookableRoom(db,r.id,date,end));
 const vacantClean=db.rooms.filter(r=>!r.maintenance&&!occupant(db,r.id)&&r.cleaning==='clean');
 return {available:available.length,vacantClean:vacantClean.length,reserved:db.rooms.filter(r=>reservedTonight(db,r.id,date)).length,ready:available.filter(r=>vacantClean.includes(r)).length,turnover:available.filter(r=>!vacantClean.includes(r)).length};
}
export function roomStatus(db,r){return r.maintenance?'maintenance':occupant(db,r.id)?'occupied':reservedTonight(db,r.id)?'reserved':r.cleaning==='clean'?(bookableRoom(db,r.id,db.today,addDays(db.today,1))?'available':'blocked'):r.cleaning;}
const fail=(code)=>{throw new Error(code)};
function audit(db,key,detail){db.activity.unshift({id:uid(),key,detail,at:new Date().toISOString()});db.activity=db.activity.slice(0,200);}
function checkStay(db,r,old){
 if(!r.guest?.trim())fail('guestRequired');
 if(!validDate(r.arrival)||!validDate(r.departure)||nights(r.arrival,r.departure)<1||nights(r.arrival,r.departure)>365)fail('invalidDates');
 if(!Number.isFinite(r.rate)||r.rate<0||r.rate>100000)fail('invalidRate');
 if(!Number.isInteger(r.guests)||r.guests<1)fail('invalidGuests');
 if(r.status==='confirmed'&&r.arrival<db.today)fail('pastArrival');
 for(const s of r.segments){const room=db.rooms.find(x=>x.id===s.roomId);if(!room)fail('roomRequired');if(s.end>db.today&&r.guests>room.capacity)fail('capacityError');if(room.maintenance&&s.end>db.today)fail('maintenanceError');if(!freeRoom(db,s.roomId,s.start,s.end,r.id))fail('overlapError');}
 if(old?.status==='inhouse'&&(r.arrival!==old.arrival||r.rate!==old.rate))fail('lockedStay');
 if(old?.status==='inhouse'&&r.departure<=db.today)fail('extendFuture');
}
export function transact(state,action){
 const db=structuredClone(state),p=action.payload||{},r=db.reservations.find(x=>x.id===p.id);
 switch(action.type){
 case 'saveReservation':{
  if(p.id&&!r)fail('invalidAction');
  if(r&&['checkedout','cancelled'].includes(r.status))fail('closedStay');
  const record={id:r?.id||uid(),status:r?.status||'confirmed',guest:String(p.guest||'').trim().slice(0,100),email:String(p.email||'').slice(0,150),phone:String(p.phone||'').slice(0,60),arrival:p.arrival,departure:p.departure,rate:Number(p.rate),guests:Number(p.guests),source:p.source||'Direct',notes:String(p.notes||'').slice(0,2000),payments:r?.payments||[],segments:[]};
  if(r?.status==='inhouse'){
   const oldRoom=currentRoom(r,db.today),changing=oldRoom!==p.roomId;
   if(changing&&r.departure<=db.today)fail('extendBeforeMove');
   record.segments=r.segments.filter(s=>s.start<db.today).map(s=>({...s,end:s.end>db.today&&changing?db.today:s.end}));
   if(changing){const target=db.rooms.find(x=>x.id===p.roomId);if(target?.cleaning!=='clean'||occupant(db,p.roomId))fail('roomNotReady');record.segments=record.segments.filter(s=>s.end<=db.today);record.segments.push({roomId:p.roomId,start:db.today,end:record.departure});db.rooms.find(x=>x.id===oldRoom).cleaning='dirty';}
   else {record.segments=structuredClone(r.segments);record.segments.at(-1).end=record.departure;}
  }else record.segments=[{roomId:p.roomId,start:record.arrival,end:record.departure}];
  checkStay(db,record,r);if(r)db.reservations[db.reservations.indexOf(r)]=record;else db.reservations.push(record);
  audit(db,r?'reservationUpdated':'reservationCreated',record.guest);break;
 }
 case 'checkin':{
  if(!r||r.status!=='confirmed')fail('invalidAction');if(r.arrival!==db.today)fail('arrivalToday');
  const room=db.rooms.find(x=>x.id===currentRoom(r,db.today));if(room.maintenance||room.cleaning!=='clean'||occupant(db,room.id))fail('roomNotReady');
  if(!freeRoom(db,room.id,r.arrival,r.departure,r.id))fail('overlapError');r.status='inhouse';audit(db,'checkedIn',r.guest);break;
 }
 case 'checkout':{
  if(!r||r.status!=='inhouse')fail('invalidAction');
  const end=db.today<=r.arrival?addDays(r.arrival,1):db.today;
  const revised={...r,departure:end};if(!freeRoom(db,currentRoom(r,db.today),r.segments.at(-1).start,end,r.id))fail('overlapError');if(Math.abs(balance(revised))>0.009)fail('settleBalance');
  const room=db.rooms.find(x=>x.id===currentRoom(r,db.today));r.departure=end;r.segments=r.segments.filter(s=>s.start<end).map(s=>({...s,end:s.end>end?end:s.end}));r.segments.at(-1).end=end;r.status='checkedout';r.checkedOutOn=db.today;room.cleaning='dirty';audit(db,'checkedOut',r.guest);break;
 }
 case 'cancel':if(!r||r.status!=='confirmed')fail('invalidAction');r.status='cancelled';audit(db,'reservationCancelled',r.guest);break;
 case 'payment':{
  if(!r)fail('invalidAction');const amount=moneyRound(Number(p.amount));if(!Number.isFinite(amount)||amount===0||Math.abs(amount)>1000000)fail('invalidPayment');
  if(amount<0&&-amount>paid(r)+0.001)fail('refundLimit');if(r.status==='cancelled'&&amount>0)fail('refundOnly');
  r.payments.push({id:uid(),amount,method:p.method||'Card',date:db.today,note:String(p.note||'').slice(0,200)});audit(db,amount<0?'refundRecorded':'paymentRecorded',r.guest);break;
 }
 case 'room':{
  let room=db.rooms.find(x=>x.id===p.id);
  if(p.id&&!room)fail('invalidAction');
  if(!room){if(db.rooms.length>=80)fail('roomLimit');room={id:uid(),number:'',type:'Classic Queen',capacity:2,rate:145,cleaning:'clean',maintenance:false,assignee:'',note:'',createdOn:db.today};db.rooms.push(room);}
  if(!String(p.number||'').trim()||db.rooms.some(x=>x.id!==room.id&&x.number===String(p.number).trim()))fail('roomNumber');
  if(!Number.isInteger(Number(p.capacity))||Number(p.capacity)<1||Number(p.capacity)>10||!Number.isFinite(Number(p.rate))||Number(p.rate)<0||Number(p.rate)>100000)fail('invalidRate');
  if(db.reservations.some(r=>['confirmed','inhouse'].includes(r.status)&&r.guests>Number(p.capacity)&&(r.segments.some(s=>s.roomId===room.id&&s.end>db.today)||(r.status==='inhouse'&&currentRoom(r,db.today)===room.id))))fail('capacityError');
  if(p.maintenance&&!room.maintenance&&(occupant(db,room.id)||db.reservations.some(b=>!['cancelled','checkedout'].includes(b.status)&&b.segments.some(s=>s.roomId===room.id&&s.end>db.today))))fail('maintenanceBooking');
  if(!['clean','dirty','cleaning','inspect'].includes(p.cleaning))fail('invalidAction');
  Object.assign(room,{number:String(p.number).trim().slice(0,12),type:['Classic Queen','Deluxe King','Suite'].includes(p.type)?p.type:'Classic Queen',capacity:Number(p.capacity),rate:Number(p.rate),cleaning:p.cleaning,maintenance:!!p.maintenance,assignee:String(p.assignee||'').slice(0,60),note:String(p.note||'').slice(0,500)});audit(db,'roomUpdated',room.number);break;
 }
 case 'settings':if(!validDate(p.today)||!p.name?.trim())fail('invalidSettings');if(p.today<db.today)fail('backwardDate');db.today=p.today;db.property.name=p.name.trim().slice(0,80);db.property.currency=p.currency==='CNY'?'CNY':'USD';audit(db,'settingsUpdated',db.property.name);break;
 default:fail('invalidAction');
 }
 db.revision++;db.savedAt=new Date().toISOString();return db;
}
export function dailyStats(db,date){
 const stays=db.reservations.filter(r=>r.status!=='cancelled'&&r.arrival<=date&&r.departure>date);
 const sold=new Set(stays.flatMap(r=>calendarSegments(r).filter(s=>s.start<=date&&s.end>date).map(s=>s.roomId))).size;
 const capacity=db.rooms.filter(r=>!r.createdOn||r.createdOn<=date).length;
 return {date,sold,capacity,occupancy:capacity?Math.round(sold/capacity*1000)/10:0,revenue:moneyRound(stays.reduce((s,r)=>s+r.rate,0)),payments:moneyRound(db.reservations.reduce((s,r)=>s+r.payments.filter(p=>p.date===date).reduce((v,p)=>v+p.amount,0),0))};
}
export function reportRows(db,start,end){if(!validDate(start)||!validDate(end)||nights(start,end)<0||nights(start,end)>365)return [];return Array.from({length:nights(start,end)+1},(_,i)=>dailyStats(db,addDays(start,i)));}
export function seed(today=dateToday()){
 const rooms=Array.from({length:24},(_,i)=>({id:`room-${i+1}`,number:String((i<12?100:200)+(i%12)+1),type:i%6===5?'Suite':i%3===0?'Deluxe King':'Classic Queen',capacity:i%6===5?4:2,rate:i%6===5?240:i%3===0?185:145,cleaning:[5,8,18].includes(i)?'dirty':i===9?'cleaning':i===21?'inspect':'clean',maintenance:i===23,assignee:i%2?'Maria Santos':'Alex Kim',note:i===23?'Air-conditioning service':''}));
 const names=['Emma Wilson','James Chen','Olivia Martin','Lucas Brown','Sofia Garcia','Noah Anderson','Mia Thompson','Ethan Williams','Isabella Rossi','Liam Taylor','Amelia Davis','Oliver Smith','Charlotte Lee','Henry Clark','Harper Evans','Jack Miller','Ava Robinson','Leo Walker','Grace Hall','William Young','Chloe Lewis','Daniel Allen'];
 const reservations=[];let seq=0;
 function make(i,start,end,status,name,part=1){const room=rooms[i],a=addDays(today,start),b=addDays(today,end);const r={id:`SD-${String(++seq).padStart(4,'0')}`,guest:name||names[seq%names.length],email:`guest${seq}@example.com`,phone:'',arrival:a,departure:b,rate:room.rate,guests:2,source:['Direct','Booking.com','Expedia','Phone'][seq%4],notes:seq%5===0?'Quiet room preferred.':'',status,segments:[{roomId:room.id,start:a,end:b}],payments:[]};r.payments=[{id:`pay-${seq}`,amount:moneyRound(total(r)*part),date:a,method:seq%3?'Card':'Cash',note:'Sample payment'}];reservations.push(r);}
 for(let i=0;i<23;i++){for(let d=-28;d<-4;d+=4+(i%3)){if((i+d)%5!==0)make(i,d,Math.min(d+2+(i%2),-4),'checkedout');}}
 [0,1,2,3,4,6,10,12,13,14,15,16,19].forEach((i,n)=>make(i,-2-n%2,n<3?0:2+n%3,'inhouse',names[n+5],n===4?.5:1));
 [5,7,8,11,17].forEach((i,n)=>make(i,0,2+n%3,'confirmed',names[n],n%2?.5:1));
 [0,2,4,6,9,10,12,13,15,18,20,21,22].forEach((i,n)=>make(i,5+n%3,8+n%3,'confirmed',names[(n+8)%names.length],.5));
 for(let d=-7;d<0;d++)for(let i=0;i<23;i++){const a=addDays(today,d),b=addDays(today,d+1);if((i+d)%5!==0&&!reservations.some(r=>r.segments.some(s=>s.roomId===rooms[i].id&&overlap(a,b,s.start,s.end))))make(i,d,d+1,'checkedout');}
 return {version:1,revision:0,today,property:{name:'The Willow House',currency:'USD'},rooms,reservations,activity:[{id:uid(),key:'welcomeActivity',detail:'StayDesk',at:new Date().toISOString()}],savedAt:new Date().toISOString()};
}
export function validateBackup(db){
 const text=v=>typeof v==='string',enumValue=(v,values)=>values.includes(v);
 if(!db||db.version!==1||!Array.isArray(db.rooms)||db.rooms.length<1||db.rooms.length>80||!Array.isArray(db.reservations)||db.reservations.length>20000||!validDate(db.today)||!text(db.property?.name)||!db.property.name.trim()||!enumValue(db.property.currency,['USD','CNY'])||!Array.isArray(db.activity)||!Number.isInteger(db.revision)||db.revision<0)fail('invalidBackup');
 if(db.activity.some(a=>!a||!['id','key','detail','at'].every(k=>text(a[k]))))fail('invalidBackup');
 const roomIds=new Set(),numbers=new Set();
 for(const room of db.rooms){
  if(!room||!['id','number','type','assignee','note'].every(k=>text(room[k]))||!room.id||!room.number.trim()||roomIds.has(room.id)||numbers.has(room.number)||!enumValue(room.type,['Classic Queen','Deluxe King','Suite'])||!enumValue(room.cleaning,['clean','dirty','cleaning','inspect'])||!Number.isInteger(room.capacity)||room.capacity<1||room.capacity>10||typeof room.maintenance!=='boolean'||!Number.isFinite(room.rate)||room.rate<0||room.rate>100000||(room.createdOn!==undefined&&!validDate(room.createdOn)))fail('invalidBackup');
  roomIds.add(room.id);numbers.add(room.number);
 }
 const rids=new Set();
 for(const r of db.reservations){
  if(!r||!['id','guest','email','phone','notes','source'].every(k=>text(r[k]))||!r.id||!r.guest.trim()||rids.has(r.id)||!enumValue(r.status,['confirmed','inhouse','checkedout','cancelled'])||!validDate(r.arrival)||!validDate(r.departure)||nights(r.arrival,r.departure)<1||nights(r.arrival,r.departure)>365||!Number.isFinite(r.rate)||r.rate<0||r.rate>100000||!Number.isInteger(r.guests)||r.guests<1||!Array.isArray(r.payments)||!Array.isArray(r.segments)||!r.segments.length)fail('invalidBackup');
  if(r.checkedOutOn!==undefined&&(r.status!=='checkedout'||!validDate(r.checkedOutOn)||r.checkedOutOn<r.arrival||r.checkedOutOn>r.departure||r.checkedOutOn>db.today))fail('invalidBackup');
  if(r.status==='inhouse'&&r.arrival>db.today)fail('invalidBackup');
  rids.add(r.id);let cursor=r.arrival;
  for(const segment of r.segments){
   if(!segment||!roomIds.has(segment.roomId)||segment.start!==cursor||!validDate(segment.end)||segment.end<=segment.start)fail('invalidBackup');
   const room=db.rooms.find(x=>x.id===segment.roomId);
   if(room.createdOn&&segment.start<room.createdOn)fail('invalidBackup');
   if(['confirmed','inhouse'].includes(r.status)&&segment.end>db.today&&(r.guests>room.capacity||room.maintenance))fail('invalidBackup');
   cursor=segment.end;
  }
  if(cursor!==r.departure)fail('invalidBackup');
  const paymentIds=new Set();let net=0;
  for(const p of r.payments){
   if(!p||!['id','method','note'].every(k=>text(p[k]))||!p.id||paymentIds.has(p.id)||!Number.isFinite(p.amount)||Math.abs(p.amount)>1000000||!validDate(p.date))fail('invalidBackup');
   paymentIds.add(p.id);net=moneyRound(net+p.amount);if(net<0)fail('invalidBackup');
  }
 }
 for(const room of db.rooms){
  const segments=db.reservations.flatMap(r=>calendarSegments(r).filter(s=>s.roomId===room.id)).sort((a,b)=>a.start.localeCompare(b.start));
  for(let i=1;i<segments.length;i++)if(segments[i].start<segments[i-1].end)fail('invalidBackup');
  const guests=db.reservations.filter(r=>r.status==='inhouse'&&currentRoom(r,db.today)===room.id);
  if(guests.length>1||(guests.length&&(room.maintenance||guests[0].guests>room.capacity)))fail('invalidBackup');
 }
 return db;
}
