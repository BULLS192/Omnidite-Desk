import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('desk-v09.js'),app=read('app.js'),v05=read('desk-v05.js');
const now=new Date('2026-10-11T06:00:00Z').getTime();
const state={
 projects:[{id:'p1',name:'Omnidite',url:'https://omnidite.com',status:'Active',repo:'BULLS192/omnidite',previewUrl:'https://preview.omnidite.com',note:'Documentation'}],
 advancedTasks:[{id:'t1',title:'Do release',project:'Omnidite',due:'2026-10-11',stage:'blocked',done:false}],
 contentItems:[{id:'c1',title:'Draft article',project:'Omnidite',stage:'Idea'}],
 opsPrefs:{warn:80,critical:95,staleHours:3},
 githubCache:{repo:'BULLS192/other',checkedAt:now-2000,openPrs:2,openIssues:8,failedWorkflows:1,url:'https://github.com/BULLS192/other'},
 pulseSettings:{url:'http://127.0.0.1:4173/api/providers',auto:false},
 pulseCache:{source:'Pulse localhost',checkedAt:now-120000,providers:[
 {name:'Vercel',status:'ok',metrics:[{label:'Deployments',value:84,limit:100,unit:''},{label:'Bandwidth',value:96,limit:100,unit:'GB'}]},
 {name:'Supabase',status:'warning',metrics:[{label:'Storage',value:0.1,limit:1,unit:'GB'}]}
 ]},
 operationalAlerts:[{id:'a1',source:'Vercel',message:'Usage high',severity:'warning',createdAt:now-1000,acknowledgedAt:0,signature:'Vercel:Usage high'}]
};
const handlers={click:[],submit:[],change:[]},out={html:'',closed:false,save:0};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validUrl=s=>{try{return ['http:','https:'].includes(new URL(s).protocol);}catch{return false;}};
const bridge={getState:()=>state,esc,validUrl,uid:()=>String(Date.now()),show:html=>out.html=html,close:()=>out.closed=true,save:()=>out.save++};
const document={addEventListener:(k,fn)=>handlers[k].push(fn),querySelector:()=>null};
const window={DeskBridge:bridge,DeskV08:{calendarCache:async()=>null,collectAgenda:()=>({items:[{title:'Review proposal',when:now+3600000,detail:'Upcoming meeting'}],source:'Local .ics'})},DeskV05:{updateBadge:()=>out.badged=true}};
const ctx={window,document,console,Date,Intl,URL,Number,alert:()=>{},confirm:()=>true};
vm.runInNewContext(source,ctx);
const api=window.DeskV09;
assert.ok(api,'V0.9 API missing');
const meter=api.monitorData(state,now);
assert.equal(meter.pulse.rows.length,2);
assert.equal(meter.pulse.rows[0].metrics[0].percentage,84);
assert.equal(meter.pulse.rows[0].metrics[0].level,'warning');
assert.equal(meter.pulse.rows[0].metrics[1].level,'critical');
assert.equal(meter.flagged,2,'Metrics warnings and provider degraded status both count');
assert.equal(meter.github.failed,1);
assert.equal(meter.pulse.stale,false);
assert.equal(meter.alerts,1);
assert.equal(api.pct(10,0),null);
assert.equal(api.pct(10,100),10);
assert.equal(api.staleAt(now-4*3600000,now,3),true);
assert.equal(api.staleAt(now-2*3600000,now,3),false);
const old={...state,pulseCache:{...state.pulseCache,source:'Imported JSON snapshot',capturedAt:'2026-10-01T00:00:00Z'}};
assert.equal(api.pulseRows(old,now).stale,true,'Imported snapshots must never be called live');
const unknown={...state,pulseCache:null,githubCache:null,operationalAlerts:[]};
assert.equal(api.monitorData(unknown,now).pulse.rows.length,0,'Missing provider data must not create fictitious providers');
assert.equal(api.monitorData(unknown,now).github.stale,true);
let p=api.projectStats(state.projects[0],state);
assert.equal(p.open,1);assert.equal(p.blocked,1);assert.equal(p.content,1);
assert.equal(p.github,null,'Do not attach cached statistics from an unrelated repository');
state.githubCache.repo='BULLS192/omnidite';
assert.ok(api.projectStats(state.projects[0],state).github,'Matching repository may show the cached result');
api.overview();
assert.match(out.html,/Unified monitoring/);
assert.match(out.html,/Vercel/);assert.match(out.html,/Supabase/);
assert.match(out.html,/96.0%/);
api.projects();
assert.match(out.html,/Project command center/);
assert.match(out.html,/preview.omnidite.com/);
api.alerts();assert.match(out.html,/Acknowledge/);
const event=(a,id)=>({target:{closest:sel=>sel==='[data-v09]'?{dataset:{v09:a,id}}:null}});
for(const fn of handlers.click)fn(event('ack','a1'));
assert.ok(state.operationalAlerts[0].acknowledgedAt>0);
assert.equal(api.monitorData(state).alerts,0);
assert.equal(out.badged,true);
api.alerts();assert.doesNotMatch(out.html,/Usage high/,'Acknowledged alert hidden from default active view');
for(const fn of handlers.click)fn(event('settings'));
assert.match(out.html,/Alert settings/);
const target={id:'v09AlertSettings',elements:{warn:{value:'90'},critical:{value:'100'},stale:{value:'6'}}};
for(const fn of handlers.submit)fn({target,preventDefault(){}});
assert.equal(state.opsPrefs.warn,90);assert.equal(state.opsPrefs.critical,100);
const saved=out.save;
for(const fn of handlers.click)fn(event('new-project'));
assert.match(out.html,/v09ProjectForm/);
const form={id:'v09ProjectForm',dataset:{id:''},elements:{
 name:{value:'Demo'},status:{value:'Tracked'},url:{value:'https://demo.example'},preview:{value:'https://preview.demo.example'},repo:{value:'BULLS192/demo'},note:{value:'Example'}
}};
for(const fn of handlers.submit)fn({target:form,preventDefault(){}});
assert.equal(state.projects.at(-1).previewUrl,'https://preview.demo.example');
assert.equal(state.projects.at(-1).repo,'BULLS192/demo');
assert.ok(out.save>saved);
assert.match(out.html,/Demo/);
await api.dailyBrief();
assert.match(out.html,/Daily operations brief/);
assert.match(out.html,/Review proposal/);
assert.match(app,/previewUrl:validUrl\(x\.previewUrl\)/,'Optional project metadata must be normalized');
assert.match(app,/acknowledgedAt:Number\.isFinite/,'Alert acknowledgement must survive backup');
assert.match(app,/opsPrefs/,'Alert threshold settings must survive backup');
assert.match(v05,/const prefs=S\(\)\.opsPrefs/,'Pulse alert engine must respect thresholds');
assert.match(v05,/window\.DeskV05=/,'V0.9 should reuse established collector');
const manifest=JSON.parse(read('manifest.json'));
assert.equal(manifest.version,'0.9.0');
assert.deepEqual(manifest.permissions,['storage','sidePanel','nativeMessaging','favicon','identity']);
console.log('PASS: V0.9 source freshness, numerical limits, provider cache, project mapping, alert acknowledgement, configurable thresholds, daily brief, private state and extension permissions');
