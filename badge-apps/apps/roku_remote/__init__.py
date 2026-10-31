import os
import sys
import time
import network
APP_DIR = '/system/apps/roku_remote'
os.chdir(APP_DIR)
sys.path.insert(0, APP_DIR)
from badgeware import State
from roku_net import Discovery, inspect, press
from remote_layout import BUTTONS, enabled, move

badge.mode(HIRES | VSYNC)
screen.font = font.nope
state = {'last_id': ''}
try:
    State.load('roku_remote', state)
except (OSError, ValueError, TypeError):
    pass
wlan = network.WLAN(network.STA_IF)
mode = 'start'
message = 'Starting Wi-Fi...'
started = 0
scan = None
devices = []
selected = 0
target = None
pending = None
octets = [192, 168, 1, 1]
part = 0
focus = 4

def connect():
    global mode, message, started, target
    target = None
    try:
        wlan.active(True)
        if wlan.isconnected():
            discover()
            return
        import secrets
        ssid = getattr(secrets, 'WIFI_SSID', '')
        password = getattr(secrets, 'WIFI_PASSWORD', '')
        if not ssid:
            raise ValueError('Set Wi-Fi in badge Settings')
        wlan.connect(ssid, password)
        started = time.ticks_ms()
        mode = 'wifi'
        message = 'Connecting to saved Wi-Fi'
    except Exception:
        mode = 'error'
        message = 'Set Wi-Fi in badge Settings'

def discover():
    global scan, devices, selected, mode, started, message, target
    if scan:
        scan.close()
    target = None
    devices = []
    selected = 0
    mode = 'scan'
    started = time.ticks_ms()
    message = 'Searching your network...'
    scan = Discovery()

def add_device(ip):
    found = inspect(ip)
    if not any(d['id'] == found['id'] for d in devices):
        devices.append(found)
        devices.sort(key=lambda d: (d['id'] != state.get('last_id'), d['name'], d['ip']))

def choose():
    global target, mode, message, focus
    candidate = devices[selected]
    current = inspect(candidate['ip'])
    if current['id'] != candidate['id']:
        raise ValueError('Device changed; rescan')
    target = current
    focus = 4
    state['last_id'] = target['id']
    message = 'Connected to selected Roku'
    try:
        State.save('roku_remote', state)
    except OSError:
        message = 'Connected; preference not saved'
    mode = 'remote'

def update():
    global mode, message, scan, selected, pending, part, target, focus
    try:
        if mode == 'start':
            connect()
        elif mode == 'wifi':
            if wlan.isconnected():
                discover()
            elif wlan.status() < 0 or time.ticks_diff(time.ticks_ms(), started) > 20000:
                wlan.disconnect()
                mode = 'error'
                message = 'Wi-Fi failed; check Settings'
        elif mode not in ('error',) and not wlan.isconnected():
            if scan:
                scan.close()
                scan = None
            pending = None
            connect()
        elif mode == 'scan':
            ip = scan.poll()
            if ip and len(devices) < 32:
                try:
                    add_device(ip)
                except (OSError, ValueError):
                    pass
            if time.ticks_diff(time.ticks_ms(), started) > 5000:
                scan.close()
                scan = None
                mode = 'devices'
                message = 'Choose your Roku' if devices else 'No Rokus found; try manual IP'
        elif pending:
            key = pending
            pending = None
            press(target, key)
            message = 'Sent ' + key
        elif mode == 'error':
            if badge.pressed(BUTTON_SELECT):
                connect()
        elif mode == 'devices':
            count = len(devices) + 2
            selected = (selected + int(badge.pressed(BUTTON_DOWN)) - int(badge.pressed(BUTTON_UP))) % count
            if badge.pressed(BUTTON_SELECT):
                if selected < len(devices):
                    choose()
                elif selected == len(devices):
                    discover()
                else:
                    mode = 'manual'
                    part = 0
                    message = 'Enter IP from Roku About'
        elif mode == 'manual':
            if badge.pressed(BUTTON_BACK):
                mode = 'devices'
                selected = 0
            else:
                part = (part + int(badge.pressed(BUTTON_RIGHT)) - int(badge.pressed(BUTTON_LEFT))) % 4
                octets[part] = (octets[part] + int(badge.pressed(BUTTON_UP)) - int(badge.pressed(BUTTON_DOWN))) % 256
                if badge.pressed(BUTTON_SELECT):
                    add_device('.'.join(str(n) for n in octets))
                    mode = 'devices'
                    selected = 0
                    message = 'Choose verified Roku'
        elif mode == 'remote':
            for button, direction in ((BUTTON_UP, 'Up'), (BUTTON_DOWN, 'Down'), (BUTTON_LEFT, 'Left'), (BUTTON_RIGHT, 'Right')):
                if badge.pressed(button):
                    focus = move(focus, direction, target)
                    break
            if badge.pressed(BUTTON_SELECT):
                item = BUTTONS[focus]
                if enabled(item, target):
                    if item[1] is None:
                        discover()
                    else:
                        pending = item[1]
                        message = 'Sending ' + item[0]
    except (OSError, ValueError) as exc:
        pending = None
        message = str(exc)[:44] if isinstance(exc, ValueError) else 'Network error; retry or rescan'
        if mode in ('start', 'wifi', 'scan'):
            if scan:
                scan.close()
                scan = None
            mode = 'error'
    draw()

