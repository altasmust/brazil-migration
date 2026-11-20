// Faz 5 · KVKK / LGPD / GDPR araçları: aydınlatma metni üretici + herkese açık sayfa, rıza kaydı, veri dışa aktarma, silme/anonimleştirme, talep takibi, denetim izi.
//  • Rıza kayıtları (`consent`): kim, ne zaman, hangi metin sürümü, hangi kanaldan; geri çekilebilir (yeni kayıt olarak eklenir — geçmiş silinmez).
//  • Talepler (`privacy_request`): müşteri panelden “verilerimi indir / sil” der; yasal süre (30 gün; LGPD için 15 gün) hesaplanır, yönetici sonuçlandırır.
//  • Silme = anonimleştirme: kişisel içerik ve belge dosyaları silinir; yasal saklama yükümlülüğü olan mali kayıtlar (fatura, ödeme, sözleşme, teklif, ödeme planı)
//    ve denetim izi kalır, kişi alanları anonimleşir. Silinen/saklanan kayıtların dökümü yöneticiye gösterilir.
//  • Metin üretici hukuki tavsiye değildir; arayüz bunu açıkça belirtir.
import {fail, clean, now, uuid, validEmail, currentUser} from './auth.mjs';
import {currentTenant} from './tenant-context.mjs';
import {json, parse, all, first, put, get, stmt, readBody, notice, DAY, csvResponse, rateLimited} from './kit.mjs';

export const REGIONS = {kvkk: 'KVKK (Türkiye)', lgpd: 'LGPD (Brezilya)', gdpr: 'GDPR (AB / Portekiz)'};
export const NOTICE_VERSION = 1;
const DEFAULTS = {legalName: '', address: '', contactEmail: '', dpo: '', regions: ['kvkk', 'lgpd'], processors: 'Barındırma/veritabanı (bulut), e-posta gönderimi, ödeme kuruluşları (Pix/boleto/kart sağlayıcıları), çeviri ve konuşma tanıma hizmetleri', retention: 'Hesap ve dosya verileri hesabınız açık kaldığı sürece; mali kayıtlar ilgili mevzuattaki süre (genellikle 5–10 yıl) boyunca saklanır.', aiUse: false};
const firmName = () => { const t = currentTenant(); return t.isDefault ? 'Brazil Migration' : t.name || 'Danışmanlık firması'; };
export const privacyConfig = async db => { const r = await first(db, "SELECT data FROM items WHERE id='config-privacy'"); return {...DEFAULTS, ...(r ? parse(r.data) : {})}; };

