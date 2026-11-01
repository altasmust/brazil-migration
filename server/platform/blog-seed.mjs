// One-time blog setup: adds the first sample article and a "Blog" link to a menu saved in the admin.
// Runs once (item 'migration-blog-v1'); deleting the article later does not bring it back.
const U = (id, w = 1600) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;
const fig = (id, alt, name, user) => `<figure><img src="${U(id, 1400)}" alt="${alt}" width="1400" height="933"><figcaption>Fotoğraf: <a href="https://unsplash.com/@${user}">${name}</a> / Unsplash</figcaption></figure>`;

export const SAMPLE_POST = {
  slug: 'brezilyada-oturum-izni-nasil-alinir',
  title: 'Brezilya’da Oturum İzni Nasıl Alınır? Türler, Belgeler ve Adım Adım Başvuru',
  category: 'Oturum İzni',
  excerpt: 'Aile birleşimi, emeklilik, dijital göçebe ve yatırım yoluyla Brezilya oturum izni: hangi şartlar aranır, hangi belgeler hazırlanır ve CRNM kartına kadar süreç nasıl ilerler?',
  lead: 'Kısaca: Brezilya’da oturum izni (autorização de residência) almak için önce size uyan oturum türünü belirlersiniz, belgelerinizi Türkiye’de apostilletip Brezilya’da yeminli tercümana çevirtirsiniz, başvuruyu Adalet Bakanlığı’nın çevrim içi sistemi veya Federal Polis üzerinden yaparsınız ve onaydan sonra Federal Polis’e kayıt olarak yabancı kimlik kartınızı (CRNM) alırsınız.',
  cover: U('photo-1484749371692-c54e98b561e2'),
  coverAlt: 'Kuşbakışı São Paulo gökdelenleri',
  coverCredit: {name: 'Odair Faléco', url: 'https://unsplash.com/@odair_faleco'},
  author: {name: 'Brazil Migration Editör Ekibi', role: 'São Paulo · Göç ve oturum rehberliği'},
  date: '2026-10-31', modified: '2026-10-31',
  featured: true, published: true,
  seo: {title: 'Brezilya’da Oturum İzni Nasıl Alınır? (2026 Rehberi) | Brazil Migration', description: 'Brezilya oturum izni türleri, şartları, gerekli belgeler, ücretler ve CRNM kaydına kadar adım adım başvuru süreci. Aile birleşimi, emeklilik, dijital göçebe ve yatırım yolları.'},
  content: `<p>Brezilya’ya kalıcı olarak taşınmayı düşünen herkesin ilk sorusu aynıdır: “Burada yasal olarak nasıl yaşayabilirim?” Turist olarak girip kalmak mümkün değildir; uzun süreli yaşam için ya yurt dışındaki bir Brezilya konsolosluğundan uygun vizeyi almanız ya da Brezilya’dayken oturum izni başvurusu yapmanız gerekir. Bu rehberde oturum türlerini, belgeleri ve başvuru adımlarını sade bir dille anlatıyoruz.</p>
<h2>Brezilya’da oturum izni nedir?</h2>
<p>Oturum izni, Portekizce adıyla <strong>autorização de residência</strong>, yabancıların Brezilya’da belirli bir süre veya süresiz olarak yaşamasına izin veren resmi karardır. Konunun temel dayanağı 2017’de yürürlüğe giren <strong>13.445 sayılı Göç Yasası</strong>’dır (Lei de Migração). Yasanın ayrıntıları ise Ulusal Göç Konseyi’nin (CNIg) normatif kararlarıyla belirlenir; her oturum türünün şartları bu kararlarda yer alır.</p>
<p>Vize ile oturum izni arasındaki farkı bilmek önemlidir:</p>
<ul><li><strong>Vize (VITEM):</strong> Türkiye’deyken Brezilya konsolosluğuna başvurularak alınır ve ülkeye bu amaçla girmenizi sağlar.</li><li><strong>Oturum izni:</strong> Brezilya’dayken Adalet Bakanlığı’nın çevrim içi sistemi (MigranteWeb) veya Federal Polis (Polícia Federal) üzerinden istenir.</li></ul>
<p>Her iki yolun sonunda da Federal Polis’e kayıt olur ve <strong>CRNM</strong> (Carteira de Registro Nacional Migratório) denen yabancı kimlik kartını alırsınız.</p>
${fig('photo-1761873761999-8e40fa691fb6', 'Işıklar önünde Brezilya bayrağı', 'Annie V', 'alexa_filmvibes')}
<h2>Oturum izni türleri ve temel şartlar</h2>
<p>Brezilya’da çok sayıda oturum türü vardır. Türkiye’den gelenlerin en sık kullandığı yollar şunlardır. Tablodaki tutarlar ilgili CNIg kararlarında yer alan alt sınırlardır; başvuru öncesinde güncel metni mutlaka kontrol edin.</p>
<table><thead><tr><th>Tür</th><th>Kimler için?</th><th>Temel şart</th><th>İlk izin süresi</th></tr></thead><tbody>
<tr><td>Aile birleşimi</td><td>Brezilya vatandaşı veya Brezilya’da oturum izni olan birinin eşi, partneri, çocuğu veya ebeveyni</td><td>Aile bağının belgelenmesi (evlilik, doğum kaydı vb.)</td><td>Sponsorun statüsüne göre değişir</td></tr>
<tr><td>Emekli</td><td>Kendi ülkesinden emekli maaşı alanlar</td><td>Brezilya’ya aktarılabilir, aylık en az 2.000 ABD doları emekli geliri (RN 40/2019)</td><td>2 yıla kadar, sonra süresiz</td></tr>
<tr><td>Dijital göçebe</td><td>Yurt dışındaki bir işveren veya müşteriler için uzaktan çalışanlar</td><td>Aylık en az 1.500 ABD doları gelir veya en az 18.000 ABD doları banka bakiyesi (RN 45/2021)</td><td>1 yıl, 1 yıl uzatılabilir</td></tr>
<tr><td>Gayrimenkul yatırımı</td><td>Brezilya’da konut veya ticari mülk satın alanlar</td><td>En az 1.000.000 BRL yatırım; Kuzey ve Kuzeydoğu bölgelerinde 700.000 BRL (RN 36/2018)</td><td>4 yıl, sonra süresiz</td></tr>
<tr><td>Şirket yatırımı</td><td>Brezilya’da şirket kuran veya şirkete sermaye koyan yatırımcılar</td><td>Genel kural olarak 500.000 BRL; yenilikçi projelerde daha düşük tutar (RN 11/2017)</td><td>Projeye göre değişir</td></tr>
<tr><td>Çalışma</td><td>Brezilya’daki bir şirketten iş teklifi alanlar</td><td>İşverenin başvurusu ve Çalışma Bakanlığı onayı</td><td>Sözleşmeye göre</td></tr>
</tbody></table>
<div class="bl-tip"><p><strong>İpucu:</strong> Aile birleşimi, Brezilyalı bir eşi veya çocuğu olanlar için genellikle en hızlı ve en az maliyetli yoldur. Yatırım yolları ise yüksek sermaye ister ama aileyi de kapsayacak şekilde planlanabilir.</p></div>
<p>Hangi yolun size uygun olduğunu bilmiyorsanız <a href="/degerlendirme/">10 soruluk ön değerlendirmemizi</a> yapabilir ya da <a href="/brezilya-oturum-izni/">oturum ve aile birleşimi hizmet sayfamızı</a> inceleyebilirsiniz.</p>
<h2>Gerekli belgeler</h2>
<p>Belge listesi oturum türüne ve başvurunun yapıldığı Federal Polis birimine göre değişir. Ancak hemen her başvuruda şu belgeler istenir:</p>
<ol><li><strong>Geçerli pasaport</strong> ve Brezilya’ya giriş kaydı.</li><li><strong>Doğum belgesi</strong> veya nüfus kayıt örneği (anne-baba bilgileriyle).</li><li><strong>Adli sicil kaydı:</strong> Son yaşadığınız ülkelerden alınır. Genellikle son 90 gün içinde düzenlenmiş olması beklenir.</li><li><strong>Türe özel belgeler:</strong> Evlilik belgesi, emekli maaş yazısı, gelir ve banka belgeleri, iş sözleşmesi, tapu veya yatırım belgeleri gibi.</li><li><strong>CPF numarası:</strong> Brezilya vergi kimlik numarası. Banka, kira ve neredeyse her işlem için gerekir.</li><li><strong>Adres belgesi ve vesikalık fotoğraf.</strong></li><li><strong>Harç ödemesi:</strong> GRU dekontu.</li></ol>
${fig('photo-1693620714112-a79a7d27308b', 'Yatak üzerinde iki pasaport', 'Nico Smit', 'nicosmit99')}
<h3>Apostil ve yeminli tercüme</h3>
<p>Türkiye ve Brezilya, Lahey Apostil Sözleşmesi’ne taraftır. Bu nedenle Türkiye’de alınan resmi belgeler (doğum, evlilik, adli sicil) Türkiye’de <strong>apostil şerhi</strong> ile onaylanır; ayrıca konsolosluk onayı gerekmez. Apostilli belgeler daha sonra Brezilya’da bir <strong>yeminli tercüman</strong> (tradutor público juramentado) tarafından Portekizceye çevrilmelidir. Türkiye’de yapılan çeviriler çoğu zaman kabul edilmez.</p>
<div class="bl-warn"><p><strong>Dikkat:</strong> Adli sicil kaydı gibi kısa süre geçerli belgeleri en sona bırakın. Apostil, tercüme ve randevu süreleri toplandığında belge, başvuru gününe kadar geçerliliğini yitirebilir.</p></div>
<h2>Adım adım başvuru süreci</h2>
<p>Başvuru yolu oturum türüne göre değişse de süreç genel olarak şöyle ilerler:</p>
<ol><li><strong>Doğru oturum türünü belirleyin.</strong> Şartları sağladığınızı belgelerle gösterebileceğiniz yolu seçin.</li><li><strong>Belgeleri Türkiye’de hazırlayın.</strong> Resmi belgeleri alın ve apostil şerhi yaptırın.</li><li><strong>CPF alın.</strong> CPF, Brezilya konsolosluklarından veya Brezilya’da Receita Federal üzerinden alınabilir.</li><li><strong>Tercümeleri yaptırın.</strong> Brezilya’ya geldikten sonra belgeleri yeminli tercümana çevirtin.</li><li><strong>Başvuruyu yapın.</strong> Birçok tür için başvuru, Adalet Bakanlığı’nın MigranteWeb sistemi üzerinden çevrim içi yapılır. Bazı türlerde başvuru doğrudan Federal Polis’e yapılır.</li><li><strong>Harcı ödeyin, randevu alın.</strong> GRU harcını ödeyin ve Federal Polis’ten biyometri (parmak izi, fotoğraf) randevusu alın.</li><li><strong>Kaydınızı tamamlayın, CRNM’yi alın.</strong> Randevuda belgelerinizin asıllarını gösterin. Kart hazırlandığında aynı birimden teslim alın.</li></ol>
${fig('photo-1493488220078-55bbc84f638a', 'Şehirde modern bina cepheleri', 'DAVIDSON L U N A', 'davidsonluna')}
<h2>Kayıt süreleri, ücretler ve bekleme</h2>
<p>Süreleri kaçırmamak çok önemlidir. Resmi bilgilere göre:</p>
<ul><li><strong>Geçici vize ile girenler,</strong> ülkeye girişten sonraki <strong>90 gün içinde</strong> Federal Polis’e kayıt olmalıdır.</li><li><strong>Brezilya’dayken oturum izni alanlar,</strong> kararın Resmî Gazete’de (Diário Oficial da União) yayımlanmasından sonraki <strong>30 gün içinde</strong> kayıt olmalıdır.</li></ul>
<p>CRNM harcı için resmi hizmet sayfasında 204,77 BRL tutarı yer alır. Başvurunun karara bağlanması türe ve yoğunluğa göre birkaç haftadan birkaç aya kadar sürebilir. Kartın basılması ise ayrıca birkaç hafta alabilir. Kart gelene kadar randevuda verilen başvuru belgesi (protocolo) geçici olarak kimlik yerine kullanılır.</p>
<div class="bl-note"><p><strong>Not:</strong> Harç tutarları ve süreler değişebilir. Güncel bilgi için başvuru gününden önce gov.br üzerindeki ilgili hizmet sayfasını kontrol edin.</p></div>
<h2>Sık yapılan hatalar</h2>
<ul><li><strong>Apostilsiz belge getirmek:</strong> Türkiye’de alınmayan apostil, Brezilya’da tamamlanamaz.</li><li><strong>Tercümeyi Türkiye’de yaptırmak:</strong> Brezilya, kendi yeminli tercümanlarının çevirisini ister.</li><li><strong>Kayıt süresini kaçırmak:</strong> 90 veya 30 günlük süreyi aşmak para cezasına yol açabilir.</li><li><strong>Gelir belgesini eksik sunmak:</strong> Emekli ve dijital göçebe başvurularında düzenli gelirin kaynağı açıkça gösterilmelidir.</li><li><strong>Adres değişikliğini bildirmemek:</strong> Oturum izni olanlar adres değişikliğini Federal Polis’e bildirmelidir.</li></ul>
<h2>Oturum izninden vatandaşlığa</h2>
<p>Süresiz oturum izni, Brezilya vatandaşlığına giden yolun da başlangıcıdır. Göç Yasası’na göre olağan vatandaşlık için genellikle <strong>4 yıl kesintisiz ikamet</strong> gerekir. Brezilyalı bir eşiniz veya çocuğunuz varsa bu süre <strong>1 yıla</strong> kadar inebilir. Başvuruda Portekizce iletişim yeterliliği de belgelenmelidir (örneğin Celpe-Bras sınavıyla). Ayrıntılar için <a href="/brezilya-vatandasligi/">Brezilya vatandaşlığı sayfamıza</a> göz atabilirsiniz.</p>`,
  faq: [
    {q: 'Brezilya’da oturum izni ne kadar sürede çıkar?', a: 'Süre, oturum türüne ve başvurunun yapıldığı birimin yoğunluğuna göre değişir. Belgeler eksiksizse karar genellikle birkaç hafta ile birkaç ay arasında çıkar. Ardından Federal Polis kaydı ve CRNM kartının basılması için ek süre gerekir.'},
    {q: 'Turist olarak girip Brezilya’da oturum izni başvurusu yapabilir miyim?', a: 'Bazı türlerde, örneğin aile birleşiminde, Brezilya’dayken başvuru mümkündür. Bazı türlerde ise önce konsolosluktan uygun vizeyi almanız gerekir. Başvuru öncesinde size uyan türün kuralını kontrol edin.'},
    {q: 'Türkiye’den aldığım belgeleri tercüme ettirmem gerekir mi?', a: 'Evet. Türkiye’de alınan resmi belgelere önce apostil şerhi yaptırılmalıdır. Ardından belgeler Brezilya’da yeminli tercüman (tradutor público juramentado) tarafından Portekizceye çevrilmelidir.'},
    {q: 'CRNM nedir ve ne işe yarar?', a: 'CRNM (Carteira de Registro Nacional Migratório), Brezilya’da yaşayan yabancıların kimlik kartıdır. Banka hesabı açma, kira sözleşmesi, sağlık hizmetleri ve resmi işlemlerde kimliğiniz olarak kullanılır.'},
    {q: 'Oturum izniyle Brezilya’da çalışabilir miyim?', a: 'Göç Yasası’na göre oturum izni olan yabancılar, genel olarak Brezilyalılarla aynı şekilde çalışma hakkına sahiptir. Bazı meslekler ise kendi meslek odasına kayıt ister (örneğin avukatlık için OAB).'},
    {q: 'Ailem de benimle birlikte oturum izni alabilir mi?', a: 'Evet. Oturum izni olan kişinin eşi, çocukları ve bazı durumlarda ebeveynleri aile birleşimi yoluyla başvurabilir. Aile bağını gösteren belgeler apostilli ve tercümeli olmalıdır.'},
  ],
  sources: [
    {label: 'Lei nº 13.445/2017 — Göç Yasası (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2017/lei/l13445.htm'},
    {label: 'gov.br — Registrar-se como estrangeiro no Brasil (CRNM kaydı)', url: 'https://www.gov.br/pt-br/servicos/registrar-se-como-estrangeiro-no-brasil'},
    {label: 'gov.br — Obter autorização de residência e Carteira de Registro Migratório', url: 'https://www.gov.br/pt-br/servicos/obter-autorizacao-de-residencia-e-carteira-de-registro-migratorio'},
    {label: 'Polícia Federal — Göç işlemleri ve başvuru sorgulama', url: 'https://www.gov.br/pf/pt-br/assuntos/imigracao'},
  ],
};

