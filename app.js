/* Omnidite Desk v0.5.0 — vanilla JS, strict MV3 CSP, no analytics. */
(() => {
'use strict';
const V2='omniditeDeskStateV2', V1='omniditeDeskStateV1', SYNC_OPT='odV2SyncEnabled';
const SYNC_META='od_v2_meta', CHUNK='od_v2_chunk_';
const TYPES=['links','tasks','notes','clock','weather','focus','agenda','countdown','habits','metric','quote'];
const LIST_TYPES=new Set(['links','tasks','clock','weather','agenda','habits']);
const defaultInnerColumns=type=>type==='links'||type==='weather'?2:1;
const layoutColumns=(v,defaultValue=1)=>Number.isInteger(v)&&v>=1&&v<=6?v:defaultValue;
const itemOrderButtons=(mid,i,total)=>'<span class="desk-item-order"><span class="desk-item-handle" draggable="true" data-item-drag="'+esc(mid)+'" data-item-index="'+i+'" title="Drag to reorder">⠿</span><button type="button" class="desk-order-button" data-action="item-move" data-mid="'+esc(mid)+'" data-item-index="'+i+'" data-move-direction="-1" aria-label="Move item earlier" '+(i===0?'disabled':'')+'>↑</button><button type="button" class="desk-order-button" data-action="item-move" data-mid="'+esc(mid)+'" data-item-index="'+i+'" data-move-direction="1" aria-label="Move item later" '+(i===total-1?'disabled':'')+'>↓</button></span>';
const widgetGrid=(m,cls)=>'class="'+cls+' desk-inner-grid" data-columns="'+layoutColumns(m.config.columns,defaultInnerColumns(m.type))+'"';
const META={
 links:['↗','Link launcher','Your project shortcuts'],tasks:['✓','Task list','Daily priorities'],notes:['▤','Notes','Keep ideas handy'],
 clock:['◷','World clocks','Analog and digital city clocks'],weather:['☁','Live weather','Current, hourly and 7-day forecasts'],focus:['◴','Focus timer','Custom-length deep work'],
 agenda:['▦','Local agenda','Upcoming events and reminders'],countdown:['⌛','Countdown','Count down to a milestone'],
 habits:['◉','Habit tracker','Daily check-ins'],metric:['▥','Metric tracker','Track a running total'],
 quote:['✦','Inspiration','Thoughtful quotes']};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
const clone=v=>JSON.parse(JSON.stringify(v));
const $=(s,x=document)=>x.querySelector(s);
const validUrl=s=>{try {const u=new URL(s); return ['http:','https:'].includes(u.protocol)&&!!u.hostname;}catch{return false;}};
const mk=(type,title=undefined,config={})=>({id:uid(),type,title:typeof title==='string'?title:META[type][1],cols:['links','tasks','notes','agenda','clock','weather'].includes(type)?6:4,height:0,config:{...({links:{links:[]},tasks:{tasks:[]},notes:{text:''},clock:{cities:defaultClockCities()},weather:{cities:defaultWeatherCities(),view:'now',selected:'sg'},focus:{duration:1500,seconds:1500,until:null},agenda:{events:[]},countdown:{target:'2026-12-31',label:'Milestone'},habits:{habits:[]},metric:{value:0,step:1,unit:''}}[type]||{}),...config}});
const defaultPage=(id,title,modules)=>({id,title,modules});
const defaultProjects=()=>[['Omnidite','https://omnidite.com'],['Providence','https://providence.omnidite.com'],['TTT-OS','https://ttt-os.vercel.app'],['Atlas',''],['SGBuddy',''],['F.R.E.Y.A.','']].map(([name,url])=>({id:uid(),name,url,status:'Tracked'}));
const starter=()=>({version:2,brand:'Omnidite Desk',searchEngine:'google',theme:'midnight',accent:'#4a8df5',activePage:'overview',updatedAt:Date.now(),projects:defaultProjects(),captures:[],layoutSnapshots:[],workSessions:[],advancedTasks:[],contentItems:[],calendarEvents:[],githubRepos:['BULLS192/Omnidite-Desk'],githubSelected:'BULLS192/Omnidite-Desk',githubCache:null,pulseSettings:{url:'',auto:false},pulseCache:null,operationalAlerts:[],pages:[
 defaultPage('overview','Overview',[
  mk('links','My projects',{links:[{label:'Omnidite',url:'https://omnidite.com'},{label:'Providence',url:'https://providence.omnidite.com'},{label:'TTT-OS',url:'https://ttt-os.vercel.app'},{label:'GitHub',url:'https://github.com/BULLS192/Omnidite-Desk'}]}),
  mk('links','Quick launch',{links:[{label:'Vercel',url:'https://vercel.com/dashboard'},{label:'Supabase',url:'https://supabase.com/dashboard'},{label:'ChatGPT',url:'https://chatgpt.com'},{label:'Google Drive',url:'https://drive.google.com'}]}),
  mk('tasks','Today’s priorities',{tasks:[{id:uid(),text:'Personalize your workspace',done:false}]}),
  mk('notes','Scratchpad',{text:''}),mk('clock'),mk('weather'),mk('focus',undefined,{seconds:1500,until:null,duration:1500})
 ]),defaultPage('projects','Projects',[mk('links','Development environments',{links:[{label:'GitHub',url:'https://github.com/BULLS192'},{label:'Vercel',url:'https://vercel.com/dashboard'},{label:'Supabase',url:'https://supabase.com/dashboard'}]}),mk('metric','Weekly milestones',{value:0,unit:' completed',step:1})]),
 defaultPage('personal','Personal',[mk('agenda'),mk('habits'),mk('countdown','Next milestone',{target:'2026-12-31',label:'Year-end milestone'})])
 ]});
let state=starter(),syncEnabled=false,lastSync='Not synced',syncTimer=null,saveTimer=null,revision=0,applyingRemote=false;
const supportsExt=typeof chrome!=='undefined'&&!!chrome.storage?.local;
const local={async get(k){if(supportsExt) return (await chrome.storage.local.get(k))[k]; try{return JSON.parse(localStorage.getItem(k)||'null');}catch{return null;}},async set(k,v){if(supportsExt) return chrome.storage.local.set({[k]:v});localStorage.setItem(k,JSON.stringify(v));}};
const moduleFor=id=>state.pages.flatMap(p=>p.modules).find(m=>m.id===id);
const page=()=>state.pages.find(p=>p.id===state.activePage)||state.pages[0];
const cleanText=(v,n)=>String(v??'').slice(0,n);
function sanitizeModule(x,ids){
 if(!x||!TYPES.includes(x.type)) return null;
 const id=typeof x.id==='string'&&/^[\w-]{1,90}$/.test(x.id)&&!ids.has(x.id)?x.id:uid(); ids.add(id);
 const c=x.config&&typeof x.config==='object'&&!Array.isArray(x.config)?x.config:{};
 const out={id,type:x.type,title:cleanText(x.title||META[x.type][1],80),cols:Number.isInteger(x.cols)&&x.cols>=1&&x.cols<=12?x.cols:({small:4,wide:6,full:12}[x.width]||4),height:Number.isFinite(x.height)?Math.min(1000,Math.max(0,Math.round(x.height))):0,config:{}};
 if(LIST_TYPES.has(x.type))out.config.columns=layoutColumns(c.columns,defaultInnerColumns(x.type));
 if(x.type==='links')out.config.links=(Array.isArray(c.links)?c.links:[]).slice(0,30).filter(l=>validUrl(String(l?.url||''))).map(l=>({label:cleanText(l.label||'Link',80),url:cleanText(l.url,1000)}));
 if(x.type==='tasks'||x.type==='habits')out.config[x.type==='tasks'?'tasks':'habits']=(Array.isArray(c.tasks||c.habits)?c.tasks||c.habits:[]).slice(0,80).filter(t=>t&&typeof t.text==='string').map(t=>({id:cleanText(t.id||uid(),90),text:cleanText(t.text,200),done:!!t.done,day:cleanText(t.day||'',12)}));
 if(x.type==='notes')out.config.text=cleanText(c.text,12000);
 if(x.type==='focus'){const duration=Number.isFinite(c.duration)?Math.min(14400,Math.max(60,Math.round(c.duration))):1500;out.config={duration,seconds:Number.isFinite(c.seconds)?Math.min(14400,Math.max(0,Math.round(c.seconds))):duration,until:Number.isFinite(c.until)&&c.until<Date.now()+86400000?c.until:null,sound:['chime','soft','bell','digital','none','custom'].includes(c.sound)?c.sound:'chime',volume:Number.isFinite(c.volume)?Math.min(100,Math.max(0,Math.round(c.volume))):70};}
 if(x.type==='clock')out.config={...out.config,cities:sanitizeCities(c.cities,'clock')};
 if(x.type==='weather')out.config={...out.config,cities:sanitizeCities(c.cities,'weather'),view:['now','hourly','daily'].includes(c.view)?c.view:'now',selected:cleanText(c.selected||'',90)};
 if(x.type==='agenda')out.config.events=(Array.isArray(c.events)?c.events:[]).slice(0,75).filter(e=>e&&e.title&&e.when).map(e=>({id:cleanText(e.id||uid(),90),title:cleanText(e.title,140),when:cleanText(e.when,25)}));
 if(x.type==='countdown')out.config={target:/^\d{4}-\d{2}-\d{2}$/.test(c.target||'')?c.target:'2026-12-31',label:cleanText(c.label||'Milestone',80)};
 if(x.type==='metric')out.config={value:Number.isFinite(Number(c.value))?Math.min(1e9,Math.max(-1e9,Number(c.value))):0,unit:cleanText(c.unit||'',40),step:Number.isFinite(Number(c.step))?Math.min(1e6,Math.max(.01,Number(c.step))):1};
 return out;
}

 function normalizeOperations(obj) {
  const chars=(s,n)=>String(s??'').slice(0,n);
  const http=v=>validUrl(v)?chars(v,1000):'';
  const tasks=(Array.isArray(obj.advancedTasks)?obj.advancedTasks:[]).slice(0,70).filter(v=>v&&typeof v.title==='string').map(v=>({
   id:chars(v.id||uid(),90),title:chars(v.title,180),project:chars(v.project,80),
   priority:['high','medium','low'].includes(v.priority)?v.priority:'medium',
   due:/^\d{4}-\d{2}-\d{2}$/.test(v.due||'')?v.due:'',done:!!v.done
  }));
  const contentItems=(Array.isArray(obj.contentItems)?obj.contentItems:[]).slice(0,45).filter(v=>v&&typeof v.title==='string').map(v=>({
   id:chars(v.id||uid(),90),title:chars(v.title,180),channel:chars(v.channel||'Article / Blog',60),
   stage:chars(v.stage||'Idea',40),date:/^\d{4}-\d{2}-\d{2}$/.test(v.date||'')?v.date:'',
   project:chars(v.project,80)
  }));
  const workSessions=(Array.isArray(obj.workSessions)?obj.workSessions:[]).slice(0,8).filter(v=>v&&Array.isArray(v.tabs)).map(v=>({
   id:chars(v.id||uid(),90),name:chars(v.name||'Work session',70),
   createdAt:Number.isFinite(v.createdAt)?v.createdAt:Date.now(),
   tabs:v.tabs.slice(0,15).filter(t=>t&&validUrl(t.url)).map(t=>({title:chars(t.title,100),url:chars(t.url,350)}))
  }));
  const calendarEvents=(Array.isArray(obj.calendarEvents)?obj.calendarEvents:[]).slice(0,100).filter(v=>v&&Number.isFinite(v.when)&&typeof v.title==='string').map(v=>({
   id:chars(v.id||uid(),90),title:chars(v.title,180),when:v.when
  }));
  const githubRepos=(Array.isArray(obj.githubRepos)?obj.githubRepos:['BULLS192/Omnidite-Desk']).slice(0,8).filter(r=>/^[a-zA-Z0-9_.-]{1,80}\/[a-zA-Z0-9_.-]{1,100}$/.test(r));
  const vGithubCache=obj.githubCache&&typeof obj.githubCache==='object'?obj.githubCache:null;
  const githubCache=vGithubCache?{
   repo:chars(vGithubCache.repo,181),checkedAt:Number.isFinite(vGithubCache.checkedAt)?vGithubCache.checkedAt:0,
   openIssues:Math.max(0,Number(vGithubCache.openIssues)||0),openPrs:Math.max(0,Number(vGithubCache.openPrs)||0),
   failedWorkflows:Math.max(0,Number(vGithubCache.failedWorkflows)||0),lastWorkflow:chars(vGithubCache.lastWorkflow,140),lastCommit:chars(vGithubCache.lastCommit,120),
   url:http(vGithubCache.url)
  }:null;
  const pulseSettings={
   url:(()=>{try{const u=new URL(obj.pulseSettings?.url||'');return ((!u.username&&!u.password&&u.protocol==='https:'&&(u.hostname==='omnidite.com'||u.hostname.endsWith('.omnidite.com')))||(!u.username&&!u.password&&u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname)&&u.port==='4173'&&u.pathname==='/api/providers'&&!u.search&&!u.hash))?chars(u.href,1000):'';}catch{return '';}})(),
   auto:!!obj.pulseSettings?.auto
  };
  const vPulse=obj.pulseCache&&typeof obj.pulseCache==='object'?obj.pulseCache:null;
  const pulseCache=vPulse?{
   checkedAt:Number.isFinite(vPulse.checkedAt)?vPulse.checkedAt:0,source:chars(vPulse.source,140),capturedAt:chars(vPulse.capturedAt,100),
   providers:(Array.isArray(vPulse.providers)?vPulse.providers:[]).slice(0,18).map(p=>({
    name:chars(p.name,80),status:['ok','warning','down','unknown'].includes(p.status)?p.status:'unknown',
    metrics:(Array.isArray(p.metrics)?p.metrics:[]).slice(0,8).map(m=>({
     label:chars(m.label,80),value:typeof m.value==='number'&&Number.isFinite(m.value)?m.value:chars(m.value,40),
     limit:typeof m.limit==='number'&&Number.isFinite(m.limit)?m.limit:null,unit:chars(m.unit,12)
    }))
   }))
  }:null;
  const operationalAlerts=(Array.isArray(obj.operationalAlerts)?obj.operationalAlerts:[]).slice(0,16).filter(x=>x&&typeof x.message==='string').map(x=>({
   id:chars(x.id||uid(),90),source:chars(x.source,80),message:chars(x.message,190),
   severity:['ok','warning','down','unknown'].includes(x.severity)?x.severity:'unknown',
   createdAt:Number.isFinite(x.createdAt)?x.createdAt:0,signature:chars(x.signature,250)
  }));
  return {workSessions,advancedTasks:tasks,contentItems,calendarEvents,githubRepos,
   githubSelected:githubRepos.includes(obj.githubSelected)?obj.githubSelected:(githubRepos[0]||''),
   githubCache,pulseSettings,pulseCache,operationalAlerts};
 }

function normalize(obj){
 if(!obj||typeof obj!=='object') throw Error('Invalid dashboard data.');
 if(Array.isArray(obj.modules)&&!Array.isArray(obj.pages))obj={...obj,version:2,theme:'midnight',accent:'#4a8df5',activePage:'overview',pages:[{id:'overview',title:'Overview',modules:obj.modules}]};
 if(!Array.isArray(obj.pages))throw Error('No workspace pages found.');
 const ids=new Set(),pids=new Set();
 const pages=obj.pages.slice(0,15).filter(x=>x&&typeof x==='object'&&Array.isArray(x.modules)).map(p=>{
  const id=typeof p.id==='string'&&/^[\w-]{1,60}$/.test(p.id)&&!pids.has(p.id)?p.id:uid();pids.add(id);
  return {id,title:cleanText(p.title||'Workspace',45),modules:p.modules.slice(0,80).map(x=>sanitizeModule(x,ids)).filter(Boolean)};
 });
 if(!pages.length)pages.push(defaultPage('overview','Overview',[]));
 const projects=(Array.isArray(obj.projects)?obj.projects:defaultProjects()).slice(0,60).filter(x=>x&&typeof x.name==='string').map(x=>({id:cleanText(x.id||uid(),90),name:cleanText(x.name,80),url:validUrl(x.url)?cleanText(x.url,1000):'',status:cleanText(x.status||'Tracked',40)}));
  const captures=(Array.isArray(obj.captures)?obj.captures:[]).slice(0,40).filter(x=>x&&typeof x.title==='string').map(x=>({id:cleanText(x.id||uid(),90),title:cleanText(x.title,140),url:validUrl(x.url)?cleanText(x.url,1000):'',note:cleanText(x.note||'',1100),project:cleanText(x.project||'',90),createdAt:Number.isFinite(x.createdAt)?x.createdAt:Date.now()}));
  const layoutSnapshots=(Array.isArray(obj.layoutSnapshots)?obj.layoutSnapshots:[]).slice(0,12).filter(x=>x&&typeof x.name==='string'&&Array.isArray(x.widgets)).map(x=>({id:cleanText(x.id||uid(),90),name:cleanText(x.name,70),pageId:cleanText(x.pageId||'',90),widgets:x.widgets.slice(0,80).filter(w=>w&&typeof w.id==='string').map(w=>({id:cleanText(w.id,90),cols:Number.isInteger(w.cols)?Math.max(1,Math.min(12,w.cols)):4,height:Number.isFinite(w.height)?Math.max(0,Math.min(1000,w.height)):0}))}));
  return {...normalizeOperations(obj),projects,captures,layoutSnapshots,version:2,brand:cleanText(obj.brand||'Omnidite Desk',55),searchEngine:['google','duckduckgo','bing'].includes(obj.searchEngine)?obj.searchEngine:'google',theme:['midnight','slate','light'].includes(obj.theme)?obj.theme:'midnight',accent:/^#[0-9a-fA-F]{6}$/.test(obj.accent||'')?obj.accent:'#4a8df5',activePage:pages.some(p=>p.id===obj.activePage)?obj.activePage:pages[0].id,updatedAt:Number.isFinite(obj.updatedAt)?obj.updatedAt:Date.now(),pages};
}
function status(message,error=false){lastSync=message;const e=$('#syncStatus');if(e){e.textContent=message;e.classList.toggle('error',error);}}
async function persist(sync=true){state.updatedAt=Date.now();try{await local.set(V2,state);}catch(e){status('Local save failed: '+e.message,true);return;} if(sync&&syncEnabled)scheduleSync();}
const scheduleSync=()=>{clearTimeout(syncTimer);syncTimer=setTimeout(()=>pushSync().catch(e=>status('Sync failed: '+e.message,true)),5000);};
const queueSave=()=>{clearTimeout(saveTimer);saveTimer=setTimeout(()=>persist(),700);};
function change(renderAll=true){clearTimeout(saveTimer);persist();if(renderAll)render();}
// Sync uses ≤16 * 4.5KB UTF-8 binary chunks encoded as base64 (per-item quota 8KB).
function b64(bytes){let s='';for(let i=0;i<bytes.length;i+=4096)s+=String.fromCharCode(...bytes.subarray(i,i+4096));return btoa(s);}
function unb64(s){const bin=atob(s);return Uint8Array.from(bin,c=>c.charCodeAt(0));}
function checksum(bytes){let h=2166136261;for(const b of bytes)h=Math.imul(h^b,16777619);return h>>>0;}
async function pushSync(){
 if(!syncEnabled||!chrome?.storage?.sync)return;
 const bytes=new TextEncoder().encode(JSON.stringify(state));
 if(bytes.length>72000){status('Sync paused: dashboard exceeds 72KB. Local data is safe.',true);return;}
 const fragments=[];for(let i=0;i<bytes.length;i+=4500)fragments.push(b64(bytes.subarray(i,i+4500)));
 if(fragments.length>16){status('Sync limit reached. Export a backup.',true);return;}
 const obj={};fragments.forEach((v,i)=>obj[CHUNK+i]=v);
 // Metadata published last; readers will only accept a complete matching snapshot.
 try{
  await chrome.storage.sync.set(obj);
  const previous=(await chrome.storage.sync.get(SYNC_META))[SYNC_META];
  await chrome.storage.sync.set({[SYNC_META]:{count:fragments.length,checksum:checksum(bytes),updatedAt:state.updatedAt,revision:(previous?.revision||0)+1}});
  if(previous?.count>fragments.length)await chrome.storage.sync.remove(Array.from({length:previous.count-fragments.length},(_,i)=>CHUNK+(fragments.length+i)));
  status('Synced · '+new Date().toLocaleTimeString());
 }catch(e){status('Sync rejected: '+e.message,true);}
}
async function pullSync(initial=false,force=false){
 if(!syncEnabled||!chrome?.storage?.sync)return;
 const meta=(await chrome.storage.sync.get(SYNC_META))[SYNC_META];
 if(!meta||!Number.isInteger(meta.count)||meta.count<1||meta.count>16)return;
 if(!initial&&!force&&meta.updatedAt<=state.updatedAt)return;
 const keys=Array.from({length:meta.count},(_,i)=>CHUNK+i);
 const res=await chrome.storage.sync.get(keys);if(keys.some(k=>typeof res[k]!=='string'))return;
 const parts=keys.map(k=>unb64(res[k]));const bytes=new Uint8Array(parts.reduce((n,a)=>n+a.length,0));let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}
 if(checksum(bytes)!==meta.checksum)return;
 const incoming=normalize(JSON.parse(new TextDecoder().decode(bytes)));
 if(!force&&incoming.updatedAt<=state.updatedAt)return;
 applyingRemote=true;state=incoming;await local.set(V2,state);applyingRemote=false;render();status('Received synced changes');
}
const modal=$('#modal'), modalInner=$('#modalInner');
function show(html){modalInner.innerHTML=html;if(!modal.open)modal.showModal();}
function close(){if(modal.open)modal.close();}
const header=(title,detail)=>`<div class="modal-top"><div><span class="eyebrow">OMNIDITE / DESK</span><h2 id="modalTitle">${esc(title)}</h2><p>${esc(detail)}</p></div><button class="modal-close" data-modal="close">✕</button></div>`;
function gallery(){show(`<div class="modal-pad">${header('Widget library','Add any module to the current workspace.')}<div class="modal-grid">${TYPES.map(t=>`<button type="button" class="module-option" data-modal="add" data-type="${t}"><span class="module-icon">${META[t][0]}</span><strong>${esc(META[t][1])}</strong><small>${esc(META[t][2])}</small></button>`).join('')}</div></div>`);}
function linkRow(l={label:'',url:''}){return `<div class="editlink"><input class="modal-input link-label" placeholder="Name" value="${esc(l.label)}"><input class="modal-input link-url" placeholder="https://example.com" value="${esc(l.url)}"><button type="button" data-modal="remove-row">×</button></div>`;}
function editModule(id){const m=moduleFor(id);if(!m)return;
 show(`<form class="modal-pad" id="editForm" data-id="${esc(id)}">${header('Edit widget','Change its name, size, options, or workspace.')}<label class="label">Title</label><input class="modal-input" name="title" maxlength="80" required value="${esc(m.title)}">
 <label class="label">Workspace</label><select class="modal-input" name="page">${state.pages.map(p=>`<option value="${esc(p.id)}" ${p.modules.includes(m)?'selected':''}>${esc(p.title)}</option>`).join('')}</select>
 <label class="label">Width</label><select class="modal-input" name="cols">${Array.from({length:12},(_,i)=>i+1).map(n=>`<option value="${n}" ${m.cols===n?'selected':''}>${n}/12 columns</option>`).join('')}</select>
 ${LIST_TYPES.has(m.type)?`<label class="label">Items per row</label><select class="modal-input" name="innerColumns">${Array.from({length:6},(_,i)=>i+1).map(n=>`<option value="${n}" ${layoutColumns(m.config.columns,defaultInnerColumns(m.type))===n?'selected':''}>${n} ${n===1?'item':'items'} per row</option>`).join('')}</select><p class="helper">Make the widget wider to fit more items; narrow panels stack them automatically.</p>`:''}
 ${m.type==='links'?`<label class="label">Links</label><div id="editLinks">${m.config.links.map(linkRow).join('')}</div><button type="button" class="smallbutton" data-modal="add-link">＋ Add link</button>`:''}
 ${m.type==='countdown'?`<label class="label">Deadline</label><input class="modal-input" type="date" name="target" value="${esc(m.config.target)}"><label class="label">Label</label><input class="modal-input" name="label" value="${esc(m.config.label)}">`:''}
 ${m.type==='metric'?`<label class="label">Unit</label><input class="modal-input" name="unit" value="${esc(m.config.unit)}"><label class="label">Increment step</label><input class="modal-input" type="number" step="any" name="step" value="${esc(m.config.step)}">`:''}
 <div class="modal-actions"><button type="submit" class="button primary">Save widget</button><button type="button" class="button ghost danger" data-modal="delete-widget" data-id="${esc(id)}">Delete widget</button></div></form>`);
}
function settings(){show(`<div class="modal-pad">${header('Desk settings','Personalize the dashboard and control data sync.')}<form id="settingsForm">
 <label class="label">Dashboard name</label><input class="modal-input" name="brand" maxlength="55" value="${esc(state.brand)}" required>
 <label class="label">Theme</label><select class="modal-input" name="theme">${[['midnight','Midnight navy'],['slate','Slate'],['light','Light']].map(([v,t])=>`<option value="${v}" ${state.theme===v?'selected':''}>${t}</option>`).join('')}</select>
 <label class="label">Accent color</label><input type="color" class="color-picker" name="accent" value="${esc(state.accent)}">
 <label class="label">Search</label><select class="modal-input" name="searchEngine">${['google','duckduckgo','bing'].map(v=>`<option value="${v}" ${v===state.searchEngine?'selected':''}>${v}</option>`).join('')}</select>
 <div class="modal-actions"><button type="submit" class="button primary">Save preferences</button></div></form>
 <hr class="settings-divider"><div class="eyebrow">SYNC BETWEEN COMPUTERS</div>
 <label class="sync-label"><input type="checkbox" id="syncToggle" ${syncEnabled?'checked':''}> Enable Chrome Sync (opt-in)</label>
 <p class="helper">Requires Chrome signed in with extension sync enabled and the same Omnidite Desk extension ID on both computers. Data, including notes and tasks, may be uploaded to your Chrome Sync account. Last-write-wins; don't edit simultaneously on two devices. Max ~72 KB of raw dashboard data.</p>
 <div class="modal-actions"><button type="button" data-modal="push-sync" class="button ghost" ${!syncEnabled?'disabled':''}>↑ Sync now</button><button type="button" data-modal="pull-sync" class="button ghost" ${!syncEnabled?'disabled':''}>↓ Pull latest</button></div><p id="syncStatus" class="helper">${esc(lastSync)}</p>
 <hr class="settings-divider"><div class="eyebrow">BACKGROUNDS</div><p class="helper">Upload or import wallpaper folders. Images remain only on this device.</p><button type="button" class="smallbutton" data-modal="backgrounds">Manage backgrounds</button><hr class="settings-divider"><div class="eyebrow">BACKUPS</div><p class="helper">Store backups somewhere safe before resetting or removing the extension. Code on GitHub does not contain your personal data.</p>
 <div class="modal-actions"><button type="button" class="button ghost" data-modal="export">↓ Export JSON</button><button type="button" class="button ghost" data-modal="import">↑ Import JSON</button><button type="button" class="button ghost danger" data-modal="reset">Reset</button></div></div>`);}
function pageDialog(edit=false){const p=page();show(`<form id="pageForm" class="modal-pad" data-edit="${edit?'yes':'no'}">${header(edit?'Edit workspace':'New workspace',edit?'Rename this page or remove it.':'Create another dashboard page for a different focus.')}<label class="label">Workspace title</label><input name="title" class="modal-input" required maxlength="45" value="${edit?esc(p.title):''}" placeholder="e.g. Operations"><div class="modal-actions"><button class="button primary" type="submit">${edit?'Save name':'Create workspace'}</button>${edit&&state.pages.length>1?'<button type="button" class="button ghost danger" data-modal="delete-page">Delete workspace</button>':''}</div></form>`);}
const quotes=[['The secret of getting ahead is getting started.','Mark Twain'],['It always seems impossible until it’s done.','Nelson Mandela'],['Simplicity is the ultimate sophistication.','Often attributed to Leonardo da Vinci'],['The best way out is always through.','Robert Frost']];

 const citySearchResults=new Map();
 function defaultClockCities(){return [
  {id:'sg',name:'Singapore',country:'Singapore',timezone:'Asia/Singapore',latitude:1.3521,longitude:103.8198},
  {id:'hou',name:'Houston',country:'United States',timezone:'America/Chicago',latitude:29.7604,longitude:-95.3698},
  {id:'utc',name:'UTC',country:'Reference',timezone:'UTC',latitude:0,longitude:0}
 ];}
 function defaultWeatherCities(){return [
  {id:'sg',name:'Singapore',country:'Singapore',timezone:'Asia/Singapore',latitude:1.3521,longitude:103.8198},
  {id:'hou',name:'Houston',country:'United States',timezone:'America/Chicago',latitude:29.7604,longitude:-95.3698}
 ];}
 function sanitizeCities(value,kind){
  const raw=Array.isArray(value)?value:(kind==='clock'?defaultClockCities():defaultWeatherCities());
  return raw.slice(0,kind==='clock'?24:15).filter(c=>c&&typeof c==='object').map(c=>{
   const timezone=String(c.timezone||'UTC');
   try{new Intl.DateTimeFormat('en-US',{timeZone:timezone});}catch{return null;}
   const latitude=Number(c.latitude),longitude=Number(c.longitude);
   if(!Number.isFinite(latitude)||Math.abs(latitude)>90||!Number.isFinite(longitude)||Math.abs(longitude)>180)return null;
   return {id:cleanText(String(c.id||uid()),90),name:cleanText(c.name||'City',80),
    country:cleanText(c.country||'',80),timezone:cleanText(timezone,90),latitude,longitude};
  }).filter(Boolean);
 }
 function cityPicker(m){
  return `<form class="city-search" data-city-search="${esc(m.id)}">
   <input name="city" type="search" minlength="2" maxlength="100" placeholder="Search for a city…" aria-label="City name" required>
   <button class="smallbutton" type="submit">Find city</button></form>
   <div class="city-results" data-city-results="${esc(m.id)}" role="status" aria-live="polite"></div>`;
 }
 function timeOffset(date,zone){
  try{const label=new Intl.DateTimeFormat('en-US',{timeZone:zone,timeZoneName:'shortOffset'}).formatToParts(date).find(x=>x.type==='timeZoneName')?.value||'GMT';
   const match=label.match(/^(?:GMT|UTC)([+-])(\d{1,2})(?::(\d{2}))?$/);
   if(!match)return 0;
   return (match[1]==='-'?-1:1)*(Number(match[2])*60+Number(match[3]||0));
  }catch{return 0;}
 }
 function offsetLabel(date,zone){
  const mins=timeOffset(date,zone)+date.getTimezoneOffset();
  const abs=Math.abs(mins);const hours=Math.floor(abs/60),minutes=abs%60;
  return (mins>=0?'+':'−')+hours+(minutes?':'+String(minutes).padStart(2,'0'):'')+'h from you';
 }
 function renderWorldClocks(m){
  const cities=m.config.cities||[];
  return `<p class="module-sub">ANALOG + DIGITAL · ${cities.length} CITIES · RELATIVE TO YOUR DEVICE TIME</p>
   <div ${widgetGrid(m,'worldclocks')}>${cities.map((c,i)=>`<div class="clock-city" data-item-drop-mid="${esc(m.id)}" data-item-drop-index="${i}" data-clock-city="${esc(c.timezone)}">
    <div class="analog-face" aria-hidden="true"><span class="analog-tick tick-12"></span><span class="analog-tick tick-3"></span><span class="analog-tick tick-6"></span><span class="analog-tick tick-9"></span>
     <i class="hand hour-hand"></i><i class="hand minute-hand"></i><i class="hand second-hand"></i><b class="clock-pin"></b></div>
    <div class="clock-information"><div class="clock-city-name">${esc(c.name)} <span>${esc(c.country)}</span></div>
    <div class="clock-time" data-clock-time="${esc(c.timezone)}">--:--:--</div>
    <div class="clock-date" data-clock-date="${esc(c.timezone)}">—</div>
    <div class="clock-diff" data-clock-offset="${esc(c.timezone)}">—</div></div>
    <div class="desk-clock-actions">${itemOrderButtons(m.id,i,cities.length)}<button class="city-remove" title="Remove city" aria-label="Remove ${esc(c.name)}" data-city-remove="${esc(c.id)}" data-city-mid="${esc(m.id)}">×</button></div>
    </div>`).join('')||'<p class="empty-note">Search for a city below to add your first clock.</p>'}</div>${cityPicker(m)}`;
 }
 function updateWorldClocks(now){
  const localOffset=now.getTimezoneOffset();
  document.querySelectorAll('[data-clock-city]').forEach(el=>{
   const zone=el.dataset.clockCity;
   try{
    const parts=new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(now);
    const n=t=>Number(parts.find(x=>x.type===t)?.value||0);
    const h=n('hour'),m=n('minute'),s=n('second');
    const tm=el.querySelector('[data-clock-time]'),dt=el.querySelector('[data-clock-date]'),off=el.querySelector('[data-clock-offset]');
    if(tm)tm.textContent=parts.filter(p=>['hour','minute','second','literal'].includes(p.type)).map(p=>p.value).join('');
    if(dt)dt.textContent=new Intl.DateTimeFormat('en-US',{timeZone:zone,weekday:'short',year:'numeric',month:'short',day:'numeric'}).format(now);
    if(off)off.textContent=offsetLabel(now,zone);
    for(const [selector,degrees] of [['.hour-hand',(h%12+m/60)*30],['.minute-hand',(m+s/60)*6],['.second-hand',s*6]]){
     const hand=el.querySelector(selector);if(hand)hand.style.transform=`translate(-50%,-100%) rotate(${degrees}deg)`;
    }
   }catch{const tm=el.querySelector('[data-clock-time]');if(tm)tm.textContent='Time unavailable';}
  });
 }
 async function findCities(mid,query){
  const resultEl=document.querySelector(`[data-city-results="${CSS.escape(mid)}"]`);if(!resultEl)return;
  resultEl.textContent='Searching cities…';
  try{
   const url='https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(query)+'&count=8&language=en&format=json';
   const response=await fetch(url,{signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('City search unavailable');
   const data=await response.json();
   const list=(data.results||[]).filter(c=>c.timezone&&Number.isFinite(c.latitude)&&Number.isFinite(c.longitude)).map(c=>({
    id:String(c.id),name:String(c.name),country:String([c.admin1,c.country].filter(Boolean).join(', ')),timezone:String(c.timezone),latitude:c.latitude,longitude:c.longitude
   }));
   citySearchResults.set(mid,list);
   // Ignore stale results when a workspace has been changed.
   const el=document.querySelector(`[data-city-results="${CSS.escape(mid)}"]`);if(!el)return;
   el.innerHTML=list.length?list.map((c,i)=>`<button class="city-result" type="button" data-city-add="${i}" data-city-mid="${esc(mid)}"><strong>${esc(c.name)}</strong><small>${esc(c.country)} · ${esc(c.timezone)}</small><span>＋</span></button>`).join(''):'<p class="empty-note">No matching cities. Try adding a country after a comma.</p>';
  }catch(e){const el=document.querySelector(`[data-city-results="${CSS.escape(mid)}"]`);if(el)el.textContent='Could not search cities. Check your connection and try again.';}
 }
 document.addEventListener('submit',e=>{
  const form=e.target.closest('[data-city-search]');if(!form)return;
  e.preventDefault();findCities(form.dataset.citySearch,form.elements.city.value.trim());
 });
 document.addEventListener('click',e=>{
  const add=e.target.closest('[data-city-add]'),del=e.target.closest('[data-city-remove]');
  if(add){
   const mid=add.dataset.cityMid,m=moduleFor(mid);if(!m||!['clock','weather'].includes(m.type))return;
   const city=citySearchResults.get(mid)?.[Number(add.dataset.cityAdd)];if(!city)return;
   if((m.config.cities||[]).some(c=>c.id===city.id||c.timezone===city.timezone&&c.name===city.name))return;
   if(m.config.cities.length>=(m.type==='clock'?24:15)){alert('Maximum cities reached for this widget.');return;}
   m.config.cities.push({...city});
   if(m.type==='weather')m.config.selected=city.id;
   change();return;
  }
  if(del){
   const m=moduleFor(del.dataset.cityMid);if(!m||!m.config.cities)return;
   m.config.cities=m.config.cities.filter(c=>c.id!==del.dataset.cityRemove);
   if(m.type==='weather'&&!m.config.cities.some(c=>c.id===m.config.selected))m.config.selected=m.config.cities[0]?.id||'';
   change();
  }
 });


 const weatherCache=new Map(),weatherInFlight=new Map();
 function weatherCondition(code,day=true){
  if(code===0)return [day?'☀️':'🌙','Clear'];
  if([1,2].includes(code))return ['🌤️','Partly cloudy'];
  if(code===3)return ['☁️','Overcast'];
  if([45,48].includes(code))return ['🌫️','Fog'];
  if([51,53,55,56,57].includes(code))return ['🌦️','Drizzle'];
  if([61,63,65,66,67,80,81,82].includes(code))return ['🌧️','Rain'];
  if([71,73,75,77,85,86].includes(code))return ['❄️','Snow'];
  if([95,96,99].includes(code))return ['⛈️','Thunderstorm'];
  return ['🌡️','Conditions'];
 }
 function temperature(n){return Number.isFinite(n)?Math.round(n)+'°C':'—';}
 function renderWeatherModule(m){
  const c=m.config,cs=c.cities||[];
  return `<p class="module-sub">LIVE CONDITIONS · UPDATED ABOUT EVERY 15 MINUTES · OPEN-METEO</p>
   <div class="weather-city-bar">${cs.map(city=>`<button class="weather-city-pill ${c.selected===city.id?'selected':''}" type="button" data-weather-select="${esc(city.id)}" data-weather-mid="${esc(m.id)}">${esc(city.name)}</button>`).join('')}</div>
   <div class="weather-tabs">${[['now','Now'],['hourly','Hourly'],['daily','7 days']].map(([v,label])=>`<button type="button" class="${c.view===v?'selected':''}" data-weather-view="${v}" data-weather-mid="${esc(m.id)}">${label}</button>`).join('')}</div>
   <div class="weather-content" data-weather-content="${esc(m.id)}"><p class="empty-note">Loading live forecasts…</p></div>
   <div class="weather-city-management">${cityPicker(m)}<div class="weather-remove-list">${cs.map((city,i)=>`<span>${esc(city.name)} ${itemOrderButtons(m.id,i,cs.length)} <button type="button" data-city-remove="${esc(city.id)}" data-city-mid="${esc(m.id)}" aria-label="Remove ${esc(city.name)}">×</button></span>`).join('')}</div></div>`;
 }
 function weatherRequest(city){
  const key=city.latitude.toFixed(4)+','+city.longitude.toFixed(4);
  const old=weatherCache.get(key);
  if(old&&Date.now()-old.at<15*60*1000)return Promise.resolve(old.data);
  if(weatherInFlight.has(key))return weatherInFlight.get(key);
  const url=new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude',city.latitude);
  url.searchParams.set('longitude',city.longitude);
  url.searchParams.set('timezone',city.timezone);
  url.searchParams.set('forecast_days','7');
  url.searchParams.set('current','temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m');
  url.searchParams.set('hourly','temperature_2m,precipitation_probability,weather_code');
  url.searchParams.set('daily','weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max');
  const work=fetch(url.toString(),{signal:AbortSignal.timeout(15000)}).then(async r=>{
   if(!r.ok)throw Error('Weather service HTTP '+r.status);
   const data=await r.json();
   if(!data.current||!data.hourly||!data.daily)throw Error('Incomplete forecast');
   weatherCache.set(key,{at:Date.now(),data});return data;
  }).catch(e=>{if(old)return old.data;throw e;}).finally(()=>weatherInFlight.delete(key));
  weatherInFlight.set(key,work);return work;
 }
 function weatherTile(city,data,mid,i,total){
  const w=data.current||{},[symbol,label]=weatherCondition(w.weather_code,!!w.is_day);
  return `<div class="weather-now" data-item-drop-mid="${esc(mid)}" data-item-drop-index="${i}"><div class="weather-main"><div class="weather-symbol">${symbol}</div><div><strong>${esc(city.name)}</strong><div class="weather-reading">${temperature(w.temperature_2m)}</div><div class="weather-desc">${label}</div></div></div>
   <div class="desk-weather-actions">${itemOrderButtons(mid,i,total)}</div><div class="weather-stats"><span>Feels like <strong>${temperature(w.apparent_temperature)}</strong></span><span>Humidity <strong>${Number.isFinite(w.relative_humidity_2m)?w.relative_humidity_2m+'%':'—'}</strong></span><span>Wind <strong>${Number.isFinite(w.wind_speed_10m)?Math.round(w.wind_speed_10m)+' km/h':'—'}</strong></span></div></div>`;
 }
 function weatherForecast(data,view){
  if(view==='hourly'){
   const h=data.hourly||{},current=(data.current?.time||'').slice(0,13);
   const rows=(h.time||[]).map((t,i)=>({t,i})).filter(x=>x.t.slice(0,13)>=current).slice(0,24);
   return `<div class="forecast-list">${rows.map(({t,i})=>{
    const [sym,label]=weatherCondition(h.weather_code?.[i]);const hour=t.slice(11,16);
    return `<div class="forecast-row"><span>${esc(t.slice(5,10))} ${esc(hour)}</span><span title="${esc(label)}">${sym}</span><strong>${temperature(h.temperature_2m?.[i])}</strong><small>☂ ${Number.isFinite(h.precipitation_probability?.[i])?h.precipitation_probability[i]+'%':'—'}</small></div>`;
   }).join('')}</div>`;
  }
  const d=data.daily||{};
  return `<div class="forecast-list">${(d.time||[]).slice(0,7).map((date,i)=>{
   const [sym,label]=weatherCondition(d.weather_code?.[i]);
   const readable=new Date(date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
   return `<div class="forecast-row"><span>${esc(readable)}</span><span title="${esc(label)}">${sym}</span><strong>${temperature(d.temperature_2m_max?.[i])} / ${temperature(d.temperature_2m_min?.[i])}</strong><small>☂ ${Number.isFinite(d.precipitation_probability_max?.[i])?d.precipitation_probability_max[i]+'%':'—'}</small></div>`;
  }).join('')}</div>`;
 }
 async function refreshWeather(){
  for(const m of page().modules.filter(x=>x.type==='weather')){
   const panel=document.querySelector(`[data-weather-content="${CSS.escape(m.id)}"]`);if(!panel)continue;
   const cities=m.config.cities||[];
   if(!cities.length){panel.innerHTML='<p class="empty-note">Search for cities below to start tracking live weather.</p>';continue;}
   const selected=cities.find(x=>x.id===m.config.selected)||cities[0];
   const view=m.config.view||'now';
   try{
    if(view==='now'){
     const all=await Promise.allSettled(cities.map(weatherRequest));
     const current=moduleFor(m.id),livePanel=document.querySelector(`[data-weather-content="${CSS.escape(m.id)}"]`);
     if(!current||!livePanel||current.config.view!==view)return;
     livePanel.innerHTML=`<div ${widgetGrid(current,'weather-now-grid')}>${all.map((res,i)=>res.status==='fulfilled'?weatherTile(cities[i],res.value,current.id,i,cities.length):`<div class="weather-error">${esc(cities[i].name)}: weather unavailable</div>`).join('')}</div>`;
    }else{
     const data=await weatherRequest(selected);
     const current=moduleFor(m.id),livePanel=document.querySelector(`[data-weather-content="${CSS.escape(m.id)}"]`);
     if(!current||!livePanel||current.config.view!==view||(current.config.selected||cities[0].id)!==selected.id)return;
     livePanel.innerHTML=`<div class="weather-forecast-head"><strong>${esc(selected.name)}</strong><span>${view==='hourly'?'Next 24 hours':'Next 7 days'}</span></div>`+weatherForecast(data,view);
    }
   }catch(e){const currentPanel=document.querySelector(`[data-weather-content="${CSS.escape(m.id)}"]`);if(currentPanel)currentPanel.innerHTML='<p class="weather-error">Weather unavailable. Check your connection and try again.</p>';}
  }
 }
 document.addEventListener('click',e=>{
  const tab=e.target.closest('[data-weather-view]'),city=e.target.closest('[data-weather-select]');
  if(tab){const m=moduleFor(tab.dataset.weatherMid);if(m){m.config.view=tab.dataset.weatherView;change();}}
  if(city){const m=moduleFor(city.dataset.weatherMid);if(m){m.config.selected=city.dataset.weatherSelect;change();}}
 });
 setInterval(()=>{if(page().modules.some(m=>m.type==='weather'))refreshWeather();},15*60*1000);


 function siteFavicon(url){
  if(typeof chrome==='undefined'||!chrome.runtime?.getURL)return '';
  try{const u=new URL(chrome.runtime.getURL('/_favicon/'));u.searchParams.set('pageUrl',url);u.searchParams.set('size','32');return u.toString();}catch{return '';}
 }
 function renderLinkModule(m){
  const list=m.config.links||[];
  return `<p class="module-sub">QUICK ACCESS · ${list.length} LINKS</p><div ${widgetGrid(m,'linkgrid')}>${list.map((l,i)=>{
   const icon=siteFavicon(l.url);
   return `<div class="desk-launch-item" data-item-drop-mid="${esc(m.id)}" data-item-drop-index="${i}"><a class="launch" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer"><span class="launch-icon">${icon?`<img class="site-favicon" src="${esc(icon)}" alt="" loading="lazy">`:''}<span class="launch-initial">${esc(l.label[0]?.toUpperCase()||'↗')}</span></span><span class="launch-name">${esc(l.label)}</span><span class="launch-arrow">↗</span></a>${itemOrderButtons(m.id,i,list.length)}</div>`;
  }).join('')||'<p class="empty-note">Edit to add a link.</p>'}</div>`;
 }
 function renderFocusModule(m){
  const c=m.config,minutes=Math.round((c.duration||1500)/60);
  return `<p class="module-sub">FOCUS SPRINT · CHOOSE YOUR DURATION</p><div class="focus-display" data-timer="${esc(m.id)}">--:--</div>
   <div class="focus-presets">${[15,25,45,60].map(v=>`<button type="button" class="${minutes===v?'selected':''}" data-focus-preset="${v}" data-focus-mid="${esc(m.id)}">${v} min</button>`).join('')}</div>
   <form class="focus-custom" data-focus-custom="${esc(m.id)}"><label for="focus-minutes-${esc(m.id)}">Custom minutes</label><input id="focus-minutes-${esc(m.id)}" name="minutes" aria-label="Custom focus minutes" type="number" min="1" max="240" step="1" value="${minutes}" required><button class="smallbutton">Set</button></form>
   <div class="focus-controls"><button class="smallbutton" data-action="focus-toggle" data-mid="${esc(m.id)}">${c.until?'Pause':'Start'}</button><button class="smallbutton" data-action="focus-reset" data-mid="${esc(m.id)}">Reset</button></div>
   ${!c.until&&c.seconds===0?'<p class="focus-complete" role="status">✓ Focus session complete</p>':''}
   <div class="focus-audio-controls"><div class="focus-audio-row"><label for="focus-sound-${esc(m.id)}">End sound</label><select class="modal-input" id="focus-sound-${esc(m.id)}" data-focus-sound="${esc(m.id)}">${[['chime','Gentle chime'],['soft','Soft piano-like tones'],['bell','Classic bell'],['digital','Digital beep'],['custom','My uploaded sound'],['none','Silent']].map(([v,label])=>`<option value="${v}" ${(c.sound||'chime')===v?'selected':''}>${label}</option>`).join('')}</select><button type="button" class="smallbutton" data-focus-preview="${esc(m.id)}">▷ Preview</button></div>
   <div class="focus-audio-row"><label for="focus-volume-${esc(m.id)}">Volume</label><input id="focus-volume-${esc(m.id)}" data-focus-volume="${esc(m.id)}" type="range" min="0" max="100" value="${c.volume??70}" aria-label="Alarm volume"><button type="button" class="smallbutton" data-focus-upload="${esc(m.id)}">↑ Upload sound</button></div>
   <input type="file" accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/ogg,.mp3,.wav,.ogg" data-focus-file="${esc(m.id)}" hidden><p class="focus-audio-note">Alarm works when Desk stays open. Uploaded audio is kept locally in this Chrome profile (maximum 1 MB), never in Chrome Sync.</p></div>`;
 }
 function setFocusDuration(mid,mins){
  const m=moduleFor(mid);if(!m||m.type!=='focus')return;
  const n=Math.round(Number(mins));if(!Number.isFinite(n)||n<1||n>240){alert('Choose a timer between 1 and 240 minutes.');return;}
  m.config.duration=n*60;m.config.seconds=n*60;m.config.until=null;change();
 }
 document.addEventListener('submit',e=>{
  const form=e.target.closest('[data-focus-custom]');if(!form)return;
  e.preventDefault();setFocusDuration(form.dataset.focusCustom,form.elements.minutes.value);
 });
 document.addEventListener('click',e=>{
  const preset=e.target.closest('[data-focus-preset]');if(preset)setFocusDuration(preset.dataset.focusMid,preset.dataset.focusPreset);
 });
 document.addEventListener('click',e=>{
   const upload=e.target.closest('[data-focus-upload]'),preview=e.target.closest('[data-focus-preview]');
   if(upload)document.querySelector('[data-focus-file="'+CSS.escape(upload.dataset.focusUpload)+'"]')?.click();
   if(preview){const m=moduleFor(preview.dataset.focusPreview);if(m?.type==='focus')window.DeskFocusAudio?.play(m.config.sound||'chime',m.config.volume??70,m.id);}
  });
  document.addEventListener('change',async e=>{
   const sound=e.target.closest('[data-focus-sound]'),volume=e.target.closest('[data-focus-volume]'),file=e.target.closest('[data-focus-file]');
   if(sound){const m=moduleFor(sound.dataset.focusSound);if(m?.type==='focus'&&['chime','soft','bell','digital','custom','none'].includes(sound.value)){m.config.sound=sound.value;change();}}
   if(volume){const m=moduleFor(volume.dataset.focusVolume);if(m?.type==='focus'){m.config.volume=Math.min(100,Math.max(0,Number(volume.value)||0));change(false);}}
   if(file&&file.files?.[0]){
    const m=moduleFor(file.dataset.focusFile);if(!m||m.type!=='focus')return;
    try{await window.DeskFocusAudio?.upload(m.id,file.files[0]);m.config.sound='custom';change();}
    catch(err){alert('Could not save alarm sound: '+err.message);}
   }
  });
  document.addEventListener('error',e=>{
  if(e.target?.classList?.contains('site-favicon'))e.target.style.display='none';
 },true);



 const wallpaperKey='odWallpapersPrefs',folderStoreKey='connected-wallpaper-folder';
 let wallpaperPrefs={selected:null,source:'gallery',folderFile:null,rotate:false,interval:15};
 let wallpaperUrl=null,wallpaperPreviews=[],wallpaperLastSwitch=Date.now();
 let folderHandle=null,folderFiles=[],folderStatus='',folderPage=0,lastFolderScan=0,wallpaperGeneration=0;
 function wallpaperDatabase(){
  return new Promise((resolve,reject)=>{
   const request=indexedDB.open('omnidite-desk-wallpapers',2);
   request.onupgradeneeded=()=>{
    if(!request.result.objectStoreNames.contains('images'))request.result.createObjectStore('images',{keyPath:'id'});
    if(!request.result.objectStoreNames.contains('handles'))request.result.createObjectStore('handles',{keyPath:'id'});
   };
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(request.error||Error('Wallpaper storage unavailable'));
  });
 }
 async function dbAction(table,method,payload){
  const db=await wallpaperDatabase();
  return new Promise((resolve,reject)=>{
   const tx=db.transaction(table,method==='list'||method==='get'?'readonly':'readwrite');
   const store=tx.objectStore(table);
   const request=method==='list'?store.getAll():method==='get'?store.get(payload):method==='delete'?store.delete(payload):store.put(payload);
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(request.error||Error('Storage operation failed'));
   tx.oncomplete=()=>db.close();tx.onabort=()=>db.close();
  });
 }
 const wallpaperStore=(method,payload)=>dbAction('images',method,payload);
 const handleStore=(method,payload)=>dbAction('handles',method,payload);
 function clearWallpaperPreviews(){for(const url of wallpaperPreviews)URL.revokeObjectURL(url);wallpaperPreviews=[];}
 async function saveWallpaperPrefs(){await local.set(wallpaperKey,wallpaperPrefs);}
 async function connectedFolderPermission(interactive=false){
  if(!folderHandle)return false;
  try{
   const granted=await folderHandle.queryPermission({mode:'read'});
   if(granted==='granted')return true;
   if(interactive)return (await folderHandle.requestPermission({mode:'read'}))==='granted';
  }catch(e){folderStatus='Unable to check folder permission: '+e.message;}
  return false;
 }
 async function scanConnectedFolder(){
  lastFolderScan=Date.now();
  if(!folderHandle){folderFiles=[];folderStatus='No live folder connected.';return false;}
  if(!await connectedFolderPermission()){
   folderFiles=[];
   folderStatus='Permission needed. Click Reauthorize folder to restore read-only access.';
   return false;
  }
  try{
   const files=[];
   let seen=0;
   for await(const entry of folderHandle.values()){
    if(++seen>4000)break;
    if(entry.kind==='file'&&/\.(png|jpe?g|webp|bmp|gif|avif)$/i.test(entry.name))files.push(entry.name);
   }
   folderFiles=files.sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).slice(0,200);
   folderStatus=folderFiles.length?`${folderFiles.length} images available · last checked ${new Date().toLocaleTimeString()}`:
    'No supported images found in this folder (top level only).';
   return true;
  }catch(e){
   folderFiles=[];folderStatus='Folder temporarily unavailable. Check that Google Drive for desktop is running. '+e.message;
   return false;
  }
 }
 async function shrinkWallpaper(file){
  const image=await createImageBitmap(file);
  const ratio=Math.min(1,1920/Math.max(image.width,image.height));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(image.width*ratio));
  canvas.height=Math.max(1,Math.round(image.height*ratio));
  canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
  image.close();
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Could not optimize image')),'image/jpeg',.82));
 }
 function installWallpaperBlob(blob,generation){
  if(generation!==wallpaperGeneration)return;
  const next=URL.createObjectURL(blob),previous=wallpaperUrl;
  wallpaperUrl=next;
  document.body.style.backgroundImage=`linear-gradient(90deg,rgba(6,13,26,.82),rgba(6,13,26,.68)),url("${next}")`;
  document.body.classList.add('has-wallpaper');
  if(previous)URL.revokeObjectURL(previous);
 }
 function removeWallpaperStyle(){
  if(wallpaperUrl){URL.revokeObjectURL(wallpaperUrl);wallpaperUrl=null;}
  document.body.classList.remove('has-wallpaper');document.body.style.backgroundImage='';
 }
 async function applyWallpaper(){
  const generation=++wallpaperGeneration;
  if(wallpaperPrefs.source==='folder'&&wallpaperPrefs.folderFile){
   try{
    if(!await connectedFolderPermission())throw Error('Read permission not granted');
    const file=await(await folderHandle.getFileHandle(wallpaperPrefs.folderFile)).getFile();
    if(file.size>25*1024*1024)throw Error('Image exceeds 25MB');
    const blob=await shrinkWallpaper(file);
    if(generation!==wallpaperGeneration)return;
    installWallpaperBlob(blob,generation);
    // Small private cache keeps the last selected cloud-synced background usable offline.
    await wallpaperStore('put',{id:'__synced_folder_last',name:'Last synced folder wallpaper',blob,lastModified:file.lastModified});
    return;
   }catch(e){
    folderStatus='Could not read selected folder image: '+e.message;
    const fallback=await wallpaperStore('get','__synced_folder_last').catch(()=>null);
    if(generation!==wallpaperGeneration)return;
    if(fallback?.blob){installWallpaperBlob(fallback.blob,generation);return;}
    removeWallpaperStyle();return;
   }
  }
  const id=wallpaperPrefs.selected;
  if(!id){removeWallpaperStyle();return;}
  try{
   const item=await wallpaperStore('get',id);
   if(generation!==wallpaperGeneration)return;
   if(item?.blob)installWallpaperBlob(item.blob,generation);
   else removeWallpaperStyle();
  }catch(e){console.warn('Wallpaper unavailable',e);}
 }
 async function connectedFolderTiles(){
  if(!folderHandle||!folderFiles.length)return '';
  const start=folderPage*12;
  const current=folderFiles.slice(start,start+12);
  const tiles=await Promise.all(current.map(async name=>{
   let img='';
   try{
    const file=await(await folderHandle.getFileHandle(name)).getFile();
    if(file.size<=25*1024*1024){
     const url=URL.createObjectURL(file);wallpaperPreviews.push(url);
     img=`<img loading="lazy" src="${esc(url)}" alt="${esc(name)}">`;
    }
   }catch{}
   return `<div class="wallpaper-tile ${wallpaperPrefs.source==='folder'&&wallpaperPrefs.folderFile===name?'selected':''}">
    <button type="button" data-wallpaper-action="select-folder" data-wallpaper-name="${esc(name)}" title="Use this synced background">
    ${img||'<div class="wallpaper-placeholder">▧</div>'}<span>${esc(name)}</span></button></div>`;
  }));
  const pages=Math.ceil(folderFiles.length/12);
  return `<div class="wallpaper-grid">${tiles.join('')}</div>${pages>1?`<div class="wallpaper-pages">
   <button class="smallbutton" type="button" data-wallpaper-action="folder-prev" ${folderPage===0?'disabled':''}>← Previous</button>
   <span>Page ${folderPage+1} of ${pages}</span>
   <button class="smallbutton" type="button" data-wallpaper-action="folder-next" ${folderPage===pages-1?'disabled':''}>Next →</button></div>`:''}`;
 }
 async function wallpaperGallery(){
  try{
   const list=(await wallpaperStore('list')).filter(item=>item.id!=='__synced_folder_last');
   clearWallpaperPreviews();
   const cards=list.map(item=>{
    const url=URL.createObjectURL(item.blob);wallpaperPreviews.push(url);
    return `<div class="wallpaper-tile ${wallpaperPrefs.source==='gallery'&&wallpaperPrefs.selected===item.id?'selected':''}">
     <button type="button" data-wallpaper-action="select" data-wallpaper-id="${esc(item.id)}" title="Use this background">
     <img loading="lazy" src="${esc(url)}" alt="${esc(item.name)}"><span>${esc(item.name)}</span></button>
     <button type="button" class="wallpaper-delete" data-wallpaper-action="delete" data-wallpaper-id="${esc(item.id)}" title="Remove image">×</button></div>`;
   }).join('');
   const linked=folderHandle&&folderHandle.name;
   const permission=linked?await connectedFolderPermission():false;
   const folderTiles=permission?await connectedFolderTiles():'';
   const folderHeader=linked?`<strong>${esc(folderHandle.name)}</strong>
     <small>${esc(folderStatus||'Ready to scan for images.')}</small>`:
     `<strong>No synced folder selected</strong><small>Google Drive, OneDrive or any local picture folder.</small>`;
   show(`<div class="modal-pad">${header('Desk backgrounds','Upload images or connect a live folder from your computer or cloud drive.')}
    <div class="modal-actions"><button type="button" class="smallbutton" data-wallpaper-action="upload">＋ Upload images</button>
    <button type="button" class="smallbutton" data-wallpaper-action="folder">▣ Import folder once</button>
    <button type="button" class="button ghost" data-wallpaper-action="clear">Default background</button></div>
    <div class="wallpaper-options"><label class="sync-label"><input id="wallpaperRotation" type="checkbox" ${wallpaperPrefs.rotate?'checked':''}> Cycle selected source</label>
    <label>Change every <select id="wallpaperInterval" class="modal-input">${[5,15,30,60].map(v=>`<option value="${v}" ${wallpaperPrefs.interval===v?'selected':''}>${v} minutes</option>`).join('')}</select></label></div>
    <div class="wallpaper-section-head"><strong>Uploaded backgrounds</strong><span>${list.length} locally saved images</span></div>
    <div class="wallpaper-grid">${cards||'<p class="empty-note">No uploaded images yet.</p>'}</div>
    <section class="synced-folder">
     <div class="wallpaper-section-head"><strong>Connected folder · live</strong><span>Read-only</span></div>
     <p class="helper">Use a folder in Google Drive for desktop, OneDrive or File Explorer. Desk rescans it every 5 minutes while open. Changes sync through your desktop cloud-drive app; no Google account permission is given to Desk.</p>
     <div class="folder-connection">${folderHeader}</div>
     <div class="folder-commands">
      <button type="button" class="smallbutton" data-wallpaper-action="connect-folder">${linked?'Change folder':'Connect live folder'}</button>
      ${linked?`<button type="button" class="smallbutton" data-wallpaper-action="refresh-folder">↻ Refresh</button>
      ${!permission?'<button type="button" class="smallbutton" data-wallpaper-action="reauthorize-folder">Authorize folder</button>':''}
      <button type="button" class="smallbutton" data-wallpaper-action="disconnect-folder">Disconnect</button>`:''}
     </div>${folderTiles||`<p class="empty-note">${esc(linked?folderStatus:'Select a folder to choose and rotate its backgrounds.')}</p>`}
     <p class="helper">Images are read directly from the selected folder; Desk caches only the active wallpaper for offline display. To access Google Drive files, first install Drive for desktop and let the chosen folder sync or make it available offline.</p>
    </section></div>`);
  }catch(e){show(`<div class="modal-pad">${header('Desk backgrounds','Wallpaper storage is unavailable.')}<p class="helper">${esc(e.message)}</p></div>`);}
 }
 async function importWallpapers(files){
  const selected=[...files].filter(f=>f.type.startsWith('image/')||/\.(png|jpe?g|webp|bmp|gif)$/i.test(f.name)).slice(0,60);
  if(!selected.length){alert('No supported image files found.');return;}
  try{
   const existing=(await wallpaperStore('list')).filter(item=>item.id!=='__synced_folder_last');
   const remaining=Math.max(0,60-existing.length);
   if(!remaining){alert('60-image gallery is full. Delete images before importing more.');return;}
   let saved=0;
   for(const file of selected.slice(0,remaining)){
    if(file.size>25*1024*1024)continue;
    try{
     const blob=await shrinkWallpaper(file),id=uid();
     await wallpaperStore('put',{id,name:cleanText(file.name,100),blob,added:Date.now()});
     saved++;
     if(!wallpaperPrefs.selected)wallpaperPrefs.selected=id;
    }catch(e){console.warn('Skipped image:',file.name,e);}
   }
   await saveWallpaperPrefs();await applyWallpaper();await wallpaperGallery();
   if(!saved)alert('No images could be imported. Try JPG, PNG or WebP files.');
  }catch(e){alert('Could not save wallpapers: '+e.message);}
 }
 async function connectLiveFolder(){
  if(typeof window.showDirectoryPicker!=='function'){
   alert('The live folder picker is not supported in this Chrome version. Use Import folder once instead.');return;
  }
  // MUST be invoked synchronously from this click gesture (no awaits before call).
  let handle;
  try{handle=await window.showDirectoryPicker({id:'omnidite-wallpapers',mode:'read'});}
  catch(e){if(e.name!=='AbortError')alert('Could not open folder: '+e.message);return;}
  try{
   folderHandle=handle;folderPage=0;await handleStore('put',{id:folderStoreKey,handle});
   await scanConnectedFolder();
   if(folderFiles.length){
    wallpaperPrefs.source='folder';
    wallpaperPrefs.folderFile=folderFiles[0];
    wallpaperPrefs.rotate=false;
    wallpaperLastSwitch=Date.now();
    await saveWallpaperPrefs();await applyWallpaper();
   }else if(wallpaperPrefs.source==='folder'){
    wallpaperPrefs.source='gallery';wallpaperPrefs.folderFile=null;wallpaperPrefs.rotate=false;
    await saveWallpaperPrefs();await applyWallpaper();
   }
   await wallpaperGallery();
  }catch(e){alert('Could not connect folder: '+e.message);}
 }
 async function disconnectLiveFolder(){
  folderHandle=null;folderFiles=[];folderPage=0;folderStatus='Folder disconnected.';
  await handleStore('delete',folderStoreKey);
  await wallpaperStore('delete','__synced_folder_last').catch(()=>{});
  if(wallpaperPrefs.source==='folder'){wallpaperPrefs.source='gallery';wallpaperPrefs.rotate=false;}
  wallpaperPrefs.folderFile=null;await saveWallpaperPrefs();await applyWallpaper();await wallpaperGallery();
 }
 async function nextWallpaper(){
  if(wallpaperPrefs.source==='folder'){
   if(!folderHandle||folderFiles.length<2||!await connectedFolderPermission())return;
   const index=folderFiles.indexOf(wallpaperPrefs.folderFile);
   wallpaperPrefs.folderFile=folderFiles[(index+1)%folderFiles.length];
  }else{
   const list=(await wallpaperStore('list')).filter(item=>item.id!=='__synced_folder_last');
   if(list.length<2)return;
   const index=list.findIndex(item=>item.id===wallpaperPrefs.selected);
   wallpaperPrefs.selected=list[(index+1)%list.length].id;
  }
  wallpaperLastSwitch=Date.now();await saveWallpaperPrefs();await applyWallpaper();
 }
 async function setupWallpapers(){
  try{
   const stored=await local.get(wallpaperKey);
   if(stored&&typeof stored==='object')wallpaperPrefs={
    selected:typeof stored.selected==='string'?stored.selected:null,
    source:stored.source==='folder'?'folder':'gallery',
    folderFile:typeof stored.folderFile==='string'?stored.folderFile:null,
    rotate:!!stored.rotate,interval:[5,15,30,60].includes(stored.interval)?stored.interval:15
   };
   folderHandle=(await handleStore('get',folderStoreKey))?.handle||null;
   if(folderHandle)await scanConnectedFolder();
   await applyWallpaper();
  }catch(e){console.warn('Wallpaper initialization failed',e);}
 }
 modal.addEventListener('click',async e=>{
  const button=e.target.closest('[data-wallpaper-action]');if(!button)return;
  const action=button.dataset.wallpaperAction,id=button.dataset.wallpaperId;
  if(action==='upload')return $('#wallpaperFile').click();
  if(action==='folder')return $('#wallpaperFolder').click();
  if(action==='connect-folder')return connectLiveFolder();
  if(action==='reauthorize-folder'){
   // Permission requests must be launched directly from this user click.
   let allowed=false;
   try{allowed=(await folderHandle.requestPermission({mode:'read'}))==='granted';}
   catch(e){folderStatus='Folder authorization failed: '+e.message;}
   if(allowed){await scanConnectedFolder();await applyWallpaper();}
   return wallpaperGallery();
  }
  if(action==='refresh-folder'){
   await scanConnectedFolder();
   if(wallpaperPrefs.source==='folder')await applyWallpaper();
   return wallpaperGallery();
  }
  if(action==='disconnect-folder')return disconnectLiveFolder();
  if(action==='folder-next'||action==='folder-prev'){
   const max=Math.max(0,Math.ceil(folderFiles.length/12)-1);
   folderPage=Math.max(0,Math.min(max,folderPage+(action==='folder-next'?1:-1)));
   return wallpaperGallery();
  }
  if(action==='select-folder'){
   const name=button.dataset.wallpaperName;
   if(!folderFiles.includes(name))return;
   wallpaperPrefs.source='folder';wallpaperPrefs.folderFile=name;wallpaperPrefs.rotate=false;
  }
  if(action==='select'){wallpaperPrefs.selected=id;wallpaperPrefs.source='gallery';wallpaperPrefs.rotate=false;}
  if(action==='clear'){wallpaperPrefs.selected=null;wallpaperPrefs.folderFile=null;wallpaperPrefs.source='gallery';wallpaperPrefs.rotate=false;}
  if(action==='delete'){
   await wallpaperStore('delete',id);
   if(wallpaperPrefs.source==='gallery'&&wallpaperPrefs.selected===id)wallpaperPrefs.selected=null;
  }
  wallpaperLastSwitch=Date.now();await saveWallpaperPrefs();await applyWallpaper();await wallpaperGallery();
 });
 modal.addEventListener('change',async e=>{
  if(e.target.id==='wallpaperRotation'){wallpaperPrefs.rotate=e.target.checked;wallpaperLastSwitch=Date.now();await saveWallpaperPrefs();}
  if(e.target.id==='wallpaperInterval'){wallpaperPrefs.interval=Number(e.target.value);wallpaperLastSwitch=Date.now();await saveWallpaperPrefs();}
 });
 for(const picker of ['wallpaperFile','wallpaperFolder']){
  document.getElementById(picker)?.addEventListener('change',async e=>{if(e.target.files?.length)await importWallpapers(e.target.files);e.target.value='';});
 }
 let periodicWallpaperCheck=false;
 async function refreshLiveFolderIfNeeded(force=false){
  if(!folderHandle||periodicWallpaperCheck||!force&&Date.now()-lastFolderScan<5*60000)return;
  periodicWallpaperCheck=true;
  try{
   const old=folderFiles.join('\n'),hasAccess=await scanConnectedFolder();
   if(hasAccess&&wallpaperPrefs.source==='folder'){
    if(folderFiles.join('\n')!==old&&wallpaperPrefs.rotate){wallpaperLastSwitch=Date.now();}
    await applyWallpaper(); // Picks up files updated by Google Drive for desktop.
   }
  }catch(e){console.warn('Live folder check failed',e);}
  finally{periodicWallpaperCheck=false;}
 }
 setInterval(()=>{
  if(wallpaperPrefs.rotate&&Date.now()-wallpaperLastSwitch>=wallpaperPrefs.interval*60000)nextWallpaper().catch(console.warn);
  if(document.visibilityState==='visible')refreshLiveFolderIfNeeded().catch(console.warn);
 },60000);
 document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible')refreshLiveFolderIfNeeded().catch(console.warn);
 });

