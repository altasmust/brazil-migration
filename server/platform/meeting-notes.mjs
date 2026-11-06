// Görüşme dökümü → metin dosyası + (Anthropic anahtarı varsa) iki dilli yapay zekâ özeti
const LN = {tr: 'Türkçe', pt: 'Português', en: 'English', fa: 'فارسی'};
const s = (x, n = 2000) => String(x ?? '').replace(/[\u0000-\u0008\u000b-\u001f]/g, '').slice(0, n);

export function cleanLines(lines) {
  return (Array.isArray(lines) ? lines : []).slice(0, 3000).map(l => ({time: s(l.time, 12), who: s(l.who, 60), lang: LN[l.lang] ? l.lang : 'tr', orig: s(l.orig), tr: s(l.tr)})).filter(l => l.orig);
}
export function cleanMsgs(msgs) {
  return (Array.isArray(msgs) ? msgs : []).slice(0, 500).map(m => ({time: s(m.time, 12), who: s(m.who, 60), text: s(m.text), tr: s(m.tr)})).filter(m => m.text);
}

export async function summarize(lines, msgs, langs) {
  const key = process.env.ANTHROPIC_API_KEY; if (!key || !lines.length) return null;
  const want = [...new Set(langs.filter(l => LN[l]))].slice(0, 2); if (!want.length) want.push('tr');
  const text = lines.map(l => `[${l.time}] ${l.who} (${l.lang}): ${l.orig}`).join('\n').slice(-60000)
    + (msgs.length ? '\n\nSohbet mesajları:\n' + msgs.map(m => `[${m.time}] ${m.who}: ${m.text}`).join('\n').slice(-8000) : '');
  const prompt = `Aşağıda Brazil Migration (Brezilya göçmenlik danışmanlığı ve hukuk bürosu) ile bir müşteri arasındaki çevirili görüntülü görüşmenin dökümü var. Konuşma tanıma hataları olabilir; anlamdan çıkarım yap ama uydurma.

Şu başlıklarla kısa, net bir özet yaz; her bölümü şu dillerde ayrı ayrı ver: ${want.map(l => LN[l]).join(' ve ')}.
1) Görüşmenin konusu (1–2 cümle)
2) Müşterinin durumu ve talebi (madde madde)
3) Verilen bilgiler / alınan kararlar
4) Yapılacaklar: kim, ne, (varsa) ne zaman — müşteri ve ekip için ayrı
5) İstenen belgeler (varsa)

Düz metin kullan (markdown başlık işareti yok), her dil bölümünü "=== <dil adı> ===" satırıyla başlat. Döküm:
${text}`;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {method: 'POST', signal: AbortSignal.timeout(60000),
      headers: {'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json'},
      body: JSON.stringify({model: process.env.AI_SUMMARY_MODEL || process.env.AI_VERIFY_MODEL || 'claude-sonnet-5-5', max_tokens: 2500, messages: [{role: 'user', content: prompt}]})});
    if (!r.ok) return null;
    const d = await r.json();
    return (d.content || []).map(c => c.text || '').join('').trim() || null;
  } catch { return null; }
}

export function buildText({room, start, end, who, lines, msgs, summary}) {
  const dt = t => t ? new Date(t).toLocaleString('tr-TR', {timeZone: 'Europe/Istanbul'}) : '—';
  const dur = start && end ? Math.max(0, Math.round((end - start) / 60000)) + ' dk' : '—';
  let out = `BRAZIL MIGRATION · GÖRÜŞME DÖKÜMÜ\nOda: ${room}\nBaşlangıç: ${dt(start)} (Türkiye saati)\nSüre: ${dur}\nKatılımcılar: ${who.join(', ')}\n\n`;
  if (summary) out += `────────── YAPAY ZEKÂ ÖZETİ ──────────\n(Otomatik oluşturuldu; önemli bilgileri dökümden kontrol edin.)\n\n${summary}\n\n`;
  out += `────────── KONUŞMA DÖKÜMÜ ──────────\n\n` + (lines.length ? lines.map(l => `[${l.time}] ${l.who} (${l.lang.toUpperCase()})\n  ${l.orig}\n  → ${l.tr}`).join('\n\n') : '(kayıtlı konuşma yok)') + '\n';
  if (msgs.length) out += `\n────────── SOHBET MESAJLARI ──────────\n\n` + msgs.map(m => `[${m.time}] ${m.who}: ${m.text}${m.tr && m.tr !== m.text ? '\n  → ' + m.tr : ''}`).join('\n') + '\n';
  return out;
}