const BLOG_LINK = {title: 'Blog', desc: 'Oturum, vatandaşlık ve yaşam üzerine güncel rehber yazılar.', href: '/blog/'};
export async function seedBlog(client, cleanPost) {
  const done = await client.execute({sql: "SELECT id FROM items WHERE id='migration-blog-v1'", args: []});
  if (done.rows.length) return;
  const now = Date.now();
  const exists = await client.execute({sql: "SELECT id FROM items WHERE kind='blog_post' AND json_extract(data,'$.slug')=?", args: [SAMPLE_POST.slug]});
  if (!exists.rows.length) {
    const d = {...cleanPost(SAMPLE_POST), created: now, updated: now};
    await client.execute({sql: 'INSERT INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?)', args: ['blog-oturum-izni', 'blog_post', 'owner', JSON.stringify(d), now, now]});
  }
  // a menu saved in the admin replaces the static one, so add the Blog link there too
  const m = (await client.execute({sql: "SELECT data FROM items WHERE id='site-menu'", args: []})).rows[0];
  if (m) {
    try {
      const menu = JSON.parse(m[0] ?? m.data);
      const g = (menu.groups || []).find(x => /rehber/i.test(x.title)) || menu.groups?.[menu.groups.length - 1];
      if (g && !(g.links || []).some(l => l.href === '/blog/')) (g.links ||= []).push(BLOG_LINK);
      const col = (menu.footer?.cols || []).find(c => (c.links || []).some(l => /turkiye-brezilya|portekizce/.test(l.href))) || menu.footer?.cols?.[menu.footer.cols.length - 1];
      if (col && !(col.links ||= []).some(l => l.href === '/blog/')) { const k = col.links.findIndex(l => /turkiye-brezilya/.test(l.href)); col.links.splice(k > -1 ? k + 1 : col.links.length, 0, {label: 'Blog', href: '/blog/'}); }
      await client.execute({sql: "UPDATE items SET data=?, updated=? WHERE id='site-menu'", args: [JSON.stringify(menu), now]});
    } catch {}
  }
  await client.execute({sql: "INSERT INTO items(id,kind,owner,data,created,updated) VALUES('migration-blog-v1','migration','owner','{}',?,?)", args: [now, now]});
}

