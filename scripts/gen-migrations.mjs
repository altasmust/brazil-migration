import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
const dir=process.argv[2]||'.';const files=readdirSync(dir+'/drizzle').filter(f=>f.endsWith('.sql')).sort();
writeFileSync(dir+'/server/platform/migrations.mjs','// Generated from drizzle/*.sql — run: node scripts/gen-migrations.mjs\nexport const MIGRATIONS='+JSON.stringify(files.map(f=>[f,readFileSync(dir+'/drizzle/'+f,'utf8')]),null,1)+';\n');
console.log(files);
