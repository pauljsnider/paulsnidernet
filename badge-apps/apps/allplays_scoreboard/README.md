# AllPlays Scoreboard

An AllPlays-branded scoreboard controller for the **GitHub Universe 2026 badge**. Uses AllPlays' original logo and indigo palette. Navigate the on-screen controls with the physical arrows and press Select to activate.

## Availability

The badge source is ready for installation, but live pairing requires the AllPlays backend and setup page in [AllPlays PR #5124](https://github.com/pauljsnider/allplays/pull/5124) to be merged and deployed. A missing setup page or endpoint is not a badge Wi-Fi problem. Hardware testing is still required; host tests do not prove the badge firmware's TLS support.

## Install everything

1. Use the 2026 badge firmware with `network`, `ssl.SSLContext`, verified TLS (`CERT_REQUIRED`), `ntptime`, `badgeware.State` and the badge graphics runtime. Older 2025 firmware is not supported.
2. Connect the badge by USB in storage mode. Copy this **entire folder**, named `allplays_scoreboard`, into `apps/` on the badge drive. Required files: `__init__.py`, `score_client.py`, `score_ui.py`, `icon.png`, and `roots.pem`. On the running badge this is `/system/apps/allplays_scoreboard/`.
3. After the AllPlays deployment, visit [Badge Controller setup](https://allplays.ai/badge-controller.html), sign in with your verified team-manager account, select your team, and download `controller.json`.
4. Copy that file into the same `apps/allplays_scoreboard/` folder. It authorizes score changes for that team for 30 days. Keep it private; never commit it to GitHub. Download a fresh pairing file when it expires. Retain a private copy for revocation.
5. Safely eject the drive and reset the badge. Open **Settings** and save your Wi-Fi network and password. No credentials go in the app source.
6. Open **AllPlays Scoreboard**. It connects to saved Wi-Fi, synchronizes its clock for certificate validation, and loads games from yesterday through the next 14 days. Dates on the small screen are UTC, marked `Z`.
7. Select the correct game, pause and close any other tracker, and select **Take control**. Confirm the team/opponent and score before updating.

The app needs ordinary internet access: DNS, NTP for clock setup, and HTTPS to `us-central1-game-flow-c6311.cloudfunctions.net`. It never disables certificate checks. `roots.pem` is Google's public CA bundle from <https://pki.goog/roots.pem>, not a private credential. It is bundled so no dependency download is needed during installation. No Python package installer, companion computer, ROM or external accessory is required at runtime.

## Controls

| On-screen button | Action |
| --- | --- |
| Us +1 / Us -1 | Increase/decrease your team's score |
| Them +1 / Them -1 | Increase/decrease opponent score |
| Start / Pause | Run or pause the count-up game clock |
| Period | Choose a sport-specific period; pauses the clock |
| Undo | Reverse the last confirmed badge action, up to 30 actions |
| Games | Pause the clock and release control before choosing another game |
| Refresh | Retrieve the latest confirmed game state |

Arrows move focus; Select activates; Home exits. **Home does not pause the game or release control.** The clock continues on the server when running, even if the badge disconnects. Period changes do not reset elapsed time. Undo restores the prior score, running state or period without rewinding elapsed time. Scores range from 0 through 999. Repeat +1 for multi-point scores.

## Network errors and recovery

Commands are saved before sending. If an answer is lost, press Select to retry the **same** request. The server records request IDs transactionally, so a retry cannot add the score twice. No further score commands are accepted while an earlier command is uncertain. Never erase pending state to force through another score.

A stale revision or changed control session is rejected. Refresh or select the game again, then inspect the score before acting. A failed local state save prevents sending. A disconnected badge reconnects using saved Wi-Fi. HTTPS requests can briefly pause button handling while they complete or time out.

For an expired pairing, reconnect by USB and replace `controller.json`. For a missing, lost or disconnected badge, the setup page lets a team manager **release badge control and pause the clock**. Reload the normal tracker after release so it starts with the current score. Revoke the pairing using its saved file if needed; revocation and releasing the game are separate actions.

## Scope

Score, count-up clock, period and undo only. No player statistics, substitutions, possession or finalization. Finish the game in the regular AllPlays tracker after releasing control. Diamond scorebooks, practices, completed/cancelled games and shared-schedule/shared games are excluded. The server rechecks the pairing owner's current team-management access on every request. Browser and mobile Firestore rules protect the score/clock while the badge owns control.

## Validation

Host tests cover control focus and command mappings, clock behavior, retry persistence and verified HTTP behavior. Backend tests cover authorization, idempotency, revisions, control ownership and undo. Run the hardware validator from the official badge source, then perform the physical checklist: Wi-Fi startup, certificate validation, choose among games, every screen button, reboot during an uncertain command, release/reclaim, and compare the public live scoreboard. A physical badge was not available during implementation.
