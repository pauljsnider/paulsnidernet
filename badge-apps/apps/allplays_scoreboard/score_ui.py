"""Small focus model and server-driven command construction."""
BUTTONS = ('Us +1', 'Us -1', 'Start/Pause', 'Them +1', 'Them -1', 'Period', 'Undo', 'Games', 'Refresh')

def move(index, dx, dy, count, columns=3):
    row, col = divmod(index, columns)
    candidate = (row + dy) * columns + col + dx
    if col + dx < 0 or col + dx >= columns or row + dy < 0 or candidate >= count:
        return index
    return candidate

def command(index, state):
    base = {'revision': state.get('revision', 0)}
    if index in (0, 1, 3, 4):
        base.update(action='score', side='homeScore' if index < 3 else 'awayScore', delta=1 if index in (0, 3) else -1)
    elif index == 2:
        base.update(action='clock', running=not state.get('liveClockRunning', False))
    elif index == 6:
        base.update(action='undo')
    else:
        return None
    return base

def elapsed_ms(state, since_sync):
    return max(0, int(state.get('liveClockMs', 0))) + (max(0, since_sync) if state.get('liveClockRunning') else 0)
