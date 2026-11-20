// Planlar ve kotalar. Ana firma (Brazil Migration) sınırsızdır; diğer firmalar kendi planının sınırlarına tabidir.
import {currentTenant} from './tenant-context.mjs';

export const PLAN_LIMITS = {
  free: {customers: 25, staff: 2},
  pro: {customers: 300, staff: 10},
  office: {customers: 2000, staff: 50},
  enterprise: {},
};
export const PLAN_NAMES = {free: 'Ücretsiz', pro: 'Profesyonel', office: 'Ofis', enterprise: 'Kurumsal'};
export const limitsFor = t => (t.isDefault ? {} : PLAN_LIMITS[t.plan] || PLAN_LIMITS.free);

export async function usage(db) {
  const n = async sql => Number((await db.prepare(sql).first())?.n || 0);
  return {
    customers: await n("SELECT COUNT(*) AS n FROM people WHERE role='customer'"),
    staff: await n("SELECT COUNT(*) AS n FROM people WHERE role NOT IN ('customer','owner')"),
  };
}

// key: 'customers' | 'staff'. Sınır doluysa 402 fırlatır.
export async function assertQuota(db, key) {
  const t = currentTenant(), lim = limitsFor(t)[key];
  if (lim === undefined) return;
  const used = (await usage(db))[key];
  if (used >= lim) throw Object.assign(new Error(`${PLAN_NAMES[t.plan] || 'Mevcut'} planınızın ${key === 'customers' ? 'müşteri' : 'ekip üyesi'} sınırına (${lim}) ulaştınız. Planınızı yükseltin.`), {status: 402});
}
