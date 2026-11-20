#!/usr/bin/env python3
"""Yönetim paneli duman testi (isteğe bağlı; `npm test` içinde DEĞİL). Tarayıcıda tüm yönetim sayfalarını gezer ve
sayfa hatası, 4xx/5xx yanıtı, "Yükleniyor…"da takılma veya hata kutusu görürse başarısız olur.
HTTP testlerinin yakalayamadığı arayüz hatalarını (örn. iki sayfanın aynı #adresi kullanması) yakalamak için yazıldı.

Kullanım (yerel sunucu açıkken; Playwright kurulu olmalı):
  BM_BASE=http://localhost:3055 BM_ADMIN_EMAIL=admin@... BM_ADMIN_PASSWORD=... python3 tests/ui-smoke.py
Parola dosyaya yazılmaz; ortam değişkeninden okunur. Yeni bir yönetim sayfası eklenince ROUTES listesine ekleyin."""
import asyncio, os, sys
from playwright.async_api import async_playwright

BASE = os.environ.get('BM_BASE', 'http://localhost:3000').rstrip('/')
EMAIL, PASSWORD = os.environ.get('BM_ADMIN_EMAIL', ''), os.environ.get('BM_ADMIN_PASSWORD', '')
ROUTES = ['gelenkutusu', 'mesajsablonlari', 'aiasistan', 'gizlilik', 'guvenlik', 'raporlar', 'api', 'firma-dizini', 'adaylar', 'teklifler', 'sozlesmeler',
          'odemeplani', 'dosyapano', 'gorevpano', 'sureler', 'sablonlar', 'ag', 'yonlendirmeler']

async def main():
    if not EMAIL or not PASSWORD: sys.exit('BM_ADMIN_EMAIL ve BM_ADMIN_PASSWORD ortam değişkenlerini verin.')
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await (await b.new_context(viewport={'width': 1280, 'height': 900})).new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)[:160]))
        pg.on('response', lambda r: errs.append(f'HTTP {r.status} {r.url[:110]}') if r.status >= 400 and 'font' not in r.url else None)
        await pg.goto(BASE + '/admin/giris/', wait_until='domcontentloaded')
        await pg.fill('input[type=email]', EMAIL); await pg.fill('input[type=password]', PASSWORD); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(3000)
        await pg.goto(BASE + '/admin/', wait_until='networkidle'); await pg.wait_for_timeout(1500)
        bad, seen = 0, {}
        for r in ROUTES:
            errs.clear(); await pg.evaluate(f"location.hash = '#{r}'"); await pg.wait_for_timeout(2200)
            info = await pg.evaluate('''() => { const t = (document.querySelector('main') || document.body).innerText; return {h: (document.querySelector('h1')?.innerText || '').slice(0, 40), loading: /Yükleniyor/.test(t), err: [...document.querySelectorAll('.bmc-err')].map(e => e.innerText.slice(0, 120)), len: t.length}; }''')
            ok = not info['loading'] and not info['err'] and not errs and info['len'] > 80 and info['h'] not in seen   # iki rota aynı sayfayı açıyorsa başlık tekrar eder
            seen[info['h']] = r; bad += (not ok)
            print(('OK  ' if ok else 'FAIL'), r.ljust(16), info['h'].ljust(26), info['err'] or '', errs[:3] or '')
        await b.close(); sys.exit(1 if bad else 0)

asyncio.run(main())
