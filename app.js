/* Omnidite Desk v0.2.1 — vanilla JS, strict MV3 CSP, no analytics. */
(() => {
'use strict';
const V2='omniditeDeskStateV2', V1='omniditeDeskStateV1', SYNC_OPT='odV2SyncEnabled';
const SYNC_META='od_v2_meta', CHUNK='od_v2_chunk_';
const TYPES=['links','tasks','notes','clock','weather','focus','agenda','countdown','habits','metric','quote'];
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
const mk=(type,title=undefined,config={})=>({id:uid(),type,title:typeof title==='string'?title:META[type][1],cols:['links','tasks','notes','agenda'].includes(type)?6:4,height:0,config:{...({links:{links:[]},tasks:{tasks:[]},notes:{text:''},focus:{seconds:1500,until:null},agenda:{events:[]},countdown:{target:'2026-12-31',label:'Milestone'},habits:{habits:[]},metric:{value:0,step:1,unit:''}}[type]||{}),...config}});
const defaultPage=(id,title,modules)=>({id,title,modules});
const starter=()=>({version:2,brand:'Omnidite Desk',searchEngine:'google',theme:'midnight',accent:'#4a8df5',activePage:'overview',updatedAt:Date.now(),pages:[
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
 const out={id,type:x.type,title:cleanText(x.title||META[x.type][1],80),cols:[3,4,6,8,9,12].includes(x.cols)?x.cols:({small:4,wide:6,full:12}[x.width]||4),height:Number.isFinite(x.height)?Math.min(900,Math.max(0,Math.round(x.height))):0,config:{}};
 if(x.type==='links')out.config.links=(Array.isArray(c.links)?c.links:[]).slice(0,30).filter(l=>validUrl(String(l?.url||''))).map(l=>({label:cleanText(l.label||'Link',80),url:cleanText(l.url,1000)}));
 if(x.type==='tasks'||x.type==='habits')out.config[x.type==='tasks'?'tasks':'habits']=(Array.isArray(c.tasks||c.habits)?c.tasks||c.habits:[]).slice(0,80).filter(t=>t&&typeof t.text==='string').map(t=>({id:cleanText(t.id||uid(),90),text:cleanText(t.text,200),done:!!t.done,day:cleanText(t.day||'',12)}));
 if(x.type==='notes')out.config.text=cleanText(c.text,12000);
 if(x.type==='focus'){const duration=Number.isFinite(c.duration)?Math.min(14400,Math.max(60,Math.round(c.duration))):1500;out.config={duration,seconds:Number.isFinite(c.seconds)?Math.min(14400,Math.max(0,Math.round(c.seconds))):duration,until:Number.isFinite(c.until)&&c.until<Date.now()+86400000?c.until:null};}
 if(x.type==='clock')out.config={cities:sanitizeCities(c.cities,'clock')};
 if(x.type==='weather')out.config={cities:sanitizeCities(c.cities,'weather'),view:['now','hourly','daily'].includes(c.view)?c.view:'now',selected:cleanText(c.selected||'',90)};
 if(x.type==='agenda')out.config.events=(Array.isArray(c.events)?c.events:[]).slice(0,75).filter(e=>e&&e.title&&e.when).map(e=>({id:cleanText(e.id||uid(),90),title:cleanText(e.title,140),when:cleanText(e.when,25)}));
 if(x.type==='countdown')out.config={target:/^\d{4}-\d{2}-\d{2}$/.test(c.target||'')?c.target:'2026-12-31',label:cleanText(c.label||'Milestone',80)};
 if(x.type==='metric')out.config={value:Number.isFinite(Number(c.value))?Math.min(1e9,Math.max(-1e9,Number(c.value))):0,unit:cleanText(c.unit||'',40),step:Number.isFinite(Number(c.step))?Math.min(1e6,Math.max(.01,Number(c.step))):1};
 return out;
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
 return {version:2,brand:cleanText(obj.brand||'Omnidite Desk',55),searchEngine:['google','duckduckgo','bing'].includes(obj.searchEngine)?obj.searchEngine:'google',theme:['midnight','slate','light'].includes(obj.theme)?obj.theme:'midnight',accent:/^#[0-9a-fA-F]{6}$/.test(obj.accent||'')?obj.accent:'#4a8df5',activePage:pages.some(p=>p.id===obj.activePage)?obj.activePage:pages[0].id,updatedAt:Number.isFinite(obj.updatedAt)?obj.updatedAt:Date.now(),pages};
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
 <label class="label">Width</label><select class="modal-input" name="cols">${[3,4,6,8,9,12].map(n=>`<option value="${n}" ${m.cols===n?'selected':''}>${n}/12 columns</option>`).join('')}</select>
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
 <hr class="settings-divider"><div class="eyebrow">BACKUPS</div><p class="helper">Store backups somewhere safe before resetting or removing the extension. Code on GitHub does not contain your personal data.</p>
 <div class="modal-actions"><button type="button" class="button ghost" data-modal="export">↓ Export JSON</button><button type="button" class="button ghost" data-modal="import">↑ Import JSON</button><button type="button" class="button ghost danger" data-modal="reset">Reset</button></div></div>`);}
function pageDialog(edit=false){const p=page();show(`<form id="pageForm" class="modal-pad" data-edit="${edit?'yes':'no'}">${header(edit?'Edit workspace':'New workspace',edit?'Rename this page or remove it.':'Create another dashboard page for a different focus.')}<label class="label">Workspace title</label><input name="title" class="modal-input" required maxlength="45" value="${edit?esc(p.title):''}" placeholder="e.g. Operations"><div class="modal-actions"><button class="button primary" type="submit">${edit?'Save name':'Create workspace'}</button>${edit&&state.pages.length>1?'<button type="button" class="button ghost danger" data-modal="delete-page">Delete workspace</button>':''}</div></form>`);}
const quotes=[['The secret of getting ahead is getting started.','Mark Twain'],['It always seems impossible until it’s done.','Nelson Mandela'],['Simplicity is the ultimate sophistication.','Often attributed to Leonardo da Vinci'],['The best way out is always through.','Robert Frost']];
function content(m){const c=m.config;
 switch(m.type){
 case 'links':return renderLinkModule(m);
 case 'tasks':return `<p class="module-sub">${c.tasks.filter(x=>x.done).length} / ${c.tasks.length} COMPLETED</p><form class="task-input-row" data-add-task="${esc(m.id)}"><input name="text" placeholder="Add a task…" maxlength="200" required><button>＋</button></form>${c.tasks.map(t=>`<div class="taskrow ${t.done?'done':''}"><input type="checkbox" data-toggle-task="${esc(m.id)}" data-id="${esc(t.id)}" ${t.done?'checked':''}><span class="tasktext">${esc(t.text)}</span><button class="delete-task" data-action="delete-task" data-mid="${esc(m.id)}" data-tid="${esc(t.id)}">×</button></div>`).join('')}`;
 case 'notes':return `<p class="module-sub">AUTO SAVED</p><textarea class="notebox" data-note="${esc(m.id)}" maxlength="12000" placeholder="Capture an idea…">${esc(c.text)}</textarea>`;
 case 'clock':return renderWorldClocks(m);
  case 'weather':return renderWeatherModule(m);
 case 'focus':return renderFocusModule(m);
 case 'agenda':return `<p class="module-sub">PERSONAL AGENDA · LOCAL EVENTS</p><form class="agenda-form" data-add-event="${esc(m.id)}"><input class="modal-input" name="title" placeholder="Event title" maxlength="140" required><input class="modal-input" type="datetime-local" name="when" required><button class="smallbutton">Add event</button></form><div class="agenda-items">${c.events.slice().sort((a,b)=>a.when.localeCompare(b.when)).map(e=>`<div class="agenda-event"><span>${esc(new Date(e.when).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}))}</span><strong>${esc(e.title)}</strong><button class="delete-task" data-action="delete-event" data-mid="${esc(m.id)}" data-tid="${esc(e.id)}">×</button></div>`).join('')||'<p class="empty-note">No events. Add one above.</p>'}</div>`;
 case 'countdown':return `<p class="module-sub">${esc(c.label)}</p><div class="count-number" data-countdown="${esc(m.id)}">—</div><div class="focus-hint">DAYS UNTIL ${esc(c.target)}</div>`;
 case 'habits':{const today=new Date().toLocaleDateString('en-CA');return `<p class="module-sub">TODAY'S CHECK-IN</p><form class="task-input-row" data-add-habit="${esc(m.id)}"><input name="text" placeholder="Add a habit…" maxlength="200" required><button>＋</button></form>${c.habits.map(h=>`<div class="taskrow ${h.day===today?'done':''}"><input type="checkbox" data-toggle-habit="${esc(m.id)}" data-id="${esc(h.id)}" ${h.day===today?'checked':''}><span class="tasktext">${esc(h.text)}</span><button class="delete-task" data-action="delete-habit" data-mid="${esc(m.id)}" data-tid="${esc(h.id)}">×</button></div>`).join('')}`;}
 case 'metric':return `<p class="module-sub">CUSTOM COUNTER</p><div class="count-number">${esc(c.value)}<span class="metric-unit">${esc(c.unit)}</span></div><div class="focus-controls"><button class="smallbutton" data-action="metric-sub" data-mid="${esc(m.id)}">− ${esc(c.step)}</button><button class="smallbutton" data-action="metric-add" data-mid="${esc(m.id)}">＋ ${esc(c.step)}</button></div>`;
 case 'quote':{const q=quotes[Math.floor(Date.now()/86400000)%quotes.length];return `<p class="module-sub">DAILY PERSPECTIVE</p><blockquote class="quote-text">“${esc(q[0])}”</blockquote><div class="focus-hint">— ${esc(q[1])}</div>`;}
 }
 return '';
}
function moduleHtml(m){return `<section class="module" style="--span:${m.cols};${m.height?`min-height:${m.height}px;`:''}" data-module="${esc(m.id)}"><header class="module-header"><span class="module-icon">${META[m.type][0]}</span><span class="module-title">${esc(m.title)}</span><div class="module-tools"><button class="tiny" data-action="edit" data-mid="${esc(m.id)}" title="Edit widget">⚙</button><span class="tiny draghandle" draggable="true" data-drag="${esc(m.id)}" title="Drag to move widget">⠿</span></div></header><div class="module-body">${content(m)}</div><div class="size-grip" data-resize="${esc(m.id)}" title="Drag horizontally and vertically to resize" aria-label="Resize widget"></div></section>`;}

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
 document.querySelectorAll('[data-timer]').forEach(el=>{const c=moduleFor(el.dataset.timer)?.config;if(!c)return;const secs=c.until?Math.max(0,Math.ceil((c.until-Date.now())/1000)):c.seconds;el.textContent=`${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`;});
 document.querySelectorAll('[data-countdown]').forEach(el=>{const c=moduleFor(el.dataset.countdown)?.config;if(!c)return;const target=new Date(c.target+'T00:00:00');el.textContent=Number.isNaN(target.getTime())?'—':Math.max(0,Math.ceil((target-Date.now())/86400000));});
}
function add(type){if(!TYPES.includes(type))return;const def={links:{links:[]},tasks:{tasks:[]},notes:{text:''},focus:{duration:1500,seconds:1500,until:null},agenda:{events:[]},countdown:{target:'2026-12-31',label:'Milestone'},habits:{habits:[]},metric:{value:0,step:1,unit:''}};page().modules.push(mk(type,undefined,def[type]||{}));close();change();}
function removeWidget(id){for(const p of state.pages)p.modules=p.modules.filter(m=>m.id!==id);change();}
function exportBackup(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='omnidite-desk-v0.2-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
// Drag handles reorder within active page; widget body controls stay interactive.
let dragged=null;
document.addEventListener('dragstart',e=>{const h=e.target.closest('[data-drag]');if(!h)return;dragged=h.dataset.drag; e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',dragged);h.closest('.module')?.classList.add('dragging');});
document.addEventListener('dragover',e=>{const m=e.target.closest('[data-module]');if(m&&dragged&&m.dataset.module!==dragged){e.preventDefault();m.classList.add('drop-target');}});
document.addEventListener('dragleave',e=>{const m=e.target.closest('[data-module]');if(m&&!m.contains(e.relatedTarget))m.classList.remove('drop-target');});
document.addEventListener('drop',e=>{const dest=e.target.closest('[data-module]');document.querySelectorAll('.drop-target').forEach(x=>x.classList.remove('drop-target'));if(!dest||!dragged||dest.dataset.module===dragged)return;e.preventDefault();const arr=page().modules;const i=arr.findIndex(x=>x.id===dragged),j=arr.findIndex(x=>x.id===dest.dataset.module);if(i<0||j<0)return;arr.splice(j,0,arr.splice(i,1)[0]);change();});
document.addEventListener('dragend',()=>{dragged=null;document.querySelectorAll('.dragging,.drop-target').forEach(x=>x.classList.remove('dragging','drop-target'));});
let resize=null;
document.addEventListener('pointerdown',e=>{const h=e.target.closest('[data-resize]');if(!h||e.button!==0)return;e.preventDefault();const m=moduleFor(h.dataset.resize);if(!m)return;const rect=h.closest('.module').getBoundingClientRect(),grid=$('#grid').getBoundingClientRect();resize={id:m.id,x:e.clientX,y:e.clientY,cols:m.cols,height:rect.height,step:grid.width/12,pointer:e.pointerId};h.setPointerCapture(e.pointerId);document.body.classList.add('resizing');});
document.addEventListener('pointermove',e=>{if(!resize)return;const m=moduleFor(resize.id),el=document.querySelector(`[data-module="${CSS.escape(resize.id)}"]`);if(!m||!el)return;const diff=e.clientX-resize.x;const goal=resize.cols+Math.round(diff/Math.max(1,resize.step));m.cols=[3,4,6,8,9,12].reduce((best,n)=>Math.abs(n-goal)<Math.abs(best-goal)?n:best,3);m.height=Math.min(900,Math.max(190,Math.round(resize.height+(e.clientY-resize.y))));el.style.setProperty('--span',m.cols);el.style.minHeight=m.height+'px';});
document.addEventListener('pointerup',()=>{if(!resize)return;resize=null;document.body.classList.remove('resizing');change(false);});
document.addEventListener('pointercancel',()=>{if(resize){resize=null;document.body.classList.remove('resizing');change(false);}});
document.addEventListener('click',e=>{
 const pg=e.target.closest('[data-page]');if(pg){state.activePage=pg.dataset.page;change();return;}
 const gl=e.target.closest('[data-global]');if(gl){const a=gl.dataset.global;if(a==='add')gallery();if(a==='customize')settings();if(a==='new-page')pageDialog(false);if(a==='edit-page')pageDialog(true);return;}
 const b=e.target.closest('[data-action]');if(!b)return;const {action,mid,tid}=b.dataset,m=moduleFor(mid);
 if(action==='edit')return editModule(mid);if(!m)return;
 if(action==='delete-task'){m.config.tasks=m.config.tasks.filter(t=>t.id!==tid);change();}
 if(action==='delete-habit'){m.config.habits=m.config.habits.filter(t=>t.id!==tid);change();}
 if(action==='delete-event'){m.config.events=m.config.events.filter(t=>t.id!==tid);change();}
 if(action==='focus-toggle'){if(m.config.until){m.config.seconds=Math.max(0,Math.ceil((m.config.until-Date.now())/1000));m.config.until=null;}else{if(!m.config.seconds)m.config.seconds=m.config.duration||1500;m.config.until=Date.now()+m.config.seconds*1000;}change();}
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
 if(a==='export')return exportBackup();if(a==='import')return $('#importFile').click();
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
  const m=moduleFor(f.dataset.id);if(!m)return;m.title=cleanText(f.elements.title.value.trim()||META[m.type][1],80);m.cols=Number(f.elements.cols.value);
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
 render();
 if(supportsExt&&chrome.storage?.onChanged){chrome.storage.onChanged.addListener((changes,area)=>{if(area==='sync'&&syncEnabled&&changes[SYNC_META]&&!applyingRemote){clearTimeout(saveTimer);pullSync().catch(e=>status('Sync read failed: '+e.message,true));} if(area==='local'&&changes[V2]&&!applyingRemote){const remote=changes[V2].newValue;if(remote&&remote.updatedAt>state.updatedAt){try{state=normalize(remote);render();}catch{}}}});}
 setInterval(update,1000);
}
initialize();
})();