// ---------------- Aydınlatma metni üretici (tr / en / pt) ----------------
const T = {
  tr: {title: 'Kişisel Verilerin Korunması ve Aydınlatma Metni', ctrl: 'Veri sorumlusu', cats: 'İşlenen veri kategorileri', purp: 'İşleme amaçları ve hukuki sebepler', recv: 'Verilerin aktarıldığı taraflar', ret: 'Saklama süresi', rights: 'Haklarınız ve başvuru yolu', transfer: 'Yurt dışına aktarım', cookies: 'Çerezler',
    catsList: ['Kimlik ve iletişim bilgileri (ad, e-posta, telefon, ülke/şehir)', 'Başvuru ve dosya bilgileri, yüklediğiniz belgeler', 'Mali işlem bilgileri (teklif, sözleşme, fatura, ödeme kayıtları)', 'İletişim kayıtları (panel mesajları, e-postalar) ve çevirili görüşme dökümleri', 'Teknik veriler (IP adresi, tarayıcı bilgisi, oturum kayıtları)'],
    purpList: ['Danışmanlık hizmetinin ve başvuru sürecinin yürütülmesi (sözleşmenin ifası)', 'Mali ve hukuki yükümlülüklerin yerine getirilmesi (hukuki yükümlülük)', 'Hizmet güvenliği, hata ve kötüye kullanımın önlenmesi (meşru menfaat)', 'Duyuru ve bülten gönderimi (yalnızca açık rızanızla)'],
    ai: 'Bu firma, mesaj ve belge işlemlerinde yapay zekâ destekli bir hizmet kullanabilir; çıktılar yetkili danışman onayından geçer.', tr: 'Verileriniz, hizmet sağlayıcıların sunucuları nedeniyle yurt dışında işlenebilir; aktarım ilgili mevzuattaki güvencelere (açık rıza, standart sözleşme hükümleri vb.) dayanır.',
    rightsIntro: 'Aşağıdaki haklarınızı kullanabilirsiniz:', rl: {kvkk: 'KVKK m.11: verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, düzeltme, silme/yok etme, aktarılan üçüncü kişileri öğrenme, itiraz ve zarar giderim talep etme.', lgpd: 'LGPD m.18: onay, erişim, düzeltme, anonimleştirme/silme, taşınabilirlik, aktarımlar hakkında bilgi, rızanın geri alınması.', gdpr: 'GDPR m.15–22: erişim, düzeltme, silme, işlemeyi kısıtlama, taşınabilirlik, itiraz; denetim otoritesine şikâyet hakkı.'},
    how: 'Taleplerinizi panelinizdeki “Verilerim ve gizlilik” sayfasından (veri indirme, silme talebi, rıza yönetimi) ya da aşağıdaki e-posta adresinden iletebilirsiniz. Talepler en geç 30 gün içinde (LGPD kapsamında 15 gün) yanıtlanır.', cookie: 'Çerez tercihleri için çerez politikamıza bakın.', disc: 'Bu metin bir şablondur; yayımlamadan önce hukuk danışmanınıza onaylatın.'},
  en: {title: 'Privacy Notice', ctrl: 'Data controller', cats: 'Categories of data we process', purp: 'Purposes and legal bases', recv: 'Recipients of data', ret: 'Retention', rights: 'Your rights and how to exercise them', transfer: 'International transfers', cookies: 'Cookies',
    catsList: ['Identity and contact data (name, e-mail, phone, country/city)', 'Case information and documents you upload', 'Financial records (quotes, contracts, invoices, payments)', 'Communications (panel messages, e-mails) and translated-meeting transcripts', 'Technical data (IP address, browser data, session logs)'],
    purpList: ['Providing the advisory service and handling your case (performance of a contract)', 'Complying with financial and legal obligations (legal obligation)', 'Security, fraud and abuse prevention (legitimate interest)', 'Announcements and newsletters (only with your consent)'],
    ai: 'This firm may use AI-assisted tools for messages and documents; every output is reviewed and approved by an authorised advisor.', tr: 'Your data may be processed outside your country because of our service providers’ servers; transfers rely on the safeguards required by law (consent, standard contractual clauses, etc.).',
    rightsIntro: 'You may exercise the following rights:', rl: {kvkk: 'KVKK art. 11: learn whether data is processed, request information, rectification, deletion/destruction, know recipients, object and claim damages.', lgpd: 'LGPD art. 18: confirmation, access, correction, anonymisation/deletion, portability, information on transfers, withdrawal of consent.', gdpr: 'GDPR arts. 15–22: access, rectification, erasure, restriction, portability, objection; right to complain to a supervisory authority.'},
    how: 'Send requests from the “My data & privacy” page in your panel (download your data, request deletion, manage consent) or by e-mail at the address below. We respond within 30 days (15 days under LGPD).', cookie: 'See our cookie policy for cookie choices.', disc: 'This text is a template; have your legal counsel review it before publishing.'},
  pt: {title: 'Aviso de Privacidade', ctrl: 'Controlador', cats: 'Categorias de dados tratados', purp: 'Finalidades e bases legais', recv: 'Destinatários dos dados', ret: 'Prazo de armazenamento', rights: 'Seus direitos e como exercê-los', transfer: 'Transferência internacional', cookies: 'Cookies',
    catsList: ['Dados de identificação e contato (nome, e-mail, telefone, país/cidade)', 'Dados do processo e documentos enviados por você', 'Registros financeiros (propostas, contratos, faturas, pagamentos)', 'Comunicações (mensagens do painel, e-mails) e transcrições de reuniões traduzidas', 'Dados técnicos (endereço IP, navegador, registros de sessão)'],
    purpList: ['Prestação do serviço de consultoria e andamento do seu processo (execução de contrato)', 'Cumprimento de obrigações financeiras e legais (obrigação legal)', 'Segurança e prevenção de fraudes e abusos (legítimo interesse)', 'Comunicados e newsletters (somente com seu consentimento)'],
    ai: 'Esta empresa pode usar ferramentas com IA em mensagens e documentos; toda saída é revisada e aprovada por um consultor autorizado.', tr: 'Seus dados podem ser tratados fora do seu país devido aos servidores de nossos prestadores; as transferências seguem as salvaguardas legais (consentimento, cláusulas contratuais padrão etc.).',
    rightsIntro: 'Você pode exercer os seguintes direitos:', rl: {kvkk: 'KVKK art. 11: saber se há tratamento, solicitar informações, retificação, exclusão, conhecer destinatários, opor-se e pedir reparação.', lgpd: 'LGPD art. 18: confirmação, acesso, correção, anonimização/eliminação, portabilidade, informação sobre compartilhamentos, revogação do consentimento.', gdpr: 'GDPR arts. 15–22: acesso, retificação, apagamento, limitação, portabilidade, oposição; direito de reclamar à autoridade de controle.'},
    how: 'Envie solicitações pela página “Meus dados e privacidade” do seu painel (baixar dados, pedir exclusão, gerenciar consentimento) ou pelo e-mail abaixo. Respondemos em até 30 dias (15 dias pela LGPD).', cookie: 'Veja nossa política de cookies para escolher suas preferências.', disc: 'Este texto é um modelo; peça a revisão do seu assessor jurídico antes de publicar.'},
};
export function buildNotice(cfg, lang = 'tr', name = firmName()) {
  const L = T[lang] || T.tr, regions = (cfg.regions || []).filter(r => REGIONS[r]);
  const processors = String(cfg.processors || '').trim();
  const sections = [
    {h: L.ctrl, p: [[cfg.legalName || name, cfg.address, cfg.contactEmail && (lang === 'pt' ? 'E-mail: ' : lang === 'en' ? 'E-mail: ' : 'E-posta: ') + cfg.contactEmail, cfg.dpo && ((lang === 'tr' ? 'Veri koruma sorumlusu / temsilci: ' : lang === 'pt' ? 'Encarregado (DPO): ' : 'Data protection contact (DPO): ') + cfg.dpo)].filter(Boolean).join(' · ')]},
    {h: L.cats, list: L.catsList}, {h: L.purp, list: L.purpList},
    {h: L.recv, p: [processors + (cfg.aiUse ? ' · ' + L.ai : '')].filter(Boolean)}, {h: L.transfer, p: [L.tr]},
    {h: L.ret, p: [cfg.retention]},
    {h: L.rights, p: [L.rightsIntro], list: regions.map(r => L.rl[r]), after: [L.how]},
    {h: L.cookies, p: [L.cookie]},
  ];
  return {title: L.title, firm: cfg.legalName || name, lang, version: NOTICE_VERSION, sections, disclaimer: L.disc};
}

