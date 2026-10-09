/* Desk V0.7 — optional markets and FX widgets. Only public reference data is fetched. */
(() => {
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const MARKETS=[
  {id:'SGX',name:'Singapore Exchange',zone:'Asia/Singapore',sessions:[[540,720],[780,1020]]},
  {id:'NYSE',name:'New York Stock Exchange',zone:'America/New_York',sessions:[[570,960]]},
  {id:'NASDAQ',name:'Nasdaq',zone:'America/New_York',sessions:[[570,960]]},
  {id:'LSE',name:'London Stock Exchange',zone:'Europe/London',sessions:[[480,990]]},
  {id:'HKEX',name:'Hong Kong Exchange',zone:'Asia/Hong_Kong',sessions:[[570,720],[780,960]]},
  {id:'SSE',name:'Shanghai Stock Exchange',zone:'Asia/Shanghai',sessions:[[570,690],[780,900]]}
 ];
 const CURRENCIES=['SGD','USD','EUR','GBP','JPY','AUD','CAD','CNY','TWD','BRL','CHF','HKD','NZD'];
 const fxCache=new Map(),fxPending=new Map(),FX_TTL=6*60*60*1000;
 const htmlNumber=(v,d=2)=>Number.isFinite(v)?new Intl.NumberFormat('en-US',{maximumFractionDigits:d,minimumFractionDigits:d}).format(v):'—';
 const isISOCode=c=>CURRENCIES.includes(c);
 function zonedParts(now,zone){
  const p=new Intl.DateTimeFormat('en-CA',{timeZone:zone,weekday:'short',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
  const d=Object.fromEntries(p.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  return {year:Number(d.year),month:Number(d.month),day:Number(d.day),weekday:d.weekday,minute:Number(d.hour)*60+Number(d.minute),clock:d.hour+':'+d.minute};
 }
 // Convert regular-session wall clock time to absolute UTC with Intl, respecting zone DST.
 function localToUtc(year,month,day,minute,zone){
  const guess=Date.UTC(year,month-1,day,Math.floor(minute/60),minute%60);
  const a=new Date(guess);
  const p=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(a);
  const d=Object.fromEntries(p.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  const asUtc=Date.UTC(Number(d.year),Number(d.month)-1,Number(d.day),Number(d.hour),Number(d.minute));
  return guess-(asUtc-guess);
 }
 function marketStatus(exchange,now=new Date()){
  const z=zonedParts(now,exchange.zone);
  const localMid=Date.UTC(z.year,z.month-1,z.day);
  const weekend=[0,6].includes(new Date(localMid).getUTCDay());
  const active=!weekend&&exchange.sessions.find(([a,b])=>z.minute>=a&&z.minute<b);
  let next=null,reason='';
  if(active){next=localToUtc(z.year,z.month,z.day,active[1],exchange.zone);reason='Scheduled session ends';}
  else{
   for(let n=0;n<=8;n++){
    const day=new Date(localMid+n*86400000),weekday=day.getUTCDay();
    if(weekday===0||weekday===6)continue;
    const y=day.getUTCFullYear(),m=day.getUTCMonth()+1,d=day.getUTCDate();
    for(const [start] of exchange.sessions){
     const ts=localToUtc(y,m,d,start,exchange.zone);
     if(ts>now.getTime()){next=ts;reason='Next scheduled session';break;}
    }
    if(next!==null)break;
   }
  }
  return {active:!!active,localTime:z.clock,zone:exchange.zone,reason,remaining:next===null?null:Math.max(0,Math.ceil((next-now.getTime())/1000))};
 }
 function duration(seconds){
  if(!Number.isFinite(seconds))return '—';
  const min=Math.ceil(seconds/60),days=Math.floor(min/1440),hrs=Math.floor(min%1440/60),mins=min%60;
  return (days?days+'d ':'')+(hrs?hrs+'h ':'')+mins+'m';
 }
 const marketsHtml=m=>{
  const selected=Array.isArray(m.config.markets)?m.config.markets:MARKETS.map(x=>x.id);
  return '<p class="module-sub">REGULAR EXCHANGE SESSIONS · TIMEZONE / DST AWARE</p>'+
   '<div class="v07-market-list" data-v07-market-list="'+esc(m.id)+'">'+MARKETS.filter(x=>selected.includes(x.id)).map(x=>
    '<div class="v07-market-row" data-v07-exchange="'+x.id+'"><div><strong>'+esc(x.id)+'</strong><span>'+esc(x.name)+'</span></div><div><strong class="v07-market-clock">—</strong><small class="v07-market-state">Checking schedule…</small></div></div>'
   ).join('')+'</div>'+
   '<details class="v07-options"><summary>Choose exchanges</summary><form data-v07-markets="'+esc(m.id)+'"><div class="v07-picks">'+MARKETS.map(x=>
    '<label><input type="checkbox" name="market" value="'+x.id+'" '+(selected.includes(x.id)?'checked':'')+'> '+esc(x.id)+'</label>').join('')+
   '</div><button class="smallbutton" type="submit">Apply</button></form></details>'+
   '<p class="v07-disclaimer">Indicative regular sessions only. Public holidays, early closes, auctions and unscheduled halts are NOT included. Not a live trading status feed.</p>';
 };
 const fxUrl=(base,quote)=>'https://api.frankfurter.dev/v2/rate/'+base+'/'+quote;
 async function loadFx(base,quote){
  if(!isISOCode(base)||!isISOCode(quote))throw Error('Unsupported currency');
  if(base===quote)return {date:new Date().toISOString().slice(0,10),rate:1,same:true};
  const key=base+'-'+quote,old=fxCache.get(key);
  if(old&&Date.now()-old.at<FX_TTL)return old.value;
  if(fxPending.has(key))return fxPending.get(key);
  const work=fetch(fxUrl(base,quote),{signal:AbortSignal.timeout(13000),credentials:'omit'}).then(async res=>{
   if(!res.ok)throw Error('FX reference HTTP '+res.status);
   const body=await res.json();
   if(body.base!==base||body.quote!==quote||!Number.isFinite(body.rate)||body.rate<=0||!/^\d{4}-\d{2}-\d{2}$/.test(body.date||''))throw Error('Invalid FX reference');
   const value={date:body.date,rate:body.rate};
   fxCache.set(key,{at:Date.now(),value});return value;
  }).catch(err=>{if(old)return {...old.value,stale:true};throw err;}).finally(()=>fxPending.delete(key));
  fxPending.set(key,work);return work;
 }
 function fxHtml(m){
  const c=m.config,base=isISOCode(c.base)?c.base:'SGD',quote=isISOCode(c.quote)?c.quote:'USD';
  const opts=selected=>CURRENCIES.map(x=>'<option value="'+x+'" '+(x===selected?'selected':'')+'>'+x+'</option>').join('');
  return '<p class="module-sub">DAILY PUBLISHED REFERENCE RATES · NOT LIVE TRADING QUOTES</p>'+
   '<form data-v07-fx="'+esc(m.id)+'" class="v07-fx-form"><label>Amount<input name="amount" type="number" class="modal-input" min="0.01" max="1000000000" step="any" required value="'+esc(Number.isFinite(c.amount)?c.amount:100)+'"></label>'+
   '<label>From<select class="modal-input" name="base">'+opts(base)+'</select></label><label>To<select class="modal-input" name="quote">'+opts(quote)+'</select></label>'+
   '<button type="submit" class="smallbutton">Convert</button></form><div class="v07-fx-result" data-v07-fx-result="'+esc(m.id)+'">Loading reference rate…</div>'+
   '<p class="v07-disclaimer">Indicative central-bank/reference data supplied via <a href="https://frankfurter.dev/" target="_blank" rel="noopener noreferrer">Frankfurter</a>. Published dates can lag on holidays/weekends. Not bank, card or settlement rates.</p>';
 }
 function render(m){
  if(m.type==='markets')return marketsHtml(m);
  if(m.type==='fx')return fxHtml(m);
  return '<p class="empty-note">Widget not available.</p>';
 }
 let lastMarketTick=0;
 function tick(now=new Date()){
  const rows=[...document.querySelectorAll('[data-v07-exchange]')];
  if(!rows.length)return;
  if(now.getTime()-lastMarketTick<30000&&rows.every(el=>el.querySelector('.v07-market-clock')?.textContent!=='—'))return;
  lastMarketTick=now.getTime();
  for(const el of rows){
   const x=MARKETS.find(m=>m.id===el.dataset.v07Exchange);if(!x)continue;
   const s=marketStatus(x,now),clock=el.querySelector('.v07-market-clock'),label=el.querySelector('.v07-market-state');
   if(clock)clock.textContent=s.localTime+' local';
   if(label)label.textContent=(s.active?'Within scheduled session':'Outside scheduled session')+' · '+s.reason+' '+duration(s.remaining);
   el.dataset.session=s.active?'scheduled':'outside';
  }
 }
 async function refreshVisible(){
  tick();
  const state=window.DeskBridge?.getState?.();if(!state)return;
  const widgets=state.pages.find(p=>p.id===state.activePage)?.modules||[];
  for(const w of widgets.filter(x=>x.type==='fx')){
   const target=document.querySelector('[data-v07-fx-result="'+CSS.escape(w.id)+'"]');if(!target)continue;
   const c=w.config,base=c.base||'SGD',quote=c.quote||'USD',amount=Number(c.amount)||100;
   const key=base+'-'+quote;
   try{
    const res=await loadFx(base,quote);
    if(!target.isConnected||!window.DeskBridge?.getState)continue;
    const live=window.DeskBridge.getState().pages.flatMap(p=>p.modules).find(x=>x.id===w.id);
    if(!live||live.config.base!==base||live.config.quote!==quote||Number(live.config.amount)!==amount)continue;
    target.innerHTML='<div class="v07-fx-value"><strong>'+htmlNumber(amount*res.rate,2)+' '+esc(quote)+'</strong><span>'+htmlNumber(amount,2)+' '+esc(base)+'</span></div><small>1 '+esc(base)+' = '+htmlNumber(res.rate,6)+' '+esc(quote)+' · Reference date '+esc(res.date)+(res.stale?' · LAST KNOWN':'')+'</small>';
   }catch(err){if(target.isConnected)target.textContent='Reference rate unavailable. Try again later.';}
  }
 }
 document.addEventListener('submit',event=>{
  const fx=event.target.closest('form[data-v07-fx]');
  const marketForm=event.target.closest('form[data-v07-markets]');
  if(!fx&&!marketForm)return;
  event.preventDefault();
  const id=fx?.dataset.v07Fx||marketForm.dataset.v07Markets;
  const api=window.DeskBridge;if(!api)return;
  const w=api.getState().pages.flatMap(p=>p.modules).find(m=>m.id===id);if(!w)return;
  if(fx){
   const f=fx.elements;
   const amt=Number(f.amount.value);
   if(!Number.isFinite(amt)||amt<=0||amt>1e9||!isISOCode(f.base.value)||!isISOCode(f.quote.value))return;
   Object.assign(w.config,{amount:amt,base:f.base.value,quote:f.quote.value});
  }else {
   const values=[...marketForm.querySelectorAll('input[name="market"]:checked')].map(x=>x.value).filter(x=>MARKETS.some(m=>m.id===x));
   if(!values.length)return;
   w.config.markets=[...new Set(values)];
  }
  api.save();
 });
 window.DeskV07={render,tick,refreshVisible,marketStatus,loadFx,MARKETS,CURRENCIES};
})();