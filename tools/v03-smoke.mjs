import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../desk-v03.js', import.meta.url), 'utf8');
const handlers = {};
const modal = {open:false, querySelector:() => null};
const output = {html:'', saved:0, opened:[], alerts:[]};
const input = {value:'', focus(){}};
const commandResults = {innerHTML:''};
const captureResults = {innerHTML:''};
const nodes = {'#deskCommandInput':input,'#deskCommandResults':commandResults,'#deskCaptureList':captureResults};
const document = {
  getElementById(id){return id==='modal' ? modal : null;},
  querySelector(selector){return nodes[selector] || null;},
  addEventListener(type, handler){(handlers[type] ||= []).push(handler);}
};
const state = {
  pages:[{id:'overview',title:'Overview',modules:[{id:'m1',type:'links',title:'Links',cols:6,height:0,config:{links:[{label:'Docs',url:'https://example.com/docs'}]}},{id:'m2',type:'tasks',title:'Tasks',cols:6,height:0,config:{tasks:[{id:'t1',text:'Review tests',done:false}]}}]}],
  activePage:'overview', projects:[],captures:[],layoutSnapshots:[]
};
let nextId = 0;
const bridge = {
  getState:() => state,
  esc:value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  validUrl:value => {try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!!u.hostname;}catch{return false;}},
  uid:() => 'id-'+(++nextId),
  show:html => {output.html=html;modal.open=true;},
  close:() => {modal.open=false;},
  save:() => {output.saved++;},
  page:() => state.pages.find(p=>p.id===state.activePage),
  openGallery:() => {output.html='widget gallery';}
};
vm.runInNewContext(source,{window:{DeskBridge:bridge,open:url=>output.opened.push(url)},document,confirm:()=>true,alert:msg=>output.alerts.push(msg),console,Date,URL});
const trigger=(type,event)=>{for(const fn of handlers[type] || [])fn(event);};
const click=(action,id,extra={})=>trigger('click',{target:{closest:selector=>selector==='[data-v03]'?{dataset:{v03:action,id,...extra}}:null}});
const submit=(id,elements,dataset={})=>trigger('submit',{preventDefault(){},target:{id,elements,dataset}});
click('projects');
assert.match(output.html,/Projects hub/);
submit('v03ProjectForm',{name:{value:'R&D <Docs>'},url:{value:'https://example.com'},status:{value:'Active'}});
assert.equal(state.projects.length,1);
assert.match(output.html,/R&amp;D &lt;Docs&gt;/);
submit('v03ProjectForm',{name:{value:'Bad'},url:{value:'javascript:alert(1)'},status:{value:''}});
assert.equal(state.projects.length,1,'Unsafe URLs are rejected');

click('capture');
submit('v03CaptureForm',{title:{value:'Reference <img>'},url:{value:'https://example.com/r'},note:{value:'Quote <script>alert(1)</script>'},project:{value:'R&D <Docs>'}});
assert.equal(state.captures.length,1);
assert.match(captureResults.innerHTML,/&lt;script&gt;/,'Research notes are HTML escaped');

click('layouts');
click('preset',undefined,{preset:'compact'});
assert.equal(state.pages[0].modules[0].cols,4);
submit('v03SnapshotForm',{name:{value:'Focus layout'}});
assert.equal(state.layoutSnapshots.length,1);
state.pages[0].modules[0].cols=12;
click('restore-layout',state.layoutSnapshots[0].id);
assert.equal(state.pages[0].modules[0].cols,4,'Layout restoration works');

trigger('keydown',{ctrlKey:true,metaKey:false,key:'k',preventDefault(){}});
assert.match(output.html,/Command bar/);
assert.match(commandResults.innerHTML,/R&amp;D &lt;Docs&gt;/);
assert.ok(output.saved>=4);
console.log('PASS: V0.3 project, URL validation, HTML escaping, research capture, layout snapshots and command bar smoke tests');