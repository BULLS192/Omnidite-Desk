/* Create read-only sample pages from the real Desk templates for screenshot review. */
import fs from 'node:fs';

const modules=[
'<section class="module" style="--span:4"><header class="module-header"><span class="module-icon">◇</span><span class="module-title">Quick Launch</span><div class="module-tools"><span class="tiny">⚙</span></div></header><div class="module-body"><p class="module-sub">4 SAVED SHORTCUTS</p><div class="linkgrid"><div class="launch"><span class="launch-icon">G</span><span class="launch-name">GitHub</span><span class="launch-arrow">↗</span></div><div class="launch"><span class="launch-icon">C</span><span class="launch-name">Calendar</span><span class="launch-arrow">↗</span></div><div class="launch"><span class="launch-icon">V</span><span class="launch-name">Vercel</span><span class="launch-arrow">↗</span></div><div class="launch"><span class="launch-icon">O</span><span class="launch-name">Omnidite</span><span class="launch-arrow">↗</span></div></div></div></section>',
'<section class="module" style="--span:4"><header class="module-header"><span class="module-icon">◷</span><span class="module-title">World Clocks</span><div class="module-tools"><span class="tiny">⚙</span></div></header><div class="module-body"><p class="module-sub">ANALOG + DIGITAL · 2 CITIES</p><div class="clock-city"><div class="analog-face"><i class="hand hour-hand" style="transform:translate(-50%,-100%) rotate(95deg)"></i><i class="hand minute-hand" style="transform:translate(-50%,-100%) rotate(220deg)"></i><i class="hand second-hand" style="transform:translate(-50%,-100%) rotate(35deg)"></i><i class="clock-pin"></i></div><div class="clock-information"><div class="clock-city-name">Singapore<span>Singapore</span></div><div class="clock-time">3:15 PM</div><div class="clock-date">Thursday, October 8</div><div class="clock-diff">Local time</div></div></div><div class="clock-city"><div class="analog-face"><i class="hand hour-hand" style="transform:translate(-50%,-100%) rotate(95deg)"></i><i class="hand minute-hand" style="transform:translate(-50%,-100%) rotate(220deg)"></i><i class="hand second-hand" style="transform:translate(-50%,-100%) rotate(35deg)"></i><i class="clock-pin"></i></div><div class="clock-information"><div class="clock-city-name">Houston<span>United States</span></div><div class="clock-time">2:15 AM</div><div class="clock-date">Thursday, October 8</div><div class="clock-diff">−13h from you</div></div></div></div></section>',
'<section class="module" style="--span:4"><header class="module-header"><span class="module-icon">☀</span><span class="module-title">Weather</span><div class="module-tools"><span class="tiny">⚙</span></div></header><div class="module-body"><p class="module-sub">LIVE CONDITIONS · MULTIPLE CITIES</p><div class="weather-city-bar"><span class="weather-city-pill selected">Singapore</span><span class="weather-city-pill">Houston</span></div><div class="weather-tabs"><button class="selected">Now</button><button>Hourly</button><button>7 days</button></div><div class="weather-now"><div class="weather-main"><span class="weather-symbol">⛅</span><div><strong>Singapore</strong><div class="weather-reading">29°C</div><div class="weather-desc">Partly cloudy</div></div></div><div class="weather-stats"><span>Humidity<strong>78%</strong></span><span>Wind<strong>12 km/h</strong></span></div></div></div></section>',
'<section class="module" style="--span:4"><header class="module-header"><span class="module-icon">◉</span><span class="module-title">Focus Timer</span><div class="module-tools"><span class="tiny">⚙</span></div></header><div class="module-body"><p class="module-sub">FOCUS SPRINT</p><div class="focus-display">25:00</div><div class="focus-presets"><button>15m</button><button class="selected">25m</button><button>45m</button><button>60m</button></div><div class="focus-controls"><button class="smallbutton">▶ Start</button><button class="smallbutton">↻ Reset</button></div></div></section>'
].join('');
const replacements=[
 ['id="deskUpdateStatus" role="status" aria-live="polite">Check GitHub for new Desk features.','id="deskUpdateStatus" role="status" aria-live="polite">Desk is up to date.'],
 ['id="deskNextMeeting">Checking calendar…','id="deskNextMeeting">Project planning review'],
 ['id="deskNextMeetingTime">Your upcoming appointment','id="deskNextMeetingTime">Today · 3:00 PM · in 45 min'],
 ['id="deskV05GitHub">Not checked','id="deskV05GitHub">All checks passing'],
 ['id="deskV05Pulse">Not connected','id="deskV05Pulse">Monitoring online'],
 ['id="deskV05Alerts">No saved alerts','id="deskV05Alerts">No active warnings'],
 ['id="deskV052Status" class="desk-pulse-live" data-v052="controls">Pulse: checking…','id="deskV052Status" class="desk-pulse-live" data-v052="controls">Pulse: running locally'],
 ['id="deskV05Badge" class="desk-ops-badge" aria-live="polite">Systems: not live','id="deskV05Badge" class="desk-ops-badge" aria-live="polite">Systems: healthy'],
 ['<div id="pageNav" class="page-nav"></div>','<div id="pageNav" class="page-nav"><button class="nav-link page-link selected">◈ &nbsp;Overview</button><button class="nav-link page-link">◈ &nbsp;Projects</button><button class="nav-link page-link">◈ &nbsp;Personal</button></div>'],
 ['<div class="mobile-pages" id="mobilePages"></div>','<div class="mobile-pages" id="mobilePages"><button class="page-pill selected">Overview</button><button class="page-pill">Projects</button></div>'],
 ['id="moduleCount">0','id="moduleCount">4'],
 ['<div id="grid" class="modules" aria-live="polite"></div>','<div id="grid" class="modules" aria-live="polite">'+modules+'</div>']
];
for(const [name,filename] of [['desktop','index.html'],['sidepanel','sidepanel.html']]){
 let html=fs.readFileSync(new URL('../'+filename,import.meta.url),'utf8');
 html=html.replace(/<script src="[^"]+" defer><\/script>\s*/g,'');
 for(const [needle,value] of replacements){
  if(!html.includes(needle))throw Error('Missing fixture anchor in '+filename+': '+needle.slice(0,45));
  html=html.replace(needle,value);
 }
 html=html.replace('<div class="content">','<div class="content"><div style="color:var(--desk-tertiary);font-size:9px;letter-spacing:.1em;margin-bottom:14px">SAMPLE DATA · STATIC VISUAL REVIEW · NOT YOUR LIVE DESK</div>');
 html=html.replace('<title>Omnidite Desk</title>','<title>Omnidite Desk sample design</title>');
 fs.writeFileSync(new URL('../design-review-'+name+'.html',import.meta.url),html);
}
console.log('PASS: Created static desktop and sidepanel design review samples without any real account data');
