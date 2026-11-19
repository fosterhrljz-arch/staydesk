import {seed,validateBackup} from './model.js';

export const STORAGE_KEY='staydesk.data.v1';

export function loadWorkspace(storage){
 try {
  const raw=storage.getItem(STORAGE_KEY);
  if(raw)return {data:validateBackup(JSON.parse(raw)),error:null};
  const data=seed();storage.setItem(STORAGE_KEY,JSON.stringify(data));
  return {data,error:null};
 } catch {return {data:seed(),error:'storageError'};}
}

// Call within the shared browser Web Lock when available. The revision check
// also prevents a stale open drawer from overwriting a more recent transaction.
export function writeWorkspace(storage,current,produce){
 let raw;
 try {raw=storage.getItem(STORAGE_KEY);}catch{throw new Error('storageError');}
 let latest;
 try {latest=raw?validateBackup(JSON.parse(raw)):null;}catch{throw new Error('storageError');}
 if(!latest||latest.revision!==current.revision){const e=new Error('stale');e.latest=latest;throw e;}
 const next=produce(current);
 try {storage.setItem(STORAGE_KEY,JSON.stringify(next));}catch{throw new Error('storageError');}
 return next;
}
