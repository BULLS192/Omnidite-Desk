import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('desk-v08.js'),app=read('app.js'),v03=read('desk-v03.js');
const handlers={},output={html:'',saves:0,alerts:[],urls:[]};
const now=new Date('2026-10-09T10:00:00Z').getTime();
const state={
 activePage:'overview',
 pages:[{id:'overview',title:'Overview',modules:[
  {id:'notes1',title:'Strategic Notes',type:'notes',config:{text:'Additive manufacturing and supply chain'}},
  {id:'local-agenda',title:'Local agenda',type:'agenda',config:{events:[{id:'local1',title:'Dinner',when:'2026-10-10T18:30'}]}},
  {id:'work',title:'Tasks',type:'tasks',config:{tasks:[{id:'wt',text:'Review plans',done:false}]}},
  {id:'links',title:'Links',type:'links',config:{links:[{label:'Omnidite',url:'https://omnidite.com'}]}}
 ]}],
 projects:[{id:'p1',name:'Omnidite',status:'Active',url:'https://omnidite.com'}],
 advancedTasks:[
  {id:'t1',title:'Publish roadmap',project:'Omnidite',priority:'high',due:'2026-10-10',done:false,stage:'doing'},
  {id:'t2',title:'Overdue report',project:'Omnidite',priority:'medium',due:'2026-10-08',done:false},
  {id:'t3',title:'Done draft',project:'Omnidite',priority:'medium',due:'2026-10-10',done:true,stage:'done'}
 ],
 contentItems:[{id:'c1',title:'Omnidite LinkedIn',channel:'LinkedIn',stage:'Draft',date:'2026-10-10',project:'Omnidite'}],
 captures:[{id:'c1',title:'Market research',url:'https://example.com/page',note:'Europe and Singapore markets',project:'Omnidite',collection:'Markets',tags:['logistics'],createdAt:now}],
 workSessions:[{id:'w1',name:'Planning',tabs:[{url:'https://example.com'}]}],
 calendarEvents:[{id:'offline',title:'Imported meeting',when:now+3600000}]
};
const calendar={connected:true,selected:['primary'],updatedAt:now,events:[
 {id:'g1',title:'Google meeting',calendar:'primary',when:now+3600000},
 {id:'g2',title:'Should be excluded',calendar:'secondary',when:now+3600000}
]};
let ids=0;
const bridge={
 getState:()=>state,
 esc:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
 validUrl:s=>{try{const u=new URL(s);return ['http:','https:'].includes(u.protocol);}catch{return false;}},
 show:s=>output.html=s,close:()=>{},save:()=>output.saves++,uid:()=>String(++ids)
};
const doc={addEventListener:(type,fn)=>(handlers[type]??=[]).push(fn),querySelector:()=>null};
const ctx={window:{DeskBridge:bridge,open:url=>output.urls.push(url)},document:doc,Date,Intl,URL,console,chrome:{storage:{local:{get:async k=>({[k]:calendar})}}},alert:m=>output.alerts.push(m),confirm:()=>true,Blob,setTimeout:()=>0};
vm.runInNewContext(source,ctx);
const api=ctx.window.DeskV08;
assert.ok(api,'V08 bridge is published');
assert.equal(api.taskStage(state.advancedTasks[0]),'doing');
assert.equal(api.taskStage(state.advancedTasks[2]),'done');
assert.equal(api.taskCounts(state).doing,1);
assert.equal(api.taskCounts(state).done,1);
const agenda=api.collectAgenda(state,calendar,now,7);
assert.ok(agenda.items.some(x=>x.title==='Google meeting'));
assert.ok(!agenda.items.some(x=>x.title==='Should be excluded'));
assert.ok(!agenda.items.some(x=>x.title==='Imported meeting'),'Connected cache should not duplicate offline calendar');
assert.ok(agenda.items.some(x=>x.type==='deadline'&&x.title==='Publish roadmap'));
assert.ok(agenda.items.some(x=>x.type==='content'&&x.title==='Omnidite LinkedIn'));
assert.equal(agenda.overdue.length,1);
assert.equal(api.collectAgenda(state,null,now,7).source,'Imported local .ics');
assert.ok(api.collectAgenda(state,null,now,7).items.some(x=>x.title==='Imported meeting'));
const catalog=api.entries(state,calendar);
assert.ok(catalog.some(x=>x.type==='note'&&x.detail.includes('Additive manufacturing')));
assert.ok(catalog.some(x=>x.type==='research'&&x.detail.includes('logistics')));
assert.ok(catalog.some(x=>x.type==='session'));
assert.ok(catalog.some(x=>x.type==='project'));
assert.ok(catalog.some(x=>x.type==='calendar'&&x.title==='Google meeting'));
assert.equal(api.searchEntries(catalog,'Logistics').length,1);
assert.ok(api.searchEntries(catalog,'Omnidite').some(x=>x.type==='project'));
assert.ok(api.searchEntries(catalog,'market research','research').length===1);
assert.ok(api.searchEntries(catalog,'','calendar').every(x=>x.type==='calendar'));
assert.deepEqual(Array.from(api.uniqueTags('ai, ai, supply chain, 3d')),['ai','supply chain','3d']);
assert.equal(api.canonicalUrl('https://example.com/page/#fragment'),'https://example.com/page');
assert.equal(api.captureList(state,'Markets').length,1);
await api.openSearch();
assert.match(output.html,/Universal search/);
api.taskBoard();
assert.match(output.html,/Project task board/);
const fire=(type,payload)=>{for(const h of handlers[type]||[])h(payload);};
const input=value=>({value});
const makeTarget=(act,id)=>({closest:sel=>sel==='[data-v08]'?{dataset:{v08:act,id}}:null});
fire('click',{target:makeTarget('new-task')});
assert.match(output.html,/v08TaskForm/);
const submit=(id,elements,dataset={})=>fire('submit',{preventDefault(){},target:{id,elements,dataset}});
submit('v08TaskForm',{title:input('New project task'),project:input('Omnidite'),priority:input('high'),due:input('2026-10-12'),stage:input('blocked')});
assert.equal(state.advancedTasks.at(-1).stage,'blocked');
assert.ok(!state.advancedTasks.at(-1).done);
const beforeCaptures=state.captures.length;
api.openCapture();
assert.match(output.html,/v08CaptureForm/);
submit('v08CaptureForm',{title:input('Duplicate URL'),url:input('https://example.com/page#new'),project:input('Omnidite'),collection:input('Reports'),tags:input('economics'),note:input('research')});
assert.equal(state.captures.length,beforeCaptures,'Must not silently duplicate URLs');
assert.ok(output.alerts.some(x=>x.includes('Already saved')));
submit('v08CaptureForm',{title:input('<Research>'),url:input('https://example.com/unique'),project:input('Omnidite'),collection:input('Imports'),tags:input('cross-border, shipping'),note:input('<script>not executable</script>')});
assert.equal(state.captures.length,beforeCaptures+1);
assert.deepEqual(Array.from(state.captures[0].tags),['cross-border','shipping']);
assert.match(output.html,/&lt;Research&gt;/);
assert.match(output.html,/&lt;script&gt;/);
assert.ok(output.saves>=2);
assert.match(v03,/if \(window\.DeskV08\?\.openSearch\)/,'Old command bar should route to enhanced search');
assert.match(app,/collection:cleanText\(x\.collection/,'New research fields must survive state normalization');
assert.match(app,/stage:\['todo','doing','blocked','done'\]/,'Task stages must survive state normalization');
console.log('PASS: V0.8 agenda, cached Calendar selection, tasks/deadlines, board statuses, search, safe local research, dedup, state persistence guards');
