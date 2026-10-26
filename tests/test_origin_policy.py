import copy
from datetime import datetime, timezone
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
spec = importlib.util.spec_from_file_location('origin', Path(__file__).resolve().parents[1] / 'scripts' / 'paulbot-origin.py')
o = importlib.util.module_from_spec(spec); spec.loader.exec_module(o)
PAUL = dict(login='pauljsnider', id=211066188, type='User')
BOT = dict(login='allplays-paulbot[bot]', id=309595148, type='Bot')
OUT = dict(login='outsider', id=7, type='User')
REPO = 'pauljsnider/test'
SHA = 'a'*40
class Tests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
  self.items={}; self.hist={};self.edits={};self.events={};self.calls=[]
  self.item(1);self.g=o.Gate(self.tmp.name,self.fetch)
 def item(self,n,user=PAUL,body='',pr=False):
  self.items[n]=dict(number=n,id=n+100,user=copy.deepcopy(user),title='work',body=body,created_at=datetime.now(timezone.utc).isoformat())
  if pr:self.items[n]['pull_request']={}
 def fetch(self,path,*args):
  self.calls.append(path)
  if path=='graphql':
   n=int(next(v.split('=',1)[1] for v in args if v.startswith('number=')))
   edits=self.edits.get(n,[])
   return {'data':{'repository':{k:dict(id=str(n),lastEditedAt='date' if edits else None,userContentEdits=dict(nodes=edits,pageInfo=dict(hasNextPage=False)),closingIssuesReferences=dict(nodes=self.hist.get(n,[]),pageInfo=dict(hasNextPage=False))) for k in ['issue','pullRequest']}}}
  if path.startswith('users/'):
   return next((x for x in [PAUL,BOT,OUT] if x['login']==path[6:]),OUT)
  if '/timeline?' in path:return self.events.get(int(path.split('/')[4]),[])
  n=int(path.split('/')[-1])
  if '/pulls/' in path:return dict(self.items[n],head=dict(sha=SHA,repo=dict(full_name=REPO)))
  return self.items[n]
 def denied(self,reason,number=1,**kw):
  with self.assertRaisesRegex(o.Denied,reason):self.g.check(REPO,number,**kw)
 def test_paul_allowed(self):self.assertTrue(self.g.check(REPO,1))
 def test_member_not_owner(self):
  self.items[1].update(user=OUT,author_association='MEMBER',labels=[{'name':'maintainer-approved'}]);self.denied('outside')
 def test_collaborator_not_owner(self):
  self.items[1].update(user=OUT,author_association='COLLABORATOR');self.denied('outside')
 def test_numeric_identity_required(self):
  self.items[1]['user']['id']=9;self.denied('outside')
 def test_unknown_bot_denied(self):
  self.items[1]['user']=dict(login='copilot[bot]',id=99,type='Bot');self.denied('outside')
 def test_bot_without_receipt_denied(self):self.item(1,BOT);self.denied('not-controller-bound')
 def test_bind_paul_source_then_recheck(self):
  self.item(2,BOT,pr=True);self.assertTrue(self.g.check(REPO,2,binding=(REPO,1)));self.assertTrue(self.g.check(REPO,2,head=SHA))
 def test_bot_cannot_launder_outsider(self):
  self.item(1,OUT);self.item(2,BOT,pr=True);self.denied('outside',2,binding=(REPO,1))
 def test_removed_link_preserved(self):
  self.item(2,body='Closes #1',pr=True);self.g.check(REPO,2);self.items[2]['body']='';self.items[1]['user']=OUT;self.denied('outside',2)
 def test_historical_deleted_source(self):
  self.item(2,OUT);self.edits[1]=[dict(deletedAt=None,diff='- Closes #2',editor={'login':'pauljsnider'})];self.denied('outside')
 def test_outside_editor(self):
  self.edits[1]=[dict(deletedAt=None,diff='change',editor={'login':'outsider'})];self.denied('outside-content-editor')
 def test_deleted_history_denied(self):
  self.edits[1]=[dict(deletedAt='date',diff=None,editor=None)];self.denied('incomplete-edit-history')
 def test_title_rename_preserves_source(self):
  self.item(2,OUT);self.events[1]=[dict(event='renamed',actor=PAUL,rename={'from':'Fix #2','to':'Fix'})];self.denied('outside')
 def test_graphql_link_independent_of_body(self):
  self.item(2,OUT);self.item(3,pr=True);self.hist[3]=[dict(number=2,repository={'nameWithOwner':REPO})];self.denied('outside',3)
 def test_missing_history_denied(self):
  self.g.fetch=lambda *a:{};self.denied('outside-or-unknown')
 def test_read_failure_denied(self):
  def failed(*a):raise o.Denied('github-read-failed')
  self.g.fetch=failed;self.denied('github-read-failed')
 def test_stale_head_denied(self):self.item(2,pr=True);self.denied('head-changed',2,head='b'*40)
 def test_corrupt_state_denied(self):self.g.path(REPO,1).write_text('{}');self.denied('invalid-controller')
 def test_modes_cannot_override(self):
  self.item(1,OUT)
  with patch.dict(os.environ,{'PAULBOT_INTEGRITY_MODE':'off','ISSUE_FIXER_CONTROLLER_MODE':'security','PAULBOT_INTEGRITY_ASSOCIATIONS':'OWNER,MEMBER,COLLABORATOR'}):self.denied('outside')
 def test_legacy_binding_not_invented(self):
  self.item(2,BOT);self.items[2]['created_at']='2020-01-01T00:00:00Z';self.denied('legacy-bot',2,binding=(REPO,1))
 def test_alert_dry_run_has_no_receipt(self):
  with patch.dict(os.environ,{'DRY_RUN':'true'},clear=True):
   o.alert(self.g.state,REPO,1,'coding','outside')
   self.assertEqual(list(self.g.state.glob('alert-*')),[])
 def test_alert_retry_drain_and_success_dedup(self):
  env={'SLACK_BOT_TOKEN':'synthetic','SLACK_NOTIFY_CHANNEL':o.SLACK_CHANNEL}
  with patch.dict(os.environ,env,clear=True),patch.object(o.time,'time',return_value=10000),patch.object(o,'slack_call',return_value={'ok':False}) as send:
   o.alert(self.g.state,REPO,1,'coding','outside')
   p=next(self.g.state.glob('alert-*'));self.assertFalse(json.loads(p.read_text())['delivered'])
   send.reset_mock();o.deliver_pending(self.g.state);send.assert_not_called()
   with patch.object(o.time,'time',return_value=10901):
    send.side_effect=[dict(ok=True,team_id=o.SLACK_TEAM,bot_id=o.SLACK_BOT),dict(ok=True,channel=o.SLACK_CHANNEL)]
    o.deliver_pending(self.g.state)
   self.assertTrue(json.loads(p.read_text())['delivered'])
   send.reset_mock();o.alert(self.g.state,REPO,1,'coding','outside');send.assert_not_called()
 def test_wrong_slack_route_never_sends(self):
  with patch.dict(os.environ,{'SLACK_BOT_TOKEN':'synthetic','SLACK_NOTIFY_CHANNEL':'wrong'},clear=True),patch.object(o,'slack_call') as send:
   o.alert(self.g.state,REPO,1,'coding','outside');send.assert_not_called()
 def test_wrong_workspace_or_bot_never_sends(self):
  for identity in [dict(ok=True,team_id='wrong',bot_id=o.SLACK_BOT),dict(ok=True,team_id=o.SLACK_TEAM,bot_id='wrong')]:
   with patch.dict(os.environ,{'SLACK_BOT_TOKEN':'synthetic','SLACK_NOTIFY_CHANNEL':o.SLACK_CHANNEL},clear=True),patch.object(o,'slack_call',return_value=identity) as send:
    for p in self.g.state.glob('alert-*'):p.unlink()
    o.alert(self.g.state,REPO,1,'coding','outside');self.assertEqual(send.call_count,1)
 def test_null_creator_denied(self):
  self.items[1]['user']=None;self.denied('outside-or-unknown')
 def test_autolink_and_html_sources_retained(self):
  self.item(2,OUT)
  for text in [f'<https://github.com/{REPO}/issues/2>',f'<a href="https://github.com/{REPO}/issues/2">source</a>']:
   self.items[1]['body']=text;self.denied('outside')
 def test_historical_autolink_retained(self):
  self.item(2,OUT);self.edits[1]=[dict(deletedAt=None,diff=f'- <https://github.com/{REPO}/issues/2>',editor={'login':'pauljsnider'})];self.denied('outside')
 def test_invalid_trigger_endpoint_denied(self):
  with self.assertRaisesRegex(o.Denied,'invalid-trigger'):self.g.event(REPO,1,'../secrets')
 def test_workflow_paul_actor_and_rerun(self):
  self.g.fetch=lambda *a:dict(actor=PAUL,triggering_actor=PAUL,head_sha=SHA)
  self.g.workflow(REPO,1,SHA)
 def test_workflow_outside_rerun(self):
  self.g.fetch=lambda *a:dict(actor=PAUL,triggering_actor=OUT,head_sha=SHA)
  with self.assertRaisesRegex(o.Denied,'outside-workflow'):self.g.workflow(REPO,1,SHA)
 def test_workflow_missing_actor(self):
  self.g.fetch=lambda *a:dict(actor=PAUL,head_sha=SHA)
  with self.assertRaisesRegex(o.Denied,'outside-workflow'):self.g.workflow(REPO,1,SHA)
 def test_workflow_changed_head(self):
  self.g.fetch=lambda *a:dict(actor=PAUL,triggering_actor=PAUL,head_sha='b'*40)
  with self.assertRaisesRegex(o.Denied,'workflow-head'):self.g.workflow(REPO,1,SHA)
