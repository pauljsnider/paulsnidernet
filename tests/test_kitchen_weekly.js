'use strict';
var assert = require('assert');
var fs = require('fs');
var vm = require('vm');
var contract = require('../family/kitchen-weekly.js');
var feed = {version:1,timezone:'America/Chicago',generated_at:'2026-09-27T15:00:00Z',expires_at:'2026-10-05T05:00:00Z',week_start:'2026-09-28',week_end:'2026-10-05',children:{Madison:[],Will:[],Max:[]}};
var note = {kind:'bring',text:'Bring a library book.',date:'2026-10-02',expires_at:feed.expires_at,source:'School newsletter',source_date:'2026-09-24'};
feed.children.Will.push(note);
assert(contract.validate(feed));
assert.equal(contract.visible(feed,'Will',Date.parse('2026-10-02T12:00:00Z')).length,1);
assert.equal(contract.visible(feed,'Will',Date.parse(feed.expires_at)).length,0);
assert.equal(contract.visible(feed,'Will',Date.parse('2026-09-20T12:00:00Z')).length,0);
['Pay for the trip.','Invoice due','Fee reminder','Account balance','Visit https://example.com','Email teacher@example.com','<img src=x>','Donation requested','Student ID 12345678'].forEach(function(text){assert.equal(contract.safeText(text),false,text);});
note.url='https://example.com';assert.equal(contract.validate(feed),false);delete note.url;
feed.children.Family=[];assert.equal(contract.validate(feed),false);delete feed.children.Family;
assert.deepEqual(contract.eventChildren({source:'TeamSnap Events (Madison + Max + Will)'}),[]);
assert.deepEqual(contract.eventChildren({children:['Will','Max']}),['Will','Max']);
var networkCalls = 0;
var properties = {};
var context = {Utilities:{formatDate:function(d){return d.toISOString().slice(0,10);}},KitchenWeekly:contract,Date:Date,PropertiesService:{getScriptProperties:function(){return{getProperty:function(key){return properties[key]||null;}};}},UrlFetchApp:{fetch:function(){networkCalls++;throw new Error('unexpected network');}}};
vm.createContext(context);vm.runInContext(fs.readFileSync('scripts/apps-script/KitchenExport.js','utf8'),context);
assert.throws(function(){context.publishReviewedKitchenWeekly(feed);});assert.equal(networkCalls,0);
var now = new Date('2026-10-02T12:00:00Z');
function item(child,body,age){return {child:child,from:'Teacher via ParentSquare <teacher@parentsquare.com>',date:new Date(now-age*86400000),cleanBody:body};}
var candidates=context.kitchenSchoolCandidates([item('Will','Math: Number patterns',1),item('HOUSEHOLD_ACTIONS','Math: Number patterns',1),item('Will','Math: Pay $20 for supplies',1),item('Will','Math: Old patterns',10),item('Max','Bring a library book.',1)],now);
assert.equal(candidates.length,2);
var spoof=item('Will','Math: patterns',1);spoof.from='Teacher via ParentSquare <attacker@example.test>';
assert.equal(context.kitchenSchoolCandidates([spoof],now).length,0);
var normalized=item('Will','Math: Number patterns',1); normalized.from='Teacher via ParentSquare'; normalized.sourceFrom='School <teacher@parentsquare.com>';
assert.equal(context.kitchenSchoolCandidates([normalized],now).length,1);
normalized.sourceFrom='attacker@example.test';assert.equal(context.kitchenSchoolCandidates([normalized],now).length,0);
assert.equal(candidates[0].text,'Math: Number patterns');
console.log('Kitchen schema, expiry, finance exclusion, attribution and disabled-publisher tests passed');
var current = JSON.parse(JSON.stringify(feed));
current.generated_at = new Date().toISOString();
current.expires_at = new Date(Date.now()+86400000).toISOString();
current.children = {Madison:[],Will:[],Max:[]};
assert.throws(function(){context.publishReviewedKitchenWeekly(current);},/disabled/);
properties.KITCHEN_PUBLISH_ENABLED='true';
context.Utilities.computeDigest=function(){return [1];};context.Utilities.DigestAlgorithm={SHA_256:'sha'};context.Utilities.Charset={UTF_8:'utf8'};
assert.throws(function(){context.publishReviewedKitchenWeekly(current);},/approval/);
properties.KITCHEN_APPROVED_SHA256='01';
assert.throws(function(){context.publishReviewedKitchenWeekly(current);},/credential missing/);
assert.equal(networkCalls,0);
var requests=[];
properties.KITCHEN_GITHUB_TOKEN='synthetic-test-token';
context.Utilities.base64Encode=function(s){return Buffer.from(s).toString('base64');};
context.UrlFetchApp.fetch=function(url,options){
 requests.push({url:url,method:options.method,body:options.payload?JSON.parse(options.payload):null});
 var status=200,value={};
 if(url.indexOf('/git/ref/heads/kitchen-notes/')!==-1){status=404;}
 else if(url.endsWith('/git/ref/heads/main')){value={object:{sha:'synthetic-main'}};}
 else if(url.endsWith('/git/refs')){status=201;}
 else if(url.indexOf('/contents/')!==-1&&options.method==='get'){status=404;}
 else if(url.indexOf('/contents/')!==-1){status=201;}
 else if(url.indexOf('/pulls?')!==-1){value=[];}
 else if(url.endsWith('/pulls')){status=201;value={html_url:'https://example.test/review/1'};}
 return {getResponseCode:function(){return status;},getContentText:function(){return JSON.stringify(value);}};
};
assert(context.publishReviewedKitchenWeekly(current).prepared);
assert(requests.some(function(r){return r.body&&r.body.draft===true;}));
assert(requests.filter(function(r){return r.method==='put';}).every(function(r){return r.body.branch!=='main';}));
console.log('Approval gate, missing credential, and branch-only draft PR bridge tests passed');
var dense=JSON.parse(JSON.stringify(feed));
dense.children.Will=[];
['learning','bring','reminder','assignment','specials','learning'].forEach(function(kind){var n=JSON.parse(JSON.stringify(note));n.kind=kind;dense.children.Will.push(n);});
assert(contract.validate(dense));
dense.children.Will.push(JSON.parse(JSON.stringify(note)));assert.equal(contract.validate(dense),false);
assert.equal(contract.safeText('A'.repeat(91)),false);
assert(contract.safeEventTitle('A longer public calendar event title '.repeat(3)));
assert.equal(contract.safeEventTitle('School payment due'),false);
console.log('Six school-card density and separate calendar-title contract checks passed');
// Midweek reruns retain the prior Thursday's newsletter for this school week.
var friday=new Date('2026-10-02T12:00:00Z');
var weeklyItem={child:'Will',from:'Teacher via ParentSquare',sourceFrom:'Teacher <school@parentsquare.com>',date:new Date('2026-09-24T20:00:00Z'),cleanBody:'**Next Week\'s Learning:**\n**Math:** We will practice adding two digit numbers this week. We will also estimate totals.\n**Bring Library books on Friday!**'};
var schoolCandidates=context.kitchenSchoolCandidates([weeklyItem],friday);
assert.equal(schoolCandidates.length,2);
assert.equal(schoolCandidates[1].date,'2026-10-02');
assert.equal(context.kitchenSchoolCandidates([weeklyItem],new Date('2026-10-05T12:00:00Z')).length,0);
weeklyItem.cleanBody='Math: Practice addition. Pay a fee for the workbook. '+('More school information. '.repeat(5));
assert.equal(context.kitchenSchoolCandidates([weeklyItem],friday).length,0);
var anchored=JSON.parse(JSON.stringify(feed));anchored.generated_at='2026-10-03T12:00:00Z';
assert(contract.validate(anchored));
anchored.children.Will[0].source_date='2026-09-20';assert.equal(contract.validate(anchored),false);
console.log('School-week source window, complete sentences, dated reminders, and whole-source finance rejection passed');