function content(m){const c=m.config;
 switch(m.type){
 case 'links':return renderLinkModule(m);
 case 'tasks':return `<p class="module-sub">${c.tasks.filter(x=>x.done).length} / ${c.tasks.length} COMPLETED</p><form class="task-input-row" data-add-task="${esc(m.id)}"><input name="text" placeholder="Add a task…" maxlength="200" required><button>＋</button></form><div ${widgetGrid(m,'desk-task-grid')}>${c.tasks.map((t,i)=>`<div class="taskrow ${t.done?'done':''}" data-item-drop-mid="${esc(m.id)}" data-item-drop-index="${i}"><input type="checkbox" data-toggle-task="${esc(m.id)}" data-id="${esc(t.id)}" ${t.done?'checked':''}><span class="tasktext">${esc(t.text)}</span>${itemOrderButtons(m.id,i,c.tasks.length)}<button class="delete-task" data-action="delete-task" data-mid="${esc(m.id)}" data-tid="${esc(t.id)}">×</button></div>`).join('')}</div>`;
 case 'notes':return `<p class="module-sub">AUTO SAVED</p><textarea class="notebox" data-note="${esc(m.id)}" maxlength="12000" placeholder="Capture an idea…">${esc(c.text)}</textarea>`;
 case 'clock':return renderWorldClocks(m);
  case 'weather':return renderWeatherModule(m);
 case 'focus':return renderFocusModule(m);
 case 'agenda':return `<p class="module-sub">PERSONAL AGENDA · LOCAL EVENTS</p><form class="agenda-form" data-add-event="${esc(m.id)}"><input class="modal-input" name="title" placeholder="Event title" maxlength="140" required><input class="modal-input" type="datetime-local" name="when" required><button class="smallbutton">Add event</button></form><div ${widgetGrid(m,'agenda-items')}>${c.events.map((e,i)=>`<div class="agenda-event" data-item-drop-mid="${esc(m.id)}" data-item-drop-index="${i}"><span>${esc(new Date(e.when).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}))}</span><strong>${esc(e.title)}</strong>${itemOrderButtons(m.id,i,c.events.length)}<button class="delete-task" data-action="delete-event" data-mid="${esc(m.id)}" data-tid="${esc(e.id)}">×</button></div>`).join('')||'<p class="empty-note">No events. Add one above.</p>'}</div>`;
 case 'countdown':return `<p class="module-sub">${esc(c.label)}</p><div class="count-number" data-countdown="${esc(m.id)}">—</div><div class="focus-hint">DAYS UNTIL ${esc(c.target)}</div>`;
 case 'habits':{const today=new Date().toLocaleDateString('en-CA');return `<p class="module-sub">TODAY'S CHECK-IN</p><form class="task-input-row" data-add-habit="${esc(m.id)}"><input name="text" placeholder="Add a habit…" maxlength="200" required><button>＋</button></form><div ${widgetGrid(m,'desk-task-grid')}>${c.habits.map((h,i)=>`<div class="taskrow ${h.day===today?'done':''}" data-item-drop-mid="${esc(m.id)}" data-item-drop-index="${i}"><input type="checkbox" data-toggle-habit="${esc(m.id)}" data-id="${esc(h.id)}" ${h.day===today?'checked':''}><span class="tasktext">${esc(h.text)}</span>${itemOrderButtons(m.id,i,c.habits.length)}<button class="delete-task" data-action="delete-habit" data-mid="${esc(m.id)}" data-tid="${esc(h.id)}">×</button></div>`).join('')}</div>`;}
 case 'metric':return `<p class="module-sub">CUSTOM COUNTER</p><div class="count-number">${esc(c.value)}<span class="metric-unit">${esc(c.unit)}</span></div><div class="focus-controls"><button class="smallbutton" data-action="metric-sub" data-mid="${esc(m.id)}">− ${esc(c.step)}</button><button class="smallbutton" data-action="metric-add" data-mid="${esc(m.id)}">＋ ${esc(c.step)}</button></div>`;
 case 'quote':{const q=quotes[Math.floor(Date.now()/86400000)%quotes.length];return `<p class="module-sub">DAILY PERSPECTIVE</p><blockquote class="quote-text">“${esc(q[0])}”</blockquote><div class="focus-hint">— ${esc(q[1])}</div>`;}
 }
 return '';
}
function moduleHtml(m){return `<section class="module" style="--span:${m.cols};${m.height?`min-height:${m.height}px;`:''}" data-module="${esc(m.id)}"><header class="module-header"><span class="module-icon">${META[m.type][0]}</span><span class="module-title">${esc(m.title)}</span><div class="module-tools">${LIST_TYPES.has(m.type)?`<button class="tiny desk-layout-cycle" type="button" data-action="cycle-columns" data-mid="${esc(m.id)}" title="Change items per row" aria-label="Change items per row">▦ ${layoutColumns(m.config.columns,defaultInnerColumns(m.type))}</button>`:''}<button class="tiny move-widget" data-action="move-up" data-mid="${esc(m.id)}" title="Move widget earlier" aria-label="Move widget earlier">↑</button><button class="tiny move-widget" data-action="move-down" data-mid="${esc(m.id)}" title="Move widget later" aria-label="Move widget later">↓</button><button class="tiny" data-action="edit" data-mid="${esc(m.id)}" title="Edit widget">⚙</button><span class="tiny draghandle" draggable="true" data-drag="${esc(m.id)}" title="Drag to move widget">⠿</span></div></header><div class="module-body">${content(m)}</div><div class="size-grip" data-resize="${esc(m.id)}" title="Drag horizontally and vertically to resize" aria-label="Resize widget"></div></section>`;}

