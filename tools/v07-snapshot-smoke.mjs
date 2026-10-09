import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../desk-v07-snapshot.js',import.meta.url),'utf8');
const listener={};
const now=new Date('2026-10-09T12:00:00Z').getTime();
const state={
 activePage:'overview',
 pages:[{id:'overview',modules:[
 {type:'weather',config:{cities:[{id:'sg',name:'Singapore',country:'Singapore',timezone:'Asia/Singapore',latitude:1.3521,longitude:103.8198}]}},
 {type:'tasks',config:{tasks:[{id:'a',text:'Write draft',done:false},{id:'b',text:'Done item',done:true}]}},
 ]}],
 advancedTasks:[
 {title:'Review proposal',due:'2026-10-08',priority:'high',project:'Omnidite',done:false},
 {title:'Build article',due:'2026-10-10',priority:'medium',project:'Omnidite',done:false},
 {title:'Already done',due:'2026-10-10',priority:'low',project:'Omnidite',done:true},
 ],
 calendarEvents:[{title:'Offline meeting',when:now+2*3600000}],
 githubCache:{repo:'BULLS192/Omnidite-Desk',checkedAt:now,failedWorkflows:1},
 pulseCache:{checkedAt:now,providers:[{status:'warning'},{status:'ok'}]}
};
const fakeCalendar={connected:true,updatedAt:now,selected:['primary'],events:[
 {id:'g1',calendar:'primary',title:'Google meeting',when:now+3600000},
 {id:'g2',calendar:'other',title:'Not selected',when:now+3600000}
]};
const window={DeskV07:{},DeskBridge:{getState:()=>state,save:()=>{}},DeskAir:{load:async()=>({kind:'psi',psi:{north:88}}),summary:()=>'<b>PSI 88</b>'}};
const document={addEventListener:(event,fn)=>listener[event]=fn,querySelector:()=>null,visibilityState:'visible'};
const chrome={storage:{local:{get:async key=>({[key]:fakeCalendar})}}};
let calls=0;
const context={window,document,chrome,Date,Intl,Number,URL,AbortSignal,console,setInterval:()=>{},fetch:async url=>{
 calls++;assert.match(url,/api.open-meteo.com\/v1\/forecast/);
 return {ok:true,json:async()=>({current:{temperature_2m:30.2,relative_humidity_2m:80,weather_code:1,time:'2026-10-09T20:00'}})};
}};
vm.runInNewContext(source,context);
const api=window.DeskV07;
assert.match(api.renderSnapshot({id:'ss1',type:'snapshot',config:{days:3}}),/Daily|YOUR LOCAL TASKS/);
const summary=api.summaryData(state,fakeCalendar,{days:3},now);
assert.equal(summary.meetingList.length,1);
assert.equal(summary.meetingList[0].title,'Google meeting');
assert.equal(summary.calendarSource,'Cached Google Calendar');
assert.equal(summary.tasks.length,3);
assert.equal(summary.overdue,1);
assert.equal(summary.dueSoon,1);
assert.equal(summary.github.failedWorkflows,1);
assert.equal(summary.pulse.providers[0].status,'warning');
const fallback=api.summaryData(state,null,{days:3},now);
assert.equal(fallback.calendarSource,'Imported .ics snapshot');
assert.equal(fallback.meetingList[0].title,'Offline meeting');
const weather=await api.currentSnapshotWeather(state.pages[0].modules[0].config.cities[0]);
assert.equal(weather.temperature,30.2);
await api.currentSnapshotWeather(state.pages[0].modules[0].config.cities[0]);
assert.equal(calls,1,'Weather cached rather than fetching repeatedly');
assert.match(source,/Chrome-local cache/);
assert.ok(!source.includes('getAuthToken'));
console.log('PASS: local daily snapshot, due/overdue, project tasks, selected cached calendars, Pulse/GitHub and weather cache');
