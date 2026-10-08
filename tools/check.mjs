import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const manifest=JSON.parse(read('manifest.json'));
const files=['index.html','sidepanel.html','app.js','desk-v03.js','desk-v04.js','desk-v05.js','desk-v052.js','desk-google-calendar.js','styles.css','desk-v03.css','desk-v045.css','desk-v055.css','desk-v055.js','desk-focus-audio.js','background.js','icons/icon16.png','icons/icon48.png','icons/icon128.png'];
for(const f of files) if(!fs.existsSync(new URL('../'+f,import.meta.url)))throw Error(`Missing file: ${f}`);
if(manifest.manifest_version!==3||manifest.version!=='0.5.5')throw Error('Unexpected extension version');
if(JSON.stringify(manifest.permissions)!=='["storage","sidePanel","nativeMessaging","favicon","identity"]')throw Error('Unexpected permissions');
const expectedHosts=['https://geocoding-api.open-meteo.com/*','https://api.open-meteo.com/*'];
if(JSON.stringify(manifest.host_permissions)!==JSON.stringify(expectedHosts))throw Error('Unexpected weather API hosts');
if(JSON.stringify(manifest.optional_permissions)!=='["tabs"]')throw Error('Unexpected optional permissions');
if(JSON.stringify(manifest.optional_host_permissions)!=='["https://api.github.com/*","https://*.omnidite.com/*","http://localhost/*","http://127.0.0.1/*","https://www.googleapis.com/*"]')throw Error('Unexpected optional host permissions');
if(JSON.stringify(manifest.oauth2?.scopes)!=='["https://www.googleapis.com/auth/calendar.readonly"]')throw Error('Google Calendar requires strictly read-only OAuth scope');
if(!/^\d{8,}-[a-z0-9_-]+\.apps\.googleusercontent\.com$/i.test(manifest.oauth2?.client_id||''))throw Error('Missing valid Chrome Extension OAuth client ID');
if(manifest.oauth2.client_id.includes('YOUR_GOOGLE_CLIENT_ID'))throw Error('Google OAuth placeholder must be replaced before release');
if(!manifest.key||manifest.key.length<150)throw Error('Stable public key missing');
for(const p of ['index.html','sidepanel.html']){
 const html=read(p);for(const token of ['pageNav','pageHeading','grid','app.js'])if(!html.includes(token))throw Error(`${p}: missing ${token}`);
 if(/<script[^>]+src=["']https?:/.test(html))throw Error('Remote scripts prohibited');
}
for(const p of ['index.html','sidepanel.html'])if(!read(p).includes('deskInstallButton'))throw Error(p+' missing on-page updater');
for(const p of ['Setup-OneClickUpdates.bat','native-host/install.ps1','native-host/DeskNativeHost.cs'])if(!fs.existsSync(new URL('../'+p,import.meta.url)))throw Error('Missing native helper: '+p);
for(const command of ['pulseStatus','pulseStart','pulseStop','pulseRestart','PulseTaskName'])if(!read('native-host/DeskNativeHost.cs').includes(command))throw Error('Missing fixed Pulse control: '+command);
if(!read('native-host/DeskNativeHost.cs').includes('merge --ff-only'))throw Error('Native helper must use fast-forward-only updates');
for(const p of ['index.html','sidepanel.html'])if(!read(p).includes('desk-v055.css')||!read(p).includes('desk-v055.js')||!read(p).includes('desk-focus-audio.js'))throw Error(p+' missing visual preview or local Focus sound module');

for(const p of ['index.html','sidepanel.html']){
 const html=read(p);
 for(const id of ['deskNextMeeting','deskNextMeetingTime','deskV05GitHub','deskV05Pulse','deskV05Alerts','deskV052Status','deskV05Badge','deskUpdateBar','deskCheckButton','deskInstallButton','grid','searchForm']){
  if((html.match(new RegExp('id="'+id+'"','g'))||[]).length!==1)throw Error(p+': expected exactly one '+id);
 }
 if(!html.includes('<details class="desk-tools-more">')||!html.includes('data-v03="research"')||!html.includes('data-v04="tasks"'))throw Error(p+': utility disclosure lost existing actions');
 const glance=html.indexOf('<section class="desk-ops-strip"'),updater=html.indexOf('<section id="deskUpdateBar"'),modules=html.indexOf('id="grid"');
 if(!(glance>0&&updater>glance&&modules>updater))throw Error(p+': dashboard hierarchy order regression');
}
const designCss=read('desk-v055.css');
for(const token of ['[data-theme="slate"]','[data-theme="light"]','body.has-wallpaper','body.side-mode','prefers-reduced-motion','.desk-ops-tile--calendar','.desk-tools-more'])
 if(!designCss.includes(token))throw Error('Design preview missing responsive/theme support: '+token);

for(const p of ['index.html','sidepanel.html'])if(!read(p).includes('desk-google-calendar.js'))throw Error(p+' missing read-only Google Calendar script');
for(const p of ['index.html','sidepanel.html'])if(!read(p).includes('desk-v052.js')||!read(p).includes('deskV052Status'))throw Error(p+' missing Pulse background controls');
for(const p of ['index.html','sidepanel.html'])if(!read(p).includes('desk-v04.js')||!read(p).includes('desk-v05.js')||!read(p).includes('desk-v045.css'))throw Error(p+' missing V0.4/V0.5 integration');
for(const p of ['index.html','sidepanel.html'])if(!read(p).includes('desk-v03.js')||!read(p).includes('desk-v03.css'))throw Error(p+' missing V0.3 integration');
for(const p of ['index.html','sidepanel.html'])if(!read(p).includes('wallpaperFolder'))throw Error(p+' missing wallpaper picker');
for(const token of ['widgetGrid','itemOrderButtons','data-item-drag','data-item-drop-mid','draggedInner','innerColumns','cycle-columns','focus-sound','focus-upload'])if(!read('app.js').includes(token))throw Error('Inner widget layout or focus alarm missing: '+token);
for(const token of ['desk-calendar-grid','nav-prev','nav-next','displayMode','desk-calendar-modes'])if(!read('desk-google-calendar.js').includes(token))throw Error('Calendar navigation missing: '+token);
for(const token of ['AudioContext','storage.local.set','MAX_BYTES','soft','digital','custom'])if(!read('desk-focus-audio.js').includes(token))throw Error('Focus sound engine missing: '+token);
for(const token of ['renderWorldClocks','renderWeatherModule','renderFocusModule','wallpaperGallery','siteFavicon','showDirectoryPicker','connectLiveFolder','handleStore','scanConnectedFolder'])if(!read('app.js').includes(token))throw Error('Missing feature: '+token);
for(const token of ['openCommand','openProjects','openResearch','openLayouts','captureForm'])if(!read('desk-v03.js').includes(token))throw Error('Missing V0.3 feature: '+token);
for(const token of ['defaultProjects','layoutSnapshots','DeskBridge'])if(!read('app.js').includes(token))throw Error('Missing V0.3 state integration: '+token);
for(const token of ['normalizeOperations','workSessions','calendarEvents','pulseCache'])if(!read('app.js').includes(token))throw Error('Missing V0.4/V0.5 state: '+token);
for(const token of ['newSession','taskForm','contentForm','captureActiveTab','calendar','renderSearch'])if(!read('desk-v04.js').includes(token))throw Error('Missing V0.4 feature: '+token);
for(const token of ['refreshGithub','refreshPulse','pulseAllowed','normalizePulse','operationalAlerts'])if(!read('desk-v05.js').includes(token))throw Error('Missing V0.5 feature: '+token);
for(const token of ['chrome.identity.getAuthToken','calendar.readonly','local.get','calendarUrl','dateMs','disconnect'])if(!read('desk-google-calendar.js').includes(token))throw Error('Google Calendar integration missing '+token);
console.log('PASS: MV3 V0.5.5 functional visual preview (configured Google OAuth client ID), limited required permissions, opt-in tabs and hosts, updater, productivity and read-only monitoring');