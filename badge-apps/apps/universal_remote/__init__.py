import os
import sys
APP_DIR = '/system/apps/universal_remote'
os.chdir(APP_DIR)
sys.path.insert(0, APP_DIR)
from badgeware import State
from remote_core import load_remote

badge.mode(HIRES | VSYNC)
screen.font = font.nope
files = sorted(n for n in os.listdir('.') if n.endswith('.ir'))[:64]
state = {'remote': ''}
try:
    State.load('universal_remote', state)
except (OSError, ValueError, TypeError):
    pass
profile = files.index(state.get('remote')) if state.get('remote') in files else 0
selected = 0
commands = []
message = 'Choose a command'
transmitter = None
try:
    from remote_tx import Transmitter
    transmitter = Transmitter()
except (ImportError, AttributeError):
    message = 'Preview only: no IR hardware'

def load_profile():
    global commands, selected, message
    selected = 0
    if not files:
        message = 'Add .ir files to app folder'
        return
    try:
        commands, skipped = load_remote(files[profile])
        message = str(skipped) + ' unsupported keys' if skipped else 'Select sends; point at TV'
    except (ValueError, OSError) as exc:
        commands = []
        message = str(exc)[:40]
    state['remote'] = files[profile]
    try:
        State.save('universal_remote', state)
    except (OSError, ValueError):
        message = 'Profile loaded; save failed'

load_profile()

def update():
    global profile, selected, message
    if transmitter:
        try:
            transmitter.poll()
        except Exception:
            transmitter.close()
            message = 'IR error: check firmware'
    busy = transmitter and transmitter.remaining
    if files and not busy:
        change = int(badge.pressed(BUTTON_RIGHT)) - int(badge.pressed(BUTTON_LEFT))
        if change:
            profile = (profile + change) % len(files)
            load_profile()
        if commands:
            move = int(badge.pressed(BUTTON_DOWN)) - int(badge.pressed(BUTTON_UP))
            selected = (selected + move) % len(commands)
            if badge.pressed(BUTTON_SELECT):
                if transmitter:
                    try:
                        transmitter.start(commands[selected])
                        message = 'Sending ' + commands[selected]['name']
                    except Exception:
                        transmitter.close()
                        message = 'IR unavailable on firmware'
                else:
                    message = 'Preview: ' + commands[selected]['name']
    screen.pen = color.rgb(12, 18, 30)
    screen.rectangle(screen.clip)
    screen.pen = color.rgb(70, 210, 190)
    screen.text('UNIVERSAL REMOTE', 10, 8)
    screen.pen = color.rgb(245, 245, 250)
    screen.text(('< ' + files[profile][:-3] + ' >')[:36] if files else 'No profiles', 10, 30)
    first = (selected // 6) * 6
    for i, command in enumerate(commands[first:first+6]):
        y = 58 + i*21
        if first+i == selected:
            screen.pen = color.rgb(35, 70, 90)
            screen.shape(shape.rectangle(6, y-2, screen.width-12, 20))
        screen.pen = color.rgb(255, 255, 255)
        screen.text(('> ' if first+i == selected else '  ') + command['name'][:30], 10, y)
    screen.pen = color.rgb(160, 180, 195)
    screen.text(message[:40], 10, 194)
    screen.text('L/R profile   Up/Down key', 10, 212)
    screen.text('Select send   Home exit', 10, 226)

def on_exit():
    if transmitter:
        transmitter.close()

run(update)
on_exit()
