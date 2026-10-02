/* Explicit read-only check. No triggers, endpoints, email, digest or export.
 * Never log tokens, request options, responses or caught exception text.
 */
function kitchenCredentialPreflight() {
    var failed = { success: false, repository: null, permissions: null };
    try {
        var token = PropertiesService.getScriptProperties().getProperty('KITCHEN_GITHUB_TOKEN');
        if (!token) { return failed; }
        var options = {
            method: 'get', muteHttpExceptions: true, followRedirects: false,
            headers: { Authorization: 'Bearer ' + token,
                Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
        };
        var user = UrlFetchApp.fetch('https://api.github.com/user', options);
        if (user.getResponseCode() !== 200 || JSON.parse(user.getContentText()).login !== 'pauljsnider') { return failed; }
        var repo = UrlFetchApp.fetch('https://api.github.com/repos/pauljsnider/paulsnidernet', options);
        if (repo.getResponseCode() !== 200) { return failed; }
        var data = JSON.parse(repo.getContentText());
        if (data.full_name !== 'pauljsnider/paulsnidernet') { return failed; }
        var p = data.permissions || {};
        return { success: true, repository: 'pauljsnider/paulsnidernet',
            permissions: { pull: p.pull === true, push: p.push === true,
                admin: p.admin === true, maintain: p.maintain === true, triage: p.triage === true } };
    } catch (ignored) { return failed; }
}
