// Faz 4 · İletişim: (15) birleşik gelen kutusu — e-posta + uygulama içi mesajlar tek akışta (WhatsApp yok),
// (18) çok dilli otomasyon — müşteriye giden otomatik e-postalar müşterinin dilinde, firma kendi şablonunu yazabilir.
//  • Giden e-postalar `mail_log` kaydı olarak tutulur (alıcı, konu, kısa metin). Bağlantılar/jetonlar ASLA saklanmaz;
//    şifre/doğrulama e-postaları hiç kaydedilmez.
//  • Gelen e-posta yanıtları firmanın kendi posta kutusuna gider (Reply-To); “Gelen e-posta kaydet” ile elle akışa eklenebilir.
//  • Türkçe şablon metinleri eski e-postalarla birebir aynıdır; dil seçilmediyse/bilinmiyorsa Türkçe (firma varsayılanı) kullanılır.
import {fail, clean, now, uuid, validEmail} from './auth.mjs';
import {sendMail} from './mail.mjs';
import {currentTenant} from './tenant-context.mjs';
import {json, parse, all, first, put, del, get, readBody, notice} from './kit.mjs';

export const LANGS = ['tr', 'en', 'pt', 'fa'];
export const LANG_NAMES = {tr: 'Türkçe', en: 'English', pt: 'Português', fa: 'فارسی'};

