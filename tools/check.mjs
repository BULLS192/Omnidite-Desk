import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const manifest=JSON.parse(read('manifest.json'));
const files=['index.html','sidepanel.html','app.js','styles.css','background.js','icons/icon16.png','icons/icon48.png','icons/icon128.png'];
for(const f of files) if(!fs.existsSync(new URL('../'+f,import.meta.url)))throw Error(`Missing file: ${f}`);
if(manifest.manifest_version!==3||manifest.version!=='0.2.1')throw Error('Unexpected extension version');
if(JSON.stringify(manifest.permissions)!=='["storage","sidePanel","nativeMessaging"]')throw Error('Unexpected permissions');
if(manifest.host_permissions)throw Error('Host permissions not expected');
if(!manifest.key||manifest.key.length<150)throw Error('Stable public key missing');
for(const p of ['index.html','sidepanel.html']){
 const html=read(p);for(const token of ['pageNav','pageHeading','grid','app.js'])if(!html.includes(token))throw Error(`${p}: missing ${token}`);
 if(/<script[^>]+src=["']https?:/.test(html))throw Error('Remote scripts prohibited');
}
for(const p of ['index.html','sidepanel.html'])if(!read(p).includes('deskInstallButton'))throw Error(p+' missing on-page updater');
for(const p of ['Setup-OneClickUpdates.bat','native-host/install.ps1','native-host/DeskNativeHost.cs'])if(!fs.existsSync(new URL('../'+p,import.meta.url)))throw Error('Missing native helper: '+p);
if(!read('native-host/DeskNativeHost.cs').includes('merge --ff-only'))throw Error('Native helper must use fast-forward-only updates');
console.log('PASS: MV3, permissions, stable ID, dashboard pages and optional safe native updater');