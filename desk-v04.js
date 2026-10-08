/* Omnidite Desk v0.4 — local productivity and explicitly permissioned browser sessions. */
(() => {
'use strict';
const api = window.DeskBridge;
if (!api) return;
const $ = (s,r=document)=>r.querySelector(s), esc=api.esc, good=api.validUrl, S=()=>api.getState();
const projectNames=()=> (S().projects||[]).map(p=>p.name);
const inChrome=()=>typeof chrome!=='undefined'&&!!chrome.tabs;
function heading(title,subtitle){return '<div class="modal-top"><div><span class="eyebrow">OMNIDITE / PRODUCTIVITY</span><h2 id="modalTitle">'+esc(title)+'</h2><p>'+esc(subtitle)+'</p></div><button type="button" class="modal-close" data-v04="close">✕</button></div>';}
function panel(title,subtitle,html){api.show('<div class="modal-pad desk-productivity">'+heading(title,subtitle)+html+'</div>');}
function button(text,action,more=''){return '<button type="button" class="smallbutton" data-v04="'+action+'" '+more+'>'+text+'</button>';}
function projectSelect(value=''){return '<select class="modal-input" name="project"><option value="">No project</option>'+projectNames().map(p=>'<option value="'+esc(p)+'" '+(p===value?'selected':'')+'>'+esc(p)+'</option>').join('')+'</select>';}
function safeDateTime(v){return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)?v:'';}
function day(v){if(!v)return 'Unscheduled';const d=new Date(v+'T12:00:00');return Number.isNaN(d.getTime())?'Unscheduled':d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});}
function taskForm(id){const t=(S().advancedTasks||[]).find(x=>x.id===id);
 panel(t?'Edit task':'New task','Assign work to a project, priority and due date without affecting existing checklist widgets.',
 '<form id="v04TaskForm" data-id="'+esc(t?.id||'')+'"><label class="label">Task</label><input class="modal-input" name="title" maxlength="180" required value="'+esc(t?.title||'')+'"><label class="label">Project</label>'+projectSelect(t?.project||'')+
 '<label class="label">Priority</label><select class="modal-input" name="priority">'+['high','medium','low'].map(p=>'<option '+(t?.priority===p?'selected':'')+' value="'+p+'">'+p.toUpperCase()+'</option>').join('')+'</select>'+
 '<label class="label">Due date</label><input class="modal-input" type="date" name="due" value="'+esc(t?.due||'')+'"><label class="sync-label"><input name="done" type="checkbox" '+(t?.done?'checked':'')+'> Completed</label>'+
 '<div class="modal-actions"><button class="button primary" type="submit">Save task</button>'+button('Cancel','tasks')+'</div></form>');
}
function tasks(){
 const sorted=[...(S().advancedTasks||[])].sort((a,b)=>Number(a.done)-Number(b.done)||({high:0,medium:1,low:2}[a.priority]-({high:0,medium:1,low:2}[b.priority]))||(a.due||'9999').localeCompare(b.due||'9999'));
 panel('Task planner','Project-linked work with priority, dates and completion tracking.',
 '<div class="modal-actions">'+button('＋ Add task','new-task')+button('Find anything','search')+'</div><div class="desk-collection">'+
 (sorted.map(t=>'<div class="desk-item"><input aria-label="Toggle task" type="checkbox" data-v04-toggle-task="'+esc(t.id)+'" '+(t.done?'checked':'')+'><div class="desk-item-main"><strong class="'+(t.done?'v04-complete':'')+'">'+esc(t.title)+'</strong><small>'+esc(t.project||'Personal')+' · '+esc(t.priority.toUpperCase())+' · '+esc(day(t.due))+'</small></div>'+
 button('Edit','edit-task','data-id="'+esc(t.id)+'"')+'<button type="button" class="tiny" data-v04="delete-task" data-id="'+esc(t.id)+'" aria-label="Delete task">✕</button></div>').join('')||'<p class="empty-note">No planned tasks yet.</p>')+'</div>');
}
function contentForm(id){const t=(S().contentItems||[]).find(x=>x.id===id);
 panel(t?'Edit content':'Plan content','Keep article and social distribution ideas in your local Desk calendar.',
 '<form id="v04ContentForm" data-id="'+esc(t?.id||'')+'"><label class="label">Working title</label><input class="modal-input" name="title" maxlength="180" value="'+esc(t?.title||'')+'" required>'+
 '<label class="label">Platform / channel</label><select class="modal-input" name="channel">'+['Article / Blog','LinkedIn','Instagram','Facebook','YouTube','Newsletter','Other'].map(p=>'<option '+(t?.channel===p?'selected':'')+'>'+p+'</option>').join('')+'</select>'+
 '<label class="label">Stage</label><select class="modal-input" name="stage">'+['Idea','Research','Draft','Review','Scheduled','Published'].map(p=>'<option '+(t?.stage===p?'selected':'')+'>'+p+'</option>').join('')+'</select>'+
 '<label class="label">Publish target</label><input class="modal-input" type="date" name="date" value="'+esc(t?.date||'')+'">'+
 '<label class="label">Project</label>'+projectSelect(t?.project||'')+
 '<div class="modal-actions"><button class="button primary">Save item</button>'+button('Cancel','content')+'</div></form>');
}
function content(){
 const list=[...(S().contentItems||[])].sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'));
 panel('Content calendar','Editorial planning for Omnidite articles and social channels. Publishing remains manual.',
 '<div class="modal-actions">'+button('＋ Plan content','new-content')+'</div><div class="desk-collection">'+
 (list.map(x=>'<div class="desk-item"><div class="desk-item-main"><strong>'+esc(x.title)+'</strong><small>'+esc(x.channel)+' · '+esc(x.stage)+' · '+esc(day(x.date))+' · '+esc(x.project||'No project')+'</small></div>'+button('Edit','edit-content','data-id="'+esc(x.id)+'"')+'<button type="button" class="tiny" data-v04="delete-content" data-id="'+esc(x.id)+'" aria-label="Delete item">✕</button></div>').join('')||'<p class="empty-note">No content planned.</p>')+'</div>');
}
function sessions(){
 const list=S().workSessions||[];
 panel('Work sessions','Save the open HTTP(S) tabs in this Chrome window, then reopen them as a group later. Tab access requires permission granted by you.',
 '<div class="modal-actions">'+button('＋ Save current window','new-session')+'</div><p class="helper">Saves up to 15 website tabs per session, excluding internal and extension pages. Only opens new tabs when you click Restore. Sessions are stored in your Desk data and may sync if Chrome Sync is enabled.</p>'+
 '<div class="desk-collection">'+(list.map(s=>'<div class="desk-item"><div class="desk-item-main"><strong>'+esc(s.name)+'</strong><small>'+s.tabs.length+' saved tabs · '+esc(new Date(s.createdAt).toLocaleDateString())+'</small></div>'+
 button('Restore','restore-session','data-id="'+esc(s.id)+'"')+'<button type="button" class="tiny" data-v04="delete-session" data-id="'+esc(s.id)+'" aria-label="Delete session">✕</button></div>').join('')||'<p class="empty-note">No browser sessions saved.</p>')+'</div>');
}
async function ensureTabs(){
 if(!inChrome())throw Error('Tab access is available only in the installed Chrome extension.');
 if(!chrome.permissions?.request)throw Error('Chrome permissions API unavailable.');
 // Request directly during the click gesture; Chrome resolves true without a prompt when already granted.
 const allowed=await chrome.permissions.request({permissions:['tabs']});
 if(!allowed)throw Error('Chrome tab permission was declined. You can still use the other Desk tools.');
}
async function newSession(){
 try{
  await ensureTabs();
  const tabs=await chrome.tabs.query({currentWindow:true});
  const accepted=tabs.filter(t=>good(t.url||'')).slice(0,15).map(t=>({title:String(t.title||t.url).slice(0,100),url:String(t.url).slice(0,350)})).filter(t=>good(t.url));
  if(!accepted.length){alert('No website tabs to save in this window.');return;}
  const name=prompt('Session name (up to 70 characters)', 'Work session '+new Date().toLocaleDateString());
  if(name===null)return;
  if((S().workSessions||[]).length>=8){alert('Maximum 8 sessions. Remove an older one first.');return;}
  S().workSessions.unshift({id:api.uid(),name:(name.trim()||'Work session').slice(0,70),tabs:accepted,createdAt:Date.now()});
  api.save();sessions();
 }catch(e){alert(e.message);}
}
async function restoreSession(id){
 const session=(S().workSessions||[]).find(x=>x.id===id);if(!session)return;
 if(!confirm('Open '+session.tabs.length+' saved browser tabs?'))return;
 if(!inChrome()){alert('Tab restoration requires the Chrome extension.');return;}
 let opened=0;
 for(const t of session.tabs){if(good(t.url)){await chrome.tabs.create({url:t.url,active:false});opened++;}}
 if(!opened)alert('No valid HTTPS or HTTP URLs remain in this session.');
}
async function captureActiveTab(){
 try{
  await ensureTabs();
  const [tab]=await chrome.tabs.query({currentWindow:true,active:true});
  if(!tab||!good(tab.url||'')){alert('Open a normal website tab first, then use Quick capture from the Desk side panel.');return;}
  const caps=S().captures||[];
  if(caps.length>=40){alert('Your research library is full (40 items). Remove an older item before capturing.');return;}
  const record={id:api.uid(),title:String(tab.title||tab.url).slice(0,140),url:String(tab.url).slice(0,1000),note:'',project:'',createdAt:Date.now()};
  caps.unshift(record);api.save();alert('Saved: '+record.title);
 }catch(e){alert(e.message);}
}
function dateFromIcs(x){
 let value=String(x||'');
 if(/^\d{8}$/.test(value))value=value.slice(0,4)+'-'+value.slice(4,6)+'-'+value.slice(6,8)+'T00:00:00';
 else if(/^\d{8}T\d{6}Z?$/.test(value))value=value.slice(0,4)+'-'+value.slice(4,6)+'-'+value.slice(6,8)+'T'+value.slice(9,11)+':'+value.slice(11,13)+':'+value.slice(13,15)+(value.endsWith('Z')?'Z':'');
 else return null;
 const ms=Date.parse(value);
 return Number.isFinite(ms)?ms:null;
}
function readIcs(input){
 const text=String(input).replace(/\r\n[ \t]/g,'').replace(/\n[ \t]/g,'');
 const eventParts=text.split(/BEGIN:VEVENT\s*/i).slice(1);
 const events=[];
 for(const block of eventParts){
  const chunk=block.split(/END:VEVENT/i)[0];
  const lines=chunk.split(/\r?\n/);
  const start=lines.find(x=>/^DTSTART(?:;[^:]*)?:/i.test(x));
  const sum=lines.find(x=>/^SUMMARY(?:;[^:]*)?:/i.test(x));
  if(!start||!sum)continue;
  // Import strictly timezone-independent UTC or floating dates; avoid pretending TZID values are local.
  if(/^DTSTART;.*TZID=/i.test(start))continue;
  const startTime=dateFromIcs(start.slice(start.indexOf(':')+1).trim());
  if(startTime===null)continue;
  const summary=sum.slice(sum.indexOf(':')+1).replace(/\\n/gi,' ').replace(/\\,/g,',').replace(/\\;/g,';').slice(0,180);
  if(summary)events.push({id:api.uid(),title:summary,when:startTime});
  if(events.length>=100)break;
 }
 return events.sort((a,b)=>a.when-b.when);
}
function calendar(){
 if(window.DeskGoogleCalendar?.open){window.DeskGoogleCalendar.open();return;}
 const events=(S().calendarEvents||[]).filter(e=>e.when>=Date.now()-86400000).sort((a,b)=>a.when-b.when);
 panel('Calendar overview','Read-only events imported from a calendar .ics export, stored in Desk. No Google account credentials required.',
 '<div class="modal-actions">'+button('↑ Import .ics','calendar-import')+button('↗ Open Google Calendar','calendar-open')+'</div>'+
 '<p class="helper">For Google Calendar: Settings → Import & export → Export, then import the .ics file here. Import is a snapshot, not a live calendar connection. Timezone-specific ICS events (TZID) are skipped rather than shown at the wrong time. Imports replace the previous snapshot.</p>'+
 '<div class="desk-collection">'+(events.slice(0,35).map(e=>'<div class="desk-item"><div class="desk-item-main"><strong>'+esc(e.title)+'</strong><small>'+esc(new Date(e.when).toLocaleString())+'</small></div></div>').join('')||'<p class="empty-note">No upcoming imported events. Import a calendar export to begin.</p>')+'</div>');
}
function search(){
 panel('Search your Desk','Find local tasks, sessions, projects, content, saved research, shortcuts and workspaces.',
 '<label class="label">Search saved content</label><input class="modal-input" id="deskV04Search" placeholder="Type a project, title or keyword" autocomplete="off">'+
 '<div id="deskV04Results" class="desk-result-list"></div>');
 $('#deskV04Search')?.focus();renderSearch('');
}
function renderSearch(q){
 const v=q.toLocaleLowerCase().trim(), out=[];
 (S().projects||[]).forEach(p=>out.push({type:'Project',title:p.name,detail:p.status,action:'projects'}));
 (S().advancedTasks||[]).forEach(t=>out.push({type:'Task',title:t.title,detail:t.project+' '+t.priority,action:'tasks'}));
 (S().contentItems||[]).forEach(t=>out.push({type:'Content',title:t.title,detail:t.stage+' '+t.channel,action:'content'}));
 (S().workSessions||[]).forEach(t=>out.push({type:'Session',title:t.name,detail:t.tabs.length+' tabs',action:'sessions'}));
 (S().captures||[]).forEach(t=>out.push({type:'Research',title:t.title,detail:t.note+' '+t.project,action:'research'}));
 (S().pages||[]).forEach(p=>{
  out.push({type:'Workspace',title:p.title,detail:'Workspace',action:'workspace',id:p.id});
  (p.modules||[]).forEach(m=>{if(m.type==='links')(m.config.links||[]).forEach(l=>out.push({type:'Shortcut',title:l.label,detail:l.url,action:'open',url:l.url}));});
 });
 const matches=out.filter(t=>!v||(t.title+' '+t.detail+' '+t.type).toLocaleLowerCase().includes(v)).slice(0,45);
 const el=$('#deskV04Results');if(!el)return;
 el.innerHTML=matches.map(x=>'<button type="button" class="desk-result" data-v04-result="'+esc(x.action)+'" '+(x.id?'data-id="'+esc(x.id)+'"':'')+(x.url?'data-url="'+esc(x.url)+'"':'')+
 '><span class="desk-result-type">'+esc(x.type)+'</span><span class="desk-result-text"><strong>'+esc(x.title)+'</strong><small>'+esc(x.detail).slice(0,230)+'</small></span>↗</button>').join('')||'<p class="empty-note">Nothing found.</p>';
}
function saveForm(f){
 if(f.id==='v04TaskForm'){
  const name=f.elements.title.value.trim().slice(0,180);if(!name)return;
  const list=S().advancedTasks,existing=list.find(x=>x.id===f.dataset.id);
  if(!existing&&list.length>=70){alert('Maximum 70 planner tasks.');return;}
  const item=existing||{id:api.uid()};
  Object.assign(item,{title:name,project:f.elements.project.value.slice(0,80),priority:['high','medium','low'].includes(f.elements.priority.value)?f.elements.priority.value:'medium',due:safeDateTime(f.elements.due.value),done:f.elements.done.checked});
  if(!existing)list.push(item);api.save();tasks();
 }else if(f.id==='v04ContentForm'){
  const name=f.elements.title.value.trim().slice(0,180);if(!name)return;
  const list=S().contentItems,existing=list.find(x=>x.id===f.dataset.id);
  if(!existing&&list.length>=45){alert('Maximum 45 content items.');return;}
  const item=existing||{id:api.uid()};
  Object.assign(item,{title:name,channel:f.elements.channel.value.slice(0,60),stage:f.elements.stage.value.slice(0,40),date:safeDateTime(f.elements.date.value),project:f.elements.project.value.slice(0,80)});
  if(!existing)list.push(item);api.save();content();
 }
}
document.addEventListener('submit',e=>{if(!['v04TaskForm','v04ContentForm'].includes(e.target.id))return;e.preventDefault();saveForm(e.target);});
document.addEventListener('change',e=>{
 const id=e.target.dataset.v04ToggleTask;if(id){const t=S().advancedTasks.find(x=>x.id===id);if(t){t.done=e.target.checked;api.save();tasks();}}
 if(e.target.id==='deskCalendarFile'){
  const file=e.target.files?.[0];if(!file)return;
  if(file.size>1000000){alert('Calendar file exceeds 1 MB.');e.target.value='';return;}
  file.text().then(text=>{
   const events=readIcs(text);
   if(!events.length){alert('No supported dates found. Export a UTC/floating-time .ics file.');return;}
   if(confirm('Replace the current calendar snapshot with '+events.length+' imported events?')){S().calendarEvents=events;api.save();calendar();}
  }).catch(err=>alert('Could not import calendar: '+err.message)).finally(()=>{e.target.value='';});
 }
});
document.addEventListener('input',e=>{if(e.target.id==='deskV04Search')renderSearch(e.target.value);});
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-v04]');
 if(b){
  const a=b.dataset.v04,id=b.dataset.id;
  if(a==='close')api.close();
  if(a==='tasks')tasks();if(a==='new-task')taskForm();if(a==='edit-task')taskForm(id);
  if(a==='delete-task'&&confirm('Delete this planned task?')){S().advancedTasks=S().advancedTasks.filter(x=>x.id!==id);api.save();tasks();}
  if(a==='content')content();if(a==='new-content')contentForm();if(a==='edit-content')contentForm(id);
  if(a==='delete-content'&&confirm('Remove this content plan?')){S().contentItems=S().contentItems.filter(x=>x.id!==id);api.save();content();}
  if(a==='sessions')sessions();if(a==='new-session')newSession();if(a==='restore-session')restoreSession(id);
  if(a==='delete-session'&&confirm('Remove this saved session?')){S().workSessions=S().workSessions.filter(x=>x.id!==id);api.save();sessions();}
  if(a==='capture-tab')captureActiveTab();if(a==='calendar')calendar();if(a==='calendar-import')$('#deskCalendarFile')?.click();
  if(a==='calendar-open')window.open('https://calendar.google.com/calendar/u/0/r','_blank','noopener,noreferrer');
  if(a==='search')search();
 }
 const res=e.target.closest('[data-v04-result]');if(!res)return;
 const a=res.dataset.v04Result;
 if(a==='projects')document.querySelector('[data-v03="projects"]')?.click();
 if(a==='research')document.querySelector('[data-v03="research"]')?.click();
 if(a==='tasks')tasks();if(a==='content')content();if(a==='sessions')sessions();
 if(a==='workspace'){S().activePage=res.dataset.id;api.save();api.close();}
 if(a==='open'&&good(res.dataset.url||''))window.open(res.dataset.url,'_blank','noopener,noreferrer');
});
})();