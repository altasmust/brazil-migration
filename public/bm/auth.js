'use strict';
// Unified login, customer registration, e-mail verification, password set/reset and partner application.
(() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const params = new URLSearchParams(location.search);
  const next = (() => { const n = params.get('next'); return n && n.startsWith('/') && !n.startsWith('//') ? n : null; })();
  async function api(path, body) {
    const r = await fetch('/api/auth/' + path, body ? {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)} : {});
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(d.error || 'İşlem tamamlanamadı.'), {data: d});
    return d;
  }
  const msg = (el, type, html) => { el.className = 'bm-msg ' + type; el.innerHTML = html; };
  const devNote = d => d.devLink ? `<br><br><b>Test modu:</b> e-posta servisi henüz bağlı değil. Bağlantı: <a href="${esc(d.devLink)}">${esc(d.devLink)}</a>` : '';
  const busy = (form, on) => form.querySelectorAll('button').forEach(b => b.disabled = on);

  let cities = null;
  async function loadCities() { cities ??= await api('cities'); return cities; }
  async function fillLocation(form) {
    const c = form.querySelector('select[name=country]'), t = form.querySelector('select[name=city]');
    if (!c) return;
    const data = await loadCities();
    c.innerHTML = '<option value="">Ülke seçin</option>' + Object.keys(data.countries).map(k => `<option>${esc(k)}</option>`).join('');
    const fillCity = () => { t.innerHTML = '<option value="">Şehir seçin</option>' + (data.countries[c.value] || []).map(k => `<option>${esc(k)}</option>`).join(''); };
    c.addEventListener('change', fillCity); fillCity();
    const chips = form.querySelector('[data-services]');
    if (chips) chips.innerHTML = data.services.map(s => `<label><input type="checkbox" name="services" value="${esc(s)}"> ${esc(s)}</label>`).join('');
  }

  // ---------- /giris/ ----------
  const loginRoot = $('#bm-login');
  if (loginRoot) {
    const box = $('#bm-login-msg');
    const tabs = [...document.querySelectorAll('.bm-tabs [role=tab]')];
    const show = id => { tabs.forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === id))); document.querySelectorAll('[data-panel]').forEach(p => p.hidden = p.dataset.panel !== id); box.className = 'bm-msg'; box.innerHTML = ''; };
    tabs.forEach(t => t.addEventListener('click', () => show(t.dataset.tab)));
    document.addEventListener('click', e => { const b = e.target.closest('[data-goto]'); if (b) { e.preventDefault(); show(b.dataset.goto); } });
    fillLocation($('#bm-register'));

    const goHome = d => {
      const accs = d.accounts || [];
      const wanted = next && accs.find(a => next.startsWith(a.home));
      if (wanted || (next && accs.length === 1)) return location.href = next;
      if (accs.length > 1) {
        show('choose');
        $('#bm-choose').innerHTML = accs.map(a => `<a href="${esc(a.home)}">${esc(a.label)} <span>→</span></a>`).join('');
        return;
      }
      location.href = d.home || accs[0]?.home || '/panel/';
    };

    $('#bm-login-form').addEventListener('submit', async e => {
      e.preventDefault(); const f = e.target; busy(f, true);
      try { goHome(await api('login', {email: f.email.value, password: f.password.value})); }
      catch (err) {
        msg(box, 'err', esc(err.message) + (err.data?.unverified ? ' <button class="bm-link" id="bm-resend">Doğrulama e-postasını tekrar gönder</button>' : ''));
        const rb = $('#bm-resend'); if (rb) rb.onclick = async () => { const d = await api('resend', {email: f.email.value}); msg(box, 'ok', 'Doğrulama e-postası tekrar gönderildi.' + devNote(d)); };
      } finally { busy(f, false); }
    });
    $('#bm-register').addEventListener('submit', async e => {
      e.preventDefault(); const f = e.target;
      if (f.password.value !== f.password2.value) return msg(box, 'err', 'Şifreler eşleşmiyor.');
      busy(f, true);
      try {
        const d = await api('register', {name: f.name.value, email: f.email.value, phone: f.phone.value, country: f.country.value, city: f.city.value, password: f.password.value, consent: f.consent.checked, services: [...f.querySelectorAll('input[name=svc]:checked')].map(x => x.value), serviceNote: f.serviceNote?.value || ''});
        const mail = f.email.value; f.reset(); show('login');
        msg(box, 'ok', `Hesabınız oluşturuldu. <b>${esc(mail)}</b> adresinize gönderdiğimiz bağlantıyla e-postanızı doğrulayın, ardından giriş yapın.` + devNote(d));
      } catch (err) { msg(box, 'err', esc(err.message)); } finally { busy(f, false); }
    });
    $('#bm-forgot').addEventListener('submit', async e => {
      e.preventDefault(); const f = e.target; busy(f, true);
      try { const d = await api('forgot', {email: f.email.value}); msg(box, 'ok', 'Bu e-posta kayıtlıysa şifre belirleme bağlantısı gönderildi.' + devNote(d)); }
      catch (err) { msg(box, 'err', esc(err.message)); } finally { busy(f, false); }
    });
    $('#bm-reset').addEventListener('submit', async e => {
      e.preventDefault(); const f = e.target;
      if (f.password.value !== f.password2.value) return msg(box, 'err', 'Şifreler eşleşmiyor.');
      busy(f, true);
      try { await api('reset', {token: params.get('sifre'), password: f.password.value}); history.replaceState(null, '', '/giris/'); show('login'); msg(box, 'ok', 'Şifreniz kaydedildi. Şimdi giriş yapabilirsiniz.'); }
      catch (err) { msg(box, 'err', esc(err.message)); } finally { busy(f, false); }
    });

    (async () => {
      if (params.has('cikis')) { await api('logout', {}).catch(() => {}); history.replaceState(null, '', '/giris/'); msg(box, 'ok', 'Oturumunuz kapatıldı.'); return; }
      if (params.get('dogrula')) {
        try { await api('verify', {token: params.get('dogrula')}); msg(box, 'ok', 'E-posta adresiniz doğrulandı. Şimdi giriş yapabilirsiniz.'); }
        catch (err) { msg(box, 'err', esc(err.message)); }
        history.replaceState(null, '', '/giris/'); return;
      }
      if (params.get('sifre')) { show('reset'); return; }
      if (params.has('kayit')) { show('register'); return; }
      if (params.has('unuttum')) { show('forgot'); return; }
      const me = await api('me').catch(() => ({}));
      if (me.user && me.accounts?.length) { show('choose'); $('#bm-choose').innerHTML = me.accounts.map(a => `<a href="${esc(a.home)}">${esc(a.label)} <span>→</span></a>`).join('') + `<button class="bm-btn ghost" id="bm-logout">Çıkış yap (${esc(me.user.email)})</button>`; $('#bm-logout').onclick = async () => { await api('logout', {}); location.reload(); }; }
    })();
  }

  // ---------- /partner-ol/ ----------
  const pForm = $('#bm-partner-form');
  if (pForm) {
    const box = $('#bm-partner-msg');
    fillLocation(pForm);
    pForm.addEventListener('submit', async e => {
      e.preventDefault(); const f = pForm;
      if (f.password.value !== f.password2.value) return msg(box, 'err', 'Şifreler eşleşmiyor.');
      const services = [...f.querySelectorAll('input[name=services]:checked')].map(i => i.value);
      busy(f, true);
      try {
        const d = await api('partner-register', {company: f.company.value, name: f.name.value, email: f.email.value, phone: f.phone.value, website: f.website.value, country: f.country.value, city: f.city.value, taxOffice: f.taxOffice.value, taxNumber: f.taxNumber.value, services, password: f.password.value, consent: f.consent.checked});
        f.hidden = true;
        msg(box, 'ok', `<b>Başvurunuz alındı.</b> E-posta adresinizi doğruladıktan sonra <a href="/giris/">danışman girişinden</a> giriş yapın. Panelde Vergi Levhası, İmza Sirküsü ve kimliğinizin ön/arka yüzünü yükleyin; belgeleriniz otomatik kontrol edilip onaylandığında tüm modüller açılır.` + devNote(d));
        box.scrollIntoView({behavior: 'smooth', block: 'center'});
      } catch (err) { msg(box, 'err', esc(err.message)); } finally { busy(f, false); }
    });
  }
})();
