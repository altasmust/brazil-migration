// Demo accounts for live testing. Created once when the database is empty for them.
// Only password hashes are stored here. Disable with DEMO_SEED=off; change the passwords after testing.
const OWNER = () => (process.env.OWNER_EMAIL || 'fatih.altas@elevandos.com').toLowerCase();
const ADMIN = {"salt": "d4567272fddc3782c22cd22c80ddcedf", "hash": "68711b0d9bf01356492c12f749f65ea3141ddfd174b986ace4e0d34cca43be34772a22abd7ce1e281e96583fc46b14f1d3023949d3f9cd2ba9931bbea85bc21e"};
const PARTNER = {"salt": "e3e91c99635f09d1eb0b739ff7d34290", "hash": "a3cca7a835647b896c4dae0c05d5042434c312f87482785e8d881687afaf3f25ea59e91b2e1070556f11313102be5a1d4e540ddc2924f1e3a1517ef4a2da6d24"};
const PERMS = JSON.stringify({customers: 2, applications: 2, documents: 2, kyc: 2, finance: 1, support: 2, referrals: 2, team: 2, audit: 1});

export async function seedDemo(client) {
  if (process.env.DEMO_SEED === 'off') return;
  const now = Date.now();
  const one = async (sql, args) => (await client.execute({sql, args})).rows[0];
  const owner = await one('SELECT id, hash FROM auth_users WHERE email=?', [OWNER()]);
  if (!owner) await client.execute({sql: 'INSERT INTO auth_users VALUES(?,?,?,?,?,?,?,?)', args: ['demo-owner', OWNER(), ADMIN.hash, ADMIN.salt, 1, 0, 0, now]});
  else if (!owner[1]) await client.execute({sql: 'UPDATE auth_users SET hash=?, salt=?, verified=1 WHERE email=?', args: [ADMIN.hash, ADMIN.salt, OWNER()]});
  const email = 'partner@demo.bm';
  if (await one('SELECT id FROM auth_users WHERE email=?', [email])) return;
  const uid = 'demo-partner-login', pid = 'demo-partner';
  const item = (id, kind, owner, data) => ({sql: 'INSERT OR IGNORE INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?)', args: [id, kind, owner, JSON.stringify(data), now, now]});
  await client.batch([
    {sql: 'INSERT INTO auth_users VALUES(?,?,?,?,?,?,?,?)', args: [uid, email, PARTNER.hash, PARTNER.salt, 1, 0, 0, now]},
    {sql: 'INSERT OR IGNORE INTO people VALUES(?,?,?,?,?,?,?,?,?,?,?,?)', args: [pid, uid, email, 'Demo Partner', 'advisor', pid, PERMS, '"all"', 'active', null, null, now]},
    item('meta-' + pid, 'account_meta', pid, {type: 'advisor', partner: true, company: 'Demo Danışmanlık Ltd. Şti.', phone: '+90 212 000 00 00', country: 'Türkiye', city: 'İstanbul', lat: 41.01, lng: 28.98, demo: true}),
    item('profile-' + pid, 'profile', pid, {name: 'Demo Partner', company: 'Demo Danışmanlık Ltd. Şti.', taxOffice: 'Beşiktaş', taxNumber: '0000000000', address: 'İstanbul, Türkiye'}),
    item('partner-' + pid, 'partner', pid, {status: 'approved', company: 'Demo Danışmanlık Ltd. Şti.', name: 'Demo Partner', email, taxOffice: 'Beşiktaş', taxNumber: '0000000000', services: ['Oturum İzni', 'Vatandaşlık'], docs: {}, approvedBy: 'Demo kurulum', history: [{at: now, text: 'Demo hesap olarak onaylı oluşturuldu'}]}),
  ], 'write');
}
