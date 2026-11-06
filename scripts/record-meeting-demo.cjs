const {chromium}=require('playwright');const B='http://localhost:3010';const D=__dirname+'/';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const b=await chromium.launch({args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const c=await b.newContext({viewport:{width:960,height:600},deviceScaleFactor:2,recordVideo:{dir:D+'vid',size:{width:960,height:600}}});
await c.addInitScript(()=>{try{sessionStorage.setItem('bmIntro','1');localStorage.setItem('lang','tr')}catch{}});
await c.route('**/api/workspace/meeting',r=>r.fulfill({json:{name:'Mehmet'}}));
await c.route('**/api/workspace/meeting/save',r=>r.fulfill({json:{ok:true,id:'x',summary:'=== Türkçe ===\n1) Konu: Aile birleşimi yoluyla oturum izni.\n2) Mehmet, eşiyle birlikte São Paulo’ya taşınmak istiyor.\n4) Yapılacaklar: Apostilli evlilik belgesi + yeminli tercüme hazırlanacak; ekip belge listesini e-postayla gönderecek.\n\n=== Português ===\n1) Assunto: autorização de residência por reunião familiar.'}}));
const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(B+'/gorusme/');await p.evaluate(()=>{S.me='tr';applyLang();});await sleep(1200);
// demo katmanı: adım bandı + fotoğraflar
await p.evaluate(()=>{
 const st=document.createElement('style');st.textContent=`#demoBar{position:fixed;left:50%;top:66px;transform:translateX(-50%);z-index:9999;display:flex;gap:8px;font:600 13px Poppins,system-ui,sans-serif}
 #demoBar span{white-space:nowrap;font-size:12px;display:flex;align-items:center;gap:7px;padding:8px 13px;border-radius:999px;background:rgba(10,30,18,.72);color:#cfe3cf;border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(8px);transition:all .3s}
 #demoBar span b{display:inline-grid;place-items:center;width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,.15);font-size:11px}
 #demoBar span.on{background:#d7eca4;color:#183b2c;border-color:#d7eca4}#demoBar span.on b{background:#1b5e20;color:#fff}
 .demo-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1}
 #call .chip.net{display:none!important}#call.ui-off .topbar,#call.ui-off .dock{opacity:1!important;transform:none!important;pointer-events:auto!important}#call.ui-off .captions{bottom:calc(max(12px,env(safe-area-inset-bottom,0px)) + 78px)!important}.bm-cc{display:none!important}`;document.head.appendChild(st);
 const bar=document.createElement('div');bar.id='demoBar';bar.innerHTML=['Dilinizi seçin','Konuşun, çevrilsin','Yazın, çevrilsin','Özet dosyanızda'].map((t,i)=>`<span data-s="${i}"><b>${i+1}</b>${t}</span>`).join('');document.body.appendChild(bar);
 setInterval(()=>document.getElementById('call')?.classList.remove('ui-off'),150);
 window.demoStep=i=>document.querySelectorAll('#demoBar span').forEach(s=>s.classList.toggle('on',+s.dataset.s===i));
 const pv=document.querySelector('#pvVideo')?.parentElement;if(pv){const im=new Image();im.src='/bm/live/client.jpg';im.className='demo-img';pv.style.position='relative';pv.appendChild(im);}
});
await p.evaluate(()=>demoStep(0));
await p.fill('#name','');for(const ch of 'Mehmet'){await p.type('#name',ch);await sleep(90);}
await sleep(400);await p.click('#lang-fa');await sleep(900);await p.click('#lang-en');await sleep(900);await p.click('#lang-tr');await sleep(1400);
// görüşme ekranı
await p.evaluate(()=>{
 S.me='tr';S.name='Mehmet';S.peerName='Av. Rafael';S.peerLang='pt';S.room='K7P2QX';applyLang();show('call');
 document.getElementById('roomChip').textContent='K7P2QX';document.getElementById('waiting').hidden=true;
 document.getElementById('pairText')&&(document.getElementById('pairText').textContent='TR ⇄ PT');
 S.startedAt=Date.now()-63000;if(typeof startTimer==='function')startTimer();
 for(const [id,src] of [['tileRemote','/bm/live/lawyer.jpg'],['tileSelf','/bm/live/client.jpg']]){const t=document.getElementById(id);const im=new Image();im.src=src;im.className='demo-img';t.prepend(im);}
 const rn=document.querySelector('#tileRemote .nameplate');if(rn)rn.innerHTML='<span class="swatch sw-pt"></span> Av. Rafael';
 S.lines=[];
});
await p.evaluate(()=>demoStep(1));await sleep(1200);
const typeCap=async(slot,who,lang,text,tr)=>{for(let i=1;i<=text.length;i+=2){await p.evaluate(([slot,who,lang,t])=>renderCap(slot,{lang,who,main:t,live:true,mine:slot==='me'}),[slot,who,lang,text.slice(0,i)]);await sleep(45);}
 await p.evaluate(([slot,who,lang,text,tr])=>{renderCap(slot,{lang,who,main:text,orig:tr,mine:slot==='me'});S.lines.push({time:'10:01',who,lang,orig:text,tr});},[slot,who,lang,text,tr]);await sleep(2300);};
await typeCap('me','Siz','tr','Merhaba, eşimle birlikte São Paulo’ya taşınmak istiyoruz. Hangi belgeler gerekiyor?','Olá, queremos nos mudar para São Paulo com minha esposa. Quais documentos são necessários?');
// avukat Portekizce konuşur; Mehmet Türkçesini görür
const them=async(pt,trk)=>{await p.evaluate(()=>renderCap('them',{lang:'pt',who:'Av. Rafael',main:'…',orig:'',live:true}));
 for(let i=1;i<=pt.length;i+=3){await p.evaluate(([t])=>renderCap('them',{lang:'pt',who:'Av. Rafael',main:'…',orig:t,live:true}),[pt.slice(0,i)]);await sleep(40);}
 await p.evaluate(([pt,trk])=>{renderCap('them',{lang:'pt',who:'Av. Rafael',main:trk,orig:pt});S.lines.push({time:'10:02',who:'Av. Rafael',lang:'pt',orig:pt,tr:trk});},[pt,trk]);await sleep(3000);};
await them('Vocês precisam da certidão de casamento apostilada e da tradução juramentada.','Apostilli evlilik belgesi ve yeminli tercümesi gerekiyor.');
// sohbet
await p.evaluate(()=>demoStep(2));await p.evaluate(()=>openPanel("chat"));await sleep(500);await p.click('#tabChat').catch(()=>{});await sleep(600);
const inp=await p.$('#chatFoot input');if(inp){for(const ch of 'Adresim: Rua Augusta 1500'){await inp.type(ch);await sleep(35);}await sleep(300);await inp.fill('');}
await p.evaluate(()=>{addMsg({me:true,who:'Siz',text:'Adresim: Rua Augusta 1500, São Paulo',orig:'Meu endereço: Rua Augusta 1500, São Paulo'});});await sleep(1500);
await p.evaluate(()=>{addMsg({me:false,who:'Av. Rafael',text:'Teşekkürler, belge listesini e-postanıza gönderiyorum.',orig:'Obrigado, envio a lista de documentos para o seu e-mail.'});});await sleep(2600);
// bitiş + özet
await p.evaluate(()=>{demoStep(3);document.getElementById('demoBar').style.top='14px';closePanel();});await sleep(300);
await p.evaluate(()=>{S.wsUser='Mehmet';endCall();});await sleep(1200);await p.click('#endSave').catch(e=>errs.push('save '+e.message));await sleep(4000);
await p.screenshot({path:D+'last.png'});
await c.close();console.log(errs);await b.close()})()
