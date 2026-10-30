from html import escape as e
from pathlib import Path
import json,math
from content import PAGES

def enhanced_header():
 groups=[('Oturum & yaşam',[(p['name'],'/'+p['slug']+'/',p['lead']) for p in PAGES[:3]]),('İş & vatandaşlık',[(p['name'],'/'+p['slug']+'/',p['lead']) for p in PAGES[3:]]),('Rehber & araçlar',[('Ön değerlendirme','/degerlendirme/','Size özel sorularla hazırlık durumunuzu keşfedin.'),('Mevzuat rehberi','/kaynaklar/','Resmî kaynakları ve açıklamaları inceleyin.')]),('Kurumsal',[('Yaklaşımımız','/#yaklasim','São Paulo odaklı danışmanlık yaklaşımı.'),('Dünyadan Brezilya’ya','/#dunya-haritasi','12 ülkeyi etkileşimli haritada keşfedin.'),('İletişim','/iletisim/','15 dakikalık ücretsiz ön görüşmeyle başlayın.')])]
 h='<a class="skip" href="#main">İçeriğe geç</a><div class="demo">ETKİLEŞİMLİ PROTOTİP <span>·</span> SÃO PAULO, BRASIL</div><header class="new-header"><a class="brand brand-logo" href="/" aria-label="Brazil Migration ana sayfa"><img src="/brazil-migration-logo.png" alt="Brazil Migration" width="2048" height="683"></a><nav class="mega-nav" aria-label="Ana menü">'
 for i,(name,links) in enumerate(groups):
  h+=f'<details class="nav-group"><summary>{name} <span>⌄</span></summary><div class="mega-panel"><div class="mega-intro"><span class="kicker">BRASIL · SÃO PAULO</span><h2>{name}</h2><p>Yeni başlangıcınız için<br>doğru adımı keşfedin.</p><a href="/iletisim/">Görüşme planla ↗</a></div><div class="mega-links">'+''.join(f'<a href="{url}"><strong>{e(t)} <span>↗</span></strong><small>{e(d)}</small></a>' for t,url,d in links)+'</div></div></details>'
 h+='</nav><div class="nav-right"><a class="contact-link" href="/iletisim/">İletişim ↗</a><a class="login-link" href="/giris/">Giriş ↗</a><button type="button" class="theme-toggle" aria-label="Koyu moda geç" aria-pressed="false" onclick="toggleTheme()"><span class="theme-icon" aria-hidden="true">☾</span><span class="theme-label">Koyu</span></button><span class="language">TR</span><button class="menu-toggle" aria-expanded="false" aria-controls="full-menu" onclick="toggleFullMenu(this)" aria-label="Menüyü aç"><span aria-hidden="true">☰</span></button></div></header><div id="full-menu" class="full-menu" hidden><div class="full-menu-top"><span class="kicker">SİZİN YOLUNUZ, SİZİN GELECEĞİNİZ</span><button onclick="toggleFullMenu()" aria-label="Menüyü kapat">Kapat ×</button></div><div class="full-menu-grid">'
 for name,links in groups:h+='<section><h2>'+name+'</h2>'+''.join(f'<a href="{url}">{e(t)} <span>↗</span></a>' for t,url,d in links)+'</section>'
 return h+'</div><div class="full-menu-bottom"><span>São Paulo’da yeni bir başlangıç.</span><button class="btn" onclick="toggleFullMenu();book()">15 Dakikalık Ücretsiz Ön Görüşme ↗</button></div></div>'

CITIES=[('Brezilya', -46.63, -23.55), ('Türkiye', 28.98, 41.01), ('Azerbaycan', 49.87, 40.41), ('Kuzey Makedonya', 21.43, 42.0), ('Rusya', 37.62, 55.75), ('İspanya', -3.7, 40.42), ('İran', 51.39, 35.69), ('Suudi Arabistan', 46.68, 24.71), ('Türkmenistan', 58.38, 37.96), ('Özbekistan', 69.24, 41.3), ('Kırgızistan', 74.57, 42.87), ('Endonezya', 106.85, -6.21)]
def project(lon,lat):return (lon+180)*1200/360,(83-lat)*600/145
def inside(x,y,ring):
 c=False;j=len(ring)-1
 for i in range(len(ring)):
  xi,yi=ring[i];xj,yj=ring[j]
  if (yi>y)!=(yj>y) and x<(xj-xi)*(y-yi)/(yj-yi)+xi:c=not c
  j=i
 return c

