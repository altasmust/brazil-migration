// Unified login, registration, partner onboarding, admin account management and panel modules.
import {
  OWNER_EMAIL, now, uuid, fail, clean, validEmail, hashPassword, checkPassword, passwordOk, PASSWORD_RULE,
  createSession, currentUser, destroySession, createToken, useToken, siteUrl, adminUrl, isAdminRequest, adminHosts, sha,
  createImpersonationSession, isImpersonated,
} from './auth.mjs';
import {sendMail, mailConfigured} from './mail.mjs';
import {CITIES, locate, fromRequest, distanceKm} from './geo.mjs';
import {PARTNER_DOCS, verifyPartner, verifyCustomerDocument, verifierConfigured} from './verify.mjs';

export const PERMS = ['customers', 'applications', 'documents', 'kyc', 'finance', 'support', 'referrals', 'team', 'audit'];
export const PERM_LABELS = {customers: 'Müşteriler', applications: 'Başvurular', documents: 'Belgeler', kyc: 'KYC / Kimlik', finance: 'Finans', support: 'Destek', referrals: 'Referanslar', team: 'Ekip', audit: 'Denetim kaydı'};
const DEFAULT_PERMS = {
  advisor: {customers: 2, applications: 2, documents: 2, kyc: 2, finance: 1, support: 2, referrals: 2, team: 2, audit: 1},
  accountant: {customers: 1, applications: 1, documents: 1, kyc: 0, finance: 2, support: 1, referrals: 0, team: 0, audit: 1},
  other: {customers: 1, applications: 1, documents: 1, kyc: 0, finance: 0, support: 1, referrals: 0, team: 0, audit: 0},
};
export const ACCOUNT_TYPES = {customer: 'Müşteri', advisor: 'Danışman', lawyer: 'Avukat', accountant: 'Muhasebeci', other: 'Diğer'};
export const PARTNER_SERVICES = ['Oturum İzni', 'Vatandaşlık', 'Evlilik / União Estável', 'Şirket Kurulumu', 'Vize', 'Aile Birleşimi'];
export const PANELS = {customer: 'Müşteri paneli', partner: 'Danışman / partner paneli', staff: 'Muhasebe & diğer personel', lawyer: 'Avukat paneli'};

const json = (data, status = 200, headers = {}) => Response.json(data, {status, headers: {'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', ...headers}});
const parse = s => { try { return JSON.parse(s); } catch { return {}; } };
const q = (db, s, ...v) => db.prepare(s).bind(...v);
const one = (db, s, ...v) => q(db, s, ...v).first();
const rows = async (db, s, ...v) => (await q(db, s, ...v).all()).results;
const getItem = async (db, id) => { const r = await one(db, 'SELECT * FROM items WHERE id=?', id); return r ? {...r, data: parse(r.data)} : null; };
const putItem = (db, id, kind, owner, data) => q(db, 'INSERT INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated=excluded.updated', id, kind, owner, JSON.stringify(data), now(), now());
const notice = (db, owner, title, link) => q(db, 'INSERT INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?)', uuid(), 'notice', owner, JSON.stringify({title, link, read: false}), now(), now());
const audit = (db, actor, action, target) => q(db, 'INSERT INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?)', uuid(), 'audit', 'owner', JSON.stringify({actor, action, target}), now(), now());
async function body(req) {
  const t = await req.text(); if (t.length > 60000) fail(413, 'İstek çok büyük.');
  try { return t ? JSON.parse(t) : {}; } catch { fail(400, 'Geçersiz istek.'); }
}
function sameOrigin(req) {
  const o = req.headers.get('origin'); if (!o) return;
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (new URL(o).host !== host) fail(403, 'Geçersiz istek kaynağı.');
}
const insertPerson = (db, p) => q(db, 'INSERT INTO people VALUES(?,?,?,?,?,?,?,?,?,?,?,?)', p.id, p.uid, p.email, p.name, p.role, p.manager, JSON.stringify(p.permissions || {}), JSON.stringify(p.scope ?? 'all'), p.status || 'active', p.advisor ?? null, p.source ?? null, now());

// ---- shared lookups -------------------------------------------------------
export async function accountsFor(db, user) {
  const people = await rows(db, 'SELECT * FROM people WHERE uid=?', user.id);
  const law = await rows(db, 'SELECT * FROM law_accounts WHERE uid=? OR (uid IS NULL AND email=?)', user.id, user.email);
  const out = [];
  for (const p of people) {
    if (p.role === 'customer') out.push({panel: 'customer', home: '/panel/', label: 'Müşteri paneli', status: p.status});
    else if (p.role === 'advisor' || p.role === 'employee') {
      const meta = await getItem(db, 'meta-' + p.id);
      out.push({panel: meta?.data.type === 'accountant' || meta?.data.type === 'other' ? 'staff' : 'partner', home: '/partner/', label: meta?.data.type === 'accountant' ? 'Muhasebe paneli' : meta?.data.type === 'other' ? 'Personel paneli' : 'Danışman paneli', status: p.status, person: p.id});
    }
  }
  for (const a of law) if (a.status === 'active') out.push({panel: 'lawyer', home: '/avukat/', label: 'Avukat paneli', status: a.status});
  return out;
}
export async function partnerState(db, personId) {
  const p = await getItem(db, 'partner-' + personId);
  return p ? p.data : null;
}
async function nearestAdvisor(db, loc) {
  const advisors = await rows(db, "SELECT id FROM people WHERE role='advisor' AND status='active'");
  let best = null;
  for (const a of advisors) {
    const ps = await partnerState(db, a.id);
    if (ps && ps.status !== 'approved') continue;
    const meta = await getItem(db, 'meta-' + a.id);
    if (!meta?.data.lat && meta?.data.lat !== 0) continue;
    if (!loc) continue;
    const d = distanceKm(loc, meta.data);
    if (!best || d < best.d) best = {id: a.id, d};
  }
  return best;
}

async function sendVerify(db, req, user, name) {
  const token = await createToken(db, user.id, 'verify', 48);
  const link = `${siteUrl(req)}/giris/?dogrula=${token}`;
  return sendMail({to: user.email, subject: 'E-posta adresinizi doğrulayın', title: 'Hoş geldiniz' + (name ? ', ' + name : ''), text: 'Brazil Migration hesabınızı etkinleştirmek için e-posta adresinizi doğrulayın. Bağlantı 48 saat geçerlidir.', link, button: 'E-postamı doğrula'});
}
async function sendInvite(db, req, user, name, typeLabel) {
  const token = await createToken(db, user.id, 'invite', 7 * 24);
  const link = `${siteUrl(req)}/giris/?sifre=${token}`;
  return sendMail({to: user.email, subject: 'Brazil Migration hesabınız oluşturuldu', title: 'Merhaba ' + name, text: `${typeLabel} hesabınız oluşturuldu. Aşağıdaki bağlantıdan şifrenizi belirleyip giriş yapabilirsiniz. Bağlantı 7 gün geçerlidir.`, link, button: 'Şifremi belirle'});
}
async function newAuthUser(db, email, password, verified) {
  if (await one(db, 'SELECT id FROM auth_users WHERE email=?', email)) fail(409, 'Bu e-posta ile zaten bir hesap var. Giriş yapın veya şifrenizi sıfırlayın.');
  const id = uuid(); let salt = null, hash = null;
  if (password) ({salt, hash} = await hashPassword(password));
  await q(db, 'INSERT INTO auth_users VALUES(?,?,?,?,?,?,?,?)', id, email, hash, salt, verified ? 1 : 0, 0, 0, now()).run();
  return {id, email};
}
function readLocation(b, req) {
  const country = clean(b.country, 60), city = clean(b.city, 80);
  const l = country ? locate(country, city) : null;
  return l || fromRequest(req);
}

