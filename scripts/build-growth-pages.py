# Büyüme sayfaları üreticisi: /rehber/, /fiyatlar/, /brezilya-vizesi/ ve ülke sayfaları.
# Şablon: hakkimizda/index.html (header/footer aynı kalır). Çalıştır: python3 scripts/build-growth-pages.py
import re, json, os
R = os.path.join(os.path.dirname(__file__), '..', 'public')
TPL = open(os.path.join(R, 'hakkimizda', 'index.html'), encoding='utf-8').read()
H = 'https://brazilmigration.com'
ic = lambda n: f'<bm-i class="ic ic-{n}" aria-hidden="true"></bm-i>'
FL = lambda c, w=22: f'<img src="/bm/flags/{c}.svg" alt="" width="{w}" height="{int(w*0.72)}">'

def page(path, title, desc, main, ld=None, css=(), noindex=False):
    s = TPL
    s = re.sub(r'<title>[^<]*</title>', f'<title>{title}</title>', s, count=1)
    for k, v in (('name="description"', desc), ('property="og:title"', title), ('property="og:description"', desc)):
        s = re.sub(rf'<meta {k} content="[^"]*"', f'<meta {k} content="{v}"', s, count=1)
    s = s.replace(H + '/hakkimizda/', H + path)
    s = re.sub(r'(<body[^>]*) data-page="[^"]*"', r'\1 data-page="growth"', s, count=1)
    extra = ''.join(f'<link rel="stylesheet" href="{c}">' for c in css)
    for x in (ld or []): extra += f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False)}</script>'
    if noindex: extra += '<meta name="robots" content="noindex,follow">'
    s = s.replace('</head>', extra + '</head>', 1)
    s = re.sub(r'<main id="main">.*?</main>', lambda m: f'<main id="main">{main}</main>', s, count=1, flags=re.S)
    d = os.path.join(R, path.strip('/')); os.makedirs(d, exist_ok=True)
    open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(s)
    return path

def faq_ld(items): return {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in items]}
def crumbs(*parts): return '<div class="breadcrumb wrap"><a href="/">Ana sayfa</a>' + ''.join(f' / <a href="{u}">{t}</a>' if u else f' / {t}' for t, u in parts) + '</div>'
def faq_html(items): return '<div class="lp-faq">' + ''.join(f'<details><summary>{q}</summary><p>{a}</p></details>' for q, a in items) + '</div>'
CTA = lambda t='Ücretsiz ön görüşme planla': f'<button class="btn" type="button" onclick="book()">{t} <span>↗</span></button>'

