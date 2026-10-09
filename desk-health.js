/* Desk health: intentionally read-only; no personal widget or calendar contents exported. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function nativeStatus(){
  return new Promise(resolve=>{
   if(typeof chrome==='undefined'||!chrome.runtime?.sendNativeMessage)return resolve('Not available outside Chrome');
   chrome.runtime.sendNativeMessage('com.omnidite.desk_updater',{action:'status'},response=>{
    if(chrome.runtime.lastError)return resolve('Helper needs setup or is unavailable');
    resolve(response?.ok?(response.status==='current'?'Connected · up to date':response.status==='available'?'Connected · update available':'Connected · '+String(response.status||'check')):String(response?.message||'Helper needs attention').slice(0,120));
   });
  });
 }
 async function diagnostics(){
  const state=window.DeskBridge?.getState?.();
  const pages=Array.isArray(state?.pages)?state.pages.length:0;
  const widgets=Array.isArray(state?.pages)?state.pages.reduce((n,p)=>n+(Array.isArray(p.modules)?p.modules.length:0),0):0;
  const version=typeof chrome!=='undefined'&&chrome.runtime?.getManifest?chrome.runtime.getManifest().version:'Browser preview';
  let bytes='Unavailable',sync='Not checked',helper='Unavailable';
  if(typeof chrome!=='undefined'&&chrome.storage?.local){
   try{bytes=new Intl.NumberFormat('en-US').format(await chrome.storage.local.getBytesInUse(null))+' bytes';}catch{bytes='Unavailable';}
   try{const v=await chrome.storage.local.get('odV2SyncEnabled');sync=v.odV2SyncEnabled?'Enabled':'Disabled';}catch{sync='Unavailable';}
  }
  helper=await nativeStatus();
  return {version,pages,widgets,bytes,sync,helper,network:typeof navigator!=='undefined'&&navigator.onLine===false?'Offline':'Online or unknown'};
 }
 let last='';
 async function showHealth(){
  const bridge=window.DeskBridge;if(!bridge?.show)return;
  bridge.show('<div class="modal-pad"><div class="modal-top"><div><span class="eyebrow">DESK / MAINTENANCE</span><h2 id="modalTitle">Desk Health & Recovery</h2><p>Read-only status · no notes, URLs, tokens or event details leave your computer.</p></div><button type="button" class="modal-close" data-health="close">✕</button></div><div id="deskHealthOutput" role="status" aria-live="polite">Checking local components…</div><div class="modal-actions"><button type="button" class="smallbutton" data-health="refresh">Refresh checks</button><button type="button" class="smallbutton" data-health="copy">Copy safe report</button><button type="button" class="smallbutton" data-health="settings">Backup & settings</button></div><p class="helper">Before a major update: Settings → Export JSON. Check your background folder permissions, Google Calendar, Pulse, Side Panel and Chrome Sync after updating. Never paste secret keys or private event details into support reports.</p></div>');
  await refreshHealth();
 }
 async function refreshHealth(){
  const node=$('deskHealthOutput');if(!node)return;
  const data=await diagnostics();
  if(!$('deskHealthOutput'))return;
  const rows=[['Version',data.version],['Workspaces',data.pages],['Widgets',data.widgets],['Local storage',data.bytes],['Chrome Sync',data.sync],['Updater',data.helper],['Network',data.network]];
  last=['Omnidite Desk diagnostics (no personal content)',...rows.map(([label,value])=>label+': '+value)].join('\n');
  $('deskHealthOutput').innerHTML='<div class="desk-health-list">'+rows.map(([label,value])=>'<div><span>'+escape(label)+'</span><strong>'+escape(value)+'</strong></div>').join('')+'</div>';
 }
 document.addEventListener('click',async e=>{
  const button=e.target.closest('[data-health]');
  if(button){
   if(button.dataset.health==='close')window.DeskBridge?.close?.();
   if(button.dataset.health==='refresh')await refreshHealth();
   if(button.dataset.health==='settings'){window.DeskBridge?.close?.();document.querySelector('[data-global="customize"]')?.click();}
   if(button.dataset.health==='copy'&&last){try{await navigator.clipboard.writeText(last);const el=$('deskHealthOutput');if(el)el.setAttribute('aria-label','Safe diagnostics copied');}catch{alert('Copy unavailable. Use Chrome clipboard permissions or take a screenshot of the summary.');}}
   return;
  }
  if(e.target.closest('#deskHealthButton'))await showHealth();
 });
 window.DeskHealth={diagnostics};
})();