def map_section():
 root=Path(__file__).parent;features=json.loads((root/'assets/land.json').read_text())['features'];polys=[]
 for f in features:
  for poly in ([f['geometry']['coordinates']] if f['geometry']['type']=='Polygon' else f['geometry']['coordinates']):
   ring=poly[0];polys.append((min(p[0] for p in ring),min(p[1] for p in ring),max(p[0] for p in ring),max(p[1] for p in ring),ring))
 dots=[]
 for row in range(112):
  lat=78-row*1.25
  for col in range(260):
   lon=-178+col*1.38+(row%2)*.69
   if any(a<=lon<=c and b<=lat<=d and inside(lon,lat,r) for a,b,c,d,r in polys):
    x,y=project(lon,lat);dots.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="1.35"/>')
 sx,sy=project(-46.63,-23.55)
 svg='<svg viewBox="370 65 710 440" role="img" aria-label="Brezilya merkezli 12 ülkenin etkileşimli haritası"><defs><radialGradient id="map-glow"><stop stop-color="#b7e88f" stop-opacity=".3"/><stop offset="1" stop-color="#75d6a4" stop-opacity="0"/></radialGradient><radialGradient id="pointer-glow"><stop stop-color="#e3fabb" stop-opacity=".24"/><stop offset="1" stop-color="#a7d584" stop-opacity="0"/></radialGradient><filter id="light-glow"><feGaussianBlur stdDeviation="1.5"/></filter></defs><g class="land-dots">'+''.join(dots)+'</g>'
 svg+=f'<circle cx="{sx}" cy="{sy}" r="70" fill="url(#map-glow)"/>'
 # Independent light particles continuously travel towards the Brazil hub.
 routes='';pins=''
 offsets=[(-8,-14),(5,-13),(-8,-20),(7,-9),(-8,16),(6,15),(7,14),(-12,15),(5,15),(0,-20),(8,-10),(7,15)]
 for i,(name,lon,lat) in enumerate(CITIES):
  x,y=project(lon,lat);mx=(x+sx)/2;my=min(y,sy)-abs(x-sx)*.2-16
  d=f'M{x:.2f},{y:.2f} Q{mx:.2f},{my:.2f} {sx:.2f},{sy:.2f}'
  if i:
   routes+=f'<path class="map-route" data-route="{i}" d="{d}"/>'
   for j in range(2):
    routes+=f'<g class="route-spark"><circle r="3" fill="#b7e89b" opacity=".3" filter="url(#light-glow)"/><circle r="1.25" fill="#efffd9"/><animateMotion dur="{4+i*.23:.2f}s" begin="{-i*.43-j*2.4:.2f}s" repeatCount="indefinite" path="{d}"/></g>'
  dx,dy=offsets[i];anchor='end' if dx<0 else 'start'
  pins+=f'<g class="map-city" tabindex="0" role="button" aria-label="{name} bilgilerini göster" data-city="{i}"><circle class="city-hit" cx="{x}" cy="{y}" r="9"/><circle class="country-ring" cx="{x}" cy="{y}" r="5" style="animation-delay:{-i*.4}s"/><circle class="city-dot" cx="{x}" cy="{y}" r="2"/><text x="{x+dx}" y="{y+dy}" text-anchor="{anchor}" class="city-name">{name.upper()}</text></g>'
 svg+=f'<path class="map-cone" d="M{sx-5},{sy+5} L890,245 L1010,370 L{sx+5},{sy-5}Z"/><circle class="map-spotlight" cx="{sx}" cy="{sy}" r="65" fill="url(#pointer-glow)"/>'+routes+f'<g class="destination"><circle class="hub-ring" cx="{sx}" cy="{sy}" r="5"/><circle class="hub-ring delayed" cx="{sx}" cy="{sy}" r="5"/></g>'+pins+'</svg>'
 inset='<aside class="map-lens" aria-label="Seçilen ülke ayrıntıları"><svg class="lens-heading-arc" viewBox="0 0 330 330" aria-label="Brezilya · 12 ülke" role="img"><defs><path id="lens-title-arc" d="M 29,165 A 136,136 0 0,1 301,165"/></defs><text><textPath href="#lens-title-arc" startOffset="50%" text-anchor="middle">BREZİLYA · 12 ÜLKE</textPath></text></svg><div class="lens-map" id="lens-map" aria-hidden="true"></div><div class="lens-info"><span id="lens-country">BREZİLYA</span><h3 id="lens-city">São Paulo</h3><p id="lens-time"></p><p id="lens-description">Çevrim içi ön görüşme</p><a class="btn lime" href="/iletisim/">Görüşme planlayın ↗</a><a class="lens-link" href="/iletisim/">İletişim bilgileri</a></div></aside><button class="map-reset" type="button" onclick="resetMapZoom()">Brezilya merkezine dön ↺</button>'
 strip='<div class="country-strip" aria-label="Ülkeler">'+''.join(f'<button type="button" data-country-button="{i}" onclick="activateCity({i},true)"><span>{n}</span><small data-clock="{i}"></small></button>' for i,(n,l,a) in enumerate(CITIES))+'</div>'
 return '<section class="world-section" id="dunya-haritasi"><div class="wrap"><span class="stack-label">SINIRLARIN ÖTESİNDE</span><h2>Dünyadan Brezilya’ya.<br><span>Birbirimize daha yakınız.</span></h2><p>Ülkenin üzerine gelin, haritada yakınlaşın.<br>15 dakikalık ücretsiz ön görüşmeyle São Paulo planınızı birlikte konuşalım.</p><div class="world-stage" id="world-stage"><div class="map-perspective">'+svg+'</div>'+inset+'</div>'+strip+'<div class="map-bottom"><div class="map-readout" aria-live="polite"><span id="map-origin">BREZİLYA · SÃO PAULO</span><strong id="map-distance"></strong><small>Mesafeler temsilî şehir noktaları arasında kuş uçuşudur.</small></div><div class="map-selector"><label for="origin-city">Ülkenizi seçin</label><select id="origin-city">'+''.join(f'<option value="{i}">{n}</option>' for i,(n,l,a) in enumerate(CITIES))+'</select></div><a class="btn lime" href="/iletisim/">15 Dakikalık Ücretsiz Ön Görüşme ↗</a></div><p class="map-note">Brezilya merkezli coğrafi gösterimdir; bu ülkelerde fiziksel ofis veya müşteri ağı bulunduğu anlamına gelmez.</p></div></section>'

