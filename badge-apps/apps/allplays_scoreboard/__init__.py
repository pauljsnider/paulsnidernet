import os
import sys
import time
import json
import binascii
import network
APP_DIR = '/system/apps/allplays_scoreboard'
os.chdir(APP_DIR)
sys.path.insert(0, APP_DIR)
from badgeware import State
from score_client import Client, ApiError
from score_ui import BUTTONS, move, command, elapsed_ms

badge.mode(HIRES | VSYNC)
screen.font = font.nope
logo = image.load(APP_DIR + '/icon.png')
wlan = network.WLAN(network.STA_IF)
client = None
mode = 'boot'
message = 'Connecting to saved Wi-Fi'
started = 0
last_sync = 0
focus = 0
games = []
current = {}
store = {'pending': None, 'gameId': ''}
try:
    State.load('allplays_scoreboard', store)
except (OSError, ValueError):
    pass
pending = store.get('pending')
job = None
periods = []
team_name = 'ALL PLAYS'

def persist():
    store['pending'] = pending
    if State.save('allplays_scoreboard', store) is False:
        raise ValueError('Cannot save retry state; free storage')

def schedule(action, **kwargs):
    global job, message
    job = dict(action=action, **kwargs)
    message = 'Connecting to AllPlays...'

def connect():
    global mode, started, message
    wlan.active(True)
    if not wlan.isconnected():
        import secrets
        ssid = getattr(secrets, 'WIFI_SSID', '')
        if not ssid:
            raise ValueError('Set Wi-Fi in badge Settings')
        wlan.connect(ssid, getattr(secrets, 'WIFI_PASSWORD', ''))
    mode = 'wifi'
    started = time.ticks_ms()
    message = 'Connecting to saved Wi-Fi'

def set_state(result):
    global current, last_sync, periods
    current = result
    last_sync = time.ticks_ms()
    periods = result.get('periods', ['Q1','Q2','Q3','Q4','OT'])

def queue_command(payload):
    global pending, mode, message
    payload.update(sessionId=current.get('sessionId'), gameId=store['gameId'], requestId=binascii.hexlify(os.urandom(16)).decode())
    pending = payload
    # Persist before any network side effect so a reboot can retry the SAME ID.
    persist()
    mode = 'sending'
    message = 'Sending update...'

def process():
    global job, pending, mode, focus, games, message, team_name
    payload = pending if mode == 'sending' else job
    if not payload:
        return
    if mode == 'sending':
        persist()
    result = client.call(payload)
    action = payload['action']
    if mode == 'sending':
        pending = None
        persist()
        set_state(result)
        mode = 'remote'
        message = 'Update saved'
    elif action == 'games':
        games = result.get('games', [])
        team_name = result.get('team', 'ALL PLAYS')
        mode = 'games'
        focus = 0
        message = 'Choose game' if games else 'No games in next 14 days'
    elif action in ('claim', 'state'):
        set_state(result)
        mode = 'remote'
        message = 'Scoreboard ready'
        if action == 'claim':
            focus = 2
    elif action == 'release':
        store['gameId'] = ''
        persist()
        schedule('games')
        mode = 'loading'
        return
    job = None

def update():
    global mode, client, message, job, focus, pending
    try:
        if mode == 'boot':
            connect()
        elif mode == 'wifi':
            if wlan.isconnected():
                # Certificate verification requires a correct RTC. No insecure fallback.
                import ntptime
                ntptime.timeout = 3
                ntptime.settime()
                with open(APP_DIR + '/controller.json') as fp:
                    config = json.load(fp)
                client = Client(config, APP_DIR + '/roots.pem')
                if pending:
                    mode = 'retry'
                    message = 'Unconfirmed update: Select retry'
                else:
                    schedule('games')
                    mode = 'loading'
            elif wlan.status() < 0 or time.ticks_diff(time.ticks_ms(), started) > 20000:
                wlan.disconnect()
                raise ValueError('Wi-Fi failed; check Settings')
        elif mode in ('loading', 'sending'):
            process()
        elif mode in ('error', 'retry'):
            if badge.pressed(BUTTON_SELECT):
                if not wlan.isconnected() or client is None:
                    connect()
                elif pending:
                    mode = 'sending'
                elif job:
                    mode = 'loading'
                else:
                    schedule('games')
                    mode = 'loading'
        else:
            if not wlan.isconnected():
                connect()
            else:
                dx = int(badge.pressed(BUTTON_RIGHT)) - int(badge.pressed(BUTTON_LEFT))
                dy = int(badge.pressed(BUTTON_DOWN)) - int(badge.pressed(BUTTON_UP))
                if mode == 'games':
                    focus = max(0, min(len(games), focus + dx + dy))
                    if badge.pressed(BUTTON_SELECT):
                        if focus == len(games):
                            schedule('games'); mode = 'loading'
                        else:
                            store['gameId'] = games[focus]['id']
                            persist(); mode = 'claim'; focus = 0
                            message = 'Pause/close other trackers first'
                elif mode == 'claim':
                    focus = move(focus, dx, dy, 2, 2)
                    if badge.pressed(BUTTON_SELECT):
                        schedule('claim', gameId=store['gameId']) if focus == 0 else schedule('games')
                        mode = 'loading'
                elif mode == 'period':
                    focus = move(focus, dx, dy, len(periods) + 1)
                    if badge.pressed(BUTTON_SELECT):
                        if focus == len(periods):
                            mode = 'remote'; focus = 5
                        else:
                            queue_command({'action':'period', 'period':periods[focus], 'revision':current['revision']})
                            focus = 5
                elif mode == 'release':
                    focus = move(focus, dx, dy, 2, 2)
                    if badge.pressed(BUTTON_SELECT):
                        if focus == 0:
                            schedule('release', gameId=store['gameId'], sessionId=current.get('sessionId')); mode = 'loading'
                        else:
                            mode = 'remote'; focus = 7
                elif mode == 'remote':
                    focus = move(focus, dx, dy, len(BUTTONS))
                    if badge.pressed(BUTTON_SELECT):
                        payload = command(focus, current)
                        if payload:
                            if focus == 6 and not current.get('canUndo'):
                                message = 'Nothing to undo'
                            else:
                                queue_command(payload)
                        elif focus == 5:
                            mode = 'period'; focus = 0
                        elif focus == 7:
                            mode = 'release'; focus = 1
                        else:
                            schedule('state', gameId=store['gameId']); mode = 'loading'
                    elif time.ticks_diff(time.ticks_ms(), last_sync) > 15000:
                        schedule('state', gameId=store['gameId']); mode = 'loading'
    except ApiError as exc:
        if exc.status in (400, 409) and pending:
            pending = None
            persist()
            schedule('state', gameId=store['gameId'])
        message = str(exc)
        mode = 'retry' if pending else 'error'
    except Exception as exc:
        message = str(exc) if isinstance(exc, ValueError) else 'Connection/setup failed. Select retry'
        mode = 'retry' if pending else 'error'
    draw()

