'use strict';
// Vize başvuru formu (MRE e-konsolosluk formunun adım yapısına göre). Başvuru Brazil Migration ekibine gönderilir;
// resmî sisteme aktarım danışman tarafından "Aktarım özeti" ile yapılır. Resmî formun herkese açık API'si yoktur.
(() => {
  const V = window.BM_VISA, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const ISO = 'AF AX AL DZ AS AD AO AI AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BA BW BR VG BN BG BF BI CV KH CM CA KY CF TD CL CN CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI XK KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU KP MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA KR SS ES LK SD SR SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UY UZ VU VE VN WF EH YE ZM ZW'.split(' ');
  let DN; try { DN = new Intl.DisplayNames(['tr'], {type: 'region'}); } catch { DN = {of: c => c}; }
  const cname = c => { try { return DN.of(c) || c; } catch { return c; } };
  const COUNTRIES = ISO.map(c => [c, cname(c)]).sort((a, b) => a[1].localeCompare(b[1], 'tr'));
  const flag = c => c ? `<img class="vz-flag" src="/bm/flags/${c.toLowerCase()}.svg" alt="" onerror="this.remove()">` : '';
  const STEPS = ['Genel Veriler', 'Seyahat Belgesi', 'Adres ve Meslek', 'Seyahat ve Vize', 'Fotoğraf ve Belgeler', 'Özet ve Gönderim'];

  let F = {step: 0, d: {}, checks: {}}, recId = null, status = 'draft', saving = false;
  const d = () => F.d;
  const toast = t => { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => el.hidden = true, 5000); };
  const api = async (path, body) => {
    const r = await fetch('/api/workspace/' + path, {method: body ? 'POST' : 'GET', headers: body ? {'Content-Type': 'application/json'} : {}, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin', cache: 'no-store'});
    if (r.status === 401) { location.href = '/giris/?next=' + encodeURIComponent(location.pathname); throw new Error('Giriş gerekli'); }
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'İşlem tamamlanamadı.'); return j;
  };
  const save = async (quiet = true) => {
    if (saving || status === 'submitted') return; saving = true;
    try { const r = await api('visa-form', {id: recId, form: F}); recId = r.id; if (!quiet) toast('Taslak kaydedildi.'); } catch (e) { if (!quiet) toast(e.message); } finally { saving = false; }
  };

  // ---------- alan yardımcıları ----------
  const val = k => d()[k] ?? '';
  const req = '<b class="vz-req">*</b>';
  const input = (k, label, o = {}) => `<label class="vz-f ${o.wide ? 'wide' : ''}"><span>${label}${o.req ? req : ''}</span><input name="${k}" type="${o.type || 'text'}" value="${esc(val(k))}" ${o.req ? 'data-req' : ''} ${o.ph ? `placeholder="${esc(o.ph)}"` : ''} ${o.dis ? 'disabled' : ''} ${o.max ? `maxlength="${o.max}"` : ''}></label>`;
  const select = (k, label, opts, o = {}) => `<label class="vz-f ${o.wide ? 'wide' : ''}"><span>${label}${o.req ? req : ''}</span><select name="${k}" ${o.req ? 'data-req' : ''} ${o.dis ? 'disabled' : ''}><option value="">Seç</option>${opts.map(x => { const [v, t] = Array.isArray(x) ? x : [x, x]; return `<option value="${esc(v)}" ${String(val(k)) === String(v) ? 'selected' : ''}>${esc(t)}</option>`; }).join('')}</select></label>`;
  const country = (k, label, o = {}) => select(k, label, COUNTRIES, o);
  const yesno = (k, label, o = {}) => `<div class="vz-f ${o.wide ? 'wide' : ''}"><span>${label}${o.req ? req : ''}</span><div class="vz-radio" ${o.req ? `data-req-radio="${k}"` : ''}><label><input type="radio" name="${k}" value="evet" ${val(k) === 'evet' ? 'checked' : ''}> Evet</label><label><input type="radio" name="${k}" value="hayir" ${val(k) === 'hayir' ? 'checked' : ''}> Hayır</label></div></div>`;
  const radios = (k, label, opts, o = {}) => `<div class="vz-f"><span>${label}${o.req ? req : ''}</span><div class="vz-radio" ${o.req ? `data-req-radio="${k}"` : ''}>${opts.map(([v, t]) => `<label><input type="radio" name="${k}" value="${v}" ${val(k) === v ? 'checked' : ''}> ${t}</label>`).join('')}</div></div>`;
  const check = (k, label) => `<label class="vz-check"><input type="checkbox" name="${k}" ${val(k) ? 'checked' : ''}> ${label}</label>`;
  const section = (title, body, note = '') => `<section class="vz-sec"><h3>${title}</h3>${note}<div class="vz-grid">${body}</div></section>`;
  const info = t => `<p class="vz-info wide"><bm-i class="ic ic-info"></bm-i>${t}</p>`;
  const LISTNOTE = info('Ülke listesi, Brezilya Federatif Cumhuriyeti’nin listedeki herhangi bir yerin adını veya hukuki statüsünü tanıdığı anlamına gelmez.');
  const person = (p, title, opt = true) => {
    const off = opt && val(p + 'NA');
    return `<section class="vz-sec"><h3>${title}</h3>${opt ? check(p + 'NA', 'Bilgi verilmedi') : ''}<div class="vz-grid">${input(p + 'Given', 'Ad(lar)', {req: !off, dis: off})}${input(p + 'Family', 'Soyad(lar)', {req: !off, dis: off && true})}${country(p + 'BirthCountry', 'Doğum yeri (ülke)', {dis: off})}${input(p + 'Birth', 'Doğum tarihi', {type: 'date', dis: off})}${country(p + 'Nationality', 'Uyruğu', {dis: off})}</div></section>`;
  };

  // ---------- adım 0: uygunluk ----------
  function eligibility() {
    const c = val('citizenship'), t = val('visaType'), T = V.types[t];
    let res = '';
    if (c && t) {
      if (T.visit && V.exempt[c]) res = `<div class="vz-ok"><bm-i class="ic ic-check"></bm-i><div><b>${esc(cname(c))} vatandaşları Brezilya’ya ziyaret amaçlı girişte vizeden muaftır.</b><p>Turizm, iş görüşmesi veya transit için <b>${V.exempt[c]} güne kadar</b> vize almadan girebilirsiniz; pasaportunuzun geçerli olması yeterlidir.${V.mercosur.includes(c) ? ' Mercosur ülkesi vatandaşı olarak kimlik kartınızla da giriş yapabilirsiniz.' : ''} Brezilya’da yaşamak, çalışmak veya okumak için ise geçici vize türlerinden birini seçin.</p></div></div>`;
      else if (T.visit && V.evisa[c]) res = `<div class="vz-warn"><bm-i class="ic ic-info"></bm-i><div><b>${esc(cname(c))} vatandaşları ziyaret için elektronik vize (e-Visa) almalıdır.</b><p>e-Visa başvurusu bu formla değil, resmî e-Visa sistemi üzerinden yapılır. Danışmanınız süreçte size yardımcı olabilir.</p><a class="btn secondary small" href="${V.evisa[c]}" target="_blank" rel="noopener">Resmî e-Visa sistemi ↗</a></div></div>`;
      else {
        const docs = T.docs, done = docs.filter((_, i) => F.checks[t + i]).length;
        res = `<div class="vz-docs"><div class="vz-docs-head"><div><b>Hazırlamanız gereken belgeler · ${esc(T.short)}</b><p>${T.visit ? `${esc(cname(c))} vatandaşları Brezilya’ya ziyaret için <b>vize almak zorundadır</b>.` : 'Geçici vizelerde vatandaşlıktan bağımsız olarak vize gerekir.'} Hazır olan belgeleri işaretleyin; tümü işaretlenmeden sonraki adıma geçemezsiniz.</p></div><span class="vz-count ${done === docs.length ? 'full' : ''}">${done} / ${docs.length}</span></div><ul>${docs.map((x, i) => `<li><label><input type="checkbox" data-doc="${t + i}" ${F.checks[t + i] ? 'checked' : ''}><span>${esc(x)}</span></label></li>`).join('')}</ul><p class="vz-small">Liste genel rehberdir; konsolosluğunuz ek belge isteyebilir. Belgelerinizi panelde <a href="/panel/#documents">Dosyalarım</a> bölümüne yükleyebilirsiniz.</p></div>`;
      }
    }
    return `<div class="vz-hero"><span class="vz-kicker">BRAZIL MIGRATION · VİZE BAŞVURUSU</span><h1>Brezilya vize başvuru formu</h1><p>Önce vatandaşlığınızı ve vize türünü seçin. Vize gerekiyorsa gerekli belgeleri gösterir, ardından resmî konsolosluk formundaki adımlarla bilgilerinizi toplarız. Başvurunuz ekibimize iletilir; resmî sisteme danışmanınız aktarır.</p></div>
      <section class="vz-sec vz-start"><div class="vz-grid">${select('citizenship', 'Vatandaşı olduğunuz ülke', COUNTRIES, {req: true, wide: false})}${select('visaType', 'Başvurmak istediğiniz vize', Object.entries(V.types).map(([k, x]) => [k, x.label]), {req: true})}</div>${c ? `<div class="vz-chosen">${flag(c)}<b>${esc(cname(c))}</b></div>` : ''}${res}</section>`;
  }
  const canStart = () => { const c = val('citizenship'), t = val('visaType'), T = V.types[t]; if (!c || !T) return false; if (T.visit && (V.exempt[c] || V.evisa[c])) return false; return T.docs.every((_, i) => F.checks[t + i]); };

  // ---------- adımlar 1–6 ----------
  const steps = [
    () => section('Kimlik verileri', `<p class="vz-alert wide"><b>Dikkat:</b> Ad ve soyadınızı pasaportunuzda göründüğü şekilde yazın.</p>${input('given', 'Ad(lar)', {req: true})}${input('family', 'Soyad(lar)', {req: !val('familyUnknown'), dis: !!val('familyUnknown')})}<div class="vz-f">${check('familyUnknown', 'Soyadı yok / bilinmiyor')}</div>${input('birthDate', 'Doğum tarihi', {type: 'date', req: true})}${select('marital', 'Medeni durum', V.marital, {req: true})}${radios('sex', 'Cinsiyet', [['E', 'Erkek'], ['K', 'Kadın']], {req: true})}${yesno('formerNames', 'Önceki adlarınız var mı (ör. doğumdaki soyadınız)?', {req: true, wide: true})}${val('formerNames') === 'evet' ? input('formerNamesText', 'Önceki ad / soyad', {req: true, wide: true}) : ''}`)
      + section('Doğum yeri', `${country('birthCountry', 'Doğum yeri (ülke)', {req: true})}${input('birthState', 'Eyalet / il')}${input('birthCity', 'Şehir', {req: true})}${LISTNOTE}`)
      + section('Milliyet', `${country('nationality', 'Uyruğunuz', {req: true})}${yesno('brazilian', 'Brezilya vatandaşlığınız var mı?', {req: true})}${yesno('otherNat', 'Başka bir uyruğunuz var mı?', {req: true})}${val('otherNat') === 'evet' ? country('otherNatCountry', 'Diğer uyruk', {req: true}) : ''}`)
      + person('p1', 'Ebeveyn bilgileri 1') + person('p2', 'Ebeveyn bilgileri 2') + person('lg', 'Yasal temsilci (18 yaş altı veya vasi)'),
    () => section('Seyahat belgesi (pasaport)', `${select('ppType', 'Belge türü', V.passportTypes, {req: true})}${input('ppNumber', 'Pasaport numarası', {req: true, max: 20})}${country('ppCountry', 'Veren ülke', {req: true})}${input('ppAuthority', 'Veren makam', {ph: 'Ör. Emniyet Genel Müdürlüğü'})}${input('ppIssue', 'Veriliş tarihi', {type: 'date', req: true})}${input('ppExpiry', 'Geçerlilik bitiş tarihi', {type: 'date', req: true})}${info('Pasaportunuz Brezilya’ya planlanan giriş tarihinden itibaren en az 6 ay geçerli olmalı ve en az 2 boş sayfası bulunmalıdır.')}`),
    () => section('İkamet adresi ve iletişim', `${country('resCountry', 'İkamet ettiğiniz ülke', {req: true})}${input('resCity', 'Şehir', {req: true})}${input('resAddress', 'Açık adres', {req: true, wide: true})}${input('resZip', 'Posta kodu')}${input('phone', 'Telefon', {type: 'tel', req: true, ph: '+90…'})}${input('email', 'E-posta', {type: 'email', req: true})}`)
      + section('Meslek', `${input('occupation', 'Meslek / unvan', {req: true})}${input('employer', 'İşveren veya okul')}${input('employerAddress', 'İşveren / okul adresi', {wide: true})}${input('employerPhone', 'İşveren telefonu', {type: 'tel'})}`),
    () => section('Seyahat ve vize bilgileri', `<div class="vz-f wide"><span>Vize türü</span><div class="vz-pill">${esc(V.types[val('visaType')]?.label || '')}</div></div>${input('consulate', 'Başvuracağınız konsolosluk / büyükelçilik', {req: true, ph: 'Ör. Brezilya İstanbul Başkonsolosluğu'})}${input('arrival', 'Tahmini giriş tarihi', {type: 'date', req: true})}${input('stayDays', 'Planlanan kalış süresi (gün)', {type: 'number', req: true})}${input('brAddress', 'Brezilya’daki adres (otel, ev veya şirket)', {req: true, wide: true})}${input('brCity', 'Brezilya’daki şehir', {req: true})}${input('brContact', 'Brezilya’daki irtibat kişisi / şirket')}${input('brContactPhone', 'İrtibat telefonu', {type: 'tel'})}${yesno('visitedBefore', 'Daha önce Brezilya’ya gittiniz mi?', {req: true})}${val('visitedBefore') === 'evet' ? input('visitedWhen', 'Son ziyaret tarihi / süresi') : ''}${yesno('refused', 'Daha önce Brezilya vizeniz reddedildi mi?', {req: true})}${val('refused') === 'evet' ? input('refusedWhy', 'Açıklama', {wide: true, req: true}) : ''}`),
    () => { const t = val('visaType'), docs = V.types[t]?.docs || [];
      return section('Fotoğraf', `${info('Biyometrik vesikalık fotoğraf: beyaz fon, yüz tam karşıdan, gözlüksüz, son 6 ay içinde çekilmiş, JPG, en fazla 2 MB.')}${check('photoReady', 'Fotoğrafım bu koşullara uygun ve <a href="/panel/#documents">Dosyalarım</a> bölümüne yükledim / yükleyeceğim.')}`)
        + section('Belgeler', `<ul class="vz-doclist wide">${docs.map((x, i) => `<li><bm-i class="ic ic-check"></bm-i>${esc(x)}</li>`).join('')}</ul>${check('docsUploaded', 'Belgelerimi Dosyalarım bölümüne yükledim veya danışmanıma ileteceğim.')}`); },
    () => summary(true),
  ];
  const stepValid = n => {
    if (n === 4) return !!(val('photoReady') && val('docsUploaded'));
    if (n === 5) return !!val('declaration');
    return true;
  };

  // ---------- özet ----------
  const LBL = {citizenship: 'Vatandaşlık', visaType: 'Vize türü', given: 'Ad(lar)', family: 'Soyad(lar)', birthDate: 'Doğum tarihi', marital: 'Medeni durum', sex: 'Cinsiyet', formerNamesText: 'Önceki ad', birthCountry: 'Doğum ülkesi', birthState: 'Doğum eyaleti', birthCity: 'Doğum şehri', nationality: 'Uyruk', brazilian: 'Brezilya vatandaşlığı', otherNatCountry: 'Diğer uyruk', p1Given: 'Ebeveyn 1 ad', p1Family: 'Ebeveyn 1 soyad', p1Birth: 'Ebeveyn 1 doğum tarihi', p1BirthCountry: 'Ebeveyn 1 doğum yeri', p2Given: 'Ebeveyn 2 ad', p2Family: 'Ebeveyn 2 soyad', p2Birth: 'Ebeveyn 2 doğum tarihi', p2BirthCountry: 'Ebeveyn 2 doğum yeri', lgGiven: 'Yasal temsilci ad', lgFamily: 'Yasal temsilci soyad', ppType: 'Pasaport türü', ppNumber: 'Pasaport no', ppCountry: 'Veren ülke', ppAuthority: 'Veren makam', ppIssue: 'Veriliş', ppExpiry: 'Geçerlilik', resCountry: 'İkamet ülkesi', resCity: 'İkamet şehri', resAddress: 'Adres', resZip: 'Posta kodu', phone: 'Telefon', email: 'E-posta', occupation: 'Meslek', employer: 'İşveren / okul', employerAddress: 'İşveren adresi', consulate: 'Konsolosluk', arrival: 'Giriş tarihi', stayDays: 'Kalış (gün)', brAddress: 'Brezilya adresi', brCity: 'Brezilya şehri', brContact: 'İrtibat', brContactPhone: 'İrtibat tel', visitedBefore: 'Önceki ziyaret', refused: 'Vize reddi', refusedWhy: 'Red açıklaması'};
  const show = (k, v) => { if (/Country$|^citizenship$|^nationality$|^otherNatCountry$/.test(k)) return cname(v); if (k === 'visaType') return V.types[v]?.label || v; if (k === 'sex') return v === 'E' ? 'Erkek' : 'Kadın'; if (v === 'evet') return 'Evet'; if (v === 'hayir') return 'Hayır'; return v; };
  function summary(withSubmit) {
    const rows = Object.keys(LBL).filter(k => val(k) !== '' && val(k) != null).map(k => `<tr><th>${LBL[k]}</th><td>${esc(show(k, val(k)))}</td><td><button type="button" class="vz-copy" data-copy="${esc(show(k, val(k)))}">Kopyala</button></td></tr>`).join('');
    return `<section class="vz-sec"><h3>Başvuru özeti</h3><p class="vz-small">Bilgilerinizi kontrol edin. Gerekirse geri dönüp düzeltebilirsiniz.</p><div class="vz-tablewrap"><table class="vz-sum">${rows}</table></div></section>${withSubmit ? `<section class="vz-sec"><h3>Beyan</h3>${check('declaration', 'Verdiğim bilgilerin doğru ve eksiksiz olduğunu beyan ederim. Bilgilerimin vize başvurum için Brazil Migration ekibi ve danışmanım tarafından işlenmesini kabul ediyorum.')}<p class="vz-small">“Gönder” dediğinizde başvurunuz danışmanınıza iletilir. Resmî konsolosluk sistemine kayıt danışmanınızla birlikte yapılır; bu form resmî başvuru yerine geçmez.</p></section>` : ''}`;
  }

  // ---------- çizim ----------
  function render() {
    const root = $('#vz');
    if (status === 'submitted') {
      root.innerHTML = `<div class="vz-hero"><span class="vz-kicker">BAŞVURU GÖNDERİLDİ</span><h1>Teşekkürler, başvurunuz alındı.</h1><p>Danışmanınız bilgilerinizi inceleyip resmî konsolosluk formuna aktaracak ve sizinle iletişime geçecek.</p></div>${summary(false)}<div class="vz-nav"><a class="btn secondary" href="/panel/">Panele dön</a><button class="btn" type="button" data-print>Yazdır / PDF</button></div>`;
      return;
    }
    if (F.step === 0) root.innerHTML = eligibility() + `<div class="vz-nav"><span></span><button class="btn" type="button" data-next ${canStart() ? '' : 'disabled'}>Forma başla →</button></div>`;
    else {
      const n = F.step - 1;
      root.innerHTML = `<ol class="vz-steps">${STEPS.map((s, i) => `<li class="${i === n ? 'on' : i < n ? 'done' : ''}"><b>${i + 1}</b>${i === n ? `<span>${s}</span>` : ''}</li>`).join('')}</ol><div class="vz-applicant">${flag(val('citizenship'))}${esc(cname(val('citizenship')))} · ${esc(V.types[val('visaType')]?.short || '')}</div><form id="vz-form" novalidate>${steps[n]()}</form>
        <div class="vz-nav"><div><button class="btn secondary" type="button" data-first>İlk sayfaya dön</button><button class="btn secondary" type="button" data-prev>Geri</button></div><div><button class="btn secondary" type="button" data-save>Kaydet</button>${n < 5 ? `<button class="btn" type="button" data-next>Sıradaki →</button>` : `<button class="btn" type="button" data-submit>Danışmana gönder</button>`}</div></div>`;
    }
  }
  function collect() {
    const f = $('#vz-form') || $('#vz');
    f.querySelectorAll('input,select').forEach(el => {
      if (!el.name || el.dataset.doc) return;
      if (el.type === 'checkbox') d()[el.name] = el.checked;
      else if (el.type === 'radio') { if (el.checked) d()[el.name] = el.value; }
      else d()[el.name] = el.value.trim();
    });
  }
  function missing() {
    const f = $('#vz-form'); if (!f) return [];
    const bad = [];
    f.querySelectorAll('[data-req]').forEach(el => { if (!el.disabled && !el.value.trim()) bad.push(el); });
    f.querySelectorAll('[data-req-radio]').forEach(g => { if (!g.querySelector('input:checked')) bad.push(g); });
    f.querySelectorAll('input[type=email]').forEach(el => { if (el.value && !/^\S+@\S+\.\S+$/.test(el.value)) bad.push(el); });
    return bad;
  }
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.doc) { F.checks[t.dataset.doc] = t.checked; render(); return; }
    if (!t.name) return; collect();
    if (['citizenship', 'visaType', 'formerNames', 'otherNat', 'visitedBefore', 'refused', 'familyUnknown', 'p1NA', 'p2NA', 'lgNA'].includes(t.name) || t.type === 'checkbox') render();
  });
  document.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.copy !== undefined) { await navigator.clipboard.writeText(b.dataset.copy); toast('Kopyalandı.'); return; }
    if (b.hasAttribute('data-print')) { window.print(); return; }
    if (b.hasAttribute('data-save')) { collect(); await save(false); return; }
    if (b.hasAttribute('data-prev')) { collect(); F.step = Math.max(0, F.step - 1); render(); scrollTo(0, 0); return; }
    if (b.hasAttribute('data-first')) { collect(); F.step = 0; render(); scrollTo(0, 0); return; }
    if (b.hasAttribute('data-next') || b.hasAttribute('data-submit')) {
      collect();
      if (F.step === 0) { if (!canStart()) return; F.step = 1; if (!d().nationality) d().nationality = val('citizenship'); if (d().lgNA === undefined) d().lgNA = true; render(); save(); scrollTo(0, 0); return; }
      const bad = missing(); $$('.vz-bad').forEach(x => x.classList.remove('vz-bad'));
      if (bad.length) { bad.forEach(x => (x.closest('.vz-f') || x).classList.add('vz-bad')); bad[0].scrollIntoView({behavior: 'smooth', block: 'center'}); toast('Zorunlu alanları doldurun.'); return; }
      if (!stepValid(F.step - 1)) { toast(F.step === 6 ? 'Beyanı onaylayın.' : 'Devam etmek için onay kutularını işaretleyin.'); return; }
      if (b.hasAttribute('data-submit')) { try { const r = await api('visa-form', {id: recId, form: F, submit: true}); recId = r.id; status = 'submitted'; render(); scrollTo(0, 0); } catch (err) { toast(err.message); } return; }
      F.step++; render(); save(); scrollTo(0, 0);
    }
  });

  const QID = new URLSearchParams(location.search).get('id');
  let READONLY = false;
  function staffView() {
    const nav = $('.topbar nav'); if (nav) nav.innerHTML = '<a href="/partner/#overview">Genel Bakış</a><a href="/partner/#customers" class="active">Müşteriler</a><a href="/partner/#documents">Dosyalar</a>'; const back = $('.topbar .account a'); if (back) { back.href = '/partner/'; back.textContent = '← Danışman paneli'; }
    const root = $('#vz'), json = JSON.stringify({country: val('citizenship'), visaType: val('visaType'), fields: Object.fromEntries(Object.keys(LBL).filter(k => val(k) !== '' && val(k) != null).map(k => [k, show(k, val(k))]))}, null, 2);
    root.innerHTML = `<div class="vz-hero"><span class="vz-kicker">DANIŞMAN GÖRÜNÜMÜ · ${status === 'submitted' ? 'GÖNDERİLDİ' : 'TASLAK'}</span><h1>${esc(val('given'))} ${esc(val('family'))}</h1><p>${flag(val('citizenship'))} ${esc(cname(val('citizenship')))} · ${esc(V.types[val('visaType')]?.label || '')}</p><p class="vz-small">Resmî konsolosluk formunu (formulario-mre.serpro.gov.br) açıp alanları aynı sırayla doldurun; her satırdaki “Kopyala” ile değeri panoya alabilirsiniz. Resmî sistemin herkese açık bir API’si olmadığı için aktarım elle yapılır.</p></div>${summary(false)}<div class="vz-nav"><a class="btn secondary" href="/partner/#customers">← Müşterilere dön</a><div><button class="btn secondary" type="button" data-json>JSON indir</button><button class="btn" type="button" data-print>Yazdır / PDF</button></div></div>`;
    $('[data-json]').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([json], {type: 'application/json'})); a.download = 'vize-formu-' + (val('family') || 'basvuru') + '.json'; a.click(); };
  }
  (async () => {
    try {
      const r = await api('visa-form' + (QID ? '?id=' + encodeURIComponent(QID) : ''));
      READONLY = !!r.readonly;
      const cur = (r.forms || [])[0];
      if (cur) { recId = cur.id; F = {step: 0, d: {}, checks: {}, ...cur.form}; status = cur.status; }
    } catch (e) { if (e.message === 'Giriş gerekli') return; $('#vz').innerHTML = `<p class="vz-loading">${esc(e.message)}</p>`; return; }
    if (READONLY) staffView(); else render();
  })();
})();