if __name__=='__main__':unittest.main()

class InputTests(unittest.TestCase):
 setUp=Tests.setUp
 item=Tests.item
 fetch=Tests.fetch
 denied=Tests.denied
 def setup_event(self, user=PAUL, body='Requirements', edited=False):
  original=self.g.fetch
  event=dict(id=17,user=user,body=body,issue_url=f'https://api.github.com/repos/{REPO}/issues/1',created_at='date',updated_at='later' if edited else 'date')
  self.g.fetch=lambda path,*args:event if path.endswith('issues/comments/17') else original(path,*args)
  return event
 def test_outside_comment_omitted_and_alerted_despite_off_mode(self):
  self.setup_event(OUT)
  with patch.dict(os.environ,{'PAULBOT_INTEGRITY_MODE':'off','DRY_RUN':'false'},clear=True),patch.object(o,'slack_call') as send:
   self.assertEqual(self.g.filter_inputs(REPO,1,[dict(id=17,body='cached')],'comments'),[])
   self.assertEqual(len(list(self.g.state.glob('alert-*'))),1);send.assert_not_called()
  self.assertTrue(self.g.check(REPO,1))
 def test_paul_comment_uses_fresh_body_and_retains_digest(self):
  self.setup_event()
  result=self.g.filter_inputs(REPO,1,[dict(id=17,body='cached')],'comments')
  self.assertEqual(result[0]['body'],'Requirements')
  self.assertIn('issues/comments/17',self.g.load(REPO,1)['inputs'])
 def test_edited_paul_comment_omitted(self):
  self.setup_event(edited=True)
  with patch.dict(os.environ,{'DRY_RUN':'true'}):
   self.assertEqual(self.g.filter_inputs(REPO,1,[dict(id=17)],'comments'),[])
 def test_comment_cannot_launder_outside_link(self):
  self.item(2,OUT);self.setup_event(body=f'<https://github.com/{REPO}/issues/2>')
  with patch.dict(os.environ,{'DRY_RUN':'true'}):
   self.assertEqual(self.g.filter_inputs(REPO,1,[dict(id=17)],'comments'),[])
 def test_comment_source_retained_after_removal(self):
  self.item(2);event=self.setup_event(body='#2')
  self.g.event(REPO,1,'issues/comments/17');event['body']='removed'
  self.items[2]['user']=OUT;self.denied('outside')
 def test_unknown_input_id_omitted(self):
  with patch.dict(os.environ,{'DRY_RUN':'true'}):
   self.assertEqual(self.g.filter_inputs(REPO,1,[dict(body='Requirements')],'comments'),[])

 def test_inputs_survive_later_root_check(self):
  event=self.setup_event();original=self.g.fetch
  self.g.event(REPO,1,'issues/comments/17')
  self.g.fetch=lambda path,*args:dict(event,id=18) if path.endswith('issues/comments/18') else original(path,*args)
  self.g.event(REPO,1,'issues/comments/18');self.g.check(REPO,1)
  self.assertEqual(set(self.g.load(REPO,1)['inputs']),{'issues/comments/17','issues/comments/18'})
 def test_related_issue_uses_checked_snapshot(self):
  original=self.g.fetch;reads=[]
  def fetch(path,*args):
   result=original(path,*args)
   if path==f'repos/{REPO}/issues/1':
    reads.append(path)
    if len(reads)>1:return dict(result,body='unchecked replacement')
   return result
  self.g.fetch=fetch
  result=self.g.filter_inputs(REPO,0,[dict(number=1)],'issues')
  self.assertEqual(result[0]['body'],'');self.assertEqual(len(reads),1)

 def test_resolved_nonrequired_external_thread_does_not_block(self):
  snapshot=dict(fingerprint='original',threads=[dict(id='t',required=False,explicitlyHumanResolved=True,comments=[dict(body='outside historical instruction',url='invalid')],replies=[dict(rationale='outside')])])
  original=copy.deepcopy(snapshot)
  result=self.g.filter_inputs(REPO,1,snapshot,'snapshot')
  self.assertEqual(result['fingerprint'],original['fingerprint'])
  self.assertEqual(result['threads'][0]['comments'],[])
  self.assertEqual(result['threads'][0]['replies'],[])
 def test_required_unknown_review_comment_still_denied(self):
  with self.assertRaisesRegex(o.Denied,'incomplete-review-input'):
   self.g.filter_inputs(REPO,1,dict(threads=[dict(required=True,comments=[dict(url='invalid')])]),'snapshot')
 def test_unconfigured_transport_does_not_delay_valid_lane_retry(self):
  with patch.dict(os.environ,{},clear=True):
   o.alert(self.g.state,REPO,1,'coding','outside')
  path=next(self.g.state.glob('alert-*'))
  self.assertEqual(json.loads(path.read_text())['attempt'],0)
  with patch.dict(os.environ,{'SLACK_BOT_TOKEN':'synthetic','SLACK_NOTIFY_CHANNEL':o.SLACK_CHANNEL},clear=True),patch.object(o,'slack_call',side_effect=[dict(ok=True,team_id=o.SLACK_TEAM,bot_id=o.SLACK_BOT),dict(ok=True,channel=o.SLACK_CHANNEL)]):
   o.deliver_pending(self.g.state)
  self.assertTrue(json.loads(path.read_text())['delivered'])
