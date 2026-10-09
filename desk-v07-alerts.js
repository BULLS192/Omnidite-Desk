/* V0.7: read-only on-page weather / haze thresholds. No background push alerts. */
(() => {
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const cache=new Map(),pending=new Map(),TTL=15*60*1000;
 const SG={id:'sg',name:'Singapore',country:'Singapore',timezone:'Asia/Singapore',latitude:1.3521,longitude:103.8198};
 const choices={psi:[101,151,201],us_aqi:[101,151,201],european_aqi:[41,61,81]};
 const thresholds={psi:'24-hour PSI',us_aqi:'US AQI (model)',european_aqi:'European AQI (model)'};
 const goodCity=city=>city&&typeof city.id==='string'&&Number.isFinite(city.latitude)&&Number.isFinite(city.longitude)&&city.timezone;
 function cities(){
  const s=window.DeskBridge?.getState?.(),all=(s?.pages||[]).flatMap(p=>(p.modules||[]).filter(m=>m.type==='weather').flatMap(m=>m.config.cities||[]));
  const values=[SG,...all].filter(goodCity),seen=new Set();
  return values.filter(c=>{const key=c.id+':'+c.latitude+':'+c.longitude;if(seen.has(key))return false;seen.add(key);return true;}).slice(0,25);
 }
 function cityOf(config){
  const all=cities();return all.find(c=>c.id===config.cityId)||all[0]||SG;
 }
 function kindOf(city){return window.DeskAir?.indexType(city)||'us_aqi';}
 function limitOf(config,kind){
  return kind==='psi'?(choices.psi.includes(config.psiLimit)?config.psiLimit:101):kind==='european_aqi'?(choices.european_aqi.includes(config.euLimit)?config.euLimit:61):(choices.us_aqi.includes(config.aqiLimit)?config.aqiLimit:101);
 }
 async function weatherData(city){
  const key=Number(city.latitude).toFixed(3)+','+Number(city.longitude).toFixed(3),old=cache.get(key);
  if(old&&Date.now()-old.at<TTL)return old.data;
  if(pending.has(key))return pending.get(key);
  const url=new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude',String(city.latitude));url.searchParams.set('longitude',String(city.longitude));
  url.searchParams.set('timezone',city.timezone);url.searchParams.set('current','weather_code');
  url.searchParams.set('hourly','precipitation_probability,weather_code');url.searchParams.set('forecast_days','2');
  const promise=fetch(url.toString(),{signal:AbortSignal.timeout(14000),credentials:'omit'}).then(async response=>{
   if(!response.ok)throw Error('Weather service HTTP '+response.status);
   const data=await response.json();
   if(!Array.isArray(data.hourly?.time)||!Array.isArray(data.hourly?.precipitation_probability))throw Error('Missing rain forecast');
   const now=(data.current?.time||'').slice(0,13);
   const periods=data.hourly.time.map((t,i)=>({time:t,i})).filter(x=>x.time.slice(0,13)>=now).slice(0,6);
   const probs=periods.map(x=>data.hourly.precipitation_probability[x.i]).filter(Number.isFinite);
   const rain=probs.length?Math.max(...probs):null;
   const storms=periods.some(x=>[95,96,99].includes(data.hourly.weather_code?.[x.i]));
   const result={rain,storms,periods:periods.length,valid:now,time:data.current?.time||'',stale:false};
   cache.set(key,{at:Date.now(),data:result});return result;
  }).catch(e=>{if(old)return {...old.data,stale:true};throw e;}).finally(()=>pending.delete(key));
  pending.set(key,promise);return promise;
 }
 function airValue(data){
  if(!data)return null;
  if(data.kind==='psi'){const v=Object.values(data.psi||{}).filter(Number.isFinite);return v.length?Math.max(...v):null;}
  return Number.isFinite(data.value)?data.value:null;
 }
 function evaluate(air,weather,config,kind){
  const threshold=limitOf(config,kind),value=airValue(air),rainLimit=[50,70,90].includes(config.rainLimit)?config.rainLimit:70;
  const alerts=[];
  if(value!==null&&value>=threshold)alerts.push({type:'air',text:thresholds[kind]+' '+Math.round(value)+' meets threshold '+threshold,stale:!!air?.stale});
  if(Number.isFinite(weather?.rain)&&weather.rain>=rainLimit)alerts.push({type:'rain',text:'Rain probability peaks at '+Math.round(weather.rain)+'% in the next six forecast hours',stale:!!weather?.stale});
  if(weather?.storms)alerts.push({type:'storm',text:'Thunderstorm conditions appear in the next six forecast hours',stale:!!weather?.stale});
  return {alerts,value,threshold,rainLimit};
 }
 function renderAlerts(m){
  const c=m.config,all=cities(),city=cityOf(c),kind=kindOf(city),threshold=limitOf(c,kind);
  const selectOptions=(values,active,labels)=>values.map(v=>'<option value="'+v+'" '+(active===v?'selected':'')+'>'+esc(labels?.[v]||String(v))+'</option>').join('');
  return '<p class="module-sub">AIR QUALITY + RAIN · CHECKS WHILE DESK IS OPEN</p>'+
    '<form class="v07-alert-form" data-v07-alert-form="'+esc(m.id)+'"><label>Location<select name="cityId" class="modal-input">'+all.map(v=>
     '<option value="'+esc(v.id)+'" '+(v.id===city.id?'selected':'')+'>'+esc(v.name)+' · '+esc(v.country||'')+'</option>').join('')+'</select></label>'+
    '<label>Air threshold <small>'+esc(thresholds[kind])+'</small><select class="modal-input" name="airLimit">'+selectOptions(choices[kind],threshold)+'</select></label>'+
    '<label>Rain probability<select name="rainLimit" class="modal-input">'+selectOptions([50,70,90],[50,70,90].includes(c.rainLimit)?c.rainLimit:70,{50:'50%',70:'70%',90:'90%'})+'</select></label>'+
    '<button class="smallbutton" type="submit">Apply thresholds</button></form>'+
    '<div class="v07-alert-output" data-v07-alert-result="'+esc(m.id)+'">Checking public weather and air-quality data…</div>'+
    '<p class="v07-disclaimer">In-page thresholds, NOT OS notifications, official hazard warnings or health advice. Singapore: NEA regional 24-hour PSI. Other places: atmospheric-model AQI. Rain/storm: Open-Meteo forecast. Re-check about every 15 min while Desk is open; stale readings are marked.</p>';
 }
 async function refreshAlerts(){
  const s=window.DeskBridge?.getState?.();if(!s)return;
  const modules=s.pages.find(p=>p.id===s.activePage)?.modules||[];
  for(const m of modules.filter(x=>x.type==='weatheralerts')){
   const el=document.querySelector('[data-v07-alert-result="'+CSS.escape(m.id)+'"]');if(!el)continue;
   const city=cityOf(m.config),kind=kindOf(city);
   const [air,weather]=await Promise.allSettled([window.DeskAir?.load(city),weatherData(city)]);
   if(!el.isConnected)continue;
   const current=window.DeskBridge.getState().pages.flatMap(p=>p.modules).find(x=>x.id===m.id);
   if(!current||current.config.cityId!==m.config.cityId)continue;
   const airData=air.status==='fulfilled'?air.value:null,weatherInfo=weather.status==='fulfilled'?weather.value:null;
   if(!airData&&!weatherInfo){el.textContent='Air and rain data are unavailable. Check your network and try again.';continue;}
   const result=evaluate(airData,weatherInfo,m.config,kind);
   const rows=result.alerts.length?result.alerts.map(a=>'<div class="v07-alert-item" data-stale="'+a.stale+'"><strong>'+esc(a.stale?'Last known · ':'')+esc(a.text)+'</strong></div>').join(''):'<div class="v07-alert-calm">No configured thresholds met in available data.</div>';
   const detail=airData?(kind==='psi'?'NEA regional 24h PSI':'Open-Meteo modeled AQI')+(airData.stale?' · stale':''):'Air data unavailable';
   const rain=weatherInfo?(Number.isFinite(weatherInfo.rain)?Math.round(weatherInfo.rain)+'% peak rain probability':'Rain probability unavailable')+(weatherInfo.stale?' · stale':''):'Rain forecast unavailable';
   el.innerHTML=rows+'<p class="v07-alert-stamp">'+esc(detail)+' · '+esc(rain)+'</p>';
  }
 }
 document.addEventListener('submit',e=>{
  const form=e.target.closest('form[data-v07-alert-form]');if(!form)return;
  e.preventDefault();
  const api=window.DeskBridge,w=api?.getState?.().pages.flatMap(p=>p.modules).find(x=>x.id===form.dataset.v07AlertForm);
  if(!w)return;
  const all=cities(),city=all.find(x=>x.id===form.elements.cityId.value);if(!city)return;
  const kind=kindOf(city),limit=Number(form.elements.airLimit.value),rain=Number(form.elements.rainLimit.value);
  // When switching city index families, keep the separate saved threshold for that scale.
  w.config.cityId=city.id;
  if(choices[kind].includes(limit))w.config[kind==='psi'?'psiLimit':kind==='european_aqi'?'euLimit':'aqiLimit']=limit;
  if([50,70,90].includes(rain))w.config.rainLimit=rain;
  api.save();
 });
 window.DeskV07.renderAlerts=renderAlerts;
 window.DeskV07.refreshAlerts=refreshAlerts;
 window.DeskV07.evaluateAlerts=evaluate;
 window.DeskV07.weatherAlertForecast=weatherData;
 window.DeskV07.citiesForAlerts=cities;
 setInterval(()=>{if(document.visibilityState==='visible')refreshAlerts();},15*60*1000);
})();