#!/usr/bin/env python3
"""Mandatory origin authorization. No environment/label/controller-mode overrides.
State belongs to the controller, outside every agent sandbox. Never copy it into a
checkout. GitHub identity and source data are refreshed on every check.
"""
import argparse
from datetime import datetime, timezone
import fcntl
import hashlib
import html
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import time
import urllib.request

# Verified with GitHub REST users endpoints on 2026-10-23. Ownership of the
# dedicated allplays-paulbot App is documented by AGENTS.md and its installed
# App-only controller configuration. Generic review Apps are NOT origin owners.
OWNERS = {('pauljsnider', 211066188, 'User'),
          ('allplays-paulbot[bot]', 309595148, 'Bot')}
STATE = Path.home() / '.local/state/paul-bot1/origin'
class Denied(Exception):
    pass

def api(path, *args):
    p = subprocess.run(['gh', 'api', path, *args], capture_output=True, text=True, timeout=45)
    if p.returncode:
        raise Denied('github-read-failed')
    try:
        data = json.loads(p.stdout)
        if isinstance(data, dict) and data.get('errors'):
            raise Denied('github-incomplete-response')
        return data
    except ValueError:
        raise Denied('github-invalid-response')

def trusted(user):
    return isinstance(user, dict) and (user.get('login'), user.get('id'), user.get('type')) in OWNERS

def refs(text, repo):
    # All references, not just closing keywords: parent/split/follow-up links must
    # not become a provenance escape. Historical revisions are included below.
    text = html.unescape(text or '')
    result = set()
    for r, n in re.findall(r'https://github\.com/([\w.-]+/[\w.-]+)/(?:issues|pull)/([1-9]\d*)', text):
        result.add((r.lower(), int(n)))
    for r, n in re.findall(r'(?<![\w/])([\w.-]+/[\w.-]+)#([1-9]\d*)', text):
        result.add((r.lower(), int(n)))
    text = re.sub(r'[\w.-]+/[\w.-]+#\d+', '', text)
    for n in re.findall(r'(?<![\w/])#([1-9]\d*)', text):
        result.add((repo, int(n)))
    return result

