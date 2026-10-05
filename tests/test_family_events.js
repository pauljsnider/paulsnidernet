// Exercise the actual page script in several host time zones, without network.
// ICAL_JS_PATH points to the same pinned ical.js asset used by events.html.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

if (!process.env.EVENTS_TEST_ZONE) {
    for (const zone of ['America/Chicago', 'America/Los_Angeles', 'UTC', 'Asia/Tokyo']) {
        const result = spawnSync(process.execPath, [__filename], {
            env: { ...process.env, TZ: zone, EVENTS_TEST_ZONE: zone }, encoding: 'utf8'
        });
        process.stdout.write(result.stdout);
        process.stderr.write(result.stderr);
        assert.equal(result.status, 0, zone);
    }
    process.exit(0);
}

const html = fs.readFileSync(path.join(__dirname, '../family/events.html'), 'utf8');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
let clock = new Date(2026, 9, 5, 12).getTime();
class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [clock])); }
    static now() { return clock; }
}
const elements = new Map();
function element(key) {
    if (!elements.has(key)) elements.set(key, {
        innerHTML: '', style: {}, checked: true,
        classList: { add() {}, remove() {}, toggle() {} }
    });
    return elements.get(key);
}
const document = {
    getElementById: element,
    querySelector: element,
    querySelectorAll: () => [],
    addEventListener() {},
    createElement() {
        return {
            set textContent(value) { this.innerHTML = String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
        };
    }
};
const ctx = vm.createContext({ Date: ClockDate, document, window: { addEventListener() {} }, console });
vm.runInContext(script, ctx);
const run = code => vm.runInContext(code, ctx);
const ics = body => 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\n' + body.replace(/\n/g, '\r\n') + '\r\nEND:VCALENDAR\r\n';
const tournament = ics(`BEGIN:VEVENT
UID:all-day-tournament
SUMMARY:Will Baseball: Mustangs (Moss) @ TBD
DTSTART;VALUE=DATE:20261016
DTEND;VALUE=DATE:20261019
X-SOURCE-CALENDAR:Will Baseball
END:VEVENT
BEGIN:VEVENT
UID:timed-game
SUMMARY:Will Baseball: Timed game
DTSTART:20261017T230000Z
DTEND:20261018T010000Z
X-SOURCE-CALENDAR:Will Baseball
END:VEVENT`);
ctx.feed = tournament;

// Reproduce Calendar -> Compact/Detailed showing an obsolete Next Week list.
run('allLoadedEvents = parseICalData(feed, "Will Baseball", "combined"); renderCalendar = function () {}; updateEventDisplay();');
assert(!element('events-container').innerHTML.includes('Mustangs'));
run('setView("calendar"); setView("compact");');
assert(element('events-container').innerHTML.includes('Mustangs'), 'Compact must render the current filter after returning from Calendar');
const compactHtml = element('events-container').innerHTML;
assert(compactHtml.includes('October 16, 2026') && compactHtml.includes('October 18, 2026'), 'Show the inclusive all-day range');
assert(!compactHtml.includes('October 19, 2026'), 'Do not display the exclusive DTEND');
assert(compactHtml.includes('All day') && compactHtml.includes('Timed game'));
run('setView("detailed");');
assert.equal(element('events-container').innerHTML.replace('event-grid', 'event-grid compact'), compactHtml);

// Keep ongoing date-only spans, but exclude the exclusive end and past events.
clock = new Date(2026, 9, 17, 12).getTime();
for (const parser of ['parseBasicICalData', 'parseICalDataWithIcalJs']) {
    if (parser === 'parseICalDataWithIcalJs') {
        assert(process.env.ICAL_JS_PATH, 'Set ICAL_JS_PATH to the pinned ical.js 2.2.1 asset');
        ctx.ICAL = require(path.resolve(process.env.ICAL_JS_PATH));
    }
    ctx.parser = parser;
    run('allLoadedEvents = globalThis[parser](feed, "Will Baseball", "combined");');
    for (const filter of ['week', 'month', 'quarter', 'all']) {
        assert(run(`applyTimeFilter(allLoadedEvents, "${filter}").some(e => e.uid === "all-day-tournament")`), parser + ': ongoing span');
    }
    for (const day of [16, 17, 18]) assert(run(`getEventsForDate(new Date(2026, 9, ${day})).some(e => e.uid === "all-day-tournament")`));
    assert(!run('getEventsForDate(new Date(2026, 9, 19)).some(e => e.uid === "all-day-tournament")'));
    assert.equal(run('allLoadedEvents.find(e => e.uid === "all-day-tournament").dtstart.getDate()'), 16);
    assert.equal(run('allLoadedEvents.find(e => e.uid === "timed-game").dtstart.toISOString()'), '2026-10-17T23:00:00.000Z');

    ctx.single = ics(`BEGIN:VEVENT
UID:no-end
SUMMARY:One-day event
DTSTART;VALUE=DATE:20261017
END:VEVENT`);
    assert.equal(run('globalThis[parser](single, "Family Email Events", "combined").length'), 1, parser + ': no-DTEND date stays visible all day');
    clock = new Date(2026, 9, 18).getTime();
    assert.equal(run('globalThis[parser](single, "Family Email Events", "combined").length'), 0);
    clock = new Date(2026, 9, 19).getTime();
    assert(!run('globalThis[parser](feed, "Will Baseball", "combined").some(e => e.uid === "all-day-tournament")'));
    clock = new Date(2026, 9, 17, 12).getTime();
}

// Calendar-day arithmetic, not 24-hour subtraction, across both DST changes.
for (const [month, start, end] of [[2, 7, 10], [9, 31, 34]]) {
    ctx.span = { dtstart: new Date(2026, month, start), dtend: new Date(2026, month, end), allDay: true };
    assert.equal(run('getAllDayEnd(span).getDate()'), new Date(2026, month, end).getDate());
    assert(run('formatEventDate(span)').includes(new Date(2026, month, end - 1).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })));
}
console.log('Family calendar view, all-day interval, parser and timezone tests passed:', process.env.TZ);
