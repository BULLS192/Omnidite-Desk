import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../desk-health.js',import.meta.url),'utf8');
const handlers={};
let healthHtml='',label='',settingsClicked=0;
const state={pages:[{modules:[{id:'w1'},{id:'w2'}]},{modules:[{id:'w3'}]}]};
const node={innerHTML:'',setAttribute:(k,v)=>{label=v;}};
const document={
 getElementById:id=>id==='deskHealthOutput'?node:null,
 querySelector:selector=>selector==='[data-global="customize"]'?{click:()=>settingsClicked++}:null,
 addEventListener:(type,fn)=>{handlers[type]=fn}
};
const chrome={runtime:{getManifest:()=>({version:'0.5.10'}),lastError:null,sendNativeMessage:(_host,req,callback)=>{assert.equal(req.action,'status');callback({ok:true,status:'current'})}},
 storage:{local:{getBytesInUse:async()=>2048,get:async()=>({odV2SyncEnabled:false})}}};
const window={DeskBridge:{getState:()=>state,show:html=>{healthHtml=html;},close:()=>{healthHtml='closed'}}};
const clipboard=[];
const navigator={onLine:true,clipboard:{writeText:async t=>clipboard.push(t)}};
vm.runInNewContext(source,{window,document,chrome,navigator,Intl,console,alert:()=>{throw Error('Unexpected alert')},Promise});
const d=await window.DeskHealth.diagnostics();
assert.equal(d.version,'0.5.10');
assert.equal(d.pages,2);
assert.equal(d.widgets,3);
assert.equal(d.sync,'Disabled');
assert.match(d.helper,/Connected/);
assert.match(d.bytes,/2,048/);
const click=async selector=>handlers.click({target:{closest:s=>s===selector?{dataset:{health:selector==='[data-health]'?'copy':undefined}}:null}});
await handlers.click({target:{closest:s=>s==='#deskHealthButton'?{}:null}});
assert.match(healthHtml,/Desk Health/);
assert.match(node.innerHTML,/Workspaces/);
assert.ok(!node.innerHTML.includes('w1'));
await handlers.click({target:{closest:s=>s==='[data-health]'?{dataset:{health:'copy'}}:null}});
assert.equal(clipboard.length,1);
assert.ok(!clipboard[0].includes('w1'));
await handlers.click({target:{closest:s=>s==='[data-health]'?{dataset:{health:'settings'}}:null}});
assert.equal(settingsClicked,1);
assert.equal(healthHtml,'closed');
console.log('PASS: local health checks, safe output only, updater readiness, copy and backup navigation');