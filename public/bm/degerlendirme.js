'use strict';
// Ön değerlendirme: 3 soru → e-posta + abonelik onayı → kişisel sonuçlar.
(() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const I = {
    gov: '<path d="M3 10h18M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18M12 3l9 5H3z"/>',
    home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    build: '<path d="M4 21V4h11v17M15 9h5v12M8 8h3M8 12h3M8 16h3"/>',
    id: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2.5"/><path d="M14 10h4M14 14h4M6 16c.6-1.4 1.7-2 3-2s2.4.6 3 2"/>',
    ring: '<circle cx="12" cy="15" r="6"/><path d="m9 4 3 4 3-4z"/>',
    plane: '<path d="M10 14 3 11l1-2 8 1 5-6a2 2 0 0 1 3 3l-6 5 1 8-2 1-3-7-4 3v2l-2 1-1-4-4-1 1-2h2z"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    loop: '<path d="M4 12a8 8 0 0 1 14-5l2-2v6h-6l2.5-2.5A5 5 0 1 0 17 14"/>',
    clock: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M10 2h4"/>',
    doc: '<path d="M14 3H6v18h12V7zM14 3v4h4M9 12h6M9 16h6"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
    child: '<circle cx="12" cy="6" r="3"/><path d="M8 21v-6l-2-3 3-2h6l3 2-2 3v6"/>',
    brief: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3M3 13h18"/>',
    coin: '<circle cx="12" cy="12" r="9"/><path d="M15 9c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .9-3 2.2 0 3 6 1.6 6 4.6 0 1.3-1.3 2.2-3 2.2-1.4 0-2.6-.6-3-1.6M12 6v1.5M12 16.5V18"/>',
    laptop: '<rect x="4" y="5" width="16" height="11" rx="1"/><path d="M2 19h20"/>',
    none: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  };
  const svg = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[k]}</svg>`;
  const Q = [
    {key: 'goal', q: 'Brezilya ile ilgili birincil hedefiniz nedir?', opts: [['vatandaslik', 'gov', 'Vatandaşlık almak'], ['ikamet', 'home', 'Yasal ikamet / CRNM'], ['sirket', 'build', 'Şirket kurmak'], ['cpf', 'id', 'Sadece CPF almak'], ['evlilik', 'ring', 'Brezilyalı ile evlenmek'], ['tasinma', 'plane', 'Taşınmayı planlamak']]},
    {key: 'status', q: 'Şu anda Brezilya ile durumunuz nedir?', opts: [['hic', 'flag', 'Kendi ülkemdeyim, hiç gitmedim'], ['kisa', 'loop', 'Kısa süre gidip döndüm'], ['turist', 'clock', 'Brezilya’da turistim'], ['vize', 'doc', 'Vizem var, ikamet etmek istiyorum'], ['ikamet', 'check', 'Halihazırda yasal ikametim var']]},
    {key: 'bond', q: 'Brezilya ile özel bir bağınız veya kaynağınız var mı?', opts: [['es', 'heart', 'Brezilyalı eş / partner'], ['cocuk', 'child', 'Brezilyalı çocuğum var'], ['is', 'brief', 'İş teklifi veya iş planı'], ['yatirim', 'coin', 'Yatırım sermayem var'], ['gelir', 'laptop', 'Uzaktan çalışma / emeklilik geliri'], ['yok', 'none', 'Hiçbiri']]},
  ];
  const A = {};
  let step = 0, results = null, email = '';

  // ---- scoring ------------------------------------------------------------
  function analyse({goal, status, bond}) {
    const resident = status === 'ikamet', abroad = ['hic', 'kisa'].includes(status), family = ['es', 'cocuk'].includes(bond);
    const list = [];
    const add = (o, score, cond = true) => { if (cond) list.push({...o, score: Math.max(5, Math.min(99, Math.round(score)))}); };
    add({id: 'cpf', icon: 'id', title: 'CPF alma', time: 'genellikle birkaç iş günü', link: '/iletisim/', desc: 'Brezilya’daki banka, kira, şirket ve resmi işlemlerin temeli. Yurt dışından da başvurulabilir.', steps: ['Receita Federal online formunu doldurun veya konsolosluğa başvurun', 'Pasaport ve adres bilgilerinizi ekleyin', 'CPF numaranızı alıp “Regular” durumunu kontrol edin']}, resident ? 55 : goal === 'cpf' ? 99 : 92);
    add({id: 'ikamet', icon: 'home', title: 'Oturum izni → CRNM', time: 'genellikle birkaç ay', link: '/brezilya-oturum-izni/', desc: 'Brezilya’da yasal olarak yaşamak için size uygun oturum türünü belirleyip başvurunuzu hazırlayın.', steps: ['Uygun oturum / vize türünü belirleyin', 'Belgeleri apostil ve tercümeyle hazırlayın', 'Brezilya’da Federal Polis kaydını (CRNM) tamamlayın']}, resident ? 25 : (status === 'vize' ? 88 : status === 'turist' ? 66 : 74) + (['is', 'yatirim', 'gelir'].includes(bond) ? 8 : 0) + (goal === 'ikamet' || goal === 'tasinma' ? 8 : 0));
    add({id: 'aile', icon: 'heart', title: 'Aile birleşimi oturumu', time: 'genellikle birkaç ay', link: '/brezilya-oturum-izni/', desc: 'Brezilyalı eş, partner veya çocuk üzerinden oturum. Aile bağının belgelenmesi ve davet eden kişinin statüsü incelenir.', steps: ['Evlilik / união estável veya doğum belgelerini hazırlayın', 'Apostil ve yeminli tercümeyi tamamlayın', 'Aile birleşimi başvurusu ve CRNM kaydı']}, resident ? 45 : 90, family);
    add({id: 'evlilik', icon: 'ring', title: 'Evlilik / união estável', time: 'belge hazırlığına göre', link: '/brezilya-oturum-izni/', desc: 'Brezilya’da evlilik veya união estável kaydı; ardından aile birleşimi yoluyla oturum.', steps: ['Medeni durum ve doğum belgelerini apostillettirin', 'Cartório’da evlilik veya união estável kaydı', 'Aile birleşimi oturumuna geçiş']}, goal === 'evlilik' ? 80 + (bond === 'es' ? 8 : 0) : resident ? 35 : 66, goal === 'evlilik' || bond === 'es');
    add({id: 'sirket', icon: 'build', title: 'Şirket kurulumu (LTDA)', time: 'genellikle 2–4 hafta', link: '/brezilyada-sirket-kurma/', desc: 'Yurt dışından vekaletle de kurulabilir. Şirket tek başına oturum hakkı sağlamaz; oturum ayrıca planlanır.', steps: ['Faaliyet konusu (CNAE) ve şirket türünü seçin', 'CPF, vekaletname ve ticari adresi hazırlayın', 'Kayıt, CNPJ, banka hesabı ve muhasebe kurulumu']}, (goal === 'sirket' ? 86 : 50) + (['is', 'yatirim'].includes(bond) ? 8 : 0), goal === 'sirket' || ['is', 'yatirim'].includes(bond));
    add({id: 'yatirim', icon: 'coin', title: 'Yatırımcı oturumu', time: 'genellikle birkaç ay', link: '/brezilyada-sirket-kurma/', desc: 'Şirket veya gayrimenkul yatırımıyla oturum. Asgari tutar ve şartlar güncel mevzuata göre kontrol edilir.', steps: ['Yatırım türünü ve tutarını netleştirin', 'Sermaye transferi ve Banco Central kaydı', 'Yatırımcı oturumu başvurusu']}, 72 + (goal === 'sirket' || goal === 'ikamet' ? 6 : 0), bond === 'yatirim');
    add({id: 'gelir', icon: 'laptop', title: 'Dijital göçebe / emekli oturumu', time: 'genellikle birkaç ay', link: '/brezilya-oturum-izni/', desc: 'Yurt dışı kaynaklı düzenli gelirle oturum seçenekleri. Gelir eşiği ve kanıt belgeleri güncel kurallara göre değerlendirilir.', steps: ['Gelir belgelerini (sözleşme, banka dökümü) hazırlayın', 'Konsolosluk veya Brezilya’da başvuru yolunu seçin', 'CRNM kaydını tamamlayın']}, 74 + (abroad ? 4 : 0), bond === 'gelir' && !resident);
    add({id: 'vatandaslik', icon: 'gov', title: family && resident ? 'Vatandaşlık (süre indirimli)' : 'Olağan vatandaşlık', time: resident ? (family ? 'en az 1 yıl ikamet' : '4 yıl ikamet') : '4+ yıl hazırlık', link: '/brezilya-vatandasligi/', desc: resident ? (family ? 'Brezilyalı eş veya çocuk ikamet şartını en az 1 yıla indirebilir. Portekizce yeterlilik ve adli sicil kontrolü gerekir.' : 'Olağan vatandaşlık için 4 yıl ikamet, Portekizce yeterlilik ve temiz adli sicil gerekir.') : 'Önce yasal ikamet edinmeniz gerekiyor; vatandaşlık uzun vadeli hedef olarak planlanır.', steps: resident ? ['İkamet sürenizi ve CRNM tarihlerinizi kontrol edin', 'Portekizce yeterlilik belgesi (CELPE-Bras vb.)', 'Adli sicil ve gelir belgeleriyle başvuru'] : ['Önce uygun oturum iznini alın', 'Yasal ikamet sürenizi tamamlayın', 'Portekizce öğrenin ve vergi kayıtlarınızı düzenli tutun']}, resident ? (family ? 78 : 58) + (goal === 'vatandaslik' ? 6 : 0) : (family ? 32 : 18) + (goal === 'vatandaslik' ? 6 : 0));
    add({id: 'tasinma', icon: 'plane', title: 'Taşınma yol haritası', time: 'kişisel planlama', link: '/kaynaklar/', desc: 'Şehir seçimi, konut, okul, sağlık (SUS) ve bütçe planıyla birlikte adım adım taşınma planı.', steps: ['Şehir ve yaşam bütçesi planı', 'Belge ve oturum takvimi', 'Varış sonrası ilk 30 gün kontrol listesi']}, 76, goal === 'tasinma');
    const GOAL = {vatandaslik: 'vatandaslik', ikamet: 'ikamet', sirket: 'sirket', cpf: 'cpf', evlilik: 'evlilik', tasinma: 'tasinma'}[goal];
    list.forEach(o => { if (o.id === GOAL) o.score = Math.min(99, o.score + 8); });
    list.sort((a, b) => b.score - a.score);
    return list.slice(0, 3).map(r => ({...r, cat: r.score >= 70 ? 'now' : r.score >= 40 ? 'soon' : 'long'}));
  }
  const CAT = {now: 'Hemen başvurulabilir', soon: 'Yakında uygun', long: 'Uzun vadeli hedef'};

  // ---- rendering ----------------------------------------------------------
  const body = $('#uq-body'), prog = $('#uq-prog');
  const setProg = n => prog.innerHTML = [0, 1, 2].map(i => `<i class="${i < n ? 'on' : ''}"></i>`).join('');
  function renderQ() {
    const q = Q[step]; setProg(step + 1);
    body.innerHTML = `<p class="uq-q">Soru ${step + 1}/3: ${esc(q.q)}</p><div class="uq-opts">${q.opts.map(([v, ic, t]) => `<button type="button" class="uq-opt ${A[q.key] === v ? 'sel' : ''}" data-v="${v}">${svg(ic)}<span>${esc(t)}</span></button>`).join('')}</div><div class="uq-foot">${step ? '<button class="uq-back" type="button">← Geri</button>' : '<span>Yaklaşık 1 dakika</span>'}<span>${step + 1} / 3</span></div>`;
  }
  const TERMS = 'Sonuçlarınızı ve kişisel yol haritanızı e-posta adresinize göndermemize, Brezilya göç, oturum ve şirket kurulumu konularında bilgilendirme e-postaları almanıza izin verirsiniz. Yanıtlarınız yalnızca size uygun hizmeti önermek ve danışmanlarımızın sizinle iletişime geçmesi için kullanılır; üçüncü kişilerle paylaşılmaz. Dilediğiniz an e-postadaki bağlantıdan veya bize yazarak abonelikten çıkabilirsiniz.';
  function renderGate() {
    setProg(3);
    body.innerHTML = `<form class="uq-gate" id="uq-gate"><span class="icon">${svg('target')}</span><h3>Analiziniz hazır!</h3><p>Size en uygun 3 seçeneği gösterebilmemiz için e-posta adresinizi girin.</p>
      <label>Adınız (isteğe bağlı)<input type="text" name="name" autocomplete="given-name" maxlength="100"></label>
      <label>E-posta adresiniz<input type="email" name="email" required autocomplete="email" value="${esc(email)}"></label>
      <label class="uq-check"><input type="checkbox" name="consent" required> <span>Abonelik koşullarını okudum, onaylıyorum. <button type="button" id="uq-terms-btn">Koşulları göster</button></span></label>
      <div class="uq-terms" id="uq-terms" hidden>${esc(TERMS)}</div>
      <p class="uq-err" id="uq-err"></p>
      <button class="uq-btn" type="submit" disabled>Sonuçlarımı göster →</button>
      <div class="uq-foot"><button class="uq-back" type="button">← Geri</button><span>3 / 3</span></div></form>`;
    const f = $('#uq-gate'), btn = f.querySelector('.uq-btn');
    const sync = () => btn.disabled = !(f.email.checkValidity() && f.email.value && f.consent.checked);
    f.addEventListener('input', sync); f.addEventListener('change', sync);
    $('#uq-terms-btn').onclick = () => { $('#uq-terms').hidden = !$('#uq-terms').hidden; };
    f.onsubmit = async e => {
      e.preventDefault(); btn.disabled = true; $('#uq-err').textContent = '';
      email = f.email.value.trim();
      results = analyse(A);
      try {
        const r = await fetch('/api/auth/lead', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email, name: f.name.value, consent: true, consentText: TERMS.slice(0, 300), answers: A, results: results.map(x => ({id: x.id, title: x.title, score: x.score}))})});
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || 'Kaydedilemedi, lütfen tekrar deneyin.');
        try { sessionStorage.setItem('bm-uq', JSON.stringify({A, email})); } catch {}
        renderResults();
      } catch (err) { $('#uq-err').textContent = err.message; btn.disabled = false; }
    };
  }
  let wa = null;
  fetch('/api/auth/config').then(r => r.json()).then(c => { wa = c.whatsapp; }).catch(() => {});
  function renderResults() {
    body.innerHTML = `<div class="uq-gate"><span class="icon">${svg('check')}</span><h3>Sonuçlarınız aşağıda</h3><p>Yanıtlarınıza göre size en uygun 3 seçeneği sıraladık.</p><button class="uq-restart" type="button" id="uq-restart">Testi yeniden başlat</button></div>`;
    const c = {now: 0, soon: 0, long: 0}; results.forEach(r => c[r.cat]++);
    const out = $('#uq-results'); out.hidden = false;
    out.innerHTML = `<div class="uq-res-top"><span class="icon">${svg('target')}</span><h2>Uygunluk analiziniz hazır!</h2><p>Durumunuza göre ${results.length} seçenek sıralandı. En yüksek puanlı seçenekler önce listelendi.</p></div>
      <div class="uq-sum"><div class="now"><b>${c.now}</b><span>Hemen başvurulabilir</span></div><div class="soon"><b>${c.soon}</b><span>Yakında uygun</span></div><div class="long"><b>${c.long}</b><span>Uzun vadeli</span></div></div>
      ${results.map(r => `<article class="uq-item ${r.cat}"><div class="uq-item-h"><span class="ic">${svg(r.icon)}</span><div><h3>${esc(r.title)}</h3><span class="uq-pill">${CAT[r.cat]}</span></div><div class="uq-score"><b>${r.score}</b><small>/100</small><span>⏱ ${esc(r.time)}</span></div></div><div class="uq-bar"><i style="width:${r.score}%"></i></div><p>${esc(r.desc)}</p><ol>${r.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol><a class="uq-btn dark" href="${r.link}">Detaylı rehberi görüntüle →</a></article>`).join('')}
      <div class="uq-cta"><h3>Kişisel Brezilya yol haritanızı alın</h3><p>Test sonuçlarınıza göre hazırlanmış adım adım planınızı e-posta ile ücretsiz alın; dilerseniz danışmanımızla görüşün.</p><div class="row"><button class="uq-btn white" type="button" id="uq-send">Yol haritamı gönder</button>${wa ? `<a class="uq-btn wa" href="https://wa.me/${wa}?text=${encodeURIComponent('Merhaba, ön değerlendirme sonucum: ' + results.map(r => r.title + ' ' + r.score + '/100').join(', '))}" target="_blank" rel="noopener">WhatsApp’tan danış</a>` : ''}<a class="uq-btn white" href="/giris/?kayit=1">Ücretsiz hesap oluştur</a></div><p class="msg" id="uq-msg"></p></div>
      <p class="uq-fine">Bu değerlendirme genel bilgilendirme amaçlıdır; hukuki uygunluk, onay ihtimali veya süre taahhüdü değildir. Puanlar verdiğiniz yanıtlara göre hesaplanan yönlendirme skorlarıdır. Kesin değerlendirme için OAB kayıtlı avukatlarımızla ücretsiz ön görüşme planlayın.</p>`;
    $('#uq-restart').onclick = () => { Object.keys(A).forEach(k => delete A[k]); step = 0; results = null; out.hidden = true; try { sessionStorage.removeItem('bm-uq'); } catch {} renderQ(); $('#uq-card').scrollIntoView({behavior: 'smooth', block: 'center'}); };
    $('#uq-send').onclick = async () => {
      const m = $('#uq-msg'), b = $('#uq-send'); b.disabled = true; m.textContent = 'Gönderiliyor…';
      try {
        const r = await fetch('/api/auth/lead', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email, consent: true, send: true, answers: A, results: results.map(x => ({id: x.id, title: x.title, score: x.score}))})});
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || 'Gönderilemedi.');
        m.textContent = d.mailSent ? `Yol haritanız ${email} adresine gönderildi.` : `Talebiniz alındı. Yol haritanız ${email} adresine danışmanımız tarafından iletilecek.`;
      } catch (err) { m.textContent = err.message; b.disabled = false; }
    };
    out.scrollIntoView({behavior: 'smooth', block: 'start'});
  }

  document.addEventListener('click', e => {
    const o = e.target.closest('.uq-opt');
    if (o && body.contains(o)) { A[Q[step].key] = o.dataset.v; if (step < 2) { step++; renderQ(); } else { step = 3; renderGate(); } return; }
    if (e.target.closest('.uq-back') && body.contains(e.target)) { step = Math.max(0, Math.min(step, 3) - 1); renderQ(); }
  });

  // deep links from service pages: /degerlendirme/?kategori=oturum|sirket|vatandaslik|evlilik
  const pre = {oturum: 'ikamet', sirket: 'sirket', vatandaslik: 'vatandaslik', evlilik: 'evlilik', lgbt: 'ikamet'}[new URLSearchParams(location.search).get('kategori')];
  let saved = null; try { saved = JSON.parse(sessionStorage.getItem('bm-uq') || 'null'); } catch {}
  if (saved?.A?.bond && saved.email) { Object.assign(A, saved.A); email = saved.email; results = analyse(A); step = 3; setProg(3); renderResults(); }
  else { if (pre) { A.goal = pre; step = 1; } renderQ(); }
})();
