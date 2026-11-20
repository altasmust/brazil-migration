// Planlar ve kotalar. Ana firma (Brazil Migration) sınırsızdır; diğer firmalar kendi planının sınırlarına tabidir.
import {currentTenant} from './tenant-context.mjs';

export const PLAN_LIMITS = {
  free: {customers: 25, staff: 2, meetMin: 60},
  pro: {customers: 300, staff: 10, meetMin: 600},
  office: {customers: 2000, staff: 50, meetMin: 3000},
  enterprise: {},
};
export const PLAN_NAMES = {free: 'Ücretsiz', pro: 'Profesyonel', office: 'Ofis', enterprise: 'Kurumsal'};
export const limitsFor = t => (t.isDefault ? {} : PLAN_LIMITS[t.plan] || PLAN_LIMITS.free);

export async function usage(db) {
  const n = async sql => Number((await db.prepare(sql).first())?.n || 0);
  return {
    customers: await n("SELECT COUNT(*) AS n FROM people WHERE role='customer'"),
    staff: await n("SELECT COUNT(*) AS n FROM people WHERE role NOT IN ('customer','owner')"),
    meetMin: await meetMinutes(db),
  };
}

// Çevirili görüşme: bu ay (UTC) tamamlanan görüşmelerin toplam dakikası. Sınır aşıldığında YENİ görüşme açılmaz; süren görüşme kesilmez.
export async function meetMinutes(db, nowMs = Date.now()) {
  const d = new Date(nowMs), from = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  const r = await db.prepare("SELECT COALESCE(SUM(json_extract(data,'$.sec')),0) AS n FROM items WHERE kind='meet_session' AND json_extract(data,'$.start')>=?").bind(from).first();
  return Math.round(Number(r?.n || 0) / 60);
}
export async function meetingQuota(db) {
  const lim = limitsFor(currentTenant()).meetMin;
  if (lim === undefined) return {limit: null, used: null, exceeded: false};
  const used = await meetMinutes(db); return {limit: lim, used, exceeded: used >= lim};
}

// key: 'customers' | 'staff'. Sınır doluysa 402 fırlatır.
export async function assertQuota(db, key) {
  const t = currentTenant(), lim = limitsFor(t)[key];
  if (lim === undefined) return;
  const used = (await usage(db))[key];
  if (used >= lim) throw Object.assign(new Error(`${PLAN_NAMES[t.plan] || 'Mevcut'} planınızın ${key === 'customers' ? 'müşteri' : 'ekip üyesi'} sınırına (${lim}) ulaştınız. Planınızı yükseltin.`), {status: 402});
}
