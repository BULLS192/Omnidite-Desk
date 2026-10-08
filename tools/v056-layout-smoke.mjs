import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../desk-compact.js',import.meta.url),'utf8');
const styles=()=>{const s={height:'',gridRowEnd:'',removeProperty(name){if(name==='height')this.height='';if(name==='grid-row-end')this.gridRowEnd=''}};return s};
const makeCard=(bodyHeight,forced=0)=>{
 const header={getBoundingClientRect:()=>({height:58})},body={scrollHeight:bodyHeight};
 return {dataset:{fixedHeight:String(forced)},style:styles(),isConnected:true,
  querySelector:q=>q==='.module-header'?header:q==='.module-body'?body:null,
  querySelectorAll:()=>[],removeAttribute(name){if(name==='data-compact-active')delete this.dataset.compactActive;}};
};
const short=makeCard(85),tall=makeCard(405),manual=makeCard(490,200);
const cards=[short,tall,manual];const watched=[];
const grid={isConnected:true,dataset:{layout:'compact'},querySelectorAll:selector=>{
 if(selector===':scope > .module')return cards;throw Error('Unexpected query: '+selector);
}};
const doc={readyState:'complete',getElementById:id=>id==='grid'?grid:null};
const window={addEventListener(){}};
class Observer{observe(el){watched.push(el)}disconnect(){}}
const scope={window,document:doc,Math,Number,ResizeObserver:Observer,requestAnimationFrame:fn=>fn()};
vm.runInNewContext(source,scope);
const layout=window.DeskCompactLayout;
assert.ok(layout,'Compact layout controller initialized');
assert.equal(short.style.height,'145px','short auto card fits its intrinsic 58+85+2 height');
assert.equal(tall.style.height,'465px','tall card uses its actual content height');
assert.equal(manual.style.height,'200px','fixed widget height wins over content intrinsic height');
assert.equal(short.style.gridRowEnd,'span 8');
assert.equal(tall.style.gridRowEnd,'span 24');
assert.equal(manual.style.gridRowEnd,'span 11');
assert.equal(layout.countRows(200),11);
assert.ok(watched.length>=1);
grid.dataset.layout='rows';layout.schedule();
assert.equal(short.style.height,'','Row layout clears automatic inline height');
assert.equal(short.style.gridRowEnd,'','Row layout clears compact row spans');
assert.equal(manual.style.height,'200px','Row layout preserves user fixed height');
grid.dataset.layout='compact';short.querySelector('.module-body').scrollHeight=215;layout.schedule();
assert.equal(short.style.height,'275px','Dynamic weather content can resize its widget');
assert.match(short.style.gridRowEnd,/span 15/);
assert.ok(/grid-auto-flow:row dense/.test(fs.readFileSync(new URL('../desk-v056.css',import.meta.url),'utf8')));
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
for(const token of ['data-fixed-height','deskLayoutMode','toggle-layout','name="height"','m.height=chosenHeight','requestAnimationFrame(()=>window.DeskCompactLayout','window.DeskCompactLayout?.schedule()'])
 assert.ok(app.includes(token),'App must expose '+token);
console.log('PASS: independently measured auto-heights and content-aware compact row spans');
console.log('PASS: fixed 200px card height, aligned-row fallback and reactive content growth');
console.log('PASS: persisted height editor, layout mode toggle, live resize and dense packing guards');