// {değişken} yer tutucuları kullanılır. Her anahtar için tr zorunlu; eksik dil tr'ye düşer.
export const TEMPLATES = {
  'lead.thanks': {label: 'Başvuru alındı (ön görüşme formu)', vars: ['first', 'firm', 'thanks'], tr: {subject: 'Talebiniz alındı — {firm}', title: 'Merhaba {first},', text: '{thanks}'},
    en: {subject: 'We received your request — {firm}', title: 'Hello {first},', text: 'Thank you. Your request has reached us and one of our advisors will contact you shortly.'},
    pt: {subject: 'Recebemos sua solicitação — {firm}', title: 'Olá, {first},', text: 'Obrigado. Sua solicitação chegou até nós e um de nossos consultores entrará em contato em breve.'},
    fa: {subject: 'درخواست شما دریافت شد — {firm}', title: 'سلام {first}،', text: 'متشکریم. درخواست شما به دست ما رسید و یکی از مشاوران ما به‌زودی با شما تماس خواهد گرفت.'}},
  'quote.ready': {label: 'Teklif hazır', vars: ['title', 'first', 'number', 'total', 'valid'], button: true,
    tr: {subject: 'Teklifiniz: {title}', title: 'Merhaba {first},', text: '{title} için teklifiniz hazır ({number}). Toplam: {total}. Geçerlilik: {valid}. Bağlantıdan inceleyip kabul edebilir veya yanıtlayabilirsiniz.', button: 'Teklifi görüntüle'},
    en: {subject: 'Your quote: {title}', title: 'Hello {first},', text: 'Your quote for {title} is ready ({number}). Total: {total}. Valid until: {valid}. You can review it from the link and accept it or reply.', button: 'View quote'},
    pt: {subject: 'Sua proposta: {title}', title: 'Olá, {first},', text: 'Sua proposta para {title} está pronta ({number}). Total: {total}. Validade: {valid}. Pelo link você pode analisá-la e aceitar ou responder.', button: 'Ver proposta'},
    fa: {subject: 'پیشنهاد شما: {title}', title: 'سلام {first}،', text: 'پیشنهاد شما برای {title} آماده است ({number}). مجموع: {total}. اعتبار تا: {valid}. از طریق پیوند می‌توانید آن را بررسی و تأیید کنید یا پاسخ دهید.', button: 'مشاهده پیشنهاد'}},
  'contract.sign': {label: 'Sözleşme imzanızı bekliyor', vars: ['title', 'first', 'number'], button: true,
    tr: {subject: 'İmzanız bekleniyor: {title}', title: 'Merhaba {first},', text: '{title} ({number}) imzanıza hazır. Bağlantıdan metni okuyup elektronik olarak imzalayabilirsiniz.', button: 'Sözleşmeyi incele ve imzala'},
    en: {subject: 'Your signature is needed: {title}', title: 'Hello {first},', text: '{title} ({number}) is ready for your signature. You can read the text from the link and sign it electronically.', button: 'Review and sign'},
    pt: {subject: 'Sua assinatura é necessária: {title}', title: 'Olá, {first},', text: '{title} ({number}) está pronto para sua assinatura. Pelo link você pode ler o texto e assiná-lo eletronicamente.', button: 'Revisar e assinar'},
    fa: {subject: 'امضای شما لازم است: {title}', title: 'سلام {first}،', text: '{title} ({number}) برای امضای شما آماده است. از طریق پیوند می‌توانید متن را بخوانید و به‌صورت الکترونیکی امضا کنید.', button: 'بررسی و امضا'}},
  'plan.created': {label: 'Ödeme planı oluşturuldu', vars: ['title', 'name', 'total', 'count', 'lines'], button: true,
    tr: {subject: 'Ödeme planınız: {title}', title: 'Ödeme planınız hazır', text: 'Merhaba {name}, "{title}" için {total} tutarındaki ödemeniz {count} parçaya bölündü:\n\n{lines}\n\nHer ödemeyi panelinizin Finans bölümünden yapabilirsiniz.', button: 'Ödemelerimi gör'},
    en: {subject: 'Your payment plan: {title}', title: 'Your payment plan is ready', text: 'Hello {name}, your payment of {total} for "{title}" has been split into {count} installments:\n\n{lines}\n\nYou can make each payment from the Finance section of your panel.', button: 'View my payments'},
    pt: {subject: 'Seu plano de pagamento: {title}', title: 'Seu plano de pagamento está pronto', text: 'Olá, {name}, o pagamento de {total} referente a "{title}" foi dividido em {count} parcelas:\n\n{lines}\n\nVocê pode fazer cada pagamento na seção Financeiro do seu painel.', button: 'Ver meus pagamentos'},
    fa: {subject: 'برنامه پرداخت شما: {title}', title: 'برنامه پرداخت شما آماده است', text: 'سلام {name}، پرداخت {total} برای «{title}» به {count} قسط تقسیم شد:\n\n{lines}\n\nهر پرداخت را می‌توانید از بخش مالی پنل خود انجام دهید.', button: 'مشاهده پرداخت‌ها'}},
  'installment.pre': {label: 'Taksit hatırlatması (vade yaklaşıyor)', vars: ['title', 'name', 'amount', 'when', 'due'], button: true,
    tr: {subject: 'Ödeme hatırlatması: {title}', title: 'Ödeme hatırlatması: {title}', text: 'Merhaba {name}, "{title}" ödemeniz ({amount}) {when} ({due}) vadesine ulaşıyor. Ödemeyi panelinizin Finans bölümünden yapabilirsiniz.', button: 'Ödemeye git'},
    en: {subject: 'Payment reminder: {title}', title: 'Payment reminder: {title}', text: 'Hello {name}, your payment "{title}" ({amount}) is due {when} ({due}). You can pay from the Finance section of your panel.', button: 'Go to payment'},
    pt: {subject: 'Lembrete de pagamento: {title}', title: 'Lembrete de pagamento: {title}', text: 'Olá, {name}, o pagamento "{title}" ({amount}) vence {when} ({due}). Você pode pagar na seção Financeiro do seu painel.', button: 'Ir para o pagamento'},
    fa: {subject: 'یادآوری پرداخت: {title}', title: 'یادآوری پرداخت: {title}', text: 'سلام {name}، سررسید پرداخت «{title}» ({amount}) {when} ({due}) است. می‌توانید از بخش مالی پنل خود پرداخت کنید.', button: 'رفتن به پرداخت'}},
  'installment.over': {label: 'Geciken taksit', vars: ['title', 'name', 'amount', 'when', 'due'], button: true,
    tr: {subject: 'Geciken ödeme: {title}', title: 'Geciken ödeme: {title}', text: 'Merhaba {name}, "{title}" ödemenizin ({amount}) vadesi {due} tarihinde dolmuştu ({when}). Henüz ödemeniz görünmüyor; yaptıysanız dekontu panelden yükleyebilirsiniz. Ödemeyi panelinizin Finans bölümünden yapabilirsiniz.', button: 'Ödemeye git'},
    en: {subject: 'Overdue payment: {title}', title: 'Overdue payment: {title}', text: 'Hello {name}, your payment "{title}" ({amount}) was due on {due} ({when}). We do not see it yet; if you have paid, you can upload the receipt in your panel. You can pay from the Finance section of your panel.', button: 'Go to payment'},
    pt: {subject: 'Pagamento em atraso: {title}', title: 'Pagamento em atraso: {title}', text: 'Olá, {name}, o pagamento "{title}" ({amount}) venceu em {due} ({when}). Ainda não o identificamos; se já pagou, envie o comprovante pelo painel. Você pode pagar na seção Financeiro do seu painel.', button: 'Ir para o pagamento'},
    fa: {subject: 'پرداخت معوق: {title}', title: 'پرداخت معوق: {title}', text: 'سلام {name}، سررسید پرداخت «{title}» ({amount}) در تاریخ {due} بود ({when}). هنوز پرداخت شما دیده نمی‌شود؛ اگر پرداخت کرده‌اید، رسید را از پنل بارگذاری کنید. می‌توانید از بخش مالی پنل خود پرداخت کنید.', button: 'رفتن به پرداخت'}},
  'case.deadline': {label: 'Dosya süresi yaklaşıyor', vars: ['firm', 'label', 'first', 'service', 'when', 'left'], button: true,
    tr: {subject: '{firm}: {label} — {left}', title: 'Merhaba {first},', text: '{service} ile ilgili önemli bir tarih yaklaşıyor: {label} — {when} ({left}). Danışmanınız sizinle iletişime geçecektir; sorunuz varsa panelden yazabilirsiniz.', button: 'Dosyamı aç'},
    en: {subject: '{firm}: {label} — {left}', title: 'Hello {first},', text: 'An important date is approaching for {service}: {label} — {when} ({left}). Your advisor will contact you; if you have questions you can write from your panel.', button: 'Open my file'},
    pt: {subject: '{firm}: {label} — {left}', title: 'Olá, {first},', text: 'Uma data importante se aproxima em {service}: {label} — {when} ({left}). Seu consultor entrará em contato; em caso de dúvidas, escreva pelo painel.', button: 'Abrir meu processo'},
    fa: {subject: '{firm}: {label} — {left}', title: 'سلام {first}،', text: 'یک تاریخ مهم برای {service} نزدیک است: {label} — {when} ({left}). مشاور شما با شما تماس خواهد گرفت؛ اگر سؤالی دارید از پنل بنویسید.', button: 'باز کردن پرونده'}},
  'docs.missing': {label: 'Eksik belge hatırlatması', vars: ['first', 'list'],
    tr: {subject: 'Eksik belgeleriniz', title: 'Merhaba {first},', text: 'Dosyanız için aşağıdaki belgeler henüz eksik veya yeniden yüklenmeli:\n\n{list}\n\nBelgeleri panelinizden yükleyebilirsiniz. Anlamadığınız bir nokta olursa bize yazın.'},
    en: {subject: 'Your missing documents', title: 'Hello {first},', text: 'The following documents for your file are still missing or need to be uploaded again:\n\n{list}\n\nYou can upload them from your panel. If anything is unclear, please write to us.'},
    pt: {subject: 'Seus documentos pendentes', title: 'Olá, {first},', text: 'Os documentos abaixo do seu processo ainda estão pendentes ou precisam ser enviados novamente:\n\n{list}\n\nVocê pode enviá-los pelo painel. Se algo não estiver claro, escreva para nós.'},
    fa: {subject: 'مدارک ناقص شما', title: 'سلام {first}،', text: 'مدارک زیر برای پرونده شما هنوز ناقص هستند یا باید دوباره بارگذاری شوند:\n\n{list}\n\nمی‌توانید آن‌ها را از پنل خود بارگذاری کنید. اگر نکته‌ای نامشخص بود برای ما بنویسید.'}},
  'reply.ack': {label: 'Mesaj alındı (otomatik karşılama taslağı)', vars: ['first'],
    tr: {subject: 'Mesajınızı aldık', title: 'Merhaba {first},', text: 'Mesajınız için teşekkürler. Danışmanımız inceleyip en kısa sürede size dönecek.'},
    en: {subject: 'We received your message', title: 'Hello {first},', text: 'Thank you for your message. Your advisor will review it and get back to you shortly.'},
    pt: {subject: 'Recebemos sua mensagem', title: 'Olá, {first},', text: 'Obrigado pela sua mensagem. Seu consultor irá analisá-la e retornará em breve.'},
    fa: {subject: 'پیام شما دریافت شد', title: 'سلام {first}،', text: 'از پیام شما سپاسگزاریم. مشاور شما آن را بررسی کرده و به‌زودی پاسخ خواهد داد.'}},
  'message.reply': {label: 'Danışmandan yeni mesaj (gelen kutusundan)', vars: ['first', 'firm', 'text'], button: true,
    tr: {subject: '{firm}: yeni mesajınız var', title: 'Merhaba {first},', text: '{text}', button: 'Panelde yanıtla'},
    en: {subject: '{firm}: you have a new message', title: 'Hello {first},', text: '{text}', button: 'Reply in your panel'},
    pt: {subject: '{firm}: você tem uma nova mensagem', title: 'Olá, {first},', text: '{text}', button: 'Responder no painel'},
    fa: {subject: '{firm}: پیام جدید دارید', title: 'سلام {first}،', text: '{text}', button: 'پاسخ در پنل'}},
};

