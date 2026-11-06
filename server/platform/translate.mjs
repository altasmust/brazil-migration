// Görüşme çevirisi: sunucu üzerinden, önbellekli, yedekli.
// Sıra: (varsa) adminin girdiği resmî servis → Google (2 uç) → MyMemory. Kota/uyarı metinleri asla çeviri sayılmaz.
const C = globalThis.__bmTr ??= {cache: new Map(), down: new Map(), stats: {req: 0, hit: 0, fail: 0, by: {}}};
export const TR_LANGS = ['tr', 'pt', 'en', 'fa'];
const BAD = /MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID LANGUAGE PAIR|NO QUERY SPECIFIED|PLEASE SELECT TWO DISTINCT LANGUAGES|USAGE ?LIMITS/i;
const T = ms => AbortSignal.timeout(ms);
const isDown = k => (C.down.get(k) || 0) > Date.now();
const markDown = (k, ms) => C.down.set(k, Date.now() + ms);

async function gtx(q, sl, tl) {
  const r = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(q)}`, {signal: T(6000), headers: {'User-Agent': 'Mozilla/5.0'}});
  if (r.status === 429 || r.status === 403) { markDown('gtx', 5 * 60e3); return null; }
  if (!r.ok) return null;
  const j = await r.json(); return (j[0] || []).map(x => x && x[0]).filter(Boolean).join('') || null;
}
async function gclients5(q, sl, tl) {
  const r = await fetch(`https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${sl}&tl=${tl}&q=${encodeURIComponent(q)}`, {signal: T(6000), headers: {'User-Agent': 'Mozilla/5.0'}});
  if (r.status === 429 || r.status === 403) { markDown('c5', 5 * 60e3); return null; }
  if (!r.ok) return null;
  const j = await r.json(); const x = Array.isArray(j) ? j[0] : j?.sentences?.map(s => s.trans).join('');
  return Array.isArray(x) ? x[0] : x || null;
}
async function mymemory(q, sl, tl, email) {
  const m = l => l === 'pt' ? 'pt-BR' : l === 'fa' ? 'fa-IR' : l;
  const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${m(sl)}|${m(tl)}${email ? '&de=' + encodeURIComponent(email) : ''}`, {signal: T(7000)});
  const j = await r.json().catch(() => null);
  const out = j?.responseData?.translatedText;
  if (Number(j?.responseStatus) !== 200 || !out || BAD.test(out)) { if (/WARNING|LIMIT/i.test(out || '') || j?.quotaFinished) markDown('mm', 60 * 60e3); return null; }
  return out;
}
async function azure(q, sl, tl, cfg) {
  const r = await fetch(`https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=${sl}&to=${tl === 'pt' ? 'pt' : tl}`, {method: 'POST', signal: T(7000), headers: {'Ocp-Apim-Subscription-Key': cfg.key, ...(cfg.region ? {'Ocp-Apim-Subscription-Region': cfg.region} : {}), 'Content-Type': 'application/json'}, body: JSON.stringify([{Text: q}])});
  if (r.status === 429) { markDown('pro', 60e3); return null; }
  if (!r.ok) return null;
  const j = await r.json(); return j?.[0]?.translations?.[0]?.text || null;
}
async function googleCloud(q, sl, tl, cfg) {
  const r = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(cfg.key)}`, {method: 'POST', signal: T(7000), headers: {'Content-Type': 'application/json'}, body: JSON.stringify({q, source: sl, target: tl === 'pt' ? 'pt-BR' : tl, format: 'text'})});
  if (r.status === 429) { markDown('pro', 60e3); return null; }
  if (!r.ok) return null;
  const j = await r.json(); return j?.data?.translations?.[0]?.translatedText || null;
}
async function deepl(q, sl, tl, cfg) {
  if (sl === 'fa' || tl === 'fa') return null; // DeepL Farsça desteklemiyor → ücretsiz yedeğe düşer
  const host = /:fx$/.test(cfg.key) ? 'api-free.deepl.com' : 'api.deepl.com';
  const tgt = {pt: 'PT-BR', en: 'EN-US', tr: 'TR'}[tl];
  const r = await fetch(`https://${host}/v2/translate`, {method: 'POST', signal: T(7000), headers: {Authorization: 'DeepL-Auth-Key ' + cfg.key, 'Content-Type': 'application/json'}, body: JSON.stringify({text: [q], source_lang: sl.toUpperCase(), target_lang: tgt})});
  if (r.status === 429 || r.status === 456) { markDown('pro', 10 * 60e3); return null; }
  if (!r.ok) return null;
  const j = await r.json(); return j?.translations?.[0]?.text || null;
}
const PRO = {azure, google: googleCloud, deepl};

export async function translateText(q, sl, tl, cfg = {}) {
  q = String(q || '').replace(/\s+/g, ' ').trim().slice(0, 1200);
  if (!q || !TR_LANGS.includes(sl) || !TR_LANGS.includes(tl)) return {text: q, ok: false};
  if (sl === tl) return {text: q, ok: true, by: 'same'};
  C.stats.req++;
  const key = sl + '|' + tl + '|' + q.toLowerCase();
  if (C.cache.has(key)) { C.stats.hit++; const v = C.cache.get(key); C.cache.delete(key); C.cache.set(key, v); return {text: v, ok: true, by: 'cache'}; }
  const chain = [];
  if (cfg.provider && cfg.key && PRO[cfg.provider]) chain.push(['pro', () => PRO[cfg.provider](q, sl, tl, cfg)]);
  chain.push(['gtx', () => gtx(q, sl, tl)], ['c5', () => gclients5(q, sl, tl)], ['mm', () => mymemory(q, sl, tl, cfg.email)]);
  for (const [k, fn] of chain) {
    if (isDown(k)) continue;
    try {
      const out = await fn();
      if (out && !BAD.test(out)) {
        C.cache.set(key, out); if (C.cache.size > 8000) C.cache.delete(C.cache.keys().next().value);
        C.stats.by[k] = (C.stats.by[k] || 0) + 1;
        return {text: out, ok: true, by: k};
      }
    } catch {}
  }
  C.stats.fail++;
  return {text: q, ok: false};
}
export const translateStats = () => ({...C.stats, cached: C.cache.size, down: [...C.down].filter(([, t]) => t > Date.now()).map(([k]) => k)});
