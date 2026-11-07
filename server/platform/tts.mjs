// Sesli çeviri (görüşme): metni sunucuda MP3'e çevirir. Telefonlarda tarayıcının speechSynthesis'i görüşme
// sırasında ses oturumunu ele geçirip videoyu durduruyordu; MP3 normal <audio> ile çalınınca video etkilenmez.
// Sıra: Azure Speech (Sunucu Modülleri → "Azure Speech", ayda 500 bin karakter ücretsiz) → Google ücretsiz ses.
const VOICES = {tr: ['tr-TR', 'tr-TR-EmelNeural'], pt: ['pt-BR', 'pt-BR-FranciscaNeural'], en: ['en-US', 'en-US-JennyNeural'], fa: ['fa-IR', 'fa-IR-DilaraNeural']};
const cache = new Map();
const xml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
let skipAzureUntil = 0;

function chunks(text, max = 180) {
  const out = []; let rest = text.trim();
  while (rest.length > max) {
    let cut = Math.max(rest.lastIndexOf('. ', max), rest.lastIndexOf('? ', max), rest.lastIndexOf('! ', max), rest.lastIndexOf(', ', max));
    if (cut < max * 0.4) cut = rest.lastIndexOf(' ', max);
    if (cut < 20) cut = max;
    out.push(rest.slice(0, cut + 1).trim()); rest = rest.slice(cut + 1).trim();
  }
  if (rest) out.push(rest);
  return out;
}

async function azure(text, lang, m) {
  const [loc, voice] = VOICES[lang];
  const r = await fetch(`https://${m.region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST', signal: AbortSignal.timeout(8000),
    headers: {'Ocp-Apim-Subscription-Key': m.key, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3', 'User-Agent': 'brazilmigration'},
    body: `<speak version="1.0" xml:lang="${loc}"><voice name="${voice}"><prosody rate="+4%">${xml(text)}</prosody></voice></speak>`,
  });
  if (!r.ok) { if (r.status === 429 || r.status === 401 || r.status === 403) skipAzureUntil = Date.now() + 10 * 60e3; throw new Error('azure ' + r.status); }
  return Buffer.from(await r.arrayBuffer());
}

async function google(text, lang) {
  const tl = VOICES[lang][0], parts = chunks(text), bufs = [];
  for (let i = 0; i < parts.length; i++) {
    const u = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(tl)}&total=${parts.length}&idx=${i}&textlen=${parts[i].length}&q=${encodeURIComponent(parts[i])}`;
    const r = await fetch(u, {signal: AbortSignal.timeout(8000), headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36', Referer: 'https://translate.google.com/'}});
    if (!r.ok) throw new Error('google tts ' + r.status);
    bufs.push(Buffer.from(await r.arrayBuffer()));
  }
  return Buffer.concat(bufs); // MP3 kareleri art arda eklenebilir
}

export async function ttsAudio(text, lang, sv = {}) {
  text = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 600);
  if (!text || !VOICES[lang]) return null;
  const az = sv.azuretts, useAz = az?.enabled && az.key && az.region && Date.now() > skipAzureUntil;
  const key = (useAz ? 'a' : 'g') + lang + ':' + text;
  if (cache.has(key)) { const v = cache.get(key); cache.delete(key); cache.set(key, v); return v; }
  let buf = null;
  if (useAz) { try { buf = await azure(text, lang, az); } catch (e) { console.error('[tts]', e.message); } }
  if (!buf) buf = await google(text, lang);
  if (cache.size > 400) cache.delete(cache.keys().next().value);
  cache.set(key, buf);
  return buf;
}

export const TTS_VOICES = VOICES;
export const azureTest = (m) => azure('Olá, tudo bem?', 'pt', m);
