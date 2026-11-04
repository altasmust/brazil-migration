'use strict';
// Brezilya vize kuralları ve belge listeleri. Kaynak: MRE "Quadro Geral de Regime de Vistos" (QGRV) ve konsolosluk kontrol listeleri.
// Kurallar değişebilir; güncel QGRV ile düzenli kontrol edin. Ülke kodları ISO 3166-1 alpha-2.
window.BM_VISA = {
  updated: '2026-11',
  // Ziyaret (turizm / iş / transit) için vizeden muaf ülkeler → izin verilen gün
  exempt: {AL: 90, AD: 90, AG: 90, AR: 90, AM: 90, AT: 90, BS: 90, BB: 90, BY: 90, BE: 90, BZ: 90, BO: 90, BA: 90, BW: 90, BG: 90, CL: 90, CO: 90, CR: 90, HR: 90, CY: 90, CZ: 90, DK: 90, DM: 90, DO: 60, EC: 90, SV: 90, EE: 90, FJ: 90, FI: 90, FR: 90, GE: 90, DE: 90, GR: 90, GD: 90, GT: 90, GY: 90, HN: 90, HK: 90, HU: 90, IS: 90, ID: 30, IE: 90, IL: 90, IT: 90, JM: 90, JP: 90, KZ: 30, LV: 90, LI: 90, LT: 90, LU: 90, MO: 90, MK: 90, MY: 90, MT: 90, MX: 90, MD: 90, MC: 90, MN: 90, ME: 90, MA: 90, NA: 90, NL: 90, NZ: 90, NI: 90, NO: 90, PA: 90, PY: 90, PE: 90, PH: 90, PL: 90, PT: 90, QA: 90, RO: 90, RU: 90, KN: 90, VC: 90, SM: 90, RS: 90, SC: 90, SG: 30, SK: 90, SI: 90, ZA: 90, KR: 90, ES: 90, SR: 90, SE: 90, CH: 90, TH: 90, TT: 90, TN: 90, TR: 90, UA: 90, AE: 90, GB: 90, UY: 90, VA: 90, VE: 60},
  // Ziyaret için elektronik vize (e-Visa) gerekenler
  evisa: {US: 'https://brazil.vfsevisa.com', CA: 'https://brazil.vfsevisa.com', AU: 'https://brazil.vfsevisa.com'},
  // Mercosur ve ortak ülkeler: kimlik kartıyla giriş
  mercosur: ['AR', 'PY', 'UY', 'BO', 'CL', 'CO', 'EC', 'PE', 'VE'],
  types: {
    visit: {label: 'Ziyaret vizesi (VIVIS) — turizm, iş, transit, etkinlik', short: 'Ziyaret', visit: true,
      docs: ['Geçerli pasaport (en az 6 ay geçerli, 2 boş sayfa)', 'Biyometrik vesikalık fotoğraf (beyaz fon, 2 MB altı)', 'Gidiş-dönüş uçak rezervasyonu', 'Konaklama belgesi (otel rezervasyonu veya davet mektubu)', 'Son 3 ayın banka dökümü (yeterli maddi imkân)', 'İş / gelir belgesi (çalışma belgesi, vergi levhası veya öğrenci belgesi)', 'Seyahat sağlık sigortası (önerilir)', 'Konsolosluk harç ödeme dekontu (gerekiyorsa)']},
    family: {label: 'Geçici vize — Aile birleşimi (VITEM XI)', short: 'Aile birleşimi',
      docs: ['Geçerli pasaport', 'Biyometrik vesikalık fotoğraf', 'Adli sicil kaydı (apostilli, son 90 gün)', 'Doğum belgesi veya evlilik belgesi (apostilli, tercümeli)', 'Brezilya’daki yakının kimliği (RG / CRNM) ve adres belgesi', 'Brezilya’daki yakının ortak yaşam / ilişki beyanı (noter onaylı)', 'Davet mektubu (Brezilya’da noter onaylı, önerilir)', 'Ekonomik bağımlılık belgesi (gerekiyorsa)', 'Uluslararası aşı sertifikası (gerekiyorsa)', 'Konsolosluk harç dekontu']},
    work: {label: 'Geçici vize — Çalışma (VITEM V)', short: 'Çalışma',
      docs: ['Geçerli pasaport', 'Biyometrik vesikalık fotoğraf', 'Adli sicil kaydı (apostilli)', 'Ministério da Justiça oturma izni onayı (Autorização de Residência) yayın tarihi / numarası', 'Brezilya’daki işverenle iş sözleşmesi', 'Diploma ve mesleki deneyim belgeleri (apostilli, tercümeli)', 'Konsolosluk harç dekontu']},
    study: {label: 'Geçici vize — Öğrenim (VITEM IV)', short: 'Öğrenim',
      docs: ['Geçerli pasaport', 'Biyometrik vesikalık fotoğraf', 'Adli sicil kaydı (apostilli, 18 yaş üstü)', 'Brezilya’daki okuldan kabul / kayıt belgesi', 'Öğrenim süresince geçinecek maddi imkân belgesi', 'Reşit değilse ebeveyn izni (noter onaylı, apostilli)', 'Konsolosluk harç dekontu']},
    retire: {label: 'Geçici vize — Emeklilik (VITEM IX / aposentado)', short: 'Emeklilik',
      docs: ['Geçerli pasaport', 'Biyometrik vesikalık fotoğraf', 'Adli sicil kaydı (apostilli)', 'Aylık en az 2.000 USD emekli maaşı belgesi (apostilli, tercümeli)', 'Maaşın Brezilya’ya aktarılabileceğine dair beyan', 'Konsolosluk harç dekontu']},
    invest: {label: 'Geçici vize — Yatırımcı / şirket (VITEM IX)', short: 'Yatırımcı',
      docs: ['Geçerli pasaport', 'Biyometrik vesikalık fotoğraf', 'Adli sicil kaydı (apostilli)', 'Yatırım planı ve şirket belgeleri (CNPJ, sözleşme)', 'Yatırım tutarının Brezilya’ya transfer belgesi (Banco Central kaydı)', 'Ministério da Justiça oturma izni onayı', 'Konsolosluk harç dekontu']},
    nomad: {label: 'Geçici vize — Dijital göçebe (VITEM XIV)', short: 'Dijital göçebe',
      docs: ['Geçerli pasaport', 'Biyometrik vesikalık fotoğraf', 'Adli sicil kaydı (apostilli)', 'Yurt dışındaki işverenle uzaktan çalışma sözleşmesi veya müşteri sözleşmeleri', 'Aylık en az 1.500 USD gelir veya 18.000 USD banka bakiyesi belgesi', 'Brezilya’da geçerli sağlık sigortası', 'Konsolosluk harç dekontu']},
  },
  // Resmî formdaki sıraya göre seçenekler
  marital: ['Bekâr', 'Evli', 'Boşanmış', 'Dul', 'Ayrı yaşıyor', 'Fiilî birliktelik (união estável)'],
  passportTypes: ['Umuma mahsus (normal)', 'Hususi', 'Hizmet', 'Diplomatik', 'Yabancılar için seyahat belgesi', 'Mülteci seyahat belgesi'],
};
