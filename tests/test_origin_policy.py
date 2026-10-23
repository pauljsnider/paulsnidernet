import copy
from datetime import datetime, timezone
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
spec = importlib.util.spec_from_file_location('origin', Path(__file__).resolve().parents[1] / 'scripts/paulbot-origin.py')
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
 def test_alert_dedup_and_failed_delivery_retry(self):
  with patch.dict(os.environ,{'DRY_RUN':'true'},clear=True),patch.object(o.time,'time',return_value=10000):
   o.alert(self.g.state,REPO,1,'coding','outside');p=next(self.g.state.glob('alert-*'));first=p.read_text()
   with patch.object(o.time,'time',return_value=10001):o.alert(self.g.state,REPO,1,'coding','outside')
   self.assertEqual(p.read_text(),first);self.assertFalse(json.loads(first)['delivered'])
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