// ---- /api/auth/* (public) -------------------------------------------------
export async function handleAuth(req, env, route) {
  const db = env.DB;
  route = route.replace(/^admin\//, '');
  if (req.method !== 'GET') sameOrigin(req);
  if (route === 'cities' && req.method === 'GET') return json({countries: Object.fromEntries(Object.entries(CITIES).map(([k, v]) => [k, Object.keys(v)])), services: PARTNER_SERVICES});
  if (route === 'config' && req.method === 'GET') return json({mail: mailConfigured(), verifier: verifierConfigured(), adminSeparate: adminHosts().length > 0, whatsapp: (process.env.WHATSAPP_NUMBER || '').replace(/\D/g, '') || null});

  if (route === 'me' && req.method === 'GET') {
    const u = await currentUser(db, req); if (!u) return json({user: null});
    const accounts = isAdminRequest(req) ? [{panel: 'admin', home: '/admin/', label: 'Yönetim paneli'}] : await accountsFor(db, u);
    const pm = isAdminRequest(req) ? null : await one(db, "SELECT i.data FROM items i JOIN people p ON i.owner=p.id WHERE p.uid=? AND i.kind='account_meta' LIMIT 1", u.id);
    const imp = isAdminRequest(req) ? false : await isImpersonated(db, req);
    return json({user: {email: u.email, country: pm ? parse(pm.data).country || '' : '', impersonated: imp}, accounts});
  }
  if (route === 'impersonate' && req.method === 'GET') {
    if (isAdminRequest(req)) fail(404, 'İşlem bulunamadı.');
    const t = await useToken(db, new URL(req.url).searchParams.get('t'), ['impersonate']);
    const u = await one(db, 'SELECT * FROM auth_users WHERE id=?', t.user); if (!u || u.email === OWNER_EMAIL()) fail(400, 'Hesap bulunamadı.');
    const accounts = await accountsFor(db, u); if (!accounts.length) fail(403, 'Bu kişinin aktif bir panel hesabı yok.');
    const cookie = await createImpersonationSession(db, req, u.id, OWNER_EMAIL());
    return new Response(null, {status: 302, headers: {Location: accounts[0].home, 'Set-Cookie': cookie, 'Cache-Control': 'no-store'}});
  }
  if (route === 'logout' && req.method === 'POST') return json({ok: true}, 200, {'Set-Cookie': await destroySession(db, req)});

  const b = req.method === 'GET' ? {} : await body(req);

  if (route === 'register' && req.method === 'POST') { // customer self-registration
    const email = clean(b.email, 254).toLowerCase(), name = clean(b.name, 100);
    if (name.length < 2 || !validEmail(email)) fail(400, 'Ad soyad ve geçerli bir e-posta girin.');
    if (email === OWNER_EMAIL()) fail(400, 'Bu e-posta yönetici hesabına ayrılmıştır.');
    if (!passwordOk(b.password)) fail(400, PASSWORD_RULE);
    if (!b.consent) fail(400, 'Devam etmek için KVKK / gizlilik metnini onaylayın.');
    const user = await newAuthUser(db, email, b.password, false);
    const loc = readLocation(b, req);
    // Referral link has priority, otherwise the nearest active advisor, otherwise head office.
    let advisor = 'owner', source = null, reason = 'Merkez ofis';
    const code = (req.headers.get('cookie') || '').match(/(?:^|; )bm_ref=([a-f0-9-]+)/)?.[1];
    const ref = code ? await getItem(db, code) : null;
    if (ref?.kind === 'ref' && ref.data.active && await one(db, "SELECT id FROM people WHERE id=? AND status='active'", ref.owner)) { advisor = ref.owner; source = ref.id; reason = 'Referans bağlantısı'; }
    else { const near = await nearestAdvisor(db, loc); if (near) { advisor = near.id; reason = `En yakın danışman (~${Math.round(near.d)} km)`; } }
    const pid = uuid();
    await db.batch([
      insertPerson(db, {id: pid, uid: user.id, email, name, role: 'customer', manager: 'owner', permissions: {}, scope: 'all', advisor, source}),
      putItem(db, 'meta-' + pid, 'account_meta', pid, {type: 'customer', phone: clean(b.phone, 40), country: loc?.country || clean(b.country, 60), city: loc?.city || clean(b.city, 80), lat: loc?.lat ?? null, lng: loc?.lng ?? null, assignedBy: reason}),
      putItem(db, 'profile-' + pid, 'profile', pid, {name, phone: clean(b.phone, 40), address: [loc?.city, loc?.country].filter(Boolean).join(', ')}),
      notice(db, advisor, 'Yeni müşteri kaydı: ' + name + ' (' + reason + ')', 'customers'),
    ]);
    const mail = await sendVerify(db, req, user, name);
    return json({ok: true, verifyRequired: true, mailSent: mail.sent, devLink: mail.devLink});
  }

  if (route === 'partner-register' && req.method === 'POST') {
    const email = clean(b.email, 254).toLowerCase(), name = clean(b.name, 100), company = clean(b.company, 200);
    if (name.length < 2 || company.length < 2 || !validEmail(email)) fail(400, 'Firma unvanı, yetkili adı ve geçerli e-posta gerekli.');
    if (email === OWNER_EMAIL()) fail(400, 'Bu e-posta yönetici hesabına ayrılmıştır.');
    if (!passwordOk(b.password)) fail(400, PASSWORD_RULE);
    if (!b.consent) fail(400, 'Partnerlik koşullarını onaylayın.');
    const services = (Array.isArray(b.services) ? b.services : []).filter(s => PARTNER_SERVICES.includes(s));
    if (!services.length) fail(400, 'Vereceğiniz en az bir hizmeti seçin.');
    const loc = readLocation(b, req);
    if (!loc?.country) fail(400, 'Ülke ve şehir seçin.');
    const user = await newAuthUser(db, email, b.password, false);
    const pid = uuid();
    await db.batch([
      insertPerson(db, {id: pid, uid: user.id, email, name, role: 'advisor', manager: pid, permissions: DEFAULT_PERMS.advisor, scope: 'all'}),
      putItem(db, 'meta-' + pid, 'account_meta', pid, {type: 'advisor', partner: true, company, phone: clean(b.phone, 40), website: clean(b.website, 200), country: loc.country, city: loc.city, lat: loc.lat, lng: loc.lng}),
      putItem(db, 'profile-' + pid, 'profile', pid, {name, company, phone: clean(b.phone, 40), taxOffice: clean(b.taxOffice, 120), taxNumber: clean(b.taxNumber, 20), address: [loc.city, loc.country].join(', ')}),
      putItem(db, 'partner-' + pid, 'partner', pid, {status: 'docs_required', company, name, email, taxOffice: clean(b.taxOffice, 120), taxNumber: clean(b.taxNumber, 20), services, docs: {}, history: [{at: now(), text: 'Başvuru oluşturuldu'}]}),
      notice(db, 'owner', 'Yeni partner başvurusu: ' + company, 'partners'),
    ]);
    const mail = await sendVerify(db, req, user, name);
    return json({ok: true, verifyRequired: true, mailSent: mail.sent, devLink: mail.devLink});
  }

  if (route === 'booking' && req.method === 'POST') { // 15-min free call → Google Meet link by e-mail
    const email = clean(b.email, 254).toLowerCase(), name = clean(b.name, 70);
    if (name.length < 2 || !validEmail(email)) fail(400, 'Ad ve geçerli bir e-posta girin.');
    if (!b.consent) fail(400, 'Devam etmek için onay kutusunu işaretleyin.');
    const date = clean(b.date, 10), time = clean(b.time, 5), tz = String(b.timezone || '').includes('Sao_Paulo') ? 'America/Sao_Paulo' : 'Europe/Istanbul';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) fail(400, 'Gün ve saat seçin.');
    const offset = tz === 'America/Sao_Paulo' ? -3 : 3;
    const start = Date.parse(`${date}T${time}:00Z`) - offset * 36e5;
    if (!Number.isFinite(start) || start < now() - 36e5 || start > now() + 366 * 864e5) fail(400, 'Gelecek bir tarih seçin.');
    const recent = await one(db, "SELECT COUNT(*) AS n FROM items WHERE kind='booking' AND json_extract(data,'$.email')=? AND created>?", email, now() - 864e5);
    if ((recent?.n || 0) >= 3) fail(429, 'Bugün için yeterli talep aldık; ekibimiz sizinle iletişime geçecek.');
    const cfg = (await getItem(db, 'integration-meet'))?.data || {};
    let meet = cfg.active !== false && /^https:\/\/meet\.google\.com\/[a-z0-9-]+$/i.test(cfg.link || '') ? cfg.link : '';
    const id = uuid(), booking = {name, email, phone: clean(b.phone, 40), service: clean(b.service, 120), package: clean(b.package, 160), note: clean(b.note, 1000), date, time, timezone: tz, start, status: 'Planlandı'};
    if (cfg.mode === 'webhook' && /^https:\/\//.test(cfg.webhook || '')) {
      try {
        const r = await fetch(cfg.webhook, {method: 'POST', headers: {'Content-Type': 'application/json', ...(cfg.secret ? {'X-BM-Secret': cfg.secret} : {})}, body: JSON.stringify({id, ...booking, startISO: new Date(start).toISOString(), endISO: new Date(start + 15 * 6e4).toISOString(), title: '15 dk ön görüşme · ' + name}), signal: AbortSignal.timeout(10000)});
        const d = await r.json().catch(() => ({}));
        const link = String(d.meetLink || d.hangoutLink || d.link || '');
        if (r.ok && /^https:\/\/meet\.google\.com\//.test(link)) meet = link;
      } catch (e) { console.error('[meet-webhook]', e.message); }
    }
    booking.meet = meet;
    const fmt = new Date(start).toLocaleString('tr-TR', {timeZone: tz, dateStyle: 'long', timeStyle: 'short'});
    const gstamp = t => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const cal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Brazil Migration · 15 dk ön görüşme')}&dates=${gstamp(start)}/${gstamp(start + 15 * 6e4)}&details=${encodeURIComponent(meet ? 'Google Meet: ' + meet : 'Toplantı linki e-postayla iletilecek.')}`;
    const text = meet ? `Ön görüşmeniz ${fmt} (${tz === 'America/Sao_Paulo' ? 'São Paulo' : 'Türkiye'} saati) için planlandı. Aşağıdaki Google Meet bağlantısıyla katılabilirsiniz: ${meet}` : `Ön görüşme talebiniz ${fmt} için alındı. Toplantı bağlantınız kısa süre içinde e-postanıza iletilecek.`;
    const mail = await sendMail({to: email, subject: 'Ön görüşmeniz: ' + fmt, title: 'Merhaba ' + name.split(' ')[0] + ',', text: text + ' Takviminize eklemek için: ' + cal, link: meet || undefined, button: 'Google Meet’e katıl'});
    if (cfg.notifyEmail && validEmail(cfg.notifyEmail)) await sendMail({to: cfg.notifyEmail, subject: 'Yeni ön görüşme: ' + name, text: `${name} (${email}) · ${fmt} · ${booking.service || ''} ${meet ? '· ' + meet : ''}`});
    await db.batch([putItem(db, id, 'booking', 'owner', {...booking, mailSent: mail.sent}), notice(db, 'owner', 'Yeni ön görüşme: ' + name + ' · ' + fmt, 'bookings')]);
    return json({ok: true, meet: meet || null, when: fmt, calendar: cal, mailSent: mail.sent});
  }
  if (route === 'lead' && req.method === 'POST') { // pre-assessment result gate (public)
    const email = clean(b.email, 254).toLowerCase();
    if (!validEmail(email)) fail(400, 'Geçerli bir e-posta adresi girin.');
    if (!b.consent) fail(400, 'Devam etmek için abonelik koşullarını onaylayın.');
    const answers = {goal: clean(b.answers?.goal, 30), status: clean(b.answers?.status, 30), bond: clean(b.answers?.bond, 30)};
    const results = (Array.isArray(b.results) ? b.results : []).slice(0, 5).map(r => ({id: clean(r.id, 40), title: clean(r.title, 120), score: Math.max(0, Math.min(100, Number(r.score) || 0))}));
    const id = 'lead-' + sha(email).slice(0, 24);
    const old = await getItem(db, id);
    if (old && now() - (old.data.at || 0) < 60e3 && !b.send) return json({ok: true});
    const data = {email, name: clean(b.name, 100), answers, results, consent: true, consentText: clean(b.consentText, 300), at: now(), count: (old?.data.count || 0) + 1, sent: old?.data.sent || false};
    let mail = {sent: false};
    if (b.send) {
      const lines = results.map((r, i) => `${i + 1}. ${r.title} — ${r.score}/100`).join('\n');
      mail = await sendMail({to: email, subject: 'Brezilya yol haritanız', title: 'Kişisel Brezilya yol haritanız', text: `Ön değerlendirme sonuçlarınız:\n${lines}\n\nDanışmanlarımız sizinle iletişime geçecek. Ücretsiz 15 dakikalık ön görüşme için sitemizi ziyaret edebilirsiniz.`, link: siteUrl(req) + '/giris/?kayit=1', button: 'Ücretsiz hesap oluştur'});
      data.sent = data.sent || mail.sent; data.roadmapRequested = true;
    }
    await db.batch([putItem(db, id, 'lead', 'owner', data), ...(!old || b.send ? [notice(db, 'owner', (b.send ? 'Yol haritası talebi: ' : 'Yeni ön değerlendirme: ') + email, 'leads')] : [])]);
    return json({ok: true, mailSent: mail.sent});
  }
  if (route === 'verify' && req.method === 'POST') {
    const t = await useToken(db, b.token, ['verify']);
    await q(db, 'UPDATE auth_users SET verified=1 WHERE id=?', t.user).run();
    return json({ok: true});
  }
  if (route === 'resend' && req.method === 'POST') {
    const email = clean(b.email, 254).toLowerCase();
    const u = await one(db, 'SELECT * FROM auth_users WHERE email=?', email);
    if (u && !u.verified) { const m = await sendVerify(db, req, u); return json({ok: true, devLink: m.devLink}); }
    return json({ok: true});
  }
  if (route === 'forgot' && req.method === 'POST') {
    const email = clean(b.email, 254).toLowerCase();
    let u = await one(db, 'SELECT * FROM auth_users WHERE email=?', email);
    // Accounts opened by an advisor / lawyer workspace have no login yet: activate them here.
    if (!u && validEmail(email) && email !== OWNER_EMAIL() && (await one(db, "SELECT id FROM people WHERE email=? AND status IN ('active','invited')", email) || await one(db, "SELECT id FROM law_accounts WHERE email=? AND status='active'", email))) u = await newAuthUser(db, email, null, true);
    let devLink;
    if (u && (email !== OWNER_EMAIL() || isAdminRequest(req))) {
      const token = await createToken(db, u.id, 'reset', 2);
      const base = email === OWNER_EMAIL() ? adminUrl(req) + '/admin/giris/' : siteUrl(req) + '/giris/';
      const m = await sendMail({to: email, subject: 'Şifre sıfırlama', text: 'Şifrenizi sıfırlamak için bağlantıya tıklayın. Bağlantı 2 saat geçerlidir. Bu isteği siz yapmadıysanız dikkate almayın.', link: `${base}?sifre=${token}`, button: 'Yeni şifre belirle'});
      devLink = m.devLink;
    }
    return json({ok: true, devLink}); // same answer whether or not the address exists
  }
  if (route === 'reset' && req.method === 'POST') {
    if (!passwordOk(b.password)) fail(400, PASSWORD_RULE);
    const t = await useToken(db, b.token, ['reset', 'invite']);
    const {salt, hash} = await hashPassword(b.password);
    await q(db, 'UPDATE auth_users SET hash=?, salt=?, verified=1, failed=0, locked_until=0 WHERE id=?', hash, salt, t.user).run();
    await q(db, 'DELETE FROM auth_sessions WHERE user=?', t.user).run();
    return json({ok: true});
  }

  if (route === 'login' && req.method === 'POST') {
    const admin = isAdminRequest(req);
    const email = clean(b.email, 254).toLowerCase();
    const u = await one(db, 'SELECT * FROM auth_users WHERE email=?', email);
    if (admin && email !== OWNER_EMAIL()) fail(403, 'Bu adres yalnızca yönetici girişi içindir.');
    if (!admin && email === OWNER_EMAIL()) fail(403, 'Yönetici hesabı yalnızca yönetim panelinin adresinden giriş yapabilir.');
    if (u?.locked_until > now()) fail(429, 'Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin.');
    const ok = u && await checkPassword(String(b.password || ''), u.salt, u.hash);
    if (!ok) {
      if (u) await q(db, 'UPDATE auth_users SET failed=failed+1, locked_until=CASE WHEN failed+1>=8 THEN ? ELSE locked_until END WHERE id=?', now() + 15 * 6e4, u.id).run();
      fail(401, 'E-posta veya şifre hatalı.');
    }
    if (!u.verified) fail(403, 'E-posta adresiniz henüz doğrulanmadı. Gelen kutunuzu kontrol edin.', {unverified: true});
    await q(db, 'UPDATE auth_users SET failed=0, locked_until=0 WHERE id=?', u.id).run();
    if (!admin) { // bind invitations created by advisors/staff to this login
      await q(db, "UPDATE people SET uid=?, status='active' WHERE email=? AND uid IS NULL AND status='invited' AND created>?", u.id, email, now() - 30 * 864e5).run();
      await q(db, "UPDATE law_accounts SET uid=? WHERE email=? AND uid IS NULL AND status='active'", u.id, email).run();
    }
    let accounts;
    if (admin) accounts = [{panel: 'admin', home: '/admin/', label: 'Yönetim paneli'}];
    else {
      accounts = await accountsFor(db, u);
      if (!accounts.length) fail(403, 'Bu e-posta için aktif bir panel hesabı bulunamadı.');
    }
    return json({ok: true, accounts, home: accounts[0].home}, 200, {'Set-Cookie': await createSession(db, req, u.id)});
  }

  if (route === 'setup' && req.method === 'POST') { // first owner password, protected by ADMIN_SETUP_KEY
    if (!isAdminRequest(req)) fail(404, 'Bulunamadı.');
    const key = process.env.ADMIN_SETUP_KEY;
    if (!key) fail(503, 'ADMIN_SETUP_KEY ortam değişkeni tanımlı değil.');
    if (clean(b.setupKey, 200) !== key) fail(403, 'Kurulum anahtarı hatalı.');
    if (!passwordOk(b.password) || b.password.length < 12) fail(400, 'Yönetici şifresi en az 12 karakter olmalı ve harf ile rakam içermelidir.');
    let u = await one(db, 'SELECT * FROM auth_users WHERE email=?', OWNER_EMAIL());
    if (u?.hash) fail(409, 'Yönetici şifresi zaten belirlenmiş. "Şifremi unuttum" ile sıfırlayabilirsiniz.');
    const {salt, hash} = await hashPassword(b.password);
    if (u) await q(db, 'UPDATE auth_users SET hash=?, salt=?, verified=1 WHERE id=?', hash, salt, u.id).run();
    else { const id = uuid(); await q(db, 'INSERT INTO auth_users VALUES(?,?,?,?,?,?,?,?)', id, OWNER_EMAIL(), hash, salt, 1, 0, 0, now()).run(); u = {id}; }
    return json({ok: true}, 200, {'Set-Cookie': await createSession(db, req, u.id)});
  }
  if (route === 'status' && req.method === 'GET') {
    if (!isAdminRequest(req)) fail(404, 'Bulunamadı.');
    const u = await one(db, 'SELECT hash FROM auth_users WHERE email=?', OWNER_EMAIL());
    return json({setupNeeded: !u?.hash, setupKeyConfigured: !!process.env.ADMIN_SETUP_KEY});
  }
  fail(404, 'İşlem bulunamadı.');
}

// ---- /api/platform/* (signed-in members) -----------------------------------
async function memberContext(db, req) {
  const u = await currentUser(db, req); if (!u) fail(401, 'Giriş yapmanız gerekiyor.');
  const person = await one(db, 'SELECT * FROM people WHERE uid=?', u.id);
  return {u, person};
}
const sniff = bytes => String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-' ? 'application/pdf' : bytes[0] === 255 && bytes[1] === 216 ? 'image/jpeg' : bytes.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10' ? 'image/png' : null;
const MAX_UPLOAD = () => Number(process.env.MAX_UPLOAD_MB || (process.env.VERCEL ? 4 : 10)) * 1024 * 1024;


// ---- Didit identity verification (free plan: ~30 full checks / month) ----
export const diditReady = env => env.DIDIT_ENABLED === 'true' && !!env.DIDIT_API_KEY && !!env.DIDIT_WORKFLOW_ID;
const KYC_LIMIT = () => Number(process.env.DIDIT_MONTHLY_LIMIT || 30);
const monthStart = () => { const d = new Date(); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1); };
const KYC_FINAL = new Set(['Approved', 'Declined', 'Abandoned', 'Expired', 'Kyc Expired']);
async function didit(env, path, body, fetchImpl = fetch) {
  const r = await fetchImpl('https://verification.didit.me/v3/' + path, {method: body ? 'POST' : 'GET', headers: {'x-api-key': env.DIDIT_API_KEY, 'Content-Type': 'application/json'}, body: body ? JSON.stringify(body) : undefined, redirect: 'error', signal: AbortSignal.timeout(15000)});
  if (!r.ok) fail(502, 'Didit isteği tamamlanamadı. Hesap kredisi ve yapılandırmayı kontrol edin.');
  return r.json();
}
export const partnerRequiredDocs = env => diditReady(env) ? ['vergi', 'sirku'] : Object.keys(PARTNER_DOCS);
const docsComplete = (env, d) => partnerRequiredDocs(env).every(k => d.docs[k]);
async function approvePartner(db, rec, personId, by, text) {
  rec.data.status = 'approved'; rec.data.approvedBy = by; rec.data.history.push({at: now(), text});
  await db.batch([putItem(db, rec.id, 'partner', personId, rec.data), notice(db, personId, 'Partner hesabınız onaylandı. Tüm modüller açıldı.', 'overview'), notice(db, 'owner', 'Partner otomatik onaylandı: ' + rec.data.company, 'partners')]);
}

