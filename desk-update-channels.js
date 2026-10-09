/* Omnidite Desk V0.6 — opt-in update channels, fixed host protocol. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const CHANNEL={stable:{label:'Stable',branch:'main'},beta:{label:'Beta',branch:'beta'}};
 const NAME='com.omnidite.desk_updater';
 const select=$('deskUpdateChannel'),check=$('deskCheckButton'),install=$('deskInstallButton'),
   switchButton=$('deskSwitchChannel'),status=$('deskUpdateStatus'),help=$('deskUpdateHelp'),release=$('deskReleaseNotes');
 if(!select||!check||!install||!switchButton||!status)return;
 let busy=false,mode='unknown',installed='stable',userSelected=false,available=false;
 const resultText=message=>{status.textContent=String(message||'').slice(0,225);};
 function native(action){
  return new Promise((resolve,reject)=>{
   if(typeof chrome==='undefined'||!chrome.runtime?.sendNativeMessage)return reject(new Error('Native Messaging only works in your installed Chrome extension.'));
   chrome.runtime.sendNativeMessage(NAME,{action},response=>{
    if(chrome.runtime.lastError)return reject(new Error(chrome.runtime.lastError.message));
    if(!response||typeof response!=='object')return reject(new Error('No reply from the Desk updater helper.'));
    resolve(response);
   });
  });
 }
 function updateButtons(){
  check.disabled=busy;select.disabled=busy;
  const changing=mode==='channels'&&select.value!==installed;
  const canUpdate=mode!=='unknown'&&available&&!changing;
  switchButton.hidden=!changing;switchButton.disabled=busy;
  switchButton.textContent='Switch to '+CHANNEL[select.value].label;
  install.hidden=!canUpdate;install.disabled=busy;
  check.textContent=busy?'Checking…':'Check updates';
  install.textContent=busy?'Updating…':'Update now';
  if(release)release.href='https://github.com/BULLS192/Omnidite-Desk/commits/'+CHANNEL[select.value].branch+'/';
 }
 function showLegacy(){
  if(mode==='legacy'&&select.value==='beta'){
   help.hidden=false;
   help.textContent='Beta requires one local helper refresh: open your existing Omnidite-Desk folder and run Setup-OneClickUpdates.bat once. Reload Desk and check again. Stable updates continue to work with your current helper.';
   resultText('Beta switching is not yet supported by the installed Windows helper.');
  }else if(mode==='legacy'){
   help.hidden=false;
   help.textContent='Stable updates still work. For future Beta switching, run Setup-OneClickUpdates.bat once from your existing Desk folder after updating.';
  }else help.hidden=true;
 }
 function renderResponse(response){
  if(!response.ok){
   available=false;resultText(response.message||'Updater blocked an unsafe operation.');
   help.hidden=!/native|host|permission|setup/i.test(String(response.message||''));updateButtons();return;
  }
  if(mode==='channels' && (response.channel==='stable'||response.channel==='beta'))installed=response.channel;
  if(!userSelected)select.value=installed;
  available=response.status==='available';
  if(mode==='legacy'&&select.value==='beta'){showLegacy();}
  else {
   showLegacy();
   if(select.value!==installed)resultText('Currently on '+CHANNEL[installed].label+'. Switch to '+CHANNEL[select.value].label+' after exporting a JSON backup.');
   else if(available)resultText((response.behind||1)+' update commit(s) available for '+CHANNEL[installed].label+'.');
   else resultText('✓ '+CHANNEL[installed].label+' is current. No update required.');
  }
  updateButtons();
 }
 async function checkUpdates(){
  if(busy)return;busy=true;updateButtons();resultText('Checking the official GitHub branches…');
  try {
   let result=await native('channelStatus');
   if(result?.helperVersion===2){mode='channels';renderResponse(result);}
   else{
    // V0.5.x compiled helper only understands status/update.
    result=await native('status');mode='legacy';installed='stable';renderResponse(result);
   }
  }catch(err){
   try{
    const result=await native('status');
    mode='legacy';installed='stable';renderResponse(result);
   }catch(e){
    mode='unknown';available=false;help.hidden=false;
    help.textContent='Your native updater is not connected. Use the existing Setup-OneClickUpdates.bat in the Omnidite-Desk Git folder, then reopen Desk.';
    resultText('Updater: '+String(e.message||e).slice(0,125));
   }
  }finally{busy=false;updateButtons();}
 }
 async function installUpdate(){
  if(busy||!available||select.value!==installed)return;
  busy=true;updateButtons();resultText('Installing a fast-forward update…');
  try{
   const result=await native(mode==='channels'?'channelUpdate':'update');
   if(!result.ok)throw new Error(result.message||'Update safely refused.');
   if(result.status!=='updated'){available=false;resultText('✓ Already current.');return;}
   resultText('Updated '+CHANNEL[installed].label+'. Reloading the extension…');
   setTimeout(()=>chrome.runtime.reload(),850);
  }catch(e){resultText('Update blocked: '+String(e.message||e).slice(0,150));}
  finally{busy=false;available=false;updateButtons();}
 }
 async function switchChannel(){
  if(busy||mode!=='channels'||select.value===installed)return;
  const target=select.value,targetName=CHANNEL[target].label;
  if(!confirm('Switch from '+CHANNEL[installed].label+' to '+targetName+'? Export a JSON backup in Settings first. Switching changes extension code but keeps Chrome-local widget data. Beta may contain unfinished features.'))return;
  busy=true;updateButtons();resultText('Safely switching to '+targetName+'…');
  try{
   const response=await native(target==='beta'?'switchBeta':'switchStable');
   if(!response.ok)throw new Error(response.message||'Switch refused to protect local changes.');
   if(response.status!=='updated')throw new Error('The local helper did not confirm switching.');
   resultText('Switched to '+targetName+'. Reloading Desk…');
   setTimeout(()=>chrome.runtime.reload(),850);
  }catch(e){resultText('Channel switch blocked: '+String(e.message||e).slice(0,170));}
  finally{busy=false;available=false;updateButtons();}
 }
 check.addEventListener('click',checkUpdates);
 install.addEventListener('click',installUpdate);
 switchButton.addEventListener('click',switchChannel);
 select.addEventListener('change',()=>{
  userSelected=true;available=false;
  if(mode==='legacy'){showLegacy();}
  else if(mode==='channels')resultText(select.value===installed?'On '+CHANNEL[installed].label+'. Click Check updates.':'Switching to '+CHANNEL[select.value].label+' is optional; export backup first.');
  else resultText('Click Check updates to verify the local helper before switching channels.');
  updateButtons();
 });
 updateButtons();
 window.DeskUpdateChannels={checkUpdates};
})();
