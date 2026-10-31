"""Bounded Flipper .ir loader and protocol encoders, independent of hardware."""
SUPPORTED = ('NEC', 'NECext', 'Samsung32', 'SIRC', 'SIRC15', 'SIRC20')

def little_hex(value):
    parts = value.split()
    if len(parts) != 4:
        raise ValueError('Expected four little-endian hex bytes')
    nums = [int(p, 16) for p in parts]
    if any(n < 0 or n > 255 for n in nums):
        raise ValueError('Invalid byte')
    return sum(n << (8*i) for i, n in enumerate(nums))

def encode(signal):
    """Return frequency, alternating mark/space microseconds, frame count, period."""
    if signal.get('type') == 'raw':
        freq = int(signal['frequency'])
        times = [int(v) for v in signal['data'].split()]
        if not 30000 <= freq <= 60000 or not 2 <= len(times) <= 512:
            raise ValueError('Raw signal outside supported limits')
        if any(v < 100 or v > 30000 for v in times) or sum(times) > 100000:
            raise ValueError('Raw frame too long or invalid')
        return freq, times, 1, 120000
    p = signal.get('protocol')
    if p not in SUPPORTED:
        raise ValueError('Unsupported protocol: ' + str(p))
    a, c = little_hex(signal['address']), little_hex(signal['command'])
    if p.startswith('SIRC'):
        bits = {'SIRC': 12, 'SIRC15': 15, 'SIRC20': 20}[p]
        if c > 127 or a >= (1 << (bits-7)):
            raise ValueError('Sony value out of range')
        word = (a << 7) | c
        times = [2400, 600]
        for bit in range(bits):
            times.extend((1200 if word & (1 << bit) else 600, 600))
        return 40000, times, 3, 45000
    if p == 'NECext':
        if a > 65535 or c > 65535:
            raise ValueError('NECext value out of range')
        data = [a & 255, a >> 8, c & 255, c >> 8]
    else:
        if a > 255 or c > 255:
            raise ValueError('Address/command out of range')
        data = [a, a if p == 'Samsung32' else a ^ 255, c, c ^ 255]
    times = [4500 if p == 'Samsung32' else 9000, 4500]
    for byte in data:
        for bit in range(8):
            times.extend((560, 1690 if byte & (1 << bit) else 560))
    times.append(560)
    return 38000, times, 1, 110000

def load_remote(path):
    commands, rejected, current = [], 0, {}
    def finish(record):
        if not record.get('name'):
            return
        nonlocal rejected
        try:
            encode(record)
            if len(commands) >= 100:
                raise ValueError('Too many commands')
            commands.append(record)
        except (ValueError, KeyError):
            rejected += 1
    with open(path) as f:
        for _ in range(2000):
            line = f.readline(8193)
            if not line:
                break
            if len(line) > 8192:
                raise ValueError('Line too long')
            line = line.strip()
            if not line or line.startswith('#') or ':' not in line:
                continue
            key, value = [s.strip() for s in line.split(':', 1)]
            if key == 'name':
                finish(current)
                current = {}
            current[key] = value
        else:
            raise ValueError('Remote file too large')
    finish(current)
    if not commands:
        raise ValueError('No supported commands')
    return commands, rejected
