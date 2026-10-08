import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const script=fs.readFileSync(new URL('../desk-v055.js',import.meta.url),'utf8');
const nodes={deskNextMeeting:{textContent:''},deskNextMeetingTime:{textContent:''}};
const listeners={};
let readCount=0,requestCount=0,tick=null;
const key='omnidite-google-calendar-local-v1';
const future=Date.now()+45*60000;
let cache={connected:true,selected:['work@example.com'],events:[
 {title:'Visible calendar event',when:future,calendar:'work@example.com',allDay:false},
 {title:'Must be excluded',when:future-1000,calendar:'private@example.com',allDay:false}
]};
const document={visibilityState:'visible',getElementById:id=>nodes[id],addEventListener:(n,f)=>{listeners[n]=f}};
const chrome={storage:{local:{get:async requested=>{assert.equal(requested,key);readCount++;return {[key]:cache}}},onChanged:{addListener:fn=>{listeners.storage=fn}}}};
const ctx={window:{},document,chrome,Date,Set,Number,Array,String,console,setInterval:fn=>{tick=fn;return 1},fetch:()=>{requestCount++;throw Error('No API call allowed')}};
vm.runInNewContext(script,ctx);
for(let i=0;i<3;i++)await new Promise(r=>setImmediate(r));
assert.equal(nodes.deskNextMeeting.textContent,'Visible calendar event');
assert.match(nodes.deskNextMeetingTime.textContent,/in (?:\d+ min|\d+ hr)/);
assert.equal(requestCount,0,'Cached dashboard teaser must not perform Google network calls');
assert.equal(readCount,1);
cache={connected:true,selected:['work@example.com'],events:[{title:'&lt;img src=x onerror=alert(1)&gt;',when:future+2000,calendar:'work@example.com',allDay:false}]};
listeners.storage({[key]:{newValue:cache}},'local');
assert.equal(nodes.deskNextMeeting.textContent,'&lt;img src=x onerror=alert(1)&gt;','Event title remains text, never HTML');
cache={connected:true,selected:['work@example.com'],events:[]};
listeners.storage({[key]:{newValue:cache}},'local');
assert.equal(nodes.deskNextMeeting.textContent,'No upcoming events');
cache={connected:false,selected:[],events:[]};
listeners.storage({[key]:{newValue:cache}},'local');
assert.equal(nodes.deskNextMeeting.textContent,'Connect your calendar');
cache={connected:true,selected:['work@example.com'],events:[{title:'Back to work',when:future,calendar:'work@example.com',allDay:false}]};
listeners.visibilitychange();await new Promise(r=>setImmediate(r));tick();
assert.equal(nodes.deskNextMeeting.textContent,'Back to work');
assert.ok(readCount>=2);
console.log('PASS: next cached Google Calendar event, selected-calendar filter, no network/HTML injection');
console.log('PASS: local storage change and visibility refresh with no credential access');
