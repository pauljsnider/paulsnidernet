# Universal Remote

Control infrared TVs from a Universe 2026 badge using selectable remote profiles and importable Flipper IR files.

Prototype v0.1: implemented and host-tested, not yet validated on a physical badge or TV.

## Use

Left/Right selects a remote profile. Up/Down selects a command. Select transmits it. Home returns to the badge launcher. There is no automatic broadcast, power-code scan or hold-to-repeat. Sony sends its required three-frame sequence per selection. Last selected profile is saved using Badgeware State. No network or extra hardware is needed for transmission.

Included profiles: LG 32LN5406, a generic Samsung profile, and SonyTV. These are community profiles, not promises of compatibility with every model from those brands. Their available buttons differ. Additional models can be added as .ir files alongside __init__.py (up to 64 profiles and 100 supported commands per file). Long file names should be shortened for the display.

Supported parsed formats: NEC, NECext, Samsung32, SIRC, SIRC15, SIRC20. Also supports raw mark/space records with 30-60 kHz carrier, at most 512 timings, and frames no longer than 100 ms. Unsupported commands are skipped with a visible count. Carrier duty for raw commands is fixed at one third. Raw files with longer gaps/frames are rejected. Air conditioner protocols, RF/Bluetooth commands, and IR learning are not implemented.

## Install

1. Back up the badge's files. Use the current Universe 2026 USB disk-mode procedure:
   https://github.com/badger/home/blob/main/hardware/USB_SERIAL.md
2. Copy this entire universal_remote directory into the badge drive's apps directory. Its runtime path must be /system/apps/universal_remote/.
3. Safely eject, reboot, and open Universal Remote from the launcher.
4. Point the badge's IR LEDs at your TV and try one command. Use another profile if it does not respond.

No firmware replacement is included. The code expects the 2026 runtime, machine.PWM and machine.Pin. A missing hardware module gives a preview-only mode. A real transmitter failure displays an error rather than claiming success. 'Sending' means a waveform was requested, not that the TV acknowledged it.

## Implementation and validation limits

Uses GPIO16, documented as the active-high IR transmitter MOSFET in the Universe 2026 schematic. It does not alter the IR receiver or power-control pins. A hardware PWM supplies the 38/40 kHz carrier. A short, bounded software loop gates one frame at a time; Sony repeats are scheduled across updates. Frames can pause UI updates for up to 100 ms. Firmware interrupt latency may distort pulse timing. This must be measured on the badge; do not treat host tests as proof of optical output or range.

The app deinitializes PWM and drives GPIO16 low on exit and after transmitter errors. It does not reserve PIO state machines, because ownership by the badge display/wireless/IR firmware has not been established. Existing firmware ownership of GPIO16 must also be checked on-device. If the waveform is unstable, the next step is a firmware-aware PIO transmitter after confirming resource allocation.

Eight host tests cover known wire encodings, bounds, all included profiles, malformed input, and UI navigation/send dispatch using runtime mocks. The actual badge simulator and physical hardware were unavailable. Physical checklist: launch and exit; check IR idle low; measure carrier and NEC/Samsung/Sony timing; confirm each command on TVs; test both badge orientations; verify display, Wi-Fi and menu still work after exit.

## Sources and attribution

Profiles from Lucaslhm/Flipper-IRDB under CC0, included in ../../Flipper-IRDB-LICENSE.txt:
- https://github.com/Lucaslhm/Flipper-IRDB/blob/main/TVs/LG/LG_32LN5406.ir
- https://github.com/Lucaslhm/Flipper-IRDB/blob/main/TVs/Samsung/Samsung.ir
- https://github.com/Lucaslhm/Flipper-IRDB/blob/main/TVs/Sony/SonyTV.ir

Samsung Ch_next was removed: the source assigns it the same code as Ch_prev. Other command data is preserved. No service/factory reset profile is included.

Hardware and runtime references:
- https://github.com/badger/home/blob/main/hardware/README.md
- https://github.com/badger/home/blob/main/badge/AGENTS.md

Related open-source driver researched: https://github.com/peterhinch/micropython_ir (MIT). Its PIO-backed transmitter is not bundled because its default state-machine ownership needs checking against this badge firmware. This app's PWM backend and encoders are original code.
