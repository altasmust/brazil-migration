import {cfgSet} from './tenant-context.mjs';
// Runtime settings saved from the admin panel (items table) are applied on top of process.env,
// so every module (mail, Didit, owner e-mail in legacy modules) picks them up without a redeploy.
const MAP = {
  'config-mail': d => d.active === false ? {} : {SMTP_HOST: d.host, SMTP_PORT: String(d.port || ''), SMTP_SECURE: d.secure === false ? 'false' : 'true', SMTP_USER: d.user, SMTP_PASS: d.pass, EMAIL_FROM: d.fromEmail ? `${d.fromName || 'Brazil Migration'} <${d.fromEmail}>` : '', EMAIL_REPLY_TO: d.replyTo || ''},
  'config-didit': d => ({DIDIT_ENABLED: d.enabled ? 'true' : 'false', DIDIT_API_KEY: d.apiKey || '', DIDIT_WORKFLOW_ID: d.workflowId || '', DIDIT_MONTHLY_LIMIT: String(d.limit || 30)}),
  'config-owner': d => d.email ? {OWNER_EMAIL: d.email} : {},
  'config-waf': d => ({WAF_ENABLED: d.enabled === false ? 'off' : 'on', WAF_PANEL_TRUSTED: (d.trusted || []).join(',')}),
  'config-ai': d => d.apiKey ? {ANTHROPIC_API_KEY: d.apiKey, AI_VERIFY_MIN_CONFIDENCE: String(d.minConfidence || 0.85)} : {},
};
export function applyConfig(id, data, target) {
  const f = MAP[id]; if (!f || !data) return;
  for (const [k, v] of Object.entries(f(data))) { if (v === undefined || v === null) continue; cfgSet(k, v, target); }
}
// target: null/undefined = ana firma (process.env); Map = o firmanın yapılandırma katmanı
export async function loadConfig(client, target) {
  const ids = Object.keys(MAP);
  const rs = await client.execute({sql: `SELECT id, data FROM items WHERE id IN (${ids.map(() => '?').join(',')})`, args: ids});
  for (const row of rs.rows) { try { applyConfig(row[0] ?? row.id, JSON.parse(row[1] ?? row.data), target || undefined); } catch {} }
}
// Re-read the saved settings at most every few seconds, so all server processes see changes
// made from the admin panel (e.g. the admin's login e-mail) without a restart.
let lastRefresh = 0;
export async function refreshConfig(dbOrClient, maxAgeMs = 5000) {
  const db = dbOrClient?.client ? dbOrClient : null, client = db ? db.client : dbOrClient, holder = db || {};
  const last = db ? (db._cfgAt || 0) : lastRefresh;
  if (Date.now() - last < maxAgeMs) return;
  if (db) db._cfgAt = Date.now(); else lastRefresh = Date.now();
  try { await loadConfig(client, holder.cfgTarget); } catch (e) { console.error('[config]', e.message); }
}
