/* Omnidite Desk v0.5.6 — compact, width-aware auto-height card packing.
 * Presentation only. No personal data is read, written, synchronized or sent.
 * Compact mode fills gaps under shorter cards; Rows retains strict reading order. */
(() => {
 'use strict';
 const ROW=8, GAP=12, STEP=ROW+GAP, MIN=132, MAX=1000;
 let grid=null,observer=null,scheduled=false,measuring=false;
 const layoutValue=el=>el?.dataset?.layout==='rows'?'rows':'compact';
 const fixedHeight=el=>{
  const v=Number(el?.dataset?.fixedHeight||0);
  return Number.isFinite(v)&&v>=MIN?Math.min(MAX,v):0;
 };
 function idealHeight(el) {
  const header=el.querySelector('.module-header');
  const body=el.querySelector('.module-body');
  const bodyHeight=body?.scrollHeight||0;
  const headerHeight=header?.getBoundingClientRect().height||0;
  const natural=Math.max(MIN,Math.ceil(headerHeight+bodyHeight+2));
  return Math.min(MAX,Math.max(MIN,fixedHeight(el)||natural));
 }
 function countRows(px) {return Math.max(1,Math.ceil((px+GAP)/STEP));}
 function resetCard(el){
  el.style.removeProperty('height');
  el.style.removeProperty('grid-row-end');
  el.removeAttribute('data-compact-active');
 }
 function reflow(){
  scheduled=false;
  if(!grid||!grid.isConnected||measuring)return;
  measuring=true;
  try{
   const cards=[...grid.querySelectorAll(':scope > .module')];
   if(grid.dataset.sizing==='snap'){
    // Snap mode owns cell dimensions; remove any prior freeform inline heights and row spans.
    for(const card of cards)resetCard(card);
    return;
   }
   if(layoutValue(grid)==='rows'){
    for(const card of cards){
     resetCard(card);
     const fixed=fixedHeight(card);
     if(fixed)card.style.height=fixed+'px';
    }
    return;
   }
   for(const card of cards){
    card.dataset.compactActive='true';
    // Auto cards are not stretched to the height of adjacent cards.
    // The body measures its content while fixed cards scroll internally.
    const h=idealHeight(card),rows=countRows(h);
    if(card.style.height!==h+'px')card.style.height=h+'px';
    const span='span '+rows;
    if(card.style.gridRowEnd!==span)card.style.gridRowEnd=span;
   }
  }finally{measuring=false;}
 }
 function schedule(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(reflow);
 }
 function observe(){
  const next=document.getElementById('grid');
  if(!next)return;
  if(grid!==next&&observer)observer.disconnect();
  grid=next;
  if(!observer&&typeof ResizeObserver!=='undefined'){
   observer=new ResizeObserver(()=>{if(!measuring)schedule();});
  }
  observer?.disconnect();
  observer?.observe(grid);
  grid.querySelectorAll(':scope > .module').forEach(el=>{
   const head=el.querySelector('.module-header'),body=el.querySelector('.module-body');
   if(head)observer?.observe(head);
   if(body)observer?.observe(body);
  });
  schedule();
 }
 window.DeskCompactLayout={observe,schedule,countRows,idealHeight};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observe,{once:true});
 else observe();
 window.addEventListener('resize',schedule,{passive:true});
})();
