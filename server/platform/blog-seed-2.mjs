// One-time: four more guide articles (item 'migration-blog-v2'). Deleted articles are not re-created.
const U = (id, w = 1600) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;
const fig = (id, alt, name, user) => `<figure><img src="${U(id, 1400)}" alt="${alt}" width="1400" height="933"><figcaption>Fotoğraf: <a href="https://unsplash.com/@${user}">${name}</a> / Unsplash</figcaption></figure>`;
const D = '2026-11-01', AUTHOR = {name: 'Brazil Migration Editör Ekibi', role: 'São Paulo · Göç ve oturum rehberliği'};

export const POSTS = [
{
  slug: 'brezilya-vatandasligi-nasil-alinir', category: 'Vatandaşlık', date: D, modified: D, author: AUTHOR, published: true,
  title: 'Brezilya Vatandaşlığı Nasıl Alınır? Şartlar, Süreler ve Başvuru Adımları',
  excerpt: 'Olağan vatandaşlık için kaç yıl ikamet gerekir, Brezilyalı eşi veya çocuğu olanlar için süre nasıl kısalır, Portekizce nasıl belgelenir ve başvuru nereden yapılır?',
  lead: 'Kısaca: Süresiz oturum izniyle Brezilya’da en az 4 yıl yaşayan yabancılar olağan vatandaşlığa (naturalização ordinária) başvurabilir. Brezilyalı bir eşiniz, partneriniz veya çocuğunuz varsa bu süre 1 yıla iner. Portekizce iletişim yeterliliği ve sabıka kaydı aranır; başvuru federal hükümetin çevrim içi platformundan yapılır.',
  cover: U('photo-1548963670-aaaa8f73a5e3'), coverAlt: 'Mavi gökyüzü altında Rio de Janeiro', coverCredit: {name: 'Krys Amon', url: 'https://unsplash.com/@krysamon'},
  seo: {title: 'Brezilya Vatandaşlığı Nasıl Alınır? Şartlar ve Süreler (2026) | Brazil Migration', description: 'Brezilya vatandaşlığı şartları: 4 yıl ikamet, Brezilyalı eş veya çocukla 1 yıl, Portekizce yeterlilik, gerekli belgeler, başvuru adımları ve çifte vatandaşlık.'},
  content: `<p>Brezilya’da birkaç yıl yaşadıktan sonra birçok kişi bir sonraki adımı düşünür: vatandaşlık. Brezilya pasaportu; seçimlerde oy kullanma, kamu sınavlarına girme ve oturum yenileme derdinden kurtulma gibi kalıcı haklar sağlar. Bu rehberde vatandaşlık türlerini, şartları ve başvuru sürecini özetliyoruz.</p>
<h2>Vatandaşlık türleri</h2>
<p>Yabancıların Brezilya vatandaşlığı, 13.445 sayılı Göç Yasası’nda düzenlenir. Başlıca dört yol vardır:</p>
<ul><li><strong>Olağan vatandaşlık (naturalização ordinária):</strong> Brezilya’da belirli bir süre yaşamış yetişkinler için en yaygın yoldur.</li><li><strong>Olağanüstü vatandaşlık (naturalização extraordinária):</strong> Brezilya’da 15 yıldan uzun süre kesintisiz yaşamış ve sabıka kaydı bulunmayan kişiler içindir.</li><li><strong>Özel vatandaşlık:</strong> Brezilyalı bir diplomat veya devlet görevlisiyle uzun süre evli olanlar gibi istisnai durumlar içindir.</li><li><strong>Geçici vatandaşlık (naturalização provisória):</strong> Brezilya’ya 10 yaşından önce yerleşen çocuklar için öngörülür; reşit olduktan sonra kalıcı hale getirilebilir.</li></ul>
<h2>Olağan vatandaşlığın şartları</h2>
<ol><li><strong>Yaş ve ehliyet:</strong> En az 18 yaşında olmak.</li><li><strong>İkamet süresi:</strong> Süresiz oturum izniyle Brezilya’da <strong>en az 4 yıl</strong> yaşamış olmak.</li><li><strong>Portekizce:</strong> Durumunuza uygun şekilde Portekizce iletişim kurabildiğinizi belgelemek.</li><li><strong>Sabıka kaydı:</strong> Mahkûmiyet bulunmaması veya hukuken rehabilite edilmiş olmak.</li></ol>
<div class="bl-tip"><p><strong>Süre kısalabilir:</strong> Brezilyalı bir çocuğunuz varsa veya Brezilyalı biriyle evli ya da birlikte yaşıyorsanız (união estável), ikamet şartı <strong>1 yıla</strong> iner. Brezilya’da ülkeye önemli hizmet verenler veya özel mesleki yeterliliği olanlar için de indirimli süreler öngörülmüştür.</p></div>
<h2>Portekizce nasıl belgelenir?</h2>
<p>En bilinen yol, Brezilya Eğitim Bakanlığı’nın yabancılar için düzenlediği <strong>Celpe-Bras</strong> sınavıdır. Bunun dışında Brezilya’da tamamlanmış bir lisans veya lisansüstü diploması, Eğitim Bakanlığı’nca tanınan bir yükseköğretim kurumunun dil sertifikası veya ENCCEJA gibi resmî sınav belgeleri de kabul edilebilir.</p>
${fig('photo-1450101499163-c8848c66ca85', 'Masada belge dolduran bir kişi', 'Scott Graham', 'amstram')}
<h2>Gerekli belgeler</h2>
<ul><li>Geçerli pasaport ve CRNM (yabancı kimlik kartı),</li><li>İkamet süresini gösteren belgeler (oturum izni kararları, kira sözleşmesi, faturalar gibi),</li><li>Son 4 yılda yaşadığınız Brezilya eyaletlerinden federal ve eyalet adli sicil belgeleri,</li><li>Menşe ülkenizden adli sicil kaydı (apostilli ve Brezilya’da yeminli tercümeli),</li><li>Portekizce yeterlilik belgesi,</li><li>1 yıllık indirimden yararlanıyorsanız evlilik, birliktelik veya çocuğunuzun doğum belgesi.</li></ul>
<h2>Başvuru adım adım</h2>
<ol><li><strong>Uygunluğu kontrol edin:</strong> İkamet sürenizi oturum izninizin başlangıç tarihinden hesaplayın.</li><li><strong>Belgeleri hazırlayın:</strong> Yurt dışı belgelerin apostilini ve yeminli tercümesini önceden yaptırın.</li><li><strong>Çevrim içi başvurun:</strong> Başvuru, federal hükümetin <strong>Naturalizar-se</strong> platformu (gov.br hesabı ile) üzerinden yapılır.</li><li><strong>Federal Polis randevusu:</strong> Ön incelemeden sonra Federal Polis’te belgelerin asıllarını gösterir ve biyometri verirsiniz.</li><li><strong>Karar:</strong> Olumlu karar Resmî Gazete’de (Diário Oficial da União) yayımlanır.</li><li><strong>Tören ve belgeler:</strong> Ardından vatandaşlık belgenizi alır, Brezilya kimlik kartı ve pasaport için başvurabilirsiniz.</li></ol>
<div class="bl-note"><p><strong>Not:</strong> Değerlendirme süresi yoğunluğa göre aylar sürebilir. Güncel harç ve belge listesini başvuru platformundan kontrol edin.</p></div>
<h2>Çifte vatandaşlık</h2>
<p>Brezilya, vatandaşlığa geçerken önceki vatandaşlığınızdan vazgeçmenizi şart koşmaz. Türkiye de çifte vatandaşlığa izin verir; ancak başka bir vatandaşlık kazanan Türk vatandaşlarının bunu Türk makamlarına (konsolosluk veya nüfus müdürlüğü) bildirmesi gerekir. Başka bir ülkenin vatandaşıysanız o ülkenin kurallarını ayrıca kontrol edin.</p>
<p>Brezilya vatandaşlığı sürecinizi planlamak için <a href="/brezilya-vatandasligi/">vatandaşlık hizmet sayfamıza</a> göz atabilir veya ücretsiz ön görüşme talep edebilirsiniz. Henüz oturum izniniz yoksa <a href="/blog/brezilyada-oturum-izni-nasil-alinir/">Brezilya’da oturum izni rehberimizle</a> başlayın.</p>`,
  faq: [
    {q: 'Brezilya vatandaşlığı için kaç yıl beklemem gerekir?', a: 'Olağan vatandaşlık için süresiz oturum izniyle en az 4 yıl Brezilya’da yaşamış olmanız gerekir. Brezilyalı bir eşiniz, partneriniz veya çocuğunuz varsa bu süre 1 yıla iner.'},
    {q: 'Turist olarak geçirdiğim süre ikametten sayılır mı?', a: 'Hayır. Süre, oturum izniyle yasal olarak ikamet ettiğiniz dönem üzerinden hesaplanır.'},
    {q: 'Portekizce sınavı zorunlu mu?', a: 'Portekizce iletişim yeterliliğinin belgelenmesi zorunludur. Celpe-Bras en yaygın yoldur; Brezilya’da tamamlanmış bir üniversite eğitimi veya tanınan bazı sertifikalar da kabul edilebilir.'},
    {q: 'Türk vatandaşlığımı kaybeder miyim?', a: 'Brezilya önceki vatandaşlıktan vazgeçmeyi şart koşmaz ve Türkiye çifte vatandaşlığa izin verir. Yeni vatandaşlığınızı Türk makamlarına bildirmeniz gerekir.'},
  ],
  sources: [
    {label: 'Lei nº 13.445/2017 — Göç Yasası, vatandaşlık maddeleri (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2017/lei/l13445.htm'},
    {label: 'UNHCR Brezilya — Naturalização (şartlar ve başvuru)', url: 'https://help.unhcr.org/brazil/naturalizacao/'},
  ],
},
{
  slug: 'cpf-nedir-nasil-alinir', category: 'Rehber', date: D, modified: D, author: AUTHOR, published: true,
  title: 'CPF Nedir, Türkiye’den Nasıl Alınır? Brezilya Vergi Numarası Rehberi',
  excerpt: 'Brezilya’da banka hesabından kira sözleşmesine kadar her işlem için gereken CPF numarasını Türkiye’den veya Brezilya’dan nasıl alacağınızı anlatıyoruz.',
  lead: 'Kısaca: CPF, Brezilya Gelir İdaresi’nin (Receita Federal) verdiği kişisel vergi numarasıdır. Türkiye’de yaşayan yabancılar CPF’yi Brezilya’nın Ankara Büyükelçiliği veya İstanbul Başkonsolosluğu’na randevuyla başvurarak ücretsiz alabilir.',
  cover: U('photo-1645536642772-93d4df8b8172'), coverAlt: 'São Paulo’da yoğun trafikli Avenida Paulista', coverCredit: {name: 'Antonino Visalli', url: 'https://unsplash.com/@antoninovisalli'},
  seo: {title: 'CPF Nedir, Türkiye’den Nasıl Alınır? (2026) | Brazil Migration', description: 'Brezilya CPF numarası nedir, ne işe yarar, Türkiye’den konsolosluk üzerinden nasıl alınır, hangi belgeler gerekir ve Brezilya’da nasıl başvurulur?'},
  content: `<p>Brezilya’ya taşınmadan önce alınması gereken ilk belgelerden biri CPF’dir. Oturum izni başvurusu, banka hesabı, telefon hattı, kira sözleşmesi, internet alışverişi ve hatta bazı market sadakat kartları bile CPF numarası ister. İyi haber şu: CPF almak ücretsizdir ve Brezilya’ya gelmeden önce de alınabilir.</p>
<h2>CPF nedir?</h2>
<p><strong>CPF (Cadastro de Pessoas Físicas)</strong>, Brezilya Gelir İdaresi’nin (Receita Federal) kişilere verdiği 11 haneli vergi kimlik numarasıdır. Türkiye’deki vergi kimlik numarasına benzer; ancak Brezilya’da günlük hayatta çok daha sık kullanılır. CPF bir kimlik kartı değildir: yabancıların kimlik belgesi CRNM’dir (yabancı kimlik kartı).</p>
<h2>CPF ne işe yarar?</h2>
<ul><li>Oturum izni ve diğer göç başvuruları,</li><li>Banka hesabı açma ve Pix ile ödeme,</li><li>Kira ve satın alma sözleşmeleri,</li><li>Telefon hattı ve internet aboneliği,</li><li>Şirket ortaklığı ve yatırım işlemleri,</li><li>Çevrim içi alışveriş ve fatura.</li></ul>
<h2>Türkiye’den CPF nasıl alınır?</h2>
<p>Türkiye’de yaşayan yabancılar CPF başvurusunu, bağlı oldukları Brezilya temsilciliğine (Ankara Büyükelçiliği veya İstanbul Başkonsolosluğu) <strong>şahsen</strong> yapar:</p>
<ol><li><strong>Randevu alın:</strong> Temsilciliğin randevu sistemi (e-consular) üzerinden CPF için randevu alın.</li><li><strong>Formu doldurun:</strong> Receita Federal’in CPF başvuru formunu (FCPF) doldurup imzalayın.</li><li><strong>Belgeleri getirin:</strong> Pasaport veya kimlik belgesi ile doğum ya da evlilik belgesi.</li><li><strong>Numaranızı alın:</strong> Başvuru onaylandığında CPF numaranız size bildirilir. Bu hizmet ücretsizdir.</li></ol>
<div class="bl-warn"><p><strong>Dikkat:</strong> Receita Federal’in e-posta ile başvuru kanalı ve çevrim içi formu, yurt dışında yaşayan <strong>Brezilya vatandaşları</strong> içindir. Yabancılar konsolosluk randevusuyla başvurmalıdır. CPF için ücret talep eden aracı sitelere itibar etmeyin.</p></div>
${fig('photo-1603796846097-bee99e4a601f', 'Kâğıda not alan bir kişi', 'Romain Dancre', 'romaindancre')}
<h2>Brezilya’dayken CPF almak</h2>
<p>Brezilya’ya geldikten sonra da CPF alabilirsiniz. Başvuru Receita Federal’in hizmet birimleri ve yetkili kurumlar üzerinden yapılır; pasaportunuzu ve varsa CRNM’nizi yanınızda bulundurun. Oturum izni başvurusu sırasında CPF’nizin olması süreci hızlandırır; bu yüzden mümkünse Türkiye’den çıkmadan alın.</p>
<h2>CPF’nizi güncel tutun</h2>
<p>CPF numaranız ömür boyu aynı kalır. Adres, medeni durum veya isim değişikliklerinde kaydınızı güncellemeniz gerekir. CPF’nin durumunu Receita Federal’in internet sitesinden sorgulayabilirsiniz; “regular” (geçerli) görünmesi banka ve sözleşme işlemleri için önemlidir.</p>
<p>Oturum izni başvurusunun diğer adımları için <a href="/blog/brezilyada-oturum-izni-nasil-alinir/">Brezilya’da oturum izni rehberimizi</a> okuyabilirsiniz.</p>`,
  faq: [
    {q: 'CPF almak ücretli mi?', a: 'Hayır. Brezilya temsilcilikleri üzerinden yapılan CPF başvurusu ücretsizdir.'},
    {q: 'CPF ile CRNM aynı şey mi?', a: 'Hayır. CPF vergi numarasıdır; CRNM ise Brezilya’da yaşayan yabancıların kimlik kartıdır. İkisine de ihtiyacınız olur.'},
    {q: 'CPF’yi çevrim içi alabilir miyim?', a: 'Receita Federal’in çevrim içi form ve e-posta kanalı yurt dışındaki Brezilya vatandaşları içindir. Yabancılar konsoloslukta şahsen başvurur.'},
    {q: 'Ailemin her bireyi için ayrı CPF gerekir mi?', a: 'Evet. CPF kişiseldir; çocuklar dahil her aile bireyi için ayrı numara alınır.'},
  ],
  sources: [
    {label: 'gov.br — Inscrever no CPF no exterior (yurt dışından CPF)', url: 'https://www.gov.br/pt-br/servicos/inscrever-no-cpf-no-exterior'},
    {label: 'Itamaraty — e-consular randevu sistemi', url: 'https://econsular.itamaraty.gov.br/'},
  ],
},
{
  slug: 'yabanci-olarak-brezilyada-sirket-kurmak', category: 'Şirket Kurulumu', date: D, modified: D, author: AUTHOR, published: true,
  title: 'Yabancı Olarak Brezilya’da Şirket Kurmak: LTDA, SLU ve Adım Adım Süreç',
  excerpt: 'Yabancılar Brezilya’da hangi şirket türlerini kurabilir, yurt dışında yaşayan ortaklar için ne gerekir, kuruluş adımları ve vergi rejimleri nelerdir?',
  lead: 'Kısaca: Yabancılar Brezilya’da genellikle limited şirket (LTDA) veya tek ortaklı limited şirket (SLU) kurar. Yurt dışında yaşayan ortağın CPF alması, Brezilya Merkez Bankası’na yabancı yatırım kaydı yaptırması ve Brezilya’da yaşayan bir vekil ataması gerekir; şirketi yönetecek kişinin Brezilya’da ikamet etmesi şarttır.',
  cover: U('photo-1758518730327-98070967caab'), coverAlt: 'Takım elbiseli bir kadın toplantıda belge gösteriyor', coverCredit: {name: 'Vitaly Gariev', url: 'https://unsplash.com/@silverkblack'},
  seo: {title: 'Yabancı Olarak Brezilya’da Şirket Kurmak (2026 Rehberi) | Brazil Migration', description: 'Brezilya’da şirket kurmak: LTDA ve SLU, yabancı ortak şartları, CPF ve Merkez Bankası kaydı, yerleşik yönetici, kuruluş adımları ve vergi rejimleri.'},
  content: `<p>Brezilya, Latin Amerika’nın en büyük ekonomisi ve 200 milyonu aşan nüfusuyla birçok girişimci için cazip bir pazar. Yabancıların Brezilya’da şirket kurmasının önünde genel bir engel yoktur; ancak yurt dışında yaşayan ortaklar için bazı ek adımlar gerekir.</p>
<h2>Hangi şirket türleri kurulabilir?</h2>
<table><thead><tr><th>Tür</th><th>Ortak sayısı</th><th>Kimler için uygun?</th></tr></thead><tbody>
<tr><td>Sociedade Limitada (LTDA)</td><td>En az 2</td><td>Ortaklı işletmeler; en yaygın şirket türü</td></tr>
<tr><td>Sociedade Limitada Unipessoal (SLU)</td><td>1</td><td>Tek başına şirket kurmak isteyenler</td></tr>
<tr><td>Sociedade Anônima (S.A.)</td><td>En az 2</td><td>Büyük yatırımlar ve halka açılma planı</td></tr>
<tr><td>MEI (bireysel mikro girişimci)</td><td>1</td><td>Yalnızca Brezilya’da oturum izni olan kişiler; ciro ve faaliyet sınırları var</td></tr>
</tbody></table>
<p>Her iki limited şirket türünde de ortakların sorumluluğu, koydukları sermaye ile sınırlıdır. Bazı sektörlerde (medya, kabotaj, bazı sağlık hizmetleri, madencilik gibi) yabancı ortaklığa kısıtlamalar bulunur.</p>
<h2>Yurt dışında yaşayan ortak için gerekenler</h2>
<ul><li><strong>CPF:</strong> Her yabancı ortak için Brezilya vergi numarası. Türkiye’den nasıl alınacağını <a href="/blog/cpf-nedir-nasil-alinir/">CPF rehberimizde</a> anlattık.</li><li><strong>Merkez Bankası kaydı:</strong> Yabancı sermaye, Brezilya Merkez Bankası’nın yabancı doğrudan yatırım sistemine (RDE-IED) kaydedilir; yurt dışındaki ortak için CDNR kaydı yapılır.</li><li><strong>Brezilya’da vekil:</strong> Yurt dışında yaşayan ortak, Brezilya’da yaşayan ve resmî tebligatları almaya yetkili bir vekil (procurador) atamalıdır. Vekâletname noter onaylı ve apostilli olmalıdır.</li><li><strong>Yerleşik yönetici:</strong> Şirketi yönetecek kişinin (administrador) Brezilya’da ikamet etmesi gerekir. Bu kişi Brezilyalı olabileceği gibi uygun oturum iznine sahip bir yabancı da olabilir.</li></ul>
${fig('photo-1562564055-71e051d33c19', 'Masada evrak imzalayan iki kişi', 'Gabrielle Henderson', 'gabriellefaithhenderson')}
<h2>Kuruluş adımları</h2>
<ol><li><strong>Faaliyet ve şirket türünü belirleyin:</strong> Faaliyet kodları (CNAE) vergi rejimini ve izinleri belirler.</li><li><strong>Ticaret unvanı ve adres:</strong> Unvanın kullanılabilirliği ve faaliyet adresinin belediye imar kurallarına uygunluğu kontrol edilir.</li><li><strong>Şirket sözleşmesi (contrato social):</strong> Ortaklar, sermaye, yönetici ve faaliyet konusu belirlenir.</li><li><strong>Ticaret sicili:</strong> Sözleşme eyalet ticaret siciline (São Paulo’da JUCESP) tescil edilir.</li><li><strong>CNPJ:</strong> Şirket vergi numarası Receita Federal’den alınır.</li><li><strong>Belediye ve eyalet kayıtları:</strong> Faaliyete göre belediye kaydı, eyalet kaydı ve çalışma ruhsatı (alvará) alınır.</li><li><strong>Banka hesabı ve muhasebe:</strong> Kurumsal banka hesabı açılır, bir muhasebeciyle (contador) çalışılır.</li></ol>
<div class="bl-tip"><p><strong>İpucu:</strong> Yurt dışından imzalanacak belgeleri baştan planlayın. Vekâletname, apostil ve yeminli tercüme süreleri kuruluş takviminin en uzun kısmı olabilir.</p></div>
<h2>Vergi rejimleri</h2>
<ul><li><strong>Simples Nacional:</strong> Yıllık cirosu 4,8 milyon BRL’ye kadar olan küçük işletmeler için basitleştirilmiş rejim. Ortaklarından biri yurt dışında yaşayan şirketler bu rejimden yararlanamaz.</li><li><strong>Lucro Presumido:</strong> Kârın, cironun belirli bir yüzdesi olarak varsayıldığı rejim; orta ölçekli şirketlerde yaygındır.</li><li><strong>Lucro Real:</strong> Gerçek kâr üzerinden vergilendirme; büyük şirketler için zorunlu olabilir.</li></ul>
<div class="bl-note"><p><strong>Vergi reformu:</strong> Brezilya, tüketim vergilerini 2026’dan itibaren aşamalı olarak yeni CBS ve IBS vergileriyle değiştiriyor. Fiyatlama ve fatura süreçlerinizi bir muhasebeciyle birlikte planlayın.</p></div>
<h2>Şirket kurmak oturum izni sağlar mı?</h2>
<p>Şirket kurmak tek başına oturum izni vermez. Ancak belirli bir tutarın üzerinde yatırım yapanlar için yatırımcı oturum izni yolu vardır. Ayrıntılar için <a href="/blog/brezilyada-oturum-izni-nasil-alinir/">oturum izni rehberimize</a> ve <a href="/brezilyada-sirket-kurma/">şirket kurulumu hizmet sayfamıza</a> bakabilirsiniz.</p>`,
  faq: [
    {q: 'Brezilya’ya gitmeden şirket kurabilir miyim?', a: 'Evet. Yurt dışında yaşayan ortaklar vekâletname ile Brezilya’da yaşayan bir vekil atayarak şirket kurabilir. Ancak şirketi yönetecek kişinin Brezilya’da ikamet etmesi gerekir.'},
    {q: 'Tek başıma şirket kurabilir miyim?', a: 'Evet. Tek ortaklı limited şirket (SLU) ile ortağa ihtiyaç duymadan şirket kurabilirsiniz.'},
    {q: 'Yabancılar MEI açabilir mi?', a: 'MEI yalnızca Brezilya’da oturum izni olan kişiler içindir ve ciro ile faaliyet sınırları vardır.'},
    {q: 'Kuruluş ne kadar sürer?', a: 'Belgeler hazırsa ticaret sicili ve CNPJ birkaç hafta içinde tamamlanabilir. Yurt dışından vekâletname ve apostil süreçleri bu süreyi uzatabilir.'},
  ],
  sources: [
    {label: 'Lei Complementar nº 123/2006 — Simples Nacional (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm'},
    {label: 'Contabilizei — Abertura de empresa por estrangeiro no Brasil', url: 'https://www.contabilizei.com.br/contabilidade-online/abertura-de-empresa-por-estrangeiro-no-brasil'},
  ],
},
{
  slug: 'brezilya-dijital-gocebe-vizesi', category: 'Oturum İzni', date: D, modified: D, author: AUTHOR, published: true,
  title: 'Brezilya Dijital Göçebe Vizesi (VITEM XIV): Şartlar, Belgeler ve Başvuru',
  excerpt: 'Yurt dışındaki bir şirket veya müşteriler için uzaktan çalışıyorsanız Brezilya’da 1 yıla kadar yasal olarak yaşayabilirsiniz. Gelir şartı, belgeler ve başvuru adımları.',
  lead: 'Kısaca: Yurt dışındaki bir işveren veya müşteriler için uzaktan çalışanlar, aylık en az 1.500 ABD doları gelir veya en az 18.000 ABD doları banka bakiyesiyle Brezilya’nın dijital göçebe vizesine (VITEM XIV) başvurabilir. İzin 1 yıla kadar verilir ve aynı süre için uzatılabilir.',
  cover: U('photo-1510915228340-29c85a43dcfe'), coverAlt: 'Dizüstü bilgisayarlarla çalışan bir kişi', coverCredit: {name: 'Jefferson Santos', url: 'https://unsplash.com/@jefflssantos'},
  seo: {title: 'Brezilya Dijital Göçebe Vizesi (VITEM XIV) 2026 | Brazil Migration', description: 'Brezilya dijital göçebe vizesi: aylık 1.500 USD gelir veya 18.000 USD bakiye şartı, gerekli belgeler, konsolosluk başvurusu, süre, uzatma ve vergi.'},
  content: `<p>Uzaktan çalışmanın yaygınlaşmasıyla Brezilya, 2022’de dijital göçebeler için özel bir vize ve oturum izni yolu açtı. Bu yol, Brezilya’da yaşayıp yurt dışındaki işinize devam etmenize imkân tanır.</p>
<h2>Kimler başvurabilir?</h2>
<p>Ulusal Göç Konseyi’nin 45/2021 sayılı kararına göre; yurt dışında kurulu bir işveren için çalışan veya yurt dışındaki müşterilerine serbest olarak hizmet veren ve işini Brezilya’dan uzaktan yapabilen yabancılar başvurabilir. Brezilya’daki bir şirket için çalışmak bu vizenin kapsamında değildir; bunun için çalışma izni gerekir.</p>
<h2>Gelir şartı</h2>
<ul><li>Yurt dışı kaynaklı <strong>aylık en az 1.500 ABD doları</strong> düzenli gelir, <strong>veya</strong></li><li>Başvurana ait hesaplarda <strong>en az 18.000 ABD doları</strong> kullanılabilir bakiye.</li></ul>
${fig('photo-1645536642772-93d4df8b8172', 'São Paulo’da Avenida Paulista', 'Antonino Visalli', 'antoninovisalli')}
<h2>Gerekli belgeler</h2>
<ol><li>Geçerli pasaport,</li><li>Uzaktan çalıştığınızı gösteren iş sözleşmesi, hizmet sözleşmeleri veya işveren yazısı,</li><li>Gelir veya banka bakiyesi belgeleri,</li><li>Brezilya’da geçerli sağlık sigortası,</li><li>Son 90 gün içinde alınmış adli sicil kaydı (apostilli),</li><li>Konsolosluğun istediği başvuru formu ve fotoğraf.</li></ol>
<div class="bl-warn"><p><strong>Dikkat:</strong> Konsolosluklar ek belge isteyebilir. Başvurmadan önce bağlı olduğunuz Brezilya temsilciliğinin güncel listesini kontrol edin.</p></div>
<h2>Başvuru ve süre</h2>
<ul><li><strong>Türkiye’den:</strong> Brezilya konsolosluğuna VITEM XIV vizesi için başvurursunuz.</li><li><strong>Brezilya’dayken:</strong> Uygun şekilde ülkeye girdiyseniz, Adalet Bakanlığı üzerinden dijital göçebe oturum izni isteyebilirsiniz.</li><li><strong>Süre:</strong> İzin 1 yıla kadar verilir ve şartlar devam ediyorsa aynı süre için uzatılabilir.</li><li><strong>Kayıt:</strong> Brezilya’ya vardıktan sonra 90 gün içinde Federal Polis’e kaydolup yabancı kimlik kartınızı (CRNM) almanız gerekir.</li></ul>
<h2>Vergi konusu</h2>
<p>Brezilya’da 12 ay içinde 183 günden fazla kalan kişiler genellikle vergi açısından Brezilya’da yerleşik sayılır ve dünya çapındaki gelirleri üzerinden beyan yükümlülüğü doğabilir. Türkiye ile Brezilya arasındaki çifte vergilendirme kuralları ve kendi durumunuz için mutlaka bir vergi danışmanına başvurun.</p>
<p>Dijital göçebe vizesi, Brezilya’daki uzun vadeli planlarınız için iyi bir başlangıç olabilir. Diğer oturum türlerini <a href="/blog/brezilyada-oturum-izni-nasil-alinir/">oturum izni rehberimizde</a> karşılaştırabilirsiniz.</p>`,
  faq: [
    {q: 'Brezilyalı bir şirket için çalışabilir miyim?', a: 'Hayır. Dijital göçebe vizesi yalnızca yurt dışındaki işveren veya müşteriler için yapılan uzaktan çalışmayı kapsar.'},
    {q: 'Ailem benimle gelebilir mi?', a: 'Eş ve çocuklar, aile birleşimi yoluyla birlikte başvurabilir. Gelir ve belge şartlarını konsoloslukla teyit edin.'},
    {q: 'Vize süresi bitince ne olur?', a: 'Şartlar devam ediyorsa izin bir kez daha aynı süre için uzatılabilir. Daha uzun süre kalmak için başka bir oturum türüne geçiş planlanmalıdır.'},
    {q: 'Sağlık sigortası zorunlu mu?', a: 'Evet. Brezilya’da geçerli bir sağlık sigortası başvuru belgeleri arasındadır.'},
  ],
  sources: [
    {label: 'Resolução CNIg nº 45/2021 — dijital göçebe', url: 'https://www.normasbrasil.com.br/norma/resolucao-45-2021_426628.html'},
    {label: 'Itamaraty — Digital Nomads (VITEM XIV, RN 45/2021)', url: 'https://www.gov.br/mre/pt-br/consulado-londres/visa-section/types-of-visa/temporary-visa-vitem/digital-nomads-vitem-xiv-2013-rn-45-2021'},
  ],
},
];

export async function seedBlog2(client, cleanPost) {
  const done = await client.execute({sql: "SELECT id FROM items WHERE id='migration-blog-v2'", args: []});
  if (done.rows.length) return;
  const now = Date.now();
  for (const [i, p] of POSTS.entries()) {
    const exists = await client.execute({sql: "SELECT id FROM items WHERE kind='blog_post' AND json_extract(data,'$.slug')=?", args: [p.slug]});
    if (exists.rows.length) continue;
    const d = {...cleanPost(p), created: now - i * 1000, updated: now - i * 1000};
    await client.execute({sql: 'INSERT INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?)', args: ['blog-' + p.slug.slice(0, 40), 'blog_post', 'owner', JSON.stringify(d), now, now]});
  }
  await client.execute({sql: "INSERT INTO items(id,kind,owner,data,created,updated) VALUES('migration-blog-v2','migration','owner','{}',?,?)", args: [now, now]});
}