weeklyItem.cleanBody='**This Week:**\nBring Library books on Friday!';
assert.equal(context.kitchenSchoolCandidates([weeklyItem],friday).length,0);
weeklyItem.cleanBody='Bring Library books on Friday!';
assert.equal(context.kitchenSchoolCandidates([weeklyItem],friday).length,0);
weeklyItem.cleanBody='**Next Week Specials:**\nBring Library books on Friday!';
assert.equal(context.kitchenSchoolCandidates([weeklyItem],friday)[0].date,'2026-10-02');
assert.equal(context.kitchenSchoolCandidates([weeklyItem],new Date('2026-10-04T15:00:00Z')).length,0);
console.log('Relative reminders anchored to source week; ambiguous/prior-week reminders omitted; Sunday rollover checked');

var oldFormatter=context.Utilities.formatDate;
context.Utilities.formatDate=function(d,tz,format){return new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);};
var boundary=item('Will','Math: Number patterns',1);boundary.date=new Date('2026-09-24T04:30:00Z');
assert.equal(context.kitchenSourceEligible(boundary,friday),false);
boundary.date=new Date('2026-09-24T05:30:00Z');assert(context.kitchenSourceEligible(boundary,friday));
assert.equal(context.kitchenWeekStart(new Date('2026-10-04T04:30:00Z')),'2026-09-28');
assert.equal(context.kitchenWeekStart(new Date('2026-10-04T05:30:00Z')),'2026-10-05');
context.Utilities.formatDate=oldFormatter;
console.log('Chicago local-date cutoff and Saturday/Sunday midnight rollover passed');

