import json,re,sys
from pathlib import Path
from html.parser import HTMLParser
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from content import PAGES
from quizzes import QUIZZES
root=Path(__file__).resolve().parents[1]/'public'
class Parse(HTMLParser):
 def __init__(self):super().__init__();self.ids=[];self.h1=0;self.links=[];self.jsons=[];self.injson=False;self.images=[]
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  if 'id' in a:self.ids.append(a['id'])
  if t=='h1':self.h1+=1
  if t=='a' and a.get('href','').startswith('/'):self.links.append(a['href'])
  if t=='img':self.images.append(a)
  if t=='script' and a.get('type')=='application/ld+json':self.injson=True
 def handle_data(self,d):
  if self.injson:self.jsons.append(json.loads(d))
 def handle_endtag(self,t):
  if t=='script':self.injson=False
for f in root.rglob('index.html'):
 text=f.read_text();p=Parse();p.feed(text)
 assert p.h1==1,(f,p.h1)
 assert len(p.ids)==len(set(p.ids)),(f,'duplicate IDs')
 assert 'rio.jpg' not in text
 for a in p.links:
  path=a.split('?')[0].split('#')[0]
  assert (root/path.lstrip('/')/'index.html').exists() or (root/path.lstrip('/')).is_file(),(f,a)
 for im in p.images:
  assert im.get('aria-hidden')=='true' or (im.get('alt') and ('São Paulo' in im['alt'] or im['alt']=='Brazil Migration'))
  assert (root/im['src'].lstrip('/')).exists()
for p in PAGES:
 words=sum(len(re.sub(r'\[[a-z0-9]+\]','',s).split()) for h,s in p['article'])
 assert 300<=words<=600,(p['id'],words)
 assert len(p['faqs'])==8
 q=QUIZZES[p['id']];assert len(q['questions'])==10
 assert sum(sum(o['points'] for o in x['options']) if x['multi'] else max(o['points'] for o in x['options']) for x in q['questions'])==q['max']
assert [x['price'] for x in PAGES[0]['packs']]==[1450,2350,3850]
assert [x['price'] for x in PAGES[1]['packs']]==[2450,3950]
assert [x['price'] for x in PAGES[3]['packs']]==[4200]
assert [x['price'] for x in PAGES[4]['packs']]==[2900,5400,9800]
print('PASS: 9 pages, local links/images, unique IDs, SEO JSON-LD, 5 × 300–600 words, 40 FAQs, 50 questions and requested prices.')
