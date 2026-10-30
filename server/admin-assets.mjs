const fail=(status,message)=>{throw Object.assign(new Error(message),{status})};
export async function adminAssets(req,env,m,path){
 const db=env.DB;
 if(req.method==='GET'&&path==='assets'){
  const rows=(await db.prepare("SELECT id,data FROM items WHERE kind='admin_asset' AND owner=? ORDER BY created DESC").bind(m.id).all()).results;
  return Response.json({assets:rows.map(r=>{const d=JSON.parse(r.data);return {id:r.id,name:d.name,mime:d.mime,size:d.size}})},{headers:{'Cache-Control':'private, no-store'}});
 }
 if(req.method==='GET'&&path.startsWith('asset/')){
  const r=await db.prepare("SELECT data FROM items WHERE id=? AND kind='admin_asset' AND owner=?").bind(path.slice(6),m.id).first();if(!r)fail(404,'Medya bulunamadı.');const d=JSON.parse(r.data),o=await env.BUCKET.get(d.key);if(!o)fail(404,'Medya bulunamadı.');return new Response(o.body,{headers:{'Content-Type':d.mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':'sandbox','Content-Disposition':"inline; filename*=UTF-8''"+encodeURIComponent(d.name)}});
 }
 if(req.method!=='POST'||path!=='assets')return null;
 if(req.headers.get('origin')!==new URL(req.url).origin)fail(403,'Geçersiz istek kaynağı.');
 if(Number(req.headers.get('content-length')||0)>11*1024*1024)fail(413,'Dosya en fazla 10 MB olabilir.');
 const f=await req.formData(),file=f.get('file'),kind=f.get('kind');if(!file||typeof file.arrayBuffer!=='function'||file.size<12||file.size>10*1024*1024)fail(400,'12 bayt ile 10 MB arasında bir medya dosyası seçin.');
 const bytes=new Uint8Array(await file.arrayBuffer()),sig=(a,b)=>String.fromCharCode(...bytes.slice(a,b));let mime='';
 if([137,80,78,71,13,10,26,10].every((x,i)=>bytes[i]===x))mime='image/png';else if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)mime='image/jpeg';else if(sig(0,4)==='RIFF'&&sig(8,12)==='WEBP')mime='image/webp';else if(sig(0,4)==='OggS')mime='audio/ogg';else if(sig(0,3)==='ID3'||(bytes[0]===255&&(bytes[1]&224)===224))mime='audio/mpeg';else if(sig(4,8)==='ftyp')mime='video/mp4';
 if(!mime||!['image','audio','video'].includes(kind)||(!mime.startsWith(kind+'/')&&!(kind==='audio'&&mime==='video/mp4')))fail(400,'Dosya türü seçilen medya alanıyla uyumlu değil. PNG, JPG, WebP, MP3, OGG veya MP4 kullanın.');
 const id=crypto.randomUUID(),key='admin-assets/'+m.id+'/'+id,t=Date.now(),data={name:String(file.name).slice(0,180),mime,key,size:file.size};await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:mime}});
 try{await db.batch([db.prepare('INSERT INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?)').bind(id,'admin_asset',m.id,JSON.stringify(data),t,t),db.prepare('INSERT INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),'admin_audit',m.id,JSON.stringify({actor:m.name,action:'Ayar medyası yüklendi',target:id}),t,t)])}catch(e){await env.BUCKET.delete(key);throw e}
 return Response.json({ok:true,id},{headers:{'Cache-Control':'private, no-store'}});
}