// Exercise the actual clock callback while a child view is selected, including
// midnight rollover. Child rendering belongs to renderScreen, not a stale local.
var page=fs.readFileSync('family/kitchen.html','utf8');
var callback=page.slice(page.indexOf('            function updateClock()'),page.indexOf('            function renderHero'));
var clockNodes={'clock':{},'date-label':{}},renders=0;
var clockCtx={Date:Date,state:{view:6,visibleDay:'today'},getById:function(id){return clockNodes[id];},formatTime:function(){return '9:00';},formatLongDate:function(){return 'Thursday';},calendarDayKey:function(){return 'today';},renderHero:function(){},renderScreen:function(){renders++;}};
vm.createContext(clockCtx);vm.runInContext(callback,clockCtx);assert.doesNotThrow(function(){clockCtx.updateClock();});assert.equal(clockNodes.clock.textContent,'9:00');
clockCtx.state.visibleDay='yesterday';clockCtx.updateClock();assert.equal(renders,1);
console.log('Live clock callback on child view and midnight rollover passed');

// Complete curriculum headings retain their words, without separator debris.
['-', '–', '—'].forEach(function(separator) {
    weeklyItem.cleanBody='**Amplify: Domain 4: Our Planet Cycles in Nature '+separator+'** '+('A longer lesson description. '.repeat(6));
    assert.equal(context.kitchenSchoolCandidates([weeklyItem],friday)[0].text,'Amplify: Domain 4: Our Planet Cycles in Nature');
});
weeklyItem.cleanBody='**Reading Specialist**';
assert.equal(context.kitchenSchoolCandidates([weeklyItem],friday).length,0);
weeklyItem.cleanBody='Reading: Compare story characters';
assert.equal(context.kitchenSchoolCandidates([weeklyItem],friday)[0].text,weeklyItem.cleanBody);
weeklyItem.cleanBody='**Amplify: Cycles in Nature -** Pay a fee. '+('More information. '.repeat(8));
assert.equal(context.kitchenSchoolCandidates([weeklyItem],friday).length,0);
weeklyItem.cleanBody='**Amplify: '+('A'.repeat(91))+' -** '+('No complete short heading '.repeat(8));
assert.equal(context.kitchenSchoolCandidates([weeklyItem],friday).length,0);
console.log('Curriculum separators, staff roles, complete headings and privacy limits passed');

