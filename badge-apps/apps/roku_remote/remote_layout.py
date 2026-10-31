"""Visual remote geometry and directional focus, independent of badge hardware."""
# Label, ECP key (None means device picker), column, row, capability.
BUTTONS = (
    ('Home', 'Home', 0, 0, None), ('Up', 'Up', 1, 0, None), ('Back', 'Back', 2, 0, None),
    ('Left', 'Left', 0, 1, None), ('OK', 'Select', 1, 1, None), ('Right', 'Right', 2, 1, None),
    ('Replay', 'InstantReplay', 0, 2, None), ('Down', 'Down', 1, 2, None), ('Options', 'Info', 2, 2, None),
    ('Rewind', 'Rev', 0, 3, None), ('Play/Pause', 'Play', 1, 3, None), ('Forward', 'Fwd', 2, 3, None),
    ('Vol -', 'VolumeDown', 0, 4, 'volume'), ('Mute', 'VolumeMute', 1, 4, 'volume'), ('Vol +', 'VolumeUp', 2, 4, 'volume'),
    ('Power off', 'PowerOff', 0, 5, 'power'), ('Change Roku', None, 1, 5, None),
)

def enabled(button, device):
    return button[4] is None or bool(device.get(button[4], False))

def move(index, direction, device):
    """Pick nearest enabled button in requested half-plane; stop at edges."""
    x, y = BUTTONS[index][2:4]
    dx, dy = {'Left': (-1, 0), 'Right': (1, 0), 'Up': (0, -1), 'Down': (0, 1)}[direction]
    candidates = []
    for i, button in enumerate(BUTTONS):
        if i == index or not enabled(button, device):
            continue
        ox, oy = button[2] - x, button[3] - y
        forward = ox * dx + oy * dy
        if forward > 0:
            sideways = abs(ox * dy - oy * dx)
            candidates.append((sideways * 10 + forward, i))
    return min(candidates)[1] if candidates else index
