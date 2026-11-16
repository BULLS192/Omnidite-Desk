import fs from 'node:fs';
const fixture={
 version:2,brand:'Omnidite Desk',theme:'midnight',activePage:'overview',updatedAt:Date.now(),
 pages:[{id:'overview',title:'Overview',modules:[{id:'shoppingWidget',type:'shopping',title:'Shopping lists',cols:6,gridW:3,gridH:4,config:{listId:'shop1'}}]}],projects:[],captures:[],advancedTasks:[],contentItems:[],
 shoppingLists:[{id:'shop1',title:'Test Tech List',category:'Tech',currency:'SGD',items:[
  {id:'item1',name:'Headphones sample',qty:2.5,unit:'pcs',priceCents:3990,targetCents:3000,merchant:'Sample Store',url:'https://example.com/product',purchased:false,note:'Over-ear',history:[{priceCents:4500,at:Date.now()-86400000},{priceCents:3990,at:Date.now()}]},
  {id:'item2',name:'Unpriced cable',qty:1,unit:'pcs',priceCents:null,targetCents:null,merchant:'',url:'',purchased:false,note:'',history:[]}
 ]}]
};
const injection='<script>try{localStorage.setItem("omniditeDeskStateV2",'+JSON.stringify(JSON.stringify(fixture))+');}catch(e){document.documentElement.dataset.fixtureError="true";}</script>';
for(const [src,prefix] of [['index.html','newtab'],['sidepanel.html','sidepanel']]){
 const html=fs.readFileSync(new URL('../'+src,import.meta.url),'utf8');
 if(!html.includes('desk-shopping.js')||!html.includes('desk-shopping.css'))throw Error('Missing Shopping Lists scripts in '+src);
 for(const [view,action] of [['home','home()'],['list','listView("shop1")']]){
  const boot='<script>window.addEventListener("load",()=>setTimeout(()=>window.DeskShopping?.'+action+',125));</script>';
  fs.writeFileSync(new URL('../v010-'+prefix+'-'+view+'.html',import.meta.url),html.replace('</head>',injection+'\n'+boot+'\n</head>'));
 }
}
console.log('PASS: generated four fictional Shopping Lists Chrome fixtures');
