/* Omnidite Desk V0.5.7 — pure sizing helpers plus responsive snap-grid presentation.
 * Uses no external APIs, persistence, calendar events or account credentials.
 * Width and height footprints are whole cells; free sizing remains independent. */
(() => {
'use strict';
const GAP=12;
const COLUMN_CHOICES=[4,6,8,12];
const DEFAULT_SETTINGS={columns:6,cellHeight:104};
const PRESETS=[{w:1,h:4,name:'Tall 1×4'},{w:2,h:2,name:'Small 2×2'},{w:2,h:3,name:'Medium 2×3'},{w:4,h:4,name:'Large 4×4'},{w:6,h:3,name:'Wide 6×3'}];
const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||min));
const normalizeSettings=raw=>{
 const obj=raw&&typeof raw==='object'?raw:{};
 return {columns:COLUMN_CHOICES.includes(obj.columns)?obj.columns:DEFAULT_SETTINGS.columns,
  cellHeight:Number.isInteger(obj.cellHeight)&&obj.cellHeight>=72&&obj.cellHeight<=180?obj.cellHeight:DEFAULT_SETTINGS.cellHeight};
};
const normalizeFootprint=(w,h,fallbackWidth=2,fallbackHeight=3)=>({
 w:Number.isInteger(w)&&w>=1&&w<=12?w:fallbackWidth,
 h:Number.isInteger(h)&&h>=1&&h<=12?h:fallbackHeight
});
const effectiveColumns=(gridWidth,columns,sidePanel=false)=>{
 const c=COLUMN_CHOICES.includes(columns)?columns:6;
 if(sidePanel||gridWidth<510)return Math.min(c,2);
 if(gridWidth<900)return Math.min(c,4);
 return c;
};
const footprintHeight=(rows,cellHeight,gap=GAP)=>rows*cellHeight+(rows-1)*gap;
const snapDimensions=(widthDelta,heightDelta,startW,startH,gridWidth,columns,cellHeight,sidePanel=false)=>{
 const effective=effectiveColumns(gridWidth,columns,sidePanel);
 const width=Math.max(1,(gridWidth-GAP*(effective-1))/effective);
 const w=clamp(Math.round(startW+widthDelta/(width+GAP)),1,effective);
 const h=clamp(Math.round(startH+heightDelta/(cellHeight+GAP)),1,12);
 return {w,h,effective,width};
};
let grid=null,observer=null;
function apply(){
 grid=document.getElementById('grid');
 if(!grid||grid.dataset.sizing!=='snap')return;
 const settings=normalizeSettings({columns:Number(grid.dataset.gridColumns),cellHeight:Number(grid.dataset.gridCellHeight)});
 const effective=effectiveColumns(grid.getBoundingClientRect().width,settings.columns,document.body?.classList.contains('side-mode'));
 grid.style.setProperty('--snap-visible-columns',String(effective));
 grid.querySelectorAll(':scope > .module').forEach(el=>{
  const raw=normalizeFootprint(Number(el.dataset.gridW),Number(el.dataset.gridH));
  el.style.setProperty('--effective-span',String(Math.min(raw.w,effective)));
 });
}
function observe(){
 grid=document.getElementById('grid');
 if(!grid)return;
 if(!observer&&typeof ResizeObserver!=='undefined')observer=new ResizeObserver(()=>apply());
 observer?.disconnect();
 observer?.observe(grid);
 apply();
}
const api={GAP,COLUMN_CHOICES,DEFAULT_SETTINGS,PRESETS,normalizeSettings,normalizeFootprint,effectiveColumns,footprintHeight,snapDimensions,apply,observe};
window.DeskSnapGrid=api;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observe,{once:true});
else observe();
window.addEventListener('resize',apply,{passive:true});
})();