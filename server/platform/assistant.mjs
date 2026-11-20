// Faz 4 · AI asistan (onaylı): belge özeti, eksik belge tespiti, müşteri mesajına taslak yanıt, görüşme notundan görev çıkarma.
// İlkeler:
//  • Hiçbir çıktı kendiliğinden müşteriye gitmez veya dosyaya işlenmez: her şey `ai_draft` kaydı olarak “onay bekliyor” durumunda açılır;
//    danışman düzenleyip onaylar ya da reddeder. Onay/ret denetim kaydına yazılır.
//  • Vize/oturum sonucu “garanti” edilmez: model talimatla yönlendirilir ve çıktı ayrıca taranır; garanti ifadesi içeren taslak onaylanamaz.
//  • Anthropic anahtarı (Ayarlar → Yapay Zekâ) yoksa kural tabanlı yedek çalışır (eksik belge listesi, karşılama taslağı, madde çıkarma).
//  • Gizlilik: modele yalnız gerekli bağlam gider (ad, hizmet, aşama, ilgili metin); e-posta/telefon/kimlik numarası gönderilmez.
//    Belge özetinde belge dosyası modele gönderilir — arayüz bunu onaydan önce açıkça belirtir.
import {fail, clean, now, uuid} from './auth.mjs';
import {cfgEnv} from './tenant-context.mjs';
import {json, parse, all, first, put, get, readBody} from './kit.mjs';
import {renderTpl, langOf, sendReply} from './comms.mjs';

export const aiConfigured = () => !!cfgEnv('ANTHROPIC_API_KEY');
const MODEL = () => cfgEnv('AI_ASSIST_MODEL') || cfgEnv('AI_SUMMARY_MODEL') || cfgEnv('AI_VERIFY_MODEL') || 'claude-sonnet-5-5';
const LN = {tr: 'Türkçe', en: 'English', pt: 'Português', fa: 'فارسی'};

// Garanti/kesin sonuç vaadi içeren ifadeler (tr/en/pt/fa).
export const GUARANTEE = /garanti|kesin(likle)?\s+(onay|çıkar|alır|alırsınız|sonuç)|%\s?100|100\s?%|sorunsuz\s+onay|reddedilmez|guarantee|guaranteed|100\s?%|definitely\s+(be\s+)?(approved|granted)|certain(ly)?\s+(to\s+)?(be\s+)?approved|garantid[oa]|garantia|certeza\s+de\s+aprova|aprovação\s+certa|تضمین|قطعاً|حتماً\s+تأیید/i;
export const hasGuarantee = t => GUARANTEE.test(String(t || ''));
const SYSTEM = `Sen bir göçmenlik danışmanlık firmasında çalışan danışmana yardımcı olan bir asistansın. Çıktıların danışman tarafından gözden geçirilip onaylanacak; yine de doğrudan müşteriye gidecekmiş gibi dikkatli yaz.
KESİN KURALLAR: (1) Vize, oturum izni, vatandaşlık veya herhangi bir başvurunun sonucunu ASLA garanti etme; "kesin çıkar", "%100", "sorunsuz onaylanır" gibi ifadeler kullanma. Süre/sonuç için "genellikle", "değerlendirilir" gibi ihtiyatlı dil kullan. (2) Hukuki görüş verme; gerekirse avukat/danışman değerlendirmesine yönlendir. (3) Bilmediğin bilgiyi uydurma; belge, tutar, tarih veya prosedür uydurma. (4) Kısa, nazik, net ol. (5) Müşteriye ait kişisel veriyi (kimlik no, e-posta, telefon) metne ekleme.`;

async function claude(content, max = 900, system = SYSTEM) {
  const key = cfgEnv('ANTHROPIC_API_KEY'); if (!key) return null;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {method: 'POST', signal: AbortSignal.timeout(60000), headers: {'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json'},
      body: JSON.stringify({model: MODEL(), max_tokens: max, system, messages: [{role: 'user', content}]})});
    if (!r.ok) return null;
    return ((await r.json()).content || []).map(c => c.text || '').join('').trim() || null;
  } catch { return null; }
}

