# Universe 2026 Badge Apps

Paul Snider's apps and experiments for the GitHub Universe 2026 badge.

## Apps

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
