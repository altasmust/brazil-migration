import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {handle,referral} from '../server/workspace.mjs';
const sql=new DatabaseSync(':memory:');sql.exec(readFileSync('drizzle/0000_safe_doctor_octopus.sql','utf8'));
const db={prepare(q){let vals=[];return {bind(...a){vals=a;return this},async first(){return sql.prepare(q).get(...vals)||null},async all(){return {results:sql.prepare(q).all(...vals)}},async run(){const r=sql.prepare(q).run(...vals);return {meta:{changes:r.changes}}}}},async batch(ss){sql.exec('BEGIN');try{const r=await Promise.all(ss.map(s=>s.run()));sql.exec('COMMIT');return r}catch(e){sql.exec('ROLLBACK');throw e}}};
const blobs=new Map(),env={DB:db,BUCKET:{async put(k,b){blobs.set(k,b)},async get(k){return blobs.has(k)?{body:blobs.get(k)}:null},async delete(k){blobs.delete(k)}}};
const owner=['owner-user','admin@brazilmigration.com'],alice=['alice','alice@test.com'],bob=['bob','bob@test.com'],staff=['staff','staff@test.com'];
async function call(path,user,body,method){const h={'Origin':'https://site.test'};if(user){h['oai-authenticated-user-id']=user[0];h['oai-authenticated-user-email']=user[1]}let opts={method:method||(!body?'GET':'POST'),headers:h};if(body)opts.body=body instanceof FormData?body:JSON.stringify(body);const r=await handle(new Request('https://site.test/api/workspace/'+path,opts),env);const text=await r.text();let data;try{data=JSON.parse(text)}catch{data=text}return {status:r.status,data}}
assert.equal((await call('bootstrap')).status,401);
assert.equal((await call('bootstrap',bob)).status,403);
let o=await call('bootstrap',owner);assert.equal(o.status,200);assert.equal(o.data.member.role,'owner');
assert.equal((await call('register',alice,{name:'Alice'})).status,200);
assert.equal((await call('register',bob,{name:'Bob'})).status,200);
let a=await call('bootstrap',alice),b=await call('bootstrap',bob);assert.equal(a.data.customers.length,1);assert.equal(a.data.customers[0].id,a.data.member.id);
assert.equal((await call('team',alice,{name:'Hack'})).status,403);
assert.equal((await call('team',owner,{name:'Staff',email:staff[1],permissions:{documents:1},scope:[a.data.member.id]})).status,200);
let st=await call('bootstrap',staff);assert.equal(st.status,200);assert.equal(st.data.customers.length,1);
assert.equal((await call('applications',staff,{customer:a.data.member.id,service:'Vize',from:'Türkiye'})).status,403);
assert.equal((await call('applications',alice,{customer:b.data.member.id,service:'Vize',from:'Türkiye'})).status,403); // müşteri kendi başvurusunu açamaz; danışman açar
a=await call('bootstrap',alice);assert.equal(a.data.items.filter(i=>i.kind==='application').length,0);
function fileForm(){const f=new FormData();f.set('file',new Blob(['%PDF-1.7 fake document for API tests'],{type:'application/pdf'}),'doc.pdf');f.set('slot','0');return f}
let f=await call('upload',alice,fileForm());assert.equal(f.status,200);assert.equal((await call('file/'+f.data.id,bob)).status,403);assert.equal((await call('file/'+f.data.id,staff)).status,200);
assert.equal((await call('upload',staff,fileForm())).status,404);
assert.equal((await call('scan',alice,{})).status,400);
assert.equal((await call('review',alice,{id:f.data.id,status:'Onaylandı'})).status,403);
let invoice=fileForm();invoice.set('kind','invoice');invoice.set('customer',a.data.member.id);invoice.set('amount','100');invoice.set('rate','10');invoice.set('service','Vize');let inv=await call('upload',owner,invoice);assert.equal(inv.status,200);assert.equal((await call('invoice-paid',staff,{id:inv.data.id,reference:'xx'})).status,403);
assert.equal((await call('invoice-paid',owner,{id:inv.data.id,reference:'bank123'})).status,200);assert.equal((await call('invoice-paid',owner,{id:inv.data.id,reference:'bank123'})).status,200);assert.equal(sql.prepare('SELECT count(*) n FROM ledger').get().n,1);
assert.equal((await call('team',owner,{id:st.data.member.id,permissions:{},scope:[],disabled:true},'PATCH')).status,200);assert.equal((await call('bootstrap',staff)).status,403);
const noOrigin=await handle(new Request('https://site.test/api/workspace/profile',{method:'POST',headers:{'oai-authenticated-user-id':owner[0],'oai-authenticated-user-email':owner[1]},body:'{}'}),env);assert.equal(noOrigin.status,403);
assert.equal((await call('referrals',owner,{name:'Campaign'})).status,200);o=await call('bootstrap',owner);const ref=o.data.items.find(i=>i.kind==='ref');const rr=await referral(new Request('https://site.test/r/'+ref.id),env,ref.id);assert.equal(rr.status,302);assert.ok(rr.headers.get('set-cookie').includes('HttpOnly'));assert.equal((await call('bootstrap',alice)).data.items.some(i=>i.kind==='visit'),false);
console.log('PASS: authentication, invitations, scope, documents, payment idempotency, role boundaries, CSRF and referral attribution.');
