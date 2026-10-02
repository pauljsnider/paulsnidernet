/* Add alongside verified live Code.js and a copy of family/kitchen-weekly.js.
 * No credentials or private source belongs in this repository.
 * No trigger is installed by this file. Publishing is disabled by default.
 */
function kitchenCredentialPresence() {
    var p = PropertiesService.getScriptProperties();
    return {
        tokenPresent: !!p.getProperty('KITCHEN_GITHUB_TOKEN'),
        publishingEnabled: p.getProperty('KITCHEN_PUBLISH_ENABLED') === 'true',
        reviewedPayloadPresent: !!p.getProperty('KITCHEN_APPROVED_SHA256')
    };
}

function kitchenSourceEligible(item, now) {
    return ['Madison', 'Will', 'Max', 'Schoolwide'].indexOf(item.child) !== -1 &&
        item.date instanceof Date && now - item.date >= 0 && now - item.date <= 7 * 86400000 &&
        /via ParentSquare|@(?:parentsquare\.com|bluevalleyk12\.org)>?$/i.test(item.from || '');
}

/* A private candidate builder, not a public serializer. It excludes household,
 * sports marketing, links, contacts, financial lines and long ambiguous text.
 * Human-reviewed candidate fields are required for the first publication.
 */
function kitchenSchoolCandidates(items, now) {
    var result = [];
    items.forEach(function (item) {
        if (!kitchenSourceEligible(item, now)) { return; }
        var parts = [item.cleanBody || ''];
        (item.smoreDetails || []).forEach(function (detail) {
            if (detail.status === 'OK') { parts.push(detail.fullText || ''); }
        });
        parts.join('\n').split(/\r?\n/).forEach(function (line) {
            // Test original line before stripping markup; never salvage a
            // financial sentence by deleting only its amount/link.
            if (/https?:|@|[$£€¥]|\b(?:pay|paid|payment|fee|cost|price|account|donat|fundrais|checkbook|purchase|venmo|billing)/i.test(line)) { return; }
            var text = line.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/[*_]/g, '').replace(/\s+/g, ' ').trim();
            if (!KitchenWeekly.safeText(text)) { return; }
            var kind = /^(?:Amplify|Math|Science|Phonics|iReady|95%)/i.test(text) ? 'learning' : (/\b(?:bring|return|send)\b.*\b(?:book|snack|water bottle|shoes)\b/i.test(text) ? 'bring' : null);
            if (!kind) { return; }
            result.push({ children: item.child === 'Schoolwide' ? ['Madison', 'Will', 'Max'] : [item.child], kind: kind, text: text,
                source_date: Utilities.formatDate(item.date, 'America/Chicago', 'yyyy-MM-dd') });
        });
    });
    return result;
}

function kitchenPayloadHash(payload) {
    return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(payload), Utilities.Charset.UTF_8)
        .map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
}

/* Explicit call only, once the exact public fields/content have been approved.
 * Fine-grained GitHub credential: selected repository, Contents and Pull requests read/write.
 * GitHub does not offer file-only Contents permission. Never use clasp or gh
 * access tokens here. Do not log payloads, API responses or credentials.
 */
