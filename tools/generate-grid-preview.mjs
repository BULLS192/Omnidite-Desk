/* Visual acceptance fixture: fixed six-column phone-style footprints vs existing Free sizing.
 * Uses only fabricated Desk sample data (never connected Calendar or Pulse data). */
import fs from 'node:fs';
const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
const write=(name,html)=>fs.writeFileSync(new URL('../'+name,import.meta.url),html);
const base=read('design-review-compact.html');
const footprints=[[2,4],[2,4],[2,2],[2,3],[2,2],[2,2],[2,3]];
const stylesheet='<link rel="stylesheet" href="desk-v057.css">';
function fixture(mode){
 let html=base.replace('</head>',stylesheet+'</head>');
 let count=0;
 html=html.replace(/<section class="module" style="--span:(\d+)" data-fixed-height="(\d+)"/g,(whole,cols,height)=>{
  const p=footprints[count++];
  if(!p)return whole;
  return '<section class="module" style="--span:'+cols+';--grid-w:'+p[0]+';--grid-h:'+p[1]+';--effective-span:'+p[0]+'" data-grid-w="'+p[0]+'" data-grid-h="'+p[1]+'" data-fixed-height="'+height+'"';
 });
 if(count!==7)throw Error('Expected seven sample widgets, got '+count);
 html=html.replace('data-layout="compact"', 'data-layout="compact" data-sizing="'+mode+'" data-grid-columns="6" data-grid-cell-height="104" style="--snap-cell-height:104px"');
 html=html.replace('SAMPLE DATA · V0.5.6 COMPACT PACKING · NOT YOUR LIVE DESK', mode==='snap'?'SAMPLE DATA · V0.5.7 SNAP TO 6-COLUMN GRID':'SAMPLE DATA · V0.5.7 FREE RESIZE MODE');
 html=html.replace('</body>','<script src="desk-grid.js" defer></script></body>');
 return html;
}
write('design-review-snap.html',fixture('snap'));
write('design-review-free.html',fixture('free'));
console.log('PASS: generated 6-column snapped 2x2/2x4 and unchanged free-resize layouts (sample data only)');
