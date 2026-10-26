'use strict';
const assert=require('assert'),complete=require('../scripts/complete-kitchen-weekly');
async function test(mode){
 let merged=false,built=false,reads=0,originReads=0;
 const subprocessMode=mode==='subprocess-actor'||mode==='subprocess-rerun';
 let cleanup=()=>{},verifySubprocess=()=>{};
 if(subprocessMode){
  const fs=require('fs'),os=require('os'),path=require('path');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kitchen-origin-'));
  const oldHome=process.env.HOME,oldPath=process.env.PATH;
  const paul={login:'pauljsnider',id:211066188,type:'User'},outside={login:'outsider',id:7,type:'User'};
  const result={actor:mode==='subprocess-actor'?outside:paul,triggering_actor:mode==='subprocess-rerun'?outside:paul,head_sha:'a'.repeat(40)};
  fs.writeFileSync(path.join(dir,'gh'),`#!/bin/sh\n[ "$1" = api ] && [ "$2" = repos/pauljsnider/paulsnidernet/actions/runs/123 ] || exit 99\nprintf '%s\\n' '${JSON.stringify(result)}'\n`,{mode:0o700});
  process.env.HOME=dir;process.env.PATH=dir+path.delimiter+oldPath;
  verifySubprocess=()=>{const outbox=path.join(dir,'.local/state/paul-bot1/origin');const alerts=fs.readdirSync(outbox).filter(x=>x.startsWith('alert-'));assert.equal(alerts.length,1);assert.match(fs.readFileSync(path.join(outbox,alerts[0]),'utf8'),/outside-workflow-actor/);};
  cleanup=()=>{process.env.HOME=oldHome;process.env.PATH=oldPath;fs.rmSync(dir,{recursive:true,force:true});};
 }
 const run={name:'Kitchen validation',conclusion:'success',event:'pull_request',actor:{login:'pauljsnider',id:211066188,type:'User'},head_repository:{full_name:'pauljsnider/paulsnidernet'},head_branch:'kitchen-weekly/2026-09-28',head_sha:'verified',id:123,pull_requests:[{number:12}]};
 if(mode==='branch')run.head_branch='other/2026-09-28';
 if(mode==='actor')run.actor.login='stranger';
 if(mode==='actor-id')run.actor.id=7;
 const pr={number:12,user:{login:'pauljsnider',id:211066188,type:'User'},head:{repo:{full_name:'pauljsnider/paulsnidernet'},sha:mode==='race'?'changed':'verified'},changed_files:1,draft:false,state:'open',base:{ref:'main',repo:{full_name:'pauljsnider/paulsnidernet'}}};
 if(subprocessMode){run.head_sha='a'.repeat(40);pr.head.sha=run.head_sha;}
 if(mode==='author-id')pr.user.id=7;
 const github={rest:{pulls:{list:async()=>({data:[pr]}),get:async()=>({data:mode==='late-race'&&++reads>1?{...pr,head:{...pr.head,sha:'changed'}}:pr}),listFiles:async()=>({data:[{filename:mode==='extra'?'private.txt':'family/kitchen-weekly.json',status:'modified'}]}),merge:async x=>{assert.equal(x.sha,'verified');merged=true;return{data:{merged:true}};}},repos:{getContent:async()=>({data:{type:'file',size:100,encoding:'base64',content:Buffer.from(JSON.stringify({generated_at:'2026-10-01T00:00:00Z',expires_at:mode==='expired'?'2026-10-01T00:00:00Z':'2026-10-05T05:00:00Z',week_start:'2026-09-28'})).toString('base64')}}),getCombinedStatusForRef:async()=>({data:{total_count:0,statuses:[]}})},checks:{listForRef:async()=>({data:{total_count:1,check_runs:[{name:'kitchen-validation',app:{slug:'github-actions'},details_url:mode==='stale-check'?'https://github.com/pauljsnider/paulsnidernet/actions/runs/122/job/1':'https://github.com/pauljsnider/paulsnidernet/actions/runs/123/job/1',status:'completed',conclusion:mode==='failed'?'failure':'success'}]}})}},request:async()=>built=true};
 const task=()=>complete({github,context:{payload:{workflow_run:run}},core:{notice:()=>{}},schema:{validate:()=>mode!=='finance'},now:Date.parse('2026-10-02T00:00:00Z'),originCheck:subprocessMode?undefined:async x=>{originReads++;assert.equal(x.repo,'pauljsnider/paulsnidernet');assert.equal(x.number,12);assert.equal(x.run,123);if(mode==='origin-entry'||(mode==='origin-final'&&originReads===2))throw Error('origin blocked');}});
 try {
 if(subprocessMode){await assert.rejects(task);verifySubprocess();}
 else if(['extra','expired','failed','finance','stale-check','late-race','origin-entry','origin-final'].includes(mode))await assert.rejects(task);else await task();
 assert.equal(merged,mode==='ok');assert.equal(built,mode==='ok');if(mode==='ok')assert.equal(originReads,2);
 }finally{cleanup();}
}
(async()=>{for(const mode of ['ok','actor','branch','race','extra','expired','failed','finance','stale-check','late-race','actor-id','author-id','origin-entry','origin-final','subprocess-actor','subprocess-rerun'])await test(mode);console.log('Completion boundary tests passed.');})().catch(e=>{console.error(e);process.exit(1);});
