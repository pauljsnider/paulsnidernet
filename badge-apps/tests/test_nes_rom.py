"""Exercise the actual header-check block without the hardware-only Viper CPU."""
import pathlib
import unittest

source = (pathlib.Path(__file__).parents[1] / 'apps/nes/emu.py').read_text()
block = source[source.index('        if len(hdr) != 16'):source.index('        prg_len = hdr[4]')]
exec('def validate(hdr, data):\n' + block + '\n        return data\n')

class RomTests(unittest.TestCase):
    def header(self, flags=0):
        return b'NES\x1a' + bytes([2, 1, flags, 0]) + bytes(8)

    def test_nrom(self):
        self.assertEqual(len(validate(self.header(), bytes(40960))), 40960)

    def test_trainer(self):
        self.assertEqual(validate(self.header(4), bytes(512) + b'x' * 40960), b'x' * 40960)

    def test_invalid(self):
        for h, data in [(b'', b''), (self.header(), bytes(10)), (self.header(64), bytes(40960)), (b'PK' + bytes(14), bytes(40960))]:
            with self.assertRaises(ValueError):
                validate(h, data)

    def test_nes2(self):
        h = bytearray(self.header()); h[7] = 8
        with self.assertRaises(ValueError):
            validate(h, bytes(40960))
