import importlib.util
import pathlib
import sys
import types
import unittest
from unittest.mock import patch, Mock

APP = pathlib.Path(__file__).resolve().parents[1] / 'apps/allplays_scoreboard'
sys.path.insert(0, str(APP))
import score_ui
import score_client

class ScoreboardTests(unittest.TestCase):
    def test_navigation_and_commands(self):
        state = {'revision': 7, 'liveClockRunning': False}
        for i, side, delta in [(0,'homeScore',1),(1,'homeScore',-1),(3,'awayScore',1),(4,'awayScore',-1)]:
            self.assertEqual(score_ui.command(i,state),dict(action='score',side=side,delta=delta,revision=7))
        self.assertEqual(score_ui.command(2,state)['running'],True)
        self.assertEqual(score_ui.command(6,state)['action'],'undo')
        for i in (5,7,8): self.assertIsNone(score_ui.command(i,state))
        self.assertEqual(score_ui.move(0,-1,0,9),0)
        self.assertEqual(score_ui.move(2,1,0,9),2)
        self.assertEqual(score_ui.move(0,0,1,9),3)
        self.assertEqual(score_ui.move(8,0,1,9),8)
        self.assertEqual(score_ui.elapsed_ms(dict(liveClockMs=1000,liveClockRunning=True),2500),3500)
        self.assertEqual(score_ui.elapsed_ms(dict(liveClockMs=1000,liveClockRunning=False),2500),1000)

    def client(self):
        context = Mock()
        with patch.object(score_client.ssl,'SSLContext',return_value=context):
            client = score_client.Client(dict(host=score_client.HOST,path=score_client.PATH,token='a'*64),str(APP/'roots.pem'))
        self.assertEqual(context.verify_mode,score_client.ssl.CERT_REQUIRED)
        return client,context

    def test_https_parsing_partial_writes_and_hostname(self):
        client,context = self.client()
        secure = context.wrap_socket.return_value
        secure.write.side_effect = lambda data: min(9,len(data))
        secure.read.side_effect = [b'HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n7\r\n{"x":1}\r\n0\r\n\r\n',b'']
        raw = Mock()
        with patch.object(score_client.socket,'socket',return_value=raw), patch.object(score_client.socket,'getaddrinfo',return_value=[(None,None,None,None,('127.0.0.1',443))]), patch.object(score_client.time,'ticks_ms',return_value=1,create=True), patch.object(score_client.time,'ticks_diff',return_value=0,create=True):
            self.assertEqual(client.call({'action':'state'}),{'x':1})
        context.wrap_socket.assert_called_once_with(raw,server_hostname=score_client.HOST)
        self.assertGreater(secure.write.call_count,1)
        secure.close.assert_called_once()

    def test_reject_endpoint_and_bad_token(self):
        for config in [dict(host='evil.test',path=score_client.PATH,token='a'*64),dict(host=score_client.HOST,path=score_client.PATH,token='short')]:
            with self.assertRaises(ValueError): score_client.Client(config,'unused')

    def app(self):
        state = Mock()
        fake_network = types.SimpleNamespace(WLAN=lambda _:Mock(),STA_IF=0)
        spec = importlib.util.spec_from_file_location('score_app_test',APP/'__init__.py')
        app = importlib.util.module_from_spec(spec)
        app.__dict__.update(badge=Mock(),screen=Mock(),font=types.SimpleNamespace(nope=1),image=Mock(),HIRES=1,VSYNC=2,run=lambda _:None)
        with patch.dict(sys.modules,{'network':fake_network,'badgeware':types.SimpleNamespace(State=state)}), patch('os.chdir'):
            spec.loader.exec_module(app)
        app.store['gameId']='game'; app.current={'revision':0,'sessionId':'session'}
        app.client=Mock(); app.client.call.return_value={'homeScore':1,'revision':1}
        return app,state

    def test_save_failure_never_sends_and_retry_reuses_id(self):
        app,state = self.app()
        state.save.return_value=False
        with self.assertRaises(ValueError): app.queue_command({'action':'score','revision':0,'side':'homeScore','delta':1})
        original=dict(app.pending)
        app.mode='sending'
        with self.assertRaises(ValueError): app.process()
        app.client.call.assert_not_called()
        state.save.return_value=True
        app.client.call.side_effect=OSError('lost response')
        with self.assertRaises(OSError): app.process()
        self.assertEqual(app.pending,original)
        app.client.call.side_effect=None
        with patch.object(app.time,'ticks_ms',return_value=100,create=True): app.process()
        self.assertEqual(app.client.call.call_args_list[0],app.client.call.call_args_list[1])
        self.assertIsNone(app.pending)
        self.assertEqual(app.mode,'remote')

if __name__=='__main__': unittest.main()