export async function runPartnerVerification(env, personId) {
  const db = env.DB;
  const rec = await getItem(db, 'partner-' + personId); if (!rec) return;
  const d = rec.data, need = partnerRequiredDocs(env);
  if (!docsComplete(env, d)) return;
  d.status = 'checking'; d.history.push({at: now(), text: 'Otomatik belge kontrolü başladı'});
  await putItem(db, rec.id, 'partner', personId, d).run();
  let result;
  try {
    const files = [];
    for (const k of need) {
      const obj = await env.BUCKET.get(d.docs[k].key);
      if (!obj) throw new Error(PARTNER_DOCS[k].title + ' dosyası okunamadı.');
      files.push({doc: k, mime: d.docs[k].mime, bytes: new Uint8Array(await obj.arrayBuffer())});
    }
    result = await verifyPartner(d, files);
  } catch (e) { console.error('[partner-verify]', e.message); result = {decision: 'review', summary: 'Otomatik doğrulama tamamlanamadı: ' + e.message, checks: {}}; }
  const fresh = await getItem(db, rec.id);
  fresh.data.check = {...result, at: now()};
  for (const k of need) if (fresh.data.docs[k]) fresh.data.docs[k].status = result.checks?.[k] ? (result.checks[k].ok ? 'Uygun' : 'Sorunlu') : 'İncelemede';
  await settlePartner(env, fresh, personId);
}