// One-time: Vatandaşlık moves under "Oturum & yaşam"; "İş & vatandaşlık" becomes "İş & yatırım" (menu saved in the admin).
export async function migrateMenuV2(client) {
  const done = await client.execute({sql: "SELECT id FROM items WHERE id='migration-menu-v2'", args: []});
  if (done.rows.length) return;
  const now = Date.now();
  const m = (await client.execute({sql: "SELECT data FROM items WHERE id='site-menu'", args: []})).rows[0];
  if (m) {
    try {
      const menu = JSON.parse(m[0] ?? m.data), G = menu.groups || [];
      const res = G.find(g => (g.links || []).some(l => /brezilya-oturum-izni/.test(l.href)));
      const biz = G.find(g => g !== res && (g.links || []).some(l => /brezilya-vatandasligi/.test(l.href)));
      if (res && biz) {
        const i = biz.links.findIndex(l => /brezilya-vatandasligi/.test(l.href));
        const [v] = biz.links.splice(i, 1); res.links.push(v);
        if (/vatanda/i.test(biz.title)) { biz.title = 'İş & yatırım'; if (biz.intro && /vatanda/i.test(biz.intro.heading || '')) biz.intro.heading = 'İş & yatırım'; }
        await client.execute({sql: "UPDATE items SET data=?, updated=? WHERE id='site-menu'", args: [JSON.stringify(menu), now]});
      }
    } catch {}
  }
  await client.execute({sql: "INSERT INTO items(id,kind,owner,data,created,updated) VALUES('migration-menu-v2','migration','owner','{}',?,?)", args: [now, now]});
}