class Gate:
    def __init__(self, state=STATE, fetch=api):
        self.state, self.fetch = Path(state), fetch
        self.state.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.visiting = set()
        self.checked = {}


    def path(self, repo, number):
        return self.state / (hashlib.sha256(f'{repo}#{number}'.encode()).hexdigest() + '.json')

    def load(self, repo, number):
        path = self.path(repo, number)
        if not path.exists():
            return None
        try:
            data = json.loads(path.read_text())
            if data['repo'] != repo or data['number'] != number or data['version'] != 1:
                raise ValueError()
            return data
        except (ValueError, KeyError):
            raise Denied('invalid-controller-provenance')

    def save(self, repo, number, data):
        fd, name = tempfile.mkstemp(dir=self.state)
        try:
            with os.fdopen(fd, 'w') as out:
                json.dump(data, out, sort_keys=True)
                out.flush()
                os.fsync(out.fileno())
            os.replace(name, self.path(repo, number))
        finally:
            if os.path.exists(name):
                os.unlink(name)

    def history(self, repo, number, is_pr):
        owner, name = repo.split('/')
        field = 'pullRequest' if is_pr else 'issue'
        closing = 'closingIssuesReferences(first:100) { nodes { number repository { nameWithOwner } } pageInfo { hasNextPage } }' if is_pr else ''
        query = '''query($owner:String!, $name:String!, $number:Int!, $cursor:String) {
          repository(owner:$owner,name:$name) { FIELD(number:$number) {
            id lastEditedAt userContentEdits(first:100,after:$cursor) {
              nodes { deletedAt diff editor { login __typename } }
              pageInfo { hasNextPage endCursor }
            } CLOSING
          } }
        }'''.replace('FIELD', field).replace('CLOSING', closing)
        sources, cursor, pages = set(), None, 0
        while True:
            args = ['-f', f'owner={owner}', '-f', f'name={name}', '-F', f'number={number}', '-f', f'query={query}']
            if cursor:
                args += ['-f', f'cursor={cursor}']
            data = self.fetch('graphql', *args)
            try:
                item = data['data']['repository'][field]
                edits = item['userContentEdits']
                if item['lastEditedAt'] and not edits['nodes']:
                    raise Denied('missing-edit-history')
                for edit in edits['nodes']:
                    if edit['deletedAt'] or not isinstance(edit['diff'], str) or not edit['editor']:
                        raise Denied('incomplete-edit-history')
                    login = edit['editor']['login']
                    if not trusted(self.fetch(f'users/{login}')):
                        raise Denied('outside-content-editor')
                    sources |= refs(edit['diff'], repo)
                if is_pr:
                    links = item['closingIssuesReferences']
                    if links['pageInfo']['hasNextPage']:
                        raise Denied('too-many-linked-sources')
                    sources |= {(x['repository']['nameWithOwner'].lower(), x['number']) for x in links['nodes']}
                page = edits['pageInfo']
                if not page['hasNextPage']:
                    return sources
                new_cursor = page['endCursor']
                pages += 1
                if not new_cursor or new_cursor == cursor or pages > 20:
                    raise Denied('incomplete-edit-pagination')
                cursor = new_cursor
            except (KeyError, TypeError):
                raise Denied('incomplete-origin-history')

    def check(self, repo, number, kind='auto', head='', binding=None):
        key = (repo, number)
        if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', repo) or number < 1:
            raise Denied('invalid-source')
        if key in self.visiting or len(self.visiting) >= 30:
            raise Denied('cyclic-or-excessive-source-chain')
        self.visiting.add(key)
        try:
            item = self.fetch(f'repos/{repo}/issues/{number}')
            if item.get('number') != number or not item.get('id') or not trusted(item.get('user', {})):
                raise Denied('outside-or-unknown-creator')
            is_pr = 'pull_request' in item
            if kind == 'pr' and not is_pr or kind == 'issue' and is_pr:
                raise Denied('source-kind-mismatch')
            if is_pr:
                pr = self.fetch(f'repos/{repo}/pulls/{number}')
                if not trusted(pr.get('user', {})) or pr.get('number') != number:
                    raise Denied('pr-identity-mismatch')
                if head and pr.get('head', {}).get('sha') != head:
                    raise Denied('head-changed')
                if pr.get('head', {}).get('repo', {}).get('full_name', '').lower() != repo:
                    raise Denied('outside-head-repository')
            previous = self.load(repo, number)
            if binding and not previous:
                # Bind only a newly created item, never adopt a legacy bot PR
                # merely because a later controller happened to encounter it.
                try:
                    age = datetime.now(timezone.utc).timestamp() - datetime.fromisoformat(item['created_at'].replace('Z', '+00:00')).timestamp()
                except (KeyError, ValueError):
                    raise Denied('missing-creation-time')
                if age < 0 or age > 300:
                    raise Denied('legacy-bot-requires-provenance-migration')
            if previous and previous['github_id'] != item['id']:
                raise Denied('source-identity-changed')
            sources = refs(item.get('body'), repo) | refs(item.get('title'), repo) | self.history(repo, number, is_pr)
            if previous:
                sources |= {(r, int(n)) for r, n in previous['sources']}
            if binding:
                sources.add(binding)
            # Title renames can remove source references too. Read every page.
            page_number = 1
            while True:
                events = self.fetch(f'repos/{repo}/issues/{number}/timeline?per_page=100&page={page_number}')
                if not isinstance(events, list):
                    raise Denied('incomplete-title-history')
                for event in events:
                    if event.get('event') == 'renamed':
                        if not trusted(event.get('actor', {})):
                            raise Denied('outside-title-editor')
                        rename = event.get('rename', {})
                        if 'from' not in rename or 'to' not in rename:
                            raise Denied('incomplete-title-history')
                        sources |= refs(rename['from'], repo) | refs(rename['to'], repo)
                if len(events) < 100:
                    break
                page_number += 1
                if page_number > 20:
                    raise Denied('incomplete-title-pagination')
            sources.discard(key)
            # A bot's mutable body cannot attest its own origin. Only the
            # controller creation path can bind it to a freshly checked source.
            if item['user']['type'] == 'Bot' and not (previous and previous.get('controller_bound') or binding):
                raise Denied('bot-source-not-controller-bound')
            for r, n in sorted(sources):
                self.check(r, n)
            self.save(repo, number, dict(version=1, repo=repo, number=number,
                github_id=item['id'], creator=item['user'], sources=sorted(sources),
                controller_bound=bool(binding or previous and previous.get('controller_bound')),
                inputs=previous.get('inputs', {}) if previous else {},
                first_seen=previous['first_seen'] if previous else int(time.time())))
            self.checked[key] = item
            return True
        finally:
            self.visiting.remove(key)

    def workflow(self, repo, run_id, head):
        run = self.fetch(f'repos/{repo}/actions/runs/{run_id}')
        if not trusted(run.get('actor', {})) or not trusted(run.get('triggering_actor', {})):
            raise Denied('outside-workflow-actor')
        if run.get('head_sha') != head:
            raise Denied('workflow-head-mismatch')

    def event(self, repo, number, endpoint):
        # Exact REST endpoint obtained from the event ID, never a supplied URL.
        if not re.fullmatch(r'(issues/comments|pulls/comments|pulls/[1-9]\d*/reviews)/[1-9]\d*', endpoint):
            raise Denied('invalid-trigger-endpoint')
        event = self.fetch(f'repos/{repo}/{endpoint}')
        if not trusted(event.get('user', {})):
            raise Denied('outside-trigger-author')
        url = event.get('issue_url') or event.get('pull_request_url') or ''
        if url != f'https://api.github.com/repos/{repo}/issues/{number}' and url != f'https://api.github.com/repos/{repo}/pulls/{number}':
            raise Denied('trigger-target-mismatch')
        # Reviews have no REST creation/update pair. Do not silently treat two
        # missing timestamps as equal and authorize an unverifiable trigger.
        if not event.get('created_at') or not event.get('updated_at'):
            raise Denied('trigger-history-incomplete')
        if event['updated_at'] != event['created_at']:
            raise Denied('edited-trigger-requires-history')
        self.check(repo, number)
        sources = refs(event.get('body'), repo)
        for r, n in sources:
            if (r, n) != (repo, number):
                self.check(r, n)
        # Persist input lineage on the root receipt. Later removal of this
        # comment or its link cannot remove the original source at merge time.
        receipt = self.load(repo, number)
        sources |= {(r, int(n)) for r, n in receipt['sources']}
        sources.discard((repo, number))
        receipt['sources'] = sorted(sources)
        inputs = receipt.setdefault('inputs', {})
        inputs[endpoint] = dict(id=event['id'], creator=event['user'],
            body_sha256=hashlib.sha256((event.get('body') or '').encode()).hexdigest())
        self.save(repo, number, receipt)
        return event

    def filter_inputs(self, repo, number, data, kind):
        def rows(items, row_kind):
            if not isinstance(items, list):
                raise Denied('incomplete-prompt-input')
            result = []
            for item in items:
                target = number
                try:
                    if row_kind == 'issues':
                        target = item['number']
                        self.check(repo, target, 'issue')
                        fresh = self.checked[(repo, target)]
                    else:
                        identifier = item.get('databaseId') or item.get('id')
                        if not isinstance(identifier, int) or isinstance(identifier, bool):
                            raise Denied('missing-prompt-input-id')
                        prefix = {'comments':'issues/comments', 'threads':'pulls/comments',
                                  'reviews':f'pulls/{number}/reviews'}[row_kind]
                        fresh = self.event(repo, number, f'{prefix}/{identifier}')
                    # Pass freshly checked text, never the earlier cached body.
                    result.append(dict(item, body=fresh.get('body') or '',
                        **({'title':fresh['title']} if row_kind == 'issues' else {})))
                except (Denied, AttributeError, KeyError, TypeError, ValueError, OSError, subprocess.TimeoutExpired) as exc:
                    reason = str(exc) if isinstance(exc, Denied) else 'incomplete-prompt-input'
                    alert(self.state, repo, target, 'coding-input', reason)
            return result
        if kind == 'snapshot':
            # Preserve the original merge evidence/fingerprint. Never let a
            # reviewer turn an unverified external instruction into bot advice.
            for thread in data['threads']:
                thread['replies'] = []
                if thread.get('required') is False:
                    thread['comments'] = []
                    continue
                if thread.get('required') is not True:
                    raise Denied('incomplete-review-requirement')
                for item in thread['comments']:
                    match = re.fullmatch(r'https://github\.com/' + re.escape(repo) +
                        r'/pull/' + str(number) + r'#discussion_r([1-9]\d*)', item.get('url', ''))
                    if not match:
                        raise Denied('incomplete-review-input-id')
                    fresh = self.event(repo, number, 'pulls/comments/' + match[1])
                    if fresh.get('body') != item.get('body'):
                        raise Denied('review-input-changed')
            return data
        if kind == 'threads':
            threads = data['data']['repository']['pullRequest']['reviewThreads']['nodes']
            for thread in threads:
                thread['comments']['nodes'] = rows(thread['comments']['nodes'], 'threads')
            return data
        return rows(data, kind)

    def discussion(self, repo, number, comment):
        owner, name = repo.split('/')
        query = '''query($owner:String!, $name:String!, $number:Int!) {
          repository(owner:$owner,name:$name) { discussion(number:$number) {
            id body lastEditedAt author { login }
          } }
        }'''
        data = self.fetch('graphql', '-f', f'owner={owner}', '-f', f'name={name}',
                          '-F', f'number={number}', '-f', f'query={query}')
        discussion = data['data']['repository']['discussion']
        nodes = [discussion]
        if comment:
            query = '''query($id:ID!) { node(id:$id) { ... on DiscussionComment {
              body lastEditedAt author { login } discussion { id }
            } } }'''
            child = self.fetch('graphql', '-f', f'id={comment}', '-f', f'query={query}')['data']['node']
            if child['discussion']['id'] != discussion['id']:
                raise Denied('discussion-target-mismatch')
            nodes.append(child)
        for node in nodes:
            actor = self.fetch('users/' + node['author']['login'])
            if not trusted(actor):
                raise Denied('outside-discussion-author')
            if node['lastEditedAt'] or actor['type'] == 'Bot':
                raise Denied('discussion-source-history-incomplete')
            for r, n in refs(node['body'], repo):
                self.check(r, n)