# ------------------------------------------------------------------ /rehber/
G = [
 ('Önce doğru yolu seçin', '<p>Brezilya’da kalıcı yaşamın tek bir yolu yok; doğru başlık durumunuza göre değişir. En sık kullanılan oturum yolları:</p><ul><li><b>Aile birleşimi:</b> Brezilyalı veya Brezilya’da oturumu olan eş, partner, çocuk ya da ebeveyn üzerinden.</li><li><b>Çalışma:</b> Brezilya’daki bir işverenle iş sözleşmesi ve gerekli izinlerle.</li><li><b>Emeklilik:</b> Düzenli ve yeterli emekli maaşını belgeleyenler için.</li><li><b>Yatırım / şirket:</b> Brezilya’da yatırım veya şirket kuruluşu üzerinden.</li><li><b>Dijital göçebe:</b> Yurt dışındaki işvereni veya müşterileri için uzaktan çalışanlar.</li><li><b>Eğitim:</b> Brezilya’daki bir okul veya üniversiteye kabul alanlar.</li></ul><p class="rh-tip">İpucu: Birden fazla yol uygun olabilir. Süre, maliyet ve vatandaşlığa giden yol açısından en avantajlısını seçmek için kısa bir değerlendirme yapın.</p>'),
 ('Vize mi, oturum mu?', '<p>Bazı yollarda başvuru Türkiye’deki (veya ikamet ettiğiniz ülkedeki) Brezilya konsolosluğundan <b>geçici vize (VITEM)</b> ile başlar; bazılarında ise Brezilya’ya girdikten sonra ülke içinden oturum izni başvurusu yapılabilir. Turist girişiyle gelip ülke içinde başvuru yapmak her yol için mümkün değildir; planı yola çıkmadan netleştirin.</p>'),
 ('Belgelerinizi erkenden hazırlayın', '<p>Belge hazırlığı genellikle sürecin en uzun kısmıdır. Çoğu başvuruda istenenler:</p><ul><li>Geçerli pasaport (yeterli geçerlilik süresi ve boş sayfa)</li><li>Doğum belgesi; aile yollarında evlilik / doğum belgeleri</li><li>Menşe ülke <b>adli sicil kaydı</b> (genellikle son 90 gün içinde alınmış)</li><li>Gelir, iş veya okul belgeleri (yola göre)</li><li>Biyometrik fotoğraf ve başvuru formları</li></ul><p><b>Apostil ve tercüme:</b> Yabancı belgelerin Brezilya’da kullanılabilmesi için çoğunlukla <b>apostil</b> (Lahey Sözleşmesi’ne taraf ülkelerde) veya konsolosluk tasdiki (taraf olmayan ülkelerde) ve Portekizceye <b>yeminli tercüme</b> (tradução juramentada) gerekir. Türkiye Lahey Sözleşmesi’ne taraftır; apostil valilik/kaymakamlık veya adliyelerden alınır.</p><p class="rh-tip">İpucu: Adli sicil gibi süreli belgeleri en son alın; tarihleri dolmasın.</p>'),
 ('Brezilya’da ilk 30–90 gün', '<ol><li><b>Polícia Federal kaydı:</b> Geçici vizeyle girenler kayıt ve göçmen kimlik kartı (CRNM) için genellikle girişten itibaren 90 gün içinde Federal Polis’e başvurur. Randevu yoğun olabilir; erken alın.</li><li><b>CPF:</b> Brezilya vergi numarası; banka, telefon hattı, kira ve neredeyse her işlem için gerekir.</li><li><b>Adres ve kira:</b> Resmî adres belgesi (kira sözleşmesi, fatura) birçok başvuruda istenir.</li><li><b>Banka hesabı:</b> CPF ve kimlik belgesiyle açılır; dijital bankalar daha hızlı olabilir.</li><li><b>Sağlık:</b> Kamu sağlık sistemi SUS’a kayıt veya özel sağlık sigortası.</li><li><b>Telefon hattı ve Pix:</b> Brezilya’da ödemelerin büyük kısmı Pix ile yapılır.</li></ol>'),
 ('Maliyetleri baştan planlayın', '<p>Toplam bütçe kişiye göre değişir; ana kalemler şunlardır: konsolosluk / göç harçları, apostil ücretleri, yeminli tercüme (sayfa başına), noter işlemleri, uçak ve ilk aylar için konaklama. Hizmet bedeli, dosyanızın kapsamına göre ücretsiz ön görüşmede netleşir.</p>'),
 ('Sık yapılan 7 hata', '<ol><li>Yolu netleştirmeden bilet almak veya turist girişiyle gelmek</li><li>Adli sicil gibi süreli belgelerin tarihinin dolması</li><li>Apostilsiz veya yeminli olmayan tercüme ile başvurmak</li><li>İsim yazımlarının belgeler arasında farklı olması (pasaport ile birebir aynı olmalı)</li><li>Federal Polis kaydını son güne bırakmak</li><li>Gelir belgelerinin istenen dönemi kapsamaması</li><li>Oturum yenileme tarihini takip etmemek</li></ol>'),
 ('Vatandaşlığa giden yol', '<p>Olağan vatandaşlık (naturalização) için genellikle Brezilya’da kesintisiz 4 yıllık ikamet ve Portekizce yeterliliği aranır. Brezilyalı eşi veya çocuğu olanlar gibi bazı durumlarda süre kısalabilir. Oturum ve vatandaşlık aynı statü değildir; haklar ve yükümlülükler ayrı değerlendirilir.</p>'),
 ('Kısa kontrol listesi', '<ul class="rh-check"><li>Oturum yolumu belirledim</li><li>Pasaportumun geçerliliğini kontrol ettim</li><li>Belge listemi çıkardım; apostil ve tercüme gerekenleri işaretledim</li><li>Adli sicil kaydını zamanında alacağım</li><li>Varışta Federal Polis, CPF ve banka adımlarını planladım</li><li>Bütçemi çıkardım</li></ul>'),
]
toc = ''.join(f'<li><a href="#b{i+1}">{t}</a></li>' for i, (t, _) in enumerate(G))
body = ''.join(f'<section class="rh-sec" id="b{i+1}"><h2><span>{i+1:02d}</span>{t}</h2>{c}</section>' for i, (t, c) in enumerate(G))
main = f'''{crumbs(("Ücretsiz rehber", None))}
<section class="rh-hero wrap"><div><span class="nl-tag">ÜCRETSİZ REHBER · 2026</span><h1>Brezilya’ya Taşınma Rehberi</h1><p>Oturum yolları, belgeler, apostil ve tercüme, varıştan sonraki ilk adımlar, maliyetler ve sık yapılan hatalar. Sade, Türkçe ve adım adım.</p><p class="rh-status" data-rh-status></p></div>
<div class="rh-card"><b>Rehberin tamamına ulaşın</b><p>E-posta adresinizi onaylayın; rehber açılsın ve mevzuat değiştiğinde kısa bir haber alın.</p>
<form class="nl-form" data-nl novalidate><div class="nl-row"><input name="email" type="email" required autocomplete="email" placeholder="E-posta adresiniz" aria-label="E-posta adresiniz"><button class="btn" type="submit">Rehberi aç</button></div><input type="text" name="website" tabindex="-1" autocomplete="off" class="nl-hp" aria-hidden="true"><input type="hidden" name="source" value="/rehber/"><label class="nl-ok"><input type="checkbox" name="consent" required> <span>Rehberin ve ara sıra bilgilendirme e-postalarının gönderilmesini kabul ediyorum. <a href="/kvkk-aydinlatma-metni/">Aydınlatma metni</a></span></label><p class="nl-msg" role="status" aria-live="polite"></p></form></div></section>
<div class="rh-wrap wrap"><aside class="rh-toc"><b>İçindekiler</b><ol>{toc}</ol><button class="btn small" type="button" onclick="print()">{ic("doc")} PDF olarak kaydet</button></aside><article class="rh-body">{body}
<div class="rh-gate"><p><b>Rehberin devamı için e-posta adresinizi onaylayın.</b> Yukarıdaki formu doldurun; onay bağlantısına tıkladığınızda rehberin tamamı açılır.</p></div>
<div class="lp-cta"><div><h2>Durumunuza özel yol haritası ister misiniz?</h2><p>15 dakikalık ücretsiz ön görüşmede kendi dilinizde konuşun; size uygun yolu ve belge listenizi netleştirelim.</p></div>{CTA()}</div>
<p class="rh-legal">Bu rehber genel bilgilendirme amaçlıdır ve hukuki görüş yerine geçmez. Kurallar değişebilir; başvurudan önce güncel mevzuatı ve kendi durumunuzu bir uzmanla teyit edin.</p></article></div>'''
page('/rehber/', 'Ücretsiz Brezilya’ya Taşınma Rehberi 2026', 'Brezilya oturum yolları, gerekli belgeler, apostil ve yeminli tercüme, varıştan sonraki ilk adımlar ve sık yapılan hatalar. Ücretsiz rehber.', main,
     ld=[{'@context': 'https://schema.org', '@type': 'Article', 'headline': 'Brezilya’ya Taşınma Rehberi 2026', 'inLanguage': 'tr', 'author': {'@type': 'Organization', 'name': 'Brazil Migration'}, 'publisher': {'@type': 'Organization', 'name': 'Brazil Migration'}}])

