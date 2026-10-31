// KYC credits: every partner gets a monthly allowance (default 10) of Didit verification sessions.
// Sessions for a partner's customers are charged to that partner; head-office customers use the shared pool.
// Allowance resets on the 1st of each month (UTC). Extra credits are granted by the admin for the current month only.
export const DEFAULT_MONTHLY = 10;
export const monthStart = (t = Date.now()) => { const d = new Date(t); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1); };
export const nextReset = (t = Date.now()) => { const d = new Date(t); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1); };
export const monthKey = (t = Date.now()) => { const d = new Date(t); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };
const parse = s => { try { return JSON.parse(s || '{}'); } catch { return {}; } };

export async function creditRecord(db, pid) {
  const r = await db.prepare("SELECT data FROM items WHERE id=?").bind('kyccredit-' + pid).first();
  const d = r ? parse(r.data) : {};
  return {monthly: Number.isFinite(d.monthly) ? d.monthly : DEFAULT_MONTHLY, adj: Array.isArray(d.adj) ? d.adj : []};
}
export function saveCredit(db, pid, rec) {
  const t = Date.now();
  return db.prepare("INSERT INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated=excluded.updated")
    .bind('kyccredit-' + pid, 'kyc_credit', pid, JSON.stringify({monthly: rec.monthly, adj: rec.adj.slice(-300)}), t, t); // statement for db.batch
}
export async function creditState(db, pid) {
  const rec = await creditRecord(db, pid), mk = monthKey();
  const extra = rec.adj.filter(a => a.month === mk).reduce((n, a) => n + Number(a.n || 0), 0);
  const used = (await db.prepare("SELECT COUNT(*) AS n FROM items WHERE kind='kyc_session' AND created>=? AND json_extract(data,'$.chargedTo')=?").bind(monthStart(), pid).first())?.n || 0;
  const allowance = Math.max(0, rec.monthly + extra);
  return {monthly: rec.monthly, extra, allowance, used: Number(used), remaining: Math.max(0, allowance - Number(used)), resetAt: nextReset(), month: mk, history: rec.adj.filter(a => a.month === mk).slice(-50).reverse()};
}
// Which partner pays for a verification of this customer? null = shared pool (head office / admin records).
export async function kycPayer(db, customerId) {
  if (!customerId || String(customerId).startsWith('admin:')) return null;
  const p = await db.prepare('SELECT role, advisor FROM people WHERE id=?').bind(customerId).first();
  if (!p || p.role !== 'customer' || !p.advisor || p.advisor === 'owner') return null;
  const adv = await db.prepare("SELECT id, name FROM people WHERE id=? AND role='advisor'").bind(p.advisor).first();
  return adv ? adv.id : null;
}