SLACK_TEAM = 'T0AF9HX7CH4'
SLACK_CHANNEL = 'C0AEW6K8W07'
SLACK_BOT = 'B0AFQHAHYP3'

def slack_call(method, token, payload):
    req = urllib.request.Request('https://slack.com/api/' + method,
        data=json.dumps(payload).encode(),
        headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=15) as response:
        return json.load(response)

def deliver_pending(state):
    # Caller holds the state lock. Retry queued failures even if their original
    # event cursor has advanced. Bound work and back off failed deliveries.
    if os.environ.get('DRY_RUN') == 'true':
        return
    now = int(time.time())
    pending = []
    for path in sorted(state.glob('alert-*.json')):
        try:
            record = json.loads(path.read_text())
            if not record.get('delivered') and now - record.get('attempt', 0) >= 900:
                pending.append((path, record))
        except (ValueError, OSError):
            continue
    pending = pending[:2]
    if not pending:
        return
    token = os.environ.get('SLACK_BOT_TOKEN')
    if not token or os.environ.get('SLACK_NOTIFY_CHANNEL') != SLACK_CHANNEL:
        # A read-only transport without lane credentials must not postpone the
        # next correctly configured lane's delivery attempt.
        print('origin alert pending: verified Slack route unavailable', file=sys.stderr)
        return
    route_ok = False
    try:
        if token and os.environ.get('SLACK_NOTIFY_CHANNEL') == SLACK_CHANNEL:
            identity = slack_call('auth.test', token, {})
            route_ok = (identity.get('ok') is True and identity.get('team_id') == SLACK_TEAM
                        and identity.get('bot_id') == SLACK_BOT)
    except Exception:
        pass
    for path, record in pending:
        delivered = False
        if route_ok:
            try:
                response = slack_call('chat.postMessage', token, dict(channel=SLACK_CHANNEL,
                    text=record['text'], unfurl_links=False, unfurl_media=False))
                delivered = response.get('ok') is True and response.get('channel') == SLACK_CHANNEL
            except Exception:
                pass
        record.update(attempt=now, delivered=delivered)
        path.write_text(json.dumps(record))
        os.chmod(path, 0o600)
        if not delivered:
            print('origin alert pending: verified Slack route unavailable', file=sys.stderr)