// One-time: menu groups become Bireysel / Kurumsal / Rehber, Blog and Hakkımızda become direct top links,
// the old "Kurumsal" (about) group is removed (menu saved in the admin).
export async function migrateMenuV3(client) {
  const done = await client.execute({sql: "SELECT id FROM items WHERE id='migration-menu-v3'", args: []});
  if (done.rows.length) return;
  const now = Date.now();
  const m = (await client.execute({sql: "SELECT data FROM items WHERE id='site-menu'", args: []})).rows[0];
  if (m) {
    try {
      const menu = JSON.parse(m[0] ?? m.data); let G = menu.groups || [];
      const has = (g, re) => (g.links || []).some(l => re.test(l.href || ''));
      const ren = (g, t) => { if (!g) return; g.title = t; g.intro = {...(g.intro || {}), heading: t}; };
      G = G.filter(g => !(has(g, /#yaklasim|#dunya-haritasi/) && !has(g, /brezilya|degerlendirme|portekizce|turkiye/)));
      ren(G.find(g => has(g, /brezilya-oturum-izni/)), 'Bireysel');
      ren(G.find(g => has(g, /brezilyada-sirket-kurma/)), 'Kurumsal');
      const r = G.find(g => has(g, /degerlendirme|portekizce|turkiye-brezilya/)); ren(r, 'Rehber');
      if (r) r.links = r.links.filter(l => l.href !== '/blog/');
      const blank = {kicker: '', heading: '', text: '', cta: {label: '', href: ''}};
      if (!G.some(g => g.href === '/blog/')) G.push({title: 'Blog', href: '/blog/', intro: blank, links: []});
      if (!G.some(g => g.href === '/hakkimizda/')) G.push({title: 'Hakkımızda', href: '/hakkimizda/', intro: blank, links: []});
      menu.groups = G;
      const col = (menu.footer?.cols || []).find(c => (c.links || []).some(l => l.href === '/blog/'));
      if (col && !col.links.some(l => l.href === '/hakkimizda/')) col.links.splice(col.links.findIndex(l => l.href === '/blog/') + 1, 0, {label: 'Hakkımızda', href: '/hakkimizda/'});
      await client.execute({sql: "UPDATE items SET data=?, updated=? WHERE id='site-menu'", args: [JSON.stringify(menu), now]});
    } catch {}
  }
  await client.execute({sql: "INSERT INTO items(id,kind,owner,data,created,updated) VALUES('migration-menu-v3','migration','owner','{}',?,?)", args: [now, now]});
}

// One-time: legal page links in the footer bottom row of a menu saved in the admin.
export async function migrateMenuV4(client) {
  const done = await client.execute({sql: "SELECT id FROM items WHERE id='migration-menu-v4'", args: []});
  if (done.rows.length) return;
  const now = Date.now();
  const m = (await client.execute({sql: "SELECT data FROM items WHERE id='site-menu'", args: []})).rows[0];
  if (m) {
    try {
      const menu = JSON.parse(m[0] ?? m.data), bl = menu.footer?.bottom?.links;
      if (Array.isArray(bl)) {
        const add = [['Gizlilik', '/gizlilik-politikasi/'], ['KVKK', '/kvkk-aydinlatma-metni/'], ['Çerezler', '/cerez-politikasi/'], ['Kullanım koşulları', '/kullanim-kosullari/']].filter(([, h]) => !bl.some(l => l.href === h)).map(([label, href]) => ({label, href}));
        const k = bl.findIndex(l => /kaynaklar/.test(l.href)); bl.splice(k > -1 ? k + 1 : bl.length, 0, ...add);
        await client.execute({sql: "UPDATE items SET data=?, updated=? WHERE id='site-menu'", args: [JSON.stringify(menu), now]});
      }
    } catch {}
  }
  await client.execute({sql: "INSERT INTO items(id,kind,owner,data,created,updated) VALUES('migration-menu-v4','migration','owner','{}',?,?)", args: [now, now]});
}

// One-time: drop the footer "Danışmanlık yaklaşımımız" link (duplicates Hakkımızda) from a saved menu.
export async function migrateMenuV5(client) {
  const done = await client.execute({sql: "SELECT id FROM items WHERE id='migration-menu-v5'", args: []});
  if (done.rows.length) return;
  const now = Date.now();
  const m = (await client.execute({sql: "SELECT data FROM items WHERE id='site-menu'", args: []})).rows[0];
  if (m) {
    try {
      const menu = JSON.parse(m[0] ?? m.data);
      for (const c of menu.footer?.cols || []) c.links = (c.links || []).filter(l => l.href !== '/#yaklasim');
      await client.execute({sql: "UPDATE items SET data=?, updated=? WHERE id='site-menu'", args: [JSON.stringify(menu), now]});
    } catch {}
  }
  await client.execute({sql: "INSERT INTO items(id,kind,owner,data,created,updated) VALUES('migration-menu-v5','migration','owner','{}',?,?)", args: [now, now]});
}
