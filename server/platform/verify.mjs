// Automatic document checks with an AI vision model (Anthropic API).
// Without ANTHROPIC_API_KEY nothing is auto-approved: documents wait for admin review.
export const verifierConfigured = () => !!process.env.ANTHROPIC_API_KEY;

export const PARTNER_DOCS = {
  vergi: {title: 'Vergi Levhası', expect: 'Türkiye Gelir İdaresi Başkanlığı vergi levhası (veya eşdeğer resmî vergi kayıt belgesi)'},
  sirku: {title: 'İmza Sirküsü', expect: 'noter onaylı imza sirküleri / imza beyannamesi'},
  kimlik_on: {title: 'Kimlik (Ön Yüz)', expect: 'kimlik kartının veya pasaportun ön yüzü / fotoğraflı sayfası'},
  kimlik_arka: {title: 'Kimlik (Arka Yüz)', expect: 'kimlik kartının arka yüzü (pasaport ise ikinci sayfa veya aynı sayfa)'},
};

function toBase64(buf) { return Buffer.from(buf).toString('base64'); }

async function ask(files, instruction) {
  const content = [];
  for (const f of files) {
    content.push({type: 'text', text: `Belge: ${f.label}`});
    if (f.mime === 'application/pdf') content.push({type: 'document', source: {type: 'base64', media_type: 'application/pdf', data: toBase64(f.bytes)}});
    else content.push({type: 'image', source: {type: 'base64', media_type: f.mime, data: toBase64(f.bytes)}});
  }
  content.push({type: 'text', text: instruction});
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json'},
    body: JSON.stringify({model: process.env.AI_VERIFY_MODEL || 'claude-sonnet-5-5', max_tokens: 1500, messages: [{role: 'user', content}]}),
  });
  if (!r.ok) throw new Error('AI doğrulama hatası ' + r.status + ': ' + (await r.text()).slice(0, 300));
  const data = await r.json();
  const text = data.content?.map(c => c.text || '').join('') || '';
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('AI yanıtı okunamadı.');
  return JSON.parse(m[0]);
}

// Returns {decision:'approve'|'review', checks:{doc:{ok,notes}}, summary}
export async function verifyPartner(profile, files) {
  if (!verifierConfigured()) return {decision: 'review', summary: 'Otomatik doğrulama yapılandırılmadı (ANTHROPIC_API_KEY yok); admin incelemesi bekleniyor.', checks: {}};
  const list = files.map(f => ({...f, label: `${f.doc} — beklenen: ${PARTNER_DOCS[f.doc].expect}`}));
  const instruction = `Sen bir belge doğrulama asistanısın. Yukarıdaki belgeler bir danışmanlık şirketinin partnerlik başvurusu için yüklendi.
Başvuru bilgileri: Firma unvanı: "${profile.company}"; Yetkili adı soyadı: "${profile.name}"; Vergi dairesi: "${profile.taxOffice || ''}"; Vergi no / VKN: "${profile.taxNumber || ''}".
Her belge için kontrol et: (1) belge türü beklenenle uyuşuyor mu, (2) okunaklı ve bütün mü, (3) bilgiler başvuruyla tutarlı mı (vergi levhasında unvan ve VKN, imza sirküsünde firma ve yetkili adı, kimlikte yetkili adı soyadı), (4) açık bir sahtecilik/düzenleme belirtisi veya süresi geçmiş belge var mı.
Yalnızca şu JSON ile yanıt ver (yalnızca yüklenen belgeler için: ${files.map(f => f.doc).join(', ')}): {"checks":{"<belge_kodu>":{"ok":true|false,"notes":"..."}},"confidence":0-1,"summary":"kısa Türkçe özet"}`;
  const out = await ask(list, instruction);
  const all = files.every(f => out.checks?.[f.doc]?.ok === true);
  const min = Number(process.env.AI_VERIFY_MIN_CONFIDENCE || 0.85);
  return {decision: all && Number(out.confidence) >= min ? 'approve' : 'review', checks: out.checks || {}, confidence: Number(out.confidence) || 0, summary: out.summary || ''};
}

export async function verifyCustomerDocument(customer, file, expected) {
  if (!verifierConfigured()) return {decision: 'review', summary: 'Otomatik doğrulama yapılandırılmadı; danışman incelemesi bekleniyor.'};
  const instruction = `Bu belge bir Brezilya göç başvurusu için "${expected}" olarak yüklendi. Müşteri adı: "${customer.name}".
Kontrol et: belge türü uyuşuyor mu, okunaklı mı, kişi adı müşteriyle tutarlı mı, süresi geçmiş veya düzenlenmiş görünüyor mu.
Yalnızca JSON: {"ok":true|false,"confidence":0-1,"summary":"kısa Türkçe açıklama"}`;
  const out = await ask([{...file, label: expected}], instruction);
  const min = Number(process.env.AI_VERIFY_MIN_CONFIDENCE || 0.85);
  return {decision: out.ok === true && Number(out.confidence) >= min ? 'approve' : 'review', confidence: Number(out.confidence) || 0, summary: out.summary || ''};
}
