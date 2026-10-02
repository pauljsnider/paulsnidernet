'use strict';
const assert=require('assert'),complete=require('../scripts/complete-kitchen-weekly');
async function test(mode){
 let merged=false,built=false,reads=0;
 const run={name:'Kitchen validation',conclusion:'success',event:'pull_request',actor:{login:'pauljsnider'},head_repository:{full_name:'pauljsnider/paulsnidernet'},head_branch:'kitchen-weekly/2026-09-28',head_sha:'verified',id:123,pull_requests:[{number:12}]};
 if(mode==='branch')run.head_branch='other/2026-09-28';
 if(mode==='actor')run.actor.login='stranger';
 const pr={number:12,user:{login:'pauljsnider'},head:{repo:{full_name:'pauljsnider/paulsnidernet'},sha:mode==='race'?'changed':'verified'},changed_files:1,draft:false,state:'open',base:{ref:'main',repo:{full_name:'pauljsnider/paulsnidernet'}}};
 const github={rest:{pulls:{list:async()=>({data:[pr]}),get:async()=>({data:mode==='late-race'&&++reads>1?{...pr,head:{...pr.head,sha:'changed'}}:pr}),listFiles:async()=>({data:[{filename:mode==='extra'?'private.txt':'family/kitchen-weekly.json',status:'modified'}]}),merge:async x=>{assert.equal(x.sha,'verified');merged=true;return{data:{merged:true}};}},repos:{getContent:async()=>({data:{type:'file',size:100,encoding:'base64',content:Buffer.from(JSON.stringify({generated_at:'2026-10-01T00:00:00Z',expires_at:mode==='expired'?'2026-10-01T00:00:00Z':'2026-10-05T05:00:00Z',week_start:'2026-09-28'})).toString('base64')}}),getCombinedStatusForRef:async()=>({data:{total_count:0,statuses:[]}})},checks:{listForRef:async()=>({data:{total_count:1,check_runs:[{name:'kitchen-validation',app:{slug:'github-actions'},details_url:mode==='stale-check'?'https://github.com/pauljsnider/paulsnidernet/actions/runs/122/job/1':'https://github.com/pauljsnider/paulsnidernet/actions/runs/123/job/1',status:'completed',conclusion:mode==='failed'?'failure':'success'}]}})}},request:async()=>built=true};
 const task=()=>complete({github,context:{payload:{workflow_run:run}},core:{notice:()=>{}},schema:{validate:()=>mode!=='finance'},now:Date.parse('2026-10-02T00:00:00Z')});
 if(['extra','expired','failed','finance','stale-check','late-race'].includes(mode))await assert.rejects(task);else await task();
 assert.equal(merged,mode==='ok');assert.equal(built,mode==='ok');
}
(async()=>{for(const mode of ['ok','actor','branch','race','extra','expired','failed','finance','stale-check','late-race'])await test(mode);console.log('Completion boundary tests passed.');})().catch(e=>{console.error(e);process.exit(1);});