def drain_pending():
    # gh reads can occur inside a gate already holding this lock. Never wait on
    # that parent process; the next scheduled transport invocation will retry.
    if not STATE.exists():
        return
    with (STATE / 'lock').open('a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return
        deliver_pending(STATE)

def alert(state, repo, number, phase, reason):
    text = f'PaulBot origin BLOCKED {phase}: {repo}#{number}; reason={reason}; source=https://github.com/{repo}/issues/{number}'
    print(text, file=sys.stderr)
    # Dry runs neither send nor alter the real outbox/deduplication receipts.
    if os.environ.get('DRY_RUN') == 'true':
        return
    key = hashlib.sha256(f'{repo}#{number}:{phase}:{reason}'.encode()).hexdigest()
    path = state / f'alert-{key}.json'
    now = int(time.time())
    try:
        old = json.loads(path.read_text()) if path.exists() else {}
    except ValueError:
        old = {}
    if not old or old.get('delivered') and now - old.get('attempt', 0) >= 86400:
        path.write_text(json.dumps(dict(attempt=0, delivered=False, text=text)))
        os.chmod(path, 0o600)
    deliver_pending(state)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('command', choices=['check', 'bind', 'event', 'discussion', 'filter'])
    p.add_argument('repo'); p.add_argument('number', type=int)
    p.add_argument('--kind', default='auto', choices=['auto','issue','pr'])
    p.add_argument('--input-kind', choices=['comments','reviews','threads','issues','snapshot'], default='comments')
    p.add_argument('--run', type=int); p.add_argument('--head', default=''); p.add_argument('--phase', default='coding')
    p.add_argument('--comment', default=''); p.add_argument('--source', type=int); p.add_argument('--endpoint', default='')
    a = p.parse_args()
    gate = Gate()
    # Serializes source union and alert delivery across every lane and process.
    with (gate.state / 'lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        deliver_pending(gate.state)
        try:
            if a.phase == 'merge' and not re.fullmatch(r'[0-9a-f]{40}', a.head):
                raise Denied('missing-exact-merge-head')
            if a.run:
                gate.workflow(a.repo, a.run, a.head)
            if a.command == 'bind' and not a.source:
                raise Denied('missing-controller-source')
            if a.command == 'filter':
                print(json.dumps(gate.filter_inputs(a.repo, a.number, json.load(sys.stdin), a.input_kind)))
            elif a.command == 'discussion':
                gate.discussion(a.repo, a.number, a.comment)
            elif a.command == 'event':
                gate.event(a.repo, a.number, a.endpoint)
            else:
                gate.check(a.repo, a.number, a.kind, a.head,
                           (a.repo, a.source) if a.command == 'bind' else None)
        except (Denied, AttributeError, KeyError, TypeError, ValueError, OSError, subprocess.TimeoutExpired) as exc:
            reason = str(exc) if isinstance(exc, Denied) else 'incomplete-provenance'
            alert(gate.state, a.repo, a.number, a.phase, reason)
            return 1
    return 0

if __name__ == '__main__':
    sys.exit(main())
