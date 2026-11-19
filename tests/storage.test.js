import test from 'node:test';
import assert from 'node:assert/strict';
import {loadWorkspace,writeWorkspace,STORAGE_KEY} from '../src/storage.js';
import {transact} from '../src/model.js';
const memory=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};};
test('first-run sample data is actually persisted and reloaded unchanged',()=>{const s=memory(),first=loadWorkspace(s);assert.equal(first.error,null);assert.ok(s.getItem(STORAGE_KEY));assert.deepEqual(loadWorkspace(s).data,first.data);});
test('stale writes cannot overwrite a newer transaction',()=>{const s=memory(),current=loadWorkspace(s).data;const next=writeWorkspace(s,current,d=>transact(d,{type:'settings',payload:{name:'Updated property',today:d.today,currency:'USD'}}));assert.throws(()=>writeWorkspace(s,current,()=>current),/stale/);assert.equal(JSON.parse(s.getItem(STORAGE_KEY)).property.name,'Updated property');assert.equal(next.revision,current.revision+1);});
test('storage failure leaves committed records and caller state intact',()=>{const s=memory(),current=loadWorkspace(s).data,raw=s.getItem(STORAGE_KEY);s.setItem=()=>{throw new Error('quota');};assert.throws(()=>writeWorkspace(s,current,d=>transact(d,{type:'settings',payload:{name:'Unsaved',today:d.today,currency:'USD'}})),/storageError/);assert.equal(s.getItem(STORAGE_KEY),raw);assert.equal(current.property.name,'The Willow House');});
test('corrupt storage is preserved rather than overwritten by sample data',()=>{const s=memory();s.setItem(STORAGE_KEY,'{bad json');assert.equal(loadWorkspace(s).error,'storageError');assert.equal(s.getItem(STORAGE_KEY),'{bad json');});
