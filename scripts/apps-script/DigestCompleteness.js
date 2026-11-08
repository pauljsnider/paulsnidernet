/* Private digest adapter. No private messages, credentials, or recipients here.
 * Uses the existing public recurrence-expanded feed; never publishes email data.
 */
var DIGEST_CALENDAR_URL = 'https://paulsnider.net/family/kitchen-events.json';

function digestExtraQueries() {
    return [
        '(from:notifications.seesaw.me OR from:notifications@instructure.com OR from:evite.com OR from:dashplatform.com OR from:kansascityicecenter.ccsend.com OR from:notifications.gc.com)',
        '(subject:basketball OR subject:gymnastics OR subject:clinic OR subject:birthday OR subject:RSVP OR subject:invitation)',
        '(from:notification@myq.com OR from:no-reply@yosmart.com OR from:googleplay-noreply@google.com OR from:cacu.com OR from:info6.citi.com OR from:notify.cloudflare.com)',
        '(subject:"immediate attention" OR subject:"has been canceled" OR subject:"payment method" OR subject:"issue with your" OR subject:"security alert" OR subject:"unresolved security" OR subject:"Time to Schedule" OR subject:"ready for pickup" OR subject:"Problem during shipping")'
    ];
}

function digestSenderDomain(from) {
    var matches = String(from || '').toLowerCase().match(/[^\s<>]+@([a-z0-9.-]+)/g) || [];
    return matches.length ? matches[matches.length - 1].split('@')[1] : '';
}

function digestAdditionalCategory(from, subject, body) {
    var domain = digestSenderDomain(from);
    var text = (String(subject || '') + '\n' + String(body || '')).toLowerCase();
    if (/verification code|one.time (?:code|password)|reset (?:your )?password/i.test(subject || '')) return '';
    if (domain === 'notifications.seesaw.me' || domain === 'instructure.com') {
        if (/moore|madison/.test(text)) return 'Madison';
        if (/sutherland|will snider/.test(text)) return 'Will';
        if (/puccetti|max snider/.test(text)) return 'Max';
        return 'Schoolwide';
    }
    if (/(^|\.)evite\.com$/.test(domain)) {
        // Exclude gift advertisements and platform marketing without an invitation.
        return /invited you|your rsvp|replied yes|rsvp to|turning \d|birthday party/.test(text) ? 'HOUSEHOLD_ACTIONS' : '';
    }
    if (domain === 'dashplatform.com' && /scheduled|upcoming game/.test(text)) return 'SPORTS_CAMPS';
    if (domain === 'kansascityicecenter.ccsend.com' && /learn to play|registration/.test(text)) return 'SPORTS_CAMPS';
    if (domain === 'notifications.gc.com' && /follow|join|schedule|game|practice/.test(text)) return 'SPORTS_CAMPS';
    if (/kindergarten basketball|footloose clinic/i.test(subject || '') && /max snider|madison|jersey|registration/.test(text)) return 'SPORTS_CAMPS';
    if (domain === 'myq.com' && /battery|offline|alert/.test(text)) return 'HOUSEHOLD_ACTIONS';
    if (domain === 'yosmart.com' && /offline|alarm|leak|battery/.test(text)) return 'HOUSEHOLD_ACTIONS';
    if (/payment|subscription|transfer|account|bank|billing|card/.test(text) &&
        /unavailable|cancell?ed|not active|backup payment|weren.t able|immediate attention|issue with your|threshold|failed|declined/.test(text)) return 'HOUSEHOLD_ACTIONS';
    if (/security alert|unresolved security risks|declare your trader status|time to schedule|ready for pickup|problem during shipping/i.test(subject || '')) return 'HOUSEHOLD_ACTIONS';
    return '';
}

