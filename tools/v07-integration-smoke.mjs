import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const app=read('app.js'),markets=read('desk-v07.js'),alerts=read('desk-v07-alerts.js'),snapshot=read('desk-v07-snapshot.js');
const manifest=JSON.parse(read('manifest.json'));
const types=['markets','fx','weatheralerts','snapshot'];
for(const type of types){
 assert.ok(app.includes("'"+type+"'"),'Missing widget type '+type);
 assert.ok(app.includes("x.type==='"+type+"'"),'Missing persisted config sanitizer for '+type);
 assert.ok(app.includes("case '"+type+"'")||app.includes("case 'markets':case 'fx'"),'Missing widget renderer for '+type);
}
assert.equal(manifest.version,'0.7.0');
assert.equal(manifest.manifest_version,3);
assert.ok(manifest.key&&manifest.key.length>350,'Stable extension public ID key must be preserved');
assert.deepEqual(manifest.permissions,['storage','sidePanel','nativeMessaging','favicon','identity']);
assert.deepEqual(manifest.host_permissions,[
 'https://geocoding-api.open-meteo.com/*','https://api.open-meteo.com/*',
 'https://air-quality-api.open-meteo.com/*','https://api-open.data.gov.sg/*',
 'https://api.frankfurter.dev/*'
]);
for(const html of ['index.html','sidepanel.html']){
 const s=read(html);
 const runtime=s.indexOf('src="desk-v07.js"'),a=s.indexOf('src="desk-v07-alerts.js"'),ss=s.indexOf('src="desk-v07-snapshot.js"'),appJs=s.indexOf('src="app.js"');
 assert.ok(runtime>0&&a>runtime&&ss>a&&appJs>ss,html+': widget adapters must be loaded before app core');
 assert.ok(s.includes('href="desk-v07.css"'),html+': missing CSS');
 assert.ok(!/<script[^>]+src=["']https?:/i.test(s),html+': remote script must not be loaded');
 assert.ok(s.includes('v0.7.0</span>'),html+': version label');
}
assert.match(markets,/Indicative regular sessions only/);
assert.match(markets,/localToUtc/);
assert.match(markets,/30000/,'Markets should not recompute timezone transitions every second');
assert.match(markets,/Reference date|Reference date/);
assert.match(alerts,/NOT OS notifications/);
assert.match(alerts,/choices=\{psi/);
assert.match(snapshot,/omnidite-google-calendar-local-v1/);
assert.match(snapshot,/Cached Google Calendar/);
assert.ok(!snapshot.includes('getAuthToken'),'Snapshot cannot request OAuth tokens');
assert.ok(!snapshot.includes('fetch(')||snapshot.includes('api.open-meteo.com'),'Snapshot network must be public weather only');
assert.ok(!app.includes('syncEnabled=true;'),'No automatic Chrome Sync opt-in');
assert.ok(read('native-host/DeskNativeHost.cs').includes('merge --ff-only'),'Updater remains fast-forward-only');
console.log('PASS: V0.7 four widget types, persistence schema, safe source order, extension identity, scoped hosts, local data and bounded market updates');
