import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('app.js');
const section=(start,end)=>{
 const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,'Missing function boundaries: '+start);
 return source.slice(a,b);
};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const context={URL,Number,Object,esc,cityPicker:()=>'<div></div>',itemOrderButtons:()=>''};
vm.runInNewContext(section('function renderWeatherModule(m){','function weatherRequest(city){')+
 '\n'+section('function weatherRadar(city){','async function refreshWeather(){')+
 '\nglobalThis.weather={renderWeatherModule,weatherRadar};',context);
const {renderWeatherModule,weatherRadar}=context.weather;
const sg={id:'sg',name:'Singapore & <Test>',latitude:1.3521,longitude:103.8198};
const hou={id:'hou',name:'Houston',latitude:29.7604,longitude:-95.3698};
const widget={id:'weather1',config:{cities:[sg,hou],selected:'sg',view:'radar'}};
const tabs=renderWeatherModule(widget);
assert.match(tabs,/data-weather-view="radar"/);
assert.match(tabs,/data-weather-select="hou"/);
assert.match(tabs,/class="selected" data-weather-view="radar"/);
assert.doesNotMatch(tabs,/<iframe/i,'Iframe must only load after selecting radar');
const radar=weatherRadar(sg);
assert.match(radar,/<iframe/);
assert.match(radar,/overlay=radar/);
assert.match(radar,/product=radar/);
assert.match(radar,/lat=1\.352/);
assert.match(radar,/lon=103\.820/);
assert.match(radar,/Singapore &amp; &lt;Test&gt;/,'City names are HTML-escaped');
assert.doesNotMatch(radar,/Singapore & <Test>/);
const tx=weatherRadar(hou);
assert.match(tx,/lat=29\.760/);
assert.match(tx,/lon=-95\.370/);
assert.match(weatherRadar({...hou,latitude:NaN}),/coordinates are unavailable/);
assert.match(source,/data-weather-radar="\$\{esc\(city\.id\)\}"/,'Now tiles expose per-city radar action');
assert.match(source,/if\(radar\).*?m\.config\.view='radar'/s,'Shortcut selects city and radar view');
assert.match(source,/if\(view==='radar'\)/,'Radar handled without requiring a weather forecast fetch');
assert.match(source,/\['now','hourly','daily','air','radar'\]\.includes\(c\.view\)/,'Saved radar tab is valid');
const manifest=JSON.parse(read('manifest.json'));
assert.equal(manifest.version,'0.10.2');
assert.equal(manifest.host_permissions.some(x=>x.includes('windy.com')),false,'No new host permission should be needed for iframe');
for(const p of ['index.html','sidepanel.html']){
 assert.match(read(p),/v0\.10\.2<\/span>/);
 assert.match(read(p),/OMNIDITE DESK · V0\.10\.2/);
}
assert.match(read('styles.css'),/weather-radar-frame/);
console.log('PASS: V0.10.2 radar tab, city selection, validated coordinates, injection safety and lazy map');