# ------------------------------------------------------------------ /fiyatlar/
PK = [
 ('Oturum', '/brezilya-oturum-izni/', [
   ('oturum', 'Oturum İzni', 'Odaklı destek', 'Şirket kuruluşuna ihtiyaç duymadan oturum dosyasına odaklananlar için.', 6, 9, ['Başvuru ve dosya planlama', 'Apostilli evrak tercüme koordinasyonu', 'Noter işlemleri koordinasyonu', 'Göçmenlik Bürosu kayıt desteği', 'Çalışma izni / statü değerlendirmesi', 'Oturum (CRNM) süreç takibi'], ['Şirket kurulumu', 'Diploma denklik', 'Resmî ikamet adresi yönlendirmesi'], False),
   ('sirket-oturum', 'Şirket + Oturum', 'Genişletilmiş kapsam', 'Şirket kuruluşu ile oturum hazırlığını birlikte planlayanlar için.', 9, 9, ['Oturum İzni paketindeki her şey', 'Şirket kurulum koordinasyonu', 'Diploma denklik süreci desteği', 'Resmî ikamet adresi için yönlendirme'], [], True)]),
 ('Vatandaşlık', '/brezilya-vatandasligi/', [
   ('vat-basvuru', 'Vatandaşlık Başvuru', 'Odaklı', 'Belgeleri büyük ölçüde hazır olanlar için başvuru dosyası odaklı destek.', 3, 7, ['Vatandaşlık başvuru dosyası', 'Apostilli evrak tercüme koordinasyonu', 'Çalışma izni belgesi hazırlığı'], ['Noter işlemleri', 'Muhasebe kaydı', 'Sigorta kaydı (INSS)', 'İdari hukuk desteği'], False),
   ('vat-tam', 'Vatandaşlık Tam Destek', 'Kapsamlı', 'Gelir, çalışma ve kayıt belgeleri dahil uçtan uca dosya yönetimi.', 7, 7, ['Vatandaşlık başvuru dosyası', 'Apostilli evrak tercüme koordinasyonu', 'Noter işlemleri', 'Çalışma izni belgesi', 'Muhasebe kaydı', 'Sigorta kaydı (INSS)', 'İdari hukuk desteği'], [], True)]),
 ('Şirket kuruluşu', '/brezilyada-sirket-kurma/', [
   ('mei', 'Başlangıç (MEI)', 'Mikrogirişimci', 'Brezilya oturumu olan serbest çalışanlar ve küçük hizmet işleri için.', 5, 9, ['Şirket kurulumu', 'Apostilli evrak tercüme', 'Noter işlemleri', 'Banka hesabı açılışı'], ['Muhasebe kaydı', 'Sigorta kaydı', 'Çalışma izni belgesi', 'İdari hukuk', 'Şirket avukatı'], False),
   ('ltda', 'Standart (LTDA)', 'En çok tercih edilen', 'Sınırlı sorumluluk şirketi (LTDA / tek ortaklı SLU) kurmak isteyenler için.', 7, 9, ['MEI paketindeki her şey', 'Muhasebe kaydı', 'Sigorta kaydı', 'Çalışma izni belgesi'], ['İdari hukuk', 'Şirket avukatı'], True),
   ('sa', 'Kurumsal (SA)', 'Tam kapsam', 'Anonim şirket ve büyük ölçekli yapılar için uçtan uca destek.', 9, 9, ['LTDA paketindeki her şey', 'İdari hukuk desteği', 'Şirket avukatı'], [], False)]),
]
def card(k, name, tag, desc, a, b, inc, exc, star, link):
    return f'''<article class="pr-card{' star' if star else ''}">{'<span class="pr-star">En çok tercih edilen</span>' if star else ''}<span class="pr-tag">{tag}</span><h3>{name}</h3><p class="pr-desc">{desc}</p>
<div class="pr-price"><small>Hizmet bedeli</small><b data-price="{k}">Kişiye özel teklif</b><span data-price-note>Dosya kapsamına göre ücretsiz ön görüşmede netleşir</span></div>
<div class="pr-score"><span style="--p:{round(a/b*100)}%"></span><b>{a}/{b}</b> hizmet</div>
<ul class="pr-inc">{''.join(f'<li>{x}</li>' for x in inc)}</ul>{('<ul class="pr-exc">' + ''.join(f'<li>{x}</li>' for x in exc) + '</ul>') if exc else ''}
<div class="pr-actions"><button class="btn" type="button" onclick="book()">Teklif ve görüşme <span>↗</span></button><a href="{link}#paketler">Detaylar</a></div></article>'''
groups = ''.join(f'<section class="pr-group"><div class="pr-gh"><h2>{g}</h2><a href="{link}">Hizmet sayfası →</a></div><div class="pr-grid">' + ''.join(card(*p, link) for p in items) + '</div></section>' for g, link, items in PK)
PF = [('Fiyatlarınız neden “kişiye özel”?', 'Her dosyada belge sayısı, apostil ve tercüme ihtiyacı, aile üyesi sayısı ve başvuru yolu farklıdır. Ücretsiz ön görüşmede kapsamı netleştirip size yazılı ve sabit bir teklif veriyoruz.'),
      ('Ön görüşme gerçekten ücretsiz mi?', 'Evet. 15 dakikalık ilk görüşme ücretsizdir ve hiçbir taahhüt gerektirmez. Görüşme kendi dilinizde, canlı çeviriyle yapılır.'),
      ('Resmî harçlar hizmet bedeline dahil mi?', 'Konsolosluk ve göç harçları, apostil ve yeminli tercüme gibi üçüncü taraf masrafları ayrıca gösterilir; teklifinizde kalem kalem yazılır.'),
      ('Nasıl ödeme yapabilirim?', 'Kredi/banka kartı, havale/EFT ve (Brezilya’dan) uygun ödeme yöntemleri; kartla ödemede taksit seçenekleri ödeme sağlayıcısına göre sunulabilir. Ödemeler müşteri panelinizden faturalı olarak yapılır.'),
      ('Paketi sonradan değiştirebilir miyim?', 'Evet. Süreç içinde ihtiyaçlarınız değişirse paketinizi genişletebiliriz; yalnızca fark tutarı yansıtılır.')]
