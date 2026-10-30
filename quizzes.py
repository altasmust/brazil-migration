def q(title,options,multi=False,note=''):return dict(title=title,options=[dict(label=l,points=p) for l,p in options],multi=multi,note=note)
QUIZZES={
'oturum':dict(title='São Paulo’da Oturum İznine Ne Kadar Uygunsun?',max=120,questions=[
q('Medeni durumunuz nedir?',[('Bekâr',5),('Evli / União Estável',25),('Boşanmış / Dul',10)]),
q('Brezilyalı eş, partner veya Brezilya’da yasal oturumlu aile üyeniz var mı?',[('Evet, Brezilyalı eş / partner',30),('Evet, oturumu olan aile üyesi',20),('Hayır',0)]),
q('São Paulo’da yaşama motivasyonunuz nedir?',[('Aile birleşimi / partnerim orada',25),('İş / kariyer',15),('Sadece denemek istiyorum',5)]),
q('Son 5 yıl için adli sicil durumunuz nedir?',[('Kayıt yok',15),('Değerlendirilmesi gereken küçük bir sorun var',5),('Önemli bir kayıt var',0)],note='“Küçük” ve “önemli” kişisel nitelemelerdir; hukuki sonuç çıkarmaz. Ayrıntı veya belge paylaşmayın.'),
q('Düzenli geliriniz veya mali desteğiniz var mı?',[('Yeterli ve belgelenebilir',15),('Kısmen',8),('Hayır',0)]),
q('São Paulo’da konaklamanızı ayarlayabilir misiniz?',[('Hazır',10),('Ayarlanabilir',5),('Henüz yok',0)])]),
'lgbt':dict(title='LGBT+ Olarak São Paulo’da Oturum İznine Ne Kadar Uygunsun?',max=110,questions=[
q('İlişki durumunuz nedir?',[('Aynı cinsiyetli evli / união estável',30),('Ciddi ve uzun süreli ilişki',20),('Yeni ilişki / bekâr',5)],note='Yanıt isteğe bağlıdır. Bu araç cinsel yöneliminizi puanlamaz; briefteki partner/aile yolu göstergelerini kullanır.'),
q('Partneriniz Brezilyalı mı veya yasal oturumu var mı?',[('Brezilyalı',30),('Brezilya’da oturumu var',20),('Hayır',0)]),
q('İlişkinizi belgeleyen kanıtlarınız var mı?',[('Güçlü ve çeşitli kanıtlar',20),('Birkaç kanıt',10),('Çok az / yok',0)],note='Ortak adres, resmî kayıt ve diğer belgeler uzman tarafından değerlendirilir. Fotoğraf tek başına yeterlilik sağlamaz.'),
q('São Paulo’da LGBT+ dostu yaşam ve topluluk arayışında mısınız?',[('Aktif olarak istiyorum',10),('Meraklıyım',5),('Önemli değil',0)],note='Bu tercih hukuki oturum şartı değildir; yalnızca bu örnek quiz modelinde puanlanır.'),
q('Adli sicil durumunuz nedir?',[('Kayıt yok',10),('İncelenmesi gereken küçük bir sorun',3),('Önemli bir kayıt',0)],note='Belge veya olay ayrıntısı paylaşmayın. Hukuki değerlendirme avukata aittir.'),
q('Portekizce seviyeniz nedir?',[('Orta / ileri',10),('Temel',5),('Hiç bilmiyorum',0)],note='Dil seviyesi bu quizde hazırlık göstergesidir; aile birleşiminde otomatik bir eleme kuralı değildir.')]),
'evlilik':dict(title='Evlilik / União Estável Yoluyla São Paulo Oturum İznine Ne Kadar Uygunsun?',max=100,questions=[
q('Şu anki durumunuz nedir?',[('Resmî olarak evliyiz',30),('União estável belgemiz var veya düzenleyeceğiz',25),('Henüz resmî değil, ciddi ilişkimiz var',10)],note='Belgeyi düzenlemeyi planlamak, hukuken mevcut bir belgeyle aynı değildir; bu örnek puanlama ikisini aynı seçenek altında toplar.'),
q('Eşiniz / partneriniz Brezilyalı mı?',[('Evet',30),('Hayır, Brezilya’da oturumu var',15),('Hayır',0)]),
q('Evlilik / união estável belgelerini hazırlayabilir misiniz?',[('Hazır veya kolayca hazırlanır',15),('Yardımla hazırlanır',8),('Zor',0)],note='Apostil/legalizasyon ve yeminli tercüme ihtiyacı dosya bazında kontrol edilir.'),
q('Ortak yaşam kanıtlarınız ne kadar güçlü?',[('Çok güçlü',15),('Orta',8),('Zayıf',0)]),
q('São Paulo’da birlikte yaşama planınız net mi?',[('Evet, net plan var',10),('Genel olarak istiyoruz',5),('Belirsiz',0)])]),
'vatandaslik':dict(title='Brezilya Vatandaşlığına Ne Kadar Yakınsın? São Paulo Odaklı',max=100,questions=[
q('Mevcut yasal oturum durumunuz nedir?',[('Süresiz — indeterminado',30),('Geçici oturum',15),('Henüz oturumum yok',0)]),
q('Brezilya’da ne kadar süredir yasal yaşıyorsunuz?',[('4 yıl veya daha fazla',25),('1–3 yıl ve Brezilyalı eş / çocuk var',20),('1 yıldan az',5),('1–3 yıl, Brezilyalı eş / çocuk yok',0)],note='İkametin hukuki başlangıç tarihi ve sayılabilir süre uzman tarafından belirlenir. Son seçenek kapsama boşluğunu tamamlar.'),
q('Brezilyalı eşiniz veya çocuğunuz var mı?',[('Evet',20),('Hayır',0)],note='Süre indirimi için gereken diğer şartlar ayrıca incelenir.'),
q('Portekizce seviyeniz nedir?',[('İleri / Celpe-Bras alabilirim',15),('Orta',8),('Temel veya yok',0)],note='Sınava girebilmek yeterlilik belgesine sahip olmak değildir. Kabul edilen başka kanıtlar da vardır.'),
q('Brezilya ve menşe ülke adli sicil durumunuz nedir?',[('Kayıt yok',10),('İncelenmesi gereken küçük bir sorun',3),('Önemli bir kayıt',0)],note='Kaydın niteliği ve varsa rehabilitasyon ayrıca incelenir.')]),
'sirket':dict(title='São Paulo’da Şirket Kurmaya Ne Kadar Hazırsın?',max=115,questions=[
q('Brezilya’da şirket kurma amacınız nedir?',[('Kalıcı iş kurmak ve yaşamak',25),('Yatırım / ihracat',20),('Sadece denemek',5)]),
q('CPF’niz var mı veya almaya hazır mısınız?',[('Var',15),('Alabilirim',10),('Bilmiyorum',0)]),
q('Gerekirse Brezilya’da mukim temsilci ayarlayabilir misiniz?',[('Evet',15),('Yardımla ayarlanır',8),('Hayır',0)],note='Procurador residente ihtiyacı ortak, yönetici ve işlem türüne göre ayrıca kontrol edilir.'),
q('Başlangıç bütçeniz ne kadar?',[('10.000 USD üzeri',20),('5.000–10.000 USD',12),('5.000 USD altı',5)],note='Bunlar işletme planlama aralıklarıdır; yatırımcı oturumu eşikleri değildir.'),
q('Hangi hizmetlere ihtiyacınız var?',[('Banka hesabı',5),('Muhasebe',5),('Web sitesi + kurumsal kimlik',5),('Ofis bulma',5),('Aylık danışmanlık',5)],multi=True,note='Çoklu seçim; en fazla 25 puan. Hizmet ihtiyacı hukuki uygunluk ölçütü değildir. Hiçbirini seçmeden ilerleyebilirsiniz.'),
q('São Paulo’da aktif iş yapmak istiyor musunuz?',[('Evet, net planım var',15),('Belki',5),('Hayır',0)])])}
EXTRA={
'oturum':[('Kaç ek aile bireyiyle taşınmayı düşünüyorsunuz?',['Yalnız','1 kişi','2 kişi','3 veya daha fazla']),('Taşınma hedefiniz ne zaman?',['3 ay içinde','3–12 ay','Henüz net değil']),('Şu anda nerede yaşıyorsunuz?',['Türkiye','Brezilya','Başka bir ülke']),('İlk görüşmede neyi netleştirelim?',['Başvuru yolu','Aile belgeleri','Bütçe ve paket'])],
'lgbt':[('Ön görüşmeye nasıl katılmak istersiniz?',['Tek başıma','Partnerimle','Henüz karar vermedim']),('Belgeleriniz hangi ülkede?',['Brezilya','Türkiye','Birden çok ülke']),('Yerleşimde önceliğiniz nedir?',['Ulaşım ve konut','Topluluk kaynakları','Belge süreci']),('İletişim tercihiniz nedir?',['Yazılı bilgilendirme','Çevrim içi görüşme','Görüşmede belirleyelim'])],
'evlilik':[('İlişki belgesi nerede düzenlendi?',['Brezilya','Türkiye / başka ülke','Henüz düzenlenmedi']),('Birlikte taşınacak çocuk var mı?',['Evet','Hayır','Görüşmede paylaşırım']),('Mevcut konumunuz nedir?',['İkimiz de Brezilya’dayız','Farklı ülkelerdeyiz','İkimiz de Brezilya dışındayız']),('İlk önceliğiniz nedir?',['Belge kontrolü','Ortak yaşam planı','Başvuru yolunu öğrenmek']),('Hedef takviminiz nedir?',['3 ay içinde','3–12 ay','Henüz belli değil'])],
'vatandaslik':[('Seyahat tarihlerinizi listelediniz mi?',['Evet','Kısmen','Henüz değil']),('İkamet kanıtlarınız düzenli mi?',['Yıllara göre hazır','Bir kısmı eksik','İnceleme istiyorum']),('Belgelerinizde isim farkı var mı?',['Yok','Var','Kontrol edilmeli']),('Dil yeterlilik belgeniz hazır mı?',['Hazır','Hazırlanıyor','Alternatifleri öğrenmek istiyorum']),('İlk görüşmenin odağı ne olsun?',['Süre hesabı','Belge kontrolü','Başvuru takvimi'])],
'sirket':[('Kaç ortak olacak?',['Tek ortak','İki veya daha fazla','Henüz net değil']),('Faaliyetiniz hangi alanda?',['Hizmet / teknoloji','Ticaret / ihracat','Başka bir alan']),('Ofis tercihiniz nedir?',['Fiziksel ofis','Coworking / uygun ticari adres','Araştırıyorum']),('Operasyona ne zaman başlamak istiyorsunuz?',['3 ay içinde','3–12 ay','Henüz belli değil'])]}
for key,quiz in QUIZZES.items():
 quiz['scoredCount']=len(quiz['questions'])
 for title,opts in EXTRA[key]:quiz['questions'].append(q(title,[(o,0) for o in opts],note='Planlama sorusu · puana etkisi yoktur.'))
 assert len(quiz['questions'])==10
 assert sum(sum(o['points'] for o in a['options']) if a['multi'] else max(o['points'] for o in a['options']) for a in quiz['questions'])==quiz['max']