// Decide the partner state from document check + Didit identity result.
async function settlePartner(env, rec, personId) {
  const db = env.DB, d = rec.data, kycNeeded = diditReady(env), kycOk = d.kyc?.status === 'Approved';
  if (d.status === 'approved') return;
  if (d.check?.decision === 'approve' && (!kycNeeded || kycOk)) return approvePartner(db, rec, personId, 'Otomatik doğrulama', kycNeeded ? 'Belgeler ve Didit kimlik doğrulaması tamamlandı, hesap onaylandı' : 'Belgeler otomatik doğrulandı, hesap onaylandı');
  if (d.check?.decision === 'approve' && kycNeeded && !kycOk) {
    d.status = d.kyc?.status === 'Declined' ? 'review' : 'kyc_pending'; d.history.push({at: now(), text: d.status === 'review' ? 'Kimlik doğrulaması reddedildi, admin incelemesine gönderildi' : 'Belgeler uygun; kimlik doğrulaması bekleniyor'});
    await db.batch([putItem(db, rec.id, 'partner', personId, d), notice(db, personId, d.status === 'review' ? 'Başvurunuz incelemeye alındı.' : 'Belgeleriniz uygun. Şimdi kimliğinizi Didit ile doğrulayın.', 'overview')]);
    return;
  }
  d.status = 'review'; d.history.push({at: now(), text: 'Admin incelemesine gönderildi'});
  await db.batch([putItem(db, rec.id, 'partner', personId, d), notice(db, personId, 'Belgeleriniz incelemeye alındı.', 'overview'), notice(db, 'owner', 'Partner belgeleri incelemenizi bekliyor: ' + d.company, 'partners')]);
}

// Customer documents are checked automatically only after a service purchase.
export async function maybeVerifyCustomerUpload(env, documentId) {
  const db = env.DB;
  const doc = await getItem(db, documentId);
  if (!doc || doc.kind !== 'document' || doc.data.senderRole !== 'customer') return;
  const c = await one(db, "SELECT * FROM people WHERE id=? AND role='customer'", doc.owner); if (!c) return;
  const purchased = await one(db, "SELECT id FROM items WHERE owner=? AND ((kind='invoice' AND json_extract(data,'$.status')='Ödendi') OR kind='application') LIMIT 1", c.id);
  if (!purchased) return; // verification is optional before a purchase
  const titles = ['Pasaport', 'Adli Sicil Kaydı (Apostilli)', 'İkametgah Belgesi (Apostilli)', 'Diploma / Sertifika (Noter Onaylı)', 'Kira Kontratı', 'Biyometrik Fotoğraf', 'Ek Belge'];
  const expected = doc.data.title && doc.data.slot == null ? doc.data.title : titles[doc.data.slot] || doc.data.title || 'Başvuru belgesi';
  let result;
  try {
    const obj = await env.BUCKET.get(doc.data.key); if (!obj) return;
    result = await verifyCustomerDocument(c, {mime: doc.data.mime, bytes: new Uint8Array(await obj.arrayBuffer())}, expected);
  } catch (e) { console.error('[customer-verify]', e.message); result = {decision: 'review', summary: 'Otomatik kontrol tamamlanamadı.'}; }
  const fresh = await getItem(db, documentId);
  const data = {...fresh.data, autoCheck: {...result, at: now()}, status: result.decision === 'approve' ? 'Onaylandı' : 'İncelemede', reviewer: result.decision === 'approve' ? 'Otomatik doğrulama' : fresh.data.reviewer, reason: result.decision === 'approve' ? '' : result.summary};
  await db.batch([putItem(db, documentId, 'document', fresh.owner, data), notice(db, c.id, result.decision === 'approve' ? 'Belgeniz otomatik doğrulandı.' : 'Belgeniz danışman incelemesine alındı.', 'documents'), ...(result.decision === 'approve' ? [] : [notice(db, c.advisor || 'owner', 'Otomatik kontrolden geçemeyen belge: ' + c.name, 'documents')])]);
}

