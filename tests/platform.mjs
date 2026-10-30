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
  // header spoofing must not authenticate
  assert.equal((await call('x', 'workspace', 'bootstrap', undefined, 'GET', {'oai-authenticated-user-id': 'owner', 'oai-authenticated-user-email': 'fatih.altas@elevandos.com'})).status, 401);

  // admin first setup + admin-only login
  assert.equal((await call('admin', 'auth', 'admin/setup', {setupKey: 'wrong', password: 'AdminPassword2026'})).status, 403);
  assert.equal((await call('admin', 'auth', 'admin/setup', {setupKey: 'setup-key-123', password: 'AdminPassword2026'})).status, 200);
  assert.equal((await call('admin', 'auth', 'admin/setup', {setupKey: 'setup-key-123', password: 'AdminPassword2026'})).status, 409);
  assert.equal((await call('site-owner', 'auth', 'login', {email: 'fatih.altas@elevandos.com', password: 'AdminPassword2026'})).status, 403);
  assert.equal((await call('admin', 'admin', 'meta')).status, 200);

  // admin creates an advisor in İzmir and an accountant
  let r = await call('admin', 'admin', 'accounts', {type: 'advisor', name: 'Ali Danışman', email: 'ali@test.com', country: 'Türkiye', city: 'İzmir'});
  assert.equal(r.status, 200); const aliLink = r.data.devLink; assert.ok(aliLink);
  r = await call('admin', 'admin', 'accounts', {type: 'advisor', name: 'Selin Danışman', email: 'selin@test.com', country: 'Türkiye', city: 'Trabzon'});
  assert.equal(r.status, 200);
  r = await call('admin', 'admin', 'accounts', {type: 'accountant', name: 'Muhasebe', email: 'muh@test.com', country: 'Türkiye', city: 'İstanbul'});
  assert.equal(r.status, 200); const muhLink = r.data.devLink;
  assert.equal((await call('admin', 'admin', 'accounts', {type: 'advisor', name: 'Dup', email: 'ali@test.com'})).status, 409);

  // customer registers from Denizli -> nearest advisor is Ali (İzmir), not Selin (Trabzon)
  r = await call('zey', 'auth', 'register', {name: 'Zeynep', email: 'zey@test.com', password: 'Zeynep2026', country: 'Türkiye', city: 'Denizli', consent: true});
  assert.equal(r.status, 200); assert.ok(r.data.devLink);
  assert.equal((await call('zey', 'auth', 'login', {email: 'zey@test.com', password: 'Zeynep2026'})).status, 403); // not verified
  assert.equal((await call('zey', 'auth', 'verify', {token: tokenFrom(r.data.devLink)})).status, 200);
  assert.equal((await call('zey', 'auth', 'verify', {token: tokenFrom(r.data.devLink)})).status, 400); // single use
  assert.equal((await call('zey', 'auth', 'login', {email: 'zey@test.com', password: 'wrong-pass1'})).status, 401);
  r = await call('zey', 'auth', 'login', {email: 'zey@test.com', password: 'Zeynep2026'});
  assert.equal(r.status, 200); assert.equal(r.data.home, '/panel/');
  r = await call('zey', 'workspace', 'bootstrap');
  assert.equal(r.status, 200); assert.equal(r.data.member.role, 'customer');
  const accounts = (await call('admin', 'admin', 'accounts')).data.accounts;
  const ali = accounts.find(a => a.email === 'ali@test.com'), zey = accounts.find(a => a.email === 'zey@test.com');
  assert.equal(zey.advisor, ali.id);
  // site session cannot reach admin APIs
  assert.equal((await call('zey', 'admin', 'accounts')).status, 401);

  // advisor activates via invite link and sees the customer; accountant (head office) also sees it
  assert.equal((await call('ali', 'auth', 'reset', {token: tokenFrom(aliLink), password: 'AliPass2026'})).status, 200);
  assert.equal((await call('ali', 'auth', 'login', {email: 'ali@test.com', password: 'AliPass2026'})).data.home, '/partner/');
  assert.ok((await call('ali', 'workspace', 'bootstrap')).data.customers.some(c => c.email === 'zey@test.com'));
  await call('muh', 'auth', 'reset', {token: tokenFrom(muhLink), password: 'Muhasebe2026'});
  assert.equal((await call('muh', 'auth', 'login', {email: 'muh@test.com', password: 'Muhasebe2026'})).status, 200);
  assert.ok((await call('muh', 'workspace', 'bootstrap')).data.customers.some(c => c.email === 'zey@test.com'));

  // partner application -> limited access -> documents -> review -> admin approval
  r = await call('p', 'auth', 'partner-register', {company: 'Örnek Ltd', name: 'Burak', email: 'burak@test.com', password: 'Burak2026x', country: 'Türkiye', city: 'Ankara', taxOffice: 'Kadıköy', taxNumber: '1234567890', services: ['Oturum İzni'], consent: true});
  assert.equal(r.status, 200);
  await call('p', 'auth', 'verify', {token: tokenFrom(r.data.devLink)});
  assert.equal((await call('p', 'auth', 'login', {email: 'burak@test.com', password: 'Burak2026x'})).status, 200);
  assert.equal((await call('p', 'member', 'partner')).data.partner.status, 'docs_required');
  assert.equal((await call('p', 'workspace', 'bootstrap')).status, 200);
  assert.equal((await call('p', 'workspace', 'profile', {name: 'Burak Y'})).status, 200);
  assert.equal((await call('p', 'advisor', 'cases')).status, 403);
  assert.equal((await call('p', 'workspace', 'referrals', {name: 'x'})).status, 403);
  const jpg = new Uint8Array([255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 0, 1]);
  for (const doc of ['vergi', 'sirku', 'kimlik_on', 'kimlik_arka']) {
    const fd = new FormData(); fd.append('doc', doc); fd.append('file', new File([jpg], doc + '.jpg', {type: 'image/jpeg'}));
    assert.equal((await call('p', 'member', 'partner/upload', fd)).status, 200);
  }
  const bad = new FormData(); bad.append('doc', 'vergi'); bad.append('file', new File([new Uint8Array([1, 2, 3, 4, 5, 6])], 'x.exe'));
  assert.equal((await call('p', 'member', 'partner/upload', bad)).status, 400); // not a PDF/JPG/PNG
  for (const t of tasks.splice(0)) await t();
  assert.equal((await call('p', 'member', 'partner')).data.partner.status, 'review'); // no AI key -> admin review
  assert.equal((await call('p', 'advisor', 'cases')).status, 403);
  const pid = (await call('admin', 'admin', 'partners')).data.partners[0].id;
  assert.equal((await call('admin', 'admin', 'partners/review', {id: pid, decision: 'reject'})).status, 400); // reason required
  assert.equal((await call('admin', 'admin', 'partners/review', {id: pid, decision: 'approve'})).status, 200);
  assert.equal((await call('p', 'advisor', 'cases')).status, 200);
  assert.equal((await call('p', 'member', 'partner')).data.partner.status, 'approved');

  // modules
  assert.equal((await call('admin', 'admin', 'modules', {title: 'Duyurular', type: 'content', content: 'Merhaba', panels: ['customer']})).status, 200);
  assert.equal((await call('admin', 'admin', 'modules', {title: 'Kötü', type: 'link', url: 'javascript:alert(1)', panels: ['customer']})).status, 400);
  assert.equal((await call('admin', 'admin', 'builtins', {customer: {hidden: ['Destek']}})).status, 200);
  r = await call('zey', 'member', 'modules?panel=customer');
  assert.equal(r.data.modules[0].title, 'Duyurular'); assert.deepEqual(r.data.hidden, ['Destek']);
  assert.equal((await call('zey', 'member', 'modules?panel=partner')).data.modules.length, 0);

  // customer documents: no verification before a purchase, automatic check after one
  const upload = async () => { const fd = new FormData(); fd.append('kind', 'document'); fd.append('slot', '0'); fd.append('title', 'Pasaport'); fd.append('file', new File([jpg], 'p.jpg', {type: 'image/jpeg'})); return call('zey', 'workspace', 'upload', fd); };
  let up = await upload(); assert.equal(up.status, 200); for (const t of tasks.splice(0)) await t();
  let docs = (await call('zey', 'workspace', 'bootstrap')).data.items.filter(i => i.kind === 'document');
  assert.equal(docs[0].data.autoCheck, undefined); assert.equal(docs[0].data.status, 'Yüklendi');
  assert.equal((await call('zey', 'workspace', 'applications', {service: 'Oturum İzni', from: 'Türkiye'})).status, 200);
  up = await upload(); assert.equal(up.status, 200); for (const t of tasks.splice(0)) await t();
  docs = (await call('zey', 'workspace', 'bootstrap')).data.items.filter(i => i.kind === 'document' && i.id === up.data.id);
  assert.ok(docs[0].data.autoCheck); assert.equal(docs[0].data.status, 'İncelemede');

  // logout ends the session
  await call('zey', 'auth', 'logout', {});
  assert.equal((await call('zey', 'workspace', 'bootstrap')).status, 401);

  // admin host separation
  process.env.ADMIN_HOST = 'admin.test';
  assert.equal((await call('admin', 'admin', 'meta')).status, 404); // admin API on the main host
  delete process.env.ADMIN_HOST;

  // forgot password for an advisor-created customer activates the account
  const env = getEnv();
  await env.DB.prepare("INSERT INTO people VALUES('inv1',NULL,'yeni@test.com','Yeni','customer','owner','{}','\"all\"','invited','owner',NULL,?)").bind(Date.now()).run();
  r = await call('n', 'auth', 'forgot', {email: 'yeni@test.com'});
  assert.ok(r.data.devLink);
  await call('n', 'auth', 'reset', {token: tokenFrom(r.data.devLink), password: 'YeniSifre1'});
  assert.equal((await call('n', 'auth', 'login', {email: 'yeni@test.com', password: 'YeniSifre1'})).data.home, '/panel/');
  void runPartnerVerification;
  console.log('PASS: unified login, verification, single-use tokens, header spoofing, owner/admin separation, nearest advisor, head-office staff, partner gate + review, modules, logout, account activation.');
} finally {
  rmSync(dir, {recursive: true, force: true});
}
