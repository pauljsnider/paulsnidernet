/* Shared ES5 contract. Also copied to Apps Script as KitchenWeekly.js. */
var KitchenWeekly = (function () {
    'use strict';
    var names = ['Madison', 'Will', 'Max'];
    var blocked = /[$£€¥@<>]|https?:|www\.|mailto:|\b(?:pay(?:ing|ments?)?|paid|prices?|costs?|fees?|fundrais\w*|donat\w*|invoices?|bills?|billing|banks?|accounts?|balances?|budgets?|statements?|credit|debit|venmo|paypal|cash|checkbooks?|purchas\w*|buy|orders?|passwords?|tokens?|diagnosis|medication|therapy|grade report|student id|usd|gbp|eur|dollars?|tuition|receipts?)\b/i;
    function keys(value, expected) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) { return false; }
        return Object.keys(value).sort().join(',') === expected.slice().sort().join(',');
    }
    function day(value) {
        return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
            !isNaN(Date.parse(value + 'T12:00:00Z')) && new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value;
    }
    function instant(value) {
        return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) && !isNaN(Date.parse(value));
    }
    function safeText(value) {
        return typeof value === 'string' && value.length > 0 && value.length <= 110 &&
            !blocked.test(value) && !/[\r\n\x00-\x1f]|\d{5,}/.test(value);
    }
    function validate(feed) {
        if (!keys(feed, ['version', 'timezone', 'generated_at', 'expires_at', 'week_start', 'week_end', 'children']) ||
            feed.version !== 1 || feed.timezone !== 'America/Chicago' ||
            !instant(feed.generated_at) || !instant(feed.expires_at) ||
            !day(feed.week_start) || !day(feed.week_end) ||
            Date.parse(feed.week_end) - Date.parse(feed.week_start) !== 7 * 86400000 ||
            Date.parse(feed.expires_at) <= Date.parse(feed.generated_at) ||
            Date.parse(feed.expires_at) - Date.parse(feed.generated_at) > 8 * 86400000 ||
            !keys(feed.children, names)) { return false; }
        var i, j, notes, note;
        for (i = 0; i < names.length; i += 1) {
            notes = feed.children[names[i]];
            if (!Array.isArray(notes) || notes.length > 3) { return false; }
            for (j = 0; j < notes.length; j += 1) {
                note = notes[j];
                if (!keys(note, ['kind', 'text', 'date', 'expires_at', 'source', 'source_date']) ||
                    ['learning', 'bring', 'reminder'].indexOf(note.kind) === -1 || !safeText(note.text) ||
                    (note.date !== null && (!day(note.date) || note.date < feed.week_start || note.date >= feed.week_end)) || !day(note.source_date) ||
                    Date.parse(feed.generated_at) - Date.parse(note.source_date + 'T00:00:00Z') > 8 * 86400000 ||
                    Date.parse(note.source_date + 'T00:00:00Z') > Date.parse(feed.generated_at) ||
                    !instant(note.expires_at) || Date.parse(note.expires_at) > Date.parse(feed.expires_at) ||
                    Date.parse(note.expires_at) <= Date.parse(feed.generated_at) ||
                    note.source !== 'School newsletter') { return false; }
            }
        }
        return true;
    }
    function visible(feed, child, now) {
        if (!validate(feed) || names.indexOf(child) === -1 || Date.parse(feed.generated_at) > now + 300000 ||
            Date.parse(feed.expires_at) <= now) { return []; }
        return feed.children[child].filter(function (note) { return Date.parse(note.expires_at) > now; });
    }
    function eventChildren(event) {
        if (!Array.isArray(event.children)) { return []; }
        return names.filter(function (name) { return event.children.indexOf(name) !== -1; });
    }
    return { validate: validate, visible: visible, safeText: safeText, eventChildren: eventChildren };
}());
if (typeof module !== 'undefined') { module.exports = KitchenWeekly; }
