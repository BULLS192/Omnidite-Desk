/* Desk V0.7 Daily Snapshot — reads local Desk state and cached Calendar only. */
(() => {
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const SNAP_KEY='omnidite-google-calendar-local-v1';
 const wxCache=new Map(),wxPending=new Map(),TTL=15*60*1000;
 const localDate=(value=new Date())=>value.getFullYear()+'-'+String(value.getMonth()+1).padStart(2,'0')+'-'+String(value.getDate()).padStart(2,'0');
 const dayAtNoon=iso=>/^\d{4}-\d{2}-\d{2}$/.test(iso||'')?new Date(iso+'T12:00:00').getTime():NaN;
 const days=cfg=>[1,3,7].includes(cfg?.days)?cfg.days:3;
 const shortTime=ms=>new Date(ms).toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
 const howOld=t=>Number.isFinite(t)&&t>0?new Date(t).toLocaleString():'Never';
 function summaryData(state,calendar,config,now=Date.now()){
  const daysAhead=days(config),today=localDate(new Date(now)),through=new Date(now);
  through.setDate(through.getDate()+daysAhead);const end=localDate(through);
  const items=(state.advancedTasks||[]).filter(x=>!x.done).map(x=>({label:String(x.title||''),date:x.due||'',priority:x.priority||'medium',project:x.project||''}));
  for(const p of state.pages||[])for(const m of p.modules||[])if(m.type==='tasks')for(const t of m.config?.tasks||[])if(!t.done)items.push({label:String(t.text||''),date:'',priority:'normal',project:p.title});
  const seen=new Set();
  const tasks=items.filter(x=>{if(!x.label.trim())return false;const key=x.label.trim().toLocaleLowerCase()+':'+String(x.project||'').toLocaleLowerCase();if(seen.has(key))return false;seen.add(key);return true;}).sort((a,b)=>
    (a.date||'9999-12-31').localeCompare(b.date||'9999-12-31')||({high:0,medium:1,low:2,normal:3}[a.priority]??4)-({high:0,medium:1,low:2,normal:3}[b.priority]??4)).slice(0,6);
  const overdue=items.filter(t=>t.date&&t.date<today).length;
  const dueSoon=items.filter(t=>t.date&&t.date>=today&&t.date<=end).length;
  const cached=calendar&&calendar.connected&&Array.isArray(calendar.events);
  const events=cached?calendar.events.filter(e=>Array.isArray(calendar.selected)?calendar.selected.includes(e.calendar):true):state.calendarEvents||[];
  const meetingList=events.filter(e=>Number.isFinite(e.when)&&e.when>=now-60000&&e.when<=now+daysAhead*86400000).sort((a,b)=>a.when-b.when).slice(0,5);
  const calendarSource=cached?'Cached Google Calendar':'Imported .ics snapshot';
  return {tasks,overdue,dueSoon,meetingList,calendarSource,calendarUpdated:cached?calendar.updatedAt:0,calendarConnected:!!cached,daysAhead,github:state.githubCache||null,pulse:state.pulseCache||null};
 }
 function renderSnapshot(m){
  return '<p class="module-sub">YOUR LOCAL TASKS · CACHED CALENDAR · CONNECTED STATUS</p>'+
   '<form class="v07-snapshot-options" data-v07-snapshot="'+esc(m.id)+'"><label>Next <select name="days" class="modal-input">'+[1,3,7].map(n=>
   '<option value="'+n+'" '+(days(m.config)===n?'selected':'')+'>'+n+' '+(n===1?'day':'days')+'</option>').join('')+'</select></label><button class="smallbutton" type="submit">Apply</button></form>'+
   '<div data-v07-snapshot-output="'+esc(m.id)+'" class="v07-snapshot-result">Building your local overview…</div>'+
   '<p class="v07-disclaimer">Read-only. Calendar events are read from Chrome-local cache; Desk never sends your tasks, meetings or project details to a briefing service. Weather is fetched only while this widget is visible.</p>';
 }
 function listRows(values,format){
  return values.length?values.map(format).join(''):'<p class="v07-snapshot-empty">Nothing saved for this window.</p>';
 }
 function renderOverview(data){
  const events=listRows(data.meetingList,e=>'<div class="v07-snapshot-entry"><strong>'+esc(e.title)+'</strong><span>'+esc(shortTime(e.when))+'</span></div>');
  const tasks=listRows(data.tasks,t=>'<div class="v07-snapshot-entry"><strong>'+esc(t.label)+'</strong><span>'+esc(t.project||'Personal')+' · '+esc(t.date||t.priority)+'</span></div>');
  const h=data.github,p=data.pulse;
  const github=h?.repo?esc(h.repo)+' · '+Math.max(0,Number(h.failedWorkflows)||0)+' failed workflows':'Not checked';
  const pulse=Array.isArray(p?.providers)&&p.providers.length?
    p.providers.length+' providers · '+p.providers.filter(x=>x.status==='down'||x.status==='warning').length+' flagged':'Not connected';
  return '<div class="v07-snapshot-kpis"><span><strong>'+data.dueSoon+'</strong> due soon</span><span><strong>'+data.overdue+'</strong> overdue</span><span><strong>'+data.meetingList.length+'</strong> meetings cached</span></div>'+
   '<section class="v07-snapshot-section"><h3>Upcoming · '+data.daysAhead+' day(s)</h3>'+events+
   '<small>'+esc(data.calendarSource)+(data.calendarConnected?' · synced '+esc(howOld(data.calendarUpdated)):' · no live Google events loaded')+'</small></section>'+
   '<section class="v07-snapshot-section"><h3>Open priorities</h3>'+tasks+'</section>'+
   '<section class="v07-snapshot-section"><h3>Connected systems · cached</h3>'+
   '<div class="v07-snapshot-entry"><strong>GitHub</strong><span>'+github+' · '+esc(howOld(h?.checkedAt))+'</span></div>'+
   '<div class="v07-snapshot-entry"><strong>Pulse</strong><span>'+pulse+' · '+esc(howOld(p?.checkedAt))+'</span></div></section>'+
   '<section class="v07-snapshot-section v07-snapshot-weather"><h3>Weather snapshot</h3><div data-v07-snapshot-weather>Checking selected city…</div></section>';
 }
 async function cachedCalendar(){
  if(typeof chrome==='undefined'||!chrome.storage?.local)return null;
  try {return (await chrome.storage.local.get(SNAP_KEY))[SNAP_KEY]||null;}catch{return null;}
 }
 function selectedCity(state){
  const values=(state.pages||[]).flatMap(p=>(p.modules||[]).filter(m=>m.type==='weather').flatMap(m=>m.config?.cities||[]));
  return values.find(x=>x&&Number.isFinite(x.latitude)&&Number.isFinite(x.longitude)&&x.timezone)||{name:'Singapore',country:'Singapore',timezone:'Asia/Singapore',latitude:1.3521,longitude:103.8198};
 }
 async function currentWeather(city){
  const key=Number(city.latitude).toFixed(3)+','+Number(city.longitude).toFixed(3),old=wxCache.get(key);
  if(old&&Date.now()-old.at<TTL)return old.data;
  if(wxPending.has(key))return wxPending.get(key);
  const url=new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude',String(city.latitude));url.searchParams.set('longitude',String(city.longitude));url.searchParams.set('timezone',city.timezone);
  url.searchParams.set('current','temperature_2m,relative_humidity_2m,weather_code');
  const work=fetch(url.toString(),{signal:AbortSignal.timeout(13000),credentials:'omit'}).then(async response=>{
   if(!response.ok)throw Error('Weather snapshot service unavailable');
   const data=await response.json(),c=data.current;
   if(!Number.isFinite(c?.temperature_2m))throw Error('Temperature unavailable');
   const result={temperature:c.temperature_2m,humidity:c.relative_humidity_2m,condition:c.weather_code,time:c.time||'',stale:false};
   wxCache.set(key,{at:Date.now(),data:result});return result;
  }).catch(error=>{if(old)return {...old.data,stale:true};throw error;}).finally(()=>wxPending.delete(key));
  wxPending.set(key,work);return work;
 }
 async function refreshSnapshot(){
  const api=window.DeskBridge,s=api?.getState?.();if(!s)return;
  const ms=s.pages.find(p=>p.id===s.activePage)?.modules||[];
  if(!ms.some(m=>m.type==='snapshot'))return;
  const calendar=await cachedCalendar();
  for(const m of ms.filter(m=>m.type==='snapshot')){
   const node=document.querySelector('[data-v07-snapshot-output="'+CSS.escape(m.id)+'"]');if(!node)continue;
   const data=summaryData(s,calendar,m.config);
   node.innerHTML=renderOverview(data);
   const target=node.querySelector('[data-v07-snapshot-weather]');
   const city=selectedCity(s);
   const [w,air]=await Promise.allSettled([currentWeather(city),window.DeskAir?.load(city)]);
   if(!target?.isConnected)continue;
   const wx=w.status==='fulfilled'?w.value:null,aq=air.status==='fulfilled'?air.value:null;
   const status=wx?Math.round(wx.temperature)+'°C · '+(Number.isFinite(wx.humidity)?Math.round(wx.humidity)+'% humidity':'humidity unavailable')+(wx.stale?' · last known':''):'Weather unavailable';
   target.innerHTML='<strong>'+esc(city.name)+'</strong> · '+esc(status)+(aq?window.DeskAir.summary(aq):' · Air quality unavailable');
  }
 }
 document.addEventListener('submit',e=>{
  const form=e.target.closest('form[data-v07-snapshot]');if(!form)return;e.preventDefault();
  const api=window.DeskBridge,s=api?.getState?.();
  const item=s?.pages.flatMap(p=>p.modules).find(m=>m.id===form.dataset.v07Snapshot);
  const value=Number(form.elements.days.value);
  if(!item||![1,3,7].includes(value))return;
  item.config.days=value;api.save();
 });
 window.DeskV07.renderSnapshot=renderSnapshot;
 window.DeskV07.refreshSnapshot=refreshSnapshot;
 window.DeskV07.summaryData=summaryData;
 window.DeskV07.currentSnapshotWeather=currentWeather;
 setInterval(()=>{if(document.visibilityState==='visible')refreshSnapshot();},15*60*1000);
})();