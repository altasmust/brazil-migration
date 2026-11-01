// Runtime settings saved from the admin panel (items table) are applied on top of process.env,
// so every module (mail, Didit, owner e-mail in legacy modules) picks them up without a redeploy.
const MAP = {
  'config-mail': d => d.active === false ? {} : {SMTP_HOST: d.host, SMTP_PORT: String(d.port || ''), SMTP_SECURE: d.secure === false ? 'false' : 'true', SMTP_USER: d.user, SMTP_PASS: d.pass, EMAIL_FROM: d.fromEmail ? `${d.fromName || 'Brazil Migration'} <${d.fromEmail}>` : '', EMAIL_REPLY_TO: d.replyTo || ''},
  'config-didit': d => ({DIDIT_ENABLED: d.enabled ? 'true' : 'false', DIDIT_API_KEY: d.apiKey || '', DIDIT_WORKFLOW_ID: d.workflowId || '', DIDIT_MONTHLY_LIMIT: String(d.limit || 30)}),
  'config-owner': d => d.email ? {OWNER_EMAIL: d.email} : {},
  'config-waf': d => ({WAF_ENABLED: d.enabled === false ? 'off' : 'on', WAF_PANEL_TRUSTED: (d.trusted || []).join(',')}),
  'config-ai': d => d.apiKey ? {ANTHROPIC_API_KEY: d.apiKey, AI_VERIFY_MIN_CONFIDENCE: String(d.minConfidence || 0.85)} : {},
};
export function applyConfig(id, data) {
  const f = MAP[id]; if (!f || !data) return;
  for (const [k, v] of Object.entries(f(data))) { if (v === undefined || v === null) continue; process.env[k] = String(v); }
}
export async function loadConfig(client) {
  const ids = Object.keys(MAP);
  const rs = await client.execute({sql: `SELECT id, data FROM items WHERE id IN (${ids.map(() => '?').join(',')})`, args: ids});
  for (const row of rs.rows) { try { applyConfig(row[0] ?? row.id, JSON.parse(row[1] ?? row.data)); } catch {} }
}
// Re-read the saved settings at most every few seconds, so all server processes see changes
// made from the admin panel (e.g. the admin's login e-mail) without a restart.
let lastRefresh = 0;
export async function refreshConfig(client, maxAgeMs = 5000) {
  if (Date.now() - lastRefresh < maxAgeMs) return;
  lastRefresh = Date.now();
  try { await loadConfig(client); } catch (e) { console.error('[config]', e.message); }
}
