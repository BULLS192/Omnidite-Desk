import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const script=fs.readFileSync(new URL('../desk-focus-audio.js',import.meta.url),'utf8');
let reads=0,writes=0,plays=0,oscillators=0,remote=0;
const saved={};
const context={
 currentTime:5,state:'running',destination:{},
 createOscillator(){oscillators++;return {frequency:{value:0},connect(){},start(){},stop(){},set type(v){this.typeValue=v;}}},
 createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}},
 resume:async()=>{context.state='running'}
};
class AudioMock{constructor(data){this.src=data;this.volume=0;this.currentTime=0;}pause(){}async play(){plays++;}}
class FileReaderMock{readAsDataURL(file){this.result=file.content;this.onload?.();}}
const chrome={storage:{local:{get:async key=>{reads++;return {[key]:saved[key]}},set:async record=>{writes++;Object.assign(saved,record)}}}};
const window={AudioContext:class {constructor(){return context;}}};
const sandbox={window,chrome,Audio:AudioMock,FileReader:FileReaderMock,Number,Math,Set,Error,fetch:()=>{remote++;throw Error('No network calls allowed')}};
vm.runInNewContext(script,sandbox);
const sound=window.DeskFocusAudio;
assert.ok(sound);
assert.equal(await sound.play('none',70,'focus-1'),true);
assert.equal(oscillators,0);
assert.equal(await sound.play('chime',70,'focus-1'),true);
assert.ok(oscillators>=3);
assert.equal(await sound.play('digital',50,'focus-1'),true);
assert.ok(oscillators>=5);
await assert.rejects(sound.upload('focus-1',{size:1024*1024+1,name:'oversized.mp3',type:'audio/mpeg'}),/1 MB/);
await assert.rejects(sound.upload('focus-1',{size:10,name:'fake.txt',type:'text/plain'}),/Supported formats/);
const payload='data:audio/mpeg;base64,'+'QUJDRA==';
assert.equal(await sound.upload('focus-1',{size:20,name:'notify.mp3',type:'audio/mpeg',content:payload}),true);
assert.equal(writes,1);
assert.equal(saved['omniditeDeskFocusSound:focus-1'],payload);
assert.equal(await sound.play('custom',37,'focus-1'),true);
assert.equal(plays,1);
assert.ok(reads>=1);
assert.equal(remote,0);
console.log('PASS: preset WebAudio chime/digital, silent mode and custom local audio preview');
console.log('PASS: 1MB MP3 file guard, isolated Chrome-local persistence, no network');
