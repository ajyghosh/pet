# Mac acceptance checklist

Run against the installed release build on Intel and Apple Silicon. Record macOS version, CPU, monitor arrangement, scales, Dock settings, and results. Compilation and browser tests do not validate desktop behavior.

- [ ] Copy MiniMates.app to `~/Applications` as a standard user and launch. No developer tools are needed. The app has a menu-bar icon and no Dock tile.
- [ ] Without Accessibility permission, confirm walking, speech bubbles, reminders, hover pause, and menu-bar controls work. All clicks, including over the companion, reach underlying apps. Launching alone does not prompt for permission.
- [ ] Enable clicks explicitly in settings; grant Accessibility consent to the installed copy, restarting if needed. Verify the enabled status in settings.
- [ ] In each animation and direction, click opaque companion pixels (happy), double-click (jump), and right-click (settings). Underlying apps must not receive those clicks.
- [ ] Click and drag through transparent corners, gaps between feet, and speech bubbles. Underlying apps receive normal input. A drag begun outside the companion must not turn into a pet click on release.
- [ ] Keep typing in another app while the companion walks or a reminder appears. Neither overlay takes keyboard focus.
- [ ] Hide the companion via the menu bar; all input passes through. Show, sleep, wake, snooze, close settings, reopen settings, and quit all work.
- [ ] Revoke Accessibility permission while running. Clicks pass through; reminders and menu controls keep working. Re-grant and restart if macOS requires it.
- [ ] Test bottom, left, right, auto-hidden, and visible Docks. Reveal edges stay usable and the companion remains in the available work area.
- [ ] Test mixed Retina and non-Retina displays, including screens left of and above the main display. Select each screen; verify sprite size and hit alignment.
- [ ] Disconnect the selected display; the companion falls back to the primary. Change the primary display, resolution, and Dock position while running.
- [ ] Test Mission Control, Spaces, fullscreen, Stage Manager, lock/unlock, and sleep/resume. Check for invisible input interception and document visibility limitations.
- [ ] Set each reminder to one minute; verify custom messages, persistence, snooze, and bubble-disable behavior. Restart the app offline.
- [ ] Enable startup only after moving the app to its final folder. Sign out/in: one companion appears without opening settings. Disable startup and repeat: MiniMates does not start.
- [ ] Launch a second instance: only one companion remains and settings open.
- [ ] Disable startup, quit, and remove MiniMates.app. Confirm no per-user LaunchAgent remains enabled. Settings may be retained.

Ad-hoc signatures are not notarization. Test the downloaded artifact's Gatekeeper flow separately from a local build. Managed systems may require IT approval for downloaded applications or Accessibility permission; do not disable system protections to bypass policy.

- [ ] Verify desktop status changes from starting to running. Use Show / restart pet after hiding or a simulated failure; confirm it recovers without a rectangular input blocker.
- [ ] Preview all six animations, pause/play, and day/night. The live desktop character must not change animation when only preview controls are used.
