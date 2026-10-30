# Builds /giris/ and /partner-ol/ from the site's original login page shell (header/footer kept).
import re, sys
SRC = sys.argv[1] if len(sys.argv) > 1 else 'public/giris/index.html'
base = open(SRC, encoding='utf-8').read()

def page(title, desc, canonical, body_page, main):
    s = base
    s = re.sub(r'<title>.*?</title>', f'<title>{title}</title>', s, flags=re.S)
    s = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{desc}">', s)
    s = re.sub(r'<link rel="canonical"[^>]*>', '', s)
    s = re.sub(r'<meta property="og:(url|title|description|image)"[^>]*>', '', s)
    s = s.replace('<div class="demo">ETKİLEŞİMLİ PROTOTİP <span>·</span> SÃO PAULO, BRASIL</div>', '')
    s = s.replace('</head>', '<link rel="stylesheet" href="/bm/auth.css?v=1"></head>', 1)
    s = re.sub(r'<body data-page="[^"]*">', f'<body data-page="{body_page}">', s)
    s = re.sub(r'<main id="main">.*?</main>', '<main id="main">' + main + '</main>', s, flags=re.S)
    s = s.replace('</body>', '<script src="/bm/auth.js?v=1" defer></script></body>', 1)
    return s

LOGIN = '''<section class="bm-auth" id="bm-login">
<div class="bm-card">
  <span class="bm-kicker">Brazil Migration · Tek giriş</span>
  <h1>Hesabınıza giriş yapın</h1>
  <p class="lead">Müşteri, danışman / partner, avukat ve muhasebe ekibi aynı yerden giriş yapar. Hesabınıza göre doğru panele yönlendirilirsiniz.</p>
  <div class="bm-tabs" role="tablist"><button role="tab" data-tab="login" aria-selected="true">Giriş yap</button><button role="tab" data-tab="register" aria-selected="false">Hesap oluştur</button></div>
  <div id="bm-login-msg" class="bm-msg" role="status" aria-live="polite"></div>
  <form id="bm-login-form" class="bm-form" data-panel="login">
    <label>E-posta<input name="email" type="email" autocomplete="username" required></label>
    <label>Şifre<input name="password" type="password" autocomplete="current-password" required></label>
    <button class="bm-btn" type="submit">Giriş yap</button>
    <div class="bm-row-between"><button class="bm-link" data-goto="forgot" type="button">Şifremi unuttum / hesabımı etkinleştir</button><a class="bm-link" href="/partner-ol/">Partner olmak istiyorum</a></div>
  </form>
  <form id="bm-register" class="bm-form" data-panel="register" hidden>
    <label>Ad soyad<input name="name" autocomplete="name" required minlength="2"></label>
    <div class="row"><label>E-posta<input name="email" type="email" autocomplete="email" required></label><label>Telefon<input name="phone" type="tel" autocomplete="tel" placeholder="+90 …"></label></div>
    <div class="row"><label>Bulunduğunuz ülke<select name="country" required></select></label><label>Şehir<select name="city" required></select></label></div>
    <p class="bm-hint">Konumunuza göre size en yakın danışmanımız otomatik olarak atanır.</p>
    <div class="row"><label>Şifre<input name="password" type="password" autocomplete="new-password" required minlength="8"></label><label>Şifre (tekrar)<input name="password2" type="password" autocomplete="new-password" required minlength="8"></label></div>
    <p class="bm-hint">En az 8 karakter; harf ve rakam içermeli.</p>
    <label class="check"><input type="checkbox" name="consent" required> Kişisel verilerimin başvurum için işlenmesine ilişkin aydınlatma metnini okudum, onaylıyorum.</label>
    <button class="bm-btn" type="submit">Hesap oluştur</button>
    <p class="bm-hint">Kayıttan sonra e-posta adresinize bir doğrulama bağlantısı göndereceğiz.</p>
  </form>
  <form id="bm-forgot" class="bm-form" data-panel="forgot" hidden>
    <p class="lead" style="margin:0">E-posta adresinizi girin; şifre belirleme bağlantısı gönderelim. Danışmanınızın sizin için açtığı hesabı da buradan etkinleştirebilirsiniz.</p>
    <label>E-posta<input name="email" type="email" autocomplete="email" required></label>
    <button class="bm-btn" type="submit">Bağlantı gönder</button>
    <button class="bm-link" data-goto="login" type="button">← Girişe dön</button>
  </form>
  <form id="bm-reset" class="bm-form" data-panel="reset" hidden>
    <p class="lead" style="margin:0">Hesabınız için yeni bir şifre belirleyin.</p>
    <label>Yeni şifre<input name="password" type="password" autocomplete="new-password" required minlength="8"></label>
    <label>Yeni şifre (tekrar)<input name="password2" type="password" autocomplete="new-password" required minlength="8"></label>
    <button class="bm-btn" type="submit">Şifreyi kaydet</button>
  </form>
  <div data-panel="choose" hidden><p class="lead">Hangi panele geçmek istiyorsunuz?</p><div class="bm-accounts" id="bm-choose"></div></div>
</div>
<aside class="bm-side">
  <span class="bm-kicker">São Paulo yolculuğunuz</span>
  <h2>Tüm süreç tek panelde.</h2>
  <p>Başvurularınızı, belgelerinizi, faturalarınızı ve danışmanınızla yazışmalarınızı tek yerden takip edin.</p>
  <ol class="bm-steps">
    <li><div><strong>Hesabınızı oluşturun</strong><span>E-postanızı doğrulayın; size en yakın danışman otomatik atanır.</span></div></li>
    <li><div><strong>Hizmetinizi seçin</strong><span>Oturum izni, vatandaşlık, evlilik veya şirket kurulumu.</span></div></li>
    <li><div><strong>Belgelerinizi yükleyin</strong><span>Hizmet satın aldıktan sonra yüklediğiniz evraklar otomatik ön kontrolden geçer.</span></div></li>
  </ol>
</aside>
</section>'''

