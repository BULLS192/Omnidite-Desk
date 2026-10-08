import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const script=fs.readFileSync(new URL('../desk-v052.js',import.meta.url),'utf8');
let id=0,online=true,installed=true;
const calls=[],events={};
let modal='',prompts=0;
const badge={textContent:'',dataset:{},title:''};
const state={pulseSettings:{url:'http://127.0.0.1:4173/api/providers'}};
const doc={
 readyState:'complete',
 querySelector:s=>s==='#deskV052Status'?badge:null,
 addEventListener:(name,handler)=>{(events[name]??=[]).push(handler)}
};
const bridge={
 getState:()=>state,
 esc:v=>String(v??'').replaceAll('<','&lt;').replaceAll('>','&gt;'),
 show:html=>modal=html,
 close:()=>{},
};
const chrome={runtime:{
 lastError:null,
 sendNativeMessage:(name,request,cb)=>{
  assert.equal(name,'com.omnidite.desk_updater');
  calls.push(request.action);
  switch(request.action){
  case 'pulseStatus': return cb({ok:true,status:online?'online':'offline',installed,running:online,message:'Status checked'});
  case 'pulseStart': online=true;return cb({ok:true,status:'online',installed:true,running:online,message:'Started'});
  case 'pulseStop': online=false;return cb({ok:true,status:'offline',installed:true,running:online,message:'Stopped'});
  case 'pulseRestart': online=true;return cb({ok:true,status:'online',installed:true,running:online,message:'Restarted'});
  default: throw Error('Unexpected browser action '+request.action);
  }
 }
}};
const context={window:{DeskBridge:bridge},document:doc,chrome,confirm:()=>{prompts++;return true;},setInterval:()=>{},setTimeout:()=>{},console};
vm.runInNewContext(script,context);
const flush=async()=>{await new Promise(r=>setImmediate(r));};
const click=action=>{const e={target:{closest:()=>({dataset:{v052:action}})}};for(const fn of events.click||[])fn(e)};
await flush();
assert.match(badge.textContent,/online/);
click('controls');await flush();
assert.match(modal,/background controls/i);
assert.match(modal,/Start/);
click('stop');await flush();
assert.match(badge.textContent,/offline/);
click('start');await flush();
assert.match(badge.textContent,/online/);
click('restart');await flush();
assert.match(modal,/Restarted/);
assert.equal(prompts,2);
assert.deepEqual(calls.filter(x=>x!=='pulseStatus'),['pulseStop','pulseStart','pulseRestart']);
assert.ok(calls.every(x=>['pulseStatus','pulseStart','pulseStop','pulseRestart'].includes(x)));
state.pulseSettings.url='';
click('status');await flush();
assert.match(badge.textContent,/not configured/);
console.log('PASS: V0.5.2 Pulse status, setup guide, Start/Stop/Restart, fixed host action allowlist');
