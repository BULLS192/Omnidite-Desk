/* Visually exercise the actual V0.5.6 dense packing with fabricated sample widgets.
 * No accounts, Google tokens or personal data are used. */
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const write=(p,s)=>fs.writeFileSync(new URL('../'+p,import.meta.url),s);
let html=read('design-review-desktop.html');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const card=(name,sym,cols,body,fixed=0)=>'<section class="module" style="--span:'+cols+'" data-fixed-height="'+fixed+'"><header class="module-header"><span class="module-icon">'+sym+'</span><span class="module-title">'+esc(name)+'</span><div class="module-tools"><button class="tiny" title="Edit widget">⚙</button><span class="tiny">⠿</span></div></header><div class="module-body">'+body+'</div><div class="size-grip"></div></section>';
const clock=cities=>'<p class="module-sub">CITIES · LIVE CLOCKS</p><div class="worldclocks desk-inner-grid" data-columns="2">'+cities.map(([city,time])=>'<div class="clock-city"><div class="analog-face"><i class="hand hour-hand" style="transform:translate(-50%,-100%) rotate(95deg)"></i><i class="hand minute-hand" style="transform:translate(-50%,-100%) rotate(220deg)"></i><b class="clock-pin"></b></div><div class="clock-information"><div class="clock-city-name">'+esc(city)+'</div><div class="clock-time">'+time+'</div><div class="clock-date">Thursday, October 8</div></div></div>').join('')+'</div>';
const weather='<p class="module-sub">CURRENT CONDITIONS · 3 CITIES</p><div class="weather-tabs"><button class="selected">Now</button><button>Hourly</button><button>7 days</button></div><div class="weather-now-grid desk-inner-grid" data-columns="2">'+[['Singapore','29°C'],['Houston','26°C'],['São Paulo','24°C']].map(([city,temp])=>'<div class="weather-now"><div class="weather-main"><div class="weather-symbol">⛅</div><div><strong>'+esc(city)+'</strong><div class="weather-reading">'+temp+'</div><div class="weather-desc">Partly cloudy</div></div></div><div class="weather-stats"><span>Humidity <strong>78%</strong></span><span>Wind <strong>12 km/h</strong></span></div></div>').join('')+'</div>';
const links='<p class="module-sub">QUICK ACCESS · 4 LINKS</p><div class="linkgrid desk-inner-grid" data-columns="2">'+[['V','Vercel'],['S','Supabase'],['G','GitHub'],['C','Calendar']].map(([s,n])=>'<div class="desk-launch-item"><span class="launch"><span class="launch-icon">'+s+'</span><span class="launch-name">'+n+'</span></span></div>').join('')+'</div>';
const task='<p class="module-sub">2 / 3 COMPLETED</p><div class="desk-task-grid desk-inner-grid" data-columns="1">'+['Review project timeline','Update CRM','Prepare tomorrow'].map((v,i)=>'<div class="taskrow"><input type="checkbox" '+(i<2?'checked':'')+'><span class="tasktext">'+v+'</span></div>').join('')+'</div>';
const notes='<p class="module-sub">AUTO SAVED</p><textarea class="notebox" readonly>Priorities for today: streamline workflows and review the calendar.</textarea>';
const focus='<p class="module-sub">FOCUS SPRINT</p><div class="focus-display">25:00</div><div class="focus-presets"><button>15m</button><button class="selected">25m</button><button>45m</button></div><div class="focus-controls"><button class="smallbutton">▶ Start</button><button class="smallbutton">↻ Reset</button></div><div class="focus-audio-controls"><div class="focus-audio-row"><label>End sound</label><select class="modal-input"><option>Gentle chime</option></select></div></div>';
const countdown='<p class="module-sub">PROJECT MILESTONE</p><div class="count-number">23</div><div class="focus-hint">DAYS REMAINING</div>';
const modules=[
 card('World clocks','◷',4,clock([['Singapore','8:45 PM'],['Houston','7:45 AM'],['São Paulo','9:45 AM']])),
 card('Weather','☀',4,weather),
 card('Quick launch','↗',4,links),
 card('Today’s priorities','✓',4,task),
 card('Countdown','⌛',4,countdown),
 card('Scratchpad','▤',4,notes),
 card('Focus timer','◴',4,focus)
].join('');
const needle='<div id="grid" class="modules" aria-live="polite">';
const begin=html.indexOf(needle),end=html.indexOf('<div class="footer">',begin);
if(begin<0||end<0)throw Error('Sample HTML missing grid/footer');
html=html.slice(0,begin)+'<div id="grid" class="modules" aria-live="polite" data-layout="compact">'+modules+'</div>\n        '+html.slice(end);
html=html.replace('id="moduleCount">4','id="moduleCount">7');
html=html.replace('</body>','<script src="desk-compact.js" defer></script></body>');
html=html.replace('SAMPLE DATA · STATIC VISUAL REVIEW · NOT YOUR LIVE DESK','SAMPLE DATA · V0.5.6 COMPACT PACKING · NOT YOUR LIVE DESK');
write('design-review-compact.html',html);
write('design-review-aligned.html',html.replace('data-layout="compact"','data-layout="rows"'));
console.log('PASS: Generated 7 representative widget cards in Compact vs Aligned layouts with no real account data');
