// Büyüme modülleri: müşteri yorumları, e-posta bülteni (ücretsiz rehber), paket fiyatları, istemci hata kaydı.
// Uydurma yorum YOK: yalnız müşterinin panelden yazdığı veya yöneticinin (izinli, kaynaklı) eklediği ve onayladığı yorumlar yayınlanır.
import {fail, clean, validEmail, now, uuid, siteUrl} from './auth.mjs';
import {sendMail} from './mail.mjs';
import {invalidateSite} from './site.mjs';

const json = (data, status = 200) => Response.json(data, {status, headers: {'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff'}});
const parse = s => { try { return JSON.parse(s || '{}') || {}; } catch { return {}; } };
const all = async (db, sql, ...a) => (await db.prepare(sql).bind(...a).all()).results || [];
const first = (db, sql, ...a) => db.prepare(sql).bind(...a).first();
const put = (db, id, kind, owner, data) => db.prepare('INSERT INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated=excluded.updated').bind(id, kind, owner, JSON.stringify(data), now(), now()).run();
const readBody = async req => { const t = await req.text(); if (t.length > 200000) fail(413, 'İstek çok büyük.'); try { return JSON.parse(t || '{}'); } catch { fail(400, 'Geçersiz istek.'); } };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const base = req => { try { return siteUrl(req).replace(/\/$/, ''); } catch { return 'https://brazilmigration.com'; } };

export const SERVICES = {oturum: 'Oturum izni', aile: 'Aile birleşimi', vatandaslik: 'Vatandaşlık', sirket: 'Şirket kuruluşu', vize: 'Vize', diger: 'Diğer'};
export const PRICE_KEYS = [
  ['oturum', 'Oturum İzni'], ['sirket-oturum', 'Şirket + Oturum'], ['vat-basvuru', 'Vatandaşlık Başvuru'], ['vat-tam', 'Vatandaşlık Tam Destek'],
  ['mei', 'Şirket · Başlangıç (MEI)'], ['ltda', 'Şirket · Standart (LTDA)'], ['sa', 'Şirket · Kurumsal (SA)'],
];

function cleanReview(b, admin) {
  const rating = Math.max(1, Math.min(5, Math.round(Number(b.rating) || 5)));
  const text = clean(b.text, 900).replace(/\s+/g, ' ');
  if (text.length < 20) fail(400, 'Yorum en az 20 karakter olmalı.');
  if (!b.consent) fail(400, admin ? 'Yorum sahibinin yayın iznini aldığınızı onaylayın.' : 'Yayınlanması için izin kutusunu işaretleyin.');
  return {rating, text, name: clean(b.name, 40) || 'Müşterimiz', city: clean(b.city, 40), service: SERVICES[b.service] ? b.service : 'diger', consent: true, consentAt: now()};
}
export async function publishedReviews(db, limit = 12) {
  return (await all(db, "SELECT id, data, created FROM items WHERE kind='review' AND json_extract(data,'$.status')='published' ORDER BY created DESC LIMIT ?", limit)).map(r => ({id: r.id, ...parse(r.data), created: r.created}));
}

