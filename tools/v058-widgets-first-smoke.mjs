import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
for(const page of ['index.html','sidepanel.html']){
 const html=read(page);
 const index=(v)=>{const x=html.indexOf(v);assert.ok(x>=0,page+': missing '+v);return x};
 const order=[
  'class="topbar"',
  'id="mobilePages"',
  'class="sectionhead"',
  'id="pageHeading"',
  'id="grid"',
  'id="deskWorkspaceTools"',
  'id="deskToolsTitle"',
  'id="searchForm"',
  'class="desk-quick-actions desk-primary-actions"',
  'class="desk-tools-more"',
  'class="desk-ops-strip"',
  'id="deskUpdateBar"',
  'id="deskUpdateHelp"',
  'class="footer"'
 ].map(index);
 for(let i=1;i<order.length;i++)assert.ok(order[i]>order[i-1],page+': expected widget-first order index '+i);
 assert.ok(index('id="grid"')<index('id="searchForm"'),page+': widgets before search');
 assert.ok(index('id="grid"')<index('id="deskNextMeeting"'),page+': widgets before status cards');
 assert.ok(index('id="grid"')<index('id="deskCheckButton"'),page+': updater retained below widgets');
 assert.ok(!html.includes('class="hero-row"'),page+': oversized hero removed');
 assert.ok(!html.includes('welcomeHeading'),page+': oversized welcome heading removed');
 for(const id of ['grid','searchForm','deskNextMeeting','deskNextMeetingTime','deskV05GitHub','deskV05Pulse',
  'deskV05Alerts','deskV052Status','deskV05Badge','deskUpdateBar','deskCheckButton','deskInstallButton',
  'deskLayoutMode','deskSnapMode','deskGridSettings','pageNav','mobilePages','deskWorkspaceTools']){
  const count=html.split('id="'+id+'"').length-1;
  assert.equal(count,1,page+': '+id+' should appear exactly once');
 }
 for(const handler of ['data-v04="calendar"','data-v05="pulse"','data-v03="projects"',
  'data-global="add"','data-global="toggle-snap"','data-global="toggle-layout"']){
  assert.ok(html.includes(handler),page+': missing '+handler);
 }
 assert.ok(html.includes('desk-v058.css'),page+': V0.5.8 CSS missing');
 assert.ok(html.includes('v0.5.10</span>'),page+': version chip incorrect');
 assert.ok(html.includes('OMNIDITE DESK · V0.5.10'),page+': footer version incorrect');
 console.log('PASS: '+page+' opens to widget grid before search/shortcuts/status/updater, with existing actions intact');
}
assert.equal(JSON.parse(read('manifest.json')).version,'0.5.9');
const css=read('desk-v058.css');
for(const selector of ['.content > .sectionhead','.desk-secondary','body.side-mode',
 ':root[data-theme="light"]','body.has-wallpaper','@media(max-width:650px)']){
 assert.ok(css.includes(selector),'Widgets-first styles missing '+selector);
}
console.log('PASS: version, mobile/side panel, themes and wallpaper styles preserved');
