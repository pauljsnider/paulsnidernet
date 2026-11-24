(function (root) {
    'use strict';
    var DAY = 86400000;
    function dayNumber(value) {
        var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
        if (!match) { return null; }
        var year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
        var date = new Date(Date.UTC(year, month - 1, day));
        if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) { return null; }
        return date.getTime() / DAY;
    }
    function text(feed, now) {
        if (!feed || !Array.isArray(feed.birthdays) || !feed.birthdays.length) { return ''; }
        var generated = new Date(feed.generated_at).getTime();
        if (!isFinite(generated) || now.getTime() - generated > 7 * DAY || generated - now.getTime() > DAY) {
            return 'Birthdays need a refresh';
        }
        // Match the board's device-local day, then compare calendar dates in
        // UTC units. A 23/25-hour DST day must still count as one day.
        var today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / DAY;
        var closest = Infinity, names = [], index, event, day, remaining;
        for (index = 0; index < feed.birthdays.length; index += 1) {
            event = feed.birthdays[index];
            if (!event || typeof event.label !== 'string' || !event.label.trim() || event.label.length > 60) { continue; }
            day = dayNumber(event.date);
            if (day === null) { continue; }
            remaining = day - today;
            if (remaining < 0 || remaining > 366) { continue; }
            if (remaining < closest) { closest = remaining; names = []; }
            if (remaining === closest && names.indexOf(event.label) === -1) { names.push(event.label); }
        }
        if (!names.length) { return ''; }
        var label = names[0] + (names.length > 1 ? ' + ' + (names.length - 1) + ' more' : '');
        return label + (closest === 0 ? ' · Today!' : closest === 1 ? ' · Tomorrow' : ' · ' + closest + ' days');
    }
    var api = { text: text };
    if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
    else { root.KitchenBirthdays = api; }
}(this));