main = f'''{crumbs(("Paketler ve fiyatlar", None))}
<section class="pr-hero wrap"><div class="kicker">ŞEFFAF KAPSAM</div><h1>Paketler ve fiyatlar</h1><p>Tüm hizmet paketlerimizi tek sayfada karşılaştırın: neler dahil, neler ek hizmet. Net teklif, dosyanızın kapsamına göre ücretsiz ön görüşmede yazılı olarak verilir.</p>
<div class="pr-free">{ic("chat")}<div><b>Ücretsiz ön görüşme · 15 dakika · 0 ₺</b><span>Kendi dilinizde, canlı çevirili görüntülü görüşme. Taahhüt yok.</span></div>{CTA("Hemen planla")}</div></section>
<div class="wrap">{groups}
<section class="lp-sec"><div class="kicker">ÖDEME VE KAPSAM</div><h2>Sık sorulanlar</h2>{faq_html(PF)}</section>
<p class="rh-legal">Kapsam skoru, listelenen hizmetlerden kaçının pakette yer aldığını gösterir; hukuki uygunluk veya onay ihtimali değildir.</p></div>'''
page('/fiyatlar/', 'Paketler ve Fiyatlar | Brezilya Oturum, Vatandaşlık, Şirket', 'Brezilya oturum izni, vatandaşlık ve şirket kuruluşu paketlerini karşılaştırın: kapsam, dahil olanlar, ek hizmetler. Ücretsiz ön görüşmede net teklif.', main, ld=[faq_ld(PF)])

