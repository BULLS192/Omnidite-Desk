import fs from 'node:fs';
const modules=[
 {id:'v07-market-demo',type:'markets',title:'World markets',cols:6,gridW:3,gridH:5,config:{markets:['SGX','NYSE','NASDAQ','LSE','HKEX','SSE']}},
 {id:'v07-fx-demo',type:'fx',title:'Currency & FX',cols:6,gridW:3,gridH:3,config:{base:'SGD',quote:'USD',amount:100}},
 {id:'v07-alert-demo',type:'weatheralerts',title:'Weather & air alerts',cols:6,gridW:3,gridH:4,config:{cityId:'sg',psiLimit:101,aqiLimit:101,euLimit:61,rainLimit:70}},
 {id:'v07-snapshot-demo',type:'snapshot',title:'Daily snapshot',cols:6,gridW:3,gridH:5,config:{days:3}},
 {id:'v07-legacy-weather',type:'weather',title:'Weather',cols:6,gridW:3,gridH:4,config:{cities:[{id:'sg',name:'Singapore',country:'Singapore',latitude:1.3521,longitude:103.8198,timezone:'Asia/Singapore'}],view:'now',selected:'sg'}}
];
const state={
 version:2,brand:'Omnidite Desk',theme:'midnight',layoutMode:'rows',sizingMode:'free',gridSettings:{columns:6,cellHeight:104},
 accent:'#4a8df5',activePage:'overview',updatedAt:Date.now(),
 pages:[{id:'overview',title:'Overview',modules}],projects:[],captures:[],layoutSnapshots:[],
 advancedTasks:[{id:'task1',title:'Demo priority task',project:'Example',priority:'high',due:new Date(Date.now()+86400000).toISOString().slice(0,10),done:false}],
 contentItems:[],workSessions:[],calendarEvents:[{id:'event1',title:'Sample project meeting',when:Date.now()+7200000}],
 githubRepos:[],githubCache:null,pulseSettings:{url:'',auto:false},pulseCache:null,operationalAlerts:[]
};
const init='<script>try{localStorage.setItem("omniditeDeskStateV2",'+JSON.stringify(JSON.stringify(state))+');}catch(e){document.documentElement.dataset.fixtureError="true";}</script>';
for(const [input,output] of [['index.html','v07-preview-newtab.html'],['sidepanel.html','v07-preview-sidepanel.html']]){
 let html=fs.readFileSync(new URL('../'+input,import.meta.url),'utf8');
 if(!html.includes('</head>')||!html.includes('desk-v07-snapshot.js'))throw Error('V0.7 scripts missing in '+input);
 html=html.replace('</head>',init+'\n</head>');
 fs.writeFileSync(new URL('../'+output,import.meta.url),html);
 console.log('PASS: generated '+output+' with public fabricated data only');
}
