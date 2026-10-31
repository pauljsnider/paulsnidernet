import importlib.util
import pathlib
import unittest

spec = importlib.util.spec_from_file_location('remote_layout', pathlib.Path(__file__).parents[1] / 'apps/roku_remote/remote_layout.py')
r = importlib.util.module_from_spec(spec); spec.loader.exec_module(r)

class LayoutTests(unittest.TestCase):
    def test_ok_neighbors(self):
        for direction, key in [('Up','Up'),('Down','Down'),('Left','Left'),('Right','Right')]:
            self.assertEqual(r.BUTTONS[r.move(4, direction, {})][1], key)
    def test_all_enabled_buttons_reachable(self):
        for device in ({}, {'volume':True}, {'power':True}, {'volume':True,'power':True}):
            seen = {4}; todo = [4]
            while todo:
                current = todo.pop(0)
                for direction in ('Up','Down','Left','Right'):
                    nxt = r.move(current, direction, device)
                    if nxt not in seen:
                        seen.add(nxt); todo.append(nxt)
            self.assertEqual(seen, {i for i,b in enumerate(r.BUTTONS) if r.enabled(b, device)})
    def test_disabled_rows_skipped(self):
        self.assertEqual(r.BUTTONS[r.move(10, 'Down', {})][0], 'Change Roku')
    def test_top_edge_stops(self):
        self.assertEqual(r.move(1, 'Up', {}), 1)

class PhysicalInputTests(unittest.TestCase):
    def test_arrows_only_move_focus_select_sends(self):
        import sys
        import types
        from unittest.mock import patch, Mock
        app_path = pathlib.Path(__file__).parents[1] / 'apps/roku_remote/__init__.py'
        buttons = set()
        badge = types.SimpleNamespace(mode=lambda _:None, pressed=lambda b:b in buttons)
        wlan = types.SimpleNamespace(isconnected=lambda:True)
        network = types.SimpleNamespace(STA_IF=0, WLAN=lambda _:wlan)
        state = types.SimpleNamespace(load=lambda *a:None, save=lambda *a:None)
        net = types.SimpleNamespace(Discovery=Mock(), inspect=Mock(), press=Mock())
        env = dict(badge=badge, screen=types.SimpleNamespace(), font=types.SimpleNamespace(nope=None), HIRES=1, VSYNC=2, run=lambda f:None)
        for name in ('UP','DOWN','LEFT','RIGHT','SELECT','BACK','MENU','HOME'):
            env['BUTTON_'+name] = name
        original_path = sys.path[:]
        try:
            with patch.dict(sys.modules, {'network':network,'badgeware':types.SimpleNamespace(State=state),'roku_net':net,'remote_layout':r}), patch('os.chdir'):
                exec(compile(app_path.read_text(), str(app_path), 'exec'), env)
            env.update(mode='remote', target={'id':'one','ip':'192.168.1.2'}, draw=lambda:None)
            buttons.add('RIGHT'); env['update']()
            self.assertEqual(r.BUTTONS[env['focus']][1], 'Right')
            self.assertIsNone(env['pending']); net.press.assert_not_called()
            buttons.clear(); buttons.add('SELECT'); env['update']()
            self.assertEqual(env['pending'], 'Right'); net.press.assert_not_called()
            buttons.clear(); env['update']()
            net.press.assert_called_once_with(env['target'], 'Right')
        finally:
            sys.path[:] = original_path
