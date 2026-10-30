import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {handle,referral} from '../server/workspace.mjs';
const sql=new DatabaseSync(':memory:');sql.exec(readFileSync('drizzle/0000_safe_doctor_octopus.sql','utf8'));
const db={prepare(q){let vals=[];return {bind(...a){vals=a;return this},async first(){return sql.prepare(q).get(...vals)||null},async all(){return {results:sql.prepare(q).all(...vals)}},async run(){const r=sql.prepare(q).run(...vals);return {meta:{changes:r.changes}}}}},async batch(ss){sql.exec('BEGIN');try{const r=await Promise.all(ss.map(s=>s.run()));sql.exec('COMMIT');return r}catch(e){sql.exec('ROLLBACK');throw e}}};
const blobs=new Map(),env={DB:db,BUCKET:{async put(k,b){blobs.set(k,b)},async get(k){return blobs.has(k)?{body:blobs.get(k)}:null},async delete(k){blobs.delete(k)}}};
const owner=['owner-user','fatih.altas@elevandos.com'],alice=['alice','alice@test.com'],bob=['bob','bob@test.com'],staff=['staff','staff@test.com'];
async function call(path,user,body,method){const h={'Origin':'https://site.test'};if(user){h['oai-authenticated-user-id']=user[0];h['oai-authenticated-user-email']=user[1]}let opts={method:method||(!body?'GET':'POST'),headers:h};if(body)opts.body=body instanceof FormData?body:JSON.stringify(body);const r=await handle(new Request('https://site.test/api/workspace/'+path,opts),env);const text=await r.text();let data;try{data=JSON.parse(text)}catch{data=text}return {status:r.status,data}}

import {handleAdvisor} from '../server/advisor.mjs';

async function ac(path,user=owner,body){const h={'Origin':'https://site.test','oai-authenticated-user-id':user[0],'oai-authenticated-user-email':user[1]};const r=await handleAdvisor(new Request('https://site.test/api/advisor/'+path,{method:body?'POST':'GET',headers:h,body:body instanceof FormData?body:body?JSON.stringify(body):undefined}),env);let data;try{data=await r.json()}catch{}return {status:r.status,data};}
await call('bootstrap',owner);
await call('register',alice,{name:'Alice'});
assert.equal((await ac('cases',alice)).status,403);
const payload={requestId:crypto.randomUUID(),name:'New Customer',email:'new@test.com',phone:'+905551234567',service:'Vize',from:'Türkiye'};
let created=await ac('create',owner,payload);assert.equal(created.status,200,JSON.stringify(created));const cid=created.data.id;
assert.equal((await ac('create',owner,payload)).data.id,cid);
assert.equal(sql.prepare("SELECT count(*) n FROM items WHERE kind='application'").get().n,1);
assert.equal((await ac('create',owner,{...payload,requestId:crypto.randomUUID(),phone:''})).status,400);
function form(slot){const f=new FormData();f.set('id',cid);f.set('slot',slot);f.set('file',new Blob(['%PDF-1.7 test']),'doc.pdf');return f;}
assert.equal((await ac('upload',owner,form(0))).status,400);
assert.equal((await ac('sale',owner,{id:cid,reference:'contract-1'})).status,200);
await call('team',owner,{name:'Assigned Lawyer',email:'lawyer@test.com',permissions:{applications:1,documents:1},scope:[]});
await call('bootstrap',['lawyer','lawyer@test.com']);const lawyer=sql.prepare("SELECT id FROM people WHERE email='lawyer@test.com'").get().id;
assert.equal((await ac('assign',owner,{id:cid,lawyer})).status,200);
for(let slot=0;slot<5;slot++){assert.equal((await ac('upload',owner,form(slot))).status,200);const c=(await ac('cases')).data.cases[0],f=c.files.find(f=>f.slot===slot);assert.equal((await ac('review',owner,{id:cid,file:f.id,status:slot===4?'Reddedildi':'Onaylandı',reason:'Manually checked'})).status,200);}
assert.equal(sql.prepare("SELECT count(*) n FROM items WHERE id=?").get('handoff-'+cid).n,0);
let c=(await ac('cases')).data.cases[0];const f=c.files.find(f=>f.slot===4);
let result=await ac('review',owner,{id:cid,file:f.id,status:'Onaylandı',reason:'Rechecked'});assert.equal(result.data.status,'Avukata iletildi',JSON.stringify(result));
assert.equal((await ac('review',owner,{id:cid,file:f.id,status:'Onaylandı',reason:'Again'})).status,409);
assert.equal(sql.prepare("SELECT count(*) n FROM items WHERE id=?").get('handoff-'+cid).n,1);
assert.equal((await ac('cases',['lawyer','lawyer@test.com'])).data.cases.length,1);
await call('team',owner,{name:'Other Advisor',email:'other@test.com',role:'advisor',permissions:{applications:2,documents:2,kyc:2,customers:2,finance:2},scope:'all'});
await call('bootstrap',['other','other@test.com']);
assert.equal((await ac('cases',['other','other@test.com'])).data.cases.length,0);
assert.equal((await ac('sale',['other','other@test.com'],{id:cid,reference:'x'})).status,403);
assert.equal((await ac('cases')).data.cases[0].files.length,5);
console.log('PASS: advisor-only access, intake validation/idempotency, sale gate, document review, rejection gate, lawyer handoff once, cross-advisor isolation.');
