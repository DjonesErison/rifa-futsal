const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const source=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n');
function setup({data,error,missingSDK=false,reject=false}={}){
 const elements=new Map();
 function element(){const classes=new Set();return {disabled:false,dataset:{},textContent:'',value:'',classList:{add:(...x)=>x.forEach(v=>classes.add(v)),remove:(...x)=>x.forEach(v=>classes.delete(v)),contains:x=>classes.has(x),toggle:x=>classes.has(x)?classes.delete(x):classes.add(x)},appendChild(){},setAttribute(){},scrollIntoView(){}}}
 const db={rpc(){throw Error('Unexpected write RPC')},from(){return {select(){return {order:async()=>{if(reject)throw Error('network');return {data,error}}}}}}};
 const context=vm.createContext({document:{getElementById:id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id)},createElement:element},window:missingSDK?{}:{supabase:{createClient:()=>db}},console:{error(){}},setInterval(){},setTimeout(){},alert(){},navigator:{}});
 vm.runInContext(source,context);
 return {context,elements,run:s=>vm.runInContext(s,context)};
}
const rows=()=>Array.from({length:500},(_,i)=>({numero:i+1,status:i===0?'pago':i===1?'reservado':'disponivel'}));
test('complete snapshot preserves paid/reserved and permits available selection',async()=>{
 const x=setup({data:rows()});await new Promise(setImmediate);
 assert.equal(x.run('statusReady'),true);
 assert.equal(x.run('buttons.get(1).disabled && buttons.get(1).classList.contains("paid")'),true);
 assert.equal(x.run('buttons.get(2).disabled && buttons.get(2).classList.contains("reserved")'),true);
 x.run('toggleNumber(3,buttons.get(3))');assert.equal(x.run('chosen.has(3)'),true);
});
for(const [name,options] of Object.entries({empty:{data:[]},partial:{data:rows().slice(1)},duplicate:{data:rows().map((r,i)=>i===499?{...r,numero:1}:r)},unknown:{data:rows().map((r,i)=>i===0?{...r,status:'paid'}:r)},apiError:{error:{message:'denied'}},network:{reject:true},cdn:{missingSDK:true}})){
 test(name+' blocks all numbers and reservation',async()=>{const x=setup(options);await new Promise(setImmediate);assert.equal(x.run('statusReady'),false);assert.equal(x.run('[...buttons.values()].every(b=>b.disabled)'),true);assert.equal(x.elements.get('reserveBtn').disabled,true);assert.match(x.elements.get('statusMessage').textContent,/Não foi possível/);});
}
test('failed refresh retains paid state, blocks selection and can recover',async()=>{
 const data=rows(),x=setup({data});await new Promise(setImmediate);
 x.run('toggleNumber(3,buttons.get(3))');data.pop();await x.run('loadStatus()');
 assert.equal(x.run('chosen.size'),0);assert.equal(x.run('buttons.get(1).classList.contains("paid")'),true);
 data.push({numero:500,status:'disponivel'});await x.run('loadStatus()');assert.equal(x.run('statusReady'),true);
});
test('page loads never invoke expiration RPC',()=>{for(const f of ['index.html','admin.html'])assert.equal(fs.readFileSync(f,'utf8').includes('liberar_reservas_vencidas'),false)});
test('both inline scripts parse',()=>{for(const f of ['index.html','admin.html'])for(const m of fs.readFileSync(f,'utf8').matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(m[1])});
