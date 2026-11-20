// Çevirili görüşme: plan bazlı aylık dakika kotası (yeni görüşme engellenir, ana firma sınırsız) ve genişletilmiş dil listesi.
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'bm-meeting-'));
process.env.LOCAL_DB_FILE = join(dir, 'main.sqlite'); process.env.LOCAL_BLOB_DIR = join(dir, 'blobs'); process.env.TENANT_DB_DIR = join(dir, 'tenants'); process.env.DEMO_SEED = 'off';
delete process.env.ANTHROPIC_API_KEY; delete process.env.RESEND_API_KEY; delete process.env.SMTP_HOST; delete process.env.ADMIN_HOST; delete process.env.PLATFORM_DOMAIN;

const R = '/home/claude/proje/Brazil-Migration/server/platform/';
const {createTenant, tenantById} = await import(R + 'tenant.mjs');
const {runWithTenant} = await import(R + 'tenant-context.mjs');
const {meetingQuota, meetMinutes, usage, limitsFor, PLAN_LIMITS} = await import(R + 'plans.mjs');
const {getMainDatabase} = await import(R + 'db.mjs');
const {TR_LANGS} = await import(R + 'translate.mjs'); const {TTS_VOICES} = await import(R + 'tts.mjs');
const {handleAuth} = await import(R + 'api.mjs');

const sess = (db, id, startMs, sec) => db.prepare("INSERT INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?)").bind(id, 'meet_session', 'c1', JSON.stringify({room: id, start: startMs, end: startMs + sec * 1000, sec}), Date.now(), Date.now()).run();
try {
  // diller: çeviri ve ses listeleri aynı kümeyi kapsar
  assert.deepEqual([...TR_LANGS].sort(), ['ar', 'de', 'en', 'es', 'fa', 'fr', 'pt', 'ru', 'tr']); assert.deepEqual(Object.keys(TTS_VOICES).sort(), [...TR_LANGS].sort());

  const t = await createTenant({name: 'Kota Göç', slug: 'kota', ownerEmail: 'o@kota.test'}); const T = await tenantById(t.id);
  assert.equal(PLAN_LIMITS.free.meetMin, 60); assert.equal(limitsFor(T).meetMin, 60);
  await runWithTenant(T, async () => {
    const db = T.db, n = Date.now(), old = n - 40 * 864e5;
    assert.deepEqual(await meetingQuota(db), {limit: 60, used: 0, exceeded: false});
    await sess(db, 'm1', n - 3600e3, 30 * 60); await sess(db, 'm0', old, 500 * 60);                 // geçen ayın görüşmesi sayılmaz
    assert.equal(await meetMinutes(db), 30); assert.equal((await usage(db)).meetMin, 30); assert.equal((await meetingQuota(db)).exceeded, false);
    await sess(db, 'm2', n - 1800e3, 30 * 60); assert.deepEqual(await meetingQuota(db), {limit: 60, used: 60, exceeded: true});
    // herkese açık uç: sınır dolunca yeni görüşme kapalı + neden
    await db.prepare("INSERT INTO items(id,kind,owner,data,created,updated) VALUES('config-meeting','config','owner',?,?,?)").bind(JSON.stringify({enabled: true}), n, n).run();
    const r = await handleAuth(new Request('http://kota.localhost/api/auth/meeting', {headers: {Host: 'kota.localhost'}}), {DB: db}, 'meeting'); const d = await r.json();
    assert.equal(d.enabled, false); assert.equal(d.reason, 'quota');
  });
  // ana firma sınırsız
  const main = getMainDatabase(); await main.ready(); await sess(main, 'mm', Date.now() - 1000, 100000 * 60); assert.deepEqual(await meetingQuota(main), {limit: null, used: null, exceeded: false});
  console.log('PASS: meeting minute quota (monthly, plan-based, blocks new calls, main unlimited) + 9 languages in translate/tts');
} finally { rmSync(dir, {recursive: true, force: true}); }
process.exit(0);
