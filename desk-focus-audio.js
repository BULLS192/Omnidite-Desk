/* Local-only Focus sounds for Omnidite Desk.
 * WebAudio preset synthesis; optional user-selected sound in chrome.storage.local.
 * No remote requests, no permanent audio permission, no cloud sync. */
(() => {
 'use strict';
 const PREFIX='omniditeDeskFocusSound:';
 let context=null,activeAudio=null;
 const MAX_BYTES=1024*1024;
 const TYPES=new Set(['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/wave','audio/ogg']);
 const validId=id=>typeof id==='string'&&/^[\w-]{1,90}$/.test(id);
 const clamp=n=>Math.max(0,Math.min(1,Number(n)/100));
 function unlock(){
  try{
   const C=window.AudioContext||window.webkitAudioContext;
   if(!C)return false;
   if(!context)context=new C();
   if(context.state==='suspended')context.resume().catch(()=>{});
   return true;
  }catch{return false;}
 }
 function notes(kind){
  if(kind==='chime')return [[880,0,.20,'sine'],[1175,.19,.32,'sine'],[1568,.41,.48,'sine']];
  if(kind==='soft')return [[523.25,0,.34,'triangle'],[659.25,.24,.34,'triangle'],[783.99,.48,.5,'triangle']];
  if(kind==='bell')return [[740,0,.52,'triangle'],[1480,.10,.48,'sine'],[2200,.22,.38,'sine']];
  if(kind==='digital')return [[920,0,.11,'square'],[0,.13,.05,'sine'],[920,.22,.11,'square'],[920,.43,.13,'square']];
  return [];
 }
 async function play(kind='chime',volume=70,mid=''){
  if(kind==='none'||Number(volume)<=0)return true;
  const gainValue=clamp(volume);
  if(kind==='custom'){
   if(!validId(mid)||!chrome?.storage?.local)return false;
   const saved=(await chrome.storage.local.get(PREFIX+mid))[PREFIX+mid];
   if(typeof saved!=='string'||!/^data:audio\/(?:mpeg|mp3|wav|x-wav|wave|ogg);base64,[A-Za-z0-9+/=]+$/.test(saved)){
    return false;
   }
   if(activeAudio){activeAudio.pause();activeAudio.currentTime=0;}
   const audio=new Audio(saved);
   audio.volume=gainValue;
   activeAudio=audio;
   try{await audio.play();return true;}catch{return false;}
  }
  if(!notes(kind).length||!unlock())return false;
  try{
   if(context.state!=='running')await context.resume();
   const start=context.currentTime+.025;
   for(const [pitch,delay,duration,shape] of notes(kind)){
    if(!pitch)continue;
    const osc=context.createOscillator(),gain=context.createGain();
    osc.type=shape;osc.frequency.value=pitch;
    gain.gain.setValueAtTime(.0001,start+delay);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002,gainValue*(shape==='square'?.1:.17)),start+delay+.012);
    gain.gain.exponentialRampToValueAtTime(.0001,start+delay+duration);
    osc.connect(gain);gain.connect(context.destination);
    osc.start(start+delay);osc.stop(start+delay+duration+.02);
   }
   return true;
  }catch{return false;}
 }
 async function upload(mid,file){
  if(!validId(mid))throw Error('Invalid focus widget.');
  if(!file||file.size<1||file.size>MAX_BYTES)throw Error('Choose an audio file no larger than 1 MB.');
  const extension=/\.(mp3|wav|ogg)$/i.test(file.name||'');
  if(!extension||file.type&&!TYPES.has(file.type))throw Error('Supported formats: MP3, WAV and OGG.');
  if(!chrome?.storage?.local)throw Error('Chrome local storage unavailable.');
  const data=await new Promise((resolve,reject)=>{
   const reader=new FileReader();
   reader.onload=()=>resolve(String(reader.result||''));
   reader.onerror=()=>reject(Error('Could not read the selected audio file.'));
   reader.readAsDataURL(file);
  });
  if(!/^data:audio\/(?:mpeg|mp3|wav|x-wav|wave|ogg);base64,[A-Za-z0-9+/=]+$/.test(data))throw Error('Unrecognized audio file format.');
  await chrome.storage.local.set({[PREFIX+mid]:data});
  return true;
 }
 window.DeskFocusAudio={play,unlock,upload};
})();
