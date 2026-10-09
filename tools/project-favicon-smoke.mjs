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

const expected=chrome.runtime.getURL('assets/providence-mark.png');
assert.equal(siteFavicon('https://providence.omnidite.com'),expected);
assert.equal(siteFavicon('https://providence.omnidite.com/region?focus=singapore'),expected);
assert.notEqual(siteFavicon('https://fake-providence.omnidite.com'),expected,'Do not pin on lookalike hosts');
assert.notEqual(siteFavicon('https://providence.omnidite.com.evil.example'),expected,'Do not pin on spoofed hosts');
const bulls=chrome.runtime.getURL('assets/bulls-icon.png');
for(const url of [
  'https://kevinbullsyap.com',
  'https://www.kevinbullsyap.com/about',
  'https://kevinbullsyap.vercel.app',
  'https://kevinbullsyap-git-main-oa-192.vercel.app',
  'https://kevinbullsyap-git-feature-bulls-v2-phase-1-oa-192.vercel.app',
])assert.equal(siteFavicon(url),bulls,'The approved BULL.S icon should be local on '+url);
for(const spoof of ['https://fake-kevinbullsyap.com','https://kevinbullsyap.com.evil.example'])
  assert.notEqual(siteFavicon(spoof),bulls,'No pinned icon on spoofed domains');
assert.equal(siteFavicon('javascript:alert(1)'),'','Never accept unsafe schemes');
assert.match(siteFavicon('https://omnidite.com'),/^chrome-extension:\/\/desk-test\/_favicon\//);

const html=renderLinkModule({
  id:'my-projects',config:{links:[
    {label:'Providence',url:'https://providence.omnidite.com'},
    {label:'BULL.S',url:'https://kevinbullsyap.com'},
    {label:'Omnidite',url:'https://omnidite.com'},
  ]}
});
assert.ok(html.includes('class="site-favicon" src="'+expected+'"'),'Existing My Projects link should show bundled mark');
assert.ok(html.includes('class="site-favicon" src="'+bulls+'"'),'Saved BULL.S project link should show the approved bundled icon');
assert.ok(html.includes('pageUrl=https%3A%2F%2Fomnidite.com'),'Other projects should continue using Chrome favicons');

const image=fs.readFileSync(new URL('assets/providence-mark.png',root));
assert.ok(image.length>10_000&&image.length<100_000,'Bundled emblem has expected image size');
assert.equal(image.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
const zlib=await import('node:zlib');
const idatSize=image.readUInt32BE(33);
assert.equal(image.toString('ascii',37,41),'IDAT');
assert.equal(zlib.inflateSync(image.subarray(41,41+idatSize)).length,96*(1+96*4),'PNG has all its rows');
const githubBlob=crypto.createHash('sha1')
  .update(Buffer.from('blob '+image.length+'\0')).update(image).digest('hex');
assert.equal(githubBlob,'27480b3463564fd92497a2033d4f10bc9094d92e',
  'Use exact approved Providence mark, not an arbitrary logo or changed image');
const bullsImage=fs.readFileSync(new URL('assets/bulls-icon.png',root));
assert.ok(bullsImage.length>1000&&bullsImage.length<100000,'BULL.S icon should be a compact bundled image');
assert.equal(bullsImage.subarray(0,8).toString('hex'),'89504e470d0a1a0a','BULL.S icon should be a valid PNG');
const bullsBlob=crypto.createHash('sha1').update(Buffer.from('blob '+bullsImage.length+'\0')).update(bullsImage).digest('hex');
assert.equal(bullsBlob,'c3d03c623c006f7e24cddbe86a441f5c0b0ae604','Use the exact owner-approved BULL.S PNG from the website repository');
console.log('PASS: Desk bundles the exact approved BULL.S icon on saved production and preview links');
console.log('PASS: Desk renders the approved Providence emblem from a local bundled asset');
console.log('PASS: other project favicons, safe host matching, and existing link actions are preserved');
