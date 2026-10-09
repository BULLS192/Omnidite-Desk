import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const root=new URL('../',import.meta.url);
const source=fs.readFileSync(new URL('app.js',root),'utf8');
const start=source.indexOf(' function siteFavicon(url){');
const end=source.indexOf(' function renderFocusModule(m){',start);
assert.ok(start>=0&&end>start,'Favicon and quick-launch functions must exist');
const chrome={
  runtime:{getURL:path=>'chrome-extension://desk-test/'+path.replace(/^\//,'')},
};
const context={chrome,URL,widgetGrid:()=>'class="linkgrid"',itemOrderButtons:()=>'',esc:s=>String(s??'').replaceAll('&','&amp;').replaceAll('"','&quot;')};
vm.runInNewContext(source.slice(start,end)+'\nglobalThis.icons={siteFavicon,renderLinkModule}',context);
const {siteFavicon,renderLinkModule}=context.icons;

const expected=chrome.runtime.getURL('assets/providence-mark.webp');
assert.equal(siteFavicon('https://providence.omnidite.com'),expected);
assert.equal(siteFavicon('https://providence.omnidite.com/region?focus=singapore'),expected);
assert.notEqual(siteFavicon('https://fake-providence.omnidite.com'),expected,'Do not pin on lookalike hosts');
assert.notEqual(siteFavicon('https://providence.omnidite.com.evil.example'),expected,'Do not pin on spoofed hosts');
assert.equal(siteFavicon('javascript:alert(1)'),'','Never accept unsafe schemes');
assert.match(siteFavicon('https://omnidite.com'),/^chrome-extension:\/\/desk-test\/_favicon\//);

const html=renderLinkModule({
  id:'my-projects',config:{links:[
    {label:'Providence',url:'https://providence.omnidite.com'},
    {label:'Omnidite',url:'https://omnidite.com'},
  ]}
});
assert.ok(html.includes('class="site-favicon" src="'+expected+'"'),'Existing My Projects link should show bundled mark');
assert.ok(html.includes('pageUrl=https%3A%2F%2Fomnidite.com'),'Other projects should continue using Chrome favicons');

const image=fs.readFileSync(new URL('assets/providence-mark.webp',root));
assert.ok(image.length>10_000&&image.length<100_000,'Bundled emblem has expected image size');
assert.equal(image.toString('ascii',0,4),'RIFF');
assert.equal(image.toString('ascii',8,12),'WEBP');
const githubBlob=crypto.createHash('sha1')
  .update(Buffer.from('blob '+image.length+'\0')).update(image).digest('hex');
assert.equal(githubBlob,'2af74748bb1544095d52c5cf4cfc3f78cafce24f',
  'Use exact approved Providence mark, not an arbitrary logo or changed image');
console.log('PASS: Desk renders the approved Providence emblem from a local bundled asset');
console.log('PASS: other project favicons, safe host matching, and existing link actions are preserved');
