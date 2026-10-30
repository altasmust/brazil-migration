import {validateLanguages} from './admin-languages.mjs';
import {visitorStats} from './visitors.mjs';
import {adminAssets} from './admin-assets.mjs';
import {validateProduct,productQuote} from './products.mjs';
import {identity} from './workspace.mjs';
const kinds=new Set(['customer','invoice','order','ticket','staff','template','note','reminder','task','product','group','message']);
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
const fail=(status,message)=>{throw Object.assign(new Error(message),{status})};
const clean=(v,n=500)=>String(v??'').trim().slice(0,n);
export async function handle(req,env){try{
 const db=env.DB,m=await identity(req,db);if(m.role!=='owner')fail(403,'Yönetim paneline yalnızca site yöneticisi erişebilir.');
 const path=new URL(req.url).pathname.replace(/^\/api\/admin\/?/,'');
 if(req.method==='GET'&&path==='visitors')return reply(await visitorStats(db));
 if(path==='assets'||path.startsWith('asset/')){const result=await adminAssets(req,env,m,path);if(result)return result;}
 if(req.method==='GET'&&path==='bootstrap'){
  const rows=(await db.prepare("SELECT * FROM items WHERE kind IN ('admin_record','admin_config','admin_audit') AND owner=? ORDER BY created DESC").bind(m.id).all()).results;
  return reply({member:{name:m.name,email:m.email},records:rows.filter(x=>x.kind==='admin_record').map(x=>({id:x.id,created:x.created,...JSON.parse(x.data)})),config:Object.fromEntries(rows.filter(x=>x.kind==='admin_config').map(x=>[x.id.slice(13),JSON.parse(x.data)])),audit:rows.filter(x=>x.kind==='admin_audit').slice(0,100).map(x=>({created:x.created,...JSON.parse(x.data)}))});
 }
 if(req.method==='GET'&&path.startsWith('file/')){
  const id=path.slice(5),r=await db.prepare("SELECT data FROM items WHERE id=? AND kind='admin_record' AND owner=?").bind(id,m.id).first();
  if(!r)fail(404,'Dosya bulunamadı.');const d=JSON.parse(r.data);if(d.type!=='document')fail(404,'Dosya bulunamadı.');
  const object=await env.BUCKET.get(d.key);if(!object)fail(404,'Dosya bulunamadı.');
  return new Response(object.body,{headers:{'Content-Type':d.mime,'Content-Disposition':(new URL(req.url).searchParams.has('download')?'attachment':'inline')+"; filename*=UTF-8''"+encodeURIComponent(d.name),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox"}});
 }
 if(!['POST','DELETE'].includes(req.method))fail(404,'İşlem bulunamadı.');
 if(req.headers.get('origin')!==new URL(req.url).origin)fail(403,'Geçersiz istek kaynağı.');
 if(path==='product-quote'&&req.method==='POST')return reply(await productQuote(req,db,m));
 if(path==='upload'&&req.method==='POST'){
  if(Number(req.headers.get('content-length')||0)>11*1024*1024)fail(413,'Dosya en fazla 10 MB olabilir.');
  const f=await req.formData(),file=f.get('file'),customer=clean(f.get('customer')),direction=clean(f.get('direction'));
  if(!file||typeof file.arrayBuffer!=='function'||file.size===0||file.size>10*1024*1024)fail(400,'En fazla 10 MB bir PDF, JPG veya PNG seçin.');
  const c=await db.prepare("SELECT data FROM items WHERE id=? AND kind='admin_record' AND owner=?").bind(customer,m.id).first();if(!c||JSON.parse(c.data).type!=='customer')fail(404,'Müşteri bulunamadı.');
  if(!['incoming','outgoing'].includes(direction))fail(400,'Dosya yönü geçersiz.');
  const bytes=new Uint8Array(await file.arrayBuffer());let mime;
  if(String.fromCharCode(...bytes.slice(0,5))==='%PDF-')mime='application/pdf';else if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)mime='image/jpeg';else if([137,80,78,71,13,10,26,10].every((x,i)=>bytes[i]===x))mime='image/png';else fail(400,'Dosya biçimi desteklenmiyor.');
  const id=crypto.randomUUID(),key='admin-documents/'+m.id+'/'+id,t=Date.now();
  const data={type:'document',customer,direction,name:clean(file.name,180),key,mime,size:file.size,sender:clean(f.get('sender')||'Yönetici'),uploadedBy:m.name,status:'Yüklendi'};
  await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:mime}});
  try{await db.batch([db.prepare('INSERT INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?)').bind(id,'admin_record',m.id,JSON.stringify(data),t,t),audit(db,m,t,'Müşteri dosyası eklendi',customer)])}catch(e){await env.BUCKET.delete(key);throw e}
  return reply({ok:true,id});
 }
 const raw=await req.text();if(raw.length>60000)fail(413,'Kayıt çok büyük.');let b;try{b=JSON.parse(raw)}catch{fail(400,'Geçersiz veri.');}
 const now=Date.now();let id,kind,data;
 if(path==='customer-services'&&req.method==='POST'){
  if(!['Askıda','İptal Edildi'].includes(b.status))fail(400,'Geçersiz durum.');
  const c=await db.prepare("SELECT data FROM items WHERE id=? AND kind='admin_record' AND owner=?").bind(clean(b.customer),m.id).first();if(!c||JSON.parse(c.data).type!=='customer')fail(404,'Müşteri bulunamadı.');
  const all=(await db.prepare("SELECT id,data FROM items WHERE kind='admin_record' AND owner=?").bind(m.id).all()).results;
  const affected=all.filter(x=>{const d=JSON.parse(x.data);return d.type==='order'&&d.customer===b.customer&&d.status!=='İptal Edildi'});
  await db.batch([...affected.map(x=>db.prepare('UPDATE items SET data=?,updated=? WHERE id=?').bind(JSON.stringify({...JSON.parse(x.data),status:b.status}),now,x.id)),audit(db,m,now,'Müşteri hizmetleri: '+b.status,b.customer)]);return reply({ok:true,count:affected.length});
 }
 if(path==='record'&&req.method==='POST'){
  if(!kinds.has(b.type))fail(400,'Geçersiz kayıt türü.');
  if(b.type==='product')b=validateProduct(b);
  data={type:b.type};for(const [k,v] of Object.entries(b)){if(['id','type','created','__proto__','constructor'].includes(k))continue;if(typeof v==='string')data[k]=clean(v,b.type==='product'&&['addons','requirements','prices'].includes(k)?50000:8000);else if(typeof v==='number'&&Number.isFinite(v))data[k]=v;else if(typeof v==='boolean')data[k]=v;}
  if(!clean(data.name||data.subject))fail(400,'Başlık veya ad gerekli.');
  if(['customer','staff'].includes(b.type)&&!/^\S+@\S+\.\S+$/.test(data.email||''))fail(400,'Geçerli e-posta adresi girin.');
  if(b.type==='message'){data.status='Taslak';if(!data.customer)fail(400,'Müşteri seçin.');}
  if(b.type==='invoice'){
   if(!data.customer)fail(400,'Müşteri seçin.');
   const c=await db.prepare("SELECT data FROM items WHERE id=? AND kind='admin_record' AND owner=?").bind(data.customer,m.id).first();
   if(!c||JSON.parse(c.data).type!=='customer')fail(400,'Müşteri bulunamadı.');
   if(!Number.isFinite(data.amount)||data.amount<=0||data.amount>1e9)fail(400,'Geçerli fatura tutarı girin.');
   if(!['USD','BRL','EUR','TRY'].includes(data.currency))fail(400,'Para birimi geçersiz.');
   if(!['Ödenmedi','Ödendi','İptal Edildi'].includes(data.status))fail(400,'Ödeme durumu geçersiz.');
  }
  id=b.id?clean(b.id):crypto.randomUUID();kind='admin_record';
  if(b.id){const old=await db.prepare("SELECT data FROM items WHERE id=? AND kind='admin_record' AND owner=?").bind(id,m.id).first();if(!old||JSON.parse(old.data).type!==b.type)fail(404,'Kayıt bulunamadı.');data={...JSON.parse(old.data),...data};}
 }else if(path==='config'&&req.method==='POST'){
  if(!/^[a-z0-9-]{1,50}$/.test(b.section||''))fail(400,'Geçersiz ayar bölümü.');
  if(!b.values||typeof b.values!=='object'||Array.isArray(b.values))fail(400,'Geçersiz ayarlar.');
  if(b.section==='languages')validateLanguages(b.values);
  id='admin-config:'+b.section;kind='admin_config';data={};
  for(const [k,v] of Object.entries(b.values)){if(['__proto__','constructor','prototype'].includes(k))continue;if(typeof v==='string'){if(v.length>10000)fail(400,'Ayar alanı çok uzun; öğe sayısını veya metin uzunluğunu azaltın.');data[k]=clean(v,10000);}else if(typeof v==='boolean'||(typeof v==='number'&&Number.isFinite(v)))data[k]=v;}
 }else if(path==='record'&&req.method==='DELETE'){
  id=clean(b.id);const old=await db.prepare("SELECT data FROM items WHERE id=? AND kind='admin_record' AND owner=?").bind(id,m.id).first();if(!old)fail(404,'Kayıt bulunamadı.');
  if(JSON.parse(old.data).type==='product'){
   const all=(await db.prepare("SELECT data FROM items WHERE kind='admin_record' AND owner=?").bind(m.id).all()).results;
   if(all.some(x=>JSON.parse(x.data).product===id))fail(409,'Ürüne bağlı siparişler var. Silmek yerine pasife alın.');
  }
  if(JSON.parse(old.data).type==='customer'){
   const all=(await db.prepare("SELECT data FROM items WHERE kind='admin_record' AND owner=?").bind(m.id).all()).results;
   if(all.some(x=>JSON.parse(x.data).customer===id))fail(409,'Müşteriye bağlı kayıtlar var. Silmek yerine pasife alın.');
  }
  await db.batch([db.prepare("DELETE FROM items WHERE id=? AND kind='admin_record' AND owner=?").bind(id,m.id),audit(db,m,now,'Kayıt silindi',id)]);return reply({ok:true});
 }else fail(404,'İşlem bulunamadı.');
 await db.batch([db.prepare('INSERT INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated=excluded.updated').bind(id,kind,m.id,JSON.stringify(data),now,now),audit(db,m,now,kind==='admin_config'?'Ayar taslağı kaydedildi':'Kayıt kaydedildi',id)]);
 return reply({ok:true,id});
 }catch(e){return reply({error:e.status?e.message:'İşlem tamamlanamadı. Lütfen tekrar deneyin.'},e.status||500)}}
function audit(db,m,t,action,target){return db.prepare('INSERT INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),'admin_audit',m.id,JSON.stringify({actor:m.name,action,target}),t,t)}
