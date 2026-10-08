/* Omnidite Desk v0.5 — explicit read-only monitoring. No background network or credentials. */
(() => {
'use strict';
const api=window.DeskBridge;if(!api)return;
const $=(s,r=document)=>r.querySelector(s),esc=api.esc,S=()=>api.getState();
const GITHUB='https://api.github.com/*';
const LOCAL_PULSE='http://127.0.0.1:4173/api/providers';
const repoPattern=/^[a-zA-Z0-9_.-]{1,80}\/[a-zA-Z0-9_.-]{1,100}$/;
const isRepo=s=>repoPattern.test(String(s||''))&&!String(s).includes('..');
const isHttps=s=>{try{return new URL(s).protocol==='https:';}catch{return false;}};
const pulseAllowed=s=>{try{const u=new URL(s);return !u.username&&!u.password&&((u.protocol==='https:'&&(u.hostname==='omnidite.com'||u.hostname.endsWith('.omnidite.com')))||(u.protocol==='http:'&&['127.0.0.1','localhost'].includes(u.hostname)&&u.port==='4173'&&u.pathname==='/api/providers'&&!u.search&&!u.hash));}catch{return false;}};
const pulsePermissionOrigin=u=>u.protocol==='http:'?u.origin.replace(':4173','')+'/*':u.origin+'/*';
const maxAlert=16;
const statusName=v=>['ok','healthy','success','operational'].includes(String(v).toLowerCase())?'ok':['warning','degraded','partial'].includes(String(v).toLowerCase())?'warning':['error','down','outage','critical','failed'].includes(String(v).toLowerCase())?'down':'unknown';
const formatWhen=stamp=>stamp?new Date(stamp).toLocaleString():'Never';
const viewHead=(title,desc)=>'<div class="modal-top"><div><span class="eyebrow">OMNIDITE / OPERATIONS</span><h2 id="modalTitle">'+esc(title)+'</h2><p>'+esc(desc)+'</p></div><button type="button" class="modal-close" data-v05="close">✕</button></div>';
const view=(title,desc,html)=>api.show('<div class="modal-pad desk-ops">'+viewHead(title,desc)+html+'</div>');
const btn=(s,a,more='')=>'<button type="button" class="smallbutton" data-v05="'+a+'" '+more+'>'+s+'</button>';
const isActive=()=>typeof chrome!=='undefined'&&!!chrome.permissions?.request;
function alertRecord(source,message,severity){
 const alerts=S().operationalAlerts||[];
 const signature=source+':'+message;
 if(alerts[0]?.signature===signature)return;
 alerts.unshift({id:api.uid(),source:String(source).slice(0,80),message:String(message).slice(0,190),severity:statusName(severity),createdAt:Date.now(),signature:signature.slice(0,250)});
 if(alerts.length>maxAlert)alerts.splice(maxAlert);
}
async function askHost(origin){
 if(!isActive())throw Error('Monitoring is available only in the installed Chrome extension.');
 // Invoke permission request directly from the user's refresh click; no prompt if already granted.
 const granted=await chrome.permissions.request({origins:[origin]});
 if(!granted)throw Error('Permission for the selected monitoring host was declined.');
}
async function getJson(url,timeoutMs=12000){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const res=await fetch(url,{method:'GET',cache:'no-store',credentials:'omit',redirect:'error',signal:controller.signal,headers:{Accept:'application/json'}});
  if(!res.ok)throw Error('HTTP '+res.status);
  const body=await res.text();if(body.length>160000)throw Error('Response exceeds 160 KB');
  return JSON.parse(body);
 }finally{clearTimeout(timer);}
}
function repoForm(){
 view('GitHub repositories','Add public repositories to track without storing personal access tokens.',
 '<form id="v05RepoForm"><label class="label">Repository (owner/name)</label><input class="modal-input" name="repo" maxlength="181" placeholder="BULLS192/Omnidite-Desk" required>'+
 '<p class="helper">Public repositories only. Desk reads the public GitHub API after you grant GitHub API access. It never commits or modifies repositories.</p>'+
 '<div class="modal-actions"><button class="button primary">Track repository</button>'+btn('Back','github')+'</div></form>');
}
function github(){
 const repos=S().githubRepos||[];
 view('GitHub activity','Read-only public repository health, open work and workflow failures. Refresh is user-initiated.',
 '<div class="modal-actions">'+btn('＋ Track repo','repo-form')+btn('↻ Refresh selected','github-refresh')+btn('Monitoring overview','overview')+'</div>'+
 '<p class="helper">Public GitHub API has rate limits. Click a repository below to select it before refreshing; data is cached locally and marked with its last check. Chrome grants api.github.com access only after your permission.</p>'+
 '<div class="desk-collection">'+repos.map(r=>'<div class="desk-item"><div class="desk-item-main"><strong>'+esc(r)+'</strong><small>'+esc(S().githubSelected===r?'Selected repository':'Click Select to monitor')+'</small></div>'+btn('Select','github-select','data-repo="'+esc(r)+'"')+
 '<button type="button" class="tiny" data-v05="github-delete" data-repo="'+esc(r)+'" aria-label="Remove repo">✕</button></div>').join('')+'</div>'+
 (S().githubCache?.repo?githubSummary():'<p class="empty-note">No GitHub status checked yet.</p>'));
}
function githubSummary(){
 const c=S().githubCache;if(!c?.repo)return '';
 return '<div class="desk-status-card"><h3>'+esc(c.repo)+'</h3><p class="helper">Last checked: '+esc(formatWhen(c.checkedAt))+' · Source: Public GitHub REST API</p>'+
 '<div class="desk-stats"><div><strong>~'+esc(c.openIssues)+'</strong><small>Open issues (estimate)</small></div><div><strong>'+esc(c.openPrs)+'</strong><small>Open PRs (first 30)</small></div><div><strong>'+esc(c.failedWorkflows)+'</strong><small>Failed / cancelled recent workflows</small></div></div>'+
 (c.url?'<a href="'+esc(c.url)+'" target="_blank" rel="noopener noreferrer" class="desk-item-link">Open repository ↗</a>':'')+
 (c.lastWorkflow?'<p class="helper">Latest workflow: '+esc(c.lastWorkflow)+'</p>':'')+(c.lastCommit?'<p class="helper">Latest commit: '+esc(c.lastCommit)+'</p>':'')+'</div>';
}
async function refreshGithub(){
 const repo=S().githubSelected||S().githubRepos?.[0];
 if(!isRepo(repo)){alert('Select a valid public repository first.');return;}
 const prev=S().githubCache;
 if(prev?.repo===repo&&Date.now()-prev.checkedAt<60000){alert('Last checked less than one minute ago. To reduce rate-limit use, try again shortly.');return;}
 try{
  await askHost(GITHUB);
  const path='https://api.github.com/repos/'+repo;
  const [base,prs,workflows,commits]=await Promise.all([
   getJson(path),
   getJson(path+'/pulls?state=open&per_page=30'),
   getJson(path+'/actions/runs?per_page=15'),
   getJson(path+'/commits?per_page=1').catch(()=>[])
  ]);
  if(!base||!Array.isArray(prs)||!Array.isArray(workflows.workflow_runs))throw Error('GitHub returned unexpected data');
  const recent=workflows.workflow_runs;
  const failed=recent.filter(w=>['failure','timed_out','cancelled'].includes(w.conclusion)).length;
  const latest=recent[0],commit=Array.isArray(commits)?commits[0]:null;
  S().githubCache={
   repo,checkedAt:Date.now(),
   openIssues:Math.max(0,Math.min(1000000,Number(base.open_issues_count||0)-prs.length)),
   openPrs:prs.length,
   failedWorkflows:failed,
   lastWorkflow:String(latest?.name||'No workflows').slice(0,100)+(latest?.conclusion?' · '+String(latest.conclusion).slice(0,30):''),
   lastCommit:String(commit?.commit?.message||'No recent commits').split('\n')[0].slice(0,120),
   url:isHttps(base.html_url)?base.html_url:''
  };
  if(failed>0)alertRecord('GitHub '+repo,failed+' of the latest '+recent.length+' workflow runs failed, cancelled or timed out','warning');
  api.save();github();updateBadge();
 }catch(e){alert('GitHub refresh failed: '+e.message+'\nPreviously cached values, if any, were kept.');}
}
function pulseSettings(){
 const old=S().pulseSettings||{url:'',auto:false};
 view('Omnidite Pulse feed','Use the local Pulse monitor or a sanitized HTTPS status JSON endpoint on your Omnidite domain.',
 '<form id="v05PulseForm"><label class="label">Pulse feed URL</label><input class="modal-input" type="url" name="url" maxlength="1000" value="'+esc(old.url||'')+'" placeholder="http://127.0.0.1:4173/api/providers">'+
 '<p class="helper">Local option: http://127.0.0.1:4173/api/providers or localhost on port 4173 (exact path only). Alternatively use HTTPS on omnidite.com or a subdomain. Pulse must be running on your PC for local updates. Permissions are opt-in and no cookies or credentials are sent. Never include tokens in feed URLs.</p>'+
 '<label class="sync-label"><input type="checkbox" name="auto" '+(old.auto?'checked':'')+'> Refresh at most every 15 minutes while the dashboard is open</label>'+
 '<div class="modal-actions"><button class="button primary">Save feed settings</button>'+btn('Back','pulse')+'</div></form>');
}
function pulseSummary(){
 const cache=S().pulseCache||{};
 if(!cache.providers?.length)return '<p class="empty-note">No monitoring feed connected or imported yet.</p>';
 return '<p class="helper">Last checked: '+esc(formatWhen(cache.checkedAt))+' · '+esc(cache.source||'Read-only feed')+(cache.capturedAt?' · Source captured: '+esc(cache.capturedAt):' · Source capture time unknown')+'</p>'+
 cache.providers.map(p=>'<div class="desk-item"><div class="desk-item-main"><strong>'+esc(p.name)+' <span class="desk-status '+esc(p.status)+'">'+esc(p.status.toUpperCase())+'</span></strong>'+
 (p.metrics||[]).map(m=>'<small>'+esc(m.label)+': '+esc(m.value)+esc(m.unit||'')+(Number.isFinite(m.limit)?' / '+esc(m.limit)+esc(m.unit||''):'')+'</small>').join('')+'</div></div>').join('');
}
function pulse(){
 view('Omnidite Pulse monitoring','A single read-only view for configured service status and usage thresholds.',
 '<div class="modal-actions">'+btn('⚡ Connect local Pulse','pulse-local')+'<button type="button" class="smallbutton" data-v052="controls">⏻ Background controls</button>'+btn('⚙ Configure feed','pulse-settings')+btn('↻ Refresh feed','pulse-refresh')+btn('Import status JSON','pulse-import')+'</div>'
 '<p class="helper">Local connection requires Pulse running at http://localhost:4173 and a Chrome site-access permission once. You can also import JSON or configure an HTTPS Omnidite feed. Values without a current timestamp are not treated as live.</p>'+
 '<div class="desk-collection">'+pulseSummary()+'</div>');
}
function normalizePulse(input,source){
 if(!input||!Array.isArray(input.providers))throw Error('Expected JSON with a providers array.');
 const providers=input.providers.slice(0,18).map(p=>{
  const metrics=(Array.isArray(p.metrics)?p.metrics:[]).slice(0,8).map(m=>({
   label:String(m.label||'Metric').slice(0,80),
   value:Number.isFinite(Number(m.value))?Number(m.value):String(m.value??'—').slice(0,40),
   limit:Number.isFinite(Number(m.limit))&&m.limit!==null?Number(m.limit):null,
   unit:String(m.unit||'').slice(0,12)
  }));
  return {name:String(p.name||p.id||'Service').slice(0,80),status:statusName(p.status),metrics};
 });
 return {providers,source:String(source).slice(0,140),checkedAt:Date.now(),capturedAt:typeof input.capturedAt==='string'?input.capturedAt.slice(0,100):''};
}
function checkPulseAlerts(cache){
 for(const p of cache.providers){
  if(['warning','down'].includes(p.status))alertRecord(p.name,p.status==='down'?'Service reported down':'Service reported degraded status',p.status);
  for(const m of p.metrics){if(typeof m.value==='number'&&m.limit!==null&&m.limit>0&&m.value/m.limit>=0.8)alertRecord(p.name,m.label+' reached '+Math.round(m.value/m.limit*100)+'% of reported limit','warning');}
 }
}
async function refreshPulse(silent=false,force=false){
 const url=S().pulseSettings?.url;
 if(!pulseAllowed(url)){if(!silent)alert('Configure a localhost:4173/api/providers feed or an HTTPS omnidite.com feed.');return;}
 const last=S().pulseCache?.checkedAt;
 if(!force&&last&&Date.now()-last<(silent?900000:60000)){if(!silent)alert('Feed checked recently. Wait a minute before refreshing.');return;}
 try{
  const u=new URL(url),origin=pulsePermissionOrigin(u);
  // Host permission is granted to this Omnidite origin, never all sites.
  if(silent){if(!isActive()||!(await chrome.permissions.contains({origins:[origin]})))return;}
  else await askHost(origin);
  // Multiple provider collectors may take longer than a single external API request.
  const json=await getJson(url,u.protocol==='http:'?60000:20000);
  const cache=normalizePulse(json,u.origin);
  S().pulseCache=cache;checkPulseAlerts(cache);api.save();updateBadge();
  if(!silent)pulse();
 }catch(e){if(!silent)alert('Could not refresh Pulse feed: '+e.message+'. Cached data was preserved.');}
}
function overview(){
 const gc=S().githubCache,pc=S().pulseCache;
 view('Operations overview','Read-only health indicators and manual refresh controls. Cached and stale information is identified.',
 '<div class="desk-ops-grid"><div class="desk-status-card"><h3>GitHub</h3>'+
 (gc?.repo?'<p>'+esc(gc.repo)+'</p><small>Checked '+esc(formatWhen(gc.checkedAt))+'</small><p>'+esc(gc.failedWorkflows)+' failed / cancelled recent workflows</p>':'<p>Not checked</p>')+
 btn('Open GitHub','github')+'</div><div class="desk-status-card"><h3>Omnidite Pulse</h3>'+
 (pc?.providers?.length?'<p>'+pc.providers.length+' providers · '+pc.providers.filter(p=>p.status==='down'||p.status==='warning').length+' flagged</p><small>Checked '+esc(formatWhen(pc.checkedAt))+'</small>':'<p>Not connected</p>')+
 btn('Open Pulse','pulse')+'</div></div><h3 class="desk-small-heading">Recent alerts</h3><div class="desk-collection">'+
 (S().operationalAlerts||[]).map(a=>'<div class="desk-item"><div class="desk-item-main"><strong>'+esc(a.source)+' · '+esc(a.severity)+'</strong><small>'+esc(a.message)+'</small><small>'+esc(formatWhen(a.createdAt))+'</small></div></div>').join('')+
 ((S().operationalAlerts||[]).length?'':'<p class="empty-note">No saved operational alerts. Desk never assumes systems are healthy until checked.</p>')+'</div>'+
 '<div class="modal-actions">'+btn('Clear local alert history','clear-alerts')+'</div><p class="helper">Alerts are local to Desk; background push notifications are not enabled. Open the GitHub or Pulse panels to refresh data.</p>');
}
function updateBadge(){
 const el=$('#deskV05Badge');if(!el)return;
 const c=S().pulseCache,alertCount=(S().operationalAlerts||[]).length;
 const captured=Date.parse(c?.capturedAt||'');
 const isSnapshot=c?.source==='Imported JSON snapshot';
 const stale=!c?.checkedAt||Date.now()-c.checkedAt>3600000||(Number.isFinite(captured)&&Date.now()-captured>3600000);
 el.textContent=isSnapshot?'Systems: snapshot':stale?'Systems: not live':alertCount?'Systems: '+alertCount+' alert'+(alertCount===1?'':'s'):'Systems: checked';
 el.dataset.alert=alertCount?'yes':'no';
 const g=$('#deskV05GitHub'),p=$('#deskV05Pulse'),a=$('#deskV05Alerts');
 if(g)g.textContent=S().githubCache?.repo?((Date.now()-S().githubCache.checkedAt>3600000?'Stale · ':'')+S().githubCache.repo):'Not checked';
 if(p)p.textContent=isSnapshot?'Snapshot imported':!c?.providers?.length?'Not connected':stale?'Status may be stale':c.providers.length+' services checked';
 if(a)a.textContent=alertCount?alertCount+' saved warning'+(alertCount===1?'':'s'):'No saved alerts';
}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-v05]');if(!b)return;
 const a=b.dataset.v05;
 if(a==='close')api.close();
 if(a==='clear-alerts'&&confirm('Clear locally saved operational alert history?')){S().operationalAlerts=[];api.save();overview();updateBadge();}
 if(a==='overview')overview();if(a==='github')github();if(a==='repo-form')repoForm();
 if(a==='github-select'){S().githubSelected=b.dataset.repo;api.save();github();}
 if(a==='github-delete'&&confirm('Remove monitored repository?')){S().githubRepos=S().githubRepos.filter(x=>x!==b.dataset.repo);if(S().githubSelected===b.dataset.repo)S().githubSelected=S().githubRepos[0]||'';api.save();github();}
 if(a==='github-refresh')refreshGithub();
 if(a==='pulse')pulse();if(a==='pulse-settings')pulseSettings();if(a==='pulse-refresh')refreshPulse();
 if(a==='pulse-local'){
  // Save the exact local URL, then invoke the Chrome permission request immediately from this click.
  const previous=S().pulseSettings||{url:'',auto:false};
  S().pulseSettings={url:LOCAL_PULSE,auto:previous.auto};
  api.save();
  refreshPulse(false,true);
 }
 if(a==='pulse-import')$('#deskPulseImport')?.click();
});
document.addEventListener('submit',e=>{
 const f=e.target;if(!['v05RepoForm','v05PulseForm'].includes(f.id))return;e.preventDefault();
 if(f.id==='v05RepoForm'){
  const repo=f.elements.repo.value.trim();if(!isRepo(repo)){alert('Enter a repository in owner/name format.');return;}
  if(S().githubRepos.length>=8){alert('Maximum 8 monitored repositories.');return;}
  if(!S().githubRepos.includes(repo))S().githubRepos.push(repo);
  S().githubSelected=repo;api.save();github();
 }else {
  const url=f.elements.url.value.trim();
  if(url&&!pulseAllowed(url)){alert('Feed must use the exact local Pulse endpoint on port 4173 or HTTPS on omnidite.com (no credentials in the URL).');return;}
  S().pulseSettings={url,auto:!!f.elements.auto.checked};api.save();pulse();
 }
});
document.addEventListener('change',e=>{
 if(e.target.id!=='deskPulseImport')return;
 const file=e.target.files?.[0];if(!file)return;
 if(file.size>200000){alert('Status JSON must be under 200 KB.');e.target.value='';return;}
 file.text().then(raw=>{
  const cache=normalizePulse(JSON.parse(raw),'Imported JSON snapshot');S().pulseCache=cache;
  checkPulseAlerts(cache);api.save();updateBadge();pulse();
 }).catch(err=>alert('Status import failed: '+err.message)).finally(()=>e.target.value='');
});
document.addEventListener('DOMContentLoaded',updateBadge);
if(document.readyState!=='loading')updateBadge();
let autoTick=0;
setInterval(()=>{
 // No network unless explicitly enabled, endpoint is configured and its origin already granted.
 if(++autoTick%3===0&&S().pulseSettings?.auto&&pulseAllowed(S().pulseSettings.url))refreshPulse(true);
 updateBadge();
},300000);
})();