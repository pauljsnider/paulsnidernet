"""Small, bounded Roku ECP client for MicroPython. No third-party dependencies."""
import socket
import time

KEYS = ('Up', 'Down', 'Left', 'Right', 'Select', 'Back', 'Home', 'Info', 'Play', 'Rev', 'Fwd', 'InstantReplay')

def ipv4(value):
    parts = value.split('.')
    if len(parts) != 4 or any(not p.isdigit() or not 0 <= int(p) <= 255 for p in parts):
        raise ValueError('Invalid IPv4 address')
    return '.'.join(str(int(p)) for p in parts)

def tag(xml, name):
    start = xml.find('<' + name + '>')
    end = xml.find('</' + name + '>', start)
    if start < 0 or end < 0:
        return ''
    result = xml[start + len(name) + 2:end]
    for a, b in (('&lt;', '<'), ('&gt;', '>'), ('&quot;', '"'), ('&apos;', "'"), ('&amp;', '&')):
        result = result.replace(a, b)
    return result

def device(xml, ip):
    identity = tag(xml, 'serial-number') or tag(xml, 'udn')
    if '<device-info>' not in xml or not identity or tag(xml, 'vendor-name') != 'Roku':
        raise ValueError('Not a verified Roku')
    return {'ip': ipv4(ip), 'id': identity, 'name': tag(xml, 'user-device-name') or tag(xml, 'friendly-device-name') or tag(xml, 'model-name') or 'Roku'}

def clock_ms():
    return time.ticks_ms() if hasattr(time, 'ticks_ms') else int(time.monotonic() * 1000)

def elapsed(start):
    return time.ticks_diff(clock_ms(), start) if hasattr(time, 'ticks_diff') else clock_ms() - start

def request(ip, path, method='GET'):
    ip = ipv4(ip)
    sock = socket.socket()
    try:
        sock.settimeout(1)
        sock.connect((ip, 8060))
        data = ('%s %s HTTP/1.0\r\nHost: %s:8060\r\nContent-Length: 0\r\nConnection: close\r\n\r\n' % (method, path, ip)).encode()
        while data:
            count = sock.send(data)
            if not count:
                raise OSError('Connection closed')
            data = data[count:]
        response = b''
        started = clock_ms()
        # Finite number of reads even for a peer that keeps streaming.
        for _ in range(32):
            if elapsed(started) > 2000:
                raise OSError("Response timed out")
            chunk = sock.recv(1024)
            if not chunk:
                break
            response += chunk
            if len(response) > 16384:
                raise ValueError('Response too large')
        else:
            raise ValueError('Response incomplete')
        head, body = response.split(b'\r\n\r\n', 1)
        status = int(head.split(b' ')[1])
        if status == 403:
            raise ValueError('Enable Roku mobile app control')
        if status != 200:
            raise ValueError('Roku HTTP %d' % status)
        return body.decode('utf-8')
    finally:
        sock.close()

def inspect(ip):
    return device(request(ip, '/query/device-info'), ip)

def press(target, key):
    if key not in KEYS:
        raise ValueError('Unknown key')
    # DHCP reassignment must never silently send to a different Roku.
    current = inspect(target['ip'])
    if current['id'] != target['id']:
        raise ValueError('Device changed; choose again')
    request(target['ip'], '/keypress/' + key, 'POST')

class Discovery:
    def __init__(self):
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.seen = set()
        try:
            self.sock.settimeout(0)
            self.sock.bind(('0.0.0.0', 0))
            self.sock.sendto(b'M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\nMAN: "ssdp:discover"\r\nMX: 2\r\nST: roku:ecp\r\n\r\n', ('239.255.255.250', 1900))
        except Exception:
            self.close()
            raise

    def poll(self):
        try:
            packet, peer = self.sock.recvfrom(2048)
        except OSError:
            return None
        if b'roku:ecp' not in packet.lower() or peer[0] in self.seen:
            return None
        self.seen.add(peer[0])
        return ipv4(peer[0])

    def close(self):
        if self.sock:
            self.sock.close()
            self.sock = None
