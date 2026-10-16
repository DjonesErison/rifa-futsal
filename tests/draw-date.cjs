const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const admin=fs.readFileSync(path.join(root,'admin.html'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const html of [admin,index])for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
function element(){return {disabled:false,value:'',textContent:''}}
test('public date uses calendar format, keeps fallback on invalid data and failure, refreshes every 30s',async()=>{
 const el=element();el.textContent='15/10/2026';let result={data:'2027-01-02'};const calls=[];let interval;
 const context=vm.createContext({document:{getElementById:()=>el,addEventListener:()=>{}},db:{rpc:async name=>{calls.push(name);return result}},console:{warn:()=>{}},setInterval:(fn,ms)=>{interval=ms}});
 const code=index.slice(index.indexOf('async function loadDrawDate'),index.indexOf('const price=10,'));
 vm.runInContext(code,context);await context.loadDrawDate();assert.equal(el.textContent,'02/01/2027');assert.equal(interval,30000);
 for(const data of ['2026-02-30',null,'<script>', '0000-01-01']){result={data};await context.loadDrawDate();assert.equal(el.textContent,'02/01/2027')}
 result={error:new Error('offline')};await context.loadDrawDate();assert.equal(el.textContent,'02/01/2027');assert.ok(calls.every(n=>n==='obter_data_sorteio'));
});
test('admin loads and saves only valid dates, reports denied saves and missing migration',async()=>{
 const els=Object.fromEntries(['drawDateInput','saveDrawDate','drawDateMsg','drawDateForm'].map(id=>[id,element()]));let calls=[];let fail=false;
 const context=vm.createContext({document:{getElementById:id=>els[id]},token:'admin-jwt',rpc:async(name,args)=>{calls.push({name,args});if(fail)throw new Error('denied');return args?args.p_data:'2026-10-15'}});
 vm.runInContext(admin.slice(admin.indexOf('const drawDateInput='),admin.indexOf('async function doLogin')),context);
 await context.loadDrawDate();assert.equal(els.drawDateInput.value,'2026-10-15');assert.equal(els.saveDrawDate.disabled,false);
 els.drawDateInput.value='2028-02-29';await els.drawDateForm.onsubmit({preventDefault(){}});assert.equal(calls.at(-1).args.p_data,'2028-02-29');assert.match(els.drawDateMsg.textContent,/Data salva/);
 const count=calls.length;els.drawDateInput.value='2027-02-29';await els.drawDateForm.onsubmit({preventDefault(){}});assert.equal(calls.length,count);
 fail=true;els.drawDateInput.value='2027-03-01';await els.drawDateForm.onsubmit({preventDefault(){}});assert.match(els.drawDateMsg.textContent,/Não foi possível salvar/);
 await context.loadDrawDate();assert.equal(els.saveDrawDate.disabled,true);
});
test('reservation and payment code is unchanged from parent',()=>{
 const {execFileSync}=require('node:child_process');
 const old=execFileSync('git',['show','df20535:index.html'],{cwd:root,encoding:'utf8'});
 for(const [start,end] of [['const PIX_PAYLOAD','async function loadDrawDate'],['const price=10,','</script></body></html>']]){
 const newEnd=end==='async function loadDrawDate'?index.indexOf(end):index.lastIndexOf(end);
 const oldEnd=end==='async function loadDrawDate'?old.indexOf('const price=10,'):old.lastIndexOf(end);
 // The Supabase initialization preceding the insertion must also remain identical.
 assert.equal(index.slice(index.indexOf(start),newEnd),old.slice(old.indexOf(start),oldEnd));
 }
});