function publishReviewedKitchenWeekly(payload) {
    if (!KitchenWeekly.validate(payload)) { throw new Error('Invalid kitchen payload'); }
    var now = Date.now();
    if (Date.parse(payload.generated_at) > now + 300000 || Date.parse(payload.expires_at) <= now) { throw new Error('Kitchen payload is not current'); }
    var properties = PropertiesService.getScriptProperties();
    if (properties.getProperty('KITCHEN_PUBLISH_ENABLED') !== 'true') { throw new Error('Kitchen publishing is disabled'); }
    if (properties.getProperty('KITCHEN_APPROVED_SHA256') !== kitchenPayloadHash(payload)) { throw new Error('Exact kitchen payload needs approval'); }
    var token = properties.getProperty('KITCHEN_GITHUB_TOKEN');
    if (!token) { throw new Error('Repository-limited kitchen credential missing'); }
    var api = 'https://api.github.com/repos/pauljsnider/paulsnidernet';
    var headers = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    function call(path, method, body, allowed) {
        var options = { method: method, headers: headers, muteHttpExceptions: true };
        if (body) { options.contentType = 'application/json'; options.payload = JSON.stringify(body); }
        var response = UrlFetchApp.fetch(api + path, options);
        if (allowed.indexOf(response.getResponseCode()) === -1) { throw new Error('Kitchen repository request failed (' + response.getResponseCode() + ')'); }
        return response.getResponseCode() === 404 ? null : JSON.parse(response.getContentText());
    }
    var branch = 'kitchen-notes/' + kitchenPayloadHash(payload).slice(0, 16);
    var ref = call('/git/ref/heads/' + branch, 'get', null, [200, 404]);
    if (!ref) {
        var main = call('/git/ref/heads/main', 'get', null, [200]);
        call('/git/refs', 'post', { ref: 'refs/heads/' + branch, sha: main.object.sha }, [201]);
    }
    var path = '/contents/family/kitchen-weekly.json';
    var existing = call(path + '?ref=' + encodeURIComponent(branch), 'get', null, [200, 404]);
    var content = Utilities.base64Encode(JSON.stringify(payload, null, 2), Utilities.Charset.UTF_8);
    if (!existing || existing.content.replace(/\s/g, '') !== content) {
        var body = { message: 'Prepare approved kitchen school notes', branch: branch, content: content };
        if (existing) { body.sha = existing.sha; }
        call(path, 'put', body, [200, 201]);
    }
    var prs = call('/pulls?state=open&head=' + encodeURIComponent('pauljsnider:' + branch), 'get', null, [200]);
    var pr = prs.length ? prs[0] : call('/pulls', 'post', {
        title: 'Approved weekly kitchen school notes', head: branch, base: 'main', draft: true,
        body: 'Exact public payload approved before upload. Schema and finance exclusions validated. Merge only after public-content and deployment review.'
    }, [201]);
    return { prepared: true, pullRequest: pr.html_url };
}

/* Read-only preparer: returns a safe candidate document, never sends or saves it.
 * Called after collectDigestItems(LOOKBACK_DAYS) in a separately reviewed flow.
 * Existing runWeeklySchoolDigestToDoc and its email behavior stay unchanged.
 */
function prepareKitchenWeeklyExport(items, now) {
    var localDay = Utilities.formatDate(now, 'America/Chicago', 'yyyy-MM-dd');
    var day = new Date(localDay + 'T12:00:00Z');
    var weekday = day.getUTCDay();
    // Sunday prepares the coming school week; Mon-Sat retain this school week.
    day.setUTCDate(day.getUTCDate() + (weekday === 0 ? 1 : 1 - weekday));
    var weekStart = day.toISOString().slice(0, 10);
    day.setUTCDate(day.getUTCDate() + 7);
    var weekEnd = day.toISOString().slice(0, 10);
    // Resolve Chicago midnight at the expiry date, including DST transitions.
    var offset = Utilities.formatDate(day, 'America/Chicago', 'Z');
    var expiry = new Date(weekEnd + 'T00:00:00' + offset.slice(0, 3) + ':' + offset.slice(3)).toISOString();
    var payload = { version: 1, timezone: 'America/Chicago', generated_at: now.toISOString(), expires_at: expiry,
        week_start: weekStart, week_end: weekEnd, children: { Madison: [], Will: [], Max: [] } };
    kitchenSchoolCandidates(items, now).forEach(function (candidate) {
        candidate.children.forEach(function (child) {
            var list = payload.children[child];
            if (list.length >= 6 || list.some(function (note) { return note.text === candidate.text; })) { return; }
            list.push({ kind: candidate.kind, text: candidate.text, date: null, expires_at: expiry,
                source: 'School newsletter', source_date: candidate.source_date });
        });
    });
    if (!KitchenWeekly.validate(payload)) { throw new Error('Candidate payload failed validation'); }
    return { payload: payload, approvalHash: kitchenPayloadHash(payload), requiresPublicContentApproval: true };
}

/* Optional, separately invoked draft entrypoint. It reuses the live collector,
 * but never invokes runWeeklySchoolDigestToDoc, sends email or publishes.
 * Deploy and invoke only after access approval; no trigger is created here.
 */
function runKitchenWeeklyDraftCli() {
    return JSON.stringify(prepareKitchenWeeklyExport(collectDigestItems(LOOKBACK_DAYS), new Date()));
}
