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
function item(child,body,age){return {child:child,from:'Teacher via ParentSquare',date:new Date(now-age*86400000),cleanBody:body};}
var candidates=context.kitchenSchoolCandidates([item('Will','Math: Number patterns',1),item('HOUSEHOLD_ACTIONS','Math: Number patterns',1),item('Will','Math: Pay $20 for supplies',1),item('Will','Math: Old patterns',10),item('Max','Bring a library book.',1)],now);
assert.equal(candidates.length,2);
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
