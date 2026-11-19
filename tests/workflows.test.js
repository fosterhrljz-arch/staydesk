import test from 'node:test';
import assert from 'node:assert/strict';
import {seed,transact,validateBackup,availability,dailyStats,calendarSegments,bookableRoom,roomStatus,addDays,balance,paid} from '../src/model.js';
const today='2026-11-15';
const empty=()=>{const db=seed(today);db.reservations=[];db.rooms.forEach(r=>{r.cleaning='clean';r.maintenance=false;});return db;};
function book(db,extra={}){return transact(db,{type:'saveReservation',payload:{guest:'Guest',email:'',phone:'',arrival:db.today,departure:addDays(db.today,2),rate:100,guests:2,roomId:'room-1',source:'Direct',notes:'',...extra}});}
const action=(db,type,payload)=>transact(db,{type,payload});

test('sample availability separates physical readiness, reservations and sellable inventory',()=>{
 const db=seed(today),a=availability(db);assert.deepEqual(a,{available:8,vacantClean:5,reserved:5,ready:2,turnover:6});
 const booked=dailyStats(db,today).sold;assert.equal(booked,15);assert.equal(booked+a.available+db.rooms.filter(r=>r.maintenance).length,db.rooms.length);
 for(const room of db.rooms){const bars=db.reservations.flatMap(calendarSegments).filter(s=>s.roomId===room.id&&s.start<=today&&s.end>today);if(bookableRoom(db,room.id,today,addDays(today,1)))assert.equal(bars.length,0);}
});

test('a clean vacant reserved room is not offered as unreserved inventory',()=>{
 let db=book(empty());assert.equal(availability(db).vacantClean,24);assert.equal(availability(db).reserved,1);assert.equal(availability(db).available,23);assert.equal(roomStatus(db,db.rooms[0]),'reserved');
 db=action(db,'cancel',{id:db.reservations[0].id});assert.equal(availability(db).available,24);assert.equal(roomStatus(db,db.rooms[0]),'available');
});

test('due-out room accepts tonight reservation but requires checkout then cleaning before check-in',()=>{
 let db=book(empty(),{departure:addDays(today,1)}),first=db.reservations[0].id;
 db=action(db,'checkin',{id:first});db=action(db,'payment',{id:first,amount:100});db=action(db,'settings',{...db.property,today:addDays(today,1)});
 assert.equal(availability(db).available,24);assert.equal(availability(db).ready,23);
 db=book(db,{guest:'Next guest'});const next=db.reservations[1].id;
 assert.throws(()=>action(db,'checkin',{id:next}),/roomNotReady/);
 db=action(db,'checkout',{id:first});assert.equal(db.rooms[0].cleaning,'dirty');assert.throws(()=>action(db,'checkin',{id:next}),/roomNotReady/);
 db=action(db,'room',{...db.rooms[0],cleaning:'clean'});db=action(db,'checkin',{id:next});assert.equal(db.reservations[1].status,'inhouse');assert.doesNotThrow(()=>validateBackup(db));
});

test('same-day checkout releases inventory, retains its minimum charge and allows re-letting',()=>{
 let db=book(empty()),id=db.reservations[0].id;db=action(db,'checkin',{id});db=action(db,'payment',{id,amount:100});db=action(db,'checkout',{id});
 assert.equal(calendarSegments(db.reservations[0]).length,0);assert.equal(availability(db).available,24);assert.equal(availability(db).ready,23);assert.equal(dailyStats(db,today).sold,0);assert.equal(dailyStats(db,today).revenue,100);
 db=book(db,{guest:'Replacement guest'});assert.equal(dailyStats(db,today).sold,1);assert.equal(dailyStats(db,today).revenue,200);assert.doesNotThrow(()=>validateBackup(db));
});

test('historical room segment does not conflict with its current occupant after a move',()=>{
 let db=book(empty(),{departure:addDays(today,5)}),r=db.reservations[0];db=action(db,'checkin',{id:r.id});db=action(db,'settings',{...db.property,today:addDays(today,1)});
 db=book(db,{...db.reservations[0],roomId:'room-2'});db=action(db,'room',{...db.rooms[0],cleaning:'clean'});db=book(db,{guest:'Next guest',departure:addDays(today,4)});db=action(db,'checkin',{id:db.reservations[1].id});
 db=book(db,{...db.reservations[0],roomId:'room-2',notes:'Quiet room',departure:addDays(today,6)});
 assert.equal(db.reservations[0].notes,'Quiet room');assert.equal(db.reservations[0].segments.length,2);assert.equal(dailyStats(db,today).revenue,100);assert.doesNotThrow(()=>validateBackup(db));
});

