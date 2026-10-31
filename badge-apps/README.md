# Universe 2026 Badge Apps

Paul Snider's apps and experiments for the GitHub Universe 2026 badge.

## Apps

- [AllPlays Scoreboard](apps/allplays_scoreboard/README.md): branded Wi-Fi game picker, score, Start/Pause, period and Undo controls. Requires the linked AllPlays backend deployment; physical validation pending.

- [Roku Wi-Fi Remote](apps/roku_remote/README.md): startup Wi-Fi connection, multiple-Roku picker, manual IP and navigation/playback controls. Includes a dedicated icon; hardware validation pending.

- [NES / Super Mario Bros.](apps/nes/README.md): emulator and installation instructions; supply your own NES ROM. Physical validation pending.

- [Universal Remote](apps/universal_remote/README.md): infrared TV remote with LG, Samsung and Sony starter profiles and Flipper .ir imports. Prototype; physical validation pending.

Copy an app folder into the badge drive's apps directory. See the app README for setup and limitations.

## Development

Run `python -m unittest discover -s tests -v`.

Target the custom 2026 hardware and firmware, not the 2025 badge. Hardware reference: https://github.com/badger/home/blob/main/hardware/README.md

## Ideas, not implemented

- Infrared remote learning and additional profiles.
- Local Notes companion controls and status display.
- USB keyboard and camera integration experiments.

## Third-party material

Remote profiles come from Lucaslhm/Flipper-IRDB under CC0; see Flipper-IRDB-LICENSE.txt and app attribution. No upstream driver code is bundled.
