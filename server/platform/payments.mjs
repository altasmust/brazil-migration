// Payment modules (admin → Faturalandırma → Ödeme Altyapıları). Settings live in item 'config-payments'.
// Secret fields are never sent back to the browser; an unchanged (masked) secret keeps the stored value.
export const MASK = '••••••••';
export const PROVIDERS = [
  {id: 'iyzico', name: 'iyzico', category: 'Kredi kartı', region: 'Türkiye', icon: 'credit-card', color: '#1e64ff',
    desc: 'Kredi ve banka kartıyla tek çekim / taksitli ödeme. 3D Secure destekli.',
    fields: [{k: 'apiKey', label: 'API Anahtarı', req: true}, {k: 'secretKey', label: 'Gizli Anahtar (Secret Key)', secret: true, req: true}],
    modes: true, help: 'iyzico Merchant Panel → Ayarlar → Firma Ayarları bölümünden API anahtarlarınızı alın. Test için sandbox-merchant.iyzipay.com hesabını kullanın.'},
  {id: 'paytr', name: 'PayTR', category: 'Sanal POS', region: 'Türkiye', icon: 'credit-card', color: '#0f9bd7',
    desc: 'iFrame ile kartla ödeme, taksit ve havale/EFT seçenekleri.',
    fields: [{k: 'merchantId', label: 'Mağaza No (Merchant ID)', req: true}, {k: 'merchantKey', label: 'Merchant Key', secret: true, req: true}, {k: 'merchantSalt', label: 'Merchant Salt', secret: true, req: true}],
    modes: true, help: 'PayTR Mağaza Paneli → Bilgi sayfasında Mağaza No, Merchant Key ve Merchant Salt yer alır. Bildirim URL olarak sitenizin ödeme bildirim adresini tanımlamanız gerekir.'},
  {id: 'shopier', name: 'Shopier', category: 'Online ödeme', region: 'Türkiye', icon: 'shopping-bag', color: '#7a3fd1',
    desc: 'Ödeme bağlantısı ile kartla tahsilat; şirketi olmayan satıcılar için de uygun.',
    fields: [{k: 'apiKey', label: 'API Kullanıcı (API Key)', req: true}, {k: 'apiSecret', label: 'API Şifre (API Secret)', secret: true, req: true}],
    modes: false, help: 'Shopier Paneli → Entegrasyonlar → Modül Yönetimi bölümünden API kullanıcı ve şifrenizi oluşturun.'},
  {id: 'paratika', name: 'Paratika', category: 'Sanal POS', region: 'Türkiye', icon: 'shield-check', color: '#e4352b',
    desc: 'Birden çok bankayla çalışan sanal POS; 3D Secure ve taksit.',
    fields: [{k: 'merchant', label: 'Üye İşyeri Kodu (Merchant)', req: true}, {k: 'merchantUser', label: 'API Kullanıcı Adı', req: true}, {k: 'merchantPassword', label: 'API Şifresi', secret: true, req: true}],
    modes: true, help: 'Paratika Üye İşyeri Paneli → Ayarlar → API kullanıcıları bölümünden bilgilerinizi alın. Test ortamı için Paratika’dan test hesabı isteyin.'},
  {id: 'havale', name: 'Banka Havalesi / EFT', category: 'Banka havalesi', region: 'Türkiye · Brezilya', icon: 'bank', color: '#1b5e20',
    desc: 'Müşteri IBAN’a ödeme yapar, dekontu yükler; ödemeyi siz onaylarsınız.',
    fields: [{k: 'accounts', label: 'Banka hesapları', type: 'accounts'}, {k: 'note', label: 'Müşteriye gösterilecek açıklama', type: 'textarea', ph: 'Ör. Açıklama kısmına fatura numaranızı yazın. Ödeme 1 iş günü içinde onaylanır.'}],
    modes: false, help: 'Birden çok hesap ekleyebilirsiniz (TRY, USD, EUR, BRL). Müşterileriniz ödeme sırasında bu hesapları görür.'},
];
const clean = (v, n = 300) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);

export async function loadPayments(db) {
  const r = await db.prepare("SELECT data FROM items WHERE id='config-payments'").first();
  try { return JSON.parse(r?.data || '{}') || {}; } catch { return {}; }
}
// Browser view: secrets masked, plus whether each module has everything it needs.
export function publicView(all) {
  return PROVIDERS.map(p => {
    const c = all[p.id] || {}, values = {};
    for (const f of p.fields) values[f.k] = f.secret ? (c.values?.[f.k] ? MASK : '') : (c.values?.[f.k] ?? (f.type === 'accounts' ? [] : ''));
    return {...p, enabled: !!c.enabled, mode: c.mode || 'test', label: c.label || '', values, ready: ready(p, c), updated: c.updated || null};
  });
}
function ready(p, c) {
  if (p.id === 'havale') return (c.values?.accounts || []).some(a => a.iban);
  return p.fields.filter(f => f.req).every(f => c.values?.[f.k]);
}
export function savePayment(all, id, b) {
  const p = PROVIDERS.find(x => x.id === id); if (!p) throw Object.assign(new Error('Modül bulunamadı.'), {status: 404});
  const old = all[id] || {}, values = {...(old.values || {})};
  if (b.values && typeof b.values === 'object') for (const f of p.fields) {
    if (!(f.k in b.values)) continue;
    const v = b.values[f.k];
    if (f.type === 'accounts') {
      values[f.k] = (Array.isArray(v) ? v : []).slice(0, 10).map(a => ({bank: clean(a.bank, 80), holder: clean(a.holder, 120), iban: clean(a.iban, 40).toUpperCase().replace(/\s+/g, ''), currency: ['TRY', 'USD', 'EUR', 'BRL'].includes(a.currency) ? a.currency : 'TRY', branch: clean(a.branch, 80)})).filter(a => a.bank || a.iban);
      for (const a of values[f.k]) if (a.iban && !/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(a.iban)) throw Object.assign(new Error(`IBAN geçersiz görünüyor: ${a.iban}`), {status: 400});
    } else if (f.secret) { if (v !== MASK) values[f.k] = clean(v, 300); }
    else values[f.k] = clean(v, f.type === 'textarea' ? 1000 : 300);
  }
  const next = {enabled: 'enabled' in b ? !!b.enabled : !!old.enabled, mode: b.mode === 'live' ? 'live' : b.mode === 'test' ? 'test' : (old.mode || 'test'), label: 'label' in b ? clean(b.label, 60) : (old.label || ''), values, updated: Date.now()};
  if (next.enabled && !ready(p, next)) throw Object.assign(new Error(p.id === 'havale' ? 'Etkinleştirmek için en az bir IBAN ekleyin.' : 'Etkinleştirmek için zorunlu bilgileri doldurun.'), {status: 400});
  return {...all, [id]: next};
}
// Methods customers may see (no secrets).
export function enabledMethods(all) {
  return PROVIDERS.filter(p => all[p.id]?.enabled && ready(p, all[p.id])).map(p => ({id: p.id, name: all[p.id].label || p.name, mode: all[p.id].mode || 'test', ...(p.id === 'havale' ? {accounts: all[p.id].values.accounts, note: all[p.id].values.note || ''} : {})}));
}