context.Utilities.formatDate=function(d,tz,format){
    if(format==='Z') {
        var offset=new Intl.DateTimeFormat('en-US',{timeZone:tz,timeZoneName:'shortOffset'}).formatToParts(d).filter(function(p){return p.type==='timeZoneName';})[0].value;
        return offset==='GMT-5'?'-0500':'-0600';
    }
    return new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
};
[['2026-10-25T15:00:00Z','2026-10-26','2026-11-02T06:00:00.000Z'],['2026-11-01T16:00:00Z','2026-11-02','2026-11-09T06:00:00.000Z']].forEach(function(row){
    var simulated=context.prepareKitchenWeeklyExport([],new Date(row[0])).payload;
    assert.equal(simulated.week_start,row[1]);assert.equal(simulated.expires_at,row[2]);
    assert(contract.validate(simulated));
});
assert.equal(context.kitchenSourceEligible(weeklyItem,new Date('2026-11-01T16:00:00Z')),false);
context.Utilities.formatDate=oldFormatter;
console.log('Oct 26 and Nov 2 school weeks, CST expiry, and stale-source exclusion passed');
// Weekly priorities are drawn from attributed source text, not manual data patches.
context.Utilities.formatDate=function(d,z,p){if(p==='Z')return '-0600';return d.toISOString().slice(0,10);};
var tuningNow=new Date('2026-11-08T19:00:00Z');
var priorityItem={child:'Madison',sourceFrom:'teacher@parentsquare.com',date:new Date('2026-11-05T18:00:00Z'),cleanBody:
'## Dates\nMonday, November 9: No School\n## Veterans Day Assembly - Friday, November 13\nPlease wear BLUE clothing.\n## Greek Roots\nNext week, students will complete Greek Roots Unit 8. Sections A - D will be due on Thursday, and we will take our test on Friday.\n## Specials Schedule (11/10 - 11/13)\nTuesday - PE\nWednesday - Library\nThursday - Music\nFriday - Spanish\n## Next Week in Focus\nMath: Multiplication\nScience: Matter\nPhonics: Silent e\nAmplify: Reading\n## Donations\nBring new books to school.'};
var tuned=context.prepareKitchenWeeklyExport([priorityItem],tuningNow).payload;
assert(tuned.children.Madison.some(function(n){return /wear blue/i.test(n.text);}));
assert(tuned.children.Madison.some(function(n){return n.kind==='assignment'&&/test Friday/.test(n.text);}));
assert(tuned.children.Madison.some(function(n){return n.kind==='specials'&&/Library/.test(n.text);}));
assert(!tuned.children.Madison.some(function(n){return /new books/.test(n.text);}));
assert(tuned.children.Madison.length<=6);
var unsafe=Object.assign({},priorityItem,{sourceFrom:'attacker@example.test'});
assert.equal(context.kitchenPriorityCandidates([unsafe],tuningNow).length,0);
assert.equal(context.kitchenPriorityCandidates([priorityItem],new Date('2026-11-15T19:00:00Z')).length,0);
console.log('Dated school priorities, source provenance, expiry and whole-section finance exclusions passed');

var apply=page.slice(page.indexOf('            function applyFeed('),page.indexOf('            function applyPhotoFeed('));
var statusNode={};
var feedCtx={state:{},normaliseEvents:function(e){return e;},relativeFeedTime:function(){return 'Updated now';},getById:function(){return statusNode;},renderScreen:function(){}};
vm.createContext(feedCtx);vm.runInContext(apply,feedCtx);
feedCtx.applyFeed({events:[],complete:false,source_health:[{name:'Indoor soccer',status:'unavailable'}]},false);
assert.match(statusNode.textContent,/Incomplete: Indoor soccer/);
feedCtx.applyFeed({events:[],complete:true,source_health:[{name:'Family',status:'live'}]},true);
assert(!statusNode.textContent.includes('Incomplete'));assert.match(statusNode.textContent,/Offline copy/);
feedCtx.applyFeed({events:[]},false);assert.match(statusNode.textContent,/coverage unverified/);
console.log('Kitchen source degradation and legacy coverage warnings passed');

var weekCode=page.slice(page.indexOf('            function renderWeek('),page.indexOf('            function renderUpcoming('));
function node(tag,cls,text){return {tag:tag,className:cls,textContent:text||'',children:[],appendChild:function(child){this.children.push(child);}};}
var busyEvents=[];var weekNow=new Date(2026,10,8,12);
for(var d=0;d<7;d++)for(var n=0;n<12;n++)busyEvents.push({startDate:new Date(2026,10,8+d,14),summary:'Event '+n});
var weekCtx={Date:Date,createElement:node,visibleEvents:function(){return busyEvents;},isSameDay:function(a,b){return a.toDateString()===b.toDateString();},formatShortDay:function(d){return d.toDateString();},eventTime:function(){return '2 PM';},document:{createTextNode:function(t){return node('text','',t);}}};
vm.createContext(weekCtx);vm.runInContext(weekCode,weekCtx);var content=node('div');weekCtx.renderWeek(content,weekNow);
assert.equal(content.children[1].children.length,7);
content.children[1].children.forEach(function(row){var entries=row.children[1].children;assert.equal(entries.length,4);assert.equal(entries[3].textContent,'+9 more • Full calendar');assert.equal(entries[3].href,'events.html');});
busyEvents=busyEvents.slice(0,4);content=node('div');weekCtx.renderWeek(content,weekNow);assert.equal(content.children[1].children[0].children[1].children.length,4);assert(!content.children[1].children[0].children[1].children.some(function(e){return e.tag==='a';}));
console.log('Busy week bounded layout preserves seven days and explicit hidden-event counts');
