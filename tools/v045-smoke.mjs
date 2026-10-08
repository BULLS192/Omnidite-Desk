import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root=new URL('../',import.meta.url);
const v04=fs.readFileSync(new URL('desk-v04.js',root),'utf8');
const v05=fs.readFileSync(new URL('desk-v05.js',root),'utf8');
const handlers={}, nodes={}, outputs={html:'',save:0,alerts:[],opened:[],requests:[],fetches:[]};
const modal={open:true}; nodes['#deskCalendarFile']={click(){}};
const document={
 getElementById:id=>id==='modal'?modal:null,
 querySelector:selector=>nodes[selector]||null,
 addEventListener:(event,fn)=>(handlers[event]??=[]).push(fn),
 readyState:'complete',
};
const state={projects:[{name:'Omnidite'}],advancedTasks:[],contentItems:[],workSessions:[],calendarEvents:[],captures:[],pages:[{id:'overview',title:'Overview',modules:[]}],activePage:'overview',githubRepos:['BULLS192/Omnidite-Desk'],githubSelected:'BULLS192/Omnidite-Desk',githubCache:null,pulseSettings:{url:'',auto:false},pulseCache:null,operationalAlerts:[]};
let next=0;
const bridge={
 getState:()=>state,esc:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
 uid:()=>String(++next),save:()=>{outputs.save++},close:()=>{modal.open=false},
 show:html=>{outputs.html=html;modal.open=true},
 validUrl:s=>{try{return ['http:','https:'].includes(new URL(s).protocol);}catch{return false;}}
};
const tabs=[{title:'Project',url:'https://example.com/page'},{title:'Internal',url:'chrome://settings'}];
const chrome={tabs:{query:async()=>tabs,create:async o=>outputs.opened.push(o.url)},permissions:{contains:async()=>false,request:async p=>{outputs.requests.push(p);return true}}};
const fakeFetch=async url=>{
 outputs.fetches.push(String(url));
 let data={};
 if(url.includes('/actions/runs'))data={workflow_runs:[{name:'Validate',conclusion:'failure'}]};
 else if(url.includes('/pulls'))data=[{number:5,title:'Work'}];
 else if(url.includes('api.github.com'))data={open_issues_count:4,html_url:'https://github.com/BULLS192/Omnidite-Desk'};
 else data={capturedAt:'2026-10-08T10:00:00Z',providers:[{name:'Vercel',status:'degraded',metrics:[{label:'Deployments',value:90,limit:100,unit:''}]}]};
 return {ok:true,text:async()=>JSON.stringify(data)};
};
const context={window:{DeskBridge:bridge,open:url=>outputs.opened.push(url)},document,chrome,Date,URL,Number,JSON,AbortController,setTimeout:()=>1,clearTimeout:()=>{},setInterval:()=>{},alert:m=>outputs.alerts.push(m),confirm:()=>true,prompt:()=> 'My session',fetch:fakeFetch,console};
vm.runInNewContext(v04,context);
vm.runInNewContext(v05,context);
const fire=(event,payload)=>{for(const handler of handlers[event]||[])handler(payload);};
const click=(which,action,id,extra={})=>fire('click',{target:{closest:selector=>selector==='[data-'+which+']'?{dataset:{[which]:action,id,...extra}}:null}});
const form=(id,elements)=>fire('submit',{preventDefault(){},target:{id,elements,dataset:{id:''}}});
const input=(value)=>({value});

click('v04','tasks');
assert.match(outputs.html,/Task planner/);
form('v04TaskForm',{title:input('Draft technical post'),project:input('Omnidite'),priority:input('high'),due:input('2026-12-12'),done:{checked:false}});
assert.equal(state.advancedTasks[0].title,'Draft technical post');
assert.equal(state.advancedTasks[0].priority,'high');

form('v04ContentForm',{title:input('AM article'),project:input('Omnidite'),channel:input('LinkedIn'),stage:input('Draft'),date:input('2026-11-10')});
assert.equal(state.contentItems.length,1);
assert.equal(state.contentItems[0].channel,'LinkedIn');

click('v04','new-session');
await new Promise(resolve=>setImmediate(resolve));
assert.equal(state.workSessions.length,1);
assert.equal(state.workSessions[0].tabs.length,1);
assert.ok(outputs.requests.some(x=>x.permissions?.includes('tabs')));
click('v04','capture-tab');
await new Promise(resolve=>setImmediate(resolve));
assert.equal(state.captures.length,1);
assert.equal(state.captures[0].url,'https://example.com/page');

const file={size:300,text:async()=> 'BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART:20261110T160000Z\nSUMMARY:Planning Call\nEND:VEVENT\nEND:VCALENDAR'};
fire('change',{target:{id:'deskCalendarFile',dataset:{},files:[file],value:'calendar.ics'}});
await new Promise(resolve=>setImmediate(resolve));
assert.equal(state.calendarEvents.length,1);
assert.equal(state.calendarEvents[0].title,'Planning Call');

click('v05','github-refresh');
await new Promise(resolve=>setImmediate(resolve));
assert.equal(state.githubCache.openPrs,1);
assert.equal(state.githubCache.failedWorkflows,1);
assert.ok(state.operationalAlerts.some(a=>a.source.startsWith('GitHub')));

form('v05PulseForm',{url:input('https://pulse.omnidite.com/desk-feed.json'),auto:{checked:false}});
assert.equal(state.pulseSettings.url,'https://pulse.omnidite.com/desk-feed.json');
click('v05','pulse-refresh');
await new Promise(resolve=>setImmediate(resolve));
assert.equal(state.pulseCache.providers[0].status,'warning');
assert.ok(state.operationalAlerts.some(a=>a.source==='Vercel'));
assert.ok(outputs.requests.some(x=>x.origins?.[0]==='https://pulse.omnidite.com/*'));

const before=state.pulseSettings.url;
form('v05PulseForm',{url:input('https://evil.example.com/feed'),auto:{checked:false}});
assert.equal(state.pulseSettings.url,before,'Non-Omnidite domains rejected');
assert.ok(outputs.save>=6);
console.log('PASS: V0.4 tasks, content, consented tab sessions and capture, ICS import');
console.log('PASS: V0.5 GitHub read-only monitoring, scoped Pulse host, status normalization, local alerts');
