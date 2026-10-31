const DAY=86400000,ACTIVE=300000;
const paths=new Set(['/','/index.html','/brezilyada-sirket-kurma/','/brezilya-oturum-izni/','/iletisim/','/giris/','/icerik-plani/','/brezilya-vatandasligi/','/degerlendirme/','/kaynaklar/','/portekizce/','/turkiye-brezilya/','/partner-ol/']);
const response=(data,status=200,headers={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
export async function heartbeat(req,env){
 try{
  if(req.method!=='POST')return response({error:'Yöntem desteklenmiyor.'},405);
  if(req.headers.get('origin')!==new URL(req.url).origin)return response({error:'Geçersiz kaynak.'},403);
  if(req.headers.get('dnt')==='1'||req.headers.get('sec-gpc')==='1')return response({tracked:false});
  if(Number(req.headers.get('content-length')||0)>2048)return response({error:'İstek çok büyük.'},413);
  const raw=await req.text();if(raw.length>2048)return response({error:'İstek çok büyük.'},413);
  let b;try{b=JSON.parse(raw)}catch{return response({error:'Geçersiz veri.'},400)}
  if(!paths.has(b.path))return response({error:'Sayfa izlenmiyor.'},400);
  const cookie=req.headers.get('cookie')||'',match=cookie.match(/(?:^|;\s*)bm_visit=([a-f0-9-]{36})(?:;|$)/),sid=match?.[1]||crypto.randomUUID(),id='visit:'+sid,now=Date.now();
  const existing=await env.DB.prepare("SELECT updated FROM items WHERE id=? AND kind='visitor_session' AND owner='site'").bind(id).first();
  if(existing&&now-existing.updated<25000)return response({tracked:true});
  // Geolocation comes only from the hosting edge. Never trust coordinates in request JSON.
  const cf=req.cf||{},validLat=cf.latitude!=null&&Number.isFinite(Number(cf.latitude))&&Math.abs(Number(cf.latitude))<=90,validLon=cf.longitude!=null&&Number.isFinite(Number(cf.longitude))&&Math.abs(Number(cf.longitude))<=180;
  const data={path:b.path,country:/^[A-Z]{2}$/.test(cf.country||'')?cf.country:'',city:String(cf.city||'').slice(0,80),lat:validLat&&validLon?Math.round(Number(cf.latitude)*10)/10:null,lon:validLat&&validLon?Math.round(Number(cf.longitude)*10)/10:null};
  await env.DB.batch([env.DB.prepare('INSERT INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated=excluded.updated').bind(id,'visitor_session','site',JSON.stringify(data),now,now),env.DB.prepare("DELETE FROM items WHERE kind='visitor_session' AND owner='site' AND updated<?").bind(now-DAY)]);
  return response({tracked:true},200,{'Set-Cookie':`bm_visit=${sid}; Path=/; Max-Age=86400; HttpOnly; Secure; SameSite=Lax`});
 }catch{return response({error:'Ziyaretçi kaydı alınamadı.'},500)}
}
export async function visitorStats(db,now=Date.now()){
 const rows=(await db.prepare("SELECT data,updated FROM items WHERE kind='visitor_session' AND owner='site' AND updated>=?").bind(now-DAY).all()).results;
 const active=rows.filter(x=>x.updated>=now-ACTIVE),groups=new Map();let unknown=0;
 for(const r of active){const d=JSON.parse(r.data);if(d.lat==null||d.lon==null){unknown++;continue}const key=[d.country,d.city,d.lat,d.lon].join('|');if(!groups.has(key))groups.set(key,{country:d.country,city:d.city,lat:d.lat,lon:d.lon,count:0});groups.get(key).count++}
 const pages=new Map();for(const r of active){const p=JSON.parse(r.data).path;pages.set(p,(pages.get(p)||0)+1)}
 return {active:active.length,last24h:rows.length,unknown,locations:[...groups.values()].sort((a,b)=>b.count-a.count),pages:[...pages].map(([path,count])=>({path,count})).sort((a,b)=>b.count-a.count),updated:now,windowMinutes:5};
}
