/* Approved policy v1: only bounded finance-free school notes, public paulsnidernet.
 * No trigger creation and no direct main writes. Install alongside KitchenExport
 * and KitchenWeekly; call once with the existing digest's collected items.
 */
var KITCHEN_POLICY_VERSION = 'school-notes-v1';
function runKitchenWeeklyPublication(items, now) {
    var props = PropertiesService.getScriptProperties();
    if (props.getProperty('KITCHEN_POLICY_VERSION') !== KITCHEN_POLICY_VERSION ||
            props.getProperty('KITCHEN_PUBLISH_ENABLED') !== 'true') {
        return { status: 'disabled' };
    }
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(1000)) { return { status: 'busy' }; }
    try {
        var candidate = prepareKitchenWeeklyExport(items, now);
        var payload = candidate.payload;
        if (!KitchenWeekly.validate(payload)) { throw new Error('Policy validation failed'); }
        var token = props.getProperty('KITCHEN_GITHUB_TOKEN');
        if (!token) { throw new Error('Kitchen credential missing'); }
        function request(path, method, body, allowed, publicRead) {
            var options = { method: method, muteHttpExceptions: true, followRedirects: false,
                headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28' } };
            if (body) { options.contentType = 'application/json'; options.payload = JSON.stringify(body); }
            if (publicRead) { delete options.headers.Authorization; }
            var response;
            try { response = UrlFetchApp.fetch('https://api.github.com' + path, options); }
            catch (ignored) { throw new Error('Kitchen transport failed'); }
            if (allowed.indexOf(response.getResponseCode()) === -1) {
                throw new Error('Kitchen request failed (' + response.getResponseCode() + ')');
            }
            return response.getResponseCode() === 404 ? null : JSON.parse(response.getContentText());
        }
        var base = '/repos/pauljsnider/paulsnidernet';
        var repository = request(base, 'get', null, [200]);
        if (repository.full_name !== 'pauljsnider/paulsnidernet') { throw new Error('Unexpected repository'); }
        // Content identity excludes refresh timestamps, so retrying the same notes
        // neither creates another PR nor extends stale notes indefinitely.
        var identity = { version: payload.version, week_start: payload.week_start,
            week_end: payload.week_end, children: payload.children };
        var hash = kitchenPayloadHash(identity);
        var branch = 'kitchen-weekly/' + payload.week_start;
        var prior = props.getProperty('KITCHEN_LAST_SUBMISSION');
        if (prior) {
            var submitted = JSON.parse(prior);
            if (submitted.identity === payload.week_start + ':' + hash) {
                var previous = request(base + '/pulls/' + submitted.number, 'get', null, [200]);
                if (previous.merged) { return { status: 'unchanged', pullRequest: submitted.number }; }
                if (previous.state === 'open') { return { status: 'queued', pullRequest: submitted.number }; }
            }
        }
        if (props.getProperty('KITCHEN_LAST_PUBLICATION') === payload.week_start + ':' + hash) {
            return { status: 'unchanged' };
        }
        var open = request(base + '/pulls?state=open&head=' + encodeURIComponent('pauljsnider:' + branch), 'get', null, [200]);
        var pr = open.length ? open[0] : null;
        var main = request(base + '/git/ref/heads/main', 'get', null, [200]);
        var head = request(base + '/git/ref/heads/' + branch, 'get', null, [200, 404]);
        if (!head) { request(base + '/git/refs', 'post', { ref: 'refs/heads/' + branch, sha: main.object.sha }, [201]); }
        else if (!pr) {
            // Closed/merged weekly branches may be reused; never reset an open PR.
            request(base + '/git/refs/heads/' + branch, 'patch', { sha: main.object.sha, force: true }, [200]);
        }
        var filePath = base + '/contents/family/kitchen-weekly.json';
        var file = request(filePath + '?ref=' + encodeURIComponent(branch), 'get', null, [200, 404]);
        var encoded = Utilities.base64Encode(JSON.stringify(payload, null, 2), Utilities.Charset.UTF_8);
        if (!file || file.content.replace(/\s/g, '') !== encoded) {
            var update = { message: 'Update approved weekly school notes', branch: branch, content: encoded };
            if (file) { update.sha = file.sha; }
            request(filePath, 'put', update, [200, 201]);
        }
        if (!pr) {
            pr = request(base + '/pulls', 'post', { title: 'Weekly kitchen school notes: ' + payload.week_start,
                head: branch, base: 'main', draft: false,
                body: 'Approved school-notes-v1 policy. Only validated bounded child notes; finance and private links excluded. Required checks and branch protections apply.' }, [201]);
        }
        // The trusted workflow_run continuation is the only merger. Avoid racing
        // it or spending the Apps Script execution budget polling CI.
        props.setProperty('KITCHEN_LAST_SUBMISSION', JSON.stringify({
            identity: payload.week_start + ':' + hash, number: pr.number }));
        return { status: 'queued', pullRequest: pr.number, policy: KITCHEN_POLICY_VERSION };
    } finally { lock.releaseLock(); }
}

/* Retry/verification entrypoint: collects school sources and publishes only.
 * Never creates a Doc or sends email; uses the same versioned policy gate.
 */
function runKitchenWeeklyPublicationOnly() {
    var result = runKitchenWeeklyPublication(collectDigestItems(14), new Date());
    Logger.log('Kitchen publication status: ' + result.status);
    return result;
}
