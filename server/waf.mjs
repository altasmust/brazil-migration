// Uygulama güvenlik duvarı: proxy.ts her istekte çağırır.
// Saldırı kalıpları, tarayıcı/araç imzaları, bilinen tarama yolları ve IP başına hız sınırı.
// Durum süreç belleğinde (globalThis) tutulur; yönetim paneli aynı süreçten okur.
// Güvenilir IP'ler (WAF_TRUSTED_IPS, panelden eklenenler) hiçbir kurala takılmaz. WAF_ENABLED=off ile kapanır.
const W = globalThis.__bmWaf ??= {hits: new Map(), strikes: new Map(), bans: new Map(), events: [], n: 0, stats: {requests: 0, blocked: 0, limited: 0, bans: 0, since: Date.now()}};

const BAD_PATH = /(^|\/)(wp-(admin|login|content|includes|json|config)|xmlrpc\.php|phpmyadmin|pma|myadmin|adminer|cgi-bin|\.env|\.git|\.svn|\.hg|\.aws|\.ssh|\.htaccess|\.htpasswd|\.ds_store|vendor\/phpunit|server-status|actuator|boaform|hnap1|telescope|_ignition|solr|owa|autodiscover|config\.json|web\.config|backup\.(zip|sql|tar)|dump\.sql|id_rsa)(\/|$|\?|\.)|\.(php\d?|asp|aspx|jsp|cgi|pl|sh|bak|sql|ini|log|swp)$/i;
const BAD_UA = /(sqlmap|nikto|nmap|masscan|zgrab|acunetix|nessus|wpscan|dirbuster|gobuster|feroxbuster|nuclei|havij|w3af|openvas|jaeles|commix|xsstrike|hydra|fimap|joomscan|whatweb|ffuf|wfuzz|arachni|netsparker|appscan|burpcollaborator|interactsh|zmeu|morfeus|webshag|skipfish)/i;
const ATTACK = [
  /union(\s|\+|\/\*.*?\*\/)+(all(\s|\+)+)?select/i, /select.+from.+information_schema/i, /\b(sleep|benchmark|pg_sleep|waitfor\s+delay)\s*\(/i,
  /['"]\s*(or|and)\s+['"]?\d+['"]?\s*=\s*['"]?\d+/i, /;\s*(drop|truncate|alter)\s+table/i,
  /<\s*script/i, /javascript\s*:/i, /\bon(error|load|mouseover|focus|animationstart)\s*=/i, /<\s*(iframe|svg|img)[^>]*\bon\w+\s*=/i,
  /\.\.[\/\\]/, /\/etc\/(passwd|shadow|hosts)/i, /(c:|%systemroot%)\\windows/i, /cmd\.exe|powershell/i,
  /\$\{\s*(jndi|env|sys):/i, /[;|`]\s*(wget|curl|bash|sh|nc|python|perl)\b/i, /\b(base64_decode|eval|assert|system|passthru|shell_exec)\s*\(/i,
  /\{\{.*?(constructor|__proto__|config|self).*?\}\}/i, /__proto__|constructor\s*\[/i,
];
const AUTH = /^\/api\/[^?]*(login|register|signup|forgot|reset|password|verify|setup|giris|kayit)/i;
const MIN = 60e3, BAN_MS = 60 * MIN, STRIKES_TO_BAN = 5;

const on = () => (process.env.WAF_ENABLED || 'on') !== 'off' && process.env.NODE_ENV === 'production';
const list = v => String(v || '').split(',').map(s => s.trim()).filter(Boolean);
const trusted = () => new Set([...list(process.env.WAF_TRUSTED_IPS), ...list(process.env.WAF_PANEL_TRUSTED)]);
export const clientIp = h => (h.get('cf-connecting-ip') || (h.get('x-forwarded-for') || '').split(',')[0] || h.get('x-real-ip') || '').trim().slice(0, 64) || 'unknown';
const dec = s => { let v = s; for (let i = 0; i < 2; i++) { try { const d = decodeURIComponent(v.replace(/\+/g, ' ')); if (d === v) break; v = d; } catch { break; } } return v; };

function log(ip, type, path, ua) {
  W.events.unshift({t: Date.now(), ip, type, path: String(path).slice(0, 140), ua: String(ua || '').slice(0, 90)});
  if (W.events.length > 300) W.events.length = 300;
}
function strike(ip, n, type, path, ua) {
  const t = Date.now(), s = W.strikes.get(ip);
  const v = s && t - s.t < 10 * MIN ? {n: s.n + n, t: s.t} : {n, t};
  W.strikes.set(ip, v);
  if (v.n >= STRIKES_TO_BAN && !W.bans.has(ip)) { W.bans.set(ip, {until: t + BAN_MS, reason: type, at: t}); W.stats.bans++; log(ip, 'ban', path, ua); }
}
function count(key, limit) {
  const t = Date.now(), h = W.hits.get(key);
  if (!h || t - h.t >= MIN) { W.hits.set(key, {t, n: 1}); return true; }
  h.n++; return h.n <= limit;
}
function prune() {
  const t = Date.now();
  for (const [k, v] of W.hits) if (t - v.t >= MIN) W.hits.delete(k);
  for (const [k, v] of W.strikes) if (t - v.t >= 10 * MIN) W.strikes.delete(k);
  for (const [k, v] of W.bans) if (v.until <= t) W.bans.delete(k);
}

// Döner: null (geçir) veya {status, retry?}
export function inspect({method, pathname, search, headers, adminHost}) {
  if (!on()) return null;
  W.stats.requests++;
  if (++W.n % 2000 === 0 || W.hits.size > 50000) prune();
  const ip = clientIp(headers), ua = headers.get('user-agent') || '';
  if (trusted().has(ip)) return null;
  const ban = W.bans.get(ip);
  if (ban) { if (ban.until > Date.now()) { W.stats.blocked++; return {status: 403}; } W.bans.delete(ip); }
  const raw = pathname + (search || ''), url = dec(raw);
  if (raw.length > 4096) { W.stats.blocked++; log(ip, 'url-too-long', raw, ua); strike(ip, 2, 'url', raw, ua); return {status: 414}; }
  if (['TRACE', 'TRACK', 'CONNECT'].includes(method)) { W.stats.blocked++; log(ip, 'method', method + ' ' + pathname, ua); strike(ip, 2, 'method', pathname, ua); return {status: 405}; }
  if (BAD_UA.test(ua)) { W.stats.blocked++; log(ip, 'scanner', raw, ua); strike(ip, STRIKES_TO_BAN, 'scanner', raw, ua); return {status: 403}; }
  if (BAD_PATH.test(dec(pathname))) { W.stats.blocked++; log(ip, 'probe', raw, ua); strike(ip, 1, 'probe', raw, ua); return {status: 404}; }
  if (ATTACK.some(r => r.test(url))) { W.stats.blocked++; log(ip, 'attack', raw, ua); strike(ip, 2, 'attack', raw, ua); return {status: 403}; }
  const write = !['GET', 'HEAD', 'OPTIONS'].includes(method);
  const checks = [['all:' + ip, adminHost ? 1500 : 600]];
  if (pathname === '/api/auth/translate') checks.push(['tr:' + ip, 400]); // görüşme çevirisi: canlı altyazı sık istek atar
  else if (write && pathname.startsWith('/api/')) checks.push(['w:' + ip, adminHost ? 300 : 90]);
  if (write && AUTH.test(pathname)) checks.push(['a:' + ip, 12]);
  for (const [k, lim] of checks) if (!count(k, lim)) {
    W.stats.limited++;
    const h = W.hits.get(k); if (h.n === lim + 1) { log(ip, 'rate-limit', method + ' ' + pathname, ua); strike(ip, k.startsWith('a:') ? 2 : 1, 'rate', pathname, ua); }
    return {status: 429, retry: Math.ceil((MIN - (Date.now() - h.t)) / 1000)};
  }
  return null;
}

// Yönetim paneli
export function wafState(ip) {
  prune();
  return {enabled: on(), mode: process.env.NODE_ENV, yourIp: ip, panelTrusted: list(process.env.WAF_PANEL_TRUSTED), envTrusted: list(process.env.WAF_TRUSTED_IPS),
    stats: W.stats, bans: [...W.bans].map(([ip, b]) => ({ip, ...b})).sort((a, b) => b.at - a.at), events: W.events.slice(0, 100), watching: W.strikes.size};
}
export const cleanIps = xs => [...new Set((xs || []).map(s => String(s).trim()).filter(s => /^[0-9a-f.:]{3,64}$/i.test(s)))].slice(0, 50);
export function unban(ip) { W.bans.delete(ip); W.strikes.delete(ip); }
export function clearEvents() { W.events.length = 0; }
