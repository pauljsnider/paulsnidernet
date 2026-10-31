"""Verified HTTPS client. No Firebase password or admin credentials on the badge."""
import socket
import ssl
import json
import time

HOST = 'us-central1-game-flow-c6311.cloudfunctions.net'
PATH = '/badgeScoreController'

class ApiError(Exception):
    def __init__(self, status, message):
        self.status = status
        super().__init__(message)

class Client:
    def __init__(self, config, root_file):
        if config.get('host') != HOST or config.get('path') != PATH:
            raise ValueError('Invalid AllPlays endpoint')
        token = config.get('token', '')
        if len(token) != 64 or any(c not in '0123456789abcdef' for c in token):
            raise ValueError('Invalid pairing file')
        self.token = token
        self.tls = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        self.tls.verify_mode = ssl.CERT_REQUIRED
        self.tls.load_verify_locations(cafile=root_file)

    def call(self, payload):
        if time.gmtime()[0] < 2026:
            raise ValueError('Set badge clock before connecting')
        raw = socket.socket()
        secure = None
        try:
            raw.settimeout(5)
            raw.connect(socket.getaddrinfo(HOST, 443, 0, socket.SOCK_STREAM)[0][-1])
            secure = self.tls.wrap_socket(raw, server_hostname=HOST)
            body = json.dumps(payload).encode()
            header = ('POST %s HTTP/1.0\r\nHost: %s\r\nAuthorization: Bearer %s\r\nContent-Type: application/json\r\nContent-Length: %d\r\nConnection: close\r\n\r\n' % (PATH, HOST, self.token, len(body))).encode()
            data = header + body
            while data:
                n = secure.write(data)
                if not n:
                    raise OSError('Connection closed')
                data = data[n:]
            response = b''
            start = time.ticks_ms()
            while True:
                if time.ticks_diff(time.ticks_ms(), start) > 15000:
                    raise OSError('Response timed out')
                part = secure.read(1024)
                if not part:
                    break
                response += part
                if len(response) > 32768:
                    raise ValueError('Response too large')
            head, body = response.split(b'\r\n\r\n', 1)
            status = int(head.split(b' ')[1])
            if b'transfer-encoding: chunked' in head.lower():
                decoded = b''
                while True:
                    size, body = body.split(b'\r\n', 1)
                    size = int(size.split(b';')[0], 16)
                    if size == 0:
                        break
                    if len(body) < size + 2:
                        raise OSError('Incomplete response')
                    decoded += body[:size]
                    body = body[size+2:]
                body = decoded
            result = json.loads(body)
            if status != 200:
                raise ApiError(status, result.get('error', 'AllPlays unavailable'))
            return result
        finally:
            if secure:
                secure.close()
            raw.close()