const SERVICE_DEF = {tr: 'Dosyanız', en: 'your file', pt: 'seu processo', fa: 'پرونده شما'};
const sub = (s, v) => String(s ?? '').replace(/\{(\w+)\}/g, (_, k) => (v[k] ?? ''));
export const validLang = l => (LANGS.includes(String(l || '').toLowerCase().slice(0, 2)) ? String(l).toLowerCase().slice(0, 2) : '');
const tenantLang = () => validLang(currentTenant().lang) || 'tr';

// Müşterinin dili: ipucu (form/oturum) → kayıtlı tercih → firma varsayılanı.
export async function langOf(db, email, hint) {
  const h = validLang(hint); if (h) return h;
  const e = String(email || '').toLowerCase();
  if (e) { const r = await first(db, 'SELECT data FROM items WHERE id=?', 'lang:' + e).catch(() => null); const l = r && validLang(parse(r.data).lang); if (l) return l; }
  return tenantLang();
}
export async function setLang(db, email, lang) {
  const l = validLang(lang), e = String(email || '').toLowerCase(); if (!l || !e) fail(400, 'Geçersiz dil.');
  await put(db, 'lang:' + e, 'pref', e, {lang: l});
}

// Şablonu çöz: firma özel metni (varsa) > yerleşik; eksik alan/dil → tr.
export async function renderTpl(db, key, lang, vars = {}) {
  const t = TEMPLATES[key]; if (!t) fail(500, 'Bilinmeyen şablon: ' + key);
  const l = validLang(lang) || 'tr';
  if ('service' in vars && !vars.service) vars = {...vars, service: SERVICE_DEF[l]};
  const ov = async lg => { const r = await first(db, 'SELECT data FROM items WHERE id=?', `mt:${key}:${lg}`).catch(() => null); return r ? parse(r.data) : {}; };
  const o = await ov(l), base = t[l] || t.tr, tr = t.tr;
  const pick = f => (o[f] != null && o[f] !== '' ? o[f] : base[f] ?? tr[f] ?? '');
  return {subject: sub(pick('subject'), vars), title: sub(pick('title'), vars), text: sub(pick('text'), vars), button: sub(pick('button'), vars), lang: l};
}
// vars bir nesne ya da (dil) => nesne olabilir.
// Şablonla müşteriye e-posta gönder (kayıt kendiliğinden gelen kutusuna düşer). link/ek alanlar o'ya verilir.
export async function mailTpl(db, {to, key, vars, lang, hint, ...o}) {
  const l = lang || await langOf(db, to, hint), r = await renderTpl(db, key, l, typeof vars === 'function' ? vars(l) : vars);
  return sendMail({to, subject: r.subject, title: r.title, text: r.text, button: o.link ? r.button : undefined, ...o});
}

