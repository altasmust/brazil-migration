/* Additive enhancements: the original panel renderers and styles remain the baseline. */
(()=>{
const partner=false;
const languageOptions=[['pt-BR','Português'],['tr','Türkçe'],['az','Azərbaycanca'],['mk','Македонски'],['ru','Русский'],['es','Español'],['fa','فارسی'],['ar','العربية'],['tk','Türkmençe'],['uz','Oʻzbekcha'],['ky','Кыргызча'],['id','Bahasa Indonesia']];
const picker=document.createElement('select');picker.id='region-language';picker.setAttribute('aria-label','Dil seçimi');picker.innerHTML=languageOptions.map(([v,t])=>`<option value="${v}">${t}</option>`).join('');picker.value=localStorage.getItem('bm-language-choice')||'tr';picker.onchange=()=>localStorage.setItem('bm-language-choice',picker.value);document.querySelector('.account').insertBefore(picker,document.getElementById('notifications-button'));
const originalRender=render;
const originalAct=act;
let extraPage='';
const LIVE={overview:'overview',services:'services',support:'livesupport',documents:'documents',finance:'finance'};
const liveWait=f=>f?.failed?`<article class="card card-pad" style="margin-top:24px"><h2>Hesap bilgileriniz yüklenemedi</h2><p>${String(f.failed).replace(/[<>&]/g,'')}</p><p class="subtle">Sayfayı yenileyin. Sorun sürerse çıkış yapıp tekrar giriş yapın.</p></article>`:`<div class="card card-pad" style="margin-top:24px;display:flex;gap:12px;align-items:center;color:var(--muted,#6b786f)"><span class="bm-spin"></span>Hesap bilgileriniz yükleniyor…</div>`;

function extraButtons(){const f=window.BMFeatures;const root=document.getElementById('content');if(root.querySelector('.extension-actions'))return;const bar=document.createElement('div');bar.className='extension-actions';const links=partner?[['team','Ekip & Yetkiler'],['livecustomers','Kayıtlı Müşteriler'],['applications','Kayıtlı Başvurular'],['liveaffiliate','Referans Takibi'],['liveaudit','İşlem Geçmişi']]:[['liveprofile','Profilimi Düzenle'],['livesupport','Destek']];bar.innerHTML=links.map(([id,t])=>`<button class="btn secondary small" data-extra="${id}">${t}</button>`).join('');if((location.hash||'#overview')==='#overview')root.querySelector('.page-heading')?.insertAdjacentElement('afterend',bar);}
render=function(){
 const h=location.hash.slice(1)||'overview';
 if(!h.startsWith('extra-'))extraPage='';
 originalRender();
 const f=window.BMFeatures;
 if(h.startsWith('extra-'))extraPage=h.slice(6);
 if(extraPage&&!['documents','finance','services','livesupport','liveprofile'].includes(extraPage))extraPage='';
 if(extraPage&&f?.ready){document.getElementById('content').innerHTML=`<div class="extension-back"><button class="text-button" data-extra="back">← Genel bakışa dön</button></div>`+f.view(extraPage);document.querySelectorAll('[data-page]').forEach(a=>a.classList.remove('active'));}
 else if(LIVE[h]){document.getElementById('content').innerHTML=f?.ready?f.view(LIVE[h]):liveWait(f);}
 extraButtons();
 if(f?.ready&&!extraPage){const actions={finance:['finance','Faturalarım'],services:['services','Kayıtlı Hizmetlerim'],support:['livesupport','Destek'],documents:['documents','Gelen / Giden Belgeler']};const next=actions[h];if(next&&!LIVE[h])document.querySelector('#content .page-heading .heading-actions')?.insertAdjacentHTML('beforeend',`<button class="btn secondary small" data-extra="${next[0]}">${next[1]}</button>`);}
 if(f?.ready)f.animate();
};
act=function(action){const f=window.BMFeatures;
 if(f?.ready&&!partner){if(action==='new-application'||action.startsWith('renew:')){f.action('apply').catch(e=>toast(e.message));return}if(action==='kyc-verify'){location.hash='documents';return}}
 originalAct(action);
 // Keep the original form layout; only change the requested route options.
 const form=document.getElementById('application-form');if(form){const from=form.querySelector('[name=from]'),to=form.querySelector('[name=to]');if(from)from.innerHTML=['Brezilya','Türkiye','Azerbaycan','Kuzey Makedonya','Rusya','İspanya','İran','Suudi Arabistan','Türkmenistan','Özbekistan','Kırgızistan','Endonezya'].map(c=>`<option ${c==='Türkiye'?'selected':''}>${c}</option>`).join('');if(to)to.innerHTML='<option>Brezilya (São Paulo)</option>';}
};
document.addEventListener('click',e=>{const b=e.target.closest('[data-extra]');if(!b)return;if(b.dataset.extra==='back'){location.hash='overview';return}if(!window.BMFeatures?.ready){toast('Bu özellik için giriş ve hesap yetkisi gerekiyor.');return}location.hash='extra-'+b.dataset.extra;});
window.addEventListener('bm-live-ready',()=>render());window.addEventListener('bm-live-render',()=>render());window.addEventListener('bm-live-refresh',()=>{if(location.hash.startsWith('#extra-')||location.hash==='#documents'&&!partner)render()});
if(!partner){const originalKyc=kyc;kyc=function(){return window.BMFeatures?.ready?window.BMFeatures.scanner():originalKyc()};document.getElementById('profile-button').onclick=()=>{if(window.BMFeatures?.ready)location.hash='extra-liveprofile';else originalAct('profile')};}
render();
})();
