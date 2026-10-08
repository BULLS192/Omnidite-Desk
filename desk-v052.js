/* Omnidite Desk V0.5.2 — opt-in Windows-managed local Pulse controls. */
(() => {
'use strict';
const api=window.DeskBridge;if(!api)return;
const esc=api.esc,$=selector=>document.querySelector(selector);
const HOST='com.omnidite.desk_updater';
let busy=false,last={installed:false,running:false,status:'unknown',message:''};
const isLocal=()=>/^http:\/\/(?:localhost|127\.0\.0\.1):4173\/api\/providers$/.test(api.getState().pulseSettings?.url||'');
const actionButton=(text,action,disabled=false)=>'<button type="button" class="smallbutton" data-v052="'+action+'" '+(disabled?'disabled':'')+'>'+text+'</button>';
function send(action){
 return new Promise((resolve,reject)=>{
  if(!chrome?.runtime?.sendNativeMessage)return reject(new Error('The Chrome native helper is unavailable.'));
  chrome.runtime.sendNativeMessage(HOST,{action},reply=>{
   const err=chrome.runtime.lastError;
   if(err)return reject(new Error(err.message));
   if(!reply||typeof reply!=='object')return reject(new Error('No response from the Windows helper.'));
   resolve(reply);
  });
 });
}
function paint(){
 const el=$('#deskV052Status');if(!el)return;
 if(!isLocal()){el.textContent='Pulse: not configured';el.dataset.level='unknown';return;}
 const state=last.status;
 el.textContent=state==='error'?'Pulse: setup needed':!last.installed?'Pulse: auto-start not set up':last.running?'Pulse: online':'Pulse: offline';
 el.dataset.level=state==='error'?'warning':last.running?'ok':last.installed?'warning':'unknown';
 el.title=last.message||'Click to open Pulse background controls';
}
function controlModal(message=''){
 const status=last.status==='error'?'Native helper needs setup':!last.installed?'Auto-start not installed':last.running?'Running locally':'Not responding';
 const controls='<div class="modal-actions">'+actionButton('▶ Start','start',busy||!last.installed)+actionButton('■ Stop','stop',busy||!last.installed)+actionButton('↻ Restart','restart',busy||!last.installed)+actionButton('Check status','status',busy)+'</div>';
 api.show('<div class="modal-pad desk-ops"><div class="modal-top"><div><span class="eyebrow">OMNIDITE / BACKGROUND SERVICE</span><h2 id="modalTitle">Pulse background controls</h2><p>Manage the fixed OmniditePulse Windows task only.</p></div><button type="button" class="modal-close" data-v052="close">✕</button></div>'+
 '<div class="desk-status-card"><h3>Local Pulse: '+esc(status)+'</h3><p>'+esc(message||last.message||'Checking Windows task status…')+'</p></div>'+
 controls+
 '<p class="helper">One-time Windows setup: update C:\\omnidite-pulse, then run <strong>windows\\Install-Background.bat</strong>. In your Omnidite Desk installation folder, run <strong>Setup-OneClickUpdates.bat</strong> once more to install the updated native helper. Neither action needs administrator access on a typical personal Windows PC.</p>'+
 '<p class="helper">Start/Stop/Restart control the Windows scheduled task, not unrelated Node or manually started PowerShell processes. Pulse reads your local provider credentials. The task runs while you are signed in and the PC is awake.</p>'+
 '<p class="helper">Local Pulse API: <a href="http://127.0.0.1:4173/api/health" target="_blank" rel="noopener noreferrer">Check connectivity ↗</a></p></div>');
}
async function refresh(show=false){
 if(busy)return;
 try{
  const res=await send('pulseStatus');
  last={installed:!!res.installed,running:!!res.running,status:String(res.status||'unknown'),message:String(res.message||'').slice(0,250)};
  paint();
  if(show)controlModal();
 }catch(err){
  last={installed:false,running:false,status:'error',message:'Update the native helper by running Setup-OneClickUpdates.bat again. '+String(err.message||err).slice(0,150)};
  paint();
  if(show)controlModal();
 }
}
async function run(action){
 if(busy)return;
 if(!['start','stop','restart'].includes(action))return;
 if(['stop','restart'].includes(action)&&!confirm(action==='stop'?'Stop the Pulse background task?':'Restart the Pulse background task?'))return;
 busy=true;controlModal('Sending '+action+' command to Windows Task Scheduler…');
 try{
  const result=await send('pulse'+action[0].toUpperCase()+action.slice(1));
  last={installed:!!result.installed,running:!!result.running,status:String(result.status||'unknown'),message:String(result.message||'')};
  paint();controlModal(last.message);
  // The Node API may need a few seconds to start. Status check never starts a task by itself.
  setTimeout(()=>refresh(true),3000);
 }catch(err){
  last.message='Command failed: '+String(err.message||err).slice(0,200);
  controlModal(last.message);
 }finally{busy=false;}
}
document.addEventListener('click',e=>{
 const target=e.target.closest('[data-v052]');if(!target)return;
 const action=target.dataset.v052;
 if(action==='close'){api.close();return;}
 if(action==='controls'){controlModal('Checking connection…');refresh(true);return;}
 if(action==='status'){controlModal('Checking connection…');refresh(true);return;}
 if(['start','stop','restart'].includes(action))run(action);
});
const init=()=>{paint();if(isLocal())refresh(false);};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
else init();
setInterval(()=>{paint();if(isLocal()&&!busy)refresh(false);},120000);
})();