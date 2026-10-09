import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const code=fs.readFileSync(new URL('../desk-update-channels.js',import.meta.url),'utf8');
const nativeSource=fs.readFileSync(new URL('../native-host/DeskNativeHost.cs',import.meta.url),'utf8');
function run(mode){
 const requests=[],handlers={},elements={};
 for(const name of ['deskUpdateChannel','deskCheckButton','deskInstallButton','deskSwitchChannel','deskUpdateStatus','deskUpdateHelp','deskReleaseNotes'])
  elements[name]={value:name==='deskUpdateChannel'?'stable':'',hidden:false,disabled:false,href:'',textContent:'',addEventListener:(event,cb)=>{handlers[name+':'+event]=cb}};
 const chrome={runtime:{lastError:null,reloaded:0,reload(){this.reloaded++},sendNativeMessage(name,request,callback){
  assert.equal(name,'com.omnidite.desk_updater');
  requests.push(request);
  const a=request.action;
  const current=mode==='legacy'?{ok:false,status:'error',message:'Unrecognized native host action.'}:{ok:true,status:'current',helperVersion:2,channel:'stable',behind:0};
  if(a==='channelStatus')return callback(current);
  if(a==='status')return callback({ok:true,status:'available',behind:1});
  if(a==='update'||a==='channelUpdate'||a==='switchBeta'||a==='switchStable')return callback({ok:true,status:'updated'});
  throw Error('Unexpected action '+a);
 }}};
 const context={document:{getElementById:id=>elements[id]},chrome,window:{},confirm:()=>true,setTimeout:f=>f(),Promise};
 vm.runInNewContext(code,context);
 return {elements,handlers,requests,chrome};
}
const modern=run('modern');
await modern.handlers['deskCheckButton:click']();
assert.equal(modern.elements.deskUpdateChannel.value,'stable');
assert.equal(modern.elements.deskInstallButton.hidden,true);
modern.elements.deskUpdateChannel.value='beta';
modern.handlers['deskUpdateChannel:change']();
assert.equal(modern.elements.deskSwitchChannel.hidden,false);
assert.match(modern.elements.deskUpdateStatus.textContent,/Switching to Beta/);
await modern.handlers['deskSwitchChannel:click']();
assert.equal(modern.requests.at(-1).action,'switchBeta');
assert.equal(modern.chrome.runtime.reloaded,1);
assert.ok(modern.requests.every(x=>Object.keys(x).join(',')==='action'),'Only action is sent; no arbitrary branch parameters');
const legacy=run('legacy');
await legacy.handlers['deskCheckButton:click']();
assert.equal(legacy.elements.deskInstallButton.hidden,false);
await legacy.handlers['deskInstallButton:click']();
assert.equal(legacy.requests.at(-1).action,'update');
assert.equal(legacy.chrome.runtime.reloaded,1);
legacy.elements.deskUpdateChannel.value='beta';
legacy.handlers['deskUpdateChannel:change']();
assert.match(legacy.elements.deskUpdateHelp.textContent,/Setup-OneClickUpdates.bat/);
assert.equal(legacy.elements.deskSwitchChannel.hidden,true);
assert.ok(!legacy.requests.some(x=>x.action==='switchBeta'));
for(const t of ['channelStatus','channelUpdate','switchStable','switchBeta','merge --ff-only','fetch --quiet origin main beta','merge-base --is-ancestor','branch --show-current','show-ref --verify --quiet','RemoteUrl'])
 assert.ok(nativeSource.includes(t),'Native host missing safety requirement: '+t);
assert.ok(nativeSource.includes('private static object Run(bool update)'),'Legacy stable update action must remain');
assert.ok(!nativeSource.includes('reset --hard'),'Never force reset the user clone');
assert.ok(!nativeSource.includes('clean -fd'),'Never remove untracked local files');
console.log('PASS: stable and beta UI, fixed actions, legacy helper fallback, manual-switch consent, no destructive Git operations');
