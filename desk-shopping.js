/* Omnidite Desk V0.10 beta — local-first multi-list shopping planner.
 * Prices and history are user-recorded, not retailer-scraped or live quotes.
 */
(() => {
 'use strict';
 const api=window.DeskBridge;if(!api)return;
 const S=()=>api.getState(),esc=api.esc;
 const $=(s,r=document)=>r.querySelector(s);
 const money=(c,cur)=>new Intl.NumberFormat('en-SG',{style:'currency',currency:cur,currencyDisplay:'code',minimumFractionDigits:2,maximumFractionDigits:2}).format(c/100);
 const categories=['Groceries','Holiday wishlist','Tech','Projects','Home','Gifts','Other'];
 const currencies=['SGD','USD','BRL','EUR','GBP','AUD','JPY','CAD'];
 const today=t=>t?new Date(t).toLocaleString():'Not recorded';
 const numberPrice=v=>v==null?'':(v/100).toFixed(2);
 const parsePrice=v=>{
  const s=String(v??'').trim();
  if(!s)return null;
  if(!/^(?:\d+|\d*\.\d{1,2})$/.test(s))return undefined;
  const n=Number(s);return Number.isFinite(n)&&n>=0&&n<=100000000?Math.round(n*100):undefined;
 };
 const rows=()=>Array.isArray(S().shoppingLists)?S().shoppingLists:(S().shoppingLists=[]);
 const list=id=>rows().find(x=>x.id===id);
 const lineTotal=item=>item.priceCents===null?null:Math.round(item.priceCents*item.qty);
 const totals=l=>{
  const items=l.items||[],priced=items.filter(i=>i.priceCents!==null);
  return {total:priced.reduce((s,i)=>s+lineTotal(i),0),remaining:priced.filter(i=>!i.purchased).reduce((s,i)=>s+lineTotal(i),0),
   count:items.length,unpriced:items.length-priced.length,purchased:items.filter(i=>i.purchased).length,
   target:items.filter(i=>i.priceCents!==null&&i.targetCents!==null&&i.priceCents<=i.targetCents&&!i.purchased).length};
 };
 const options=(array,current)=>array.map(v=>'<option value="'+esc(v)+'"'+(v===current?' selected':'')+'>'+esc(v)+'</option>').join('');
 const header=(title,subtitle)=>'<div class="modal-top"><div><span class="eyebrow">OMNIDITE / SHOPPING LISTS</span><h2 id="modalTitle">'+esc(title)+'</h2><p>'+esc(subtitle)+'</p></div><button type="button" class="modal-close" data-shop="close" aria-label="Close shopping lists">✕</button></div>';
 const btn=(title,action,attrs='')=>'<button type="button" class="smallbutton" data-shop="'+action+'" '+attrs+'>'+title+'</button>';
 const view=(title,subtitle,content)=>api.show('<div class="modal-pad desk-shopping">'+header(title,subtitle)+content+'</div>');
 const idAttr=(id)=>' data-id="'+esc(id)+'"';
 let currentList='';
 function home(){
  const all=rows();
  view('Shopping lists','Plan groceries, wishlists, equipment and project purchases. Each list has its own currency and totals.',
   '<div class="shop-toolbar">'+btn('＋ New list','new-list')+'<span class="shop-hint">Saved in Desk · local-first · included in JSON backups</span></div>'+
   (all.length?'<div class="shop-list-grid">'+all.map(l=>{
     const t=totals(l);
     return '<div class="shop-list-card"><span class="shop-category">'+esc(l.category)+'</span><h3>'+esc(l.title)+'</h3>'+
       '<div class="shop-stat">'+money(t.total,l.currency)+'</div><p>'+t.count+' items · '+t.purchased+' purchased · '+t.unpriced+' awaiting a price</p>'+
       '<p>Remaining: <strong>'+money(t.remaining,l.currency)+'</strong></p>'+btn('Open list','list',idAttr(l.id))+'</div>';
   }).join('')+'</div>':'<div class="shop-empty"><strong>No lists yet</strong><p>Create a list for groceries, a holiday wishlist, tech purchases or a project.</p></div>')+
   '<p class="shop-help">Recorded prices are manual estimates, not live retailer quotes. Optional Chrome Sync is subject to Desk’s existing 72 KB limit.</p>');
 }
 function editList(id){
  const l=id?list(id):null;if(id&&!l)return home();
  view(l?'Edit list':'Create shopping list','Use one currency per list. Changing currency does not convert existing prices.',
   '<form id="shopListForm"'+(l?' data-id="'+esc(l.id)+'"':'')+'>'+
   '<label class="label" for="shopTitle">List name</label><input id="shopTitle" class="modal-input" name="title" maxlength="70" required placeholder="e.g. Home security Singapore" value="'+esc(l?.title||'')+'">'+
   '<div class="shop-two"><label>Category<select class="modal-input" name="category">'+options(categories,l?.category||'Groceries')+'</select></label>'+
   '<label>Currency<select class="modal-input" name="currency">'+options(currencies,l?.currency||'SGD')+'</select></label></div>'+
   '<div class="modal-actions"><button class="button primary" type="submit">Save list</button>'+btn('Cancel',l?'list':'home',l?idAttr(l.id):'')+
   (l?btn('Delete list','delete-list',idAttr(l.id)+' data-danger="true"'):'')+'</div></form>');
 }
 function listView(id){
  const l=list(id);if(!l)return home();currentList=id;
  const t=totals(l);
  const summary='<div class="shop-kpis"><div><small>Planned total</small><strong>'+money(t.total,l.currency)+'</strong></div>'+
   '<div><small>Still to buy</small><strong>'+money(t.remaining,l.currency)+'</strong></div>'+
   '<div><small>Items / bought</small><strong>'+t.count+' / '+t.purchased+'</strong></div></div>';
  const table='<div class="shop-table-wrap"><table class="shop-table"><thead><tr><th>#</th><th>Item / Store</th><th>Qty</th><th>Unit price</th><th>Subtotal</th><th>Progress</th><th>Actions</th></tr></thead><tbody>'+
   l.items.map((i,n)=>{
     const met=i.targetCents!==null&&i.priceCents!==null&&i.priceCents<=i.targetCents;
     return '<tr data-shop-row data-search="'+esc((i.name+' '+i.merchant+' '+i.note).toLowerCase())+'"'+(i.purchased?' class="shop-bought"':'')+'>'+
      '<td>'+String(n+1).padStart(2,'0')+'</td><td><strong>'+esc(i.name)+'</strong>'+
      (i.merchant?'<small>'+esc(i.merchant)+'</small>':'')+
      (i.note?'<small>'+esc(i.note)+'</small>':'')+
      (i.targetCents!==null?'<small class="'+(met?'shop-met':'')+'">Target '+money(i.targetCents,l.currency)+(met?' · recorded price meets target':'')+'</small>':'')+
      (i.url?'<small><a href="'+esc(i.url)+'" target="_blank" rel="noopener noreferrer">Buy link ↗</a></small>':'')+'</td>'+
      '<td>'+esc(i.qty)+' '+esc(i.unit||'pcs')+'</td><td>'+(i.priceCents===null?'Not priced':money(i.priceCents,l.currency))+'</td>'+
      '<td>'+(lineTotal(i)===null?'—':money(lineTotal(i),l.currency))+'</td>'+
      '<td>'+btn(i.purchased?'✓ Bought':'○ Buy','toggle',idAttr(i.id))+'</td>'+
      '<td><div class="shop-actions">'+btn('Edit','edit-item',idAttr(i.id))+btn('Track','history',idAttr(i.id))+
      btn('Find cheaper','compare',idAttr(i.id))+
      btn('✕','delete-item',idAttr(i.id)+' aria-label="Remove '+esc(i.name)+'"')+'</div></td></tr>';
   }).join('')+'</tbody></table></div>';
  view(l.title,l.category+' · '+l.currency+' · Each item is numbered independently within this list.',
   '<div class="shop-toolbar">'+btn('← All lists','home')+btn('＋ Add item','new-item')+btn('Edit list','edit-list',idAttr(l.id))+btn('↓ CSV','csv',idAttr(l.id))+'</div>'+
   summary+(t.unpriced?'<p class="shop-help">'+t.unpriced+' item(s) have no price and are excluded from the money totals.</p>':'')+
   (t.target?'<p class="shop-target">'+t.target+' item(s) meet your target based on recorded prices; retailer prices have not been checked.</p>':'')+
   '<label class="shop-search">Filter items<input id="shopSearch" class="modal-input" placeholder="Search products, shops or notes" type="search" autocomplete="off"></label>'+
   (l.items.length?table:'<div class="shop-empty">Your list is empty. Add an item to begin.</div>')+
   '<p class="shop-help">“Find cheaper” opens a Google Shopping search; it does not verify availability or compare prices automatically. “Track” stores prices you manually record.</p>');
 }
 function itemForm(id){
  const l=list(currentList);if(!l)return home();
  const item=id?l.items.find(i=>i.id===id):null;if(id&&!item)return listView(l.id);
  view(item?'Edit item':'Add item','All amounts are in '+l.currency+'. A blank price is tracked as unknown, not zero.',
   '<form id="shopItemForm"'+(item?' data-id="'+esc(item.id)+'"':'')+'>'+
   '<label class="label">Item / product name</label><input class="modal-input" name="name" maxlength="140" required placeholder="e.g. TP-Link Tapo Door Sensor" value="'+esc(item?.name||'')+'">'+
   '<div class="shop-three"><label>Quantity<input class="modal-input" name="qty" type="number" min="0.01" max="9999.99" step="0.01" required value="'+esc(item?.qty??1)+'"></label>'+
   '<label>Unit<input class="modal-input" name="unit" maxlength="20" placeholder="pcs / kg" value="'+esc(item?.unit||'pcs')+'"></label>'+
   '<label>Unit price ('+l.currency+')<input class="modal-input" name="price" type="number" step="0.01" min="0" placeholder="Unknown" value="'+numberPrice(item?.priceCents)+'"></label></div>'+
   '<div class="shop-two"><label>Store / seller<input class="modal-input" name="merchant" maxlength="100" placeholder="e.g. Lazada" value="'+esc(item?.merchant||'')+'"></label>'+
   '<label>Target price ('+l.currency+')<input class="modal-input" name="target" type="number" min="0" step="0.01" placeholder="Optional" value="'+numberPrice(item?.targetCents)+'"></label></div>'+
   '<label class="label">Where to buy (https URL)</label><input class="modal-input" name="url" type="url" maxlength="700" placeholder="https://..." value="'+esc(item?.url||'')+'">'+
   '<label class="label">Notes / model / variant</label><textarea class="modal-input" name="note" maxlength="350" rows="2">'+esc(item?.note||'')+'</textarea>'+
   '<label class="shop-check"><input type="checkbox" name="purchased" '+(item?.purchased?'checked':'')+'> Already purchased</label>'+
   '<div class="modal-actions"><button type="submit" class="button primary">Save item</button>'+btn('Cancel','list',idAttr(l.id))+'</div></form>');
 }
 function historyView(itemId){
  const l=list(currentList),item=l?.items.find(i=>i.id===itemId);if(!item)return l?listView(l.id):home();
  view('Price history: '+item.name,'Manual records only · '+l.currency+' · per unit, not multiplied by quantity.',
   '<div class="shop-toolbar">'+btn('← Back to list','list',idAttr(l.id))+btn('Find cheaper','compare',idAttr(item.id))+'</div>'+
   '<div class="shop-kpis"><div><small>Latest recorded</small><strong>'+(item.priceCents===null?'Unknown':money(item.priceCents,l.currency))+'</strong></div>'+
   '<div><small>Target price</small><strong>'+(item.targetCents===null?'Not set':money(item.targetCents,l.currency))+'</strong></div>'+
   '<div><small>Records</small><strong>'+item.history.length+'</strong></div></div>'+
   '<form id="shopRecordForm" data-id="'+esc(item.id)+'"><label class="label">Record current store price ('+l.currency+')</label>'+
   '<div class="shop-inline"><input class="modal-input" name="price" type="number" step="0.01" min="0" required value="'+numberPrice(item.priceCents)+'">'+
   '<button class="button primary" type="submit">Record price</button></div></form>'+
   (item.history.length?'<ol class="shop-history">'+item.history.slice().reverse().map(h=>'<li><span>'+esc(today(h.at))+'</span><strong>'+money(h.priceCents,l.currency)+'</strong><small>Manually recorded</small></li>').join('')+'</ol>':'<p class="shop-empty">No recorded prices yet.</p>')+
   '<p class="shop-help">This does not check retailer sites in the background or send price-drop notifications. A verified price API would be needed for automatic monitoring.</p>');
 }
 function saveList(form){
  const f=form.elements,title=f.namedItem('title').value.trim(),category=f.namedItem('category').value,currency=f.namedItem('currency').value;
  if(!title||!categories.includes(category)||!currencies.includes(currency))return;
  const old=form.dataset.id?list(form.dataset.id):null;
  if(old&&currency!==old.currency&&old.items.some(i=>i.priceCents!==null)&&!confirm('Changing currency will only relabel prices, not convert amounts. Continue?'))return;
  if(!old&&rows().length>=16){alert('Maximum 16 lists. Archive or remove a list to add another.');return;}
  const l=old||{id:api.uid(),items:[]};
  Object.assign(l,{title:title.slice(0,70),category,currency});
  if(!old)rows().push(l);
  api.save();listView(l.id);
 }
 function saveItem(form){
  const l=list(currentList);if(!l)return home();
  const f=form.elements,els=n=>f.namedItem(n);
  const name=els('name').value.trim().slice(0,140),qty=Number(els('qty').value);
  const price=parsePrice(els('price').value),target=parsePrice(els('target').value);
  if(!name||!Number.isFinite(qty)||qty<.01||qty>9999.99||Math.round(qty*100)!==qty*100&&Math.abs(Math.round(qty*100)-qty*100)>1e-7||price===undefined||target===undefined){
   alert('Enter a name, quantity with up to 2 decimals, and valid non-negative prices with up to 2 decimals.');return;
  }
  const url=els('url').value.trim();
  if(url&&(!api.validUrl(url)||url.length>700)){alert('The purchase link must be a valid http/https URL (700 characters max).');return;}
  const old=form.dataset.id?l.items.find(i=>i.id===form.dataset.id):null;
  if(!old&&l.items.length>=100){alert('Maximum 100 items per list.');return;}
  const item=old||{id:api.uid(),history:[]};
  const previous=old?.priceCents;
  Object.assign(item,{name,qty:Math.round(qty*100)/100,unit:els('unit').value.trim().slice(0,20)||'pcs',
   priceCents:price,targetCents:target,merchant:els('merchant').value.trim().slice(0,100),
   url,note:els('note').value.trim().slice(0,350),purchased:!!els('purchased').checked});
  if(price!==null&&(!old||previous!==price))item.history.push({priceCents:price,at:Date.now()});
  item.history=item.history.slice(-12);
  if(!old)l.items.push(item);
  api.save();listView(l.id);
 }
 function saveRecord(form){
  const l=list(currentList),i=l?.items.find(x=>x.id===form.dataset.id);if(!i)return;
  const value=parsePrice(form.elements.namedItem('price').value);
  if(value===undefined||value===null){alert('Enter a valid non-negative price.');return;}
  i.priceCents=value;i.history.push({priceCents:value,at:Date.now()});i.history=i.history.slice(-12);
  api.save();historyView(i.id);
 }
 function compare(item){
  const q=encodeURIComponent(item.name+' '+(item.note||'').slice(0,70));
  window.open('https://www.google.com/search?tbm=shop&q='+q,'_blank','noopener,noreferrer');
 }
 const csvCell=v=>'"'+String(v??'').replace(/^[=+\-@]/,"'$&").replace(/"/g,'""')+'"';
 function exportCsv(l){
  const cols=['#','Item','Quantity','Unit','Unit price','Subtotal','Currency','Store','Link','Target price','Purchased','Notes'];
  const lines=[cols.map(csvCell).join(',')].concat(l.items.map((i,n)=>[
    n+1,i.name,i.qty,i.unit,i.priceCents===null?'':numberPrice(i.priceCents),
    lineTotal(i)===null?'':numberPrice(lineTotal(i)),l.currency,i.merchant,i.url,
    i.targetCents===null?'':numberPrice(i.targetCents),i.purchased?'Yes':'No',i.note
  ].map(csvCell).join(',')));
  const blob=new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;
  a.download=(l.title.replace(/[^a-z0-9_-]+/gi,'-').slice(0,60)||'shopping-list')+'.csv';
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
 }
 document.addEventListener('click',e=>{
  const b=e.target.closest('[data-shop]');if(!b)return;
  const a=b.dataset.shop,id=b.dataset.id,l=list(currentList);
  if(a==='close')api.close();
  else if(a==='open'||a==='home')home();
  else if(a==='new-list')editList();
  else if(a==='edit-list')editList(id);
  else if(a==='list')listView(id);
  else if(a==='new-item')itemForm();
  else if(a==='edit-item')itemForm(id);
  else if(a==='history')historyView(id);
  else if(a==='csv'){const x=list(id);if(x)exportCsv(x);}
  else if(a==='compare'){const item=l?.items.find(x=>x.id===id);if(item)compare(item);}
  else if(a==='toggle'&&l){const item=l.items.find(x=>x.id===id);if(item){item.purchased=!item.purchased;api.save();listView(l.id);}}
  else if(a==='delete-item'&&l){const item=l.items.find(x=>x.id===id);
   if(item&&confirm('Remove "'+item.name+'" from this list?')){l.items=l.items.filter(x=>x.id!==id);api.save();listView(l.id);}}
  else if(a==='delete-list'){const x=list(id);
   if(x&&confirm('Permanently delete "'+x.title+'" and all its items?')){S().shoppingLists=rows().filter(v=>v.id!==id);api.save();home();}}
 });
 document.addEventListener('submit',e=>{
  const id=e.target.id;if(!['shopListForm','shopItemForm','shopRecordForm'].includes(id))return;
  e.preventDefault();
  if(id==='shopListForm')saveList(e.target);
  if(id==='shopItemForm')saveItem(e.target);
  if(id==='shopRecordForm')saveRecord(e.target);
 });
 document.addEventListener('input',e=>{
  if(e.target.id!=='shopSearch')return;
  const term=e.target.value.trim().toLowerCase();
  document.querySelectorAll('[data-shop-row]').forEach(row=>{row.hidden=!row.dataset.search.includes(term);});
 });
 window.DeskShopping={home,listView,totals,lineTotal,parsePrice,exportCsv};
})();