// An explicit user click triggers Git via a *locally registered* native host.
// The host accepts only "status" and "update" and hard-codes the official Git remote.
const NATIVE_UPDATER='com.omnidite.desk_updater';
let updateBusy=false;
function deskUpdateMessage(message){
 const el=$('#deskUpdateStatus');if(el)el.textContent=message;
}
function deskUpdateControls(busy,install=false){
 updateBusy=busy;
 const check=$('#deskCheckButton'),button=$('#deskInstallButton');
 if(check){check.disabled=busy;check.textContent=busy?'Checking…':'Check updates';}
 if(button){button.disabled=busy;button.hidden=!install;button.textContent=busy?'Updating…':'Update now';}
}
function nativeUpdateRequest(action){
 return new Promise((resolve,reject)=>{
  if(!supportsExt||!chrome.runtime?.sendNativeMessage)return reject(new Error('Native messaging is only available in Chrome.'));
  chrome.runtime.sendNativeMessage(NATIVE_UPDATER,{action},response=>{
   const error=chrome.runtime.lastError;
   if(error)return reject(new Error(error.message));
   if(!response||typeof response!=='object')return reject(new Error('No response from local updater.'));
   resolve(response);
  });
 });
}
async function runDeskUpdate(action){
 if(updateBusy)return;
 deskUpdateControls(true,action==='update');
 $('#deskUpdateHelp').hidden=true;
 deskUpdateMessage(action==='update'?'Installing GitHub update…':'Checking GitHub…');
 try{
  const result=await nativeUpdateRequest(action);
  if(result.ok&&result.status==='updated'){
   deskUpdateMessage('Update installed. Reloading extension…');
   deskUpdateControls(true);
   // Update code is already written to disk. Reload this *unpacked* extension.
   setTimeout(()=>chrome.runtime.reload(),1100);
   return;
  }
  if(!result.ok)throw new Error(result.message||'Update failed without modifying local files.');
  if(result.status==='available'){
   deskUpdateMessage(result.behind+' GitHub commit(s) available. Install when ready.');
   deskUpdateControls(false,true);
  }else{
   deskUpdateMessage('✓ Desk is up to date.');
   deskUpdateControls(false,false);
  }
 }catch(err){
  const msg=String(err?.message||err);
  deskUpdateMessage('Updater: '+msg.slice(0,135));
  $('#deskUpdateHelp').hidden=!/host|native|not found|not registered|forbidden|messaging/i.test(msg);
  deskUpdateControls(false,false);
 }
}
$('#deskCheckButton')?.addEventListener('click',()=>runDeskUpdate('status'));
$('#deskInstallButton')?.addEventListener('click',()=>runDeskUpdate('update'));