# ------------------------------------------------------------------ Ülke sayfaları
C = [
 # slug, ülke, bayrak, vize durumu, gün, apostil, vurgu, ek (fa)
 ('turkiye', 'Türkiye', 'tr', 'exempt', 90, True, 'Türk vatandaşları turizm ve kısa iş seyahatlerinde Brezilya’ya vizesiz girebilir. Oturum için ise başvuru yoluna göre konsolosluktan geçici vize (VITEM) veya Brezilya içinden oturum başvurusu gerekir.', None),
 ('iran', 'İran', 'ir', 'visa', 0, False, 'İran vatandaşlarının Brezilya’ya girişte vize alması gerekir. İran Lahey Apostil Sözleşmesi’ne taraf olmadığından belgeler apostil yerine konsolosluk tasdiki (legalizasyon) ile hazırlanır.', 'fa'),
 ('azerbaycan', 'Azerbaycan', 'az', 'visa', 0, True, 'Azerbaycan vatandaşlarının Brezilya’ya girişte vize alması gerekir. Azerbaycan Apostil Sözleşmesi’ne taraftır; belgeler apostil ve Portekizce yeminli tercümeyle hazırlanır.', None),
 ('rusya', 'Rusya', 'ru', 'exempt', 90, True, 'Rusya vatandaşları kısa süreli seyahatlerde Brezilya’ya vizesiz girebilir. Uzun süreli yaşam için oturum yolu ve belge hazırlığı ayrıca planlanmalıdır.', None),
 ('ukrayna', 'Ukrayna', 'ua', 'exempt', 90, True, 'Ukrayna vatandaşları kısa süreli seyahatlerde Brezilya’ya vizesiz girebilir. Uzun süreli yaşam için oturum yolu ve belge hazırlığı ayrıca planlanmalıdır.', None),
 ('kazakistan', 'Kazakistan', 'kz', 'exempt', 30, True, 'Kazakistan vatandaşları kısa süreli seyahatlerde Brezilya’ya vizesiz girebilir (izin verilen süre daha kısadır). Uzun süreli yaşam için oturum yolu ayrıca planlanmalıdır.', None),
 ('ozbekistan', 'Özbekistan', 'uz', 'visa', 0, True, 'Özbekistan vatandaşlarının Brezilya’ya girişte vize alması gerekir. Özbekistan Apostil Sözleşmesi’ne taraftır.', None),
 ('pakistan', 'Pakistan', 'pk', 'visa', 0, True, 'Pakistan vatandaşlarının Brezilya’ya girişte vize alması gerekir. Pakistan 2023’te Apostil Sözleşmesi’ne katılmıştır; belgeler apostille hazırlanabilir.', None),
 ('misir', 'Mısır', 'eg', 'visa', 0, False, 'Mısır vatandaşlarının Brezilya’ya girişte vize alması gerekir. Belgeler apostil yerine konsolosluk tasdiki (legalizasyon) ile hazırlanır.', None),
 ('suriye', 'Suriye', 'sy', 'visa', 0, False, 'Suriye vatandaşlarının Brezilya’ya girişte vize alması gerekir. Brezilya zaman zaman insani amaçlı vize düzenlemeleri uygular; güncel durumu birlikte teyit ederiz. Belgeler konsolosluk tasdikiyle hazırlanır.', None),
]
ROUTES = [('Aile birleşimi', 'Brezilyalı veya oturumu olan eş, partner, çocuk ya da ebeveyn üzerinden.'), ('Çalışma', 'Brezilya’daki bir işverenle iş sözleşmesi ve izinlerle.'), ('Yatırım ve şirket', 'Brezilya’da şirket kuruluşu veya yatırım üzerinden.'), ('Emeklilik', 'Düzenli ve yeterli emekli maaşını belgeleyenler için.'), ('Dijital göçebe', 'Yurt dışındaki işvereni veya müşterileri için uzaktan çalışanlar.'), ('Eğitim', 'Brezilya’da okul veya üniversiteye kabul alanlar.')]
FA = '''<section class="cp-fa lp-sec" dir="rtl" lang="fa"><div class="kicker">خلاصه به فارسی</div><h2>اقامت برزیل برای شهروندان ایران</h2><p>شهروندان ایران برای ورود به برزیل به ویزا نیاز دارند. چون ایران عضو کنوانسیون آپوستیل لاهه نیست، مدارک باید از طریق تأیید کنسولی (لگالیزاسیون) آماده و به پرتغالی ترجمه رسمی شوند. مسیرهای رایج اقامت: الحاق خانواده، کار، سرمایه‌گذاری و ثبت شرکت، بازنشستگی و ویزای عشایر دیجیتال.</p><p><b>مشاوره اولیه رایگان ۱۵ دقیقه‌ای — به زبان فارسی، با ترجمه همزمان.</b> شما فارسی صحبت می‌کنید و وکیل ما پرتغالی؛ ترجمه به صورت زیرنویس زنده نمایش داده می‌شود.</p><button class="btn" type="button" onclick="book()">رزرو مشاوره رایگان ↗</button></section>'''
links = []
for slug, name, fl, st, days, apo, lead, extra in C:
    path = f'/brezilya-vizesi/{slug}/'
    visa = (f'<div class="cp-visa ok">{ic("check")}<div><b>Ziyaret için vize gerekmez</b><span>{name} vatandaşları turizm / kısa iş amaçlı girişte vizeden muaftır; izin verilen süre genellikle {days} güne kadardır. Kalış ve çalışma için oturum gerekir.</span></div></div>' if st == 'exempt'
            else f'<div class="cp-visa warn">{ic("alert")}<div><b>Ziyaret için vize gerekir</b><span>{name} vatandaşları Brezilya’ya girişten önce konsolosluktan vize almalıdır. Panelimizdeki vize formu ile belge listenizi hazırlayabilirsiniz.</span></div></div>')
    doc = ('apostil (Lahey Sözleşmesi’ne taraf)' if apo else 'konsolosluk tasdiki / legalizasyon (Lahey Apostil Sözleşmesi’ne taraf değil)')
    FQ = [(f'{name} vatandaşları Brezilya’ya vizesiz girebilir mi?', ('Evet, ziyaret amaçlı kısa girişlerde vize gerekmez; izin verilen süre genellikle ' + str(days) + ' güne kadardır. Kurallar değişebileceği için seyahatten önce güncel durumu teyit edin.') if st == 'exempt' else 'Hayır, ziyaret için de vize gerekir. Vize türü seyahat amacına göre belirlenir.'),
          (f'{name}’dan alınan belgeler Brezilya’da nasıl geçerli olur?', f'{name} belgeleri için {doc} ve ardından Portekizceye yeminli tercüme (tradução juramentada) gerekir.'),
          (f'{name} vatandaşı olarak Brezilya’da oturum alabilir miyim?', 'Evet; aile birleşimi, çalışma, yatırım/şirket, emeklilik, dijital göçebe veya eğitim gibi yollardan biriyle oturum başvurusu yapılabilir. Size uygun yolu ücretsiz ön görüşmede netleştiririz.'),
          ('Görüşmeyi hangi dilde yapabilirim?', 'Türkçe, Portekizce, İngilizce veya Farsça. Siz kendi dilinizde konuşursunuz; görüşmede canlı çeviri vardır.')]
    main = f'''{crumbs(("Ülkeye göre Brezilya", "/brezilya-vizesi/"), (name, None))}
<section class="cp-hero wrap"><div><span class="nl-tag">{FL(fl, 20)} {name.upper()} VATANDAŞLARI İÇİN</span><h1>{name} vatandaşları için Brezilya vizesi ve oturum</h1><p>{lead}</p>{visa}<div class="bmlp-cta" style="margin-top:20px">{CTA()}<a class="bmlp-more" href="/canli-cevirili-gorusme/">Kendi dilinizde görüşün →</a></div></div>
<aside class="cp-facts"><div><small>Ziyaret vizesi</small><b>{'Gerekmez · ' + str(days) + ' gün' if st == 'exempt' else 'Gerekir'}</b></div><div><small>Belge tasdiki</small><b>{'Apostil' if apo else 'Konsolosluk tasdiki'}</b></div><div><small>Tercüme</small><b>Portekizce yeminli</b></div><div><small>Ön görüşme</small><b>Ücretsiz · 15 dk</b></div></aside></section>
<div class="wrap"><section class="lp-sec"><div class="kicker">OTURUM YOLLARI</div><h2>{name} vatandaşları için en sık kullanılan yollar</h2><div class="lp-grid">{''.join(f'<article><h3>{t}</h3><p>{d}</p></article>' for t, d in ROUTES)}</div></section>
<section class="lp-sec"><div class="kicker">BELGELER</div><h2>Belgelerinizi {name}’dan nasıl hazırlarsınız?</h2><ol class="lp-steps"><li><b>1</b><h3>Belgeleri toplayın</h3><p>Pasaport, doğum/evlilik belgeleri, adli sicil kaydı ve yolunuza özel gelir veya iş belgeleri.</p></li><li><b>2</b><h3>{'Apostil' if apo else 'Konsolosluk tasdiki'}</h3><p>{name} belgeleri için {doc}.</p></li><li><b>3</b><h3>Yeminli tercüme</h3><p>Brezilya’da kullanılacak belgeler Portekizceye yeminli tercümanla çevrilir. Koordinasyonu biz yaparız.</p></li></ol></section>
{FA if extra == 'fa' else ''}
<section class="lp-sec"><div class="kicker">SIK SORULANLAR</div><h2>Merak edilenler</h2>{faq_html(FQ)}</section>
<div class="lp-cta"><div><h2>Planınızı kendi dilinizde konuşalım.</h2><p>15 dakika · ücretsiz · taahhüt yok. Size uygun yolu ve belge listenizi netleştirelim.</p></div>{CTA()}</div>
<p class="rh-legal">Vize ve belge kuralları değişebilir; bilgiler genel amaçlıdır. Başvurudan önce güncel kuralları Brezilya Dışişleri Bakanlığı (MRE) ve konsolosluk kaynaklarından birlikte teyit ederiz.</p></div>'''
    page(path, f'{name} Vatandaşları için Brezilya Vizesi ve Oturum 2026', f'{name} vatandaşları için Brezilya vize durumu, oturum yolları, {"apostil" if apo else "konsolosluk tasdiki"} ve yeminli tercüme. Kendi dilinizde ücretsiz ön görüşme.', main, ld=[faq_ld(FQ)])
    links.append((slug, name, fl, st, days))
