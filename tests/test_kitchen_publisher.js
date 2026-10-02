'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm');
function exercise(mode){
 const props={KITCHEN_POLICY_VERSION:'school-notes-v1',KITCHEN_PUBLISH_ENABLED:'true',KITCHEN_GITHUB_TOKEN:'synthetic'};
 const calls=[];let released=false, saved=false;
 const payload={version:1,week_start:'2026-09-28',week_end:'2026-10-05',children:{Madison:[],Will:[],Max:[]}};
 if(mode==='disabled')props.KITCHEN_POLICY_VERSION='wrong';
 if(['prior-open','prior-merged'].includes(mode))props.KITCHEN_LAST_SUBMISSION=JSON.stringify({identity:'2026-09-28:hash',number:12});
 if(mode==='unchanged')props.KITCHEN_LAST_PUBLICATION='2026-09-28:hash';
 const c={PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k],setProperty:(k,v)=>{props[k]=v;saved=true;}})},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>released=true})},KitchenWeekly:{validate:()=>mode!=='invalid'},prepareKitchenWeeklyExport:()=>({payload}),kitchenPayloadHash:()=> 'hash',Utilities:{base64Encode:s=>Buffer.from(s).toString('base64'),Charset:{UTF_8:'utf8'},sleep:()=>{}},UrlFetchApp:{fetch:(url,o)=>{
 calls.push({url,o});let code=200,value={};
 if(url.endsWith('/paulsnidernet'))value={full_name:'pauljsnider/paulsnidernet'};
 else if(url.includes('/pulls?'))value=[];
 else if(url.includes('/git/ref/heads/main'))value={object:{sha:'base-sha'}};
 else if(url.includes('/git/ref/heads/kitchen-weekly/'))code=404;
 else if(url.endsWith('/git/refs'))code=201;
 else if(url.includes('/contents/')&&o.method==='get')code=404;
 else if(url.includes('/contents/'))code=201;
 else if(url.endsWith('/pulls')){code=201;value={number:12};}
 else if(url.includes('/files?'))value=[{filename:mode==='extra-file'?'private.txt':'family/kitchen-weekly.json',status:'modified'}];
 else if(url.endsWith('/pulls/12'))value={head:{sha:'tested-sha'},state:'open',merged:mode==='prior-merged'};
 else if(url.includes('/check-runs?')){assert(!o.headers.Authorization);value={total_count:1,check_runs:[{name:'kitchen-validation',app:{slug:'github-actions'},status:'completed',conclusion:mode==='failed-check'?'failure':'success'}]};}
 else if(url.includes('/status?')){assert(!o.headers.Authorization);value={total_count:0};}
 else if(url.endsWith('/merge')){assert.equal(JSON.parse(o.payload).sha,'tested-sha');value={merged:mode!=='merge-denied'};}
 else throw Error('unexpected '+url);
 return {getResponseCode:()=>code,getContentText:()=>JSON.stringify(value)};
 }}};
 vm.createContext(c);vm.runInContext(fs.readFileSync('scripts/apps-script/KitchenWeeklyPublisher.js','utf8'),c);
 if(['invalid'].includes(mode))assert.throws(()=>c.runKitchenWeeklyPublication([],new Date()));
 else {const out=c.runKitchenWeeklyPublication([],new Date());assert.equal(out.status,{disabled:'disabled',unchanged:'unchanged','failed-check':'queued',ok:'queued','prior-open':'queued','prior-merged':'unchanged'}[mode]);}
 assert.equal(saved,['ok','failed-check'].includes(mode));
 if(['disabled','invalid','unchanged','prior-open','prior-merged'].includes(mode))assert(!calls.some(x=>x.o.method!=='get'));
 if(mode!=='disabled')assert(released);
 if(mode==='failed-check'||mode==='extra-file')assert(!calls.some(x=>x.url.endsWith('/merge')));
 assert(!calls.some(x=>x.url.endsWith('/merge')));
 assert(!calls.some(x=>x.o.payload&&JSON.parse(x.o.payload).branch==='main'));
}
['ok','disabled','invalid','unchanged','failed-check','prior-open','prior-merged'].forEach(exercise);
console.log('Weekly policy publisher tests passed: policy gating, queued-only publication, locking, idempotency.');
