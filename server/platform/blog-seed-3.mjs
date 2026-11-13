// One-time: CPF guide (Turkish, long form) + an independent English CPF article (item 'migration-blog-v3').
// Deleted articles are not re-created. English articles carry lang:'en' and are shown only under /en/blog/.
const U = (id, w = 1600) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;
const D = '2026-11-13';
const AUTHOR = {name: 'Brazil Migration Editör Ekibi', role: 'São Paulo · Göç ve oturum rehberliği'};
const AUTHOR_EN = {name: 'Brazil Migration Editorial Team', role: 'São Paulo · Immigration and relocation guidance'};
const fig = (id, alt, name, user, cap = 'Fotoğraf') => `<figure><img src="${U(id, 1400)}" alt="${alt}" width="1400" height="933"><figcaption>${cap}: <a href="https://unsplash.com/@${user}">${name}</a> / Unsplash</figcaption></figure>`;

export const POSTS = [
{
  slug: 'brezilya-cpf-numarasi-nasil-alinir', category: 'Rehber', date: D, modified: D, author: AUTHOR, published: true,
  title: 'Brezilya CPF Numarası Nasıl Alınır? Türkiye’den Konsolosluk, Vekâletname ve Online Form Rehberi (2026)',
  excerpt: 'Türkiye’den Brezilya’ya gitmeden CPF alınabilir mi? Online form yeterli mi, konsolosluğa şahsen gitmek zorunlu mu, apostilli vekâletnameyle başvuru nasıl yapılır? Belgeler, sık hatalar ve maliyetler.',
  lead: 'Kısaca: Brezilya dışında yaşayan yabancıların ilk CPF kaydı için resmî yol, yetkili Brezilya konsolosluğunda (İstanbul veya Ankara) e-Consular üzerinden başvurup şahsen gitmektir; bu işlem ücretsizdir. Brezilya’da vekâletnameyle temsilci kullanmak alternatiftir ancak vekâletnamenin kabulü ve şahsen başvuru koşulları ayrıca kontrol edilmelidir. Online FCPF formunu doldurmak CPF aldığınız anlamına gelmez.',
  cover: U('photo-1603796846097-bee99e4a601f'), coverAlt: 'Başvuru belgelerine not alan bir kişi', coverCredit: {name: 'Romain Dancre', url: 'https://unsplash.com/@romaindancre'},
  seo: {title: 'Brezilya CPF Numarası Nasıl Alınır? (2026) | Brazil Migration', description: 'Türkiye’den Brezilya’ya gitmeden CPF alınabilir mi? Konsolosluk, apostilli vekâletname ve online FCPF formu: belgeler, adımlar, sık hatalar ve maliyetler.'},
  content: `<p>Brezilya’da gayrimenkul satın almak, şirket kurmak, banka hesabı açmak veya yatırım yapmak isteyen yabancıların karşılaştığı ilk resmî işlemlerden biri CPF numarası edinmektir. İlk bakışta basit görünür: bir internet formu doldurulur, pasaport bilgileri girilir ve numara alınır. Oysa özellikle Brezilya dışında yaşayan yabancılar için süreç bundan karmaşıktır; çünkü formun doldurulması başvurunun tamamlandığı anlamına gelmez.</p>
<p>Bu rehberde hangi başvuru yollarının bulunduğunu, hangi belgelerin gerektiğini, vekâletnamenin hangi aşamada devreye girdiğini, başvuruların neden gecikebildiğini ve CPF alındıktan sonra nelere dikkat edilmesi gerektiğini anlatıyoruz.</p>
<h2>CPF nedir ve neden önemlidir?</h2>
<p><strong>CPF (Cadastro de Pessoas Físicas)</strong>, Brezilya Gelir İdaresi’nin (Receita Federal do Brasil) yönettiği, gerçek kişilere ait ulusal kayıt sistemidir. Her kişiye 11 haneli ve benzersiz bir numara verilir. Brezilya’daki kullanımı yalnızca vergilendirmeyle sınırlı değildir; günlük hayatta T.C. kimlik numarasına benzer bir rol oynar.</p>
<ul><li>Gayrimenkul alım-satımı,</li><li>Şirket ortaklığı,</li><li>Banka hesabı açılışı,</li><li>Finansal yatırım işlemleri,</li><li>Brezilya’da kayıtlı mal ve hakların sahipliği,</li><li>Bazı kamu ve özel sektör sistemlerinde kimlik doğrulama,</li><li>Vergisel yükümlülüklerle ilgili işlemler.</li></ul>
<p>Receita Federal’in 9 Ocak 2024 tarihli 2.172 sayılı düzenlemesi (IN RFB nº 2.172/2024), özellikle gayrimenkul ve banka işlemlerinde CPF kaydının önemini açıkça ortaya koyar.</p>
<h3>CPF, CNPJ, CRNM ve pasaport arasındaki fark</h3>
<table><thead><tr><th>Belge</th><th>Açıklama</th></tr></thead><tbody>
<tr><td>CPF</td><td>Gerçek kişilere verilen bireysel kayıt numarası.</td></tr>
<tr><td>CNPJ</td><td>Şirketler ve diğer tüzel kişilerin vergi/kayıt numarası.</td></tr>
<tr><td>CRNM</td><td>Brezilya’da yabancıların göçmenlik kaydıyla bağlantılı kimlik belgesi.</td></tr>
<tr><td>Pasaport</td><td>Vatandaşlık ve uluslararası kimlik belgesi.</td></tr>
<tr><td>CPF kayıt belgesi</td><td>CPF numarasını ve kayıt bilgilerini doğrulayan resmî belge.</td></tr></tbody></table>
<div class="bl-warn"><p><strong>Önemli:</strong> CPF sahibi olmak Brezilya’da oturum veya vatandaşlık hakkı doğurmaz. CPF tek başına çalışma izni, banka hesabı açma garantisi ya da herhangi bir yatırım için izin de sağlamaz.</p></div>
<h2>Brezilya’da yaşamayan yabancılar CPF alabilir mi?</h2>
<p>Evet. Brezilya’da ikamet etmeyen, Brezilya vatandaşı olmayan ve henüz ülkeye hiç seyahat etmemiş yabancılar da CPF başvurusunda bulunabilir. Türkiye’de yaşayan bir Türk vatandaşının CPF alabilmesi için Brezilya’da ev sahibi olmak, şirket kurmuş olmak, banka hesabı bulundurmak, oturum izni sahibi olmak ya da daha önce ülkeye giriş yapmış olmak zorunlu değildir.</p>
<p>Ancak CPF almaya uygun olmak ile seçilen başvuru kanalının şartlarını karşılamak farklı konulardır. Pasaport fotoğrafını internetten göndererek işlemi tamamlayabileceğinizi düşünmek, en sık yapılan yanlıştır. Brezilya dışında yaşayan yabancılar için konsolosluk üzerinden şahsen başvuru, resmî olarak belirtilen temel yöntemdir.</p>
<h2>Türkiye’den CPF almanın üç yolu</h2>
<h3>Yöntem 1: Brezilya konsolosluğuna şahsen başvurmak</h3>
<p>Türkiye’de yaşayan yabancılar için Brezilya hükümetinin yurt dışı prosedüründe belirtilen yöntem budur. Başvuru sahibi FCPF formunu doldurur, belgeleri hazırlar ve yetkili temsilciliğin e-Consular sisteminden işlem başlatır. Belgeler incelendikten sonra şahsen gelmesi istenir; konsolosluk yetkilisi kimlik ve belgeleri kontrol eder, başvuru Receita Federal sistemleri üzerinden tamamlanabilir. Resmî CPF kayıt hizmeti ücretsizdir. Dezavantajı randevu, seyahat ve şahsen bulunma zorunluluğudur.</p>
<h3>Yöntem 2: Brezilya’da vekâletnameyle temsil edilmek</h3>
<p>Brezilya’da bir avukatın veya usulüne uygun yetkilendirilmiş temsilcinin başvuru sahibi adına işlem yapması mümkün olabilir. Müşteri Brezilya dışında kalırken temsilci, gerekli yetki ve belgelerle Receita Federal sürecini yürütür. Burada iki kavramı ayırmak gerekir: müşterinin şahsen bulunmaması, temsilcinin başvuruyu tamamen uzaktan tamamlayabileceği anlamına gelmez. Özellikle yalnızca pasaportu bulunan yabancıların ilk CPF kaydında, temsilci aracılığıyla yapılan işlemin de yetkili kurumda şahsen yürütülmesi gerektiği belirtilmektedir. Başvuru sahibinin Brezilya’ya gitmesi gerekmeyebilir; ama temsilci fiziksel başvuru yapmak zorunda kalabilir.</p>
<h3>Yöntem 3: Brezilya’da şahsen başvurmak</h3>
<p>Brezilya’da bulunan yabancılar durumlarına uygun yetkili Receita Federal kanallarını kullanabilir. Pasaport ve diğer kimlik belgelerinin doğrulanması gerekir. Yalnızca turistik amaçla Brezilya’da bulunmak CPF edinmeye engel değildir; ancak hangi merkezin işlem yapabileceği ve hangi belgelerin gerektiği önceden kontrol edilmelidir.</p>
<h3>Üç yöntemin karşılaştırılması</h3>
<table><thead><tr><th>Kriter</th><th>Türkiye’de konsolosluk</th><th>Brezilya’da temsilci</th><th>Brezilya’da şahsen</th></tr></thead><tbody>
<tr><td>Türkiye’den başlanabilir mi?</td><td>Evet</td><td>Evet</td><td>Hazırlık yapılabilir</td></tr>
<tr><td>Müşteri Brezilya’ya gitmeli mi?</td><td>Hayır</td><td>Genellikle hayır</td><td>Evet</td></tr>
<tr><td>Müşterinin şahsen işlem yapması</td><td>Evet</td><td>Temsil şartlarına bağlı</td><td>Evet</td></tr>
<tr><td>Vekâletname</td><td>Normalde gerekmez</td><td>Gerekir</td><td>Normalde gerekmez</td></tr>
<tr><td>Resmî kayıt hizmeti</td><td>Ücretsiz</td><td>Ücretsiz; temsil giderleri ayrı</td><td>Kanala göre</td></tr>
<tr><td>Başlıca risk</td><td>Randevu ve belge eksikliği</td><td>Vekâletnamenin kabulü</td><td>Başvuru merkezi ve belge kontrolü</td></tr></tbody></table>
<h2>İstanbul mu, Ankara mı?</h2>
<p>Türkiye’de konsolosluk yetkisi bulunan iki Brezilya temsilciliği vardır: İstanbul Başkonsolosluğu ve Ankara Büyükelçiliği. Hangisinin kullanılacağı ikamet adresinize bağlıdır.</p>
<p>İstanbul Başkonsolosluğunun yetki bölgesi şu illeri kapsar: Aydın, Balıkesir, Bilecik, Bursa, Çanakkale, Denizli, Edirne, İstanbul, İzmir, Kırklareli, Kocaeli, Kütahya, Manisa, Muğla, Sakarya, Tekirdağ, Uşak ve Yalova. Bu illerin dışındaki ikametler genel olarak Ankara Büyükelçiliğinin yetki alanına girer. İzmir’de yaşayan biri için İstanbul, Antalya’da yaşayan biri için Ankara yetkilidir.</p>
<ul><li>İstanbul e-Consular: <a href="https://ec-istambul.itamaraty.gov.br/">ec-istambul.itamaraty.gov.br</a></li><li>Ankara e-Consular: <a href="https://ec-ancara.itamaraty.gov.br/">ec-ancara.itamaraty.gov.br</a></li></ul>
<p>Başvurudan önce temsilciliğin güncel hizmet menüsünü ve randevu koşullarını kontrol edin.</p>
<h2>e-Consular sistemi nasıl çalışır?</h2>
<p>e-Consular, konsolosluk işlemlerinin ön başvuru ve randevu aşamalarını dijital ortamda yürüten sistemdir; ancak her hizmetin tamamen internetten bitirildiği anlamına gelmez. İstanbul Başkonsolosluğunun açıklamasına göre kullanıcı önce hesap oluşturur ve hizmeti seçer, ardından istenen belgeleri yükler. Belgeler incelenip uygun bulunduğunda randevu günü ve saati seçme imkânı tanınır. Randevu gününde sisteme yüklenen belgelerin asılları da sunulmalıdır.</p>
<h3>Önerilen başvuru sırası</h3>
<div class="bl-steps"><ol><li><strong>Amacı belirleyin:</strong> İlk kez CPF mi alacaksınız, yoksa mevcut numaranın düzeltilmesini mi istiyorsunuz? İkisi farklı işlemlerdir.</li><li><strong>Kimlik bilgilerini kontrol edin:</strong> Pasaport, doğum belgesi ve diğer kayıtların aynı kişiyi gösterdiğinden emin olun.</li><li><strong>FCPF formunu hazırlayın:</strong> Receita Federal’in resmî formunu doldurun.</li><li><strong>Konsolosluk başvurusunu oluşturun:</strong> Yetkili e-Consular platformunda işlemi başlatın.</li><li><strong>Belgeleri yükleyin:</strong> İstenen belgeleri uygun formatta ekleyin.</li><li><strong>Ön incelemeyi bekleyin:</strong> Gerekirse düzeltme istenir.</li><li><strong>Randevuya gidin:</strong> Ön inceleme bittikten sonra randevu alınır ve konsolosluğa gidilir.</li><li><strong>Sonucu doğrulayın:</strong> CPF kaydının tamamlanıp tamamlanmadığını resmî sorgudan kontrol edin.</li></ol></div>
<p>Kritik nokta şudur: randevu tarihi başvurunun ilk gününde kesinleşmeyebilir. Gayrimenkul veya şirket kuruluşu gibi başka işlemler CPF sonucuna bağlıysa takvimi buna göre planlayın.</p>
<h2>FCPF formu nedir? Online form doldurunca ne olur?</h2>
<p>FCPF, CPF kayıt işlemlerinde kullanılan resmî başvuru formudur. Hazırlamak için Receita Federal’in yabancılara ayrılmış sayfası kullanılır: <a href="https://servicos.receita.fazenda.gov.br/Servicos/CPF/cpfEstrangeiro/Fcpf.asp">servicos.receita.fazenda.gov.br</a>. Formda ad, soyad, doğum tarihi, ebeveyn bilgileri, ülke ve adres gibi veriler istenir; gönderim sonucunda takip için kullanılabilecek bir kayıt kodu oluşabilir.</p>
<p>Ancak üç durum birbirinden farklıdır: <strong>formun doldurulmuş olması</strong>, <strong>başvurunun yetkili kuruma sunulmuş olması</strong> ve <strong>CPF numarasının oluşturulup kaydın tamamlanması</strong>. Birincisi gerçekleşmiş olabilir; üçüncüsü gerçekleşmemiş olabilir. Form numarası ile CPF numarası aynı şey değildir.</p>
<h3>Formda dikkat edilecek teknik ayrıntılar</h3>
<ul><li><strong>Türkçe karakterler:</strong> Bazı resmî formlar aksanlı karakter kabul etmeyebilir. Formun yazım kurallarına uyun, ancak kimliğinizi farklı sistemlerde birbirinden bağımsız biçimde değiştirmeyin.</li><li><strong>Çift soyadı:</strong> İki soyadı bulunması veya evlilik sonrası soyadı değişmesi ek inceleme gerektirebilir.</li><li><strong>Ebeveyn bilgileri:</strong> Türk pasaportunda anne ve baba adı çoğunlukla bulunmadığı için doğum belgesi veya uygun nüfus kayıt belgesi gerekebilir.</li><li><strong>Doğum yeri:</strong> Şehir, il veya ülke bilgisinin belgelerde farklı yazılması kayıt uyuşmazlığına yol açabilir.</li><li><strong>Açılır pencere engelleyici:</strong> Receita Federal bazı işlemlerde engelleyicinin kapatılmasını ister.</li><li><strong>Formun süresi:</strong> Receita Federal’in bir form açıklamasında konsolosluğa 15 gün içinde sunum yönlendirmesi bulunurken bazı konsolosluk açıklamaları formun süresiz olduğunu belirtir. Kullanacağınız temsilciliğin güncel talimatı esas alınmalı; gerekirse form randevuya yakın tarihte yeniden hazırlanmalıdır.</li></ul>
<h2>Gerekli belgeler</h2>
<p>Brezilya dışında yaşayan yabancılar için resmî yurt dışı hizmet sayfasında üç temel belge grubu belirtilir: doldurulmuş ve imzalanmış FCPF, kimlik belgesi, doğum veya evlilik belgesi. Durumunuza göre daha fazlası gerekebilir.</p>
<table><thead><tr><th>Belge</th><th>Neden önemli?</th></tr></thead><tbody>
<tr><td>Geçerli pasaport</td><td>Kimlik ve vatandaşlık doğrulaması</td></tr>
<tr><td>FCPF başvuru formu</td><td>CPF kayıt talebinin sunulması</td></tr>
<tr><td>Doğum belgesi</td><td>Doğum ve ebeveyn bilgilerinin doğrulanması</td></tr>
<tr><td>Evlilik belgesi</td><td>Evlilik nedeniyle soyadı değişmiş kişiler için</td></tr>
<tr><td>Önceki kimlik belgeleri</td><td>İsim veya soyadı değişikliklerinin açıklanması</td></tr>
<tr><td>Vekâletname</td><td>Temsilci aracılığıyla yapılan başvurular</td></tr>
<tr><td>Apostil veya konsolosluk tasdiki</td><td>Yabancı belgelerin Brezilya’da geçerliliği gereken durumlar</td></tr>
<tr><td>Yeminli tercüme</td><td>Gerekli görülen yabancı dildeki belgelerin Portekizce sunulması</td></tr></tbody></table>
<p>Her belge her başvuru sahibi için otomatik olarak zorunlu değildir. Konsolosluk önünde şahsen yapılan işlemde aranan belgelerle Brezilya’da apostilli vekâletname üzerinden yürütülen işlemin koşulları farklı olabilir. Apostil, noter, tercüme ve belge gönderimi için masraf yapmadan önce başvuruyu kabul edecek kurumun güncel gereklerini doğrulayın.</p>
<h2>Türk pasaportunda anne ve baba adı yazmaması sorun olur mu?</h2>
<p>Brezilya kimlik kayıtlarında ebeveyn bilgisi (<em>filiação</em>) kullanılabilir. Türk pasaportunda ise genellikle ad, soyad, doğum tarihi, doğum yeri ve uyruk bulunur; anne-baba bilgisi yazmaz. Bu durum pasaportun geçersiz olduğu anlamına gelmez; yalnızca CPF kaydı için gereken bazı bilgilerin pasaporttan doğrulanamadığını gösterir ve ek belge istenebilir.</p>
<p>Türkiye’de düzenlenmiş doğum kayıt belgesi veya ebeveyn bilgilerini içeren uygun bir nüfus kayıt örneği, yetkili kurum kabul ederse kullanılabilir. Önceden şunları kontrol edin: belge CPF için istenen bilgileri gerçekten içeriyor mu, apostil veya başka bir tasdik gerekiyor mu, Portekizce yeminli tercüme isteniyor mu? Uluslararası doğum belgesinin tek başına bütün şartları karşıladığını varsaymayın.</p>
<h2>Türkçe karakterler CPF kaydında nasıl ele alınmalı?</h2>
<p>Çağrı, Şükrü, Özge, Işıl, Gökçe gibi isimlerdeki karakterler Brezilya’daki bazı elektronik sistemlerde teknik uyumsuzluk yaratabilir. Bir formda ad “CAGRI YILMAZ” biçiminde, başka bir belgede farklı bir karakter karşılığıyla yazılırsa iki kayıt insana aynı kişi gibi görünse de sistemlerin karşılaştırma kuralları aynı olmayabilir.</p>
<p>Başvuruda kullanılacak ad-soyad biçimi belgeye ve ilgili sistemin talimatına göre belirlenmeli; isimler rastgele İngilizceleştirilmemeli, farklı belgelerde farklı seçenekler kullanılmamalıdır.</p>
<div class="bl-tip"><p><strong>Pratik öneri:</strong> Başvurudan önce bir kimlik veri kontrol tablosu hazırlayın: pasaporttaki ad, uluslararası yazım, doğum tarihi, doğum yeri, ebeveyn bilgileri ve varsa önceki soyadını yan yana karşılaştırın. Bu resmî bir zorunluluk değil, sonraki işlemlerde uyumsuzluk riskini azaltan bir belge yönetimi yöntemidir.</p></div>
<h2>Brezilya’ya gitmeden vekâletnameyle CPF almak</h2>
<p>Konsolosluğa gitmek istemeyenlerin araştırdığı seçeneklerden biri, Brezilya’da bir temsilciyle işlem yapmaktır. Brezilya mevzuatı CPF kayıt işlemlerinin uygun yetkiyle temsilci aracılığıyla yürütülmesine ilişkin hükümler içerir. Ancak temsilcinin bulunması bütün kimlik doğrulama gerekliliklerini ortadan kaldırmaz; özellikle yalnızca pasaportu bulunan yabancıların ilk kaydında ilgili Receita Federal biriminin şahsen hizmet koşulları dikkate alınmalıdır.</p>
<h3>Süreç nasıl işler?</h3>
<p>Önce Brezilya’da başvuruyu yürütecek temsilci belirlenir; sonra ihtiyaç duyduğu yetkiler tespit edilir. Yetki yalnızca CPF başvurusu, belgelerin sunulması, takibi ve sonucun alınmasıyla sınırlandırılabilir. Vekâletnamenin gereğinden geniş tutulmaması önemlidir: yalnızca CPF için yetki vermek isteyen birinin banka hesaplarını kullanma veya mal varlığını devretme yetkisi vermesi gerekmez.</p>
<h3>Vekâletnamede dikkat edilecek noktalar</h3>
<ul><li><strong>Temsil edilen kişinin kimliği:</strong> Ad, soyad ve pasaport bilgileri doğru gösterilmeli.</li><li><strong>Temsilci kimliği:</strong> Kimlik bilgileri, CPF numarası ve kurumun istediği diğer belgeler bulunmalı.</li><li><strong>Yetkinin kapsamı:</strong> Hangi işlemlerin yapılabileceği açıkça yazılmalı.</li><li><strong>Geçerlilik:</strong> Türkiye’de düzenlenen vekâletnamenin Brezilya’da kullanılması için tasdik işlemleri gerekebilir.</li><li><strong>Dil:</strong> Portekizce sunulması veya yeminli tercümesi istenebilir.</li><li><strong>Asıl belge:</strong> Makam taranmış kopya yerine asıl ya da usulüne uygun tasdikli belge isteyebilir.</li><li><strong>Süre:</strong> Vekâletnameye geçerlilik süresi yazılacaksa işlem takvimi buna göre planlanmalı.</li></ul>
<h3>Apostil nedir?</h3>
<p>Apostil, bir belgenin yetkili makamca düzenlendiğini veya onaylandığını uluslararası kullanım için doğrulayan tasdik yöntemidir. Türkiye ve Brezilya Lahey Apostil Sözleşmesi’ne taraftır; dolayısıyla Türkiye’de düzenlenen uygun bir vekâletname için apostil gerekebilir. Ancak apostil, belgenin içeriğinin hukuken yeterli olduğunu garanti etmez: CPF başvurusu yapma yetkisi yazmayan apostilli bir vekâletname eksikliği gidermez. Önce içeriği, sonra tasdik ve tercüme koşullarını kontrol edin.</p>
<div class="bl-warn"><p><strong>Kesin sonuç yok:</strong> Vekâletname başvurunun temsilci tarafından yürütülmesini sağlayan hukuki bir araçtır; CPF’nin verilmesi yetkili kurumun belge ve kayıt incelemesine bağlıdır. Sonucu garanti ediyormuş gibi davranan hizmet sağlayıcılara dikkat edin.</p></div>
<h2>Yalnızca e-postayla CPF başvurusu yapılabilir mi?</h2>
<p>Cevap, başvuranın statüsüne ve işlemin türüne bağlıdır. Receita Federal’in e-posta hizmeti, yurt dışında yaşayan <strong>Brezilya vatandaşları</strong> için bazı işlemleri kapsar. Brezilya dışında yaşayan yabancıların <strong>ilk CPF kaydı</strong> ise genel prosedürde yalnızca e-postayla yapılamaz; Receita Federal bu kayıtlar için Brezilya konsolosluklarına şahsen başvuru gerektiğini belirtir. Mevcut CPF üzerindeki bazı işlemler ise e-postayla yürütülebilir.</p>
<table><thead><tr><th>İşlem</th><th>Yurt dışındaki yabancılar için e-posta</th></tr></thead><tbody>
<tr><td>İlk CPF kaydı</td><td>Genel prosedürde kabul edilmez</td></tr>
<tr><td>Kayıt bilgilerinin değiştirilmesi</td><td>Uygun koşullarda mümkündür</td></tr>
<tr><td>Kayıt durumunun düzeltilmesi</td><td>Uygun koşullarda mümkündür</td></tr>
<tr><td>CPF numarasının sorgulanması</td><td>İlgili kanaldan mümkündür</td></tr>
<tr><td>Bazı iptal veya yeniden etkinleştirme işlemleri</td><td>Uygun koşullarda değerlendirilebilir</td></tr></tbody></table>
<p>Yurt dışı işlemlerde kullanılan resmî adres <em>cpf.residente.exterior@rfb.gov.br</em>’dir; fakat adresin var olması her yabancının ilk başvurusunu buraya pasaport göndererek tamamlayabileceği anlamına gelmez.</p>
<h2>Form ile konsolosluk başvurusu arasındaki görünmeyen aşamalar</h2>
<p>Gecikmelerin önemli nedenlerinden biri, sistemde gerçekleşen işlemin yanlış yorumlanmasıdır. Süreç üç düzeyde değerlendirilebilir:</p>
<ol><li><strong>Veri oluşturma:</strong> Kimlik bilgileri FCPF formuna girilmiştir; kayıt talebi hazırdır, ancak nihai CPF henüz alınmamış olabilir.</li><li><strong>Kimlik ve belge doğrulama:</strong> Yetkili kurum bilgilerin başvuru sahibine ait olduğunu ve belgelerle desteklendiğini kontrol eder; gerekirse ek belge veya fiziksel başvuru ister.</li><li><strong>Kaydın tamamlanması:</strong> Kontroller bittiğinde kişiye CPF numarası atanır.</li></ol>
<p>Bir danışmanlık şirketinin sizin adınıza formu doldurması CPF aldığınız anlamına gelmez; hangi aşamanın tamamlandığını açıkça görebilmelisiniz.</p>
<h2>Başvuru neden gecikebilir veya tamamlanamayabilir?</h2>
<p>Her gecikme reddedildiğiniz anlamına gelmez; ancak aşağıdaki sorunlar yeniden incelemeye yol açabilir.</p>
<ul><li><strong>İsim uyuşmazlığı:</strong> Pasaport, doğum belgesi ve vekâletnamede isimlerin farklı yazılması.</li><li><strong>Ebeveyn bilgisinin doğrulanamaması:</strong> Kimlik belgesinde anne-baba bilgisi yoksa ek kayıt belgesi istenebilir.</li><li><strong>Önceden CPF kaydı bulunması:</strong> Yeni numara yerine mevcut kaydın bulunması veya düzeltilmesi gerekebilir.</li><li><strong>Yetersiz vekâletname:</strong> Yetki açık değilse veya tasdik eksikse işlem tamamlanamayabilir.</li><li><strong>Apostil veya tercüme eksikliği:</strong> Brezilya’da kullanılacak yabancı belgelerin biçimsel koşulları.</li><li><strong>Eski pasaport bilgisi:</strong> Önceki belgelerle yeni pasaport arasındaki uyuşmazlığın açıklanması gerekebilir.</li><li><strong>Eksik veya okunamayan belge:</strong> Kesik, bulanık, ışık yansımalı görseller doğrulamayı zorlaştırır.</li><li><strong>Yanlış konsolosluk:</strong> Yetki bölgeniz dışındaki temsilcilikten işlem başlatmak süreci uzatır.</li><li><strong>Randevunun açılmaması:</strong> e-Consular’da randevu seçeneğinin henüz görünmemesi red anlamına gelmez; belge incelemesi sürüyor olabilir.</li><li><strong>Harici sistemlerde uyuşmazlık:</strong> CPF alındıktan sonra bankanın veya noterin kaydında farklı ad ya da doğum tarihi bulunması ayrı bir düzeltme gerektirir.</li></ul>
<p>Bu nedenle başarılı başvuru, yalnızca numaranın verilmesiyle değil, numaranın sonraki işlemlerde kullanılabilir biçimde doğrulanmasıyla değerlendirilmelidir.</p>
<h2>Daha önce CPF alınıp alınmadığını neden kontrol etmelisiniz?</h2>
<p>CPF kişiye benzersiz olarak verilir; normal şartlarda ikinci bir numara oluşturulmaz. Şu durumlarda yeni kayıt yerine eski kaydı araştırmalısınız: geçmişte Brezilya’da bulunduysanız, banka hesabı açtıysanız, gayrimenkul veya kayıtlı mal edindiyseniz, şirket ortaklığı yaptıysanız, eski pasaportla başvurduysanız ya da numarayı aldığınız hâlde belgeyi kaybettiyseniz.</p>
<p>Örneğin 2018’de CPF alan biri 2026’da pasaportunu yenilerse yeni CPF almasına gerek yoktur; gerekirse mevcut kaydın bilgileri güncellenir. Dolayısıyla bir CPF hizmeti satın almadan önce daha önce numara alıp almadığınızı araştırın.</p>
<h2>CPF için en doğru zaman ne zamandır?</h2>
<ul><li><strong>Gayrimenkul alacaksanız:</strong> CPF’yi tapu, noter ve ödeme işlemlerinin son gününe bırakmayın; alıcının kimlik bilgilerinin tutarlı olması önemlidir.</li><li><strong>Şirket kuracaksanız:</strong> Yabancı ortağın CPF ihtiyacını sürecin başında planlayın. CPF’nin alınması şirket kuruluşunun otomatik tamamlanacağı anlamına gelmez.</li><li><strong>Banka hesabı açacaksanız:</strong> CPF önemli bir unsurdur, ancak bankalar ayrıca kimlik, adres ve müşteri tanıma incelemeleri uygular.</li><li><strong>Taşınmayı planlıyorsanız:</strong> CPF hazırlık unsurudur; vize, göçmenlik kaydı ve oturum izni başvurularının yerine geçmez.</li></ul>
<h2>Gayrimenkul alırken CPF sürecinin stratejik önemi</h2>
<p>Brezilya’da gayrimenkul almak isteyen yabancılar bazen önce evi bulup belgeleri sonra hazırlamayı düşünür; bu zamanlama sorunları yaratabilir. Daha kontrollü yöntem, CPF sürecini satın alma planına erken dahil etmektir.</p>
<p><strong>Örnek senaryo:</strong> Türkiye’de yaşayan bir yatırımcı Florianópolis’te daire almak istiyor; Brezilya vatandaşı değil ve daha önce CPF almamış. Süreci dört aşamaya ayırmak faydalıdır: (1) alıcının kimlik ve CPF hazırlığı, (2) taşınmazın hukuki incelemesi (kayıtlar, mülkiyet, borçlar), (3) ödeme ve transfer planlaması (banka ve döviz mevzuatı), (4) sözleşme, noter ve tescil. Bu aşamalar birbirinden kopuk ilerlerse zaman ve maliyet kaybı yaşanır. CPF’nin önceden alınması önemli bir engeli kaldırır; ancak mülkiyet hakkı doğurmaz.</p>
<h2>CPF olmadan Brezilya’da şirket kurulabilir mi?</h2>
<p>Brezilya’da şirket ortağı olacak yabancılar için CPF önemli bir gerekliliktir; fakat şirket kuruluşu yalnızca CPF’den ibaret değildir. Ortakların kimlik ve kayıt bilgileri, şirket sözleşmesi, yabancı ortak için temsil ilişkileri, ticaret sicili kaydı, CNPJ ve vergisel/sektörel gereklilikler de sürecin parçasıdır. CPF ve vekâlet işlemlerini birlikte planlamak belge tekrarını azaltır; ancak CPF vekâletnamesi ile şirket kuruluşu vekâletnamesinin aynı yetkileri taşıması gerektiğini varsaymayın. Ayrıntılar için <a href="/blog/yabanci-olarak-brezilyada-sirket-kurmak/">yabancı olarak Brezilya’da şirket kurma rehberimize</a> bakın.</p>
<h2>CPF almak Brezilya’da vergi mükellefi olmak anlamına gelir mi?</h2>
<p>Hayır. CPF bir kayıt ve kimlik numarasıdır; vergi mukimliği ayrı bir hukuki konudur ve ilgili vergi mevzuatına ile kişinin fiilî durumuna göre değerlendirilir. Türkiye’de yaşayan birinin CPF alması tek başına Brezilya vergi mukimi olduğu anlamına gelmez. Ancak bu, Brezilya’da hiçbir vergisel yükümlülük doğmayacağı anlamına da gelmez: gayrimenkul almak, kira geliri elde etmek, yatırım getirisi almak veya varlık satmak vergisel sonuçlar doğurabilir. Kısaca: CPF sahibi olmak, Brezilya’da vergi ödemek zorunda olmak ve vergi mukimi sayılmak üç ayrı konudur.</p>
<h2>CPF alındıktan sonra neler yapılmalı?</h2>
<ol><li><strong>Numarayı kontrol edin:</strong> Atanan numaranın başvurunuza ait olduğundan emin olun.</li><li><strong>Ad ve doğum tarihini karşılaştırın:</strong> Kayıt bilgilerini kimlik belgelerinizle eşleştirin.</li><li><strong>Kayıt durumunu sorgulayın:</strong> <a href="https://servicos.receita.fazenda.gov.br/Servicos/CPF/ConsultaSituacao/ConsultaPublica.asp">Receita Federal sorgu sayfasını</a> kullanın.</li><li><strong>Kayıt belgesini edinin:</strong> Kayıt tamamlandıktan sonra uygun resmî kanaldan CPF kayıt belgesini alın.</li><li><strong>Belgeleri saklayın:</strong> Numara, kayıt belgesi, başvuru kodu ve yazışmaları düzenli arşivleyin.</li><li><strong>Aynı bilgileri kullanın:</strong> Banka, şirket ve taşınmaz işlemlerinde kimlik bilgileriniz tutarlı olsun.</li></ol>
<h2>CPF kartı fiziksel olarak gönderiliyor mu?</h2>
<p>Günümüzde CPF için yeni plastik kart düzenlenmez. Receita Federal, CPF kayıt belgesinin internetten alınabileceğini belirtir; dolayısıyla kargoyla kart beklemeniz gerekmez. Bir danışmanlık firmasının hazırladığı görsel belge ile Receita Federal’in resmî kayıt çıktısı karıştırılmamalı; geçerli belge devlet sistemi üzerinden doğrulanabilmelidir.</p>
<h2>CPF durum kodları ne anlama gelir?</h2>
<table><thead><tr><th>CPF durumu</th><th>Açıklama</th></tr></thead><tbody>
<tr><td>Regular</td><td>Kayıtta eksiklik bulunmadığını gösterir.</td></tr>
<tr><td>Suspensa</td><td>Kimlik veya kayıt bilgilerinde eksiklik ya da tutarsızlık olabilir.</td></tr>
<tr><td>Pendente de Regularização</td><td>Zorunlu gelir vergisi beyannamesinin verilmemesiyle ilişkili olabilir.</td></tr>
<tr><td>Cancelada</td><td>Mükerrer kayıt veya yetkili kararla iptal durumu olabilir.</td></tr>
<tr><td>Nula</td><td>Sahtecilik tespiti nedeniyle kayıt geçersiz sayılmış olabilir.</td></tr>
<tr><td>Titular Falecido</td><td>Kayıt sahibi hakkında ölüm bilgisi bulunur.</td></tr></tbody></table>
<p>CPF’nin “Regular” olması kişinin bütün vergilerini ödediği veya mali borcu olmadığı anlamına gelmez; kayıt durumu ile genel vergi borcu aynı şey değildir. CPF “Suspensa” ise çoğunlukla yeni numara almak değil, mevcut kaydı düzeltmek gerekir.</p>
<h2>Özel durumlar: her başvuru aynı değildir</h2>
<ul><li><strong>Evli ve soyadı değişmiş kişi:</strong> Pasaporttaki soyadı doğum belgesindekinden farklıysa evlilik belgesi bağlantıyı açıklamaya yardımcı olabilir; hangi belgelerin gerektiğine inceleyen kurum karar verir.</li><li><strong>Daha önce Brezilya’ya gitmiş ama numarasını hatırlamayan kişi:</strong> Yeni başvurudan önce eski kaydın bulunması değerlendirilmelidir.</li><li><strong>Brezilya’da miras hakkı olan yabancı:</strong> Mirasın hukuki süreci ile CPF kaydı birlikte ele alınmalıdır.</li><li><strong>Şirket ortağı olacak ama Türkiye’de yaşayacak kişi:</strong> CPF yanında temsil ve ticaret sicili yükümlülükleri ayrıca incelenmelidir.</li><li><strong>Çocuk adına başvuru:</strong> Ebeveynin veya yasal temsilcinin kimliği ve temsil yetkisi doğrulanır; 16 yaş altı için ayrı belge ve temsil koşulları vardır.</li><li><strong>Konsolosluğa gidemeyen kişi:</strong> Brezilya’da temsilciyle yürütme değerlendirilebilir; vekâletname geçerliliği ve Receita Federal koşulları önceden netleştirilmelidir.</li></ul>
<h2>Maliyetler nasıl hesaplanmalı?</h2>
<p>Devletin yaptığı kayıt işlemi ile özel danışmanlık veya temsil hizmetlerini ayırın. Brezilya hükümetinin açıklamasına göre CPF kaydı ücretsizdir; Brezilya’daki bazı anlaşmalı başvuru noktalarında R$7 hizmet ücreti alınabilir. Bu bedel, özel bir avukatın veya danışmanlık firmasının hizmet bedeli değildir.</p>
<p>Özel temsil hizmetinde şu kalemler oluşabilir: dosya hazırlığı, belge kontrolü, vekâletname düzenleme, noter ve apostil, yeminli tercüme, uluslararası belge gönderimi, Brezilya’daki temsilcinin hizmet bedeli ve gerekirse düzeltme işlemleri. Konsolosluğa kendisi giden biriyle Brezilya’da avukatla işlem yaptıran kişinin maliyetleri aynı değildir; bu yüzden tek bir toplam tutar yanıltıcı olabilir. Hizmet almadan önce devlet harcı, üçüncü taraf giderleri ve profesyonel hizmet bedeli ayrı ayrı açıklanmalıdır.</p>
<h2>CPF kaç günde çıkar?</h2>
<p>Süre; başvuru yöntemine ve belgelerin durumuna göre değişir. Brezilya hükümetinin yurt dışından CPF hizmet sayfasında yabancı başvuruları için kesin bir tamamlanma süresi belirtilmez; bu nedenle 24 saat veya 48 saat gibi kesin süre vaatleri doğru değildir. Süreyi etkileyen başlıca etkenler: konsolosluğun randevu uygunluğu, belgelerin ön inceleme süresi, kimlik bilgilerinin tutarlılığı, ek belge gereksinimi, vekâletname hazırlığı, Brezilya’daki temsilcinin işlem takvimi ve Receita Federal sistemlerinin kullanılabilirliği. Gayrimenkul veya şirket kuruluşu için tarih belirlenmişse CPF’yi son güne bırakmayın.</p>
<h2>Dolandırıcılık ve veri güvenliği riskleri</h2>
<p>CPF başvurusunda pasaport, doğum belgesi, adres ve bazen temsil yetkisi içeren belgeler paylaşılır; bunlar güvenli işlenmelidir. Hizmet satın almadan önce beş kontrol yapın:</p>
<ol><li><strong>Hizmet sağlayıcının kimliğini doğrulayın:</strong> Brezilya’daki kişi veya kurumun yetkisini ve iletişim bilgilerini kontrol edin.</li><li><strong>Resmî işlem ile özel hizmeti ayırın:</strong> Resmî kaydın ücretsiz olması, profesyonel yardımın ücretsiz olduğu anlamına gelmez.</li><li><strong>Vekâletname yetkilerini inceleyin:</strong> Yalnızca CPF için yetki veriyorsanız gereksiz geniş yetkilerden kaçının.</li><li><strong>Belgeleri güvenli paylaşın:</strong> Pasaportu mümkünse erişim kontrollü sistemlerle gönderin.</li><li><strong>Sonucu devlet sisteminde doğrulayın:</strong> Size iletilen numarayı resmî kayıt durumu sorgusuyla kontrol edin.</li></ol>
<h2>Brazil Migration ile CPF sürecine nasıl hazırlanabilirsiniz?</h2>
<p>Doğru yaklaşım herkes için aynı yöntemi kullanmak değil, durumunuza uygun yolu belirlemektir. Türkiye’de yaşayan bir gayrimenkul yatırımcısıyla Brezilya’da şirket ortağı olacak bir yabancının ihtiyaçları farklıdır; ilk kez CPF alacak biriyle eski numarasının bilgilerini düzeltmek isteyen kişinin süreçleri de farklıdır. Başvuru öncesinde şu soruların yanıtlanması önemlidir:</p>
<ul><li>Daha önce CPF numaranız oldu mu?</li><li>Türkiye’de mi, Brezilya’da mı yaşıyorsunuz?</li><li>CPF’yi hangi amaçla kullanacaksınız?</li><li>Konsolosluğa şahsen gidebilir misiniz?</li><li>Brezilya’da temsilci kullanmayı düşünüyor musunuz?</li><li>Doğum, evlilik veya isim değişikliğini gösteren ek belgeler gerekiyor mu?</li><li>CPF’ye bağlı başka bir işlemin son tarihi var mı?</li></ul>
<p>Brazil Migration’la yapacağınız ön değerlendirmede bu sorulara göre uygun başvuru yolu belirlenir, belgeler önceden kontrol edilir ve resmî işlemlerin sırası planlanır. Amaç yalnızca bir CPF numarası edinmek değil, bu numaranın kullanılacağı sonraki işlemlerde gereksiz gecikmelerin ve belge uyuşmazlıklarının önüne geçmektir. Oturum izni planınız varsa <a href="/blog/brezilyada-oturum-izni-nasil-alinir/">oturum izni rehberimizi</a> da okuyun.</p>
<h2>Sonuç: önemli olan form değil, doğru prosedürdür</h2>
<p>Yurt dışında yaşayan yabancılar için CPF başvurusu, internetten form doldurmaktan çok daha fazla aşama içerir. Kimliğin ve belgelerin tutarlılığı, konsolosluk yetkisi, vekâletnamenin geçerliliği ve seçilen kanal sonucu belirler. Türkiye’den başvuracaklar için iki nokta öne çıkar: resmî konsolosluk başvurusu hazırlıklı yapıldığında CPF almanın ücretsiz yoludur ama ilk kayıtta şahsen başvuru gerekir; Brezilya’da temsilci kullanmak ise bazı başvuru sahipleri için alternatiftir ve vekâletname ile temsil sürecinin yürürlükteki kurallara uygun olmasını gerektirir. Hızlı sonuç vaatlerinden önce hangi yöntemin durumunuza uygun olduğunu anlayın.</p>
<p><em>Bu içerik 10 Kasım 2026 itibarıyla hazırlanmıştır. Konsolosluk uygulamaları, belge koşulları ve mevzuat değişebilir.</em></p>`,
  faq: [
    {q: 'Türk vatandaşları Brezilya’ya gitmeden CPF alabilir mi?', a: 'Evet. Türkiye’deki yetkili Brezilya konsolosluğu üzerinden başvuru yapılabilir. Gerekli şartlar sağlandığında Brezilya’da temsilci aracılığıyla işlem yürütülmesi de değerlendirilebilir.'},
    {q: 'CPF almak için Brezilya vizesi veya oturum izni gerekir mi?', a: 'Hayır. Yalnızca CPF kaydı için vize veya oturum izni sahibi olma şartı bulunmaz.'},
    {q: 'CPF ücretli mi?', a: 'Receita Federal’in resmî CPF kayıt hizmeti ücretsizdir. Bazı anlaşmalı başvuru noktalarında hizmet ücreti alınabilir. Özel danışmanlık, vekâlet, apostil ve tercüme masrafları ayrıdır.'},
    {q: 'Pasaport yenilenince CPF değişir mi?', a: 'Hayır. CPF benzersiz ve kalıcıdır; gerekirse kimlik kayıt bilgileri güncellenir.'},
    {q: 'CPF’yi yalnızca e-postayla alabilir miyim?', a: 'Yurt dışında yaşayan yabancıların ilk CPF kaydı genel prosedürde yalnızca e-postayla yapılamaz; konsolosluğa şahsen başvuru gerekir. Mevcut CPF’deki bazı işlemler e-postayla yürütülebilir.'},
    {q: 'CPF konsolosluktan aynı gün çıkar mı?', a: 'Bazı konsolosluklarda işlem aynı gün sonuçlanabilir; bu belgelerin kabulüne ve Receita Federal sistemlerinin uygunluğuna bağlıdır. Kesin süre garantisi verilmemelidir.'},
    {q: 'CPF başvurusunda avukat zorunlu mu?', a: 'Hayır. Resmî başvuru kanallarını kullanarak işlemi kendiniz yapabilirsiniz. Avukat veya temsilci özellikle karmaşık ve uzaktan yürütülen dosyalarda tercih edilebilir.'},
    {q: 'Apostil olmadan CPF alınabilir mi?', a: 'Başvuru yöntemine ve belgenin türüne bağlıdır. Brezilya’da kullanılacak yabancı vekâletnameler ve bazı belgeler için apostil veya uygun tasdik gerekebilir; her belgede otomatik şart olduğu varsayılmamalıdır.'},
    {q: 'Bir kişi iki CPF numarası alabilir mi?', a: 'Hayır. CPF kişi başına tek ve benzersiz numara esasına dayanır; önceden kayıt varsa mevcut kayıt incelenmelidir.'},
    {q: 'CPF çalışma hakkı veya vatandaşlık sağlar mı?', a: 'Hayır. CPF tek başına çalışma izni, oturum veya vatandaşlık hakkı vermez.'},
  ],
  sources: [
    {label: 'gov.br — Yurt dışından CPF başvurusu (Inscrever no CPF no exterior)', url: 'https://www.gov.br/pt-br/servicos/inscrever-no-cpf-no-exterior'},
    {label: 'Receita Federal — Resmî FCPF formu (yabancılar)', url: 'https://servicos.receita.fazenda.gov.br/Servicos/CPF/cpfEstrangeiro/Fcpf.asp'},
    {label: 'Receita Federal — CPF durum sorgulama', url: 'https://servicos.receita.fazenda.gov.br/Servicos/CPF/ConsultaSituacao/ConsultaPublica.asp'},
    {label: 'İstanbul Brezilya Başkonsolosluğu — e-Consular', url: 'https://ec-istambul.itamaraty.gov.br/'},
    {label: 'Ankara Brezilya Büyükelçiliği — e-Consular', url: 'https://ec-ancara.itamaraty.gov.br/'},
  ],
},
{
  slug: 'brazil-cpf-for-foreigners-guide', lang: 'en', category: 'Guide', date: D, modified: D, author: AUTHOR_EN, published: true,
  title: 'Brazil CPF for Foreigners: What It Unlocks, Which Route to Take, and the Mistakes That Cost Weeks',
  excerpt: 'A practical, decision-first guide to the Brazilian CPF for non-residents: what you can and cannot do with it, how to pick between consulate, attorney and in-person routes, and a pre-flight checklist.',
  lead: 'In short: a CPF is the 11-digit taxpayer number that Brazilian banks, notaries, brokers and landlords key everything to. It is free from the state, it does not require a visa or residency, and it does not make you a tax resident. The hard part is not eligibility, it is choosing a route that your documents, your timeline and your distance from Brazil can actually support.',
  cover: U('photo-1645536642772-93d4df8b8172'), coverAlt: 'Busy Avenida Paulista in São Paulo', coverCredit: {name: 'Antonino Visalli', url: 'https://unsplash.com/@antoninovisalli'},
  seo: {title: 'Brazil CPF for Foreigners: Routes and Pitfalls | Brazil Migration', description: 'How non-residents get a Brazilian CPF: consulate, power of attorney or in person. What it unlocks, document checklist and the mistakes that delay applications.'},
  content: `<p>Most foreigners meet the CPF at an awkward moment: a notary asks for it before signing a property deed, a bank onboarding form will not submit without it, or a company registration stalls because one partner lives abroad. At that point the CPF stops being paperwork and becomes the critical path. This guide is written for that moment, so it starts with decisions rather than definitions.</p>
<h2>What a CPF actually is, in one minute</h2>
<p>The <strong>CPF (Cadastro de Pessoas Físicas)</strong> is the individual registry number run by Brazil’s federal tax authority, the <em>Receita Federal</em>. Each person gets one lifelong number. It identifies you to banks, notaries, real estate registries, brokerages, e-commerce checkouts and public portals. It is not an ID card, not a residence permit and not a work authorization.</p>
<table><thead><tr><th>You want to…</th><th>CPF needed?</th><th>Is a CPF enough?</th></tr></thead><tbody>
<tr><td>Buy an apartment</td><td>Yes</td><td>No: title review, payment channel and registration follow</td></tr>
<tr><td>Become a partner in a Brazilian company</td><td>Yes, for each individual partner</td><td>No: company type, registration and a CNPJ are separate steps</td></tr>
<tr><td>Open a bank account</td><td>Yes</td><td>No: banks apply their own due diligence</td></tr>
<tr><td>Live or work in Brazil</td><td>Usually yes, later</td><td>No: you need a visa or residence authorization</td></tr>
<tr><td>Invest through a broker</td><td>Yes</td><td>No: onboarding and suitability checks apply</td></tr></tbody></table>
<div class="bl-note"><p><strong>Tax residency is separate.</strong> Holding a CPF does not make you a Brazilian tax resident, but income or gains with a Brazilian source (rent, a property sale, investment returns) can still carry Brazilian tax consequences. Treat the two questions independently.</p></div>
<h2>Step zero: check whether you already have one</h2>
<p>You get one CPF for life. If you ever opened a Brazilian account, signed a lease, bought something with a local retailer, held shares or even traveled on business, a record may already exist, possibly under an older passport. Applying again creates a duplicate problem instead of solving anything. Look for the number first; if one exists, the task changes from <em>registration</em> to <em>correction or update</em>, which is a different and usually lighter process.</p>
<h2>Choosing your route: three questions</h2>
<p>Instead of memorizing procedures, answer three questions and the route usually picks itself.</p>
<h3>1. Can you attend an appointment in person?</h3>
<p>If you live in a country with a Brazilian consulate that handles CPF registration and you can show up once, the consular route is the cleanest: the state service is free and the officer checks your originals on the spot. For Turkish residents the two offices are Istanbul and Ankara, split by province of residence.</p>
<h3>2. Is something time-critical waiting on the CPF?</h3>
<p>A closing date, a company filing or a bank deadline changes the calculus. Consular appointment availability and document pre-review are outside your control, so people with hard dates often add a Brazil-based attorney as a second path. Do not assume the attorney route is faster by default: the power of attorney must be accepted, and first registrations for passport-only foreigners can still require physical attendance at an official counter by the representative.</p>
<h3>3. Will you be in Brazil soon anyway?</h3>
<p>If a trip is already planned, registering in person in Brazil can be the simplest option, but verify which office handles foreigners and what it will accept before you land. A tourist stay does not by itself block registration; wrong assumptions about the counter usually do.</p>
<table><thead><tr><th>Your situation</th><th>Likely best route</th><th>Watch out for</th></tr></thead><tbody>
<tr><td>Abroad, flexible timing, can attend once</td><td>Consulate</td><td>Appointment lead time; originals required on the day</td></tr>
<tr><td>Abroad, fixed deadline, cannot travel</td><td>Attorney in Brazil with a power of attorney</td><td>Apostille, translation and scope of the mandate</td></tr>
<tr><td>Traveling to Brazil within weeks</td><td>In person in Brazil</td><td>Choosing the right office and carrying complete documents</td></tr>
<tr><td>Already had a CPF years ago</td><td>Update the existing record</td><td>Name and passport mismatches between old and new records</td></tr></tbody></table>
<h2>The “online form” trap</h2>
<p>The Receita Federal publishes an online registration form for foreigners (FCPF). Filling it in is a <em>preparation</em> step, not a result. Three different states get confused all the time: the form is filled, the application is submitted to an authority, and the number has been issued and verified. Only the third one lets a notary or bank proceed. If someone tells you your CPF is “done” because a form was submitted, ask for the number and check it yourself on the Receita Federal’s public status lookup.</p>
<h2>Documents: what officers compare</h2>
<p>Officers are not looking for volume; they are looking for <em>consistency</em>. Expect to be asked for a valid passport, the signed registration form and a civil record such as a birth or marriage certificate. Then check these friction points before the appointment:</p>
<ul><li><strong>Parents’ names.</strong> Brazilian records carry parentage, and some passports (Turkish ones, for example) do not print it. A birth record that does is the usual fix, but confirm whether it needs an apostille or a sworn Portuguese translation.</li><li><strong>Name spelling.</strong> Accented or non-Latin letters must be rendered the same way across forms and documents. Pick one transliteration and keep it.</li><li><strong>Name changes.</strong> Marriage or a changed surname needs a document trail linking the old and new names.</li><li><strong>Image quality (online uploads).</strong> Cropped corners, glare and blurry photos are among the most common reasons for a request to resubmit.</li></ul>
${fig('photo-1603796846097-bee99e4a601f', 'Person taking notes on paper', 'Romain Dancre', 'romaindancre', 'Photo')}
<h2>If you use a power of attorney</h2>
<p>A power of attorney is a legal tool, not a shortcut. To avoid rework, keep it narrow and precise:</p>
<ul><li>Limit the mandate to the CPF registration and its follow-up (filing, tracking, collecting the result). Do not grant banking or asset powers you do not need.</li><li>Match names exactly to your passport and the representative’s own CPF record.</li><li>Check in advance whether the receiving office wants an apostille (Brazil and most countries are parties to the Hague Apostille Convention), an official translation, or the original rather than a scan.</li><li>Remember an apostille proves a document is authentic; it does not make an under-specified mandate sufficient.</li></ul>
<h2>Seven mistakes that cost weeks</h2>
<ol><li><strong>Starting the application at the wrong consulate</strong> for your province of residence.</li><li><strong>Applying for a second CPF</strong> when an old record already exists.</li><li><strong>Treating a submitted form as a finished CPF.</strong></li><li><strong>Mixing name spellings</strong> between the passport, the form and supporting documents.</li><li><strong>Paying for translations or apostilles before confirming</strong> what the receiving office actually requires.</li><li><strong>Over-broad powers of attorney</strong> that create risk without saving time.</li><li><strong>Leaving it until the week of the deal.</strong> Registration timing is not something you can compress on demand.</li></ol>
<h2>What it costs, honestly</h2>
<p>The government’s registration service is free, and some authorized counters in Brazil charge a small fixed fee. Everything else is a separate cost you choose: sworn translations, notarization and apostille, courier fees, a Brazilian representative’s fee and any advisory work. Ask any provider to price these separately so you can see what is state cost and what is service cost.</p>
<h2>After you receive the number</h2>
<ul><li>Verify the number and your name and date of birth on the public status lookup.</li><li>Download the registration proof from the official channel. Brazil no longer issues new plastic CPF cards.</li><li>Use identical personal details on every later bank, notary and company document.</li><li>Check the status occasionally. “Regular” is what banks expect; other statuses, such as “suspensa”, usually mean a correction is needed, not a new number.</li></ul>
<h2>A pre-flight checklist</h2>
<div class="bl-steps"><ol><li>Confirm you do not already have a CPF.</li><li>Decide the route using the three questions above.</li><li>Align name spelling across passport, civil records and the form.</li><li>Confirm apostille, translation and original-document requirements with the receiving office.</li><li>Book the appointment or brief your representative with a narrow mandate.</li><li>Build a buffer of several weeks before any deadline that depends on the number.</li><li>Verify the result on the official lookup and archive the proof.</li></ol></div>
<p>If you want a second pair of eyes on your documents or need help choosing between routes, <a href="/en/">talk to us</a>. We can review your situation in a free preliminary call before you spend anything on translations or travel.</p>`,
  faq: [
    {q: 'Do I need a visa or residency to get a CPF?', a: 'No. Eligibility does not depend on holding a visa or residence permit, though the route you choose has its own requirements.'},
    {q: 'Is the CPF free?', a: 'The state registration service is free. Translations, notarization, apostilles, couriers and professional fees are separate.'},
    {q: 'Can an attorney get my CPF without me?', a: 'An attorney can often act under a properly drafted and accepted power of attorney, but first registrations for passport-only foreigners may still require the representative to attend a counter in person. Confirm with the office before relying on it.'},
    {q: 'Does a new passport mean a new CPF?', a: 'No. The number is permanent; your registration details can be updated.'},
    {q: 'Does having a CPF make me a Brazilian tax resident?', a: 'No. Registration and tax residency are separate questions, although Brazilian-source income can still be taxable.'},
    {q: 'How long does it take?', a: 'There is no guaranteed timeline for foreign applicants. Appointment availability, document review and any corrections drive the duration, so plan with a buffer.'},
  ],
  sources: [
    {label: 'gov.br: Register for a CPF abroad (Inscrever no CPF no exterior)', url: 'https://www.gov.br/pt-br/servicos/inscrever-no-cpf-no-exterior'},
    {label: 'Receita Federal: CPF registration status lookup', url: 'https://servicos.receita.fazenda.gov.br/Servicos/CPF/ConsultaSituacao/ConsultaPublica.asp'},
    {label: 'Itamaraty: e-Consular appointment system', url: 'https://econsular.itamaraty.gov.br/'},
  ],
},
];

