// Demo accounts for live testing. Created once when the database is empty for them.
// Only password hashes are stored here. Disable with DEMO_SEED=off; change the passwords after testing.
const OWNER = () => (process.env.OWNER_EMAIL || 'admin@brazilmigration.com').toLowerCase();
const ADMIN = {"salt": "9cd2ec2a05d8dfabb2742ccce6c42f67", "hash": "6412bf03470bfa92e222d628bd3d65436c4d60dfa6f18ee957a5e998291f24a8eb70ebf3b7cc1d0e262efaeb54b384a1942586d70df874901c4ef8cbabf39993"};
const CUSTOMER = {"salt": "6da33e37c71729fec31d5eef64553cdf", "hash": "3cdfa3db0aa7dd307561c4353b7a551695e0fdca16280c737283d5d1ca1736bbf0e79ce12951e9ca7d01ce3b5c12ab96e3748ad5adfbc65d05305966d9d3dad3"};
const PARTNER = {"salt": "e3e91c99635f09d1eb0b739ff7d34290", "hash": "a3cca7a835647b896c4dae0c05d5042434c312f87482785e8d881687afaf3f25ea59e91b2e1070556f11313102be5a1d4e540ddc2924f1e3a1517ef4a2da6d24"};
const PERMS = JSON.stringify({customers: 2, applications: 2, documents: 2, kyc: 2, finance: 1, support: 2, referrals: 2, team: 2, audit: 1});

// One-time: the only admin login is admin@brazilmigration.com with a new password; any older admin
// address is renamed (same user id, so data and history are kept) and all admin sessions are closed.
export async function migrateOwner(client) {
  const done = await client.execute({sql: "SELECT id FROM items WHERE id='migration-owner-v1'", args: []});
  if (done.rows.length) return;
  const now = Date.now(), NEWMAIL = 'admin@brazilmigration.com';
  const oldMails = ['fatih.altas' + '@elevandos.com'];
  let row = (await client.execute({sql: 'SELECT id FROM auth_users WHERE email=?', args: [NEWMAIL]})).rows[0];
  if (!row) {
    row = (await client.execute({sql: `SELECT id FROM auth_users WHERE email IN (${oldMails.map(() => '?').join(',')}) OR id='demo-owner' LIMIT 1`, args: oldMails})).rows[0];
    if (row) await client.execute({sql: 'UPDATE auth_users SET email=? WHERE id=?', args: [NEWMAIL, row[0]]});
    else if (process.env.DEMO_SEED !== 'off') await client.execute({sql: 'INSERT INTO auth_users VALUES(?,?,?,?,?,?,?,?)', args: ['demo-owner', NEWMAIL, ADMIN.hash, ADMIN.salt, 1, 0, 0, now]});
    row = (await client.execute({sql: 'SELECT id FROM auth_users WHERE email=?', args: [NEWMAIL]})).rows[0];
  }
  if (!row) { await client.execute({sql: "INSERT INTO items(id,kind,owner,data,created,updated) VALUES('migration-owner-v1','migration','owner','{}',?,?)", args: [now, now]}); return; }
  await client.batch([
    {sql: 'UPDATE auth_users SET hash=?, salt=?, verified=1 WHERE id=?', args: [ADMIN.hash, ADMIN.salt, row[0]]},
    {sql: "UPDATE people SET email=? WHERE role='owner'", args: [NEWMAIL]},
    {sql: "UPDATE law_accounts SET email=? WHERE role='owner'", args: [NEWMAIL]},
    {sql: "DELETE FROM auth_sessions WHERE scope='admin'", args: []},
    {sql: "INSERT INTO items(id,kind,owner,data,created,updated) VALUES('config-owner','config','owner',?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated=excluded.updated", args: [JSON.stringify({email: NEWMAIL, updated: now}), now, now]},
    {sql: "INSERT INTO items(id,kind,owner,data,created,updated) VALUES('migration-owner-v1','migration','owner','{}',?,?)", args: [now, now]},
  ], 'write');
  process.env.OWNER_EMAIL = NEWMAIL;
}

