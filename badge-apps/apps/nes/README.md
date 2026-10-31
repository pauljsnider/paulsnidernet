# NES / Super Mario Bros.

Play NES games on the GitHub Universe 2026 badge using the spf13 MicroPython emulator.

## Requirements

- Custom GitHub Universe 2026 RP2350 badge with compatible MonaOS 4.0 / badge firmware. This app depends on the firmware's MicroPython Viper support, graphics APIs, badge controls and launcher.
- Computer with a USB port and a USB-C **data-capable** cable.
- This complete `nes` app folder, plus an extracted original NES Super Mario Bros. iNES ROM.
- Available app storage and writable state storage. The emulator code and assets occupy about 100 KB, plus documentation and ROMs. Leave additional space in the separate state partition for saves.

The badge does **not** download dependencies or games automatically. The Python emulator and graphics assets are included here; the badge firmware supplies the runtime. There is no pip installation on the badge, separate NES BIOS, account, or internet connection required to play. The ROM is supplied separately. The archive link below is a reference for you, not an automatic installer.

## Install on the badge

1. On your computer, [download the repository ZIP](https://github.com/pauljsnider/paulsnidernet/archive/refs/heads/main.zip) and extract it. Open `paulsnidernet-main/badge-apps/apps/` to find the `nes` folder.
2. Connect the powered-on badge to your computer with the USB data cable.
3. From the badge home menu, launch **USB Disk** / **Mass Storage**. Wait for the removable drive, usually named **BADGER**, to appear in Finder or File Explorer. Connecting the cable alone may only expose the serial interface.
4. Copy the **entire `nes` folder** into `apps` on that drive. Keep the folder name `nes`. Do not copy the repository ZIP, nest it as `apps/nes/nes`, or create a `system` folder on the drive. The drive root already corresponds to the badge's internal `/system`.
5. Extract the game archive on your computer. Rename the original NES Super Mario Bros. `.nes` file to **`smb.nes`**, and copy it into `apps/nes/roms/` on the badge. Make sure it is not `smb.nes.zip` or `smb.nes.nes`. Renaming an incompatible game format does not convert it.
6. Check the files below are present, wait for copying to finish, then **safely eject** the badge drive.
7. Press the badge reset control to leave USB Disk mode and return to the normal launcher.
8. Open **NES**. Highlight **Super Mario Bros.** with the directional controls, then press A, B, or touch HOME to launch it. Touch HOME again for the game's Start button.

### Files to verify

Paths are relative to the badge USB drive:

| Path | Purpose |
| --- | --- |
| `apps/nes/__init__.py` | Launcher and controls |
| `apps/nes/emu.py` | NES emulator |
| `apps/nes/assets/spf13_logo.png` | Branding asset |
| `apps/nes/assets/spf13_wide.png` | Branding asset |
| `apps/nes/roms/smb.nes` | Game file you supply |
| `apps/nes/roms/PUT_NES_ROMS_HERE.txt` | ROM guidance |
| `apps/nes/README.md` and `LICENSE` | Instructions and attribution |

Copying the full folder includes everything except the game. No changes to the badge's `main.py`, Wi-Fi configuration, or firmware are part of this installation. If your firmware lacks the required APIs, consult the [badge project](https://github.com/badger/home) for the custom 2026 badge before changing firmware.

### First-run check and saves

Verify that the title screen appears, Start begins a game, movement works, A jumps, and B runs. Physical HOME is intended to save and return to the badge launcher. Reopen the same game to check that progress resumes.

The app creates `/state` if needed and writes `/state/nes_smb.state` internally. This state directory is separate from the USB drive's app folder. You do not need to create a save file or a `state` folder inside `apps/nes`. Save behavior still needs physical-device validation; do not assume progress was saved until you have tested resuming.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| No badge drive appears | Open USB Disk / Mass Storage on the badge; try a known data cable and another USB port. |
| Drive is named RPI-RP2 or RP2350 | You are in the firmware bootloader, not the app-storage drive. Reset normally and open USB Disk. Do not copy this app into the bootloader drive. |
| NES is missing from the launcher | Check `apps/nes/__init__.py`, remove accidental extra folder nesting, safely eject, and reset. |
| Game is listed but will not launch | The launcher can show known titles even when their ROMs are absent. Check that `apps/nes/roms/smb.nes` actually exists and is extracted. |
| Invalid iNES, NES 2.0, unsupported mapper, or truncated-ROM error | Use a complete original NES iNES dump. This emulator supports mappers 0, 1, 2 and 3, not every NES format or other consoles. |
| Missing `emu` module | Copy `emu.py` alongside `__init__.py`; keep the app folder named `nes`. |
| Missing badge, graphics, or Viper API / startup crash | Confirm compatible custom 2026 badge firmware. Launch through the badge launcher, not desktop Python or a bare REPL. Capture the exact error for diagnosis. |
| Cannot write to `/system/apps` using a serial tool | Normal REPL access mounts `/system` read-only. Use USB Disk mode to install persistently. |
| Save does not resume | Check writable state storage and free space. Keep the same ROM filename because it determines the save filename. |
| Game is slow | Frame Skip is enabled by default; leave CRT scanlines off. Performance has not been measured on this badge integration. |
| No sound | This integration has no configured audio output. |

For USB mode and serial diagnostics, see the badge project's [USB and storage guide](https://github.com/badger/home/blob/main/hardware/USB_SERIAL.md).

## Updating or removing

Exit the emulator before entering USB Disk mode. Back up your local ROMs before replacing `apps/nes`, and preserve them when copying an updated app. For a complete backup, save files must also be copied separately from the internal `/state` directory using the serial workflow in the linked guide. To uninstall, remove only `apps/nes` from the USB drive, safely eject, and reset. Internal saves remain until removed separately.

## ROM reference

[MiNERVA Archive | Directory Listing](https://share.google/C1nrdNEie3RyYKLd3) is the archive reference shared for this project. This is a directory listing, not a direct ROM download. ROM files are not bundled with this repository.

## Controls

Hold the badge upside down so the capacitive controls are below the display. Use the directional pad to move, A to jump, B to run, touch HOME for Start, and touch MENU for Select. Hold A+B or Start+Select for about 0.6 seconds to open the emulator menu. Physical HOME saves state and exits.

## Compatibility and validation

Start with the original NES Super Mario Bros., mapper 0 / NROM. SNES Super Mario World, Nintendo 64 games, ZIP files, and headerless ROM dumps are not compatible. Upstream supports NES mappers 0, 1, 2 and 3. This integration rejects malformed headers, NES 2.0 files and unsupported mappers, and skips iNES trainers correctly.

Python syntax and ROM parsing tests were checked on the development host. Gameplay, speed, controls and save-state reliability still require testing on a physical badge. This is an emulator integration, not a claim of hardware-tested gameplay. No audio output is configured.

## Source and license

Vendored from https://github.com/spf13/universe-2026-badge-hacks at commit `fd83dde7ac6562ac8a440fa6d39b4f980b5a2239`. MIT copyright 2026 Steve Francia; see LICENSE. Upstream branding assets are preserved. Local changes: installation documentation and defensive iNES validation. Game ROMs and save files must stay out of this public repository.
