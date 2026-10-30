import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {handle} from '../server/admin.mjs';
const sql=new DatabaseSync(':memory:');sql.exec(readFileSync('drizzle/0000_safe_doctor_octopus.sql','utf8'));
const db={prepare(q){let v=[];return{bind(...x){v=x;return this},async first(){return sql.prepare(q).get(...v)||null},async all(){return {results:sql.prepare(q).all(...v)}},async run(){return sql.prepare(q).run(...v)}}},async batch(a){sql.exec('BEGIN');try{const r=await Promise.all(a.map(s=>s.run()));sql.exec('COMMIT');return r}catch(e){sql.exec('ROLLBACK');throw e}}};
const env={DB:db};
async function call(path,body,opts={}){const headers={origin:opts.origin||'https://site.test'};if(opts.auth!==false){headers['oai-authenticated-user-id']=opts.staff?'staff':'owner-id';headers['oai-authenticated-user-email']=opts.staff?'staff@example.com':'fatih.altas@elevandos.com'}const r=await handle(new Request('https://site.test/api/admin/'+path,{method:opts.method||(body?'POST':'GET'),headers,body:body?JSON.stringify(body):undefined}),env);return {status:r.status,data:await r.json()}}
assert.equal((await call('bootstrap',null,{auth:false})).status,401);
assert.equal((await call('bootstrap')).status,200);
sql.prepare('INSERT INTO people VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run('staff','staff','staff@example.com','Staff','staff','owner','{}','"all"','active',null,null,Date.now());
assert.equal((await call('bootstrap',null,{staff:true})).status,403);
assert.equal((await call('record',{type:'customer',name:'Customer',email:'x@test.com'},{origin:'https://evil.test'})).status,403);
const c=await call('record',{type:'customer',name:'Customer',email:'x@test.com',status:'Aktif'});assert.equal(c.status,200);
const inv=await call('record',{type:'invoice',name:'BM-001',customer:c.data.id,amount:240,currency:'USD',status:'Ödenmedi',lines:'[{"name":"Service"}]'});assert.equal(inv.status,200);
assert.equal((await call('record',{type:'invoice',name:'No',customer:c.data.id,amount:-1,currency:'USD',status:'Ödenmedi'})).status,400);
assert.equal((await call('record',{id:inv.data.id,type:'invoice',name:'BM-001',customer:c.data.id,amount:240,currency:'USD',status:'Ödendi'})).status,200);
assert.equal((await call('record',{id:c.data.id},{method:'DELETE'})).status,409);
assert.equal((await call('config',{section:'general-0',values:{title:'Brazil Migration'}})).status,200);
const s=await call('bootstrap');assert.equal(s.data.config['general-0'].title,'Brazil Migration');assert.equal(s.data.records.find(x=>x.id===inv.data.id).lines,'[{"name":"Service"}]');assert.ok(s.data.audit.length>=4);
assert.equal((await call('record',{id:'owner',type:'customer',name:'Bad',email:'x@test.com'})).status,404);
assert.equal(sql.prepare("SELECT count(*) n FROM people WHERE role='customer'").get().n,0);
assert.equal(sql.prepare("SELECT count(*) n FROM items WHERE kind NOT LIKE 'admin_%'").get().n,0);
assert.equal((await call('record',{id:inv.data.id},{method:'DELETE'})).status,200);
assert.equal((await call('record',{id:c.data.id},{method:'DELETE'})).status,200);
// Pure view rendering smoke check, without launching or controlling a browser.
const elements=new Map();const element=()=>({innerHTML:'',textContent:'',dataset:{},classList:{add(){},remove(){}},querySelectorAll(){return []},showModal(){},focus(){},value:''});
const document={querySelector(s){if(!elements.has(s))elements.set(s,element());return elements.get(s)},querySelectorAll(){return []},addEventListener(){},title:''};
let source=readFileSync('public/admin/app.js','utf8').replace(/icons\(\);reload\(\)\.then\(render\)[\s\S]*$/,'');
const context=vm.createContext({document,window:{addEventListener(){}},location:{hash:''},Intl,Date,console,setTimeout,clearTimeout,URL,Blob,fetch(){throw Error('Unexpected network')}});vm.runInContext(source,context);
const routes=['overview','orders','support','invoices','customers','products','general','theme','security','payments','currencies','staff','permissions','templates','languages','analytics','notes','reminders','tasks','audit','invoiceNew'];
for(const r of routes){context.location.hash='#'+r;vm.runInContext("tab='';side='';render()",context);assert.ok(elements.get('#main').innerHTML.length>500,r)}
for(const [r,tabs] of Object.entries({general:['Temel','SEO','Yerelleştirme','Üyelik','Permalinks','API','Sosyal Giriş','Gelişmiş'],theme:['Logo/Markalama','Tema Yönetimi','Anasayfa','Arka Planlar','Gelişmiş'],security:['Ayarlar','Kimlik Doğrulama','BotShield','Captcha Güvenlik','İşlem Kısıtlama','Spam Koruması','Yasak Listesi','Yedekleme']})){context.location.hash='#'+r;for(const t of tabs){vm.runInContext('tab='+JSON.stringify(t)+';render()',context);assert.ok(elements.get('#main').innerHTML.includes(t))}}
vm.runInContext("demo=true",context);for(const r of routes){context.location.hash='#'+r;vm.runInContext("tab='';side='';render()",context)}
context.location.hash='#customerDetail/demo-c0';vm.runInContext("tab='Özet';render()",context);assert.ok(elements.get('#main').innerHTML.includes('Alex Morgan'));
vm.runInContext(readFileSync('public/admin/customer-revision.js','utf8'),context);
context.location.hash='#customers';vm.runInContext('render()',context);
assert.ok(elements.get('#main').innerHTML.includes('AKTİF DANIŞMAN'));
assert.ok(elements.get('#main').innerHTML.includes('PASİF AVUKAT'));
context.location.hash='#customerDetail/demo-c0';
for(const t of ['Özet','Profil','Faturalar','Dosyalar','Ürün & Hizmetler','Destek Talepleri','Mesajlar','Etkinlik Kayıtları','Notlar']){
 vm.runInContext('tab='+JSON.stringify(t)+';render()',context);
 const html=elements.get('#main').innerHTML;
 assert.ok(!html.includes('data-tab="Kişiler"'));assert.ok(!html.includes('data-tab="Alt Hesaplar"'));assert.ok(!html.includes('data-tab="Satış Ortaklığı"'));assert.ok(!html.includes('data-tab="Cari Ekstre"'));
}
for(const section of ['Genel','Güvenlik','Kartlar','Özel Alanlar']){vm.runInContext('tab="Profil";side='+JSON.stringify(section)+';render()',context);assert.ok(elements.get('#main').innerHTML.includes(section))}
const c2=await call('record',{type:'customer',name:'Files Customer',email:'files@example.com',birthday:'1990-01-01',taxNumber:'123',mail0:true});
const blobStore=new Map();env.BUCKET={async put(k,b){blobStore.set(k,b)},async get(k){return blobStore.has(k)?{body:blobStore.get(k)}:null},async delete(k){blobStore.delete(k)}};
const form=()=>{const f=new FormData();f.set('customer',c2.data.id);f.set('direction','incoming');f.set('sender','Avukat');f.set('file',new Blob(['%PDF-1.7 test'],{type:'application/pdf'}),'contract.pdf');return f};
const ownerHeaders={'origin':'https://site.test','oai-authenticated-user-id':'owner-id','oai-authenticated-user-email':'fatih.altas@elevandos.com'};
let uploaded=await handle(new Request('https://site.test/api/admin/upload',{method:'POST',headers:ownerHeaders,body:form()}),env);assert.equal(uploaded.status,200);const documentId=(await uploaded.json()).id;
let file=await handle(new Request('https://site.test/api/admin/file/'+documentId,{headers:ownerHeaders}),env);assert.equal(file.status,200);assert.equal(await file.text(),'%PDF-1.7 test');
file=await handle(new Request('https://site.test/api/admin/file/'+documentId,{headers:{...ownerHeaders,'oai-authenticated-user-id':'staff','oai-authenticated-user-email':'staff@example.com'}}),env);assert.equal(file.status,403);
const invalid=form();invalid.set('file',new Blob(['<script>alert(1)</script>'],{type:'application/pdf'}),'bad.pdf');assert.equal((await handle(new Request('https://site.test/api/admin/upload',{method:'POST',headers:ownerHeaders,body:invalid}),env)).status,400);
const wrong=form();wrong.set('customer','missing');assert.equal((await handle(new Request('https://site.test/api/admin/upload',{method:'POST',headers:ownerHeaders,body:wrong}),env)).status,404);
const order=await call('record',{type:'order',name:'Oturum',customer:c2.data.id,status:'İşlemde'});
assert.equal((await call('customer-services',{customer:c2.data.id,status:'Askıda'})).status,200);
const updated=await call('bootstrap');assert.equal(updated.data.records.find(x=>x.id===order.data.id).status,'Askıda');assert.equal(updated.data.records.find(x=>x.id===documentId).customer,c2.data.id);
assert.equal((await call('record',{id:c2.data.id},{method:'DELETE'})).status,409);
vm.runInContext(readFileSync('public/admin/products.js','utf8'),context);
context.location.hash='#products';vm.runInContext('render()',context);assert.ok(elements.get('#main').innerHTML.includes('Yeni Ürün Oluştur'));
context.location.hash='#products/new';vm.runInContext('render()',context);
for(const t of ['Oturum İzni','Vatandaşlık','Şirket Kurulumu','Diğer'])assert.ok(elements.get('#main').innerHTML.includes(t));
const generated=vm.runInContext("generatedProductPrices({base:100,setup:20,'rate-USD':1,'rate-BRL':5,'cycle-2':true,'discount-2':10})",context);
assert.equal(generated.length,2);assert.equal(generated[0].amount,300);assert.equal(generated[1].amount,1500);assert.equal(vm.runInContext("netProductPrice({amount:300,setup:20,discount:10})",context),290);
const productData={type:'product',name:'Şirket Kurulumu Paketi',productType:'Şirket Kurulumu',status:'Aktif',allowQuantity:true,stock:3,limit:2,currency:'USD',amount:290,addons:JSON.stringify([{id:'web',name:'Web Sitesi',amount:50,currency:'USD',enabled:true}]),requirements:JSON.stringify([{id:'passport',name:'Pasaport',input:'Dosya',required:true,enabled:true,position:1},{id:'reason',name:'Açıklama',input:'Metin Alanı',required:true,enabled:true,position:2}]),prices:JSON.stringify([{cycle:'3 Aylık',currency:'USD',amount:300,setup:20,discount:10,enabled:true}])};
const product=await call('record',productData);assert.equal(product.status,200);
assert.equal((await call('record',{...productData,prices:JSON.stringify([{cycle:'3 Aylık',currency:'USD',amount:-1,enabled:true}])})).status,400);
assert.equal((await call('record',{...productData,requirements:JSON.stringify([{id:'x',name:'Seçim',input:'Açılır Menü',enabled:true,options:[]}])})).status,400);
const quoteForm=()=>{const f=new FormData();f.set('product',product.data.id);f.set('cycle','3 Aylık');f.set('currency','USD');f.set('quantity','2');f.set('amount','0');f.set('addon','web');return f};
let q=quoteForm();const quote=f=>handle(new Request('https://site.test/api/admin/product-quote',{method:'POST',headers:ownerHeaders,body:f}),env);
assert.equal((await quote(q)).status,400);q.set('req-passport',new Blob(['%PDF-1.7 test']),'passport.pdf');assert.equal((await quote(q)).status,400);
q.set('req-reason','Şirket kurmak istiyorum.');let qr=await quote(q);assert.equal(qr.status,200);const priced=await qr.json();assert.equal(priced.total,630);assert.equal(priced.preview,true);
q.set('quantity','4');assert.equal((await quote(q)).status,400);q.set('quantity','1');q.set('req-passport',new Blob(['not pdf']),'bad.pdf');assert.equal((await quote(q)).status,400);
const snapshot=await call('bootstrap');assert.equal(snapshot.data.records.filter(x=>x.type==='order'&&x.product===product.data.id).length,0);
context.productRecord={...productData,id:product.data.id,created:Date.now()};vm.runInContext('demo=false;state.records.push(productRecord)',context);context.location.hash='#products/'+product.data.id;
for(const t of ['Detay','Eklentiler','Gereksinimler','Fiyatlandırma']){vm.runInContext('productTab='+JSON.stringify(t)+';render()',context);const html=elements.get('#main').innerHTML;assert.ok(html.includes(t));for(const removed of ['Otomasyon','Yükseltme','Ücretsiz Alan Adı','Bağlı Hizmetler'])assert.ok(!html.includes('data-value="'+removed+'"'))}
console.log('PASS: owner-only access, CSRF, CRUD, validation, referential deletion, persistence, audit, isolation, all admin routes/tabs and sample views.');
vm.runInContext(readFileSync('public/admin/settings-revision.js','utf8'),context);
for(const [routeName,tabsToCheck] of Object.entries({general:['Temel','SEO','Yerelleştirme','Üyelik','Gelişmiş'],theme:['Logo/Markalama','Tema Yönetimi','Anasayfa','Arka Planlar','Gelişmiş'],security:['Ayarlar','Kimlik Doğrulama','BotShield','Captcha Güvenlik','İşlem Kısıtlama','Spam Koruması','Yasak Listesi','Yedekleme']})){
 context.location.hash='#'+routeName;
 for(const t of tabsToCheck){vm.runInContext('tab='+JSON.stringify(t)+';side="";render()',context);assert.ok(elements.get('#main').innerHTML.includes('data-config='));if(routeName==='general')for(const removed of ['Permalinks','API','Sosyal Giriş'])assert.ok(!elements.get('#main').innerHTML.includes('data-tab="'+removed+'"'))}
}
for(const [r,t,sides]of [['general','SEO',['Arama Görünümü','Arama Motorları ve Tarayıcılar','Keşif Adresleri']],['general','Üyelik',['Üyelik Ayarları','Özel Alanlar']],['theme','Logo/Markalama',['Web Sitesi','Müşteri Paneli','Fatura','Yönetim Paneli']],['security','Kimlik Doğrulama',['İki Adımlı Doğrulama','Konum Doğrulama','JetPass']],['security','Yasak Listesi',['Alan Adları','E-posta Adresleri','Telefon Numaraları','Kelimeler','Engellenen IP Adresleri']],['security','Yedekleme',['Ayarlar','Yedekler','Zamanlamalar','Uzak Depolama']]]){
 context.location.hash='#'+r;for(const s of sides){vm.runInContext('tab='+JSON.stringify(t)+';side='+JSON.stringify(s)+';render()',context);assert.ok(elements.get('#main').innerHTML.includes(s))}
}
const offices=JSON.stringify([{name:'São Paulo',central:true,address:'Test'}]);
assert.equal((await call('config',{section:'general-0',values:{offices}})).status,200);
assert.equal((await call('bootstrap')).data.config['general-0'].offices,offices);
assert.equal((await call('config',{section:'general-0',values:{offices:'x'.repeat(10001)}})).status,400);
const mediaForm=(content,kind='image',name='brand.png')=>{const f=new FormData();f.set('file',new Blob([content]),name);f.set('kind',kind);return f};
const png=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0,0]);
const mediaReq=(form,headers=ownerHeaders)=>handle(new Request('https://site.test/api/admin/assets',{method:'POST',headers,body:form}),env);
let media=await mediaReq(mediaForm(png));assert.equal(media.status,200);const mediaId=(await media.json()).id;
assert.equal((await call('assets')).data.assets.length,1);
const mediaGet=await handle(new Request('https://site.test/api/admin/asset/'+mediaId,{headers:ownerHeaders}),env);assert.equal(mediaGet.status,200);assert.equal(mediaGet.headers.get('content-type'),'image/png');
assert.equal((await mediaReq(mediaForm('<script>bad</script>'))).status,400);
assert.equal((await mediaReq(mediaForm(png,'video'))).status,400);
assert.equal((await mediaReq(mediaForm(png),{...ownerHeaders,origin:'https://evil.test'})).status,403);
assert.equal((await handle(new Request('https://site.test/api/admin/asset/'+mediaId,{headers:{...ownerHeaders,'oai-authenticated-user-id':'staff','oai-authenticated-user-email':'staff@example.com'}}),env)).status,403);
assert.equal((await call('bootstrap')).data.records.some(x=>x.id===mediaId),false);
console.log('PASS: settings tabs, removed navigation, persisted repeaters, oversized configuration rejection, private media upload/read/list, type validation, CSRF and media isolation.');
// General revision: removed menus, stable existing config keys and individual CAPTCHA preferences.
context.location.hash='#security';vm.runInContext('tab="Kimlik Doğrulama";side="";render()',context);
for(const removed of ['BotShield','Ülke Kuralları','Passkey','IP Doğrulama'])assert.ok(!elements.get('#main').innerHTML.includes(removed));
vm.runInContext('tab="Captcha Güvenlik";render()',context);
assert.ok(elements.get('#main').innerHTML.includes('data-config="security-3"'));
for(let i=0;i<4;i++)assert.ok(elements.get('#main').innerHTML.includes('name="provider-'+i+'"'));
assert.equal((await call('config',{section:'security-3',values:{'provider-0':true,'provider-1':false,'provider-2':true,'provider-3':false}})).status,200);
assert.equal((await call('bootstrap')).data.config['security-3']['provider-2'],true);
const {heartbeat,visitorStats}=await import('../server/visitors.mjs');
function visit({cookie='',origin='https://site.test',path='/',cf={country:'TR',city:'Istanbul',latitude:'41.01',longitude:'28.97'},headers={}}={}){const r=new Request('https://site.test/api/visitors',{method:'POST',headers:{origin,cookie,...headers},body:JSON.stringify({path,lat:0,lon:0})});Object.defineProperty(r,'cf',{value:cf});return heartbeat(r,env)}
let visitResponse=await visit();assert.equal(visitResponse.status,200);const cookie=visitResponse.headers.get('set-cookie').split(';')[0];
assert.ok(visitResponse.headers.get('set-cookie').includes('HttpOnly'));
await visit({cookie});let vs=await visitorStats(db);assert.equal(vs.active,1);assert.equal(vs.locations[0].lat,41);assert.equal(vs.locations[0].lon,29);
assert.equal((await visit({origin:'https://elsewhere.test'})).status,403);
assert.equal((await visit({path:'/admin/'})).status,400);
await visit({headers:{dnt:'1'}});assert.equal((await visitorStats(db)).active,1);
await visit({cf:{}});vs=await visitorStats(db);assert.equal(vs.active,2);assert.equal(vs.unknown,1);assert.equal(vs.locations.length,1);
const future=Date.now()+301000;assert.equal((await visitorStats(db,future)).active,0);assert.equal((await visitorStats(db,future)).last24h,2);
assert.equal((await visitorStats(db,Date.now()+86401000)).last24h,0);
assert.equal((await call('visitors',null,{auth:false})).status,401);assert.equal((await call('visitors',null,{staff:true})).status,403);assert.equal((await call('visitors')).data.active,2);
const visitorRows=sql.prepare("SELECT data FROM items WHERE kind='visitor_session'").all();for(const row of visitorRows){assert.ok(!row.data.includes('email'));assert.ok(!row.data.includes('ip'))}
vm.runInContext(readFileSync('public/admin/visitors.js','utf8'),context);context.location.hash='#overview';vm.runInContext('visitorData={active:2,last24h:2,unknown:1,locations:[{lat:41,lon:29,city:"Istanbul",country:"TR",count:1}],pages:[{path:"/",count:2}],updated:Date.now()};render()',context);
assert.ok(elements.get('#main').innerHTML.includes('Canlı Ziyaretçiler'));assert.ok(elements.get('#main').innerHTML.includes('visitor-pin'));assert.ok(!elements.get('#main').innerHTML.includes('class="map-card"'));
for(const panel of ['panel','partner','avukat'])assert.ok(!readFileSync('public/'+panel+'/index.html','utf8').includes('visitor-presence'));
console.log('PASS: menu removals, independent CAPTCHA persistence, real visitor sessions, edge-only location, deduplication, expiry, privacy preferences, admin-only metrics and transparent map rendering.');
const uiListeners=[];const originalListener=context.document.addEventListener;context.document.addEventListener=(type,fn)=>uiListeners.push({type,fn});
vm.runInContext(readFileSync('public/admin/ui-revision.js','utf8'),context);context.document.addEventListener=originalListener;
context.location.hash='#languages';vm.runInContext('render()',context);
for(const label of ['Yeni Dil Ekle','Bul ve Değiştir','Varsayılan Yap','Aktif','Dil Metinleri'])assert.ok(elements.get('#main').innerHTML.includes(label));
assert.equal(vm.runInContext("replaceLanguageText('A.b A.b','A.b','$&',false)",context),'$& $&');
assert.equal(vm.runInContext("replaceLanguageText('Merhaba merhaba','merhaba','Selam',false)",context),'Selam Selam');
assert.equal(vm.runInContext("replaceLanguageText('Merhaba merhaba','merhaba','Selam',true)",context),'Merhaba Selam');
const languageValues={catalog:JSON.stringify([{code:'tr',name:'Türkçe',active:true},{code:'de',name:'Deutsch',active:false}]),default:'tr',texts:JSON.stringify({tr:{'menu.home':'Ana Sayfa'}})};
assert.equal((await call('config',{section:'languages',values:languageValues})).status,200);
let persisted=(await call('bootstrap')).data.config.languages;assert.equal(JSON.parse(persisted.catalog)[1].code,'de');assert.equal(JSON.parse(persisted.texts).tr['menu.home'],'Ana Sayfa');
assert.equal((await call('config',{section:'languages',values:{...languageValues,default:'de'}})).status,400);
assert.equal((await call('config',{section:'languages',values:{...languageValues,catalog:JSON.stringify([{code:'tr',name:'Türkçe',active:true},{code:'tr',name:'Tekrar',active:true}])}})).status,400);
assert.equal((await call('config',{section:'languages',values:{...languageValues,texts:JSON.stringify({xx:{foo:'bar'}})}})).status,400);
const opened=[{open:true},{open:false},{open:true}],summary={parentElement:opened[1]};const oldQuery=context.document.querySelectorAll;context.document.querySelectorAll=()=>opened;
uiListeners.find(x=>x.type==='click').fn({target:{closest:s=>s.includes('summary')?summary:null}});assert.equal(opened[0].open,false);assert.equal(opened[2].open,false);
context.document.querySelectorAll=oldQuery;
console.log('PASS: exclusive navigation, language creation/persistence, default-active invariant, duplicate rejection, literal find/replace and manual language text storage.');
const {handleKYC}=await import('../server/kyc.mjs');
const kycEnv={...env,DIDIT_ENABLED:'true',DIDIT_API_KEY:'test-only',DIDIT_WORKFLOW_ID:'test-workflow'};let providerCalls=0,remoteVendor='',remoteId='11111111-2222-3333-4444-555555555555';
const providerMock=async(url,init)=>{providerCalls++;if(init.method==='POST'){remoteVendor=JSON.parse(init.body).vendor_data;return Response.json({session_id:remoteId,url:'https://verify.didit.me/session/example'})}return Response.json({session_id:remoteId,vendor_data:remoteVendor,status:'Approved',id_verifications:[{sensitive:'must not be persisted'}]})};
const kyc=async(path='',body,options={})=>{const r=await handleKYC(new Request('https://site.test/api/kyc'+path,{method:body?'POST':'GET',headers:{...ownerHeaders,...options.headers},body:body?JSON.stringify(body):undefined}),options.env||kycEnv,options.fetch||providerMock);return {status:r.status,data:await r.json()}};
assert.equal((await kyc('',null,{env})).data.ready,false);
assert.equal((await kyc('/start',{customer:'admin:'+c2.data.id,acknowledged:true},{env})).status,503);
assert.equal(providerCalls,0);
assert.equal((await kyc('/start',{customer:'missing',acknowledged:true})).status,403);
assert.equal((await kyc('/start',{customer:'admin:'+c2.data.id,acknowledged:false})).status,400);
const started=await kyc('/start',{customer:'admin:'+c2.data.id,acknowledged:true});assert.equal(started.status,200);assert.equal(providerCalls,1);
assert.equal((await kyc('/start',{customer:'admin:'+c2.data.id,acknowledged:true})).data.id,started.data.id);assert.equal(providerCalls,1);
assert.equal((await kyc('/refresh',{id:started.data.id,status:'Approved'},{headers:{origin:'https://evil.test'}})).status,403);
const refreshed=await kyc('/refresh',{id:started.data.id});assert.equal(refreshed.data.status,'Approved');assert.ok(!JSON.stringify(refreshed).includes('sensitive'));
assert.equal((await kyc('',null,{headers:{'oai-authenticated-user-id':'staff','oai-authenticated-user-email':'staff@example.com'}})).status,403);
sql.prepare('INSERT INTO people VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run('kyc-customer','kyc-customer','kyc@example.com','KYC Customer','customer','owner','{}','"all"','active','owner',null,Date.now());
const customerHeaders={'oai-authenticated-user-id':'kyc-customer','oai-authenticated-user-email':'kyc@example.com'};
assert.equal((await kyc('/refresh',{id:started.data.id},{headers:customerHeaders})).status,403);
assert.equal((await kyc('/start',{customer:'admin:'+c2.data.id,acknowledged:true},{headers:customerHeaders})).status,403);
const t=Date.now();for(let i=0;i<29;i++)sql.prepare('INSERT INTO items VALUES(?,?,?,?,?,?)').run('quota-'+i,'kyc_session','quota-owner-'+i,'{}',t,t);
assert.equal((await kyc('/start',{customer:'kyc-customer',acknowledged:true},{headers:customerHeaders})).status,409);assert.equal((await kyc()).data.used,30);
assert.equal((await kyc('',null,{headers:customerHeaders})).data.used,null);
console.log('PASS: KYC configuration gate, consent, role/customer isolation, duplicate prevention, provider-only approvals, no biometric retention and shared 30-session quota.');