function digestReadableBody(plain, html) {
    var text = String(plain || '');
    if (!text.trim() || /^(?:this email is best viewed in html\.?|view (?:this )?email in (?:your )?browser)\s*$/i.test(text.trim())) {
        text = stripHtml(String(html || ''));
    }
    // Remove tracking URLs from plain-text source excerpts, not email detail links.
    return text.replace(/https?:\/\/[^\s<>]+/g, '[link]').replace(/&nbsp;|&#160;/g, ' ').trim();
}

function digestExpandedEvents(feed, now) {
    var generated = Date.parse(feed && feed.generated_at);
    if (!feed || feed.timezone !== 'America/Chicago' || !Array.isArray(feed.events) ||
            !isFinite(generated) || generated > now.getTime() + 300000 || now.getTime() - generated > 18 * 3600000) {
        throw new Error('Expanded calendar is missing, invalid, or stale; no complete digest sent.');
    }
    var today = Utilities.formatDate(now, 'America/Chicago', 'yyyy-MM-dd');
    var horizon = new Date(now.getTime() + 42 * 86400000);
    var seen = {};
    var events = [];
    feed.events.forEach(function (row) {
        if (!row || typeof row.summary !== 'string' || !row.summary.trim() || typeof row.all_day !== 'boolean' ||
                !Array.isArray(row.children) || row.children.some(function (c) { return ['Madison','Will','Max'].indexOf(c) < 0; }) ||
                !(row.all_day ? /^\d{4}-\d{2}-\d{2}$/.test(row.start) && /^\d{4}-\d{2}-\d{2}$/.test(row.end) :
                  /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(row.start) && /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(row.end))) {
            throw new Error('Expanded calendar contains an invalid occurrence.');
        }
        var start = new Date(row.start + (row.all_day ? 'T12:00:00Z' : ''));
        var end = new Date(row.end + (row.all_day ? 'T12:00:00Z' : ''));
        if (!isFinite(start.getTime()) || !isFinite(end.getTime()) || end <= start) throw new Error('Invalid calendar dates.');
        if (start >= horizon || (row.all_day ? row.end <= today : end <= now)) return;
        var key = [row.summary, row.start, row.end, row.children.join(',')].join('|');
        if (seen[key]) return;
        seen[key] = true;
        events.push({when:start,end:end,allDay:row.all_day,title:row.summary,location:row.location || '',
            description:'',source:row.source || 'Family calendar',children:row.children.slice(),
            child:row.children.length ? row.children.join(', ') : 'Paul / Household',date:row.start.slice(0,10)});
    });
    events.sort(function(a,b){return a.when-b.when || a.title.localeCompare(b.title);});
    events.generatedAt = feed.generated_at;
    return events;
}

function getDigestExpandedCalendar(now) {
    var response;
    try { response = UrlFetchApp.fetch(DIGEST_CALENDAR_URL + '?digest=' + now.getTime(), {muteHttpExceptions:true}); }
    catch (ignored) { throw new Error('Expanded calendar could not be loaded.'); }
    if (response.getResponseCode() !== 200) throw new Error('Expanded calendar request failed.');
    var feed;
    try { feed = JSON.parse(response.getContentText()); }
    catch (ignored) { throw new Error('Expanded calendar response is invalid.'); }
    var events = digestExpandedEvents(feed, now);
    Logger.log('Expanded calendar validated: ' + events.length + ' upcoming occurrences.');
    return events;
}

function digestCalendarHtml(events, now) {
    var html = '<h3>Verified calendar occurrences</h3><p>America/Chicago. Recurrences and exceptions are expanded by the calendar feed. Calendar entries show scheduled events, not proof of attendance. Feed refreshed ' + htmlEscape(events.generatedAt || '') + '.</p>';
    var conflicts = [];
    for (var i=0;i<events.length;i++) {
        var a=events[i]; if(a.allDay) continue;
        for(var j=i+1;j<events.length;j++) {
            var b=events[j]; if(b.when>=a.end) break;
            if(b.allDay || b.end<=a.when || a.title===b.title) continue;
            var shared=a.children.filter(function(c){return b.children.indexOf(c)>=0;});
            if(shared.length) conflicts.push(shared.join(', ')+': '+a.title+' / '+b.title+' — '+Utilities.formatDate(b.when,'America/Chicago','EEE, MMM d h:mm a'));
        }
    }
    if(conflicts.length) html+='<h4>Schedule conflicts to check</h4><ul>'+conflicts.map(function(c){return '<li>'+htmlEscape(c)+'</li>';}).join('')+'</ul>';
    html+='<table border="1" cellpadding="5" style="border-collapse:collapse"><tr><th>Date</th><th>Time</th><th>Child</th><th>Activity / location</th></tr>';
    events.forEach(function(e){
        var day=e.allDay ? e.date : Utilities.formatDate(e.when,'America/Chicago','EEE, MMM d');
        var time=e.allDay ? 'Date only' : Utilities.formatDate(e.when,'America/Chicago','h:mm a')+'–'+Utilities.formatDate(e.end,'America/Chicago','h:mm a');
        if(e.allDay && (e.end-e.when)>86400000) day+=' through '+new Date(e.end.getTime()-86400000).toISOString().slice(0,10);
        html+='<tr><td>'+htmlEscape(day)+'</td><td>'+htmlEscape(time)+'</td><td>'+htmlEscape(e.child)+'</td><td>'+htmlEscape(e.title)+(e.location?' — '+htmlEscape(e.location):'')+'</td></tr>';
    });
    return html+'</table>';
}

function digestCoverageHtml(items) {
    var followups=[];
    items.forEach(function(item,i){
        if(!item.coverageRequired) return;
        var text=item.cleanBody || '';
        var unseen=/multimedia message|view.*message|seesaw updates|recent canvas notifications/i.test(item.subject+' '+text);
        var excerpt=unseen ? 'School-app notice: linked multimedia/assignment details have not been opened. Review the source; no completion or deadline inferred.' :
            'Source excerpt (reported at receipt; check later replies/confirmations before acting): '+text.replace(/\s+/g,' ').slice(0,600);
        followups.push('<li><strong>'+htmlEscape(item.subject)+'</strong> (S'+(i+1)+') — '+htmlEscape(excerpt)+' '+detailLinkHtml(item)+'</li>');
    });
    return followups.length ? '<h3>Additional inbox coverage / items to verify</h3><p>These source notices are retained even when the narrative omits them. Invitations are not confirmed plans; receipts and replies may resolve earlier requests.</p><ul>'+followups.join('')+'</ul>' : '';
}

function completeDigestHtml(html, items, events, now) {
    // The model supplies narrative only; the complete schedule is rendered from data.
    var narrative=String(html).replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi,'');
    narrative=narrative.replace(/<h[234][^>]*>\s*(?:Upcoming Events Calendar|Upcoming Events|Calendar)\s*<\/h[234]>/gi,'');
    return narrative+digestCoverageHtml(items)+digestCalendarHtml(events,now);
}