PARTNER = '''<section class="bm-auth" id="bm-partner">
<aside class="bm-side">
  <span class="bm-kicker">Partner programı</span>
  <h2>Danışmanlık şirketinizle Brezilya’ya hizmet verin.</h2>
  <p>Oturum izni, vatandaşlık, evlilik / união estável ve şirket kurulumu dosyalarında müşterilerinizi Brazil Migration altyapısıyla yönetin. Size atanan müşterileri, belgeleri, referans bağlantılarını ve komisyon kazançlarınızı tek panelden takip edin.</p>
  <ol class="bm-steps">
    <li><div><strong>Başvuru formunu doldurun</strong><span>Firma ve yetkili bilgileri, hizmet verdiğiniz bölge.</span></div></li>
    <li><div><strong>E-postanızı doğrulayın ve giriş yapın</strong><span>Danışman paneliniz açılır; onaya kadar yalnızca profilinizi düzenleyebilirsiniz.</span></div></li>
    <li><div><strong>Belgelerinizi yükleyin</strong><span>Vergi Levhası, İmza Sirküsü, Kimlik ön ve arka yüz.</span></div></li>
    <li><div><strong>Otomatik doğrulama</strong><span>Belgeler arka planda taranır; uygun bulunursa hesabınız otomatik onaylanır ve tüm modüller açılır.</span></div></li>
  </ol>
</aside>
<div class="bm-card">
  <span class="bm-kicker">Partner başvurusu</span>
  <h1>Partnerimiz olun</h1>
  <p class="lead">Zaten hesabınız var mı? <a class="bm-link" href="/giris/?next=%2Fpartner%2F">Danışman girişi</a></p>
  <div id="bm-partner-msg" class="bm-msg" role="status" aria-live="polite"></div>
  <form id="bm-partner-form" class="bm-form">
    <label>Firma unvanı<input name="company" required minlength="2" autocomplete="organization"></label>
    <div class="row"><label>Yetkili ad soyad<input name="name" required minlength="2" autocomplete="name"></label><label>Telefon<input name="phone" type="tel" required autocomplete="tel"></label></div>
    <div class="row"><label>E-posta<input name="email" type="email" required autocomplete="email"></label><label>Web sitesi (isteğe bağlı)<input name="website" type="url" placeholder="https://"></label></div>
    <div class="row"><label>Vergi dairesi<input name="taxOffice" required></label><label>Vergi no / VKN<input name="taxNumber" required inputmode="numeric" maxlength="20"></label></div>
    <div class="row"><label>Ülke<select name="country" required></select></label><label>Şehir<select name="city" required></select></label></div>
    <label>Vereceğiniz hizmetler<div class="bm-chips" data-services></div></label>
    <div class="row"><label>Şifre<input name="password" type="password" autocomplete="new-password" required minlength="8"></label><label>Şifre (tekrar)<input name="password2" type="password" autocomplete="new-password" required minlength="8"></label></div>
    <p class="bm-hint">En az 8 karakter; harf ve rakam içermeli.</p>
    <label class="check"><input type="checkbox" name="consent" required> Partnerlik koşullarını ve kişisel verilerin işlenmesine ilişkin aydınlatma metnini okudum, onaylıyorum.</label>
    <button class="bm-btn" type="submit">Başvuruyu gönder</button>
  </form>
</div>
</section>'''

import os
open('public/giris/index.html', 'w', encoding='utf-8').write(page('Giriş | Brazil Migration', 'Müşteri, danışman, avukat ve muhasebe ekibi için tek giriş.', '/giris/', 'login', LOGIN))
os.makedirs('public/partner-ol', exist_ok=True)
open('public/partner-ol/index.html', 'w', encoding='utf-8').write(page('Partner Olun | Brazil Migration', 'Danışmanlık şirketleri için Brazil Migration partner programı başvurusu.', '/partner-ol/', 'partner-apply', PARTNER))
print('ok')