test('room move with overlapping future stay fails atomically without dirtying old room',()=>{
 let db=book(empty(),{departure:addDays(today,5)});const r=db.reservations[0];db=action(db,'checkin',{id:r.id});db=book(db,{roomId:'room-2',arrival:addDays(today,3),departure:addDays(today,6)});
 const before=JSON.stringify(db);assert.throws(()=>book(db,{...r,roomId:'room-2'}),/overlapError/);assert.equal(JSON.stringify(db),before);
});

test('shortening and extension change charges; cancellation and refund reconcile reports',()=>{
 let db=book(empty()),r=db.reservations[0];db=action(db,'payment',{id:r.id,amount:200});db=book(db,{...r,roomId:'room-1',departure:addDays(today,3)});assert.equal(balance(db.reservations[0]),100);
 db=book(db,{...db.reservations[0],roomId:'room-1',departure:addDays(today,1)});assert.equal(balance(db.reservations[0]),-100);
 db=action(db,'cancel',{id:r.id});assert.equal(dailyStats(db,today).revenue,0);assert.equal(dailyStats(db,today).payments,200);
 db=action(db,'payment',{id:r.id,amount:-200});assert.equal(paid(db.reservations[0]),0);assert.equal(dailyStats(db,today).payments,0);assert.doesNotThrow(()=>validateBackup(db));
});

test('business date cannot move backward; confirmed edits cannot create past arrivals',()=>{
 let db=book(empty());assert.throws(()=>action(db,'settings',{...db.property,today:addDays(today,-1)}),/backwardDate/);
 assert.throws(()=>book(db,{...db.reservations[0],roomId:'room-1',arrival:addDays(today,-1)}),/pastArrival/);
});

test('new rooms do not change historical report capacity',()=>{
 let db=empty();db=action(db,'room',{number:'301',type:'Suite',capacity:4,rate:250,cleaning:'clean',maintenance:false,assignee:'',note:''});
 assert.equal(dailyStats(db,addDays(today,-1)).capacity,24);assert.equal(dailyStats(db,today).capacity,25);assert.doesNotThrow(()=>validateBackup(db));
});

test('backup validation rejects duplicate room numbers, excessive refunds and duplicate physical occupants',()=>{
 let db=book(empty());db.rooms[1].number=db.rooms[0].number;assert.throws(()=>validateBackup(db),/invalidBackup/);
 db=book(empty());db.reservations[0].payments=[{id:'p',amount:-1,date:today,method:'Cash',note:''}];assert.throws(()=>validateBackup(db),/invalidBackup/);
 db=book(empty(),{departure:addDays(today,1)});db=action(db,'checkin',{id:db.reservations[0].id});db.today=addDays(today,1);db=book(db);db.reservations[1].status='inhouse';assert.throws(()=>validateBackup(db),/invalidBackup/);
});

test('late checkout cannot overwrite the next booking or erase a conflicting paid night',()=>{
 let db=book(empty(),{departure:addDays(today,1)}),id=db.reservations[0].id;db=action(db,'checkin',{id});db=book(db,{arrival:addDays(today,1),departure:addDays(today,3)});db.today=addDays(today,2);db=action(db,'payment',{id,amount:200});
 const before=JSON.stringify(db);assert.throws(()=>action(db,'checkout',{id}),/overlapError/);assert.equal(JSON.stringify(db),before);
});

test('legacy checkout records never advertise a held calendar night as ready',()=>{
 let db=book(empty()),id=db.reservations[0].id;db=action(db,'checkin',{id});db=action(db,'payment',{id,amount:100});db=action(db,'checkout',{id});delete db.reservations[0].checkedOutOn;db.rooms[0].cleaning='clean';
 assert.equal(availability(db).ready,23);assert.equal(roomStatus(db,db.rooms[0]),'blocked');assert.doesNotThrow(()=>validateBackup(db));
});
