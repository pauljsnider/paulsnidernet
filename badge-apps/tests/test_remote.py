import sys, unittest, tempfile, pathlib, types, runpy
from unittest.mock import patch
APP=pathlib.Path(__file__).resolve().parents[1]/'apps'/'universal_remote'
sys.path.insert(0,str(APP))
from remote_core import encode, load_remote

def signal(p='NEC',a='04 00 00 00',c='08 00 00 00'):
    return {'type':'parsed','protocol':p,'address':a,'command':c}
class Tests(unittest.TestCase):
    def test_nec_wire_bytes(self):
        freq,t,n,g=encode(signal())
        self.assertEqual((freq,len(t),n,t[:2]),(38000,67,1,[9000,4500]))
        bits=[int(v==1690) for v in t[3:-1:2]]
        wire=[sum(bits[j+i]<<i for i in range(8)) for j in range(0,32,8)]
        self.assertEqual(wire,[4,251,8,247])
    def test_samsung_header(self):
        _,t,_,_=encode(signal('Samsung32','07 00 00 00','02 00 00 00'))
        self.assertEqual(t[:2],[4500,4500])
        self.assertEqual(t[2:18],t[18:34])
    def test_sony(self):
        f,t,n,g=encode(signal('SIRC','01 00 00 00','15 00 00 00'))
        self.assertEqual((f,len(t),n,g),(40000,26,3,45000))
        self.assertEqual(t[:6],[2400,600,1200,600,600,600])
    def test_ranges(self):
        for s in [signal('RC6'),signal(a='FF FF FF FF'),signal(c='GG 00 00 00')]:
            with self.assertRaises(ValueError): encode(s)
    def test_raw_limits(self):
        for data in ['0 100','100 999999',' '.join(['1000']*102)]:
            with self.assertRaises(ValueError): encode({'type':'raw','frequency':38000,'data':data})
    def test_profiles(self):
        for p in APP.glob('*.ir'):
            cmds,rejected=load_remote(str(p)); self.assertGreater(len(cmds),5)
            self.assertEqual(rejected,0)
            for c in cmds: self.assertLess(sum(encode(c)[1]),100000)
    def test_bad_profile(self):
        with tempfile.NamedTemporaryFile(mode='w') as f:
            f.write('name: Bad\ntype: parsed\nprotocol: unsupported\n');f.flush()
            with self.assertRaises(ValueError): load_remote(f.name)
    def test_ui_and_input(self):
        pressed=set(); calls=[]
        badge=types.SimpleNamespace(mode=lambda _:None,pressed=lambda b:b in pressed)
        screen=types.SimpleNamespace(width=320,height=240,clip=None,rectangle=lambda *a:None,shape=lambda *a:None,text=lambda *a:None)
        tx=types.ModuleType('remote_tx')
        class Transmitter:
            remaining=0
            def poll(self): pass
            def start(self,c):calls.append(c)
            def close(self):pass
        tx.Transmitter=Transmitter
        bw=types.ModuleType('badgeware');bw.State=types.SimpleNamespace(load=lambda *a:None,save=lambda *a:None)
        def run(update):
            update()
            pressed.add('SELECT');update();pressed.clear()
            pressed.add('RIGHT');update();pressed.clear()
            pressed.add('DOWN');update();pressed.clear()
            pressed.add('SELECT');update();pressed.clear()
        env={'badge':badge,'screen':screen,'color':types.SimpleNamespace(rgb=lambda *a:a),'font':types.SimpleNamespace(nope=None),'shape':types.SimpleNamespace(rectangle=lambda *a:a),'HIRES':1,'VSYNC':2,'run':run}
        for b in ['UP','DOWN','LEFT','RIGHT','SELECT']:env['BUTTON_'+b]=b
        with patch.dict(sys.modules,{'badgeware':bw,'remote_tx':tx}),patch('os.chdir'),patch('os.listdir',return_value=[p.name for p in APP.glob('*.ir')]),patch('remote_core.load_remote',side_effect=lambda p:load_remote(str(APP/p))):
            runpy.run_path(str(APP/'__init__.py'),init_globals=env)
        self.assertEqual(len(calls),2)
        self.assertNotEqual(calls[0],calls[1])
if __name__=='__main__':unittest.main()
