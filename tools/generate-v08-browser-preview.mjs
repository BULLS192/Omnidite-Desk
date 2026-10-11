import fs from 'node:fs';
const today=new Date(), tomorrow=new Date(Date.now()+86400000);
const date=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const state={
 version:2,brand:'Omnidite Desk',theme:'midnight',layoutMode:'rows',sizingMode:'free',gridSettings:{columns:6,cellHeight:104},accent:'#4a8df5',
 activePage:'overview',updatedAt:Date.now(),
 pages:[{id:'overview',title:'Overview',modules:[
  {id:'demo-notes',type:'notes',title:'Research notes',cols:6,gridW:3,gridH:3,config:{text:'Example logistics research notes'}},
  {id:'demo-agenda',type:'agenda',title:'Local agenda',cols:6,gridW:3,gridH:3,config:{events:[{id:'e1',title:'Example team review',when:date(tomorrow)+'T11:00'}]}},
  {id:'demo-tasks',type:'tasks',title:'Priorities',cols:6,gridW:3,gridH:3,config:{tasks:[{id:'w1',text:'Check schedule',done:false}]}}
 ]}],
 projects:[{id:'p1',name:'Example Project',status:'Active',url:'https://example.com'}],
 advancedTasks:[{id:'task-1',title:'Review launch checklist',project:'Example Project',priority:'high',due:date(tomorrow),stage:'doing',done:false}],
 contentItems:[{id:'content-1',title:'Write article draft',date:date(tomorrow),channel:'Article / Blog',stage:'Draft',project:'Example Project'}],
 captures:[{id:'research-1',title:'Research collection example',url:'https://example.com/article',note:'Helpful reference',project:'Example Project',tags:['markets'],collection:'Industry',createdAt:Date.now()}],
 workSessions:[{id:'session-1',name:'Focus session',createdAt:Date.now(),tabs:[{url:'https://example.com',title:'Example'}]}],
 calendarEvents:[{id:'offline-1',title:'Imported sample calendar',when:Date.now()+10800000}],
 layoutSnapshots:[],githubRepos:[],pulseSettings:{url:'',auto:false},pulseCache:null,operationalAlerts:[]
};
const injection='<script>try{localStorage.setItem("omniditeDeskStateV2",'+JSON.stringify(JSON.stringify(state))+');}catch(e){document.documentElement.dataset.fixtureError="yes";}</script>';
const cases={agenda:['openAgenda','Unified agenda'],tasks:['taskBoard','Project task board'],search:['openSearch','Universal search'],research:['researchStudio','Research studio']};
for(const [input,base] of [['index.html','newtab'],['sidepanel.html','sidepanel']]){
 const html=fs.readFileSync(new URL('../'+input,import.meta.url),'utf8');
 if(!html.includes('desk-v08.js')||!html.includes('</head>'))throw Error('Missing V0.8 loading: '+input);
 for(const [key,[action]] of Object.entries(cases)){
  const boot='<script>window.addEventListener("load",()=>setTimeout(()=>{window.DeskV08?.'+action+'();},100));</script>';
  const rendered=html.replace('</head>',injection+'\n'+boot+'\n</head>');
  fs.writeFileSync(new URL('../v08-'+base+'-'+key+'.html',import.meta.url),rendered);
 }
}
console.log('PASS: generated eight public sample-data V0.8 New Tab / Side Panel dialog fixtures');