// ---------------- Rıza kaydı ----------------
export const consentStmt = (db, {owner, email, type, granted = true, source, text}) => stmt(db, 'cn-' + uuid(), 'consent', owner || 'email:' + String(email || '').toLowerCase(), {type, granted: !!granted, source: clean(source, 40), version: NOTICE_VERSION, at: now(), text: clean(text, 300)});
export const recordConsent = (db, o) => consentStmt(db, o).run();
const latestConsent = async (db, owner, email, type) => { const r = await first(db, "SELECT data FROM items WHERE kind='consent' AND owner IN (?,?) AND json_extract(data,'$.type')=? ORDER BY created DESC, rowid DESC LIMIT 1", owner, 'email:' + String(email).toLowerCase(), type); return r ? parse(r.data) : null; };

// ---------------- Dışa aktarma ve silme ----------------
const STRIP = new Set(['key', 'url', 'token']);
const clip = d => { const o = {}; for (const [k, v] of Object.entries(d || {})) if (!STRIP.has(k)) o[k] = v; return o; };
export async function exportPerson(db, personId) {
  const p = await first(db, 'SELECT id, email, name, role, status, created FROM people WHERE id=?', personId); if (!p) fail(404, 'Kişi bulunamadı.');
  const own = (await all(db, "SELECT id, kind, data, created FROM items WHERE owner=? AND kind<>'audit' ORDER BY created", p.id)).map(r => ({id: r.id, kind: r.kind, created: r.created, data: clip(parse(r.data))}));
  const byEmail = async kind => (await all(db, "SELECT id, data, created FROM items WHERE kind=? AND lower(json_extract(data,'$.email'))=?", kind, p.email.toLowerCase())).map(r => ({id: r.id, created: r.created, data: clip(parse(r.data))}));
  const consents = (await all(db, "SELECT data FROM items WHERE kind='consent' AND (owner=? OR owner=?) ORDER BY created", p.id, 'email:' + p.email.toLowerCase())).map(r => parse(r.data));
  return {exportedAt: new Date().toISOString(), format: 'Brazil Migration veri dışa aktarma v1', person: {...p, created: new Date(p.created).toISOString()}, records: own, leads: await byEmail('lead'), quotes: await byEmail('quote'), contracts: (await byEmail('contract')).map(c => ({...c, data: {...c.data, body: undefined}})), consents,
    note: 'Belge dosyalarının kendisi bu pakete dahil değildir; panelinizin Belgeler bölümünden indirebilirsiniz (yalnız ad/tür/durum bilgisi listelenir).'};
}
const RETAIN = ['invoice', 'payment', 'contract', 'quote', 'pay_plan', 'audit', 'consent'];
// Anonimleştirir: kişisel içerik + belge dosyaları silinir; mali/hukuki kayıtlar kalır. Rapor döner.
export async function erasePerson(db, bucket, personId, actor) {
  const p = await first(db, "SELECT * FROM people WHERE id=? AND role='customer'", personId); if (!p) fail(404, 'Müşteri bulunamadı.');
  const items = await all(db, 'SELECT id, kind, data FROM items WHERE owner=?', p.id), report = {deleted: {}, retained: {}, files: 0};
  for (const it of items) {
    if (RETAIN.includes(it.kind)) { report.retained[it.kind] = (report.retained[it.kind] || 0) + 1; continue; }
    if (it.kind === 'document') { const k = parse(it.data).key; if (k && bucket) { try { await bucket.delete(k); report.files++; } catch {} } }
    report.deleted[it.kind] = (report.deleted[it.kind] || 0) + 1;
  }
  const email = p.email.toLowerCase(), ops = [
    db.prepare("DELETE FROM items WHERE owner=? AND kind NOT IN ('invoice','payment','contract','quote','pay_plan','audit','consent')").bind(p.id),
    db.prepare("DELETE FROM items WHERE kind IN ('lead','lang_pref','pref') AND (lower(json_extract(data,'$.email'))=? OR owner=? OR id=?)").bind(email, email, 'lang:' + email),
    db.prepare("DELETE FROM items WHERE kind='mail_log' AND (owner=? OR owner=?)").bind(p.id, 'email:' + email),
    db.prepare("DELETE FROM items WHERE kind='ai_draft' AND owner=?").bind(p.id),
    db.prepare('DELETE FROM auth_sessions WHERE user=?').bind(p.uid || ''), db.prepare('DELETE FROM auth_tokens WHERE user=?').bind(p.uid || ''), db.prepare('DELETE FROM auth_users WHERE id=?').bind(p.uid || ''),
    db.prepare("UPDATE people SET name='Silinen kullanıcı', email=?, uid=NULL, status='deleted' WHERE id=?").bind(`deleted-${p.id}@silindi.invalid`, p.id),
    db.prepare("UPDATE items SET owner=? WHERE kind='consent' AND owner=?").bind(p.id, 'email:' + email),
    db.prepare("UPDATE items SET data=json_remove(data,'$.email','$.phone') WHERE kind='consent' AND owner=?").bind(p.id),
    stmt(db, 'ad-' + uuid(), 'audit', 'owner', {actor, action: 'privacy.erase', target: p.id}),
  ];
  await db.batch(ops); return report;
}

