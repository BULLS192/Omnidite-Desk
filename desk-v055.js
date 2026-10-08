/* Omnidite Desk V0.5.5 visual preview: cached calendar at-a-glance.
 * No Google API requests, tokens, new Chrome permissions or sync changes. */
(() => {
  'use strict';
  const key='omnidite-google-calendar-local-v1';
  const name=document.getElementById('deskNextMeeting');
  const detail=document.getElementById('deskNextMeetingTime');
  if(!name||!detail)return;

  let snapshot=null;
  const fmtClock=ms=>new Date(ms).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});
  function whenLabel(ev,now){
    const start=new Date(ev.when);
    const today=new Date(now);
    const sameDate=(a,b)=>a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
    const tomorrow=new Date(now);tomorrow.setDate(tomorrow.getDate()+1);
    let day=sameDate(start,today)?'Today':sameDate(start,tomorrow)?'Tomorrow':start.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
    if(ev.allDay)return day+' · All day';
    const diff=Math.max(0,ev.when-now),minutes=Math.ceil(diff/60000);
    const relative=diff<3600000?' · in '+minutes+' min':diff<86400000?' · in '+Math.ceil(diff/3600000)+' hr':'';
    return day+' · '+fmtClock(ev.when)+relative;
  }
  function render(){
    const now=Date.now();
    if(!snapshot?.connected){
      name.textContent='Connect your calendar';
      detail.textContent='Open Calendar to get started';
      return;
    }
    const selected=new Set(Array.isArray(snapshot.selected)?snapshot.selected:[]);
    const upcoming=(Array.isArray(snapshot.events)?snapshot.events:[])
      .filter(e=>e&&Number.isFinite(e.when)&&e.when>=now&&selected.has(e.calendar)&&typeof e.title==='string')
      .sort((a,b)=>a.when-b.when);
    const next=upcoming[0];
    if(!next){
      name.textContent='No upcoming events';
      detail.textContent='Open Calendar to refresh the snapshot';
      return;
    }
    name.textContent=(next.title.trim()||'Untitled event').slice(0,130);
    detail.textContent=whenLabel(next,now);
  }
  async function refresh(){
    if(typeof chrome==='undefined'||!chrome.storage?.local?.get){
      name.textContent='Calendar unavailable';detail.textContent='Open Calendar in Chrome';return;
    }
    try{
      const data=await chrome.storage.local.get(key);
      snapshot=data?.[key]||null;
      render();
    }catch{
      name.textContent='Calendar unavailable';
      detail.textContent='Open Calendar to reconnect';
    }
  }
  refresh();
  if(typeof chrome!=='undefined'&&chrome.storage?.onChanged){
    chrome.storage.onChanged.addListener((changes,area)=>{
      if(area==='local'&&changes[key]){
        snapshot=changes[key].newValue||null;
        render();
      }
    });
  }
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh();});
  setInterval(render,60000);
})();
