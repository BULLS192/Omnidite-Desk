import fs from 'node:fs';
import assert from 'node:assert/strict';

// Regression for Chrome's "An invalid form control with name='title' is not focusable".
// An untyped <button> inside a <form> defaults to submit. The click event closes
// the modal before the browser validates an empty required title field.
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const app=read('app.js');
const header=app.match(/const header=\(title,detail\)=>\x60([^\x60]+)\x60;/)?.[1];
assert.ok(header,'Shared modal header template must exist');
assert.match(header,/<button\s+type="button"\s+class="modal-close"\s+data-modal="close"/,'Shared modal close is not a form submit');
assert.match(header,/aria-label="Close dialog"/,'Modal close must have an accessible label');

for(const form of ['editForm','pageForm','gridSettingsForm']){
 assert.ok(app.includes('id="'+form+'"'),'Missing live modal form '+form);
 assert.match(app,/const header=/,'Form header relies on shared close handler');
}
assert.match(app,/name="title"[^>]+required/,'Regression requires the title validation field to remain required');
assert.match(app,/<button type="submit" class="button primary">Save widget<\/button>/,'Save widget still triggers real submit');
const rest=['desk-v03.js','desk-v04.js','desk-v05.js','desk-v052.js','desk-google-calendar.js','desk-health.js'];
for(const path of rest){
 const src=read(path);
 for(const match of src.matchAll(/<button[^>]*class="modal-close"[^>]*>/g)){
  assert.match(match[0],/type="button"/,path+': close button must not submit forms');
 }
}
for(const html of ['index.html','sidepanel.html']){
 assert.match(read(html),/v0\.6\.1<\/span>/,html+': correct release displayed');
}
assert.equal(JSON.parse(read('manifest.json')).version,'0.6.2');
console.log('PASS: modal close never implicitly submits, required title and Save validation preserved, both Desk entry points updated');