idx = ''.join(f'<a class="cp-tile" href="/brezilya-vizesi/{s}/">{FL(f, 30)}<b>{n}</b><span>{"Vizesiz · " + str(d) + " gün" if st == "exempt" else "Vize gerekir"}</span></a>' for s, n, f, st, d in links)
main = f'''{crumbs(("Ülkeye göre Brezilya", None))}<section class="pr-hero wrap"><div class="kicker">ÜLKENİZİ SEÇİN</div><h1>Ülkeye göre Brezilya vizesi ve oturum</h1><p>Vatandaşı olduğunuz ülkeye göre giriş kuralları, belge tasdiki (apostil veya konsolosluk) ve en uygun oturum yolları.</p></section>
<div class="wrap"><div class="cp-grid">{idx}</div><p class="rh-legal">Listede olmayan bir ülke için panelimizdeki vize formunu kullanabilir veya ücretsiz ön görüşme planlayabilirsiniz.</p></div>'''
page('/brezilya-vizesi/', 'Ülkeye Göre Brezilya Vizesi ve Oturum Rehberi', 'Türkiye, İran, Azerbaycan, Rusya ve diğer ülke vatandaşları için Brezilya vize durumu, belge tasdiki ve oturum yolları. Ücretsiz ön görüşme.', main)
print('ok', len(links), 'ülke')