// ---- kural tabanlı yedekler ----
const ACTION = /\b(yap|yapın|gönder|gönderin|hazırla|hazırlayın|al|alın|iste|isteyin|kontrol|başvur|randevu|tamamla|ilet|paylaş|yükle|takip|ara|bilgilendir|çevir|apostil|imzala)\w*/i;
export function extractTasks(text) {
  const lines = String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean), out = [], seen = new Set();
  let inTodo = false;
  for (const raw of lines) {
    if (/^(yapılacak|aksiyon|görevler|todo|next steps|action items)/i.test(raw.replace(/^[#=\-\s]+/, ''))) { inTodo = true; continue; }
    const m = raw.match(/^(?:[-•*·]|\d+[.)])\s*(.+)$/), t = (m ? m[1] : raw).replace(/\s+/g, ' ').trim();
    if (t.length < 6 || t.length > 160) continue;
    if (!(m && (inTodo || ACTION.test(t))) && !(inTodo && ACTION.test(t))) continue;
    const key = t.toLowerCase(); if (seen.has(key)) continue; seen.add(key);
    const due = (t.match(/\b(\d{4}-\d{2}-\d{2})\b/) || [])[1] || ''; out.push({title: t.replace(/\b\d{4}-\d{2}-\d{2}\b/, '').replace(/\s{2,}/g, ' ').replace(/[\s,;:(\-]+$/, '').trim() || t, due});
    if (out.length >= 12) break;
  }
  return out;
}

const draftRow = r => ({id: r.id, owner: r.owner, ...parse(r.data), created: r.created});
const OKDOC = /^(application\/pdf|image\/(png|jpe?g|webp|gif))$/;

export async function assistantAdmin(req, db, route, ctx = {}) {
  if (!route.startsWith('ai/')) return null;
  const {audit, actor, bucket} = ctx, log = async (a, t) => { try { if (audit) await audit(db, actor, a, t).run(); } catch {} };
  const url = new URL(req.url), body = async () => (req.method === 'GET' ? {} : await readBody(req, 100000));
  const person = async id => { const p = await first(db, "SELECT id, name, email, role FROM people WHERE id=? AND role='customer'", clean(id, 80)); if (!p) fail(404, 'Müşteri bulunamadı.'); return p; };
  const draft = async (owner, d) => { const id = 'ad-' + uuid(); await put(db, id, 'ai_draft', owner, {status: 'pending', at: now(), by: aiConfigured() && d.ai !== false ? 'ai' : 'rule', ...d, flags: hasGuarantee(d.text || d.title) ? ['guarantee'] : []}); return id; };

  if (route === 'ai/status' && req.method === 'GET') {
    const n = Number((await first(db, "SELECT COUNT(*) AS n FROM items WHERE kind='ai_draft' AND json_extract(data,'$.status')='pending'"))?.n || 0);
    return json({configured: aiConfigured(), model: aiConfigured() ? MODEL() : '', pending: n});
  }
  if (route === 'ai/customers' && req.method === 'GET') {
    const q = clean(url.searchParams.get('q'), 60).toLowerCase();
    const rows = await all(db, "SELECT p.id, p.name, p.email, (SELECT id FROM items a WHERE a.owner=p.id AND a.kind='application' ORDER BY a.created DESC LIMIT 1) AS caseId FROM people p WHERE p.role='customer' ORDER BY p.created DESC LIMIT 500");
    return json({customers: rows.filter(r => !q || (r.name + ' ' + r.email).toLowerCase().includes(q)).slice(0, 80)});
  }
  if (route === 'ai/docs' && req.method === 'GET') {
    const p = await person(url.searchParams.get('customer'));
    return json({docs: (await all(db, "SELECT id, data, created FROM items WHERE kind='document' AND owner=? ORDER BY created DESC LIMIT 60", p.id)).map(r => { const d = parse(r.data); return {id: r.id, title: d.title || d.name || 'Belge', mime: d.mime || '', status: d.status || '', summarized: !!d.aiSummary, summary: d.aiSummary?.text || ''}; })});
  }
  if (route === 'ai/drafts' && req.method === 'GET') {
    const st = clean(url.searchParams.get('status'), 12) || 'pending';
    const rows = await all(db, "SELECT id, owner, data, created FROM items WHERE kind='ai_draft' ORDER BY created DESC LIMIT 300");
    const people = new Map((await all(db, "SELECT id, name, email FROM people WHERE role='customer'")).map(p => [p.id, p]));
    return json({drafts: rows.map(draftRow).filter(d => st === 'all' || d.status === st).map(d => ({...d, customer: people.get(d.owner)?.name || '—'}))});
  }

  // ---- 1) Belge özeti ----
  if (route === 'ai/doc-summary' && req.method === 'POST') {
    const b = await body(), doc = await get(db, clean(b.documentId, 80), 'document'); if (!doc) fail(404, 'Belge bulunamadı.');
    const d = doc.d, title = d.title || d.name || 'Belge'; let text = null, source = 'rule';
    if (aiConfigured() && d.key && OKDOC.test(d.mime || '') && bucket) {
      const obj = await bucket.get(d.key).catch(() => null);
      if (obj) {
        const buf = Buffer.from(await obj.arrayBuffer());
        if (buf.length <= 5 * 1024 * 1024) {
          const block = d.mime === 'application/pdf' ? {type: 'document', source: {type: 'base64', media_type: 'application/pdf', data: buf.toString('base64')}} : {type: 'image', source: {type: 'base64', media_type: d.mime, data: buf.toString('base64')}};
          text = await claude([{type: 'text', text: `Belge adı: ${title}`}, block, {type: 'text', text: 'Bu belgeyi danışman için Türkçe özetle: (1) belge türü ve ne olduğu, (2) üzerindeki temel bilgiler (isim, tarih, geçerlilik/son kullanma, düzenleyen kurum), (3) dikkat edilmesi gerekenler (okunaksız bölüm, süresi geçmiş/yaklaşan tarih, eksik sayfa, apostil/tercüme gerekliliği). En çok 8 madde; düz metin; belgede olmayan bilgiyi yazma. Kimlik/belge numaralarını yazma.'}], 900); if (text) source = 'ai';
        }
      }
    }
    if (!text) text = `Belge: ${title}\nTür: ${d.mime || 'bilinmiyor'}${d.size ? ' · boyut: ' + Math.round(d.size / 1024) + ' KB' : ''}\nDurum: ${d.status || '—'}${d.reason ? '\nNot: ' + d.reason : ''}\n\n(Otomatik içerik özeti için Ayarlar → Yapay Zekâ bölümünden Anthropic anahtarı ekleyin; bu belge türü de desteklenmelidir: PDF/JPG/PNG, en çok 5 MB.)`;
    const id = await draft(doc.owner, {type: 'doc-summary', title: 'Belge özeti: ' + title, text, documentId: doc.id, ai: source === 'ai'});
    await log('ai.draft', 'doc-summary'); return json({ok: true, id, source});
  }

  // ---- 2) Eksik belge tespiti (kural tabanlı; taslak mesaj müşterinin dilinde) ----
  if (route === 'ai/missing' && req.method === 'POST') {
    const b = await body(), app = await get(db, clean(b.caseId, 80), 'application'); if (!app) fail(404, 'Başvuru bulunamadı.');
    const st = await get(db, 'cs-' + app.id, 'case_state'); if (!st) fail(400, 'Bu başvuru için belge listesi yok (dosya şablonu atanmamış).');
    const items = (st.d.checklist || []).filter(c => c.required !== false && c.status !== 'gerekmiyor');
    const missing = items.filter(c => c.status === 'bekleniyor' || c.status === 'reddedildi').map(c => ({id: c.id, name: c.name, status: c.status, note: c.status === 'reddedildi' ? c.note || '' : ''}));
    const p = await first(db, 'SELECT id, name, email FROM people WHERE id=?', app.owner);
    let dr = null;
    if (missing.length && p) {
      const lang = await langOf(db, p.email), r = await renderTpl(db, 'docs.missing', lang, {first: String(p.name || '').split(' ')[0], list: missing.map(m => '• ' + m.name + (m.status === 'reddedildi' ? (lang === 'tr' ? ' (yeniden yüklenmeli' + (m.note ? ': ' + m.note : '') + ')' : lang === 'pt' ? ' (enviar novamente)' : lang === 'fa' ? ' (بارگذاری مجدد)' : ' (upload again)') : '')).join('\n')});
      dr = await draft(app.owner, {type: 'reply', title: 'Eksik belge hatırlatması', text: r.text, subject: r.subject, lang, caseId: app.id, ai: false});
    }
    await log('ai.draft', 'missing'); return json({ok: true, total: items.length, have: items.length - missing.length, missing, draft: dr});
  }

  // ---- 3) Müşteri mesajına taslak yanıt ----
  if (route === 'ai/draft-reply' && req.method === 'POST') {
    const b = await body(), p = await person(b.customerId);
    const tk = await first(db, "SELECT data FROM items WHERE kind='ticket' AND owner=? ORDER BY updated DESC LIMIT 1", p.id);
    const msgs = tk ? parse(tk.data).messages || [] : [], last = [...msgs].reverse().find(m => m.sender === p.name);
    if (!last) fail(400, 'Bu müşterinin yanıtlanacak bir mesajı yok.');
    const lang = await langOf(db, p.email), app = await first(db, "SELECT data FROM items WHERE kind='application' AND owner=? ORDER BY created DESC LIMIT 1", p.id), ad = app ? parse(app.data) : {};
    const first1 = String(p.name || '').split(' ')[0] || '';
    let text = await claude(`Müşteri adı: ${first1}\nHizmet: ${ad.service || '—'}\nDosya aşaması: ${ad.stage ?? ad.status ?? '—'}\nKonu: ${parse(tk.data).subject || ''}\nDanışmanın yazdığı önceki mesajlar (en son 3): ${msgs.filter(m => m.sender !== p.name).slice(-3).map(m => m.text).join(' | ').slice(0, 800) || '—'}\n\nMÜŞTERİNİN SON MESAJI:\n"""${String(last.text).slice(0, 1500)}"""\n\nBu mesaja ${LN[lang]} dilinde, danışman adına kısa bir yanıt taslağı yaz (selamlama + yanıt + gerekiyorsa sonraki adım). Sonuç garantisi verme. Bilmediğin kesin bilgiyi (tarih, tutar, süre) yazma; gerekiyorsa "danışmanınız netleştirecektir" de. Yalnız yanıt metnini yaz.`, 700);
    const src = text ? 'ai' : 'rule';
    if (!text) text = (await renderTpl(db, 'reply.ack', lang, {first: first1})).text;
    const id = await draft(p.id, {type: 'reply', title: 'Yanıt taslağı', text, subject: 'Re: ' + (parse(tk.data).subject || ''), lang, replyTo: String(last.text).slice(0, 300), ai: src === 'ai'});
    await log('ai.draft', 'reply'); return json({ok: true, id, source: src});
  }

  // ---- 4) Görüşme notundan görev çıkarma ----
  if (route === 'ai/tasks' && req.method === 'POST') {
    const b = await body(), text = clean(b.text, 20000); if (text.length < 10) fail(400, 'Görüşme notu çok kısa.');
    let owner = 'owner', caseId = '';
    if (b.caseId) { const app = await get(db, clean(b.caseId, 80), 'application'); if (!app) fail(404, 'Başvuru bulunamadı.'); owner = app.owner; caseId = app.id; }
    else if (b.customerId) owner = (await person(b.customerId)).id;
    let tasks = null;
    const out = await claude(`Aşağıdaki görüşme notundan danışman ekibinin YAPMASI gereken somut görevleri çıkar (en çok 10). Yalnızca notta geçen işleri yaz; uydurma. Bugünün tarihi ${new Date().toISOString().slice(0, 10)}. Notta açık bir tarih varsa YYYY-MM-DD olarak ver, yoksa boş bırak.\nYalnızca JSON dizisi: [{"title":"kısa görev (Türkçe)","due":"YYYY-MM-DD veya boş"}]\n\nNOT:\n"""${text.slice(0, 12000)}"""`, 1200);
    if (out) { try { const m = out.match(/\[[\s\S]*\]/); tasks = JSON.parse(m[0]).filter(t => t && t.title).slice(0, 10).map(t => ({title: clean(t.title, 140), due: /^\d{4}-\d{2}-\d{2}$/.test(String(t.due || '')) ? t.due : ''})); } catch { tasks = null; } }
    const src = tasks ? 'ai' : 'rule'; if (!tasks) tasks = extractTasks(text).map(t => ({title: clean(t.title, 140), due: t.due}));
    if (!tasks.length) return json({ok: true, ids: [], source: src, none: true});
    const ids = []; for (const t of tasks) ids.push(await draft(owner, {type: 'task', title: t.title, text: t.title, due: t.due, caseId, ai: src === 'ai'}));
    await log('ai.draft', 'tasks'); return json({ok: true, ids, source: src});
  }

  // ---- Onay akışı ----
  if (route === 'ai/drafts/update' && req.method === 'POST') {
    const b = await body(), r = await get(db, clean(b.id, 80), 'ai_draft'); if (!r || r.d.status !== 'pending') fail(404, 'Taslak bulunamadı.');
    const d = r.d; if (b.text !== undefined) d.text = clean(b.text, 4000); if (b.title !== undefined) d.title = clean(b.title, 160); if (b.subject !== undefined) d.subject = clean(b.subject, 150); if (b.due !== undefined) d.due = /^\d{4}-\d{2}-\d{2}$/.test(String(b.due)) ? b.due : '';
    d.flags = hasGuarantee(d.text) ? ['guarantee'] : []; await put(db, r.id, 'ai_draft', r.owner, d); return json({ok: true, flags: d.flags});
  }
  if (route === 'ai/drafts/reject' && req.method === 'POST') {
    const b = await body(), r = await get(db, clean(b.id, 80), 'ai_draft'); if (!r || r.d.status !== 'pending') fail(404, 'Taslak bulunamadı.');
    await put(db, r.id, 'ai_draft', r.owner, {...r.d, status: 'rejected', decidedAt: now()}); await log('ai.reject', r.d.type); return json({ok: true});
  }
  if (route === 'ai/drafts/approve' && req.method === 'POST') {
    const b = await body(), r = await get(db, clean(b.id, 80), 'ai_draft'); if (!r || r.d.status !== 'pending') fail(404, 'Taslak bulunamadı veya zaten işlendi.');
    const d = {...r.d}; if (b.text !== undefined) d.text = clean(b.text, 4000); if (b.subject !== undefined) d.subject = clean(b.subject, 150); if (b.due !== undefined) d.due = /^\d{4}-\d{2}-\d{2}$/.test(String(b.due)) ? b.due : '';
    if (!String(d.text || '').trim()) fail(400, 'Metin boş olamaz.');
    if (hasGuarantee(d.text) || hasGuarantee(d.subject)) fail(400, 'Metin sonuç garantisi ifadesi içeriyor. Başvuru sonuçları garanti edilemez; ifadeyi kaldırıp yeniden deneyin.');
    let result = {};
    if (d.type === 'reply') { const ch = b.channel === 'email' ? 'email' : 'app'; result = await sendReply(db, {personId: r.owner, channel: ch, text: d.text, subject: d.subject, actor: (actor || 'Yönetim') + ' (AI taslağı, onaylı)'}); d.channel = ch; }
    else if (d.type === 'task') {
      const due = d.due && /^\d{4}-\d{2}-\d{2}$/.test(d.due) ? d.due : ''; const id = 'ct-' + uuid().slice(0, 8);
      await put(db, id, 'case_task', r.owner, {title: clean(d.text, 140), status: 'todo', due, ...(d.caseId ? {caseId: d.caseId} : {}), created: now(), source: 'ai'}); result = {taskId: id};
    } else if (d.type === 'doc-summary') {
      const doc = await get(db, d.documentId, 'document'); if (!doc) fail(404, 'Belge artık yok.');
      await put(db, doc.id, 'document', doc.owner, {...doc.d, aiSummary: {text: d.text, at: now(), by: actor || 'Yönetim', model: d.by === 'ai' ? MODEL() : 'kural'}}); result = {documentId: doc.id};
    } else fail(400, 'Bilinmeyen taslak türü.');
    await put(db, r.id, 'ai_draft', r.owner, {...d, status: 'approved', decidedAt: now(), approvedBy: actor || 'Yönetim'});
    await log('ai.approve', d.type); return json({ok: true, ...result});
  }
  return null;
}