export async function handlePlatform(req, env, route, ctx = {}) {
  const db = env.DB;
  if (req.method !== 'GET') sameOrigin(req);
  if (route === 'modules' && req.method === 'GET') {
    const panel = clean(new URL(req.url).searchParams.get('panel'), 20);
    const list = (await rows(db, "SELECT * FROM items WHERE kind='panel_module' ORDER BY created")).map(r => ({id: r.id, ...parse(r.data)})).filter(m => m.active !== false && (m.panels || []).includes(panel)).sort((a, b) => (a.order || 0) - (b.order || 0));
    const builtins = (await getItem(db, 'panel-builtins'))?.data?.[panel] || {hidden: []};
    return json({modules: list.map(m => ({id: m.id, title: m.title, icon: m.icon, type: m.type, content: m.content, url: m.url, order: m.order})), hidden: builtins.hidden || []});
  }
  const {u, person} = await memberContext(db, req);
  if (route === 'partner' && req.method === 'GET') {
    if (!person || person.role !== 'advisor') return json({partner: null});
    const p = await partnerState(db, person.id);
    if (!p) return json({partner: null});
    return json({partner: {status: p.status, company: p.company, services: p.services, docs: Object.fromEntries(Object.entries(p.docs).map(([k, v]) => [k, {name: v.name, status: v.status, at: v.at}])), check: p.check ? {summary: p.check.summary, at: p.check.at} : null, reason: p.reason || '', required: Object.fromEntries(partnerRequiredDocs(env).map(k => [k, PARTNER_DOCS[k].title])), didit: diditReady(env), kyc: p.kyc ? {status: p.kyc.status, url: KYC_FINAL.has(p.kyc.status) ? null : p.kyc.url} : null, maxMb: MAX_UPLOAD() / 1048576}});
  }
  if (route === 'partner/upload' && req.method === 'POST') {
    if (!person || person.role !== 'advisor') fail(403, 'Partner hesabı gerekli.');
    const rec = await getItem(db, 'partner-' + person.id); if (!rec) fail(404, 'Partner başvurusu bulunamadı.');
    if (['approved', 'checking'].includes(rec.data.status)) fail(409, rec.data.status === 'approved' ? 'Hesabınız zaten onaylı.' : 'Belgeleriniz şu anda kontrol ediliyor.');
    if (Number(req.headers.get('content-length') || 0) > MAX_UPLOAD() + 65536) fail(413, `Dosya en fazla ${MAX_UPLOAD() / 1048576} MB olabilir.`);
    const f = await req.formData(), file = f.get('file'), doc = clean(f.get('doc'), 20);
    if (!PARTNER_DOCS[doc] || !partnerRequiredDocs(env).includes(doc)) fail(400, 'Belge türü geçersiz.');
    if (!file || typeof file === 'string' || !file.size || file.size > MAX_UPLOAD()) fail(400, `PDF, JPG veya PNG; en fazla ${MAX_UPLOAD() / 1048576} MB.`);
    const buf = await file.arrayBuffer(), mime = sniff(new Uint8Array(buf));
    if (!mime) fail(400, 'Geçerli bir PDF, JPG veya PNG dosyası seçin.');
    const key = `private/partner/${person.id}/${doc}-${uuid()}`;
    await env.BUCKET.put(key, buf, {httpMetadata: {contentType: mime}});
    const old = rec.data.docs[doc];
    rec.data.docs[doc] = {key, mime, name: clean(file.name, 200), size: file.size, at: now(), status: 'Yüklendi'};
    if (rec.data.status === 'rejected') rec.data.status = 'docs_required';
    const complete = docsComplete(env, rec.data);
    rec.data.history.push({at: now(), text: PARTNER_DOCS[doc].title + ' yüklendi'});
    if (complete) rec.data.status = 'queued';
    await putItem(db, rec.id, 'partner', person.id, rec.data).run();
    if (old?.key) await env.BUCKET.delete(old.key).catch(() => {});
    if (complete && ctx.after) ctx.after(() => runPartnerVerification(env, person.id));
    return json({ok: true, complete});
  }
  if ((route === 'partner/kyc/start' || route === 'partner/kyc/refresh') && req.method === 'POST') {
    if (!person || person.role !== 'advisor') fail(403, 'Partner hesabı gerekli.');
    if (!diditReady(env)) fail(503, 'Kimlik doğrulama (Didit) henüz yapılandırılmadı.');
    const rec = await getItem(db, 'partner-' + person.id); if (!rec) fail(404, 'Partner başvurusu bulunamadı.');
    const d = rec.data;
    if (route === 'partner/kyc/start') {
      if (d.kyc?.url && !KYC_FINAL.has(d.kyc.status)) return json({url: d.kyc.url, status: d.kyc.status});
      if (d.kyc?.status === 'Approved') return json({status: 'Approved'});
      const id = 'kyc-partner-' + person.id + '-' + now();
      const reserved = await one(db, "INSERT INTO items(id,kind,owner,data,created,updated) SELECT ?,'kyc_session',?,?,?,? WHERE (SELECT COUNT(*) FROM items WHERE kind='kyc_session' AND created>=?)<? RETURNING id", id, 'partner:' + person.id, JSON.stringify({status: 'Initializing', initiator: person.name}), now(), now(), monthStart(), KYC_LIMIT());
      if (!reserved) fail(409, 'Bu ay için ücretsiz kimlik doğrulama kotası doldu. Ekibimiz sizinle iletişime geçecek.');
      const s2 = await didit(env, 'session/', {workflow_id: env.DIDIT_WORKFLOW_ID, vendor_data: id, callback: siteUrl(req) + '/partner/?kyc=done', language: 'tr'});
      let link; try { const u = new URL(s2.url); if (u.protocol === 'https:' && u.hostname.endsWith('didit.me')) link = u.href; } catch {}
      if (!link || !s2.session_id) fail(502, 'Didit yanıtı doğrulanamadı.');
      d.kyc = {sessionId: s2.session_id, url: link, status: 'Not Started', ref: id, at: now()};
      d.history.push({at: now(), text: 'Didit kimlik doğrulaması başlatıldı'});
      await db.batch([putItem(db, rec.id, 'partner', person.id, d), q(db, 'UPDATE items SET data=?, updated=? WHERE id=?', JSON.stringify({status: 'Not Started', sessionId: s2.session_id}), now(), id)]);
      return json({url: link, status: 'Not Started'});
    }
    if (!d.kyc?.sessionId) fail(409, 'Kimlik doğrulaması henüz başlatılmadı.');
    if (KYC_FINAL.has(d.kyc.status) || (d.kyc.checkedAt && now() - d.kyc.checkedAt < 10000)) return json({status: d.kyc.status});
    const r = await didit(env, 'session/' + encodeURIComponent(d.kyc.sessionId) + '/decision/');
    if (r.session_id && r.session_id !== d.kyc.sessionId) fail(502, 'Doğrulama sonucu eşleştirilemedi.');
    const prev = d.kyc.status;
    d.kyc = {...d.kyc, status: String(r.status || d.kyc.status).slice(0, 40), checkedAt: now()};
    if (prev !== d.kyc.status) d.history.push({at: now(), text: 'Didit sonucu: ' + d.kyc.status});
    await putItem(db, rec.id, 'partner', person.id, d).run();
    if (prev !== d.kyc.status && KYC_FINAL.has(d.kyc.status) && d.check) await settlePartner(env, await getItem(db, rec.id), person.id);
    return json({status: d.kyc.status});
  }
  if (route.startsWith('partner/file/') && req.method === 'GET') {
    if (!person) fail(403, 'Erişim yok.');
    const doc = route.split('/')[2]; const p = await partnerState(db, person.id);
    if (!p?.docs[doc]) fail(404, 'Dosya bulunamadı.');
    return streamFile(env, p.docs[doc]);
  }
  fail(404, 'İşlem bulunamadı.');
}

