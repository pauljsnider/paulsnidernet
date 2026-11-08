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
    events.sourceWarnings = !Array.isArray(feed.source_health) || !feed.source_health.length ? ['Source coverage has not been verified'] : feed.source_health.filter(function(s) {
        return s.status !== 'live';
    }).map(function(s) { return String(s.name) + ' (' + (s.status === 'cached' ? 'cached; live updates unavailable' : 'unavailable') + ')'; });
    if (feed.complete !== true && !events.sourceWarnings.length) events.sourceWarnings.push('Source completeness is unverified');
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
    var html = '<h3>Calendar occurrences from available sources</h3><p>America/Chicago. Recurrences and exceptions are expanded by the calendar feed. Calendar entries show scheduled events, not proof of attendance. Feed refreshed ' + htmlEscape(events.generatedAt || '') + '.</p>';
    if (events.sourceWarnings && events.sourceWarnings.length) html += '<p><strong>Calendar is incomplete:</strong> ' + htmlEscape(events.sourceWarnings.join('; ')) + '. Missing events cannot be ruled out.</p>';
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

function digestCoverageHtml(items, excerptLimit) {
    var followups=[];
    items.forEach(function(item,i){
        if(!item.coverageRequired) return;
        var text=item.cleanBody || '';
        var unseen=/multimedia message|view.*message|seesaw updates|recent canvas notifications/i.test(item.subject+' '+text);
        var excerpt=unseen ? 'School-app notice: linked multimedia/assignment details have not been opened. Review the source; no completion or deadline inferred.' :
            'Source excerpt (check later replies/confirmations before acting): '+text.replace(/\s+/g,' ').slice(0,excerptLimit || 600);
        followups.push('<li><strong>'+htmlEscape(item.subject)+'</strong> (S'+(i+1)+') — '+htmlEscape(excerpt)+' '+detailLinkHtml(item)+'</li>');
    });
    return followups.length ? '<h3>Additional inbox coverage / items to verify</h3><p>These source notices are retained even when the narrative omits them. Invitations are not confirmed plans; receipts and replies may resolve earlier requests.</p><ul>'+followups.join('')+'</ul>' : '';
}

function completeDigestHtml(html, items, events, now) {
    // The model supplies narrative only; the complete schedule is rendered from data.
    var narrative=String(html).replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi,'');
    narrative=narrative.replace(/<h[234][^>]*>\s*(?:Upcoming Events Calendar|Upcoming Events|Calendar)\s*<\/h[234]>/gi,'');
    narrative = digestNarrativeChecks(narrative);
    return narrative+'<!--digest-narrative-end-->'+digestCoverageHtml(items)+digestCalendarHtml(events,now);
}

function digestNarrativeChecks(html) {
    return String(html).replace(/<(li|p)\b[^>]*>[\s\S]*?<\/\1>/gi, function(block) {
        var text = block.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
        if (/\b0(?:\.0+)?\s*(?:out of|\/)\s*0(?:\.0+)?\b/.test(text)) {
            return '<li>Canvas sent an unscored assignment notification. This does not establish an earned grade, failure, or missing work; review Canvas for the actual status.</li>';
        }
        if (/\bwent on (?:a |the )?field trip\b/i.test(text)) {
            return '<li>The class newsletter described a field trip; individual attendance is not verified.</li>';
        }
        if (/birthday|invitation|party/i.test(text) && /\b(?:in \d+ days|\d+ days (?:until|away))\b/i.test(text)) {
            var status = /\b(?:RSVP.{0,20}Yes|Yes for \d+ guest)/i.test(text) ? 'A Yes RSVP is recorded; do not RSVP again without checking the source.' : 'An invitation is not proof of attendance or an RSVP.';
            return '<li>Birthday invitation: ' + status + ' Verify the exact date, time, and location in the original invitation. Its countdown was relative to the source email, not today.</li>';
        }
        return block;
    });
}

function digestRenderBrief(data) {
    var sections = [['needsAttention','Needs attention',8],['thisWeek','This week',8],['worthKnowing','Worth knowing',3]];
    var words = 0;
    var html = '<h2>Weekly family brief</h2>';
    sections.forEach(function(section) {
        var bullets = data && data[section[0]];
        if (!Array.isArray(bullets) || bullets.length > section[2]) throw new Error('Brief section exceeds its item limit.');
        if (!bullets.length) return;
        html += '<h3>'+section[1]+'</h3><ul>';
        bullets.forEach(function(text) {
            if (typeof text !== 'string' || !text.trim() || /<[^>]+>/.test(text)) throw new Error('Brief requires plain-text facts.');
            words += text.trim().split(/\s+/).length;
            html += '<li>'+htmlEscape(text)+'</li>';
        });
        html += '</ul>';
    });
    if (words > 650) throw new Error('Brief exceeds 650 words.');
    if (!words) throw new Error('Brief contains no facts.');
    return html;
}

function digestDeduplicateNarrative(html) {
    var seen = {};
    var childContext = '';
    return String(html).replace(/<h[23]\b[^>]*>[\s\S]*?<\/h[23]>|<li\b[^>]*>[\s\S]*?<\/li>/gi, function(block) {
        if (/^<h[23]\b/i.test(block)) {
            var heading = block.replace(/<[^>]*>/g, '').trim();
            childContext = /^(Madison|Will|Max)$/i.test(heading) ? heading.toLowerCase() : '';
            return block;
        }
        // Only exact facts are removed. Different children, dates, times and amounts
        // must remain distinct. Semantic grouping is done by the narrative prompt.
        var key = block.replace(/<[^>]*>/g, ' ').replace(/\(?S\d+(?:\s*,\s*S\d+)*\)?/g, '')
            .replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
        key = childContext + '|' + key;
        if (seen[key]) return '';
        seen[key] = true;
        return block;
    });
}

function digestEmailHtml(fullHtml, items, events, now, docUrl) {
    var narrative = digestDeduplicateNarrative(fullHtml.split('<!--digest-narrative-end-->')[0]);
    // Cite sources where used; do not repeat every source as an email appendix.
    narrative = narrative.replace(/\bS(\d+)\b/g, function(label,number) {
        var item = items[Number(number)-1];
        return item ? detailLinkHtml(item).replace(/>[^<]*<\/a>/, '>'+label+'</a>') : label;
    });
    var link = '<p><a href="' + htmlEscape(docUrl) + '"><strong>Full details, all sources, and 42-day calendar (' + events.length + ' occurrences)</strong></a></p>';
    var warning = events.sourceWarnings && events.sourceWarnings.length ? '<p><strong>Calendar note:</strong> ' + htmlEscape(events.sourceWarnings.join('; ')) + '. Missing events cannot be ruled out.</p>' : '';
    var nearby = events.filter(function(e) { return e.when < new Date(now.getTime() + 7 * 86400000); });
    var calendar = digestCalendarHtml(nearby,now);
    var overlaps = calendar.match(/<h4>Schedule conflicts to check<\/h4><ul>([\s\S]*?)<\/ul>/);
    var conflicts = overlaps ? '<h3>Schedule overlaps to check</h3><ul>'+overlaps[1]+'</ul>' : '';
    var email = narrative + conflicts + '<hr>' + link + warning +
        '<p>Routine schedules, classroom learning, optional opportunities, completed confirmations, and source notices remain in the full report. Linked school-app details are unverified unless explicitly read.</p>';
    if (Utilities.newBlob(email).getBytes().length > 40000) throw new Error('Weekly brief exceeds its presentation limit; full report retained.');
    return email;
}
