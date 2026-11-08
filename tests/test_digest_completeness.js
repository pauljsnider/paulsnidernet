'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={Date,console,htmlEscape:s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'),detailLinkHtml:()=>'<a>source</a>',stripHtml:s=>s.replace(/<[^>]*>/g,' '),Utilities:{newBlob:s=>({getBytes:()=>Buffer.from(s)}),formatDate(d,z,p){
 if(p==='yyyy-MM-dd') return new Intl.DateTimeFormat('en-CA',{timeZone:z,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
 return new Intl.DateTimeFormat('en-US',{timeZone:z,dateStyle:'medium',timeStyle:'short'}).format(d);
}}};
vm.createContext(context);vm.runInContext(fs.readFileSync('scripts/apps-script/DigestCompleteness.js','utf8'),context);
const now=new Date('2026-11-08T19:00:00Z');
function row(summary,start,end,children=['Will']){return {summary,start,end,children,all_day:false,source:'Family',location:''};}
const feed={timezone:'America/Chicago',generated_at:'2026-11-08T12:00:00Z',events:[
 row('Today soccer','2026-11-08T15:50:00-06:00','2026-11-08T16:40:00-06:00'),
 row('Hockey','2026-11-14T08:00:00-06:00','2026-11-14T08:40:00-06:00'),
 row('Soccer','2026-11-14T08:00:00-06:00','2026-11-14T09:00:00-06:00'),
 row('Earlier','2026-11-08T08:00:00-06:00','2026-11-08T09:00:00-06:00'),
 {summary:'Break',start:'2026-11-07',end:'2026-11-10',all_day:true,children:[]}
]};
const events=context.digestExpandedEvents(feed,now);
assert.equal(events.length,4);assert(!events.some(e=>e.title==='Earlier'));
let rendered=context.digestCalendarHtml(events,now);
assert.match(rendered,/Today soccer/);assert.match(rendered,/Hockey \/ Soccer/);assert.match(rendered,/through 2026-11-09/);
assert.throws(()=>context.digestExpandedEvents({...feed,generated_at:'2026-11-07T00:00:00Z'},now),/stale/);
assert.throws(()=>context.digestExpandedEvents({...feed,events:[{...feed.events[0],start:'nonsense'}]},now),/invalid/);
assert.throws(()=>context.digestExpandedEvents({...feed,events:[{...feed.events[0],end:feed.events[0].start}]},now),/dates/);
assert.equal(context.digestExpandedEvents({...feed,events:[]},now).length,0);
assert.equal(context.digestExpandedEvents({...feed,events:[feed.events[0],feed.events[0]]},now).length,1);
// Explicit offsets survive both DST regimes; no recurrence interpretation in Apps Script.
let dst=context.digestExpandedEvents({...feed,events:[row('Fall','2026-11-08T17:00:00-06:00','2026-11-08T18:00:00-06:00')]},now);
assert.equal(dst[0].when.toISOString(),'2026-11-08T23:00:00.000Z');
const cases=[
 ['n@notifications.seesaw.me','New Message from Miss Moore','multimedia message','Madison'],
 ['n@instructure.com','Sutherland assignment','graded','Will'],
 ['n@dashplatform.com','You have an upcoming game','scheduled Will Snider','SPORTS_CAMPS'],
 ['n@kansascityicecenter.ccsend.com','Earlybird registration','Winter Learn to Play','SPORTS_CAMPS'],
 ['coach@example.test','Kindergarten Basketball','Max Snider jersey','SPORTS_CAMPS'],
 ['n@mailva.evite.com','Your RSVP','You replied Yes','HOUSEHOLD_ACTIONS'],
 ['n@myq.com','Final Reminder','battery needs replaced','HOUSEHOLD_ACTIONS'],
 ['n@yosmart.com','Device Alarm','device offline','HOUSEHOLD_ACTIONS'],
 ['n@bank.example','Transfer canceled','account not active','HOUSEHOLD_ACTIONS'],
 ['n@google.com','Backup payment method used','subscription charged backup payment','HOUSEHOLD_ACTIONS'],
 ['n@evite.com','Gifts for everyone','Shop gifts',''],
 ['n@example.test','Reset your password','account issue',''],
 ['n@notifications.seesaw.me.attacker.test','Newsletter','multimedia','']
];
cases.forEach(([f,s,b,want])=>assert.equal(context.digestAdditionalCategory(f,s,b),want,s));
assert.match(context.digestReadableBody('This email is best viewed in HTML.','<p>multimedia message</p>'),/multimedia/);
assert(!context.digestReadableBody('visit https://example.test/secret','').includes('secret'));
const out=context.completeDigestHtml('<h3>Calendar</h3><table><tr><td>invented</td></tr></table>',[{subject:'School app',cleanBody:'multimedia message',coverageRequired:true}],events,now);
assert(!out.includes('invented'));assert.match(out,/not been opened/);assert.match(out,/Today soccer/);
console.log('Digest calendar validation, offsets, conflicts, routing, unread-content and deterministic coverage passed.');

const degraded=context.digestExpandedEvents({...feed,complete:false,source_health:[{name:'Indoor soccer',status:'unavailable'},{name:'Basketball',status:'cached'}]},now);
assert.match(context.digestCalendarHtml(degraded,now),/Calendar is incomplete/);
assert.match(context.digestCalendarHtml(degraded,now),/cached; live updates unavailable/);
assert.match(context.digestCalendarHtml(events,now),/coverage has not been verified/);
const healthy=context.digestExpandedEvents({...feed,complete:true,source_health:[{name:'Family',status:'live'}]},now);
assert.equal(healthy.sourceWarnings.length,0);
const later=row('Later event','2026-12-01T17:00:00-06:00','2026-12-01T18:00:00-06:00');
const withLater=context.digestExpandedEvents({...feed,events:feed.events.concat([later])},now);
const full=context.completeDigestHtml('<p>Narrative</p>',[],withLater,now);
const email=context.digestEmailHtml(full,[],withLater,now,'https://example.test/document');
assert.match(full,/Later event/);assert(!email.includes('Later event'));
assert.match(email,/42-day calendar/);assert.match(email,/Calendar note/);
assert(!email.includes('<table'));assert(!email.includes('Source email index'));assert(!email.includes('Source excerpt'));
assert.match(email,/Schedule overlaps to check/);assert.match(email,/Hockey \/ Soccer/);
const repeated='<ul><li>No school Monday (S1)</li><li>No school Monday (S2)</li><li>Will library Friday</li><li>Max library Thursday</li></ul>';
const dedup=context.digestDeduplicateNarrative(repeated);
assert.equal((dedup.match(/No school Monday/g)||[]).length,1);
assert.match(dedup,/Will library Friday/);assert.match(dedup,/Max library Thursday/);
const brief=context.digestEmailHtml(repeated+'<!--digest-narrative-end--><p>raw appendix</p>',[],withLater,now,'https://example.test/document');
assert(!brief.includes('raw appendix'));assert.match(brief,/Full details, all sources/);
assert.throws(()=>context.digestEmailHtml('é'.repeat(25000)+'<!--digest-narrative-end-->',[],withLater,now,'https://example.test/document'),/presentation limit/);
console.log('Concise email, exact deduplication, preserved distinct reminders and full-report routing passed.');
const guarded=context.digestNarrativeChecks('<ul><li>Assignment grade: 0.0 out of 0.0.</li><li>Went on a field trip.</li><li>Birthday invitation: RSVP Yes for 1 guest. The party is in 11 days (around Nov 15).</li><li>Test due Thursday.</li></ul>');
assert(!guarded.includes('0.0 out of'));assert.match(guarded,/does not establish an earned grade/);
assert(!guarded.includes('Went on'));assert.match(guarded,/attendance is not verified/);
assert(!guarded.includes('in 11 days'));assert.match(guarded,/Yes RSVP is recorded/);assert.match(guarded,/relative to the source email/);assert.match(guarded,/Test due Thursday/);
assert.match(context.digestNarrativeChecks('<li>Score 8 out of 10</li>'),/8 out of 10/);
console.log('Unscored grades, unsupported attendance, and stale invitation countdown guards passed');
