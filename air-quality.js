/* Omnidite Desk — local-first air quality adapter. Never equate PSI with AQI. */
(() => {
 'use strict';
 const cache = new Map(), pending = new Map();
 const TTL = 15 * 60 * 1000;
 const regions = ['north','south','east','west','central'];
 const labels = {north:'North',south:'South',east:'East',west:'West',central:'Central'};
 const SG_PSI = 'https://api-open.data.gov.sg/v2/real-time/api/psi';
 const SG_PM25 = 'https://api-open.data.gov.sg/v2/real-time/api/pm25';
 const europeanCountries = ['United Kingdom','Ireland','France','Germany','Italy','Spain','Portugal','Belgium','Netherlands','Luxembourg','Austria','Switzerland','Norway','Sweden','Denmark','Finland','Iceland','Poland','Czechia','Czech Republic','Slovakia','Hungary','Romania','Bulgaria','Greece','Cyprus','Malta','Slovenia','Croatia','Estonia','Latvia','Lithuania','Serbia','Montenegro','Albania','North Macedonia','Bosnia and Herzegovina','Ukraine','Moldova','Turkey'];
 const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const numeric = v => typeof v === 'number' && Number.isFinite(v);
 const number = v => numeric(v) ? String(Math.round(v)) : '—';
 const isSingapore = city => /^singapore$/i.test(String(city?.name || '').trim()) &&
    (/singapore/i.test(String(city?.country || '')) || city?.timezone === 'Asia/Singapore');
 function indexType(city){
  if (isSingapore(city)) return 'psi';
  const country = String(city?.country || '');
  if (europeanCountries.some(c => country === c || country.endsWith(', ' + c))) return 'european_aqi';
  return 'us_aqi';
 }
 function severity(kind,value) {
  if (!numeric(value)) return {label:'Unavailable',tone:'unknown'};
  if (kind==='psi') {
   if(value<=50)return {label:'Good',tone:'good'};
   if(value<=100)return {label:'Moderate',tone:'moderate'};
   if(value<=200)return {label:'Unhealthy',tone:'unhealthy'};
   if(value<=300)return {label:'Very unhealthy',tone:'severe'};
   return {label:'Hazardous',tone:'hazardous'};
  }
  if(kind==='european_aqi'){
   if(value<=20)return {label:'Good',tone:'good'};
   if(value<=40)return {label:'Fair',tone:'moderate'};
   if(value<=60)return {label:'Moderate',tone:'moderate'};
   if(value<=80)return {label:'Poor',tone:'unhealthy'};
   if(value<=100)return {label:'Very poor',tone:'severe'};
   return {label:'Extremely poor',tone:'hazardous'};
  }
  if(value<=50)return {label:'Good',tone:'good'};
  if(value<=100)return {label:'Moderate',tone:'moderate'};
  if(value<=150)return {label:'Unhealthy for sensitive groups',tone:'unhealthy'};
  if(value<=200)return {label:'Unhealthy',tone:'unhealthy'};
  if(value<=300)return {label:'Very unhealthy',tone:'severe'};
  return {label:'Hazardous',tone:'hazardous'};
 }
 const indexLabel = kind => kind==='psi'?'24-hour PSI':kind==='european_aqi'?'European AQI':'US AQI';
 function modelLocalTime(timestamp){return typeof timestamp==='string' && /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}/.test(timestamp)?timestamp.slice(0,16).replace('T',' ')+' (local)':'Time unavailable';}
 function formattedTime(timestamp,timezone) {
  if (!timestamp || Number.isNaN(Date.parse(timestamp))) return 'Time unavailable';
  try { return new Intl.DateTimeFormat('en-SG',{timeZone:timezone||'UTC',dateStyle:'medium',timeStyle:'short'}).format(new Date(timestamp)); }
  catch { return timestamp; }
 }
 async function json(url){
  const response = await fetch(url,{signal:AbortSignal.timeout(15000)});
  if(!response.ok) throw Error('Air quality service HTTP '+response.status);
  const body = await response.json();
  if(body?.error || body?.code && body.code !== 0) throw Error('Air quality service error');
  return body;
 }
 function observation(result,field) {
  const item=result?.data?.items?.[0];
  const raw=item?.readings?.[field];
  return {readings:raw && typeof raw==='object' ? raw : {},time:item?.timestamp||null};
 }
 async function fromNEA(){
  const [psiResult,pmResult]=await Promise.allSettled([json(SG_PSI),json(SG_PM25)]);
  if(psiResult.status==='rejected' && pmResult.status==='rejected')throw Error('Singapore data unavailable');
  const psi=psiResult.status==='fulfilled'?observation(psiResult.value,'psi_twenty_four_hourly'):{readings:{},time:null};
  const pm=pmResult.status==='fulfilled'?observation(pmResult.value,'pm25_one_hourly'):{readings:{},time:null};
  const latest = Object.values(psi.readings).filter(numeric);
  if(!latest.length && !Object.values(pm.readings).some(numeric))throw Error('No Singapore readings');
  return {kind:'psi',source:'NEA · data.gov.sg',model:false,psi:psi.readings,pm25:pm.readings,psiTime:psi.time,pmTime:pm.time,sourceUrl:'https://data.gov.sg/datasets/d_fe37906a0182569d891506e815e819b7/view'};
 }
 async function fromModel(city,kind){
  const url=new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
  url.searchParams.set('latitude',String(city.latitude));
  url.searchParams.set('longitude',String(city.longitude));
  url.searchParams.set('timezone',city.timezone||'auto');
  url.searchParams.set('current','us_aqi,european_aqi,pm2_5,pm10');
  url.searchParams.set('hourly','us_aqi,european_aqi,pm2_5');
  url.searchParams.set('forecast_days','2');
  const data=await json(url);
  if(!data.current || !numeric(data.current[kind]))throw Error('Air-quality index unavailable');
  return {kind,source:'Open-Meteo / CAMS',model:true,value:data.current[kind],pm25:data.current.pm2_5,pm10:data.current.pm10,time:data.current.time,timezone:city.timezone,sourceUrl:'https://open-meteo.com/en/docs/air-quality-api',hourly:data.hourly};
 }
 function load(city){
  const kind=indexType(city);
  const key=kind==='psi'?'sg':kind+':'+Number(city.latitude).toFixed(4)+','+Number(city.longitude).toFixed(4);
  const old=cache.get(key);
  if(old && Date.now()-old.at<TTL)return Promise.resolve(old.data);
  if(pending.has(key))return pending.get(key);
  const promise=(kind==='psi'?fromNEA():fromModel(city,kind))
   .then(data=>{cache.set(key,{at:Date.now(),data});return data;})
   .catch(e=>{if(old)return {...old.data,stale:true};throw e;})
   .finally(()=>pending.delete(key));
  pending.set(key,promise);return promise;
 }
 function summary(data){
  if(!data)return '<div class="air-preview air-unavailable">Air quality unavailable</div>';
  if(data.kind==='psi'){
   const entries=regions.map(region=>({region,value:data.psi[region]})).filter(x=>numeric(x.value));
   const worst=entries.length?entries.reduce((a,b)=>a.value>b.value?a:b):null;
   if(!worst)return '<div class="air-preview air-unavailable">PSI unavailable · NEA PM2.5 may still be available</div>';
   const status=severity('psi',worst.value);
   return `<div class="air-preview"><span class="air-badge" data-tone="${status.tone}">PSI ${number(worst.value)} · ${esc(status.label)}</span><small>Highest region: ${labels[worst.region]} · 24-hour index${data.stale?' · Last known':''}</small></div>`;
  }
  const s=severity(data.kind,data.value);
  return `<div class="air-preview"><span class="air-badge" data-tone="${s.tone}">${esc(indexLabel(data.kind))} ${number(data.value)} · ${esc(s.label)}</span><small>CAMS model estimate${data.stale?' · Last known':''}</small></div>`;
 }
 function detail(data,city){
  const source=`<div class="air-source">Source: <a href="${esc(data.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(data.source)}</a> · ${data.model?'Model estimate; not a station measurement':'Government monitoring data'}${data.stale?' · Cached reading (stale)':''}</div>`;
  if(data.kind==='psi'){
   const hasPSI=regions.some(r=>numeric(data.psi[r]));
   const status=hasPSI?regions.map(r=>numeric(data.psi[r])?data.psi[r]:-1).reduce((a,b)=>Math.max(a,b),-1):null;
   const maxStatus=severity('psi',status);
   const rows=regions.map(region=>{
    const value=data.psi[region],pm=data.pm25[region],s=severity('psi',value);
    return `<div class="air-region-row"><strong>${labels[region]}</strong><span class="air-badge" data-tone="${s.tone}">${number(value)} ${numeric(value)?esc(s.label):''}</span><span>${number(pm)} µg/m³</span></div>`;
   }).join('');
   return `<div class="air-detail"><div class="air-head"><strong>Singapore · Regional air quality</strong><span class="air-badge" data-tone="${maxStatus.tone}">${hasPSI?'Peak PSI '+number(status):'PSI unavailable'}</span></div>
    <p class="air-explain">24-hour PSI and 1-hour PM2.5 measure different periods. Check 1-hour PM2.5 for sudden haze changes. PSI reflects the last 24 hours.</p>
    <div class="air-region-heading"><span>Region</span><span>24-hour PSI</span><span>1-hour PM2.5</span></div>${rows}
    <div class="air-observed">PSI observed: ${esc(formattedTime(data.psiTime,'Asia/Singapore'))} SGT · PM2.5 observed: ${esc(formattedTime(data.pmTime,'Asia/Singapore'))} SGT</div>${source}</div>`;
  }
  const s=severity(data.kind,data.value),index=data.kind;
  const hourly=data.hourly||{};
  const current=(data.time||'').slice(0,13);
  const slots=(hourly.time||[]).map((time,i)=>({time,i})).filter(x=>x.time.slice(0,13)>=current).slice(0,8);
  return `<div class="air-detail"><div class="air-head"><strong>${esc(city.name)} · ${esc(indexLabel(index))}</strong><span class="air-badge" data-tone="${s.tone}">${number(data.value)} · ${esc(s.label)}</span></div>
   <div class="air-pollutants"><span>PM2.5 <strong>${number(data.pm25)} µg/m³</strong></span><span>PM10 <strong>${number(data.pm10)} µg/m³</strong></span></div>
   <p class="air-explain">Based on atmospheric model forecasts, not an official local station reading. Different countries' index scales are not directly comparable.</p>
   ${slots.length?`<div class="air-trend-label">Model outlook · next 8 hours</div><div class="air-trend">${slots.map(({time,i})=>{
    const value=hourly[index]?.[i],level=severity(index,value);
    return `<span class="air-trend-item"><small>${esc(time.slice(11,16))}</small><b data-tone="${level.tone}">${number(value)}</b></span>`;
   }).join('')}</div>`:''}
   <div class="air-observed">Model valid for: ${esc(modelLocalTime(data.time))} local time</div>${source}</div>`;
 }
 window.DeskAir={load,summary,detail,severity,indexType,isSingapore};
})();