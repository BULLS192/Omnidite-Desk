/* Omnidite Desk v0.5.4 — local-only read-only Google Calendar integration.
   OAuth tokens are held by Chrome Identity, never saved to Desk backups or sync. */
(() => {
'use strict';
const api=window.DeskBridge;if(!api)return;
const esc=api.esc,$=s=>document.querySelector(s);
const STORAGE_KEY='omnidite-google-calendar-local-v1';
const HOST='https://www.googleapis.com/*';
const API='https://www.googleapis.com/calendar/v3';
const SCOPE='https://www.googleapis.com/auth/calendar.readonly';
const MAX_CALENDARS=6,MAX_EVENTS=500;
let cache={connected:false,selected:[],calendars:[],events:[],updatedAt:0,rangeDays:7};
let loaded=false,busy=false,lastToken='',lastMessage='',lastAutoRefreshAt=0;
const hasChrome=()=>typeof chrome!=='undefined'&&!!chrome.identity?.getAuthToken&&!!chrome.storage?.local;
const configured=()=>{const id=chrome?.runtime?.getManifest?.()?.oauth2?.client_id||'';return /^\d{8,}-[a-z0-9_-]+\.apps\.googleusercontent\.com$/i.test(id);};
const safe=(v,n=150)=>String(v??'').slice(0,n);
const unique=a=>[...new Set(a)];
const dateMs=(value,allDay=false)=>{
 if(allDay&&/^\d{4}-\d{2}-\d{2}$/.test(value)){
  const [y,m,d]=value.split('-').map(Number);
  const date=new Date(y,m-1,d);
  return date.getFullYear()===y&&date.getMonth()===m-1&&date.getDate()===d?date.getTime():null;
 }
 const ms=Date.parse(String(value||''));return Number.isFinite(ms)?ms:null;
};
const normalize=(value)=>{
 const o=value&&typeof value==='object'?value:{};
 return {
  connected:!!o.connected,
  selected:(Array.isArray(o.selected)?o.selected:[]).slice(0,MAX_CALENDARS).map(x=>safe(x,250)),
  calendars:(Array.isArray(o.calendars)?o.calendars:[]).slice(0,80).map(x=>({id:safe(x.id,250),name:safe(x.name,100),primary:!!x.primary})).filter(x=>x.id),
  events:(Array.isArray(o.events)?o.events:[]).slice(0,MAX_EVENTS).filter(x=>Number.isFinite(x.when)&&typeof x.title==='string').map(x=>({
   id:safe(x.id,300),calendar:safe(x.calendar,250),title:safe(x.title,180),when:x.when,allDay:!!x.allDay,url:calendarUrl(x.url)
  })).filter(x=>x.id),
  updatedAt:Number.isFinite(o.updatedAt)?o.updatedAt:0,
  rangeDays:[7,14,30].includes(o.rangeDays)?o.rangeDays:7
 };
};
function calendarUrl(url){
 try{
  const u=new URL(String(url||''));
  return u.protocol==='https:'&&(u.hostname==='calendar.google.com'||(u.hostname==='www.google.com'&&u.pathname.startsWith('/calendar/')))?u.href:'';
 }catch{return '';}
}
const fmt=ms=>new Date(ms).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
const dateLabel=e=>e.allDay?new Date(e.when).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})+' · All day':fmt(e.when);
const timeSince=ms=>ms?new Date(ms).toLocaleString():'Never';
const action=(label,name,disabled=false)=>'<button type="button" class="smallbutton" data-gcal="'+name+'" '+(disabled?'disabled':'')+'>'+label+'</button>';
const panel=(content)=>api.show('<div class="modal-pad desk-ops desk-google-calendar"><div class="modal-top"><div><span class="eyebrow">OMNIDITE / CALENDAR</span><h2 id="modalTitle">Google Calendar</h2><p>Read-only upcoming events. Your existing .ics snapshot stays available.</p></div><button type="button" class="modal-close" data-gcal="close">✕</button></div>'+content+'</div>');
function intro(){
 return '<p class="helper">Only calendar names, event titles, times and Google Calendar links are read. No editing, attendee lists or descriptions. Tokens are held by Chrome; event cache stays in this Chrome profile, outside Desk Sync and backups.</p>';
}
function setup(){
 panel('<div class="desk-status-card"><h3>One-time Google authorization setup needed</h3>'+
 '<p>Enable Google Calendar API in a Google Cloud project and create an OAuth client of type <strong>Chrome Extension</strong>, linked to this Desk extension ID:</p>'+
 '<p><code id="gcalExtensionId">'+esc(chrome?.runtime?.id||'Check chrome://extensions')+'</code> '+action('Copy extension ID','copy-id')+'</p>'+
 '<p>Google Cloud → Google Auth Platform → Clients → Create client → <strong>Chrome Extension</strong>. Put the issued client ID into Desk’s <code>manifest.json</code> OAuth configuration during release preparation. A Google account password or API key is not needed.</p>'+
 '<p>Enable Google Calendar API and add your Google address as a test user if Google Auth Platform is in Testing mode.</p>'+
 '<div class="modal-actions">'+action('Refresh setup check','setup-check')+action('Open Google Cloud','cloud')+action('Use offline .ics import','offline')+'</div></div>'+
 '<p class="helper">This development build does not yet contain an authorized OAuth client ID. The normal installed Desk stays unchanged until authorization is configured and tested.</p>');
}
let displayMode='month',anchorDate=new Date();
function dateKey(date){
 const d=date instanceof Date?date:new Date(date);
 return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
function localDate(key){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(key||''))return null;
 const [y,m,d]=key.split('-').map(Number),v=new Date(y,m-1,d,12);
 return v.getFullYear()===y&&v.getMonth()===m-1&&v.getDate()===d?v:null;
}
function shiftDate(delta){
 const y=anchorDate.getFullYear(),month=anchorDate.getMonth(),day=anchorDate.getDate();
 if(displayMode==='month')anchorDate=new Date(y,month+delta,1,12);
 else{const d=new Date(y,month,day,12);d.setDate(d.getDate()+delta*(displayMode==='week'?7:1));anchorDate=d;}
}
function calendarEvents(){return cache.events.filter(e=>cache.selected.includes(e.calendar)&&Number.isFinite(e.when)).slice().sort((a,b)=>a.when-b.when);}
function dayEvents(events,key){return events.filter(e=>dateKey(e.when)===key);}
function eventLine(e){
 const cal=cache.calendars.find(c=>c.id===e.calendar);
 return '<div class="desk-calendar-event"><span class="desk-calendar-event-time">'+esc(e.allDay?'All day':new Date(e.when).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}))+'</span>'+
 '<div class="desk-calendar-event-info"><strong>'+esc(e.title)+'</strong><small>'+esc(cal?.name||'Calendar')+'</small></div>'+
 (e.url?'<a href="'+esc(e.url)+'" target="_blank" rel="noopener noreferrer" aria-label="Open event in Google Calendar">↗</a>':'')+'</div>';
}
function calendarLayout(events){
 const today=dateKey(new Date()),chosen=dateKey(anchorDate);
 const current=new Date(anchorDate.getFullYear(),anchorDate.getMonth(),1,12);
 const mondayOffset=(current.getDay()+6)%7;
 const first=new Date(current);first.setDate(first.getDate()-mondayOffset);
 const weekdays=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
 let days=[];
 if(displayMode==='month')days=Array.from({length:42},(_,i)=>{const d=new Date(first);d.setDate(first.getDate()+i);return d;});
 else if(displayMode==='week'){
  const d=new Date(anchorDate.getFullYear(),anchorDate.getMonth(),anchorDate.getDate(),12);d.setDate(d.getDate()-(d.getDay()+6)%7);
  days=Array.from({length:7},(_,i)=>{const next=new Date(d);next.setDate(d.getDate()+i);return next;});
 }else days=[new Date(anchorDate)];
 const labels=displayMode==='month'?'<div class="desk-calendar-weekdays">'+weekdays.map(w=>'<span>'+w+'</span>').join('')+'</div>':'';
 const cells=days.map(d=>{
  const key=dateKey(d),onDay=dayEvents(events,key),outside=d.getMonth()!==anchorDate.getMonth();
  const dayName=d.toLocaleDateString(undefined,{weekday:'short'});
  return '<button type="button" data-gcal-day="'+key+'" class="desk-calendar-date '+(outside&&displayMode==='month'?'outside ':'')+(key===today?'is-today ':'')+(key===chosen?'is-selected ':'')+'" aria-label="'+esc(d.toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'}))+' with '+onDay.length+' events">'+
  (displayMode==='month'?'<span class="desk-calendar-num">'+d.getDate()+'</span>':'<span class="desk-calendar-day-name">'+esc(dayName)+'</span><span class="desk-calendar-num">'+d.getDate()+'</span>')+
  '<span class="desk-calendar-dots">'+onDay.slice(0,3).map(()=>'<span class="desk-calendar-dot"></span>').join('')+'</span>'+
  (displayMode==='month'?'<span class="desk-calendar-day-preview">'+onDay.slice(0,2).map(e=>'<span>'+esc(e.title)+'</span>').join('')+'</span>':'')+
  '</button>';
 }).join('');
 const selected=dayEvents(events,chosen);
 const agendaTitle=anchorDate.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
 const upcoming=events.filter(e=>e.when>=Date.now()-3600000).slice(0,5);
 return '<div class="desk-calendar-surface"><div class="desk-calendar-toolbar">'+
 '<div class="desk-calendar-navigation"><button type="button" class="desk-calendar-nav" data-gcal="nav-prev" aria-label="Previous period">‹</button><button type="button" class="smallbutton" data-gcal="today">Today</button><button type="button" class="desk-calendar-nav" data-gcal="nav-next" aria-label="Next period">›</button>'+
 '<strong>'+esc(anchorDate.toLocaleDateString(undefined,{month:'long',year:'numeric'}))+'</strong></div>'+
 '<div class="desk-calendar-modes">'+[['month','Month'],['week','Week'],['day','Day']].map(([val,label])=>'<button type="button" data-gcal-mode="'+val+'" class="'+(displayMode===val?'active':'')+'" aria-pressed="'+(displayMode===val)+'">'+label+'</button>').join('')+'</div></div>'+
 labels+'<div class="desk-calendar-grid '+(displayMode==='month'?'month':'compact')+'">'+cells+'</div>'+
 '<div class="desk-calendar-agenda"><div class="desk-calendar-agenda-header"><strong>'+esc(agendaTitle)+'</strong><small>'+selected.length+' '+(selected.length===1?'event':'events')+'</small></div>'+
 (selected.map(eventLine).join('')||'<p class="desk-calendar-empty">Nothing scheduled for this date.</p>')+'</div>'+
 '<div class="desk-calendar-upcoming"><h3>Coming up</h3>'+(upcoming.length?upcoming.map(eventLine).join(''):'<p class="desk-calendar-empty">No upcoming events in the cached calendars.</p>')+'</div></div>';
}
function view(){
 if(!hasChrome()){panel('<p class="empty-note">Live Google Calendar requires the installed Chrome extension.</p>');return;}
 if(!configured()){setup();return;}
 const checked=cache.updatedAt&&Date.now()-cache.updatedAt<30*60000;
 const selected=new Set(cache.selected);
 const settings=cache.calendars.map(c=>'<label class="desk-gcal-choice"><input type="checkbox" data-gcal-choice="'+esc(c.id)+'" '+(selected.has(c.id)?'checked':'')+'><span>'+esc(c.name)+(c.primary?' · Primary':'')+'</span></label>').join('');
 const offline=(api.getState().calendarEvents||[]).filter(e=>Number.isFinite(e.when)&&e.when>=Date.now()-86400000).sort((a,b)=>a.when-b.when).slice(0,15);
 const status=!cache.connected?'Connect a calendar':checked?'Calendar synced':'Saved calendar snapshot';
 panel('<div class="desk-calendar-header"><div><span class="desk-calendar-status">'+esc(status)+(busy?' · Refreshing…':'')+'</span><small>Last updated '+esc(timeSince(cache.updatedAt))+(lastMessage?' · '+esc(lastMessage):'')+'</small></div>'+
 '<div class="desk-calendar-controls">'+(!cache.connected?action('Connect Google account','connect',busy):action('↻ Refresh','refresh',busy))+
 (cache.connected?action('Reauthorize','connect',busy):'')+action('Open Google Calendar ↗','open')+'</div></div>'+
 calendarLayout(calendarEvents())+
 '<details class="desk-calendar-settings"><summary>Calendars & connection settings</summary>'+
 (cache.connected?'<p class="helper">Select up to '+MAX_CALENDARS+' calendars.</p><div class="desk-gcal-choices">'+settings+'</div><div class="modal-actions">'+action('Apply selection','apply',busy)+action('Disconnect & clear local events','disconnect',busy)+'</div>':'<p class="helper">Sign in above to choose which calendars appear.</p>')+
 '</details><details class="desk-calendar-settings"><summary>Offline .ics snapshot</summary><div class="desk-collection">'+
 (offline.map(e=>'<div class="desk-item"><div class="desk-item-main"><strong>'+esc(safe(e.title,180))+'</strong><small>'+esc(fmt(e.when))+' · Imported .ics</small></div></div>').join('')||'<p class="empty-note">No imported .ics events.</p>')+'</div>'+
 '<div class="modal-actions">'+action('↑ Import .ics offline snapshot','offline')+'</div></details>'+intro());
}
async function save(){
 if(!hasChrome())return;
 await chrome.storage.local.set({[STORAGE_KEY]:cache});
}
async function load(){
 if(loaded)return;
 loaded=true;
 if(!hasChrome())return;
 try{
  const stored=await chrome.storage.local.get(STORAGE_KEY);
  cache=normalize(stored[STORAGE_KEY]);
 }catch(e){lastMessage='Local calendar cache unavailable: '+safe(e.message);}
}
async function permission(interactive){
 if(!chrome?.permissions)return false;
 if(interactive)return chrome.permissions.request({origins:[HOST]});
 return chrome.permissions.contains({origins:[HOST]});
}
async function token(interactive){
 const result=await chrome.identity.getAuthToken({interactive,scopes:[SCOPE]});
 const found=typeof result==='string'?result:result?.token;
 if(!found)throw Error('Google sign-in did not return a token.');
 lastToken=found;
 return found;
}
async function googleGet(url,key,allowRetry=true){
 const aborter=new AbortController(),timer=setTimeout(()=>aborter.abort(),18000);
 try{
  const response=await fetch(url,{method:'GET',headers:{Authorization:'Bearer '+key,Accept:'application/json'},cache:'no-store',credentials:'omit',redirect:'error',signal:aborter.signal});
  if(response.status===401&&allowRetry){
   await chrome.identity.removeCachedAuthToken({token:key});
   return googleGet(url,await token(false),false);
  }
  if(!response.ok){if(response.status===401)throw Error('Google authorization expired. Click Reauthorize account to sign in again.');if(response.status===403)throw Error('Google Calendar permission denied or Calendar API is not enabled.');throw Error('Google Calendar API HTTP '+response.status);}
  const body=await response.text();
  if(body.length>300000)throw Error('Google Calendar response is too large.');
  return JSON.parse(body);
 }finally{clearTimeout(timer);}
}
async function getCalendars(key){
 const data=await googleGet(API+'/users/me/calendarList?maxResults=200&fields=items(id,summary,primary,selected,accessRole),nextPageToken',key);
 if(!Array.isArray(data?.items))throw Error('Calendar list response was invalid.');
 return data.items.slice(0,80).filter(c=>c.id&&c.accessRole!=='none').map(c=>({id:safe(c.id,250),name:safe(c.summary||'Calendar',100),primary:!!c.primary,selected:!!c.selected}));
}
function parseEvents(data,id){
 const events=[];
 for(const ev of (Array.isArray(data?.items)?data.items:[])){
  if(ev.status==='cancelled'||ev.transparency==='transparent'||!ev.start)continue;
  const allDay=!!ev.start.date&&!ev.start.dateTime;
  const when=dateMs(allDay?ev.start.date:ev.start.dateTime,allDay);
  if(when===null)continue;
  events.push({id:safe(id+':'+ev.id,300),calendar:id,title:safe(ev.summary||'(Busy)',180),when,allDay,url:calendarUrl(ev.htmlLink)});
 }
 return events;
}
async function getEvents(key,ids){
 const now=new Date(Date.now()-35*86400000).toISOString();
 const end=new Date(Date.now()+120*86400000).toISOString();
 const result=await Promise.all(ids.map(async id=>{
  const url=API+'/calendars/'+encodeURIComponent(id)+'/events?'+new URLSearchParams({
   timeMin:now,timeMax:end,singleEvents:'true',orderBy:'startTime',maxResults:'250',
   fields:'items(id,summary,status,transparency,start(date,dateTime),htmlLink),nextPageToken'
  });
  const json=await googleGet(url,key);
  if(!json||typeof json!=='object'||(json.items!==undefined&&!Array.isArray(json.items)))throw Error('Invalid events response.');
  return parseEvents(json,id);
 }));
 return result.flat().sort((a,b)=>a.when-b.when).slice(0,MAX_EVENTS);
}
async function perform(interactive=false){
 if(busy)return;
 if(!configured()){setup();return;}
 busy=true;lastMessage='Connecting…';view();
 try{
  if(!(await permission(interactive)))throw Error('Chrome access to the Google Calendar API was not granted.');
  const key=await token(interactive);
  const calendars=await getCalendars(key);
  let selected=cache.selected.filter(id=>calendars.some(c=>c.id===id));
  if(!selected.length)selected=(calendars.filter(c=>c.primary||c.selected).slice(0,MAX_CALENDARS).map(c=>c.id));
  if(!selected.length&&calendars.length)selected=[calendars[0].id];
  if(!selected.length)throw Error('No accessible Google calendars were found.');
  const events=await getEvents(key,selected);
  cache={...cache,connected:true,calendars:calendars.map(({id,name,primary})=>({id,name,primary})),selected,events,updatedAt:Date.now()};
  await save();lastMessage=events.length+' events received';view();
 }catch(e){
  lastMessage=safe(e.message||e,220);
  // Cached events survive network errors, but the "last fetched" time stays unchanged.
  view();
 }finally{busy=false;view();}
}
async function disconnect(){
 if(!confirm('Disconnect Google Calendar and delete locally cached live events? The Google account permission can also be revoked in your Google Account settings.'))return;
 busy=true;
 try{
  if(lastToken&&chrome?.identity?.removeCachedAuthToken)await chrome.identity.removeCachedAuthToken({token:lastToken});
 }catch{}
 lastToken='';
 cache={connected:false,selected:[],calendars:[],events:[],updatedAt:0,rangeDays:7};
 lastMessage='Local calendar data cleared';
 try{await chrome.storage.local.remove(STORAGE_KEY);}catch{}
 busy=false;view();
}
async function applySelection(){
 const selected=[...document.querySelectorAll('[data-gcal-choice]:checked')].map(x=>x.dataset.gcalChoice);
 if(!selected.length){alert('Choose at least one calendar.');return;}
 if(selected.length>MAX_CALENDARS){alert('Choose no more than '+MAX_CALENDARS+' calendars.');return;}
 cache.selected=unique(selected.filter(x=>cache.calendars.some(c=>c.id===x)));
 await save();await perform(false);
}
function offline(){
 // Preserve the original independent .ics snapshot flow from V0.4.
 const file=$('#deskCalendarFile');
 if(file)file.click();
 else alert('Calendar file importer is unavailable.');
}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-gcal]');if(!b)return;
 const a=b.dataset.gcal;
 if(a==='close')api.close();
 if(a==='connect')perform(true);
 if(a==='refresh')perform(false);
 if(a==='apply')applySelection();
 if(a==='disconnect')disconnect();
 if(a==='offline')offline();
 if(a==='open')window.open('https://calendar.google.com/calendar/u/0/r','_blank','noopener,noreferrer');
 if(a==='cloud')window.open('https://console.cloud.google.com/apis/credentials','_blank','noopener,noreferrer');
 if(a==='setup-check')view();
 if(a==='nav-prev'){shiftDate(-1);view();}
 if(a==='nav-next'){shiftDate(1);view();}
 if(a==='today'){anchorDate=new Date();view();}
 if(a==='copy-id'&&chrome?.runtime?.id&&navigator?.clipboard?.writeText)navigator.clipboard.writeText(chrome.runtime.id).catch(()=>{});
});
document.addEventListener('click',e=>{
 const day=e.target.closest('[data-gcal-day]'),mode=e.target.closest('[data-gcal-mode]');
 if(day){const next=localDate(day.dataset.gcalDay);if(next){anchorDate=next;view();}}
 if(mode&&['month','week','day'].includes(mode.dataset.gcalMode)){displayMode=mode.dataset.gcalMode;view();}
});
document.addEventListener('change',e=>{
 if(e.target.id==='gcalRange'){
  const n=Number(e.target.value);
  if([7,14,30].includes(n)){cache.rangeDays=n;save();view();}
 }
});
async function open(){
 await load();view();
 // Only refresh after prior explicit authorization, never prompt on opening.
 if(cache.connected&&configured()&&Date.now()-cache.updatedAt>15*60000&&Date.now()-lastAutoRefreshAt>15*60000){
  lastAutoRefreshAt=Date.now();perform(false);
 }
}
window.DeskGoogleCalendar={open};
})();