// ---------------- Giden e-posta günlüğü (sendMailRaw çağırır) ----------------
const SKIP = /şifre|parola|doğrula|giriş|hesab[ıi]n[ıi]|verify|password|reset|sign.?in|login|davet|invite|yönetim panel|panelinizi aç/i;
export async function logMail(db, {to, subject, text, ok, dir = 'out', by, lang}) {
  const addr = String(to || '').toLowerCase(); if (!validEmail(addr) || SKIP.test(String(subject || ''))) return;
  const p = await first(db, 'SELECT id FROM people WHERE email=?', addr).catch(() => null), owner = p ? p.id : 'email:' + addr;
  await put(db, 'ml-' + uuid(), 'mail_log', owner, {to: addr, subject: clean(subject, 200), text: clean(text, 600), at: now(), ok: ok !== false, dir, by: by || '', lang: lang || ''});
}

// ---------------- Yönetici API ----------------
// Müşteriye yanıt gönder (gelen kutusu ve onaylı AI taslakları ortak kullanır). channel: 'app' (panel destek talebi) | 'email'.
export async function sendReply(db, {personId, channel, text, subject, ticket, close, actor}) {
  const id = clean(personId, 120); text = clean(text, 4000);
  const p = id.startsWith('email:') ? {id, name: id.slice(6), email: id.slice(6), role: 'guest'} : await first(db, PERSON, id); if (!p) fail(404, 'Kişi bulunamadı.'); if (!text) fail(400, 'Mesaj boş olamaz.');
  if (channel === 'email') {
    if (!validEmail(String(p.email || ''))) fail(400, 'Bu kişinin geçerli e-postası yok.');
    const lang = await langOf(db, p.email), firm = currentTenant().isDefault ? 'Brazil Migration' : currentTenant().name || 'Danışmanlık firması';
    const subj = clean(subject, 150), r = await renderTpl(db, 'message.reply', lang, {first: String(p.name || '').split(' ')[0] || '', firm, text});
    const m = await sendMail({to: p.email, subject: subj || r.subject, title: r.title, text, nolog: true});
    await logMail(db, {to: p.email, subject: subj || r.subject, text, ok: !!m.sent, by: actor, lang});
    return {ok: true, sent: !!m.sent};
  }
  if (p.role !== 'customer') fail(400, 'Uygulama içi mesaj yalnız müşterilere gönderilebilir.');
  let tk = ticket ? await get(db, clean(ticket, 80), 'ticket') : null; if (tk && tk.owner !== id) tk = null;
  if (!tk) { const open = await first(db, "SELECT id, data FROM items WHERE kind='ticket' AND owner=? AND json_extract(data,'$.status')<>'Kapandı' ORDER BY updated DESC LIMIT 1", id); if (open) tk = {id: open.id, owner: id, d: parse(open.data)}; }
  const d = tk ? tk.d : {subject: clean(subject, 120) || 'Mesaj', topic: '', status: 'Yanıt Bekliyor', assignee: {id: 'owner', name: 'Yönetim', role: 'owner', label: 'Yönetim'}, messages: []};
  if ((d.messages || []).length >= 100) fail(400, 'Bu konuşma doldu; yeni bir konu başlığıyla yazın.');
  d.messages = [...(d.messages || []), {sender: actor || 'Yönetim', text, at: now()}]; d.status = close ? 'Kapandı' : 'Yanıt Bekliyor';
  await put(db, tk ? tk.id : 'tk-' + uuid(), 'ticket', id, d); await notice(db, id, 'Destek talebinize yanıt geldi.', 'support');
  return {ok: true};
}