export async function seedDemo(client) {
  if (process.env.DEMO_SEED === 'off') return;
  const now = Date.now();
  const one = async (sql, args) => (await client.execute({sql, args})).rows[0];
  const owner = await one('SELECT id, hash FROM auth_users WHERE email=?', [OWNER()]);
  if (!owner) await client.execute({sql: 'INSERT INTO auth_users VALUES(?,?,?,?,?,?,?,?)', args: ['demo-owner', OWNER(), ADMIN.hash, ADMIN.salt, 1, 0, 0, now]});
  else if (!owner[1]) await client.execute({sql: 'UPDATE auth_users SET hash=?, salt=?, verified=1 WHERE email=?', args: [ADMIN.hash, ADMIN.salt, OWNER()]});
  if (await one("SELECT id FROM items WHERE id='demo-cleared'", [])) return; // admin removed demo data
  const email = 'partner@demo.bm';
  if (await one('SELECT id FROM auth_users WHERE email=?', [email])) return seedCustomer(client, one, now);
  const uid = 'demo-partner-login', pid = 'demo-partner';
  const item = (id, kind, owner, data) => ({sql: 'INSERT OR IGNORE INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?)', args: [id, kind, owner, JSON.stringify(data), now, now]});
  await client.batch([
    {sql: 'INSERT INTO auth_users VALUES(?,?,?,?,?,?,?,?)', args: [uid, email, PARTNER.hash, PARTNER.salt, 1, 0, 0, now]},
    {sql: 'INSERT OR IGNORE INTO people VALUES(?,?,?,?,?,?,?,?,?,?,?,?)', args: [pid, uid, email, 'Demo Partner', 'advisor', pid, PERMS, '"all"', 'active', null, null, now]},
    item('meta-' + pid, 'account_meta', pid, {type: 'advisor', partner: true, company: 'Demo Danışmanlık Ltd. Şti.', phone: '+90 212 000 00 00', country: 'Türkiye', city: 'İstanbul', lat: 41.01, lng: 28.98, demo: true}),
    item('profile-' + pid, 'profile', pid, {name: 'Demo Partner', company: 'Demo Danışmanlık Ltd. Şti.', taxOffice: 'Beşiktaş', taxNumber: '0000000000', address: 'İstanbul, Türkiye'}),
    item('partner-' + pid, 'partner', pid, {status: 'approved', company: 'Demo Danışmanlık Ltd. Şti.', name: 'Demo Partner', email, taxOffice: 'Beşiktaş', taxNumber: '0000000000', services: ['Oturum İzni', 'Vatandaşlık'], docs: {}, approvedBy: 'Demo kurulum', history: [{at: now, text: 'Demo hesap olarak onaylı oluşturuldu'}]}),
  ], 'write');
  await seedCustomer(client, one, now);
}

async function seedCustomer(client, one, now) {
  const email = 'musteri@demo.bm';
  if (await one('SELECT id FROM auth_users WHERE email=?', [email])) return;
  const uid = 'demo-customer-login', pid = 'demo-customer';
  const advisor = (await one("SELECT id FROM people WHERE id='demo-partner'", [])) ? 'demo-partner' : 'owner';
  const item = (id, kind, owner, data) => ({sql: 'INSERT OR IGNORE INTO items(id,kind,owner,data,created,updated) VALUES(?,?,?,?,?,?)', args: [id, kind, owner, JSON.stringify(data), now, now]});
  await client.batch([
    {sql: 'INSERT INTO auth_users VALUES(?,?,?,?,?,?,?,?)', args: [uid, email, CUSTOMER.hash, CUSTOMER.salt, 1, 0, 0, now]},
    {sql: 'INSERT OR IGNORE INTO people VALUES(?,?,?,?,?,?,?,?,?,?,?,?)', args: [pid, uid, email, 'Demo Müşteri', 'customer', 'owner', '{}', '"all"', 'active', advisor, null, now]},
    item('meta-' + pid, 'account_meta', pid, {type: 'customer', phone: '+90 555 000 00 00', country: 'Türkiye', city: 'İstanbul', lat: 41.01, lng: 28.98, assignedBy: 'Demo kurulum', demo: true}),
    item('profile-' + pid, 'profile', pid, {name: 'Demo Müşteri', phone: '+90 555 000 00 00', address: 'İstanbul, Türkiye'}),
  ], 'write');
}
