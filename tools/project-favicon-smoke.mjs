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

const expected=chrome.runtime.getURL('assets/providence-icon.png');
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

const image=fs.readFileSync(new URL('assets/providence-icon.png',root));
assert.ok(image.length>1000&&image.length<10_000,'Approved Providence 48px favicon has compact size');
assert.equal(image.subarray(0,8).toString('hex'),'89504e470d0a1a0a','Providence must be PNG');
assert.equal(image.readUInt32BE(16),48,'Providence icon width');
assert.equal(image.readUInt32BE(20),48,'Providence icon height');
const { inflateSync }=await import('node:zlib');
let offset=8;const idat=[];
while(offset<image.length){
 const len=image.readUInt32BE(offset),type=image.toString('ascii',offset+4,offset+8);
 assert.ok(offset+12+len<=image.length,'PNG chunk may not be truncated');
 if(type==='IDAT')idat.push(image.subarray(offset+8,offset+8+len));
 offset+=12+len;
}
assert.equal(inflateSync(Buffer.concat(idat)).length,48*49,'Full icon must decompress without truncation');
const githubBlob=crypto.createHash('sha1')
  .update(Buffer.from('blob '+image.length+'\0')).update(image).digest('hex');
assert.equal(githubBlob,'fadda07ae300b0ebcc96040e879d785f1f67ac21',
  'Use exact approved Providence mark, not an arbitrary logo or changed image');
const bullsImage=fs.readFileSync(new URL('assets/bulls-icon.png',root));
assert.ok(bullsImage.length>1000&&bullsImage.length<100000,'BULL.S icon should be a compact bundled image');
assert.equal(bullsImage.subarray(0,8).toString('hex'),'89504e470d0a1a0a','BULL.S icon should be a valid PNG');
const bullsBlob=crypto.createHash('sha1').update(Buffer.from('blob '+bullsImage.length+'\0')).update(bullsImage).digest('hex');
assert.equal(bullsBlob,'c3d03c623c006f7e24cddbe86a441f5c0b0ae604','Use the exact owner-approved BULL.S PNG from the website repository');
console.log('PASS: Desk bundles the exact approved BULL.S icon on saved production and preview links');
console.log('PASS: Desk renders the approved Providence emblem from a local bundled asset');
console.log('PASS: other project favicons, safe host matching, and existing link actions are preserved');
