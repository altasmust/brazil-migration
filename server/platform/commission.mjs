// Hizmete göre gelir paylaşımı: firma (siz) · masraf · danışman. Kayıt: items 'config-commission'.
// Danışman yalnız kendi payını görür; fatura toplamı ve diğer paylar danışmana gönderilmez.
export const SPLIT_DEFAULTS = {
  oturum: {label: 'Oturum İzni', owner: 50, cost: 25, advisor: 25},
  sirket: {label: 'Şirket Kurulumu', owner: 50, cost: 30, advisor: 20},
  vatandaslik: {label: 'Vatandaşlık', owner: 50, cost: 20, advisor: 30},
  diger: {label: 'Diğer hizmetler', owner: 50, cost: 30, advisor: 20},
};
const n = v => Math.max(0, Math.min(100, Math.round((Number(v) || 0) * 10) / 10));
export async function loadSplits(db) {
  let saved = {};
  try { saved = JSON.parse((await db.prepare("SELECT data FROM items WHERE id='config-commission'").first())?.data || '{}') || {}; } catch {}
  return Object.fromEntries(Object.entries(SPLIT_DEFAULTS).map(([k, d]) => [k, {...d, ...(saved[k] ? {owner: n(saved[k].owner), cost: n(saved[k].cost), advisor: n(saved[k].advisor)} : {})}]));
}
export function cleanSplits(b) {
  const out = {};
  for (const k of Object.keys(SPLIT_DEFAULTS)) {
    const s = b?.[k] || SPLIT_DEFAULTS[k], v = {owner: n(s.owner), cost: n(s.cost), advisor: n(s.advisor)};
    if (Math.abs(v.owner + v.cost + v.advisor - 100) > 0.01) throw Object.assign(new Error(`${SPLIT_DEFAULTS[k].label}: oranların toplamı %100 olmalı.`), {status: 400});
    out[k] = v;
  }
  return out;
}
// Serbest metin hizmet adını anahtara çevirir.
export function serviceKey(s) {
  const t = String(s || '').toLocaleLowerCase('tr');
  if (SPLIT_DEFAULTS[t]) return t;
  if (/oturum|ikamet|resid|aile birle/.test(t)) return 'oturum';
  if (/şirket|sirket|company|firma|cnpj/.test(t)) return 'sirket';
  if (/vatandaş|vatandas|citizen|naturaliz/.test(t)) return 'vatandaslik';
  return 'diger';
}
export const splitFor = (splits, service) => splits[serviceKey(service)] || splits.diger;
// Danışmana giden görünüm: tutar = danışman payı; toplam, kalemler, indirim ve oran gizlenir.
export function advisorView(d) {
  const share = Math.round((Number(d.amount) || 0) * (Number(d.rate) || 0) / 100);
  const {lines, discount, rate, split, notes, paymentUrl, reference, key, name, mime, size, ...rest} = d;
  return {...rest, amount: share, shareOnly: true};
}
