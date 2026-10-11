/* Omnidite Desk V0.9 — local-first unified operations. Reuses V0.5 Pulse/GitHub caches
 * and V0.8 tasks/calendar. No new API, provider authentication or remote runtime.
 */
(() => {
 'use strict';
 const api=window.DeskBridge;if(!api)return;
 const S=()=>api.getState(),esc=api.esc,$=(selector,root=document)=>root.querySelector(selector);
 const safeUrl=url=>api.validUrl(url)?url:'';
 const onlyRepo=v=>/^[a-zA-Z0-9_.-]{1,80}\/[a-zA-Z0-9_.-]{1,100}$/.test(v||'')&&!String(v).includes('..');
 const fmtTime=ts=>Number.isFinite(ts)&&ts>0?new Date(ts).toLocaleString():'Never';
 const pct=(used,limit)=>Number.isFinite(used)&&Number.isFinite(limit)&&limit>0?Math.round(1000*used/limit)/10:null;
 const ellipsis=(value,n=180)=>String(value??'').slice(0,n);
 const preferences=state=>({
  warn:[70,80,90].includes(state.opsPrefs?.warn)?state.opsPrefs.warn:80,
  critical:[90,95,100].includes(state.opsPrefs?.critical)?state.opsPrefs.critical:95,
  staleHours:[1,3,6,24].includes(state.opsPrefs?.staleHours)?state.opsPrefs.staleHours:3
 });
 const staleAt=(ts,now=Date.now(),hrs=3)=>!Number.isFinite(ts)||ts<=0||now-ts>hrs*3600000||ts>now+300000;
 const snapshotSource=(cache)=>cache?.source==='Imported JSON snapshot';
 const pickDate=cache=>{
  const ms=Date.parse(cache?.capturedAt||'');
  return Number.isFinite(ms)?ms:cache?.checkedAt;
 };
 function pulseRows(state,now=Date.now()){
  const prefs=preferences(state),cache=state.pulseCache,age=pickDate(cache),snapshot=snapshotSource(cache);
  const stale=snapshot||staleAt(age,now,prefs.staleHours);
  const rows=(cache?.providers||[]).map(provider=>{
   const metrics=(provider.metrics||[]).map(metric=>{
    const percentage=pct(typeof metric.value==='number'?metric.value:NaN,metric.limit);
    return {...metric,percentage,level:percentage===null?'unknown':percentage>=prefs.critical?'critical':percentage>=prefs.warn?'warning':'ok'};
   });
   return {name:provider.name||'Unnamed provider',status:provider.status||'unknown',metrics,stale,source:cache?.source||'Cache',checkedAt:age,
    warningCount:metrics.filter(x=>x.level==='warning'||x.level==='critical').length};
  });
  return {rows,stale,source:cache?.source||'Not connected',checkedAt:age,snapshot,configured:!!state.pulseSettings?.url};
 }
 function githubRow(state,now=Date.now()){
  const g=state.githubCache,prefs=preferences(state);
  return {repo:g?.repo||'',failed:Number(g?.failedWorkflows)||0,prs:Number(g?.openPrs)||0,issues:Number(g?.openIssues)||0,
   lastWorkflow:g?.lastWorkflow||'',checkedAt:g?.checkedAt||0,stale:staleAt(g?.checkedAt,now,prefs.staleHours),url:safeUrl(g?.url)||''};
 }
 function monitorData(state,now=Date.now()){
  const pulse=pulseRows(state,now),github=githubRow(state,now);
  return {pulse,github,alerts:(state.operationalAlerts||[]).filter(a=>!a.acknowledgedAt).length,
   flagged:pulse.rows.filter(p=>['down','warning'].includes(p.status)||p.warningCount>0).length};
 }
 function header(title,description){
  return '<div class="modal-top"><div><span class="eyebrow">OMNIDITE / OPERATIONS V0.9</span><h2 id="modalTitle">'+esc(title)+'</h2><p>'+esc(description)+'</p></div>'+
   '<button type="button" class="modal-close" data-v09="close" aria-label="Close dialog">✕</button></div>';
 }
 const button=(label,action,more='')=>'<button type="button" class="smallbutton" data-v09="'+action+'" '+more+'>'+label+'</button>';
 const view=(title,subtitle,content)=>api.show('<div class="modal-pad desk-v09">'+header(title,subtitle)+content+'</div>');
 const freshness=(ts,stale,source)=>'<small class="v09-fresh '+(stale?'is-stale':'')+'">'+(stale?'Not live / stale':'Cached')+' · '+esc(source||'Unknown source')+' · '+esc(fmtTime(ts))+'</small>';
 const metricHtml=m=>'<div class="v09-metric"><div><span>'+esc(m.label)+'</span><strong>'+esc(m.value)+esc(m.unit||'')+(Number.isFinite(m.limit)?' / '+esc(m.limit)+esc(m.unit||''):'')+'</strong></div>'+
  (m.percentage===null?'<small>Limit not supplied</small>':'<small data-level="'+esc(m.level)+'">'+m.percentage.toFixed(1)+'% of reported limit</small>')+'</div>';
 function overview(){
  const model=monitorData(S()),{pulse,github}=model;
  view('Unified monitoring','One read-only overview of your existing Pulse feed and public GitHub cache. No claim of live access without a recent source.',
   '<div class="v09-kpis"><span><strong>'+pulse.rows.length+'</strong> Pulse services</span><span><strong>'+model.flagged+'</strong> flagged providers</span><span><strong>'+model.alerts+'</strong> unacknowledged alerts</span></div>'+
   '<div class="v09-toolbar">'+button('↻ Refresh Pulse','refresh-pulse')+button('↻ Refresh GitHub','refresh-github')+button('⚙ Thresholds','settings')+button('Alerts','alerts')+'</div>'+
   '<h3 class="v09-heading">Pulse · provider usage and health</h3>'+freshness(pulse.checkedAt,pulse.stale,pulse.source)+
   (pulse.rows.length?'<div class="v09-provider-list">'+pulse.rows.map(p=>'<article class="v09-provider"><div class="v09-provider-head"><strong>'+esc(p.name)+'</strong><span data-health="'+esc(p.status)+'">'+esc(p.status.toUpperCase())+'</span></div>'+
    (p.metrics.length?p.metrics.map(metricHtml).join(''):'<p class="v09-note">No numerical usage metrics supplied by this feed.</p>')+'</article>').join('')+'</div>':
    '<p class="empty-note">No provider data cached. Start your existing Omnidite Pulse service, connect its feed, or import a status snapshot.</p>')+
   '<h3 class="v09-heading">GitHub · selected public repository</h3>'+freshness(github.checkedAt,github.stale,'GitHub public REST cache')+
   '<div class="v09-provider">'+(github.repo?'<strong>'+esc(github.repo)+'</strong><div class="v09-kpis"><span><strong>'+github.prs+'</strong> PRs*</span><span><strong>'+github.issues+'</strong> issues*</span><span><strong>'+github.failed+'</strong> recent workflow failures</span></div>'+
   '<p class="v09-note">'+esc(github.lastWorkflow||'No workflow result cached')+'</p>'+
   (github.url?'<a href="'+esc(github.url)+'" target="_blank" rel="noopener noreferrer">Open GitHub repository ↗</a>':''):
   '<p class="v09-note">No public repository has been checked yet.</p>')+'</div>'+
   '<p class="v09-note">* Open PR count covers the cached first 30; open issues are an estimate. Pulse numbers only reflect metrics present in its existing feed. No direct Vercel or Supabase admin API keys are used.</p>');
 }
 function projectStats(project,state){
  const tasks=(state.advancedTasks||[]).filter(t=>t.project===project.name);
  const open=tasks.filter(t=>!t.done);
  const due=open.filter(t=>t.due).sort((a,b)=>a.due.localeCompare(b.due));
  const content=(state.contentItems||[]).filter(t=>t.project===project.name&&t.stage!=='Published');
  const cached=state.githubCache?.repo===project.repo?state.githubCache:null;
  return {open:open.length,blocked:open.filter(t=>t.stage==='blocked').length,nextDue:due[0]?.due||'',
   content:content.length,github:cached,
   repo:onlyRepo(project.repo)?project.repo:'',site:safeUrl(project.url),preview:safeUrl(project.previewUrl)};
 }
 function projects(){
  const state=S();
  view('Project command center','Project links and deadlines come from your saved directory. GitHub status is shown only for the repository actually checked.',
   '<div class="v09-toolbar">'+button('＋ Add project','new-project')+button('Open task board','task-board')+button('Research studio','research')+'</div>'+
   '<div class="v09-project-list">'+(state.projects||[]).map(p=>{
    const a=projectStats(p,state);
    const links=[a.site?'<a href="'+esc(a.site)+'" target="_blank" rel="noopener noreferrer">Production / launch ↗</a>':'',
     a.preview?'<a href="'+esc(a.preview)+'" target="_blank" rel="noopener noreferrer">Preview ↗</a>':'',
     a.repo?'<a href="https://github.com/'+esc(a.repo)+'" target="_blank" rel="noopener noreferrer">Repository ↗</a>':''].filter(Boolean);
    return '<article class="v09-project"><div class="v09-project-heading"><div><h3>'+esc(p.name)+'</h3><small>Manual status · '+esc(p.status||'Tracked')+'</small></div>'+
     button('Edit links','edit-project','data-id="'+esc(p.id)+'"')+'</div>'+
     '<div class="v09-kpis"><span><strong>'+a.open+'</strong> open tasks</span><span><strong>'+a.blocked+'</strong> blocked</span><span><strong>'+a.content+'</strong> content items</span></div>'+
     '<p class="v09-note">Next task due: '+esc(a.nextDue||'Not set')+(a.github?' · '+esc(a.github.failedWorkflows)+' recent workflow failures (cached)':' · No GitHub status matched')+'</p>'+
     (links.length?'<div class="v09-links">'+links.join('')+'</div>':'<p class="v09-note">Add production/preview links or a repository to connect this project.</p>')+
     (p.note?'<p class="v09-note">'+esc(p.note)+'</p>':'')+'</article>';
   }).join('')+'</div>'+
   (!(state.projects||[]).length?'<p class="empty-note">Add your first saved project to begin.</p>':'')+
   '<p class="v09-note">Projects are not automatically scanned. Deployment URLs are user-entered; GitHub figures are attached only if that specific public repo was refreshed in the existing GitHub panel.</p>');
 }
 function projectForm(id=''){
  const p=(S().projects||[]).find(x=>x.id===id)||{};
  view(p.id?'Edit project connections':'Add project','Save links and optional repository names locally; this does not create or deploy a service.',
   '<form id="v09ProjectForm" data-id="'+esc(p.id||'')+'">'+
   '<label class="label">Project name</label><input class="modal-input" name="name" required maxlength="80" value="'+esc(p.name||'')+'">'+
   '<label class="label">Status (manual)</label><input class="modal-input" name="status" maxlength="40" value="'+esc(p.status||'Tracked')+'">'+
   '<label class="label">Production / launch URL</label><input class="modal-input" name="url" type="url" maxlength="1000" value="'+esc(p.url||'')+'">'+
   '<label class="label">Preview URL</label><input class="modal-input" name="preview" type="url" maxlength="1000" value="'+esc(p.previewUrl||'')+'">'+
   '<label class="label">Public GitHub repository (owner/name)</label><input class="modal-input" name="repo" maxlength="181" value="'+esc(p.repo||'')+'" placeholder="BULLS192/Omnidite-Desk">'+
   '<label class="label">Internal note (avoid credentials)</label><textarea class="modal-input" name="note" maxlength="240">'+esc(p.note||'')+'</textarea>'+
   '<div class="modal-actions"><button type="submit" class="button primary">Save project</button>'+button('Cancel','projects')+'</div></form>');
 }
 function saveProject(form){
  const state=S(),els=form.elements;
  const name=ellipsis(els.name.value.trim(),80),url=els.url.value.trim(),preview=els.preview.value.trim(),repo=els.repo.value.trim();
  if(!name||(url&&!safeUrl(url))||(preview&&!safeUrl(preview))||(repo&&!onlyRepo(repo))){alert('Enter a name, valid HTTP(S) URLs and an optional owner/name repository.');return;}
  const old=(state.projects||[]).find(x=>x.id===form.dataset.id);
  if(!old&&(state.projects||[]).length>=60){alert('Desk supports up to 60 projects.');return;}
  if((state.projects||[]).some(x=>x.id!==old?.id&&x.name.toLocaleLowerCase()===name.toLocaleLowerCase())){alert('A project with this name already exists.');return;}
  const item=old||{id:api.uid()};
  Object.assign(item,{name,status:ellipsis(els.status.value.trim()||'Tracked',40),url,previewUrl:preview,repo,note:ellipsis(els.note.value.trim(),240)});
  if(!old)state.projects.push(item);
  api.save();projects();
 }
 let severityFilter='all',showAcknowledged=false;
 function alertEntries(state){
  const allowed=['ok','unknown','warning','down'];
  return (state.operationalAlerts||[]).filter(a=>allowed.includes(a.severity)).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
 }
 function alertFilter(items){
  return items.filter(a=>(showAcknowledged||!a.acknowledgedAt)&&(severityFilter==='all'||a.severity===severityFilter));
 }
 function alerts(){
  const items=alertFilter(alertEntries(S())),pref=preferences(S());
  view('Operations alerts','Review warnings from existing GitHub and Pulse refreshes. Acknowledging an alert preserves its history.',
   '<div class="v09-toolbar"><label>Severity <select id="v09Severity" class="modal-input">'+[['all','All'],['down','Critical / down'],['warning','Warning'],['unknown','Unknown']].map(([v,t])=>'<option value="'+v+'" '+(severityFilter===v?'selected':'')+'>'+t+'</option>').join('')+'</select></label>'+
   '<label class="v09-check"><input id="v09ShowAcknowledged" type="checkbox" '+(showAcknowledged?'checked':'')+'> Show acknowledged</label>'+button('Thresholds','settings')+button('Acknowledge all','ack-all')+'</div>'+
   '<p class="v09-note">Local history holds up to 16 records; acknowledgements and configured thresholds survive refresh, JSON backup and optional Chrome Sync. These are in-Desk records, not system push notifications.</p>'+
   '<div class="v09-alert-list">'+(items.length?items.map(a=>'<article class="v09-alert" data-health="'+esc(a.severity)+'"><div><strong>'+esc(a.source)+' · '+esc(a.severity.toUpperCase())+'</strong><p>'+esc(a.message)+'</p><small>'+esc(fmtTime(a.createdAt))+(a.acknowledgedAt?' · acknowledged '+esc(fmtTime(a.acknowledgedAt)):'')+'</small></div>'+
    (a.acknowledgedAt?button('Reopen','reopen','data-id="'+esc(a.id)+'"'):button('Acknowledge','ack','data-id="'+esc(a.id)+'"'))+'</article>').join(''):'<p class="empty-note">No alerts match the selected filters.</p>')+'</div>');
 }
 function alertSettings(){
  const p=preferences(S());
  view('Alert settings','Set the reported-usage threshold and define when cached monitoring should be labeled stale.',
   '<form id="v09AlertSettings">'+
   '<label class="label">Usage warning</label><select class="modal-input" name="warn">'+[70,80,90].map(n=>'<option value="'+n+'" '+(n===p.warn?'selected':'')+'>'+n+'% of reported limit</option>').join('')+'</select>'+
   '<label class="label">Usage critical</label><select class="modal-input" name="critical">'+[90,95,100].map(n=>'<option value="'+n+'" '+(n===p.critical?'selected':'')+'>'+n+'% of reported limit</option>').join('')+'</select>'+
   '<label class="label">Stale information after</label><select class="modal-input" name="stale">'+[1,3,6,24].map(n=>'<option value="'+n+'" '+(n===p.staleHours?'selected':'')+'>'+n+' hour(s)</option>').join('')+'</select>'+
   '<div class="modal-actions"><button type="submit" class="button primary">Save thresholds</button>'+button('Cancel','alerts')+'</div></form>'+
   '<p class="v09-note">Thresholds apply to metric limits actually provided by Pulse. Changing them does not infer historical outages or claim real-time monitoring; future refreshes create alerts.</p>');
 }
 async function dailyBrief(){
  const state=S(),monitor=monitorData(state),due=(state.advancedTasks||[]).filter(t=>!t.done);
  const cal=await window.DeskV08?.calendarCache?.();
  const agenda=window.DeskV08?.collectAgenda?.(state,cal,Date.now(),1)||{items:[],overdue:[],source:'Local events'};
  const severity=(state.operationalAlerts||[]).filter(a=>!a.acknowledgedAt&&['down','warning'].includes(a.severity));
  const local=new Date(),today=[local.getFullYear(),String(local.getMonth()+1).padStart(2,'0'),String(local.getDate()).padStart(2,'0')].join('-');
  const todayTasks=due.filter(t=>t.due&&t.due<=today).sort((a,b)=>a.due.localeCompare(b.due));
  view('Daily operations brief','Your cached source status, upcoming appointments and highest priority local actions, assembled on your device.',
   '<div class="v09-kpis"><span><strong>'+agenda.items.length+'</strong> next 24h events</span><span><strong>'+todayTasks.length+'</strong> due / overdue</span><span><strong>'+severity.length+'</strong> unacknowledged warnings</span></div>'+
   '<div class="v09-toolbar">'+button('Unified monitoring','overview')+button('Project command','projects')+button('Task board','task-board')+button('Alerts','alerts')+'</div>'+
   '<h3 class="v09-heading">What needs attention</h3>'+
   (severity.length?severity.slice(0,5).map(a=>'<div class="v09-brief-row"><strong>'+esc(a.source)+'</strong><span>'+esc(a.message)+'</span></div>').join(''):'<p class="v09-note">No outstanding saved warning records.</p>')+
   (todayTasks.length?todayTasks.slice(0,6).map(t=>'<div class="v09-brief-row"><strong>'+esc(t.title)+'</strong><span>'+esc(t.project||'Personal')+' · '+esc(t.due||'No due date')+'</span></div>').join(''):'<p class="v09-note">No due/overdue planner tasks.</p>')+
   '<h3 class="v09-heading">Next appointments · '+esc(agenda.source)+'</h3>'+
   (agenda.items.length?agenda.items.slice(0,7).map(x=>'<div class="v09-brief-row"><strong>'+esc(x.title)+'</strong><span>'+esc(new Date(x.when).toLocaleString())+' · '+esc(x.detail)+'</span></div>').join(''):'<p class="v09-note">No events in the next day from selected cached sources.</p>')+
   '<h3 class="v09-heading">Connected systems</h3>'+
   freshness(monitor.pulse.checkedAt,monitor.pulse.stale,monitor.pulse.source)+
   '<p>'+monitor.pulse.rows.length+' cached Pulse providers · '+monitor.flagged+' flagged from available readings</p>'+
   freshness(monitor.github.checkedAt,monitor.github.stale,'GitHub public cache')+
   '<p>'+esc(monitor.github.repo||'No repository checked')+' · '+monitor.github.failed+' recent workflow failures</p>'+
   '<p class="v09-note">This briefing uses cached Calendar, Pulse and GitHub data; it does not refresh providers or infer that a disconnected service is healthy. Open monitoring panels to refresh through your existing permissions.</p>');
 }
 document.addEventListener('click',e=>{
  const b=e.target.closest('[data-v09]');if(!b)return;
  const a=b.dataset.v09;
  if(a==='close')api.close();
  if(a==='overview')overview();
  if(a==='projects')projects();
  if(a==='alerts')alerts();
  if(a==='brief')dailyBrief();
  if(a==='settings')alertSettings();
  if(a==='new-project')projectForm();
  if(a==='edit-project')projectForm(b.dataset.id);
  if(a==='task-board')window.DeskV08?.taskBoard?.();
  if(a==='research')window.DeskV08?.researchStudio?.();
  if(a==='refresh-pulse')window.DeskV05?.refreshPulse?.(false,true);
  if(a==='refresh-github')window.DeskV05?.refreshGithub?.();
  if(['ack','reopen','ack-all'].includes(a)){
   const alertsArr=S().operationalAlerts||[],now=Date.now();
   if(a==='ack-all')for(const item of alertsArr)item.acknowledgedAt=item.acknowledgedAt||now;
   else {const item=alertsArr.find(x=>x.id===b.dataset.id);if(item)item.acknowledgedAt=a==='ack'?now:0;}
   api.save();window.DeskV05?.updateBadge?.();alerts();
  }
 });
 document.addEventListener('change',e=>{
  const t=e.target;
  if(t.id==='v09Severity'){severityFilter=t.value;alerts();}
  if(t.id==='v09ShowAcknowledged'){showAcknowledged=!!t.checked;alerts();}
 });
 document.addEventListener('submit',e=>{
  if(e.target.id==='v09ProjectForm'){e.preventDefault();saveProject(e.target);}
  if(e.target.id==='v09AlertSettings'){e.preventDefault();const els=e.target.elements;const w=Number(els.warn.value),c=Number(els.critical.value),h=Number(els.stale.value);
   if(![70,80,90].includes(w)||![90,95,100].includes(c)||c<w||![1,3,6,24].includes(h))return;
   S().opsPrefs={warn:w,critical:c,staleHours:h};api.save();alerts();}
 });
 window.DeskV09={overview,projects,alerts,dailyBrief,monitorData,pulseRows,githubRow,projectStats,alertEntries,preferences,staleAt,pct};
})();