const PERSON = 'SELECT id, name, email, role FROM people WHERE id=?';
export async function commsAdmin(req, db, route, ctx = {}) {
  if (!route.startsWith('inbox/')) return null;
  const {audit, actor, translate} = ctx, log = async (a, t) => { try { if (audit) await audit(db, actor, a, t).run(); } catch {} };
  const url = new URL(req.url), body = async () => (req.method === 'GET' ? {} : await readBody(req));
  const who = async id => { if (String(id).startsWith('email:')) { const e = String(id).slice(6); return {id, name: e, email: e, role: 'guest'}; } return first(db, PERSON, id); };

  if (route === 'inbox/threads' && req.method === 'GET') {
    const q = clean(url.searchParams.get('q'), 80).toLowerCase(), by = new Map();
    const T = (o) => { let t = by.get(o); if (!t) by.set(o, t = {id: o, last: 0, lastText: '', channel: '', app: 0, mail: 0, open: 0}); return t; };
    for (const r of await all(db, "SELECT owner, data, created FROM items WHERE kind='mail_log' ORDER BY created DESC LIMIT 1500")) {
      const d = parse(r.data), t = T(r.owner); t.mail++; if ((d.at || r.created) > t.last) { t.last = d.at || r.created; t.lastText = d.subject || ''; t.channel = 'email'; }
    }
    for (const r of await all(db, "SELECT owner, data, updated FROM items WHERE kind='ticket' ORDER BY updated DESC LIMIT 1500")) {
      const d = parse(r.data), m = (d.messages || []).slice(-1)[0], t = T(r.owner); t.app += (d.messages || []).length; if (d.status !== 'Kapandı') t.open++;
      const at = m?.at || r.updated; if (at > t.last) { t.last = at; t.lastText = (m?.text || d.subject || '').slice(0, 120); t.channel = 'app'; }
    }
    const people = new Map((await all(db, "SELECT id, name, email, role FROM people LIMIT 8000")).map(p => [p.id, p]));
    let threads = [...by.values()].map(t => { const p = people.get(t.id) || (String(t.id).startsWith('email:') ? {name: t.id.slice(6), email: t.id.slice(6)} : null); return p ? {...t, name: p.name || p.email, email: p.email, role: p.role || 'guest'} : null; }).filter(Boolean);
    if (q) threads = threads.filter(t => (t.name + ' ' + t.email + ' ' + t.lastText).toLowerCase().includes(q));
    threads.sort((a, b) => b.last - a.last);
    return json({threads: threads.slice(0, 300)});
  }
  if (route === 'inbox/thread' && req.method === 'GET') {
    const id = clean(url.searchParams.get('id'), 120), p = await who(id); if (!p) fail(404, 'Kişi bulunamadı.');
    const items = [], tickets = [];
    for (const r of await all(db, "SELECT id, data, created FROM items WHERE kind='mail_log' AND owner=? ORDER BY created DESC LIMIT 200", id)) { const d = parse(r.data); items.push({ch: 'email', dir: d.dir || 'out', at: d.at || r.created, subject: d.subject, text: d.text, by: d.by || '', ok: d.ok !== false}); }
    for (const r of await all(db, "SELECT id, data FROM items WHERE kind='ticket' AND owner=? ORDER BY updated DESC LIMIT 50", id)) {
      const d = parse(r.data); tickets.push({id: r.id, subject: d.subject, status: d.status});
      for (const m of d.messages || []) items.push({ch: 'app', dir: p.name && m.sender === p.name ? 'in' : 'out', at: m.at, subject: d.subject, text: m.text, by: m.sender, ticket: r.id});
    }
    items.sort((a, b) => a.at - b.at);
    return json({person: {id: p.id, name: p.name, email: p.email, role: p.role, guest: id.startsWith('email:')}, lang: await langOf(db, p.email), tickets, items: items.slice(-300)});
  }
  if (route === 'inbox/reply' && req.method === 'POST') {
    const b = await body(), r = await sendReply(db, {personId: clean(b.person, 120), channel: b.channel, text: b.text, subject: b.subject, ticket: b.ticket, close: !!b.close, actor});
    await log('inbox.reply', b.channel === 'email' ? 'email' : 'app'); return json(r);
  }
  if (route === 'inbox/log' && req.method === 'POST') { // gelen e-postayı elle akışa ekle
    const b = await body(), id = clean(b.person, 120), p = await who(id); if (!p || !validEmail(String(p.email || ''))) fail(404, 'Kişi bulunamadı.');
    const text = clean(b.text, 4000); if (!text) fail(400, 'Metin boş olamaz.');
    await put(db, 'ml-' + uuid(), 'mail_log', id, {to: p.email, subject: clean(b.subject, 200) || '(konu yok)', text: text.slice(0, 600), at: now(), ok: true, dir: 'in', by: p.name || p.email});
    return json({ok: true});
  }
  if (route === 'inbox/lang' && req.method === 'POST') { const b = await body(), p = await who(clean(b.person, 120)); if (!p?.email) fail(404, 'Kişi bulunamadı.'); await setLang(db, p.email, b.lang); await log('inbox.lang', b.lang); return json({ok: true}); }
  if (route === 'inbox/translate' && req.method === 'POST') {
    const b = await body(), to = validLang(b.to), from = validLang(b.from) || 'tr', text = clean(b.text, 3000); if (!to || !text) fail(400, 'Metin ve hedef dil gerekli.');
    if (!translate) fail(503, 'Çeviri hizmeti hazır değil.');
    const r = await translate(text.slice(0, 1200), from, to).catch(() => null); if (!r || r.ok === false) fail(502, 'Çeviri yapılamadı; biraz sonra tekrar deneyin.');
    return json({text: r.text || ''});
  }
  if (route === 'inbox/templates' && req.method === 'GET') {
    const ov = new Map((await all(db, "SELECT id, data FROM items WHERE kind='msg_tpl'")).map(r => [r.id, parse(r.data)]));
    return json({langs: LANG_NAMES, templates: Object.entries(TEMPLATES).map(([key, t]) => ({key, label: t.label, vars: t.vars, button: !!t.button, langs: Object.fromEntries(LANGS.map(l => { const o = ov.get(`mt:${key}:${l}`); return [l, {...(t[l] || {}), ...(o || {}), custom: !!o}]; }))}))});
  }
  if (route === 'inbox/template' && req.method === 'POST') {
    const b = await body(), key = clean(b.key, 40), l = validLang(b.lang), t = TEMPLATES[key]; if (!t || !l) fail(400, 'Geçersiz şablon veya dil.');
    const d = {subject: clean(b.subject, 200), title: clean(b.title, 200), text: clean(b.text, 3000), button: clean(b.button, 60)}; if (!d.subject || !d.text) fail(400, 'Konu ve metin gerekli.');
    await put(db, `mt:${key}:${l}`, 'msg_tpl', 'owner', d); await log('inbox.template', `${key}:${l}`); return json({ok: true});
  }
  if (route === 'inbox/template/reset' && req.method === 'POST') { const b = await body(); await del(db, `mt:${clean(b.key, 40)}:${validLang(b.lang)}`); await log('inbox.template.reset', `${b.key}:${b.lang}`); return json({ok: true}); }
  return null;
}
