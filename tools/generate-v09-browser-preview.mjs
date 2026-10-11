import fs from 'node:fs';
const due=new Date();
const day=[due.getFullYear(),String(due.getMonth()+1).padStart(2,'0'),String(due.getDate()).padStart(2,'0')].join('-');
const now=Date.now();
const fixture={
 version:2,brand:'Omnidite Desk',theme:'midnight',layoutMode:'rows',sizingMode:'free',gridSettings:{columns:6,cellHeight:104},
 accent:'#4a8df5',activePage:'overview',updatedAt:now,
 pages:[{id:'overview',title:'Overview',modules:[]}],
 projects:[{id:'p1',name:'Example Project',url:'https://example.com',previewUrl:'https://preview.example.com',repo:'sample/public-repo',status:'Tracked',note:'Example operations project'}],
 advancedTasks:[{id:'task1',title:'Review example release',project:'Example Project',priority:'high',due:day,stage:'blocked',done:false}],
 contentItems:[{id:'content1',title:'Publish case study',project:'Example Project',channel:'Blog',stage:'Draft',date:day}],
 captures:[],workSessions:[],calendarEvents:[{id:'event1',title:'Sample calendar event',when:now+1800000}],
 githubRepos:['sample/public-repo'],githubSelected:'sample/public-repo',
 githubCache:{repo:'sample/public-repo',checkedAt:now,openPrs:2,openIssues:4,failedWorkflows:1,lastWorkflow:'Example CI failure',url:'https://github.com/sample/public-repo'},
 pulseSettings:{url:'',auto:false},
 pulseCache:{source:'Imported JSON snapshot',checkedAt:now,capturedAt:new Date(now-3600000).toISOString(),providers:[{name:'Vercel',status:'warning',metrics:[{label:'Deployments',value:84,limit:100,unit:''}]},{name:'Supabase',status:'ok',metrics:[{label:'Storage',value:0.4,limit:1,unit:'GB'}]}]},
 opsPrefs:{warn:80,critical:95,staleHours:3},
 operationalAlerts:[{id:'alert1',source:'Vercel',message:'Usage over configured limit threshold',severity:'warning',createdAt:now,signature:'warning',acknowledgedAt:0}],
 layoutSnapshots:[],githubReposExtra:[],pulseSettingsExtra:{}
};
const injection='<script>try{localStorage.setItem("omniditeDeskStateV2",'+JSON.stringify(JSON.stringify(fixture))+');}catch(e){document.documentElement.dataset.fixtureError="true";}</script>';
const cases={monitor:['overview','Unified monitoring'],projects:['projects','Project command center'],alerts:['alerts','Operations alerts'],brief:['dailyBrief','Daily operations brief']};
for(const [src,prefix] of [['index.html','newtab'],['sidepanel.html','sidepanel']]){
 const html=fs.readFileSync(new URL('../'+src,import.meta.url),'utf8');
 if(!html.includes('desk-v09.js')||!html.includes('desk-v09.css'))throw Error('Missing V0.9 assets in '+src);
 for(const [key,[action]] of Object.entries(cases)){
  const boot='<script>window.addEventListener("load",()=>setTimeout(()=>window.DeskV09?.'+action+'(),125));</script>';
  fs.writeFileSync(new URL('../v09-'+prefix+'-'+key+'.html',import.meta.url),html.replace('</head>',injection+'\n'+boot+'\n</head>'));
 }
}
console.log('PASS: generated eight fictional V0.9 operations panel Chrome fixtures');
