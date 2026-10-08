import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const manifest=JSON.parse(read('manifest.json'));
const files=['index.html','sidepanel.html','app.js','desk-v03.js','desk-v04.js','desk-v05.js','styles.css','desk-v03.css','desk-v045.css','background.js','icons/icon16.png','icons/icon48.png','icons/icon128.png'];
for(const f of files) if(!fs.existsSync(new URL('../'+f,import.meta.url)))throw Error(`Missing file: ${f}`);
if(manifest.manifest_version!==3||manifest.version!=='0.5.1')throw Error('Unexpected extension version');
if(JSON.stringify(manifest.permissions)!=='["storage","sidePanel","nativeMessaging","favicon"]')throw Error('Unexpected permissions');
const expectedHosts=['https://geocoding-api.open-meteo.com/*','https://api.open-meteo.com/*'];
if(JSON.stringify(manifest.host_permissions)!==JSON.stringify(expectedHosts))throw Error('Unexpected weather API hosts');
if(JSON.stringify(manifest.optional_permissions)!=='["tabs"]')throw Error('Unexpected optional permissions');
if(JSON.stringify(manifest.optional_host_permissions)!=='["https://api.github.com/*","https://*.omnidite.com/*","http://localhost/*","http://127.0.0.1/*"]')throw Error('Unexpected optional host permissions');
if(!manifest.key||manifest.key.length<150)throw Error('Stable public key missing');
for(const p of ['index.html','sidepanel.html']){
 const html=read(p);for(const token of ['pageNav','pageHeading','grid','app.js'])if(!html.includes(token))throw Error(`${p}: missing ${token}`);
 if(/<script[^>]+src=["']https?:/.test(html))throw Error('Remote scripts prohibited');
}
for(const p of ['index.html','sidepanel.html'])if(!read(p).includes('deskInstallButton'))throw Error(p+' missing on-page updater');
for(const p of ['Setup-OneClickUpdates.bat','native-host/install.ps1','native-host/DeskNativeHost.cs'])if(!fs.existsSync(new URL('../'+p,import.meta.url)))throw Error('Missing native helper: '+p);
if(!read('native-host/DeskNativeHost.cs').includes('merge --ff-only'))throw Error('Native helper must use fast-forward-only updates');
for(const p of ['index.html','sidepanel.html'])if(!read(p).includes('desk-v04.js')||!read(p).includes('desk-v05.js')||!read(p).includes('desk-v045.css'))throw Error(p+' missing V0.4/V0.5 integration');
for(const p of ['index.html','sidepanel.html'])if(!read(p).includes('desk-v03.js')||!read(p).includes('desk-v03.css'))throw Error(p+' missing V0.3 integration');
for(const p of ['index.html','sidepanel.html'])if(!read(p).includes('wallpaperFolder'))throw Error(p+' missing wallpaper picker');
for(const token of ['renderWorldClocks','renderWeatherModule','renderFocusModule','wallpaperGallery','siteFavicon','showDirectoryPicker','connectLiveFolder','handleStore','scanConnectedFolder'])if(!read('app.js').includes(token))throw Error('Missing feature: '+token);
for(const token of ['openCommand','openProjects','openResearch','openLayouts','captureForm'])if(!read('desk-v03.js').includes(token))throw Error('Missing V0.3 feature: '+token);
for(const token of ['defaultProjects','layoutSnapshots','DeskBridge'])if(!read('app.js').includes(token))throw Error('Missing V0.3 state integration: '+token);
for(const token of ['normalizeOperations','workSessions','calendarEvents','pulseCache'])if(!read('app.js').includes(token))throw Error('Missing V0.4/V0.5 state: '+token);
for(const token of ['newSession','taskForm','contentForm','captureActiveTab','calendar','renderSearch'])if(!read('desk-v04.js').includes(token))throw Error('Missing V0.4 feature: '+token);
for(const token of ['refreshGithub','refreshPulse','pulseAllowed','normalizePulse','operationalAlerts'])if(!read('desk-v05.js').includes(token))throw Error('Missing V0.5 feature: '+token);
console.log('PASS: MV3 V0.5.1, limited required permissions, opt-in tabs and hosts, updater, productivity and read-only monitoring');