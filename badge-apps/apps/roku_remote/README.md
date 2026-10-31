# Roku Wi-Fi Remote

Control a selected Roku over your home Wi-Fi from the GitHub Universe 2026 badge.

## Install and first use

1. Download and extract this repository ZIP. Copy the whole `badge-apps/apps/roku_remote` folder to `apps/roku_remote` on the badge's USB drive. Enter **USB Disk / Mass Storage** from the badge menu first. The folder must include `__init__.py`, `roku_net.py`, `icon.png`, and this README.
2. Safely eject the drive and reset the badge. No firmware replacement or pip dependencies are required. Target: custom Universe 2026 badge with MonaOS 4.0-compatible networking and badge APIs.
3. In the badge's **Settings**, set **WiFi Network** and **WiFi Password** to your home network. These are the existing firmware `WIFI_SSID` and `WIFI_PASSWORD` settings, not credentials to put in this repository. Use a compatible 2.4 GHz network with access to your Rokus. If your firmware lacks the Settings editor, follow its Wi-Fi configuration instructions.
4. On **each Roku you want to control**, set **Settings > System > Advanced system settings > Control by mobile apps > Network access > Enabled**. Normal remote key commands do not require developer mode.
5. Open **Roku Remote** in the badge launcher. The app immediately starts Wi-Fi connection, waits up to 20 seconds, then searches for Rokus for approximately five seconds. Discovery and verification can take longer when a device is slow.
6. Choose the correct Roku by its friendly name **and IP address**, then press Select. The previous device appears first next time, but the app always asks you to confirm a device. It never automatically controls the first discovered Roku.

If Wi-Fi is not configured, the app shows a setup message: Home to leave, configure Settings, then reopen. It uses the firmware's Wi-Fi editor rather than including a second password keyboard. No cloud login or internet access is needed after installation.

## Multiple Rokus and manual connection

Use **Menu > Choose Roku** at any time to rescan and switch devices. Friendly names come from each Roku; matching names can be distinguished by IP. Discovery uses SSDP multicast on your local network, with up to 32 verified devices listed.

If discovery finds nothing, choose **Enter IP manually**. Find the Roku address in **Settings > Network > About**. Left/Right chooses an octet; Up/Down changes it; Select verifies the address and returns to the device picker. Back cancels. The app queries the device identity before adding it. It stores only the last selected device identity in badge state, not passwords.

The app rechecks that identity before each key command. If DHCP changes addresses, rescan and choose again. A Wi-Fi disconnect restarts connection and discovery and requires a fresh device selection; queued commands are discarded.

## Controls

| Badge action | Remote view |
| --- | --- |
| Up / Down / Left / Right | Roku navigation |
| Select | Roku OK |
| Back | Roku Back |
| Menu | Open actions menu |
| Home | Exit the badge app |

The actions menu contains **Roku Home**, **Play/Pause**, **Rewind**, **Fast forward**, **Replay**, **Options (*)**, and **Choose Roku**. Use Up/Down and Select; Back returns to navigation. Each press sends one command; holding does not repeat. Roku Home is deliberately in the menu because badge Home belongs to the launcher.

## Troubleshooting and limitations

- **Wi-Fi connection fails:** check badge Settings, password, signal and network compatibility. Select retries. Restart the app after changing settings.
- **No Rokus found:** confirm the Roku is powered on and on the same reachable home network. Guest Wi-Fi/client isolation can prevent access. Try manual IP if multicast is blocked. An Ethernet-connected Roku also works if reachable from badge Wi-Fi.
- **Enable Roku mobile app control / HTTP 403:** change the setting on the selected Roku to Enabled.
- **Network error:** verify the selected Roku is online and its address is current; Menu > Choose Roku rescans. Commands are not automatically retried because a timeout can occur after the Roku received the key.
- **Unexpected device identity:** rescan; the app refuses to send to an address that now belongs to a different Roku.
- **Brief pauses:** network requests have bounded waits but are synchronous. An unavailable device may pause the UI for several seconds during verification. SSDP waiting itself is polled between frames.
- **No volume or power buttons:** this version implements navigation and playback only. Volume/power support varies by Roku and TV.
- **Icon absent:** confirm `icon.png` copied; older launcher builds may need the badge project's menu icon update.

This app has host-side tests for parsing, device selection safeguards and network requests. Real badge Wi-Fi, controls, icon rendering and commands against physical Rokus still need hardware validation. The simulator is not a substitute for local-network testing.

## Hardware acceptance check

With two Rokus online, verify both appear, select one, and confirm only that Roku responds to navigation. Switch devices and repeat. Exit and reopen: confirm the last device appears first but selection is still required. Test missing Wi-Fi, an offline Roku, manual IP, and Disabled/Enabled network-control settings. Confirm badge Home exits and Wi-Fi remains available to other apps.

## Protocol reference

Uses Roku's [External Control Protocol](https://developer.roku.com/dev/docs/external-control-api): SSDP discovery and HTTP requests on TCP port 8060. The app and icon are newly authored; this is an unofficial remote app.
