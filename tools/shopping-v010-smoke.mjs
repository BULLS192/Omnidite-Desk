import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('desk-shopping.js'),app=read('app.js'),manifest=JSON.parse(read('manifest.json'));
const handlers={click:[],submit:[],input:[]},out={html:'',saved:0,opened:''};
let counter=0;
const state={shoppingLists:[]};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validUrl=s=>{try{const u=new URL(s);return ['http:','https:'].includes(u.protocol)&&!!u.hostname;}catch{return false;}};
const bridge={getState:()=>state,esc,validUrl,uid:()=>String(++counter),show:html=>out.html=html,close:()=>out.closed=true,save:()=>out.saved++};
const document={addEventListener:(type,fn)=>handlers[type].push(fn),querySelector:()=>null,querySelectorAll:()=>[],body:{}};
const window={DeskBridge:bridge,open:url=>out.opened=url};
const ctx={window,document,console,Date,Intl,URL,Number,Blob,alert:m=>{out.alert=m;},confirm:()=>true};
vm.runInNewContext(source,ctx,{filename:'desk-shopping.js'});
const api=window.DeskShopping;
assert.ok(api,'shopping API must initialize with DeskBridge');
const event=(action,id='')=>({target:{closest:selector=>selector==='[data-shop]'?{dataset:{shop:action,id}}:null}});
const click=(action,id)=>handlers.click.forEach(fn=>fn(event(action,id)));
const submit=(id,values,dataset={})=>{
 const form={id,dataset,elements:{namedItem:n=>values[n]||{value:''}}};
 handlers.submit.forEach(fn=>fn({target:form,preventDefault(){}}));
};
click('open');
assert.match(out.html,/Shopping lists/);
click('new-list');
assert.match(out.html,/shopListForm/);
submit('shopListForm',{title:{value:'Home & Tech'},category:{value:'Tech'},currency:{value:'SGD'}});
assert.equal(state.shoppingLists.length,1);
const list=state.shoppingLists[0];
assert.equal(list.title,'Home & Tech');
click('new-item');
submit('shopItemForm',{
 name:{value:'Keyboard <test>'},qty:{value:'2.5'},unit:{value:'pcs'},price:{value:'39.90'},target:{value:'30.00'},
 url:{value:'https://example.com/item'},merchant:{value:'Shop'},note:{value:'Model Q'},purchased:{checked:false}
});
assert.equal(list.items.length,1);
const item=list.items[0];
assert.equal(item.priceCents,3990);
assert.equal(api.lineTotal(item),9975);
assert.equal(api.totals(list).total,9975);
assert.equal(api.totals(list).remaining,9975);
assert.equal(item.history.length,1);
assert.match(out.html,/Keyboard &lt;test&gt;/,'product names must be HTML escaped');
assert.doesNotMatch(out.html,/<test>/,'untrusted markup cannot be inserted');
assert.match(out.html,/S\$99\.75/);
click('toggle',item.id);
assert.equal(api.totals(list).remaining,0);
assert.equal(api.totals(list).total,9975,'bought items stay in planned budget');
click('compare',item.id);
assert.match(out.opened,/google.com\/search\?tbm=shop&q=/);
click('history',item.id);
assert.match(out.html,/Manual records only/);
submit('shopRecordForm',{price:{value:'29.50'}},{id:item.id});
assert.equal(item.priceCents,2950);
assert.equal(item.history.length,2,'manual price entries are stored');
assert.equal(api.totals(list).target,0,'purchased items excluded from outstanding target hits');
click('list',list.id);
click('toggle',item.id);
assert.equal(api.totals(list).target,1,'recorded price threshold is advisory only');
assert.equal(api.parsePrice(''),null,'unknown should not become zero');
assert.equal(api.parsePrice('bad'),undefined);
assert.equal(api.parsePrice('12.345'),undefined);
const normalizer=app.slice(app.indexOf('function normalizeShoppingLists('),app.indexOf(' function normalizeOperations('));
assert.ok(normalizer.includes('safeCents'),'V2 normalizer must handle shopping data');
const sandbox={uid:()=>String(++counter),validUrl,Number,String,Set,Array,Math};
vm.runInNewContext(normalizer+';this.normalizeShoppingLists=normalizeShoppingLists;',sandbox);
const result=sandbox.normalizeShoppingLists([{id:'l1',title:'Bad import',currency:'SGD',items:[{
 id:'i1',name:'Test',qty:-10,priceCents:-100,targetCents:100,url:'javascript:alert(1)',history:[{priceCents:200,at:1}]
}]}]);
assert.equal(result[0].items[0].qty,1);
assert.equal(result[0].items[0].priceCents,null);
assert.equal(result[0].items[0].url,'');
assert.equal(result[0].items[0].history.length,1);
assert.match(app,/shoppingLists:normalizeShoppingLists\(obj\.shoppingLists\)/,'JSON backups and Chrome Sync must use V2 state');
for(const path of ['index.html','sidepanel.html']){
 const html=read(path);assert.match(html,/data-shop="open"/);assert.match(html,/desk-shopping.js/);assert.match(html,/desk-shopping.css/);
}
assert.equal(manifest.version,'0.10.0');
assert.deepEqual(manifest.permissions,['storage','sidePanel','nativeMessaging','favicon','identity']);
assert.doesNotMatch(source,/\bfetch\s*\(/,'shopping should not scrape prices or upload product data');
console.log('PASS: V0.10 shopping lists, decimal quantities, budgets, CSV hooks, recorded prices, target thresholds, safe HTML, V2 backup/sync normalization, navigability and unchanged permissions');
