import importlib.util
import pathlib
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('roku_net', pathlib.Path(__file__).parents[1] / 'apps/roku_remote/roku_net.py')
r = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r)
XML = '<device-info><vendor-name>Roku</vendor-name><serial-number>A123</serial-number><user-device-name>Living &amp; TV</user-device-name></device-info>'

class FakeSocket:
    def __init__(self, response):
        self.response = [response, b'']; self.sent = b''; self.closed = False
    def settimeout(self, value): pass
    def connect(self, address): self.address = address
    def send(self, data): self.sent += data[:7]; return len(data[:7])
    def recv(self, size): return self.response.pop(0)
    def close(self): self.closed = True

class RokuTests(unittest.TestCase):
    def test_identity_and_name(self):
        d = r.device(XML, '192.168.1.2')
        self.assertEqual(d['id'], 'A123')
        self.assertEqual(d['name'], 'Living & TV')
    def test_invalid_device(self):
        for xml in ('<html>Hi</html>', XML.replace('Roku', 'Other'), XML.replace('A123', '')):
            with self.assertRaises(ValueError): r.device(xml, '192.168.1.2')
    def test_invalid_ip(self):
        for ip in ('127.1', 'example.com', '192.168.1.256', '1.2.3.4/evil', '-1.2.3.4'):
            with self.assertRaises(ValueError): r.ipv4(ip)
    def test_wrong_roku_never_receives_key(self):
        with patch.object(r, 'inspect', return_value={'id': 'OTHER'}), patch.object(r, 'request') as request:
            with self.assertRaises(ValueError): r.press({'ip':'192.168.1.2','id':'A123'}, 'Home')
            request.assert_not_called()
    def test_correct_device_command(self):
        d = r.device(XML, '192.168.1.2')
        with patch.object(r, 'inspect', return_value=d), patch.object(r, 'request') as request:
            r.press(d, 'Select')
            request.assert_called_once_with(d['ip'], '/keypress/Select', 'POST')
    def test_http_and_partial_send(self):
        sock = FakeSocket(b'HTTP/1.0 200 OK\r\n\r\n' + XML.encode())
        with patch.object(r.socket, 'socket', return_value=sock):
            self.assertEqual(r.request('192.168.1.2', '/query/device-info'), XML)
        self.assertIn(b'Host: 192.168.1.2:8060\r\n', sock.sent)
        self.assertTrue(sock.closed)
    def test_403_closes_socket(self):
        sock = FakeSocket(b'HTTP/1.0 403 Forbidden\r\n\r\n')
        with patch.object(r.socket, 'socket', return_value=sock):
            with self.assertRaisesRegex(ValueError, 'Enable Roku'): r.request('192.168.1.2', '/keypress/Home', 'POST')
        self.assertTrue(sock.closed)
    def test_discovery_dedup(self):
        class UDP:
            def recvfrom(self, size): return b'HTTP/1.1 200 OK\r\nST: roku:ecp\r\n', ('192.168.1.4',1900)
            def close(self): pass
        scan = r.Discovery.__new__(r.Discovery); scan.sock = UDP(); scan.seen = set()
        self.assertEqual(scan.poll(), '192.168.1.4'); self.assertIsNone(scan.poll()); scan.close()
    def test_bad_key_never_sends(self):
        with patch.object(r, 'inspect') as inspect:
            with self.assertRaises(ValueError): r.press({}, 'PowerWhatever')
            inspect.assert_not_called()