// ---------- Herkese açık uçlar (/api/auth/...) ----------
export async function growthPublic(req, db, route) {
  if (route === 'subscribe' && req.method === 'POST') {
    const b = await readBody(req), email = clean(b.email, 254).toLowerCase();
    if (b.website) return json({ok: true}); // bot tuzağı
    if (!validEmail(email)) fail(400, 'Geçerli bir e-posta adresi girin.');
    if (!b.consent) fail(400, 'Devam etmek için onay kutusunu işaretleyin.');
    const id = 'sub-' + Buffer.from(email).toString('base64url').slice(0, 60);
    const old = parse((await first(db, 'SELECT data FROM items WHERE id=?', id))?.data);
    if (old.status === 'active') return json({ok: true, already: true});
    if (old.sentAt && now() - old.sentAt < 120000) return json({ok: true, pending: true});
    const token = old.token || uuid().replace(/-/g, '');
    await put(db, id, 'subscriber', 'owner', {...old, email, status: 'pending', token, source: clean(b.source, 60) || 'site', lang: 'tr', consentAt: now(), sentAt: now(), created: old.created || now()});
    const link = `${base(req)}/api/auth/subscribe/confirm?t=${token}`;
    await sendMail({to: email, subject: 'E-posta adresinizi onaylayın · Brazil Migration', title: 'Son bir adım', text: 'Ücretsiz “Brezilya’ya Taşınma Rehberi 2026” ve aylık göçmenlik haberleri için e-posta adresinizi onaylayın. Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.', link, button: 'Aboneliği onayla'}).catch(e => console.error('[subscribe]', e.message));
    return json({ok: true, pending: true});
  }
  if ((route === 'subscribe/confirm' || route === 'unsubscribe') && req.method === 'GET') {
    const t = clean(new URL(req.url).searchParams.get('t'), 64); if (!/^[a-f0-9]{20,64}$/.test(t)) return Response.redirect(base(req) + '/rehber/?durum=gecersiz', 302);
    const r = await first(db, "SELECT id, data FROM items WHERE kind='subscriber' AND json_extract(data,'$.token')=?", t);
    if (!r) return Response.redirect(base(req) + '/rehber/?durum=gecersiz', 302);
    const d = parse(r.data);
    if (route === 'unsubscribe') { await put(db, r.id, 'subscriber', 'owner', {...d, status: 'unsub', unsubAt: now()}); return Response.redirect(base(req) + '/rehber/?durum=ayrildi', 302); }
    if (d.status !== 'active') {
      await put(db, r.id, 'subscriber', 'owner', {...d, status: 'active', confirmedAt: now()});
      await sendMail({to: d.email, subject: 'Rehberiniz hazır · Brezilya’ya Taşınma Rehberi 2026', title: 'Hoş geldiniz!', text: 'Aboneliğiniz onaylandı. Rehberi aşağıdaki bağlantıdan okuyabilir veya PDF olarak kaydedebilirsiniz. Ayda en fazla bir-iki kez, Brezilya göçmenlik mevzuatındaki önemli değişiklikleri paylaşacağız. Dilediğiniz zaman tek tıkla ayrılabilirsiniz: ' + `${base(req)}/api/auth/unsubscribe?t=${d.token}`, link: base(req) + '/rehber/', button: 'Rehberi aç'}).catch(e => console.error('[subscribe]', e.message));
    }
    return Response.redirect(base(req) + '/rehber/?durum=onaylandi', 302);
  }
  if (route === 'errlog' && req.method === 'POST') { // istemci tarafı JS hataları (son 300)
    const b = await readBody(req).catch(() => ({}));
    const d = {msg: clean(b.msg, 300), src: clean(b.src, 200), line: Number(b.line) || 0, page: clean(b.page, 200), ua: clean(req.headers.get('user-agent'), 160), at: now()};
    if (!d.msg || /Script error\.?$|ResizeObserver loop|extension:\/\//i.test(d.msg + d.src)) return json({ok: true});
    const id = 'err-' + Buffer.from(d.msg + d.src + d.line).toString('base64url').slice(0, 48);
    const old = parse((await first(db, 'SELECT data FROM items WHERE id=?', id))?.data);
    await put(db, id, 'errlog', 'owner', {...d, count: (old.count || 0) + 1, firstAt: old.firstAt || d.at});
    return json({ok: true});
  }
  return null;
}

// ---------- Müşteri paneli (/api/workspace/...) ----------
export async function growthWorkspace(req, db, route, m) {
  if (route === 'testimonial' && req.method === 'GET') {
    const r = await first(db, "SELECT data FROM items WHERE kind='review' AND owner=?", m.id);
    return json({review: r ? parse(r.data) : null, services: SERVICES});
  }
  if (route === 'testimonial' && req.method === 'POST') {
    if (m.role !== 'customer') fail(403, 'Yalnız müşteriler yorum yazabilir.');
    const b = await readBody(req), d = cleanReview(b, false);
    const id = 'review-' + m.id, old = parse((await first(db, 'SELECT data FROM items WHERE id=?', id))?.data);
    await put(db, id, 'review', m.id, {...old, ...d, source: 'panel', email: m.email, status: 'pending', submittedAt: now()});
    await db.prepare('INSERT INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?)').bind(uuid(), 'notice', 'owner', JSON.stringify({text: 'Yeni müşteri yorumu onay bekliyor: ' + d.name, link: 'yorumlar'}), now(), now()).run().catch(() => {});
    return json({ok: true, review: {...d, status: 'pending'}});
  }
  return null;
}

// ---------- Yönetici (/api/platform/admin/...) ----------
export async function growthAdmin(req, db, route) {
  if (route === 'reviews' && req.method === 'GET') {
    const list = (await all(db, "SELECT id, owner, data, created FROM items WHERE kind='review' ORDER BY created DESC LIMIT 500")).map(r => ({id: r.id, owner: r.owner, ...parse(r.data), created: r.created}));
    return json({reviews: list, services: SERVICES});
  }
  if (route === 'reviews/save' && req.method === 'POST') {
    const b = await readBody(req);
    if (b.id) {
      const r = await first(db, "SELECT owner, data FROM items WHERE id=? AND kind='review'", b.id); if (!r) fail(404, 'Yorum bulunamadı.');
      const d = parse(r.data);
      if (b.status) { if (!['published', 'hidden', 'pending'].includes(b.status)) fail(400, 'Geçersiz durum.'); d.status = b.status; d.reviewedAt = now(); }
      if (b.reply !== undefined) d.reply = clean(b.reply, 500);
      if (b.text !== undefined) { const c = cleanReview({...d, ...b, consent: true}, true); Object.assign(d, c); }
      await put(db, b.id, 'review', r.owner, d); invalidateSite(); return json({ok: true});
    }
    const d = cleanReview(b, true);
    const src = clean(b.source, 60); if (!src) fail(400, 'Yorumun kaynağını yazın (ör. Google yorumu, e-posta, WhatsApp).');
    await put(db, 'review-' + uuid(), 'review', 'owner', {...d, source: src, status: b.publish ? 'published' : 'pending', manual: true, submittedAt: now()});
    invalidateSite(); return json({ok: true});
  }
  if (route === 'reviews/delete' && req.method === 'POST') { const b = await readBody(req); await db.prepare("DELETE FROM items WHERE id=? AND kind='review'").bind(clean(b.id, 80)).run(); invalidateSite(); return json({ok: true}); }

  if (route === 'subscribers' && req.method === 'GET') {
    const list = (await all(db, "SELECT id, data, created FROM items WHERE kind='subscriber' ORDER BY created DESC LIMIT 5000")).map(r => { const d = parse(r.data); return {id: r.id, email: d.email, status: d.status, source: d.source, created: d.created || r.created, confirmedAt: d.confirmedAt}; });
    const sent = (await all(db, "SELECT data, created FROM items WHERE kind='newsletter' ORDER BY created DESC LIMIT 20")).map(r => ({...parse(r.data), created: r.created}));
    return json({subscribers: list, counts: {active: list.filter(x => x.status === 'active').length, pending: list.filter(x => x.status === 'pending').length, unsub: list.filter(x => x.status === 'unsub').length}, sent});
  }
  if (route === 'subscribers/export' && req.method === 'GET') {
    const rowsC = (await all(db, "SELECT data FROM items WHERE kind='subscriber'")).map(r => parse(r.data)).filter(d => d.status === 'active');
    const csv = 'email,source,confirmed\n' + rowsC.map(d => [d.email, d.source || '', d.confirmedAt ? new Date(d.confirmedAt).toISOString() : ''].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    return new Response('﻿' + csv, {headers: {'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="aboneler.csv"', 'Cache-Control': 'no-store'}});
  }
  if (route === 'subscribers/delete' && req.method === 'POST') { const b = await readBody(req); await db.prepare("DELETE FROM items WHERE id=? AND kind='subscriber'").bind(clean(b.id, 90)).run(); return json({ok: true}); }
  if (route === 'newsletter/send' && req.method === 'POST') {
    const b = await readBody(req), subject = clean(b.subject, 140), text = String(b.text || '').trim().slice(0, 8000);
    if (subject.length < 4 || text.length < 20) fail(400, 'Konu ve en az 20 karakterlik metin girin.');
    const link = /^https:\/\//.test(clean(b.link, 400)) || /^\//.test(clean(b.link, 400)) ? clean(b.link, 400) : '';
    const to = b.test ? [{email: clean(b.test, 254), token: ''}] : (await all(db, "SELECT data FROM items WHERE kind='subscriber'")).map(r => parse(r.data)).filter(d => d.status === 'active');
    if (!to.length) fail(400, 'Onaylı abone yok.');
    let ok = 0, bad = 0;
    for (const s of to) {
      if (!validEmail(s.email)) { bad++; continue; }
      const un = s.token ? `\n\n—\nBu e-postayı Brazil Migration bültenine abone olduğunuz için aldınız. Ayrılmak için: ${base(req)}/api/auth/unsubscribe?t=${s.token}` : '\n\n(Test gönderimi)';
      try { await sendMail({to: s.email, subject, title: subject, text: text + un, ...(link ? {link: link.startsWith('/') ? base(req) + link : link, button: clean(b.button, 40) || 'Devamını oku'} : {})}); ok++; } catch { bad++; }
    }
    if (!b.test) await put(db, 'nl-' + uuid(), 'newsletter', 'owner', {subject, sent: ok, failed: bad, at: now()});
    return json({ok: true, sent: ok, failed: bad});
  }

  if (route === 'settings/prices' && req.method === 'GET') { const r = await first(db, "SELECT data FROM items WHERE id='config-prices'"); return json({prices: parse(r?.data), keys: PRICE_KEYS}); }
  if (route === 'settings/prices' && req.method === 'POST') {
    const b = await readBody(req), d = {};
    for (const [k] of PRICE_KEYS) d[k] = clean(b[k], 40);
    d.note = clean(b.note, 200); d.currency = clean(b.currency, 8);
    await put(db, 'config-prices', 'config', 'owner', d); invalidateSite(); return json({ok: true, prices: d});
  }
  if (route === 'errlog' && req.method === 'GET') return json({errors: (await all(db, "SELECT data FROM items WHERE kind='errlog' ORDER BY updated DESC LIMIT 100")).map(r => parse(r.data))});
  if (route === 'errlog/clear' && req.method === 'POST') { await db.prepare("DELETE FROM items WHERE kind='errlog'").run(); return json({ok: true}); }
  return null;
}

// ---------- Sitede gösterim ----------
const stars = n => '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
export function reviewsHTML(list, opts = {}) {
  if (!list?.length) return '';
  const cards = list.slice(0, opts.limit || 6).map(r => `<figure class="rv-card"><div class="rv-stars" aria-label="${r.rating} / 5">${stars(r.rating)}</div><blockquote>“${esc(r.text)}”</blockquote>${r.reply ? `<p class="rv-reply"><b>Yanıtımız:</b> ${esc(r.reply)}</p>` : ''}<figcaption><span class="rv-av">${esc((r.name || 'M')[0].toUpperCase())}</span><span><b>${esc(r.name)}</b><small>${esc([SERVICES[r.service], r.city].filter(Boolean).join(' · '))}</small></span></figcaption></figure>`).join('');
  return `<section class="rv-sec" aria-labelledby="rv-h"><div class="wrap"><div class="kicker">MÜŞTERİ DENEYİMLERİ</div><h2 id="rv-h">Müşterilerimiz ne diyor?</h2><p class="rv-note">Yorumlar, müşterilerimizin izniyle ve kendi ifadeleriyle yayınlanır. Her dosya kendine özgüdür; geçmiş sonuçlar gelecekteki sonuçların garantisi değildir.</p><div class="rv-grid">${cards}</div></div></section>`;
}
export function subscribeHTML(path) {
  return `<section class="nl-sec" aria-labelledby="nl-h"><div class="wrap nl-in"><div class="nl-txt"><span class="nl-tag">ÜCRETSİZ REHBER</span><h2 id="nl-h">Brezilya’ya Taşınma Rehberi 2026</h2><p>Oturum yolları, gerekli belgeler, apostil ve tercüme, ilk 30 günde yapılacaklar ve sık yapılan hatalar tek rehberde. Ayrıca mevzuat değiştiğinde kısa bir e-posta.</p></div>
  <form class="nl-form" data-nl novalidate><label class="sr-only" for="nl-e">E-posta adresiniz</label><div class="nl-row"><input id="nl-e" name="email" type="email" required autocomplete="email" placeholder="E-posta adresiniz"><button class="btn" type="submit">Rehberi gönder</button></div>
  <input type="text" name="website" tabindex="-1" autocomplete="off" class="nl-hp" aria-hidden="true"><input type="hidden" name="source" value="${esc(path)}">
  <label class="nl-ok"><input type="checkbox" name="consent" required> <span>Rehberin ve ara sıra bilgilendirme e-postalarının gönderilmesini kabul ediyorum. <a href="/kvkk-aydinlatma-metni/">Aydınlatma metni</a> · Dilediğiniz zaman tek tıkla ayrılabilirsiniz.</span></label><p class="nl-msg" role="status" aria-live="polite"></p></form></div></section>`;
}