async function streamFile(env, d) {
  const obj = await env.BUCKET.get(d.key); if (!obj) fail(404, 'Dosya bulunamadı.');
  return new Response(obj.body, {headers: {'Content-Type': d.mime, 'Content-Disposition': 'inline', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox"}});
}

// ---- /api/platform/admin/* (owner, admin host only) --------------------------
function validPerms(ps) {
  const out = {}; for (const p of PERMS) { const v = Number(ps?.[p] || 0); if (![0, 1, 2].includes(v)) fail(400, 'Geçersiz yetki.'); out[p] = v; }
  if (out.kyc > 0 && out.documents < 1) out.documents = 1;
  return out;
}
export async function handlePlatformAdmin(req, env, route, ctx = {}) {
  const db = env.DB;
  if (req.method !== 'GET') sameOrigin(req);
  const u = await currentUser(db, req);
  if (!u || u.email !== OWNER_EMAIL()) fail(401, 'Yönetici girişi gerekli.');
  const actor = 'Yönetici';

  if (route === 'meta' && req.method === 'GET') return json({types: ACCOUNT_TYPES, perms: PERMS, permLabels: PERM_LABELS, defaults: DEFAULT_PERMS, panels: PANELS, countries: Object.fromEntries(Object.entries(CITIES).map(([k, v]) => [k, Object.keys(v)])), services: PARTNER_SERVICES, mail: mailConfigured(), verifier: verifierConfigured()});

  if (route === 'accounts' && req.method === 'GET') {
    const people = await rows(db, "SELECT * FROM people WHERE role!='owner' ORDER BY created DESC");
    const metas = Object.fromEntries((await rows(db, "SELECT owner,data FROM items WHERE kind='account_meta'")).map(r => [r.owner, parse(r.data)]));
    const partners = Object.fromEntries((await rows(db, "SELECT owner,data FROM items WHERE kind='partner'")).map(r => [r.owner, parse(r.data)]));
    const authed = Object.fromEntries((await rows(db, 'SELECT id,verified,hash FROM auth_users')).map(r => [r.id, r]));
    const lastIn = Object.fromEntries((await rows(db, "SELECT user, MAX(created) AS t FROM auth_sessions WHERE scope='site' GROUP BY user")).map(r => [r.user, r.t]));
    const names = Object.fromEntries(people.map(p => [p.id, p.name]));
    const list = people.map(p => {
      const meta = metas[p.id] || {}, a = authed[p.uid];
      const type = p.role === 'customer' ? 'customer' : meta.type || (p.role === 'advisor' ? 'advisor' : 'other');
      return {id: p.id, name: p.name, email: p.email, type, role: p.role, status: p.status, permissions: parse(p.permissions), scope: parse(p.scope), advisor: p.advisor, advisorName: p.advisor === 'owner' ? 'Merkez ofis' : names[p.advisor] || '', city: meta.city, country: meta.country, company: meta.company, phone: meta.phone, assignedBy: meta.assignedBy, title: meta.title, partner: partners[p.id] ? {status: partners[p.id].status} : null, manager: p.manager, extra: meta.extra || {}, lastLogin: lastIn[p.uid] || null, login: a ? (a.hash ? (a.verified ? 'Aktif' : 'Doğrulama bekliyor') : 'Şifre bekleniyor') : 'Giriş yok', created: p.created};
    });
    const law = await rows(db, "SELECT * FROM law_accounts WHERE role!='owner' ORDER BY created DESC");
    for (const a of law) { const d = parse(a.data); const au = a.uid ? authed[a.uid] : null; list.push({id: 'law:' + a.id, name: d.profile?.name || a.email, email: a.email, type: 'lawyer', role: a.role, status: a.status === 'active' ? 'active' : 'disabled', permissions: {}, login: au ? (au.hash ? 'Aktif' : 'Şifre bekleniyor') : 'Giriş yok', created: a.created}); }
    const G = (await getItem(db, 'account-groups'))?.data || {groups: [], assign: {}};
    for (const a of list) a.group = G.assign?.[a.id] || '';
    list.sort((x, y) => y.created - x.created);
    return json({accounts: list, groups: G.groups || []});
  }

  if (['groups', 'accounts/notes', 'accounts/activity', 'accounts/files', 'accounts/file'].includes(route) && req.method === 'GET') {
    if (route === 'groups') { const G = (await getItem(db, 'account-groups'))?.data || {groups: [], assign: {}}; return json({groups: G.groups || [], assign: G.assign || {}}); }
    const id = clean(new URL(req.url).searchParams.get('id'), 80); if (!id) fail(400, 'Hesap gerekli.');
    if (route === 'accounts/notes') return json({notes: (await getItem(db, 'acnotes-' + id))?.data?.notes || []});
    if (route === 'accounts/files') {
      const own = await rows(db, "SELECT i.id, i.owner, i.data, i.created, p.name AS pname FROM items i LEFT JOIN people p ON p.id=i.owner WHERE i.kind IN ('document','invoice') AND (i.owner=? OR i.owner IN (SELECT id FROM people WHERE role='customer' AND advisor=?)) ORDER BY i.created DESC LIMIT 300", id, id);
      return json({files: own.map(r => { const d = parse(r.data); return {id: r.id, owner: r.owner, ownerName: r.pname || '', name: d.name, title: d.title, mime: d.mime, size: d.size, status: d.status, direction: d.direction, sender: d.sender, at: r.created, invoice: d.amount !== undefined}; })});
    }
    if (route === 'accounts/file') {
      const r = await one(db, "SELECT data FROM items WHERE id=? AND kind IN ('document','invoice')", id); if (!r) fail(404, 'Dosya bulunamadı.');
      const d = parse(r.data); if (!d.key) fail(404, 'Dosya bulunamadı.'); return streamFile(env, d);
    }
    const email = id.startsWith('law:') ? (await one(db, 'SELECT email FROM law_accounts WHERE id=?', id.slice(4)))?.email : (await one(db, 'SELECT email FROM people WHERE id=?', id))?.email;
    const acts = await rows(db, "SELECT data, created FROM items WHERE kind='audit' AND (instr(json_extract(data,'$.target'), ?) > 0 OR json_extract(data,'$.target') = ?) ORDER BY created DESC LIMIT 100", id, email || '\u0000');
    return json({activity: acts.map(r => ({...parse(r.data), at: r.created}))});
  }
  const b = req.method === 'GET' ? {} : route.startsWith('modules/') && req.method === 'DELETE' ? {} : await body(req);

  if (route === 'accounts' && req.method === 'POST') {
    const type = clean(b.type, 20); if (!ACCOUNT_TYPES[type]) fail(400, 'Hesap türü seçin.');
    const email = clean(b.email, 254).toLowerCase(), name = clean(b.name, 100);
    if (name.length < 2 || !validEmail(email)) fail(400, 'Ad soyad ve geçerli e-posta gerekli.');
    if (email === OWNER_EMAIL()) fail(400, 'Bu e-posta yönetici hesabıdır.');
    if (await one(db, 'SELECT id FROM people WHERE email=?', email) || await one(db, 'SELECT id FROM law_accounts WHERE email=?', email)) fail(409, 'Bu e-posta ile kayıtlı bir hesap zaten var.');
    let user = await one(db, 'SELECT * FROM auth_users WHERE email=?', email);
    if (!user) user = await newAuthUser(db, email, null, true);
    const loc = b.country ? locate(clean(b.country, 60), clean(b.city, 80)) : null;
    const pid = uuid(), ops = [];
    if (type === 'lawyer') {
      ops.push(q(db, "INSERT INTO law_accounts VALUES(?,?,?,NULL,'lawyer','active',?,?)", pid, user.id, email, JSON.stringify({profile: {name, phone: clean(b.phone, 40)}}), now()));
    } else if (type === 'customer') {
      let advisor = clean(b.advisor, 60) || '';
      if (advisor && advisor !== 'owner' && !await one(db, "SELECT id FROM people WHERE id=? AND role='advisor'", advisor)) fail(400, 'Danışman bulunamadı.');
      if (!advisor) { const near = await nearestAdvisor(db, loc); advisor = near?.id || 'owner'; }
      ops.push(insertPerson(db, {id: pid, uid: user.id, email, name, role: 'customer', manager: 'owner', permissions: {}, scope: 'all', advisor}));
      ops.push(notice(db, advisor, 'Yeni müşteri atandı: ' + name, 'customers'));
    } else {
      const perms = validPerms(b.permissions || DEFAULT_PERMS[type]);
      const scope = b.scope === 'all' || !Array.isArray(b.scope) ? 'all' : b.scope.slice(0, 200).map(x => clean(x, 60));
      let mgr = 'owner';
      if (b.manager && type !== 'advisor') { mgr = clean(b.manager, 60); if (!await one(db, "SELECT id FROM people WHERE id=? AND role='advisor'", mgr)) fail(400, 'Partner bulunamadı.'); }
      ops.push(insertPerson(db, {id: pid, uid: user.id, email, name, role: type === 'advisor' ? 'advisor' : 'employee', manager: type === 'advisor' ? pid : mgr, permissions: perms, scope}));
    }
    if (type !== 'lawyer') {
      ops.push(putItem(db, 'meta-' + pid, 'account_meta', pid, {type, phone: clean(b.phone, 40), company: clean(b.company, 200), title: clean(b.title, 100), country: loc?.country || '', city: loc?.city || '', lat: loc?.lat ?? null, lng: loc?.lng ?? null, createdBy: 'admin'}));
      ops.push(putItem(db, 'profile-' + pid, 'profile', pid, {name, phone: clean(b.phone, 40), company: clean(b.company, 200)}));
    }
    ops.push(audit(db, actor, 'account.create.' + type, email));
    await db.batch(ops);
    const fresh = await one(db, 'SELECT * FROM auth_users WHERE id=?', user.id);
    let mail = {sent: false};
    if (!fresh.hash) mail = await sendInvite(db, req, fresh, name, ACCOUNT_TYPES[type]);
    return json({ok: true, id: pid, mailSent: mail.sent, devLink: mail.devLink, existingLogin: !!fresh.hash});
  }

  if (route === 'accounts' && req.method === 'PATCH') {
    const id = clean(b.id, 80);
    if (id.startsWith('law:')) {
      const lid = id.slice(4);
      if (b.status) await q(db, "UPDATE law_accounts SET status=? WHERE id=? AND role!='owner'", b.status === 'active' ? 'active' : 'disabled', lid).run();
      await audit(db, actor, 'account.update', id).run();
      return json({ok: true});
    }
    const p = await one(db, "SELECT * FROM people WHERE id=? AND role!='owner'", id); if (!p) fail(404, 'Hesap bulunamadı.');
    const ops = [];
    if (b.status) ops.push(q(db, 'UPDATE people SET status=? WHERE id=?', b.status === 'active' ? 'active' : 'disabled', id));
    if (b.permissions && p.role !== 'customer') ops.push(q(db, 'UPDATE people SET permissions=? WHERE id=?', JSON.stringify(validPerms(b.permissions)), id));
    if (b.scope !== undefined && p.role !== 'customer') ops.push(q(db, 'UPDATE people SET scope=? WHERE id=?', JSON.stringify(b.scope === 'all' || !Array.isArray(b.scope) ? 'all' : b.scope.slice(0, 200)), id));
    if (b.advisor !== undefined && p.role === 'customer') {
      const adv = clean(b.advisor, 60) || 'owner';
      if (adv !== 'owner' && !await one(db, "SELECT id FROM people WHERE id=? AND role='advisor'", adv)) fail(400, 'Danışman bulunamadı.');
      ops.push(q(db, 'UPDATE people SET advisor=? WHERE id=?', adv, id), notice(db, adv, 'Size yeni müşteri atandı: ' + p.name, 'customers'));
    }
    if (b.name) ops.push(q(db, 'UPDATE people SET name=? WHERE id=?', clean(b.name, 100), id));
    ops.push(audit(db, actor, 'account.update', id));
    await db.batch(ops);
    return json({ok: true});
  }
  if (route === 'accounts/invite' && req.method === 'POST') {
    const id = clean(b.id, 80);
    const row = id.startsWith('law:') ? await one(db, 'SELECT email, data FROM law_accounts WHERE id=?', id.slice(4)) : await one(db, 'SELECT email, name FROM people WHERE id=?', id);
    if (!row) fail(404, 'Hesap bulunamadı.');
    let user = await one(db, 'SELECT * FROM auth_users WHERE email=?', row.email);
    if (!user) user = await newAuthUser(db, row.email, null, true);
    const token = await createToken(db, user.id, user.hash ? 'reset' : 'invite', 7 * 24);
    const link = `${siteUrl(req)}/giris/?sifre=${token}`;
    const m = await sendMail({to: row.email, subject: 'Brazil Migration giriş bağlantınız', text: 'Şifrenizi belirlemek / yenilemek için bağlantıyı kullanın. 7 gün geçerlidir.', link, button: 'Şifremi belirle'});
    return json({ok: true, mailSent: m.sent, devLink: m.devLink});
  }

  // ---- CRM: gruplar, profil alanları, notlar, etkinlik ----
  const GROUP_ICONS = ['person', 'users', 'briefcase', 'award', 'scale', 'calculator', 'star', 'shield', 'heart', 'globe', 'building', 'flag'];
  if (route === 'groups' && req.method === 'POST') {
    const cur = (await getItem(db, 'account-groups'))?.data || {groups: [], assign: {}};
    if (!Array.isArray(b.groups) || b.groups.length > 50) fail(400, 'Grup listesi geçersiz.');
    const groups = b.groups.map(g => ({
      id: /^[a-z0-9-]{4,40}$/.test(g.id || '') ? g.id : uuid().slice(0, 12),
      name: clean(g.name, 40), icon: GROUP_ICONS.includes(g.icon) ? g.icon : 'person',
      color: /^#[0-9a-f]{6}$/i.test(g.color || '') ? g.color : '#1b5e20',
      discount: Math.max(0, Math.min(100, Number(g.discount) || 0)),
      products: Array.isArray(g.products) ? g.products.slice(0, 100).map(x => clean(x, 80)) : [],
      combine: !!g.combine, protect: !!g.protect, priority: !!g.priority, separateInvoice: !!g.separateInvoice,
    })).filter(g => g.name);
    const ids = new Set(groups.map(g => g.id));
    const assign = Object.fromEntries(Object.entries(cur.assign || {}).filter(([, v]) => ids.has(v)));
    await db.batch([putItem(db, 'account-groups', 'config', 'owner', {groups, assign}), audit(db, actor, 'groups.update', String(groups.length))]);
    return json({ok: true, groups});
  }
  if (route === 'accounts/group' && req.method === 'POST') {
    const cur = (await getItem(db, 'account-groups'))?.data || {groups: [], assign: {}};
    const ids = (Array.isArray(b.ids) ? b.ids : [b.id]).map(x => clean(x, 80)).filter(Boolean).slice(0, 500);
    const g = clean(b.group, 40);
    if (g && !(cur.groups || []).some(x => x.id === g)) fail(400, 'Grup bulunamadı.');
    cur.assign = cur.assign || {};
    for (const id of ids) { if (g) cur.assign[id] = g; else delete cur.assign[id]; }
    await db.batch([putItem(db, 'account-groups', 'config', 'owner', cur), audit(db, actor, 'account.group', ids.join(','))]);
    return json({ok: true});
  }
  if (route === 'accounts/meta' && req.method === 'POST') {
    const id = clean(b.id, 80);
    if (id.startsWith('law:')) {
      const row = await one(db, 'SELECT data FROM law_accounts WHERE id=?', id.slice(4)); if (!row) fail(404, 'Hesap bulunamadı.');
      const d = parse(row.data); d.profile = {...(d.profile || {}), name: clean(b.name, 100) || d.profile?.name, phone: clean(b.phone, 40)};
      await db.batch([q(db, 'UPDATE law_accounts SET data=? WHERE id=?', JSON.stringify(d), id.slice(4)), audit(db, actor, 'account.profile', id)]);
      return json({ok: true});
    }
    const p = await one(db, "SELECT * FROM people WHERE id=? AND role!='owner'", id); if (!p) fail(404, 'Hesap bulunamadı.');
    const meta = (await getItem(db, 'meta-' + id))?.data || {type: p.role === 'customer' ? 'customer' : 'other'};
    const loc = b.country ? locate(clean(b.country, 60), clean(b.city, 80)) : null;
    Object.assign(meta, {phone: clean(b.phone, 40), company: clean(b.company, 200), title: clean(b.title, 100)});
    if (b.extra && typeof b.extra === 'object') {
      const e = b.extra, bool = k => !!e[k], str = (k, n) => clean(e[k], n);
      meta.extra = {kind: e.kind === 'kurumsal' ? 'kurumsal' : 'bireysel', birthDate: /^\d{4}-\d{2}-\d{2}$/.test(e.birthDate || '') ? e.birthDate : '', idNumber: str('idNumber', 40), taxNumber: str('taxNumber', 40), taxOffice: str('taxOffice', 100), landline: str('landline', 40), language: ['tr', 'pt', 'en'].includes(e.language) ? e.language : 'tr', currency: /^[A-Z]{3}$/.test(e.currency || '') ? e.currency : '', taxExempt: bool('taxExempt'), noSuspend: bool('noSuspend'), noCancel: bool('noCancel'), separateInvoice: bool('separateInvoice'), noLateFee: bool('noLateFee'), blocked: bool('blocked'), notifyMail: Array.isArray(e.notifyMail) ? e.notifyMail.slice(0, 10).map(x => clean(x, 20)) : [], notifySms: Array.isArray(e.notifySms) ? e.notifySms.slice(0, 10).map(x => clean(x, 20)) : []};
    }
    if (b.status && p.status !== (b.status === 'active' ? 'active' : 'disabled')) await q(db, 'UPDATE people SET status=? WHERE id=?', b.status === 'active' ? 'active' : 'disabled', id).run();
    if (loc) Object.assign(meta, {country: loc.country, city: loc.city, lat: loc.lat ?? null, lng: loc.lng ?? null});
    const prof = (await getItem(db, 'profile-' + id))?.data || {};
    const name = clean(b.name, 100) || p.name;
    await db.batch([putItem(db, 'meta-' + id, 'account_meta', id, meta), putItem(db, 'profile-' + id, 'profile', id, {...prof, name, phone: meta.phone, company: meta.company}), q(db, 'UPDATE people SET name=? WHERE id=?', name, id), audit(db, actor, 'account.profile', id)]);
    return json({ok: true});
  }
  if (route === 'accounts/impersonate' && req.method === 'POST') {
    const id = clean(b.id, 80);
    let email, lawId = null;
    if (id.startsWith('law:')) { const r = await one(db, "SELECT * FROM law_accounts WHERE id=? AND role!='owner'", id.slice(4)); if (!r) fail(404, 'Hesap bulunamadı.'); if (r.status !== 'active') fail(400, 'Hesap pasif; önce aktif yapın.'); email = r.email; lawId = r.id; }
    else { const p = await one(db, "SELECT * FROM people WHERE id=? AND role!='owner'", id); if (!p) fail(404, 'Hesap bulunamadı.'); if (p.status !== 'active') fail(400, 'Hesap pasif; önce aktif yapın.'); email = p.email; }
    let u = await one(db, 'SELECT * FROM auth_users WHERE email=?', email);
    if (!u) u = await newAuthUser(db, email, null, true);
    if (lawId) await q(db, 'UPDATE law_accounts SET uid=? WHERE id=? AND uid IS NULL', u.id, lawId).run();
    else await q(db, "UPDATE people SET uid=? WHERE id=? AND (uid IS NULL OR uid='')", u.id, id).run();
    const token = await createToken(db, u.id, 'impersonate', 0.05);
    await audit(db, actor, 'account.impersonate', id).run();
    return json({ok: true, url: siteUrl(req) + '/api/auth/impersonate?t=' + encodeURIComponent(token)});
  }
  if (route === 'accounts/notes' && req.method === 'POST') {
    const id = clean(b.id, 80); if (!id) fail(400, 'Hesap gerekli.');
    const rec = (await getItem(db, 'acnotes-' + id))?.data || {notes: []};
    if (b.remove) rec.notes = rec.notes.filter(n => n.id !== b.remove);
    else { const text = clean(b.text, 2000); if (!text) fail(400, 'Not boş olamaz.'); rec.notes.unshift({id: uuid().slice(0, 12), text, at: now(), by: actor}); rec.notes = rec.notes.slice(0, 200); }
    await putItem(db, 'acnotes-' + id, 'account_notes', id, rec).run();
    return json({ok: true, notes: rec.notes});
  }

  if (route === 'partners' && req.method === 'GET') {
    const list = await rows(db, "SELECT * FROM items WHERE kind='partner' ORDER BY updated DESC");
    return json({partners: list.map(r => { const d = parse(r.data); return {id: r.owner, company: d.company, name: d.name, email: d.email, taxOffice: d.taxOffice, taxNumber: d.taxNumber, services: d.services, status: d.status, reason: d.reason, check: d.check || null, docs: Object.fromEntries(Object.entries(d.docs).map(([k, v]) => [k, {name: v.name, status: v.status, at: v.at, mime: v.mime}])), kyc: d.kyc ? {status: d.kyc.status} : null, history: d.history.slice(-12), updated: r.updated}; }), didit: diditReady(env), labels: Object.fromEntries(Object.entries(PARTNER_DOCS).map(([k, v]) => [k, v.title]))});
  }
  if (route === 'partners/review' && req.method === 'POST') {
    const id = clean(b.id, 80), rec = await getItem(db, 'partner-' + id); if (!rec) fail(404, 'Başvuru bulunamadı.');
    const decision = b.decision;
    if (decision === 'approve') { rec.data.status = 'approved'; rec.data.approvedBy = actor; rec.data.reason = ''; rec.data.history.push({at: now(), text: 'Admin tarafından onaylandı'}); }
    else if (decision === 'reject') { const reason = clean(b.reason, 1000); if (!reason) fail(400, 'Ret gerekçesi yazın.'); rec.data.status = 'rejected'; rec.data.reason = reason; rec.data.history.push({at: now(), text: 'Reddedildi: ' + reason}); }
    else if (decision === 'recheck') { if (ctx.after) ctx.after(() => runPartnerVerification(env, id)); rec.data.status = 'queued'; rec.data.history.push({at: now(), text: 'Yeniden otomatik kontrol istendi'}); }
    else fail(400, 'Karar geçersiz.');
    await db.batch([putItem(db, rec.id, 'partner', id, rec.data), notice(db, id, decision === 'approve' ? 'Partner hesabınız onaylandı.' : decision === 'reject' ? 'Belgelerinizde düzeltme gerekiyor: ' + rec.data.reason : 'Belgeleriniz yeniden kontrol ediliyor.', 'overview'), audit(db, actor, 'partner.' + decision, id)]);
    return json({ok: true});
  }
  if (route.startsWith('partners/file/') && req.method === 'GET') {
    const [, , id, doc] = route.split('/'); const p = await partnerState(db, id);
    if (!p?.docs[doc]) fail(404, 'Dosya bulunamadı.');
    return streamFile(env, p.docs[doc]);
  }

  if (route === 'meet' && req.method === 'GET') { const m0 = (await getItem(db, 'integration-meet'))?.data || {mode: 'fixed', active: true}; return json({meet: {...m0, secret: m0.secret ? '••••••' : ''}, mail: mailConfigured()}); }
  if (route === 'meet' && req.method === 'POST') {
    const mode = b.mode === 'webhook' ? 'webhook' : 'fixed';
    const link = clean(b.link, 200), webhook = clean(b.webhook, 500);
    if (link && !/^https:\/\/meet\.google\.com\/[a-z0-9-]+$/i.test(link)) fail(400, 'Meet linki https://meet.google.com/abc-defg-hij biçiminde olmalı.');
    if (mode === 'webhook' && !/^https:\/\//.test(webhook)) fail(400, 'API / webhook adresi https:// ile başlamalı.');
    if (b.notifyEmail && !validEmail(clean(b.notifyEmail, 254))) fail(400, 'Bildirim e-postası geçersiz.');
    const old = (await getItem(db, 'integration-meet'))?.data || {};
    const data = {mode, link, webhook, secret: b.secret === undefined || b.secret === '••••••' ? old.secret || '' : clean(b.secret, 200), notifyEmail: clean(b.notifyEmail, 254), active: b.active !== false, updated: now()};
    await db.batch([putItem(db, 'integration-meet', 'integration', 'site', data), audit(db, actor, 'integration.meet', mode)]);
    return json({ok: true});
  }
  if (route === 'bookings' && req.method === 'GET') {
    const list = await rows(db, "SELECT * FROM items WHERE kind='booking' ORDER BY json_extract(data,'$.start') DESC LIMIT 500");
    return json({bookings: list.map(r => ({id: r.id, ...parse(r.data), created: r.created}))});
  }
  if (route === 'bookings' && req.method === 'PATCH') {
    const r0 = await getItem(db, clean(b.id, 80)); if (!r0 || r0.kind !== 'booking') fail(404, 'Görüşme bulunamadı.');
    const status = ['Planlandı', 'Tamamlandı', 'İptal', 'Gelmedi'].includes(b.status) ? b.status : r0.data.status;
    await putItem(db, r0.id, 'booking', 'owner', {...r0.data, status, adminNote: clean(b.adminNote ?? r0.data.adminNote, 1000)}).run();
    return json({ok: true});
  }
  if (route === 'leads' && req.method === 'GET') {
    const list = await rows(db, "SELECT * FROM items WHERE kind='lead' ORDER BY updated DESC LIMIT 500");
    return json({leads: list.map(r => ({id: r.id, ...parse(r.data), updated: r.updated}))});
  }
  if (route === 'modules' && req.method === 'GET') {
    const list = (await rows(db, "SELECT * FROM items WHERE kind='panel_module' ORDER BY created")).map(r => ({id: r.id, ...parse(r.data)}));
    return json({modules: list, builtins: (await getItem(db, 'panel-builtins'))?.data || {}});
  }
  if (route === 'modules' && req.method === 'POST') {
    const panels = (Array.isArray(b.panels) ? b.panels : []).filter(p => PANELS[p]); if (!panels.length) fail(400, 'En az bir panel seçin.');
    const title = clean(b.title, 60); if (!title) fail(400, 'Modül adı gerekli.');
    const type = ['content', 'link', 'embed'].includes(b.type) ? b.type : 'content';
    let url = clean(b.url, 1000);
    if (type !== 'content') { try { const x = new URL(url); if (x.protocol !== 'https:') throw 0; url = x.href; } catch { fail(400, 'Bağlantı https:// ile başlamalı.'); } }
    const id = b.id && String(b.id).startsWith('mod-') ? clean(b.id, 80) : 'mod-' + uuid();
    await db.batch([putItem(db, id, 'panel_module', 'site', {title, icon: clean(b.icon, 20) || 'file', type, content: clean(b.content, 20000), url, panels, order: Number(b.order) || 0, active: b.active !== false}), audit(db, actor, 'module.save', title)]);
    return json({ok: true, id});
  }
  if (route.startsWith('modules/') && req.method === 'DELETE') {
    const id = clean(route.slice(8), 80);
    await db.batch([q(db, "DELETE FROM items WHERE id=? AND kind='panel_module'", id), audit(db, actor, 'module.delete', id)]);
    return json({ok: true});
  }
  if (route === 'builtins' && req.method === 'POST') {
    const out = {};
    for (const p of Object.keys(PANELS)) out[p] = {hidden: (Array.isArray(b[p]?.hidden) ? b[p].hidden : []).map(x => clean(x, 60)).filter(Boolean).slice(0, 40)};
    await db.batch([putItem(db, 'panel-builtins', 'panel_builtins', 'site', out), audit(db, actor, 'module.builtins', '')]);
    return json({ok: true});
  }
  fail(404, 'İşlem bulunamadı.');
}

// Partners whose documents are not approved yet may only open their profile.
export async function partnerGate(db, req, user, area, route) {
  if (!user) return;
  const p = await one(db, "SELECT id FROM people WHERE uid=? AND role='advisor'", user.id); if (!p) return;
  const st = await partnerState(db, p.id); if (!st || st.status === 'approved') return;
  const allowed = area === 'workspace' && ((route === 'bootstrap' && req.method === 'GET') || (route === 'profile' && req.method === 'POST') || (route === 'notices' && req.method === 'POST'));
  if (!allowed) fail(403, 'Partner hesabınız onay bekliyor. Belgeleriniz onaylanana kadar yalnızca profilinizi düzenleyebilirsiniz.', {limited: true});
}
