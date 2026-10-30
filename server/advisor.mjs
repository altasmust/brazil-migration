import {identity,allowed,COUNTRIES} from './workspace.mjs';
const titles=['Pasaport','Adli Sicil Kaydı Apostilli','İkametgah Belgesi Apostilli','Diploma / Sertifika — Noter Onaylı','Kira Kontratı'];
const fail=(status,message)=>{throw Object.assign(new Error(message),{status})};
const clean=(v,n=200)=>String(v||'').trim().slice(0,n),id=()=>crypto.randomUUID();
const q=(db,s,...v)=>db.prepare(s).bind(...v),one=(db,s,...v)=>q(db,s,...v).first();
const ins=(db,key,kind,owner,data)=>q(db,'INSERT INTO items VALUES(?,?,?,?,?,?)',key,kind,owner,JSON.stringify(data),Date.now(),Date.now());
const permit=(m,p,w=false)=>{if(!allowed(m,p,w))fail(403,'Bu işlem için yetkiniz yok.');};
const scope=(m,c)=>m.role==='owner'||(((m.role==='employee'&&m.manager==='owner')||c.advisor===m.id||c.advisor===m.manager)&&(JSON.parse(m.scope)==='all'||JSON.parse(m.scope).includes(c.id)));
const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function handleAdvisor(req,env){try{
 const db=env.DB,m=await identity(req,db),url=new URL(req.url),route=url.pathname.replace(/^\/api\/advisor\/?/,'');
 if(!['owner','advisor','employee'].includes(m.role))fail(403,'Danışman hesabı gerekli.');
 if(req.method!=='GET'&&req.headers.get('origin')!==url.origin)fail(403,'Geçersiz istek kaynağı.');
 permit(m,'applications');
 if(route==='cases'&&req.method==='GET'){
 const customers=(await q(db,"SELECT * FROM people WHERE role='customer' AND status IN ('active','invited')").all()).results.filter(c=>scope(m,c));
 const all=(await q(db,"SELECT * FROM items WHERE kind='advisor_case' ORDER BY created DESC").all()).results;
 return reply({countries:COUNTRIES,titles,permissions:Object.fromEntries(['customers','applications','documents','finance','kyc'].map(p=>[p,allowed(m,p,true)])),canAssign:m.role==='owner',recipients:m.role==='owner'?(await q(db,"SELECT id,name FROM people WHERE status='active' AND role IN ('advisor','employee')").all()).results:[],cases:all.filter(i=>customers.some(c=>c.id===i.owner)||JSON.parse(i.data).lawyer===m.id).map(i=>({id:i.id,customer:JSON.parse(i.data).name,...JSON.parse(i.data)}))});
 }
 let b={};if(req.method==='POST'&&route!=='upload'){const text=await req.text();if(text.length>20000)fail(413,'İstek çok büyük.');try{b=JSON.parse(text)}catch{fail(400,'Geçersiz istek.');}}
 if(route==='create'&&req.method==='POST'){
 permit(m,'applications',true);permit(m,'customers',true);
 const name=clean(b.name,100),email=clean(b.email).toLowerCase(),phone=clean(b.phone,50);
 if(name.length<3||!/^\S+@\S+\.\S+$/.test(email)||phone.length<6||!['Oturum İzni','Şirket Kurulum','Vize'].includes(b.service)||!COUNTRIES.includes(b.from))fail(400,'Ad soyad, geçerli e-posta, telefon, hizmet ve ülke gerekli.');
 if(!/^[a-f0-9-]{36}$/.test(b.requestId||''))fail(400,'Başvuru kimliği geçersiz.');
 const old=await one(db,'SELECT * FROM items WHERE id=?',b.requestId);if(old){const c=await one(db,'SELECT * FROM people WHERE id=?',old.owner);if(old.kind!=='advisor_case'||!c||!scope(m,c))fail(403,'Erişim yok.');return reply({ok:true,id:old.id});}
 let c=await one(db,'SELECT * FROM people WHERE email=?',email);const ops=[];
 if(c){if(c.role!=='customer'||!scope(m,c)||!['active','invited'].includes(c.status))fail(409,'Bu e-posta ile başvuru oluşturulamıyor.');}
 else{if(m.role!=='owner'&&JSON.parse(m.scope)!=='all')fail(403,'Yeni müşteri oluşturmak için tüm müşteri kapsamı gerekir.');c={id:id(),advisor:m.role==='employee'?m.manager:m.id};ops.push(q(db,'INSERT INTO people VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',c.id,null,email,name,'customer','owner','{}','"all"','invited',c.advisor,null,Date.now()));}
 const app=id(),data={name,email,phone,service:b.service,from:b.from,to:'Brezilya (São Paulo)',application:app,advisor:c.advisor,files:[],sale:null,status:'Paket satışı bekleniyor'};
 ops.push(ins(db,b.requestId,'advisor_case',c.id,data),ins(db,app,'application',c.id,{service:b.service,from:b.from,to:data.to,status:'Başvuru alındı',advisor:c.advisor}),ins(db,id(),'notice',c.advisor,{title:'Yeni müşteri başvurusu: '+name,link:'kyc',read:false}));await db.batch(ops);return reply({ok:true,id:b.requestId});
 }
 let form;if(route==='upload'){
 permit(m,'documents',true);let size=0,parts=[];const reader=req.body?.getReader();if(!reader)fail(400,'Dosya gerekli.');while(true){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>11*1024*1024){await reader.cancel();fail(413,'En fazla 10 MB.');}parts.push(r.value);}form=await new Response(new Blob(parts),{headers:{'Content-Type':req.headers.get('content-type')}}).formData();b={id:form.get('id')};
 }
 const record=await one(db,"SELECT * FROM items WHERE id=? AND kind='advisor_case'",clean(b.id||url.searchParams.get('case')));if(!record)fail(404,'Başvuru bulunamadı.');
 const customer=await one(db,'SELECT * FROM people WHERE id=?',record.owner);const d=JSON.parse(record.data);if(!customer||(!scope(m,customer)&&!(req.method==='GET'&&d.lawyer===m.id)))fail(403,'Bu müşteri size atanmamış.');
 if(route==='file'&&req.method==='GET'){permit(m,'documents');const doc=d.files.find(f=>f.id===url.searchParams.get('id'));if(!doc)fail(404,'Dosya yok.');const raw=await one(db,'SELECT * FROM items WHERE id=?',doc.id),fd=JSON.parse(raw.data),blob=await env.BUCKET.get(fd.key);if(!blob)fail(404,'Dosya yok.');return new Response(blob.body,{headers:{'Content-Type':fd.mime,'Cache-Control':'private, no-store','Content-Security-Policy':"default-src 'none'; sandbox",'X-Content-Type-Options':'nosniff'}});}
 if(req.method!=='POST')fail(404,'İşlem bulunamadı.');
 if(d.status==='Avukata iletildi')fail(409,'İletilen dosya kilitli.');
 let ops=[],blobKey;
 if(route==='sale'){permit(m,'finance',true);const reference=clean(b.reference);if(!reference)fail(400,'Paket satış referansı gerekli.');d.sale={reference,confirmedBy:m.id,at:Date.now()};d.status='Belgeler bekleniyor';}
 else if(route==='upload'){
 if(!d.sale)fail(400,'Önce paket satışını kaydedin.');const slot=Number(form.get('slot')),file=form.get('file');if(!Number.isInteger(slot)||slot<0||slot>4||!file||typeof file==='string'||!file.size||file.size>10*1024*1024)fail(400,'Geçerli belge ve dosya seçin (en fazla 10 MB).');
 const buf=await file.arrayBuffer(),bytes=new Uint8Array(buf);const mime=String.fromCharCode(...bytes.slice(0,5))==='%PDF-'?'application/pdf':bytes[0]===255&&bytes[1]===216?'image/jpeg':bytes.slice(0,8).join(',')==='137,80,78,71,13,10,26,10'?'image/png':null;if(!mime)fail(400,'PDF, JPG veya PNG seçin.');const fid=id();blobKey=`private/${customer.id}/${fid}`;await env.BUCKET.put(blobKey,buf,{httpMetadata:{contentType:mime}});
 const fd={key:blobKey,mime,name:clean(file.name),title:titles[slot],slot,direction:'out',status:'Yüklendi',sender:m.name,senderRole:m.role,case:record.id,size:file.size};
 ops.push(ins(db,fid,'document',customer.id,fd));d.files=d.files.filter(f=>f.slot!==slot);d.files.push({id:fid,slot,name:fd.name,status:'Yüklendi'});d.status='Belge incelemesi';
 }else if(route==='review'){
 permit(m,'kyc',true);permit(m,'documents');if(!d.sale)fail(400,'Paket satışı gerekli.');const f=d.files.find(f=>f.id===b.file);if(!f||!['Onaylandı','Reddedildi'].includes(b.status)||!clean(b.reason))fail(400,'Belge, sonuç ve kontrol notu gerekli.');f.status=b.status;f.reason=clean(b.reason,1000);f.reviewer=m.id;const raw=await one(db,'SELECT * FROM items WHERE id=?',f.id);ops.push(q(db,'UPDATE items SET data=?,updated=? WHERE id=?',JSON.stringify({...JSON.parse(raw.data),status:f.status,reason:f.reason,reviewer:m.name}),Date.now(),f.id));
 d.status=d.files.length===5&&d.files.every(f=>f.status==='Onaylandı')?'Avukat ataması bekleniyor':'Belge incelemesi';
 }else if(route==='assign'){if(m.role!=='owner')fail(403,'Avukat atamasını yönetici yapar.');const lawyer=await one(db,"SELECT * FROM people WHERE id=? AND status='active' AND role IN ('advisor','employee')",clean(b.lawyer));if(!lawyer||!allowed(lawyer,'documents')||!allowed(lawyer,'applications'))fail(400,'Başvuru ve belge okuma yetkili bir avukat hesabı seçin.');d.lawyer=lawyer.id;d.lawyerName=lawyer.name;}else fail(404,'İşlem bulunamadı.');
 if(d.sale&&d.files.length===5&&d.files.every(f=>f.status==='Onaylandı')&&d.lawyer){
 d.status='Avukata iletildi';d.handoffAt=Date.now();
 ops.push(ins(db,'handoff-'+record.id,'notice',d.lawyer,{title:'KYC tamamlandı: '+d.name,link:'kyc',case:record.id,read:false}));
 const app=await one(db,'SELECT * FROM items WHERE id=?',d.application);
 ops.push(q(db,'UPDATE items SET data=?,updated=? WHERE id=?',JSON.stringify({...JSON.parse(app.data),status:'Avukatta'}),Date.now(),app.id));
 }
 // D1 batch is transactional: fail the NOT NULL constraint on a stale revision.
 const guard=q(db,"INSERT INTO items(id,kind,owner,data,created,updated) SELECT ?,NULL,?,'{}',0,0 WHERE NOT EXISTS(SELECT 1 FROM items WHERE id=? AND data=?)",id(),m.id,record.id,record.data);
 try{await db.batch([guard,q(db,'UPDATE items SET data=?,updated=? WHERE id=?',JSON.stringify(d),Date.now(),record.id),...ops,ins(db,id(),'audit',m.id,{action:'advisor.'+route,target:record.id,at:Date.now()})]);}
 catch(e){if(blobKey)await env.BUCKET.delete(blobKey);fail(409,'İşlem kaydedilemedi veya dosya başka bir kullanıcı tarafından güncellendi. Yenileyip tekrar deneyin.');}
 return reply({ok:true,status:d.status});
 }catch(e){return reply({error:e.status?e.message:'İşlem tamamlanamadı. Yeniden deneyin.'},e.status||500);}}
