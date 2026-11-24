const assert = require('assert');
const b = require('../family/kitchen-birthdays.js');
function text(date, entries, generated) { return b.text({generated_at:generated || date,birthdays:entries},new Date(date)); }
function item(date,label) { return {date:date,label:label||'Example birthday'}; }
assert.equal(text('2026-12-31T12:00:00-06:00',[item('2027-01-01')]),'Example birthday · Tomorrow');
assert.equal(text('2027-03-13T12:00:00-06:00',[item('2027-03-15')]),'Example birthday · 2 days');
assert.equal(text('2027-11-06T12:00:00-05:00',[item('2027-11-08')]),'Example birthday · 2 days');
assert.equal(text('2027-02-09T23:59:00-06:00',[item('2027-02-09')]),'Example birthday · Today!');
assert.equal(text('2027-02-10T00:00:00-06:00',[item('2027-02-09')]),'');
assert.equal(text('2026-11-24T12:00:00-06:00',[item('2027-02-09')]),'Example birthday · 77 days');
assert.equal(text('2026-11-24T12:00:00-06:00',[]),'');
assert.equal(text('2027-02-01T12:00:00-06:00',[item('2027-02-30'),null,item('2027-02-09')]),'Example birthday · 8 days');
assert.equal(text('2027-02-01T12:00:00-06:00',[item('2027-02-09')],'2026-11-24T12:00:00-06:00'),'Birthdays need a refresh');
assert.equal(text('2027-02-01T12:00:00-06:00',[item('2027-02-09'),item('2027-02-09','Other birthday')]),'Example birthday + 1 more · 8 days');
const clock = new Date('2027-02-08T12:00:00-06:00');
const kids = {
    generated_at: clock.toISOString(),
    birthdays: [item('2027-03-17','Robin’s birthday'),item('2027-06-02','Madison’s birthday'),
        item('2027-03-05','Will’s birthday'),item('2027-02-09','Max’s birthday'),item('2027-02-08','Other birthday')]
};
assert.equal(b.text(kids,clock),'Other birthday · Today!');
assert.equal(b.textForChild(kids,clock,'Madison'),'Madison’s birthday · 114 days');
assert.equal(b.textForChild(kids,clock,'Will'),'Will’s birthday · 25 days');
assert.equal(b.textForChild(kids,clock,'Max'),'Max’s birthday · Tomorrow');
assert.equal(b.textForChild(kids,clock,'Robin'),'');
assert.equal(b.textForChild(kids,clock,'constructor'),'');
assert.equal(b.textForChild({generated_at:kids.generated_at,birthdays:[kids.birthdays[0]]},clock,'Max'),'');
assert.equal(b.textForChild({generated_at:'2026-11-24T12:00:00-06:00',birthdays:kids.birthdays},clock,'Max'),'Birthdays need a refresh');
assert.equal(b.textForChild(kids,new Date('2027-02-09T00:00:00-06:00'),'Max'),'Max’s birthday · Today!');
assert.equal(b.textForChild(kids,new Date('2027-02-10T00:00:00-06:00'),'Max'),'');
console.log('Family and per-child countdown cases passed');
const fs=require('fs');
const moduleText=fs.readFileSync('family/kitchen-birthdays.js','utf8');
assert(!/\b(?:const|let|class|async|await|fetch|Promise|XMLHttpRequest)\b|=>|`/.test(moduleText.replace(/\/\/[^\n]*/g,'')));
assert(!/localStorage|sessionStorage|location\.|sendBeacon|\.innerHTML/.test(moduleText));
console.log('ES5 syntax/API and no-storage/no-network static checks passed');