def draw():
    screen.pen = color.rgb(17, 12, 32)
    screen.rectangle(screen.clip)
    screen.pen = color.rgb(185, 140, 255)
    screen.text('ROKU WI-FI REMOTE', 10, 8)
    screen.pen = color.rgb(245, 240, 255)
    if mode == 'devices':
        rows = [d['name'][:19] + ' ' + d['ip'] for d in devices] + ['Scan again', 'Enter IP manually']
        for i in range((selected // 5) * 5, min(len(rows), (selected // 5) * 5 + 5)):
            screen.text(('> ' if i == selected else '  ') + rows[i][:38], 8, 48 + (i % 5) * 27)
        hint = 'Up/Down choose; Select confirm'
    elif mode == 'remote':
        screen.text(target['name'][:22] + ' ' + target['ip'], 8, 27)
        screen.pen = color.rgb(43, 29, 65)
        screen.shape(shape.rounded_rectangle(5, 46, 310, 151, 10))
        for i, item in enumerate(BUTTONS):
            x, y = 11 + item[2] * 101, 51 + item[3] * 24
            active = enabled(item, target)
            screen.pen = color.rgb(99, 240, 207) if i == focus else color.rgb(83, 48, 130) if active else color.rgb(40, 35, 48)
            screen.shape(shape.rounded_rectangle(x, y, 96, 21, 5))
            screen.pen = color.rgb(16, 20, 30) if i == focus else color.rgb(255, 255, 255) if active else color.rgb(105, 100, 115)
            width, _ = screen.measure_text(item[0])
            screen.text(item[0], x + (96 - width) // 2, y + 4)
        hint = 'Arrows move; Select sends; Home exit'
    elif mode == 'manual':
        screen.text('.'.join(('[' + str(n) + ']') if i == part else str(n) for i, n in enumerate(octets)), 10, 80)
        screen.text('Left/Right: select number', 10, 120)
        screen.text('Up/Down: change number', 10, 148)
        hint = 'Select verify; Back cancel'
    else:
        screen.text('Wi-Fi: ' + ('connected' if wlan.isconnected() else 'not connected'), 10, 65)
        screen.text('Uses saved badge Wi-Fi settings', 10, 100)
        if mode == 'error':
            screen.text('Home > Settings > Wi-Fi', 10, 140)
        hint = 'Select retry; Home exit' if mode == 'error' else 'Please wait; Home exits'
    screen.pen = color.rgb(185, 180, 205)
    screen.text(message[:42], 8, 202)
    screen.text(hint[:42], 8, 224)

def on_exit():
    if scan:
        scan.close()
    # Keep the shared Wi-Fi connection available to the badge launcher.

run(update)
on_exit()
