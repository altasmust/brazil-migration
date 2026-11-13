// Platform tests: unified login, e-mail verification, header spoofing, admin separation,
// nearest-advisor assignment, partner onboarding gate and panel modules.
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'bm-platform-'));
process.env.LOCAL_DB_FILE = join(dir, 'db.sqlite');
process.env.LOCAL_BLOB_DIR = join(dir, 'blobs');
process.env.ADMIN_SETUP_KEY = 'setup-key-123';
process.env.DEMO_SEED = 'off';
delete process.env.ANTHROPIC_API_KEY; delete process.env.RESEND_API_KEY; delete process.env.ADMIN_HOST;

const {legacy, platform} = await import('../server/platform/http.mjs');
const {handle} = await import('../server/workspace.mjs');
const {handleAdvisor} = await import('../server/advisor.mjs');
const {runPartnerVerification} = await import('../server/platform/api.mjs');
const {getEnv} = await import('../server/platform/http.mjs');

const ORIGIN = 'http://site.test';
const jars = {};
const tasks = [];
const after = fn => tasks.push(fn);
const routes = {
  auth: platform('auth'), member: platform('member', after), admin: platform('admin', after),
  workspace: legacy('workspace', (r, env) => handle(r, env), {after}), advisor: legacy('advisor', (r, env) => handleAdvisor(r, env)),
};
async function call(who, kind, path, body, method, extraHeaders = {}) {
  const prefix = {auth: '/api/auth/', member: '/api/platform/', admin: '/api/platform/admin/', workspace: '/api/workspace/', advisor: '/api/advisor/'}[kind];
  const headers = {Origin: ORIGIN, Host: 'site.test', ...extraHeaders};
  if (jars[who]) headers.Cookie = jars[who];
  let payload;
  if (body instanceof FormData) payload = body; else if (body !== undefined) { payload = JSON.stringify(body); headers['Content-Type'] = 'application/json'; }
  const req = new Request('http://site.test' + prefix + path, {method: method || (body === undefined ? 'GET' : 'POST'), headers, body: payload});
  const params = Promise.resolve({path: path.split('?')[0].split('/')});
  const res = await routes[kind](req, {params});
  const set = res.headers.get('set-cookie');
  if (set) { const [pair] = set.split(';'); const [name, value] = pair.split('='); const others = (jars[who] || '').split('; ').filter(x => x && !x.startsWith(name + '=')); jars[who] = value ? [...others, pair].join('; ') : others.join('; '); }
  const text = await res.text(); let data; try { data = JSON.parse(text); } catch { data = text; }
  return {status: res.status, data};
}
const tokenFrom = link => new URL(link).searchParams.get('dogrula') || new URL(link).searchParams.get('sifre');

