# NES / Super Mario Bros.

Play NES games on the GitHub Universe 2026 badge using the spf13 MicroPython emulator.

## Install

1. Download this repository as a ZIP and extract it.
2. Connect the badge by USB and open its storage drive.
3. Copy this entire `nes` folder into the drive's `apps` folder, keeping the folder name `nes`.
4. Place your original NES Super Mario Bros. iNES ROM in `apps/nes/roms/smb.nes`. Extract ZIP archives first. ROMs are not included.
5. Safely eject the drive, open NES in the badge launcher, and select Super Mario Bros.

This targets the custom Universe 2026 RP2350 badge with MonaOS 4.0. The drive path `apps/nes` appears internally as `/system/apps/nes`. No firmware replacement is required.

## Controls

Hold the badge upside down so the capacitive controls are below the display. Use the directional pad to move, A to jump, B to run, touch HOME for Start, and touch MENU for Select. Hold A+B or Start+Select for about 0.6 seconds to open the emulator menu. Physical HOME saves state and exits.

## Compatibility and validation

Start with the original NES Super Mario Bros., mapper 0 / NROM. SNES Super Mario World, Nintendo 64 games, ZIP files, and headerless ROM dumps are not compatible. Upstream supports NES mappers 0, 1, 2 and 3. This integration rejects malformed headers, NES 2.0 files and unsupported mappers, and skips iNES trainers correctly.

Python syntax and ROM parsing tests were checked on the development host. Gameplay, speed, controls and save-state reliability still require testing on a physical badge. This is an emulator integration, not a claim of hardware-tested gameplay. No audio output is configured.

## Source and license

Vendored from https://github.com/spf13/universe-2026-badge-hacks at commit `fd83dde7ac6562ac8a440fa6d39b4f980b5a2239`. MIT copyright 2026 Steve Francia; see LICENSE. Upstream branding assets are preserved. Local changes: installation documentation and defensive iNES validation. Game ROMs and save files must stay out of this public repository.