function render(){
 document.documentElement.dataset.theme=state.theme;document.documentElement.style.setProperty('--accent',state.accent);
 document.title=state.brand+' — '+page().title;
 $('.logo-name').textContent=state.brand.toUpperCase();$('#crumbPage').textContent=page().title.toUpperCase();$('#pageHeading').textContent=page().title;
 const nav=state.pages.map((p,i)=>`<button class="nav-link page-link ${p.id===state.activePage?'selected':''}" data-page="${esc(p.id)}"><span>◈</span>${esc(p.title)}<span class="nav-kbd">${String(i+1).padStart(2,'0')}</span></button>`).join('');
 $('#pageNav').innerHTML=nav;$('#mobilePages').innerHTML=`${state.pages.map(p=>`<button class="page-pill ${p.id===state.activePage?'selected':''}" data-page="${esc(p.id)}">${esc(p.title)}</button>`).join('')}<button class="page-pill" data-global="new-page">＋</button>`;
 $('#moduleCount').textContent=page().modules.length;
 $('#grid').innerHTML=page().modules.map(moduleHtml).join('')||'<div class="empty-grid"><h2>No widgets yet</h2><p>Build your workspace with the widget library.</p><button class="button primary" data-global="add">＋ Add module</button></div>';
  refreshWeather();
 update();
}
function update(){const now=new Date();$('#localDate').textContent=new Intl.DateTimeFormat(undefined,{weekday:'short',month:'short',day:'numeric'}).format(now).toUpperCase();
 updateWorldClocks(now);
 document.querySelectorAll('[data-timer]').forEach(el=>{const mid=el.dataset.timer,c=moduleFor(mid)?.config;if(!c)return;
   if(c.until&&c.until<=Date.now()){c.until=null;c.seconds=0;const mode=c.sound||'chime',volume=c.volume??70;change();window.DeskFocusAudio?.play(mode,volume,mid);return;}
   const secs=c.until?Math.max(0,Math.ceil((c.until-Date.now())/1000)):c.seconds;el.textContent=`${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`;});
 document.querySelectorAll('[data-countdown]').forEach(el=>{const c=moduleFor(el.dataset.countdown)?.config;if(!c)return;const target=new Date(c.target+'T00:00:00');el.textContent=Number.isNaN(target.getTime())?'—':Math.max(0,Math.ceil((target-Date.now())/86400000));});
}
function add(type){if(!TYPES.includes(type))return;const def={links:{links:[]},tasks:{tasks:[]},notes:{text:''},focus:{duration:1500,seconds:1500,until:null},agenda:{events:[]},countdown:{target:'2026-12-31',label:'Milestone'},habits:{habits:[]},metric:{value:0,step:1,unit:''}};page().modules.push(mk(type,undefined,def[type]||{}));close();change();}
function removeWidget(id){for(const p of state.pages)p.modules=p.modules.filter(m=>m.id!==id);change();}
function exportBackup(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='omnidite-desk-v0.3-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
// Optional drag-to-reorder inside each widget; original cross-widget drag remains unchanged.
let draggedInner=null;
const clearInnerDrop=()=>document.querySelectorAll('.desk-item-drop-target').forEach(x=>x.classList.remove('desk-item-drop-target'));
document.addEventListener('dragstart',e=>{
 const handle=e.target.closest('[data-item-drag]');if(!handle)return;
 const index=Number(handle.dataset.itemIndex),m=moduleFor(handle.dataset.itemDrag);
 if(!m||!LIST_TYPES.has(m.type)||!Number.isInteger(index))return;
 draggedInner={mid:m.id,index};
 if(e.dataTransfer){e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','desk-item');}
 e.stopPropagation();
});
document.addEventListener('dragover',e=>{
 if(!draggedInner)return;
 const target=e.target.closest('[data-item-drop-mid]');if(!target||target.dataset.itemDropMid!==draggedInner.mid)return;
 e.preventDefault();clearInnerDrop();target.classList.add('desk-item-drop-target');
});
document.addEventListener('dragleave',e=>{
 const target=e.target.closest('[data-item-drop-mid]');if(target&&!target.contains(e.relatedTarget))target.classList.remove('desk-item-drop-target');
});
document.addEventListener('drop',e=>{
 if(!draggedInner)return;
 const dest=e.target.closest('[data-item-drop-mid]'),source=draggedInner;draggedInner=null;clearInnerDrop();
 if(!dest||dest.dataset.itemDropMid!==source.mid)return;
 e.preventDefault();e.stopPropagation();
 const m=moduleFor(source.mid);if(!m)return;
 const collection=m.type==='clock'||m.type==='weather'?'cities':m.type==='agenda'?'events':m.type==='links'?'links':m.type;
 const items=m.config?.[collection],to=Number(dest.dataset.itemDropIndex);
 if(!Array.isArray(items)||!Number.isInteger(to)||to<0||to>=items.length||source.index<0||source.index>=items.length||to===source.index)return;
 items.splice(to,0,items.splice(source.index,1)[0]);change();
});
document.addEventListener('dragend',()=>{draggedInner=null;clearInnerDrop();});

// Drag handles reorder within active page; widget body controls stay interactive.
let dragged=null;
document.addEventListener('dragstart',e=>{const h=e.target.closest('[data-drag]');if(!h)return;dragged=h.dataset.drag; e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',dragged);h.closest('.module')?.classList.add('dragging');});
document.addEventListener('dragover',e=>{const m=e.target.closest('[data-module]');if(m&&dragged&&m.dataset.module!==dragged){e.preventDefault();m.classList.add('drop-target');}});
document.addEventListener('dragleave',e=>{const m=e.target.closest('[data-module]');if(m&&!m.contains(e.relatedTarget))m.classList.remove('drop-target');});
document.addEventListener('drop',e=>{const dest=e.target.closest('[data-module]');document.querySelectorAll('.drop-target').forEach(x=>x.classList.remove('drop-target'));if(!dest||!dragged||dest.dataset.module===dragged)return;e.preventDefault();const arr=page().modules;const i=arr.findIndex(x=>x.id===dragged),j=arr.findIndex(x=>x.id===dest.dataset.module);if(i<0||j<0)return;arr.splice(j,0,arr.splice(i,1)[0]);change();});
document.addEventListener('dragend',()=>{dragged=null;document.querySelectorAll('.dragging,.drop-target').forEach(x=>x.classList.remove('dragging','drop-target'));});
let resize=null;
document.addEventListener('pointerdown',e=>{const h=e.target.closest('[data-resize]');if(!h||e.button!==0)return;e.preventDefault();const m=moduleFor(h.dataset.resize);if(!m)return;const rect=h.closest('.module').getBoundingClientRect(),grid=$('#grid').getBoundingClientRect();resize={id:m.id,x:e.clientX,y:e.clientY,cols:m.cols,height:rect.height,step:(grid.width+16)/12,pointer:e.pointerId};h.setPointerCapture(e.pointerId);document.body.classList.add('resizing');});
document.addEventListener('pointermove',e=>{if(!resize)return;const m=moduleFor(resize.id),el=document.querySelector(`[data-module="${CSS.escape(resize.id)}"]`);if(!m||!el)return;const diff=e.clientX-resize.x;const goal=resize.cols+Math.round(diff/Math.max(1,resize.step));m.cols=Math.max(1,Math.min(12,goal));m.height=Math.min(1000,Math.max(160,Math.round(resize.height+(e.clientY-resize.y))));el.style.setProperty('--span',m.cols);el.style.minHeight=m.height+'px';});
document.addEventListener('pointerup',()=>{if(!resize)return;resize=null;document.body.classList.remove('resizing');change(false);});
document.addEventListener('pointercancel',()=>{if(resize){resize=null;document.body.classList.remove('resizing');change(false);}});
document.addEventListener('click',e=>{
 const pg=e.target.closest('[data-page]');if(pg){state.activePage=pg.dataset.page;change();return;}
 const gl=e.target.closest('[data-global]');if(gl){const a=gl.dataset.global;if(a==='add')gallery();if(a==='customize')settings();if(a==='backgrounds')wallpaperGallery();if(a==='new-page')pageDialog(false);if(a==='edit-page')pageDialog(true);return;}
 const b=e.target.closest('[data-action]');if(!b)return;const {action,mid,tid}=b.dataset,m=moduleFor(mid);
 if(action==='edit')return editModule(mid);if(!m)return;
  if(action==='move-up'||action==='move-down'){const arr=page().modules;const ix=arr.indexOf(m),to=ix+(action==='move-up'?-1:1);if(ix>=0&&to>=0&&to<arr.length){arr.splice(to,0,arr.splice(ix,1)[0]);change();}return;}
 if(action==='cycle-columns'&&LIST_TYPES.has(m.type)){m.config.columns=(layoutColumns(m.config.columns,defaultInnerColumns(m.type))%6)+1;change();return;}
  if(action==='item-move'){
    const collection=m.type==='clock'||m.type==='weather'?'cities':m.type==='agenda'?'events':m.type==='links'?'links':m.type;
    const arr=m.config?.[collection];if(!Array.isArray(arr))return;
    const btn=e.target.closest('[data-action]'),ix=Number(btn.dataset.itemIndex),shift=Number(btn.dataset.moveDirection);
    if(!Number.isInteger(ix)||ix<0||ix>=arr.length||![-1,1].includes(shift)||ix+shift<0||ix+shift>=arr.length)return;
    [arr[ix],arr[ix+shift]]=[arr[ix+shift],arr[ix]];change();return;
  }
  if(action==='delete-task'){m.config.tasks=m.config.tasks.filter(t=>t.id!==tid);change();}
 if(action==='delete-habit'){m.config.habits=m.config.habits.filter(t=>t.id!==tid);change();}
 if(action==='delete-event'){m.config.events=m.config.events.filter(t=>t.id!==tid);change();}
 if(action==='focus-toggle'){if(m.config.until){m.config.seconds=Math.max(0,Math.ceil((m.config.until-Date.now())/1000));m.config.until=null;}else{if(!m.config.seconds)m.config.seconds=m.config.duration||1500;window.DeskFocusAudio?.unlock();m.config.until=Date.now()+m.config.seconds*1000;}change();}
 if(action==='focus-reset'){m.config.seconds=m.config.duration||1500;m.config.until=null;change();}
 if(action==='metric-add'||action==='metric-sub'){m.config.value+=m.config.step*(action==='metric-add'?1:-1);change();}
});
document.addEventListener('submit',e=>{const f=e.target;
 if(f.id==='searchForm'){e.preventDefault();const q=$('#searchInput').value.trim();if(!q)return;const urlCandidate=!q.includes(' ')&&(/^(https?:\/\/)/i.test(q)||/^[\w-]+(\.[\w-]+)+([/:?#].*)?$/.test(q));const target=urlCandidate?(validUrl(q)?q:'https://'+q):({google:'https://www.google.com/search?q=',duckduckgo:'https://duckduckgo.com/?q=',bing:'https://www.bing.com/search?q='}[state.searchEngine]+encodeURIComponent(q));if(validUrl(target))window.location.assign(target);return;}
 const task=f.dataset.addTask,habit=f.dataset.addHabit,event=f.dataset.addEvent;if(!task&&!habit&&!event)return;e.preventDefault();const m=moduleFor(task||habit||event);if(!m)return;
 if(task){const value=f.elements.text.value.trim();if(value)m.config.tasks.push({id:uid(),text:cleanText(value,200),done:false});}
 if(habit){const value=f.elements.text.value.trim();if(value)m.config.habits.push({id:uid(),text:cleanText(value,200),day:''});}
 if(event){const title=f.elements.title.value.trim(),when=f.elements.when.value;if(title&&when)m.config.events.push({id:uid(),title:cleanText(title,140),when});}
 change();
});
document.addEventListener('change',e=>{
 const t=e.target.closest('[data-toggle-task]');if(t){const m=moduleFor(t.dataset.toggleTask),task=m?.config.tasks.find(x=>x.id===t.dataset.id);if(task){task.done=t.checked;change();}return;}
 const h=e.target.closest('[data-toggle-habit]');if(h){const m=moduleFor(h.dataset.toggleHabit),habit=m?.config.habits.find(x=>x.id===h.dataset.id);if(habit){habit.day=h.checked?new Date().toLocaleDateString('en-CA'):'';change();}}
});
document.addEventListener('input',e=>{const n=e.target.closest('[data-note]');if(n){const m=moduleFor(n.dataset.note);if(m){m.config.text=cleanText(n.value,12000);queueSave();}}});
modal.addEventListener('click',async e=>{
 if(e.target===modal){close();return;}
 const b=e.target.closest('[data-modal]');if(!b)return;const a=b.dataset.modal;
 if(a==='close')return close();if(a==='add')return add(b.dataset.type);
 if(a==='add-link')return $('#editLinks').insertAdjacentHTML('beforeend',linkRow());
 if(a==='remove-row'){b.closest('.editlink')?.remove();return;}
 if(a==='delete-widget'){if(confirm('Delete this widget and its content?')){removeWidget(b.dataset.id);close();}return;}
 if(a==='delete-page'){if(state.pages.length<=1)return;if(confirm('Delete this workspace and ALL its widgets?')){state.pages=state.pages.filter(p=>p.id!==state.activePage);state.activePage=state.pages[0].id;close();change();}return;}
 if(a==='backgrounds')return wallpaperGallery();if(a==='export')return exportBackup();if(a==='import')return $('#importFile').click();
 if(a==='reset'){if(confirm('Reset all workspaces, widgets, notes and settings? Export a backup first.')){state=starter();close();change();}return;}
 if(a==='push-sync')return pushSync();if(a==='pull-sync')return pullSync(true,true).catch(x=>status(x.message,true));
});
modal.addEventListener('change',async e=>{if(e.target.id==='syncToggle'){
 syncEnabled=e.target.checked;await local.set(SYNC_OPT,syncEnabled);
 if(syncEnabled){try{await pullSync(true,!(await local.get(V2)));scheduleSync();status('Sync enabled. Changes will upload.');}catch(x){status(x.message,true);}}
 else{clearTimeout(syncTimer);status('Chrome Sync disabled (local-only).');}settings();
}});
modal.addEventListener('submit',e=>{const f=e.target;if(!['editForm','settingsForm','pageForm'].includes(f.id))return;e.preventDefault();
 if(f.id==='settingsForm'){state.brand=cleanText(f.elements.brand.value.trim()||'Omnidite Desk',55);state.searchEngine=f.elements.searchEngine.value;state.theme=f.elements.theme.value;state.accent=f.elements.accent.value;}
 if(f.id==='editForm'){
  const m=moduleFor(f.dataset.id);if(!m)return;m.title=cleanText(f.elements.title.value.trim()||META[m.type][1],80);m.cols=Number(f.elements.cols.value);if(LIST_TYPES.has(m.type))m.config.columns=layoutColumns(Number(f.elements.innerColumns?.value));
  const dest=state.pages.find(p=>p.id===f.elements.page.value);const src=state.pages.find(p=>p.modules.includes(m));if(dest&&src!==dest){src.modules=src.modules.filter(x=>x.id!==m.id);dest.modules.push(m);}
  if(m.type==='links'){const links=[...f.querySelectorAll('.editlink')].map(r=>({label:$('.link-label',r).value.trim(),url:$('.link-url',r).value.trim()})).filter(x=>x.label||x.url);if(links.some(l=>!l.label||!validUrl(l.url))){alert('Every shortcut needs a label and a valid http/https URL.');return;}m.config.links=links.slice(0,30);}
  if(m.type==='countdown'){m.config.target=f.elements.target.value;m.config.label=cleanText(f.elements.label.value,80);}
  if(m.type==='metric'){m.config.step=Math.max(.01,Math.min(1e6,Number(f.elements.step.value)||1));m.config.unit=cleanText(f.elements.unit.value,40);}
 }
 if(f.id==='pageForm'){const title=cleanText(f.elements.title.value.trim(),45);if(!title)return;if(f.dataset.edit==='yes')page().title=title;else{if(state.pages.length>=15){alert('Maximum of 15 workspaces.');return;}const id=uid();state.pages.push(defaultPage(id,title,[]));state.activePage=id;}}
 close();change();
});
$('#importFile').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>1024*1024){alert('Backup exceeds 1MB size limit.');e.target.value='';return;}try{const data=normalize(JSON.parse(await file.text()));if(confirm('Replace your current workspaces with this backup?')){state=data;close();change();}}catch(x){alert('Import failed: '+x.message);}e.target.value='';});
async function initialize(){
 try{syncEnabled=!!(await local.get(SYNC_OPT));const stored=await local.get(V2),old=stored?null:await local.get(V1);state=stored?normalize(stored):old?normalize(old):starter();
  if(!stored&&old)await local.set(V2,state);
  if(syncEnabled){try{await pullSync(true,!stored&&!old);status('Chrome Sync on');}catch(e){status('Sync unavailable: '+e.message,true);}}
 }catch(e){status('Could not load saved data: '+e.message,true);}
 // Seed the new weather module once for existing v0.2 workspaces; keep all user data.
 try{
  if(!(await local.get('odV022WeatherSeeded'))){
   if(!state.pages.some(p=>p.modules.some(m=>m.type==='weather'))){
    const home=state.pages.find(p=>p.id==='overview')||state.pages[0];
    home.modules.push(mk('weather'));
    state.updatedAt=Date.now();
    await local.set(V2,state);
    if(syncEnabled)scheduleSync();
   }
   await local.set('odV022WeatherSeeded',true);
  }
 }catch(e){console.warn('Weather module migration skipped:',e);}
 render();
 setupWallpapers();
 if(supportsExt&&chrome.storage?.onChanged){chrome.storage.onChanged.addListener((changes,area)=>{if(area==='sync'&&syncEnabled&&changes[SYNC_META]&&!applyingRemote){clearTimeout(saveTimer);pullSync().catch(e=>status('Sync read failed: '+e.message,true));} if(area==='local'&&changes[V2]&&!applyingRemote){const remote=changes[V2].newValue;if(remote&&remote.updatedAt>state.updatedAt){try{state=normalize(remote);render();}catch{}}}});}
 setInterval(update,1000);
}
window.DeskBridge={getState:()=>state,save:()=>change(),show,close,esc,uid,validUrl,page,addWidget:add,openGallery:gallery};
initialize();
})();