// ---------------- Herkese açık + oturumlu müşteri uçları (handleAuth) ----------------
export async function privacyPublic(req, db, route) {
  if (!route.startsWith('privacy/')) return null;
  const url = new URL(req.url);
  if (route === 'privacy/notice' && req.method === 'GET') {
    const lang = ['tr', 'en', 'pt'].includes(url.searchParams.get('lang')) ? url.searchParams.get('lang') : 'tr';
    return json(buildNotice(await privacyConfig(db), lang));
  }
  const u = await currentUser(db, req); if (!u) fail(401, 'Giriş gerekli.');
  const p = await first(db, "SELECT id, name, email FROM people WHERE uid=? AND role='customer' AND status='active'", u.id); if (!p) fail(403, 'Bu sayfa müşteri hesapları içindir.');
  const body = async () => (req.method === 'GET' ? {} : await readBody(req, 20000));
  if (route === 'privacy/me' && req.method === 'GET') {
    const reqs = (await all(db, "SELECT id, data, created FROM items WHERE kind='privacy_request' AND owner=? ORDER BY created DESC LIMIT 20", p.id)).map(r => ({id: r.id, ...parse(r.data), created: r.created}));
    const consents = (await all(db, "SELECT data FROM items WHERE kind='consent' AND owner IN (?,?) ORDER BY created DESC, rowid DESC LIMIT 30", p.id, 'email:' + p.email.toLowerCase())).map(r => parse(r.data));
    return json({person: {name: p.name, email: p.email}, requests: reqs, consents, marketing: !!(await latestConsent(db, p.id, p.email, 'marketing'))?.granted, contact: (await privacyConfig(db)).contactEmail || ''});
  }
  if (route === 'privacy/me/consent' && req.method === 'POST') {
    const b = await body(); if (b.type !== 'marketing') fail(400, 'Geçersiz rıza türü.');
    await recordConsent(db, {owner: p.id, type: 'marketing', granted: !!b.granted, source: 'panel', text: 'Duyuru/bülten e-postaları'}); return json({ok: true, marketing: !!b.granted});
  }
  if (route === 'privacy/me/export' && req.method === 'GET') {
    if (rateLimited('pexp:' + p.id, 5, 3600e3)) fail(429, 'Çok fazla istek. Lütfen daha sonra tekrar deneyin.');
    const data = await exportPerson(db, p.id); await put(db, 'ad-' + uuid(), 'audit', 'owner', {actor: p.name, action: 'privacy.export.self', target: p.id});
    return new Response(JSON.stringify(data, null, 2), {headers: {'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="verilerim.json"', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff'}});
  }
  if (route === 'privacy/me/request' && req.method === 'POST') {
    const b = await body(), type = b.type === 'delete' ? 'delete' : b.type === 'rectify' ? 'rectify' : null; if (!type) fail(400, 'Geçersiz talep türü.');
    const open = await first(db, "SELECT id FROM items WHERE kind='privacy_request' AND owner=? AND json_extract(data,'$.type')=? AND json_extract(data,'$.status')='open'", p.id, type); if (open) fail(409, 'Bu türde bekleyen bir talebiniz zaten var.');
    const days = (await privacyConfig(db)).regions.includes('lgpd') ? 15 : 30, id = 'pr-' + uuid(); // uygulanan en sıkı süre
    await put(db, id, 'privacy_request', p.id, {type, status: 'open', at: now(), due: now() + days * DAY, note: clean(b.note, 1000), email: p.email, name: p.name});
    await notice(db, 'owner', `Veri talebi: ${p.name} · ${type === 'delete' ? 'silme' : 'düzeltme'}`, 'gizlilik');
    await put(db, 'ad-' + uuid(), 'audit', 'owner', {actor: p.name, action: 'privacy.request.' + type, target: p.id});
    return json({ok: true, id, due: now() + days * DAY});
  }
  return null;
}

// ---------------- Yönetici uçları ----------------
export async function privacyAdmin(req, db, route, ctx = {}) {
  if (!route.startsWith('privacy/')) return null;
  const {audit, actor, bucket} = ctx, log = async (a, t) => { try { if (audit) await audit(db, actor, a, t).run(); } catch {} };
  const url = new URL(req.url), body = async () => (req.method === 'GET' ? {} : await readBody(req, 30000));
  const people = async () => new Map((await all(db, "SELECT id, name, email FROM people LIMIT 8000")).map(p => [p.id, p]));

  if (route === 'privacy/settings' && req.method === 'GET') { const c = await privacyConfig(db); return json({config: c, regions: REGIONS, firm: firmName(), preview: buildNotice(c, url.searchParams.get('lang') || 'tr')}); }
  if (route === 'privacy/settings' && req.method === 'POST') {
    const b = await body(), c = {legalName: clean(b.legalName, 160), address: clean(b.address, 300), contactEmail: clean(b.contactEmail, 254).toLowerCase(), dpo: clean(b.dpo, 200), regions: (Array.isArray(b.regions) ? b.regions : []).filter(r => REGIONS[r]), processors: clean(b.processors, 600), retention: clean(b.retention, 600), aiUse: !!b.aiUse};
    if (c.contactEmail && !validEmail(c.contactEmail)) fail(400, 'Geçerli bir iletişim e-postası girin.'); if (!c.regions.length) fail(400, 'En az bir mevzuat seçin.');
    await put(db, 'config-privacy', 'config', 'owner', c); await log('privacy.settings', c.regions.join(',')); return json({ok: true, preview: buildNotice({...DEFAULTS, ...c}, 'tr')});
  }
  if (route === 'privacy/requests' && req.method === 'GET') {
    const st = clean(url.searchParams.get('status'), 10) || 'open', t = Date.now();
    const rows = (await all(db, "SELECT id, owner, data, created FROM items WHERE kind='privacy_request' ORDER BY created DESC LIMIT 300")).map(r => ({id: r.id, owner: r.owner, ...parse(r.data), created: r.created})).filter(r => st === 'all' || r.status === st);
    return json({requests: rows.map(r => ({...r, overdue: r.status === 'open' && r.due < t, daysLeft: Math.ceil((r.due - t) / DAY)}))});
  }
  if (route === 'privacy/requests/resolve' && req.method === 'POST') {
    const b = await body(), r = await get(db, clean(b.id, 80), 'privacy_request'); if (!r || r.d.status !== 'open') fail(404, 'Talep bulunamadı veya kapalı.');
    const action = b.action === 'reject' ? 'reject' : 'done'; let report = null;
    if (action === 'done' && r.d.type === 'delete') { if (clean(b.confirm, 10).toUpperCase() !== 'SİL' && clean(b.confirm, 10).toUpperCase() !== 'SIL') fail(400, 'Silme için onay kutusuna SİL yazın.'); report = await erasePerson(db, bucket, r.owner, actor); }
    if (action === 'reject' && !clean(b.note, 500)) fail(400, 'Ret gerekçesi yazın (talep sahibine bildirilebilmesi için).');
    await put(db, r.id, 'privacy_request', r.owner, {...r.d, status: action === 'done' ? 'done' : 'rejected', doneAt: now(), result: clean(b.note, 500), report, by: actor});
    if (!(action === 'done' && r.d.type === 'delete')) await notice(db, r.owner, action === 'done' ? 'Veri talebiniz tamamlandı.' : 'Veri talebiniz değerlendirildi: ' + clean(b.note, 200), 'gizlilik');
    await log('privacy.request.' + action, r.d.type); return json({ok: true, report});
  }
  if (route === 'privacy/export' && req.method === 'GET') {
    const id = clean(url.searchParams.get('person'), 80), data = await exportPerson(db, id); await log('privacy.export', id);
    return new Response(JSON.stringify(data, null, 2), {headers: {'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="veri-disa-aktarma.json"', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff'}});
  }
  if (route === 'privacy/erase' && req.method === 'POST') {
    const b = await body(); if (!['SİL', 'SIL'].includes(clean(b.confirm, 10).toUpperCase())) fail(400, 'Silme için onay kutusuna SİL yazın.');
    const report = await erasePerson(db, bucket, clean(b.person, 80), actor); return json({ok: true, report});
  }
  if ((route === 'privacy/consents' || route === 'privacy/consents.csv') && req.method === 'GET') {
    const type = clean(url.searchParams.get('type'), 30), q = clean(url.searchParams.get('q'), 80).toLowerCase(), pm = await people();
    const rows = (await all(db, "SELECT owner, data, created FROM items WHERE kind='consent' ORDER BY created DESC LIMIT 2000")).map(r => { const d = parse(r.data), p = pm.get(r.owner), em = p?.email || d.email || (String(r.owner).startsWith('email:') ? r.owner.slice(6) : ''); return {who: p?.name || em || '—', email: em, type: d.type, granted: d.granted !== false, source: d.source, version: d.version, at: d.at || r.created}; })
      .filter(x => (!type || x.type === type) && (!q || (x.who + ' ' + x.email).toLowerCase().includes(q)));
    if (route.endsWith('.csv')) return csvResponse('riza-kayitlari.csv', ['Kişi', 'E-posta', 'Tür', 'Durum', 'Kaynak', 'Metin sürümü', 'Tarih'], rows.map(x => [x.who, x.email, x.type, x.granted ? 'Verildi' : 'Geri çekildi', x.source, x.version, new Date(x.at).toISOString()]));
    return json({consents: rows.slice(0, 500), total: rows.length});
  }
  if ((route === 'privacy/audit' || route === 'privacy/audit.csv') && req.method === 'GET') {
    const q = clean(url.searchParams.get('q'), 60).toLowerCase(), rows = (await all(db, "SELECT data, created FROM items WHERE kind='audit' ORDER BY created DESC LIMIT 3000")).map(r => ({...parse(r.data), at: r.created})).filter(x => !q || (String(x.action) + ' ' + String(x.target) + ' ' + String(x.actor)).toLowerCase().includes(q));
    if (route.endsWith('.csv')) return csvResponse('denetim-izi.csv', ['Tarih', 'Kim', 'İşlem', 'Hedef'], rows.map(x => [new Date(x.at).toISOString(), x.actor, x.action, x.target]));
    return json({audit: rows.slice(0, 300).map(x => ({at: x.at, actor: x.actor, action: x.action, target: String(x.target || '').slice(0, 120)})), total: rows.length});
  }
  return null;
}