try {
  assert.equal((await call('admin', 'auth', 'admin/setup', {setupKey: 'setup-key-123', password: 'AdminPassword2026'})).status, 200);
  let r = await call('admin', 'admin', 'accounts', {type: 'advisor', name: 'Ali Danışman', email: 'ali@test.com', country: 'Türkiye', city: 'İzmir'});
  const aliLink = r.data.devLink;
  assert.equal((await call('ali', 'auth', 'reset', {token: tokenFrom(aliLink), password: 'AliPass2026'})).status, 200);
  assert.equal((await call('ali', 'auth', 'login', {email: 'ali@test.com', password: 'AliPass2026'})).status, 200);

  // kayıtta hizmet talebi → Hizmetlerim'de başvuru
  r = await call('zey', 'auth', 'register', {name: 'Zeynep Kaya', email: 'zey@test.com', password: 'Zeynep2026', country: 'Türkiye', city: 'Denizli', consent: true, phone: '+90 5321234567', services: ['Oturum İzni', 'Vergi Numarası', 'Şirket Kurulum', 'Uçak Bileti'], serviceNote: 'Eşimle birlikte taşınıyoruz'});
  assert.equal(r.status, 200);
  await call('zey', 'auth', 'verify', {token: tokenFrom(r.data.devLink)});
  assert.equal((await call('zey', 'auth', 'login', {email: 'zey@test.com', password: 'Zeynep2026'})).status, 200);
  let boot = (await call('zey', 'workspace', 'bootstrap')).data;
  let apps = boot.items.filter(i => i.kind === 'application');
  assert.deepEqual(apps.map(a => a.data.service).sort(), ['Oturum İzni', 'Vergi Numarası', 'Şirket Kurulum'].sort());
  assert.equal(apps[0].data.note, 'Eşimle birlikte taşınıyoruz'); assert.equal(apps[0].data.from, 'Türkiye');
  console.log('ok: kayıtta hizmetler başvuru oldu', apps.length);

  // müşteri kendi başvuru açamaz
  assert.equal((await call('zey', 'workspace', 'applications', {service: 'Vize', from: 'Türkiye'})).status, 403);
  // personel: aynı ülke olmaz, farklı olur
  const custId = boot.member.id;
  assert.equal((await call('ali', 'workspace', 'applications', {customer: custId, service: 'Vize', from: 'Türkiye', to: 'Türkiye'})).status, 400);
  assert.equal((await call('ali', 'workspace', 'applications', {customer: custId, service: 'Vize', from: 'Türkiye', to: 'Brezilya'})).status, 200);
  assert.equal((await call('ali', 'workspace', 'applications', {customer: custId, service: 'Vize', from: 'Brezilya', to: 'Brezilya'})).status, 400);
  console.log('ok: nereden/nereye');

  // aşama düzenleme
  const app = apps.find(a => a.data.service === 'Vergi Numarası');
  const stages = [{n: 'Başvuru alındı', s: 'done'}, {n: 'Randevu alındı', s: 'doing'}, {n: 'CPF teslim', s: 'wait'}];
  assert.equal((await call('ali', 'workspace', 'application', {id: app.id, status: 'Belgeler bekleniyor', expiry: '', stages: []}, 'PATCH')).status, 400);
  assert.equal((await call('ali', 'workspace', 'application', {id: app.id, status: 'Belgeler bekleniyor', expiry: '', stages}, 'PATCH')).status, 200);
  boot = (await call('zey', 'workspace', 'bootstrap')).data;
  assert.deepEqual(boot.items.find(i => i.id === app.id).data.stages, stages);
  assert.equal((await call('zey', 'workspace', 'application', {id: app.id, status: 'Aktif'}, 'PATCH')).status, 403);
  console.log('ok: aşama düzenleme');

  // destek konuları + dosya eki
  assert.ok((await call('zey', 'workspace', 'support-topics')).data.topics.includes('Belge hakkında'));
  assert.equal((await call('admin', 'admin', 'settings/support-topics', {topics: ['Vize sorusu', 'Ödeme', 'Vize sorusu', '']})).status, 200);
  assert.deepEqual((await call('zey', 'workspace', 'support-topics')).data.topics, ['Vize sorusu', 'Ödeme']);
  assert.equal((await call('zey', 'workspace', 'support', {topic: 'Yok böyle konu', message: 'x'})).status, 400);
  const jpg = new Uint8Array([255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 0, 1, 0, 1, 0, 0]);
  const fd = new FormData(); fd.append('kind', 'attach'); fd.append('title', 'Destek eki'); fd.append('slot', '6'); fd.append('file', new File([jpg], 'ek.jpg', {type: 'image/jpeg'}));
  r = await call('zey', 'workspace', 'upload', fd); assert.equal(r.status, 200, JSON.stringify(r.data)); const fileId = r.data.id;
  assert.equal((await call('zey', 'workspace', 'support', {topic: 'Vize sorusu', subject: 'Süre', message: 'Merhaba', files: [fileId, 'sahte-id']})).status, 200);
  boot = (await call('zey', 'workspace', 'bootstrap')).data;
  const tk = boot.items.find(i => i.kind === 'ticket');
  assert.equal(tk.data.subject, 'Vize sorusu: Süre'); assert.equal(tk.data.messages[0].attachments.length, 1);
  console.log('ok: destek konusu + ek');

  // görüşme daveti
  let m = (await call('zey', 'workspace', 'meeting')).data;
  assert.equal(m.role, 'customer'); assert.equal(m.room, null); assert.match(m.code, /^BM-[0-9A-F]{8}$/);
  assert.equal((await call('zey', 'workspace', 'meet/invite', {customer: custId})).status, 403);
  r = await call('ali', 'workspace', 'meet/invite', {customer: custId}); assert.equal(r.status, 200); assert.equal(r.data.room.length, 8);
  m = (await call('zey', 'workspace', 'meeting')).data;
  assert.equal(m.room, r.data.room); assert.equal(m.invite.by, 'Ali Danışman'); assert.equal(m.name, 'Zeynep Kaya');
  r = await call('admin', 'admin', 'meet/invite', {id: custId}); assert.equal(r.status, 200); assert.ok(r.data.url.includes(r.data.room));
  m = (await call('zey', 'workspace', 'meeting')).data; assert.equal(m.invite.by, 'Brazil Migration');
  console.log('ok: görüşme daveti');
  console.log('TÜM TESTLER GEÇTİ');
} finally { rmSync(dir, {recursive: true, force: true}); }