def text_fit(text, x, y, width):
    text = str(text)
    while text and screen.measure_text(text)[0] > width:
        text = text[:-1]
    screen.text(text, x, y)

def tiles(labels, y=100, columns=3):
    page_size = 9
    first = focus // page_size * page_size
    width = (screen.width - 16) // columns
    for i in range(first, min(len(labels), first + page_size)):
        x = 8 + ((i-first) % columns) * width
        top = y + ((i-first) // columns) * 28
        screen.pen = color.rgb(79,70,229) if i == focus else color.rgb(224,231,255)
        screen.shape(shape.rounded_rectangle(x, top, width-4, 24, 5))
        screen.pen = color.rgb(255,255,255) if i == focus else color.rgb(49,46,129)
        text_fit(labels[i], x+5, top+6, width-14)

def draw():
    screen.pen = color.rgb(238,242,255)
    screen.rectangle(screen.clip)
    screen.blit(logo, rect(8, 6, 28, 28))
    screen.pen = color.rgb(49,46,129)
    screen.text('ALL PLAYS', 43, 8)
    screen.text('SCOREBOARD', 43, 23)
    if mode == 'remote' or (current and (mode in ('sending','retry') or (mode == 'loading' and job and job.get('action') == 'state'))):
        text_fit(current.get('team', 'Us'), 8, 43, 145)
        text_fit(current.get('opponent', 'Them'), 165, 43, 145)
        screen.text(str(current.get('homeScore', 0)) + '  -  ' + str(current.get('awayScore', 0)), 125, 62)
        elapsed = elapsed_ms(current, time.ticks_diff(time.ticks_ms(), last_sync)) // 1000
        screen.text('%02d:%02d  %s  %s' % (elapsed//60, elapsed%60, current.get('liveClockPeriod',''), 'RUN' if current.get('liveClockRunning') else 'PAUSED'), 65, 80)
        labels = list(BUTTONS)
        labels[2] = 'Pause' if current.get('liveClockRunning') else 'Start'
        tiles(labels)
    elif mode == 'games':
        text_fit(team_name, 8, 43, 304)
        labels = [g['date'][5:16].replace('T',' ') + 'Z ' + g['opponent'] for g in games] + ['Refresh games']
        first = (focus // 4) * 4
        for i in range(first, min(len(labels), first+4)):
            screen.pen = color.rgb(79,70,229) if i == focus else color.rgb(224,231,255)
            screen.shape(shape.rounded_rectangle(8, 65+(i-first)*29, 304, 26, 5))
            screen.pen = color.rgb(255,255,255) if i == focus else color.rgb(49,46,129)
            text_fit(labels[i], 14, 72+(i-first)*29, 292)
    elif mode == 'claim':
        text_fit('Take scoreboard control?', 8, 55, 304)
        tiles(['Take control','Cancel'], 95, 2)
    elif mode == 'release':
        text_fit('Pause clock and release control?', 8, 55, 304)
        tiles(['Release','Cancel'], 95, 2)
    elif mode == 'period':
        text_fit('Choose period (pauses clock)', 8, 55, 304)
        tiles(periods + ['Cancel'], 85)
    else:
        text_fit('Wi-Fi: ' + ('connected' if wlan.isconnected() else 'connecting'), 8, 65, 304)
        text_fit('Setup: allplays.ai/badge-controller.html', 8, 95, 304)
        text_fit('Missing Wi-Fi? Home > Settings', 8, 125, 304)
        text_fit('Select retries; Home exits', 8, 155, 304)
    screen.pen = color.rgb(49,46,129)
    text_fit(message, 8, 200, 304)
    text_fit('Arrows move | Select activate | Home exit', 8, 224, 304)

def on_exit():
    # Clock is server-based and keeps running; release explicitly to hand off.
    pass

run(update)