export async function seedBlog3(client, cleanPost) {
  const done = await client.execute({sql: "SELECT id FROM items WHERE id='migration-blog-v3'", args: []});
  if (done.rows.length) return;
  const now = Date.now();
  for (const [i, p] of POSTS.entries()) {
    const exists = await client.execute({sql: "SELECT id FROM items WHERE kind='blog_post' AND json_extract(data,'$.slug')=?", args: [p.slug]});
    if (exists.rows.length) continue;
    const d = {...cleanPost(p), created: now - i * 1000, updated: now - i * 1000};
    await client.execute({sql: 'INSERT INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?)', args: ['blog-' + p.slug.slice(0, 40), 'blog_post', 'owner', JSON.stringify(d), now, now]});
  }
  await client.execute({sql: "INSERT INTO items(id,kind,owner,data,created,updated) VALUES('migration-blog-v3','migration','owner','{}',?,?)", args: [now, now]});
}

// One-time (item 'migration-seo-v1'): shorter Google titles / descriptions for the first articles. Only fields that still
// hold the original generated text are replaced, so anything edited in the admin is kept.
const SEO_FIX = {
  'brezilyada-oturum-izni-nasil-alinir': [['Brezilya’da Oturum İzni Nasıl Alınır? (2026 Rehberi) | Brazil Migration', 'Brezilya’da Oturum İzni Nasıl Alınır? (2026) | Brazil Migration'], ['Brezilya oturum izni türleri, şartları, gerekli belgeler, ücretler ve CRNM kaydına kadar adım adım başvuru süreci. Aile birleşimi, emeklilik, dijital göçebe ve yatırım yolları.', 'Brezilya oturum izni türleri, şartlar, belgeler, ücretler ve CRNM kaydına kadar adım adım süreç. Aile birleşimi, emeklilik, dijital göçebe ve yatırım yolları.']],
  'brezilya-vatandasligi-nasil-alinir': [['Brezilya Vatandaşlığı Nasıl Alınır? Şartlar ve Süreler (2026) | Brazil Migration', 'Brezilya Vatandaşlığı Nasıl Alınır? (2026) | Brazil Migration']],
  'yabanci-olarak-brezilyada-sirket-kurmak': [['Yabancı Olarak Brezilya’da Şirket Kurmak (2026 Rehberi) | Brazil Migration', 'Brezilya’da Şirket Kurmak: Yabancı Rehberi | Brazil Migration']],
  'brezilya-dijital-gocebe-vizesi': [['Brezilya Dijital Göçebe Vizesi (VITEM XIV) 2026 | Brazil Migration', 'Brezilya Dijital Göçebe Vizesi (VITEM XIV) | Brazil Migration']],
};
export async function migrateBlogSeo(client) {
  const done = await client.execute({sql: "SELECT id FROM items WHERE id='migration-seo-v1'", args: []});
  if (done.rows.length) return;
  const now = Date.now();
  for (const [slug, pairs] of Object.entries(SEO_FIX)) {
    const r = await client.execute({sql: "SELECT id, data FROM items WHERE kind='blog_post' AND json_extract(data,'$.slug')=?", args: [slug]});
    for (const row of r.rows) {
      let d; try { d = JSON.parse(row.data); } catch { continue; }
      d.seo = d.seo || {}; let changed = false;
      for (const [from, to] of pairs) for (const k of ['title', 'description']) if (d.seo[k] === from) { d.seo[k] = to; changed = true; }
      if (changed) await client.execute({sql: 'UPDATE items SET data=?, updated=? WHERE id=?', args: [JSON.stringify(d), now, row.id]});
    }
  }
  await client.execute({sql: "INSERT INTO items(id,kind,owner,data,created,updated) VALUES('migration-seo-v1','migration','owner','{}',?,?)", args: [now, now]});
}
