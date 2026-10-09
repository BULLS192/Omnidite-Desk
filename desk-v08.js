/* Omnidite Desk V0.8 — local productivity command center.
 * Reuses established Desk data, Chrome's read-only Calendar cache, and opt-in tabs.
 * No new origin, OAuth scope, background polling or remote AI service.
 */
(() => {
 'use strict';
 const api=window.DeskBridge;
 if(!api)return;
 const S=()=>api.getState(),esc=api.esc;
 const $=(q,r=document)=>r.querySelector(q);
 const gcKey='omnidite-google-calendar-local-v1';
 const stages=['todo','doing','blocked','done'];
 const stageNames={todo:'To do',doing:'In progress',blocked:'Blocked',done:'Completed'};
 const typeNames={calendar:'Meeting',agenda:'Local event',deadline:'Deadline',content:'Publishing',task:'Task',research:'Research',project:'Project',shortcut:'Shortcut',workspace:'Workspace',session:'Session',note:'Note'};
 const good=s=>api.validUrl(s);
 let agendaDays=7,agendaFilter='all',taskProject='all',searchQuery='',searchType='all',researchQuery='';
 const key=ms=>{const d=new Date(ms);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
 const dateStart=ymd=>/^\d{4}-\d{2}-\d{2}$/.test(ymd||'')?new Date(ymd+'T00:00:00').getTime():NaN;
 const dateEnd=ymd=>{const a=dateStart(ymd);return Number.isFinite(a)?a+86400000-1:NaN;};
 const truncate=(v,n)=>String(v??'').trim().slice(0,n);
 const plain=v=>truncate(v,400).toLocaleLowerCase();
 const uniqueTags=raw=>[...new Set((Array.isArray(raw)?raw:String(raw||'').split(',')).map(x=>truncate(x,28)).filter(Boolean).map(x=>x.replace(/[<>]/g,'')))].slice(0,8);
 const canonicalUrl=raw=>{try{const u=new URL(raw);if(!['https:','http:'].includes(u.protocol))return '';u.hash='';u.searchParams.sort();return u.href.replace(/\/$/,'');}catch{return '';}};
 function head(title,subtitle){
  return '<div class="modal-top"><div><span class="eyebrow">OMNIDITE / PRODUCTIVITY V0.8</span><h2 id="modalTitle">'+esc(title)+'</h2><p>'+esc(subtitle)+'</p></div><button type="button" class="modal-close" data-v08="close" aria-label="Close">✕</button></div>';
 }
 function view(title,subtitle,html){
  api.show('<div class="modal-pad desk-v08">'+head(title,subtitle)+html+'</div>');
 }
 async function calendarCache(){
  if(typeof chrome==='undefined'||!chrome.storage?.local)return null;
  try{return (await chrome.storage.local.get(gcKey))[gcKey]||null;}catch{return null;}
 }
 function collectAgenda(state,cache,now=Date.now(),horizon=7){
  const end=now+Math.max(1,horizon)*86400000,items=[],today=key(now);
  const add=(type,title,when,detail='',id='')=>{
   if(!Number.isFinite(when)||when<now-86400000||when>end||!title)return;
   items.push({id,type,title:truncate(title,180),when,detail:truncate(detail,180)});
  };
  const connected=!!(cache?.connected&&Array.isArray(cache.events));
  if(connected){
   const selected=Array.isArray(cache.selected)?cache.selected:[];
   for(const e of cache.events){if(!selected.includes(e.calendar))continue;add('calendar',e.title,e.when,e.allDay?'All-day event':'Google Calendar',e.id);}
  }else for(const e of state.calendarEvents||[])add('calendar',e.title,e.when,'Imported .ics',e.id);
  for(const p of state.pages||[])for(const w of p.modules||[]){
   if(w.type==='agenda')for(const e of w.config.events||[])add('agenda',e.title,Date.parse(e.when),p.title,e.id);
   if(w.type==='tasks')for(const t of w.config.tasks||[])if(!t.done&&t.due)add('task',t.text,dateEnd(t.due),p.title,t.id);
  }
  for(const t of state.advancedTasks||[])if(!t.done&&t.due)add('deadline',t.title,dateEnd(t.due),t.project||'Personal',t.id);
  for(const x of state.contentItems||[])if(x.date&&x.stage!=='Published')add('content',x.title,dateEnd(x.date),x.channel||'Content',x.id);
  items.sort((a,b)=>a.when-b.when||a.title.localeCompare(b.title));
  const due=(state.advancedTasks||[]).filter(t=>!t.done&&t.due).map(t=>({title:t.title,due:t.due,project:t.project}));
  const overdue=due.filter(t=>t.due<today);
  return {items,overdue,source:connected?'Cached Google Calendar':'Imported local .ics',cacheAt:connected?cache.updatedAt||0:0};
 }
 const whenLabel=x=>new Date(x.when).toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
 function agendaHtml(data){
  const filtered=data.items.filter(x=>agendaFilter==='all'||(agendaFilter==='meetings'?['calendar','agenda'].includes(x.type):['deadline','content','task'].includes(x.type)));
  const dayKeys=[...new Set(filtered.map(x=>key(x.when)))];
  const groups=dayKeys.map(day=>'<section class="v08-agenda-day"><h3>'+esc(new Date(day+'T12:00:00').toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'}))+'</h3>'+
   filtered.filter(x=>key(x.when)===day).map(x=>'<div class="v08-event"><span class="v08-event-type">'+esc(typeNames[x.type]||x.type)+'</span><div><strong>'+esc(x.title)+'</strong><small>'+esc(whenLabel(x))+' · '+esc(x.detail)+'</small></div></div>').join('')+'</section>').join('');
  return '<div class="v08-stats"><span><strong>'+filtered.length+'</strong> scheduled</span><span><strong>'+data.overdue.length+'</strong> overdue</span><span><strong>'+agendaDays+'</strong> day horizon</span></div>'+
   '<div class="v08-toolbar"><label>Range <select id="v08AgendaDays" class="modal-input">'+[1,7,30].map(n=>'<option value="'+n+'" '+(agendaDays===n?'selected':'')+'>'+n+' '+(n===1?'day':'days')+'</option>').join('')+'</select></label>'+
   '<label>Show <select id="v08AgendaType" class="modal-input">'+[['all','Everything'],['meetings','Meetings'],['deadlines','Deadlines']].map(([k,v])=>'<option value="'+k+'" '+(agendaFilter===k?'selected':'')+'>'+v+'</option>').join('')+'</select></label>'+
   '<button type="button" class="smallbutton" data-v08="tasks">Task board</button></div>'+
   (data.overdue.length?'<div class="v08-attention"><strong>Overdue tasks</strong><div>'+data.overdue.slice(0,5).map(t=>'<p>'+esc(t.title)+' · '+esc(t.project||'Personal')+' · '+esc(t.due)+'</p>').join('')+'</div></div>':'')+
   '<div class="v08-calendar-source">'+esc(data.source)+(data.cacheAt?' · Cached '+esc(new Date(data.cacheAt).toLocaleString()):' · Not connected to Google')+' · Read-only</div>'+
   (groups||'<p class="empty-note">No scheduled events in this range.</p>');
 }
 async function openAgenda(){
  const data=collectAgenda(S(),await calendarCache(),Date.now(),agendaDays);
  view('Unified agenda','Upcoming appointments, task deadlines and publishing plans in one place. No calendars are modified.',agendaHtml(data));
 }
 const taskStage=t=>t.done?'done':stages.includes(t.stage)&&t.stage!=='done'?t.stage:'todo';
 function taskCounts(state){
  const counts={todo:0,doing:0,blocked:0,done:0};
  for(const t of state.advancedTasks||[])counts[taskStage(t)]++;
  return counts;
 }
 function taskBoard(){
  const s=S(),projects=[...new Set((s.projects||[]).map(x=>x.name).concat((s.advancedTasks||[]).map(x=>x.project).filter(Boolean)))].sort();
  const list=(s.advancedTasks||[]).filter(x=>taskProject==='all'||x.project===taskProject);
  const buckets=stages.map(stage=>'<section class="v08-task-column"><h3>'+stageNames[stage]+' <small>'+list.filter(x=>taskStage(x)===stage).length+'</small></h3>'+
   (list.filter(x=>taskStage(x)===stage).map(t=>'<div class="v08-task-card"><strong>'+esc(t.title)+'</strong><small>'+esc(t.project||'Personal')+' · '+esc(t.priority||'medium')+' · '+esc(t.due||'No due date')+'</small>'+
    '<div class="v08-card-actions"><select class="modal-input" data-v08-stage="'+esc(t.id)+'" aria-label="Task status">'+stages.map(k=>'<option value="'+k+'" '+(stage===k?'selected':'')+'>'+stageNames[k]+'</option>').join('')+'</select>'+
    '<button type="button" class="smallbutton" data-v08="edit-task" data-id="'+esc(t.id)+'">Edit</button></div></div>').join('')||'<p class="v08-empty">Nothing here.</p>')+'</section>').join('');
  view('Project task board','Move tasks through To do, In progress, Blocked and Completed. Existing planner tasks are preserved.',
   '<div class="v08-toolbar"><label>Project <select id="v08TaskProject" class="modal-input"><option value="all">All projects</option>'+projects.map(x=>'<option value="'+esc(x)+'" '+(taskProject===x?'selected':'')+'>'+esc(x)+'</option>').join('')+'</select></label>'+
   '<button type="button" class="smallbutton" data-v08="new-task">＋ Task</button><button type="button" class="smallbutton" data-v04="tasks">Classic planner</button></div>'+
   '<div class="v08-task-board">'+buckets+'</div><p class="helper">Statuses are stored with existing planner tasks. Marking Completed updates the same completion flag used by the classic planner.</p>');
 }
 function taskForm(id){
  const s=S(),t=(s.advancedTasks||[]).find(x=>x.id===id),projectNames=[...new Set((s.projects||[]).map(p=>p.name).concat((s.advancedTasks||[]).map(x=>x.project).filter(Boolean)))];
  view(t?'Edit task':'New project task','Manage a project-linked task without leaving your Desk.',
   '<form id="v08TaskForm" data-id="'+esc(t?.id||'')+'"><label class="label">Task title</label><input name="title" class="modal-input" maxlength="180" required value="'+esc(t?.title||'')+'">'+
   '<label class="label">Project</label><select name="project" class="modal-input"><option value="">Personal / unassigned</option>'+projectNames.map(n=>'<option value="'+esc(n)+'" '+(n===t?.project?'selected':'')+'>'+esc(n)+'</option>').join('')+'</select>'+
   '<label class="label">Priority</label><select name="priority" class="modal-input">'+['high','medium','low'].map(n=>'<option value="'+n+'" '+((t?.priority||'medium')===n?'selected':'')+'>'+n+'</option>').join('')+'</select>'+
   '<label class="label">Due date</label><input name="due" class="modal-input" type="date" value="'+esc(t?.due||'')+'">'+
   '<label class="label">Workflow status</label><select name="stage" class="modal-input">'+stages.map(n=>'<option value="'+n+'" '+(taskStage(t||{})===n?'selected':'')+'>'+stageNames[n]+'</option>').join('')+'</select>'+
   '<div class="modal-actions"><button class="button primary" type="submit">Save task</button><button class="button ghost" type="button" data-v08="tasks">Cancel</button>'+
   (t?'<button class="button ghost danger" type="button" data-v08="delete-task" data-id="'+esc(t.id)+'">Delete</button>':'')+'</div></form>');
 }
 function saveTask(form){
  const state=S(),name=truncate(form.elements.title.value,180),stage=form.elements.stage.value;
  if(!name||!stages.includes(stage))return;
  const list=state.advancedTasks||[];
  const old=list.find(x=>x.id===form.dataset.id);
  if(!old&&list.length>=70){alert('Desk supports up to 70 planner tasks.');return;}
  const item=old||{id:api.uid()};
  const project=truncate(form.elements.project.value,80);
  if(project&&!state.projects.some(x=>x.name===project)&&!list.some(x=>x.project===project))return;
  Object.assign(item,{title:name,project,priority:['high','medium','low'].includes(form.elements.priority.value)?form.elements.priority.value:'medium',
   due:/^\d{4}-\d{2}-\d{2}$/.test(form.elements.due.value)?form.elements.due.value:'',stage,done:stage==='done'});
  if(!old)list.push(item);
  api.save();taskBoard();
 }
 function captureList(state,query){
  const q=plain(query);return (state.captures||[]).filter(c=>plain([c.title,c.url,c.note,c.project,c.collection,...(c.tags||[])].join(' ')).includes(q));
 }
 function researchStudio(){
  const entries=captureList(S(),researchQuery);
  view('Research studio','Organize saved articles and ideas by project, collection and tags. Everything remains local.',
   '<div class="v08-toolbar"><input class="modal-input v08-grow" id="v08ResearchFilter" value="'+esc(researchQuery)+'" placeholder="Search titles, notes, URLs, tags, collections…" aria-label="Find research">'+
   '<button type="button" class="smallbutton" data-v08="capture">＋ Capture</button>'+
   '<button type="button" class="smallbutton" data-v08="capture-current">↳ This tab</button>'+
   '<button type="button" class="smallbutton" data-v08="export-research">↓ Export JSON</button></div>'+
   '<div id="v08ResearchList" class="v08-list">'+researchRows(entries)+'</div><p class="helper">Max 40 saved captures; exporting creates a local JSON file. Capturing an active tab requests optional tab permission only when you click.</p>');
 }
 function researchRows(entries){
  return entries.map(c=>'<div class="v08-record"><div><strong>'+esc(c.title)+'</strong><small>'+esc(c.project||'Unassigned')+' · '+esc(c.collection||'General')+' · '+esc(new Date(c.createdAt||Date.now()).toLocaleDateString())+'</small>'+
   '<div class="v08-tags">'+(c.tags||[]).map(t=>'<span>'+esc(t)+'</span>').join('')+'</div>'+
   (c.note?'<p>'+esc(c.note.slice(0,240))+'</p>':'')+
   (good(c.url)?'<a href="'+esc(c.url)+'" target="_blank" rel="noopener noreferrer">'+esc(c.url.slice(0,90))+'</a>':'')+'</div>'+
   '<button type="button" class="smallbutton" data-v08="edit-capture" data-id="'+esc(c.id)+'">Edit</button></div>').join('')||'<p class="empty-note">No matching research saved.</p>';
 }
 function captureForm(id='',prefill={}){
  const capture=(S().captures||[]).find(x=>x.id===id)||prefill;
  const projects=S().projects||[];
  view(id?'Edit research':'Quick research capture','Add a source, context and tags for your knowledge library.',
   '<form id="v08CaptureForm" data-id="'+esc(id)+'">'+
   '<label class="label">Title</label><input name="title" class="modal-input" maxlength="140" required value="'+esc(capture.title||'')+'">'+
   '<label class="label">URL (optional)</label><input name="url" class="modal-input" type="url" maxlength="1000" value="'+esc(capture.url||'')+'" placeholder="https://example.com">'+
   '<label class="label">Project</label><select name="project" class="modal-input"><option value="">Unassigned</option>'+projects.map(p=>'<option value="'+esc(p.name)+'" '+(p.name===capture.project?'selected':'')+'>'+esc(p.name)+'</option>').join('')+'</select>'+
   '<label class="label">Collection</label><input name="collection" class="modal-input" maxlength="50" value="'+esc(capture.collection||'General')+'" placeholder="e.g. Additive Manufacturing">'+
   '<label class="label">Tags (comma-separated, up to 8)</label><input name="tags" class="modal-input" maxlength="240" value="'+esc((capture.tags||[]).join(', '))+'" placeholder="market, AI, supply chain">'+
   '<label class="label">Research notes</label><textarea name="note" class="modal-input desk-capture-notes" maxlength="1100">'+esc(capture.note||'')+'</textarea>'+
   '<div class="modal-actions"><button class="button primary" type="submit">Save research</button><button class="button ghost" type="button" data-v08="research">Cancel</button>'+
   (id?'<button type="button" class="button ghost danger" data-v08="delete-capture" data-id="'+esc(id)+'">Delete</button>':'')+'</div></form>');
 }
 function saveCapture(form){
  const s=S(),name=truncate(form.elements.title.value,140),url=truncate(form.elements.url.value,1000);
  if(!name||(url&&!good(url)))return;
  const list=s.captures||[],old=list.find(x=>x.id===form.dataset.id),normalized=canonicalUrl(url);
  const duplicate=normalized&&list.find(c=>c.id!==old?.id&&canonicalUrl(c.url)===normalized);
  if(duplicate){alert('Already saved as "'+duplicate.title+'". Open the existing capture to avoid duplicates.');return;}
  if(!old&&list.length>=40){alert('Research library is full (40 items). Export or remove older items first.');return;}
  const item=old||{id:api.uid(),createdAt:Date.now()};
  Object.assign(item,{title:name,url,project:truncate(form.elements.project.value,90),collection:truncate(form.elements.collection.value,50)||'General',tags:uniqueTags(form.elements.tags.value),note:truncate(form.elements.note.value,1100)});
  if(!old)list.unshift(item);
  api.save();researchStudio();
 }
 function entries(state,cache){
  const result=[];
  const add=(type,title,detail,target={})=>{if(title)result.push({type,title:truncate(title,180),detail:truncate(detail,250),...target});};
  (state.projects||[]).forEach(p=>add('project',p.name,p.status||'Project',{id:p.id,url:p.url}));
  for(const p of state.pages||[]){
   add('workspace',p.title,'Workspace',{id:p.id});
   for(const m of p.modules||[]){
    add('workspace',m.title,'Widget · '+p.title,{id:p.id,widgetId:m.id});
    if(m.type==='notes'&&m.config?.text?.trim())add('note',m.title,m.config.text,{id:p.id,widgetId:m.id});
    if(m.type==='links')for(const l of m.config.links||[])add('shortcut',l.label,l.url,{url:l.url});
    if(m.type==='tasks')for(const t of m.config.tasks||[])add('task',t.text,p.title,{id:p.id,widgetId:m.id});
   }
  }
  (state.advancedTasks||[]).forEach(t=>add('task',t.title,[t.project,t.priority,t.due,stageNames[taskStage(t)]].join(' '),{id:t.id,board:true}));
  (state.contentItems||[]).forEach(t=>add('content',t.title,[t.channel,t.stage,t.project].join(' '),{id:t.id}));
  (state.captures||[]).forEach(c=>add('research',c.title,[c.project,c.collection,...(c.tags||[]),c.note,c.url].join(' '),{id:c.id,url:c.url}));
  (state.workSessions||[]).forEach(w=>add('session',w.name,(w.tabs||[]).length+' saved tabs',{id:w.id}));
  if(cache?.connected&&Array.isArray(cache.events)){
   const chosen=new Set(cache.selected||[]);
   cache.events.filter(e=>chosen.has(e.calendar)).slice(0,100).forEach(e=>add('calendar',e.title,new Date(e.when).toLocaleDateString(),{id:e.id,url:e.url}));
  }else (state.calendarEvents||[]).forEach(e=>add('calendar',e.title,new Date(e.when).toLocaleDateString(),{id:e.id}));
  return result;
 }
 let searchItems=[];
 const rank=(item,q)=>{
  const v=plain(item.title),d=plain(item.detail);
  return v===q?100:v.startsWith(q)?70:v.includes(q)?45:d.includes(q)?15:0;
 };
 function searchEntries(catalog,q='',type='all'){
  const words=plain(q).split(/\s+/).filter(Boolean);
  return catalog.filter(item=>(type==='all'||item.type===type)&&words.every(word=>plain(item.title+' '+item.detail).includes(word)))
   .sort((a,b)=>rank(b,words[0]||'')-rank(a,words[0]||'')||a.title.localeCompare(b.title)).slice(0,65);
 }
 function searchRows(){
  const q=searchQuery,results=searchEntries(searchItems,q,searchType);
  return results.map((item,i)=>'<button type="button" class="v08-search-result" data-v08-result="'+i+'"><span>'+esc(typeNames[item.type]||item.type)+'</span><div><strong>'+esc(item.title)+'</strong><small>'+esc(item.detail.slice(0,180))+'</small></div>↗</button>').join('')||'<p class="empty-note">No matching saved items.</p>';
 }
 let currentSearchResults=[];
 function redrawSearch(){
  currentSearchResults=searchEntries(searchItems,searchQuery,searchType);
  const target=$('#v08SearchResults');
  if(target)target.innerHTML=searchRows();
 }
 async function openSearch(){
  searchItems=entries(S(),await calendarCache());
  searchQuery='';searchType='all';
  view('Universal search','Search workspaces, shortcuts, notes, tasks, content, research, sessions and your cached events.',
   '<div class="v08-toolbar"><input id="v08SearchInput" class="modal-input v08-grow" autocomplete="off" placeholder="Find anything in Desk…" aria-label="Search Desk">'+
   '<select id="v08SearchType" class="modal-input" aria-label="Search category">'+[['all','Everything'],...Object.entries(typeNames)].map(([k,v])=>'<option value="'+k+'">'+esc(v)+'</option>').join('')+'</select></div>'+
   '<div id="v08SearchResults" class="v08-search-list" role="listbox"></div><p class="helper">Search is local. Calendar events are read from cache and are never added to Chrome Sync by searching.</p>');
  redrawSearch();$('#v08SearchInput')?.focus();
 }
 function chooseResult(index){
  const item=currentSearchResults[index];if(!item)return;
  if(item.type==='research'){captureForm(item.id);return;}
  if(item.board||item.type==='task'&&!item.widgetId){taskBoard();return;}
  if(item.type==='content'){$('[data-v04="content"]')?.click();return;}
  if(item.type==='session'){$('[data-v04="sessions"]')?.click();return;}
  if(item.id&&S().pages.some(p=>p.id===item.id)){
   S().activePage=item.id;api.close();api.save();
   if(item.widgetId)requestAnimationFrame(()=>document.querySelector('[data-module="'+CSS.escape(item.widgetId)+'"]')?.scrollIntoView({block:'center',behavior:'smooth'}));
   return;
  }
  if(item.url&&good(item.url)){window.open(item.url,'_blank','noopener,noreferrer');api.close();return;}
  if(item.type==='calendar'){openAgenda();return;}
  if(item.type==='project'){$('[data-v03="projects"]')?.click();return;}
  api.close();
 }
 function exportResearch(){
  const items=(S().captures||[]).map(c=>({title:c.title,url:c.url,project:c.project||'',collection:c.collection||'General',tags:c.tags||[],note:c.note,createdAt:c.createdAt}));
  const data=JSON.stringify({format:'Omnidite Desk research v0.8',exportedAt:new Date().toISOString(),captures:items},null,2);
  const blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='omnidite-desk-research.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
 }
 async function captureCurrent(){
  if(typeof chrome==='undefined'||!chrome.permissions?.request||!chrome.tabs?.query){alert('Capture current tab requires the installed Chrome extension.');return;}
  try{
   const allowed=await chrome.permissions.request({permissions:['tabs']});
   if(!allowed)return;
   const tabs=await chrome.tabs.query({active:true,lastFocusedWindow:true});
   const tab=tabs.find(t=>good(t.url)&&!t.url.startsWith('chrome-extension://'));
   if(!tab){alert('No capturable website found in the active window.');return;}
   captureForm('',{title:truncate(tab.title||new URL(tab.url).hostname,140),url:tab.url});
  }catch(e){alert('Could not capture current website. Check Chrome tab permissions.');}
 }
 document.addEventListener('click',e=>{
  const b=e.target.closest('[data-v08]');if(b){
   const a=b.dataset.v08,id=b.dataset.id;
   if(a==='close')api.close();
   if(a==='agenda')openAgenda();
   if(a==='tasks')taskBoard();
   if(a==='new-task')taskForm();
   if(a==='edit-task')taskForm(id);
   if(a==='delete-task'&&confirm('Delete this task?')){S().advancedTasks=S().advancedTasks.filter(t=>t.id!==id);api.save();taskBoard();}
   if(a==='search')openSearch();
   if(a==='research')researchStudio();
   if(a==='capture')captureForm();
   if(a==='capture-current')captureCurrent();
   if(a==='edit-capture')captureForm(id);
   if(a==='delete-capture'&&confirm('Delete this saved research entry?')){S().captures=S().captures.filter(c=>c.id!==id);api.save();researchStudio();}
   if(a==='export-research')exportResearch();
  }
  const selected=e.target.closest('[data-v08-result]');
  if(selected)chooseResult(Number(selected.dataset.v08Result));
 });
 document.addEventListener('change',e=>{
  const t=e.target;
  if(t.id==='v08AgendaDays'){agendaDays=[1,7,30].includes(Number(t.value))?Number(t.value):7;openAgenda();}
  if(t.id==='v08AgendaType'){agendaFilter=['all','meetings','deadlines'].includes(t.value)?t.value:'all';openAgenda();}
  if(t.id==='v08TaskProject'){taskProject=t.value;taskBoard();}
  if(t.id==='v08SearchType'){searchType=t.value;redrawSearch();}
  if(t.matches?.('[data-v08-stage]')){
   const task=S().advancedTasks.find(x=>x.id===t.dataset.v08Stage),stage=t.value;
   if(task&&stages.includes(stage)){task.stage=stage;task.done=stage==='done';api.save();taskBoard();}
  }
 });
 document.addEventListener('input',e=>{
  if(e.target.id==='v08SearchInput'){searchQuery=e.target.value;redrawSearch();}
  if(e.target.id==='v08ResearchFilter'){
   researchQuery=e.target.value;
   const target=$('#v08ResearchList');if(target)target.innerHTML=researchRows(captureList(S(),researchQuery));
  }
 });
 document.addEventListener('submit',e=>{
  const id=e.target.id;
  if(id==='v08TaskForm'){e.preventDefault();saveTask(e.target);}
  if(id==='v08CaptureForm'){e.preventDefault();saveCapture(e.target);}
 });
 // Export pure model helpers for deterministic regression tests and future opt-in widgets.
 window.DeskV08={collectAgenda,taskStage,taskCounts,uniqueTags,canonicalUrl,captureList,searchEntries,entries,
  openAgenda,openSearch,taskBoard,researchStudio,openCapture:captureForm,calendarCache};
})();