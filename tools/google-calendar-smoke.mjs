import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const src=fs.readFileSync(new URL('../desk-google-calendar.js',import.meta.url),'utf8');
let clientId='YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
let popup='',tokenRequests=[],network=[],permissionRequests=[],stored={},saved=0,removed=0;
const events={},nodes={};
const state={calendarEvents:[{id:'import-1',title:'Offline Planning',when:Date.now()+86400000}]};
const doc={
 querySelector:s=>nodes[s]||null,
 querySelectorAll:s=>s==='[data-gcal-choice]:checked'?[{dataset:{gcalChoice:'primary@example.com'}},{dataset:{gcalChoice:'team@example.com'}}]:[],
 addEventListener:(name,fn)=>(events[name]??=[]).push(fn)
};
const bridge={
 getState:()=>state,
 esc:x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
 show:html=>popup=html,
 close:()=>{}
};
const storage={
 get:async key=>({[key]:stored[key]}),
 set:async value=>{Object.assign(stored,value);saved++},
 remove:async key=>{delete stored[key];removed++}
};
const chrome={
 runtime:{id:'abcdefghijklmnopabcdefghijklmnop',getManifest:()=>({oauth2:{client_id:clientId}})},
 storage:{local:storage},
 permissions:{request:async data=>{permissionRequests.push(data);return true},contains:async()=>true},
 identity:{
  getAuthToken:async options=>{tokenRequests.push(options);return {token:'temporary-test-token',grantedScopes:['https://www.googleapis.com/auth/calendar.readonly']}},
  removeCachedAuthToken:async options=>{assert.equal(options.token,'temporary-test-token')}
 }
};
const start=new Date(Date.now()+86400000).toISOString();
const nextDayLocal=new Date(Date.now()+86400000);
const allDayStart=[nextDayLocal.getFullYear(),String(nextDayLocal.getMonth()+1).padStart(2,'0'),String(nextDayLocal.getDate()).padStart(2,'0')].join('-');
const responses={
 list:{items:[{id:'primary@example.com',summary:'Primary',primary:true,selected:true,accessRole:'owner'},{id:'team@example.com',summary:'Team Work',primary:false,selected:false,accessRole:'reader'}]},
 primary:{items:[{id:'a1',summary:'Customer meeting',start:{dateTime:start},htmlLink:'https://calendar.google.com/calendar/event?eid=abc'},{id:'notneeded',status:'cancelled',summary:'Cancelled',start:{dateTime:start}},{id:'nope',summary:'Wrong link',start:{dateTime:start},htmlLink:'javascript:alert(1)'}]},
 team:{items:[{id:'t1',summary:'Team event',start:{date:allDayStart},htmlLink:'https://www.google.com/calendar/event?eid=team'}]}
};
const fakeFetch=async (url,options)=>{
 const s=String(url);network.push({url:s,options});
 let data;
 if(s.includes('/users/me/calendarList'))data=responses.list;
 else if(s.includes('/calendars/primary%40example.com/events'))data=responses.primary;
 else if(s.includes('/calendars/team%40example.com/events'))data=responses.team;
 else throw Error('Unexpected network URL: '+s);
 assert.equal(options.method,'GET');
 assert.equal(options.credentials,'omit');
 assert.equal(options.headers.Authorization,'Bearer temporary-test-token');
 return {ok:true,status:200,text:async()=>JSON.stringify(data)};
};
const ctx={window:{DeskBridge:bridge,open:()=>{}},document:doc,chrome,Date,URL,URLSearchParams,Number,JSON,AbortController,setTimeout:()=>1,clearTimeout:()=>{},alert:()=>{},confirm:()=>true,navigator:{clipboard:{writeText:async()=>{}}},fetch:fakeFetch,console};
vm.runInNewContext(src,ctx);
const flush=async()=>{for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r))};
const click=action=>{for(const cb of events.click||[])cb({target:{closest:()=>({dataset:{gcal:action}})}})};
const open=async()=>{await ctx.window.DeskGoogleCalendar.open();await flush()};

await open();
assert.match(popup,/authorization setup needed/i);
assert.match(popup,/abcdefghijklmnopabcdefghijklmnop/);
assert.equal(tokenRequests.length,0,'Never request a Google token without a configured OAuth client');
assert.equal(network.length,0);
clientId='123456789012-demo-client.apps.googleusercontent.com';
await open();
assert.match(popup,/Connect Google account/);
click('connect');await flush();
assert.ok(permissionRequests.some(v=>v.origins?.includes('https://www.googleapis.com/*')));
assert.ok(tokenRequests.some(v=>v.interactive===true),'OAuth permission initiated only from user interaction');
assert.equal(stored['omnidite-google-calendar-local-v1'].connected,true);
assert.equal(stored['omnidite-google-calendar-local-v1'].events.length,2,'Include valid and invalid-link events, omit cancelled');
assert.ok(popup.includes('Customer meeting'));
assert.ok(popup.includes('Offline Planning'),'Existing ICS snapshot preserved alongside Google events');
assert.ok(!popup.includes('Cancelled'),'Cancelled events omitted');
assert.ok(!popup.includes('javascript:alert'));
assert.ok(!JSON.stringify(stored).includes('temporary-test-token'),'No access tokens saved');
assert.ok(!JSON.stringify(state).includes('Customer meeting'),'Google events excluded from main Desk state and sync');

click('apply');await flush();
assert.deepEqual([...stored['omnidite-google-calendar-local-v1'].selected],['primary@example.com','team@example.com']);
assert.ok(network.some(x=>x.url.includes('/calendars/team%40example.com/events')));
assert.ok(popup.includes('Team event'),'Additional selected calendar rendered');

click('disconnect');await flush();
assert.equal(removed,1,'Disconnect clears only the separate local Google event cache');
assert.equal(state.calendarEvents[0].title,'Offline Planning','Offline .ics content untouched');
assert.equal(tokenRequests.filter(x=>x.interactive===true).length,1,'No extra interactive OAuth prompts');
assert.ok(network.every(x=>x.url.startsWith('https://www.googleapis.com/calendar/v3/')),'No unexpected web destinations');
console.log('PASS: Google OAuth setup gate, interactive consent, read-only Calendar API, multiple calendars');
console.log('PASS: No stored tokens, ICS preservation, event safety and local-only cache clearing');
