# Windows acceptance checklist

Run on Windows 10 and Windows 11 with the actual installed release build. These checks require an interactive Windows desktop, not just a browser preview or compilation. Record Windows build, monitor layout, scale factors, installer type, and results.

## Window/input behavior

- [ ] Pet launches without a white flash or opaque rectangle. It has no border, taskbar button, or activation focus.
- [ ] Open Notepad behind the companion. Click and drag selection through every transparent corner. Repeat around the tail, between feet, and in every animation and facing direction.
- [ ] Click visible character pixels: happy animation fires and Notepad does not receive the click.
- [ ] Double-click jumps; right-click opens settings; pointer hover stops horizontal motion.
- [ ] Click and drag through a visible speech bubble and around its entire window. Underlying applications receive all input.
- [ ] Keep typing in another application while walking and reminders appear. Keyboard focus stays there.
- [ ] Maximize a normal application. The pet stays visible. No claim is made for UAC, lock screen, or exclusive fullscreen.

## Taskbars, monitors, and scaling

- [ ] Bottom taskbar: feet remain four logical pixels above its top; walking turns inside each horizontal edge.
- [ ] Windows 10 top/left/right taskbars: companion stays on the bottom of the usable work area and never enters the docked bar.
- [ ] Auto-hide on each monitor: reveal edge is accessible. Reveal and dismiss the taskbar while the pet walks.
- [ ] Repeat at 100%, 125%, 150%, 175%, and 200% DPI. Click-through shape matches the visible sprite.
- [ ] Two displays with different DPI; secondary left of primary (negative X), above primary (negative Y), and right of primary.
- [ ] Select each display, select Follow primary display, change the primary display, then unplug the selected display.
- [ ] Change resolution, orientation, taskbar height, and display scaling while running. Check recovery within two seconds.
- [ ] Lock/unlock, suspend/resume, and restart Explorer; no off-screen orphan or invisible input blocker remains.

## Reminders/settings/tray

- [ ] Set each interval to one minute, save, and observe its custom message. Test separately to avoid deliberate overdue coalescing.
- [ ] Disable each reminder; it stays disabled after restart. Message/name length limits and empty-input save guards work.
- [ ] Snooze and wait 15 minutes; no reminders during snooze, at most one overdue reminder afterward.
- [ ] Sleep the companion; reminders continue. Hide it from tray; both pet and bubbles disappear. Show restores it.
- [ ] Turn off bubbles; all messages disappear while the companion stays interactive.
- [ ] Change name, outfit, size, speed, and monitor; save and restart. Discard cancels unsaved changes.
- [ ] Close settings: pet remains. Tray restores settings. Quit removes all windows and the tray icon.
- [ ] Launch a second instance: only one companion remains and existing settings open.
- [ ] Enable startup, sign out/in: companion starts without settings. Disable startup, sign out/in: it does not start.
- [ ] Corrupt settings JSON while quit: defaults and warning appear, original data remains until an explicit save.

## Installed/offline behavior

- [ ] Build NSIS on Windows; install and uninstall as a standard non-administrator user. Confirm no UAC/admin prompt, files under the user profile, and launch from the Start menu.
- [ ] Install with networking disabled, including on a VM without WebView2; bundled runtime installs successfully in user context without elevation.
- [ ] Disable networking and close all editors/terminals: app and reminders remain functional.
- [ ] NSIS uninstall removes its HKCU startup entry; settings remain. Other users and HKLM are unchanged.
- [ ] Test a clean user account without development tools. All packaged assets load.

If a native error hides the pet, quit via the tray and reopen it after resolving the reported cause. Include exact reproduction steps with failures.

- [ ] Verify desktop status changes from starting to running. Use Show / restart pet after hiding or a simulated failure; confirm it recovers without a rectangular input blocker.
- [ ] Preview all six animations, pause/play, and day/night. The live desktop character must not change animation when only preview controls are used.

## Character gallery and movement (1.2)

- Upgrade with existing settings: confirm name, reminders, and startup are retained. Choose characters from all collections (including 32×32 pixel and 64×64 3D sprites), save, and verify its live sprite and exact click-through region; check both directions and every state.
- Restart the app: confirm character, color, movement mode, home side, and area limits persist.
- Choose left/right home with 25–75% limits. Check Stay in place and Only move for reminders. Trigger a reminder: the latter walks inward, waves, and returns home in about six seconds. Hover pauses it; a sleeping companion returns to sleep.
- Free walking must stay within the area, including on negative-coordinate displays and after DPI changes/unplugging a monitor. Try a large companion in a very narrow area: it must park safely within the work area.
- Check compact bubbles with normal, 120-character, Unicode, and multiline messages. Clicks through bubble and transparent character pixels must reach underlying applications.


## 1.3 beta creator, reminders and recovery

- [ ] Manual character creation/edit/duplicate/delete persists, including emoji names. Create from Photo is disabled and explicitly unavailable in beta.
- [ ] Right-click the companion (with consent on Mac) and use tray → Quick reminder. Both open the reminder form; create a one-minute reminder with both alert methods.
- [ ] Close settings and verify the scheduled bubble and system notification. Test notification settings/Focus suppression, and confirm the UI does not claim OS presentation was guaranteed.
- [ ] Hide the companion: its bubble remains hidden, while selected system notifications still work. Test repeat intervals, pause, edit, reschedule, delete and 15-minute snooze.
- [ ] Quit through the tray before a reminder is due, wait, reopen and verify one catch-up attempt. Restart again: a completed one-off must not attempt again. Test multiple overdue reminders and summary behavior.
- [ ] Custom reminders persist independently of appearance Save/Discard. Damaged reminder JSON is preserved until an explicit reminder save.
- [ ] Simulate a hung/failed pet webview: native recovery disables its input and hides it after the heartbeat deadline. Custom system reminders continue. Show / restart pet restores correct input after a valid frame.
- [ ] About loads full third-party license texts offline; the installed app also contains LICENSE, THIRD_PARTY_NOTICES.md and THIRD_PARTY_LICENSES.txt. Verify downloaded artifacts against SHA256SUMS.txt.
- [ ] Record CPU/RSS at startup, 30 and 60 minutes with settings closed, a full custom library, a 3D gallery, and repeated edits. Include OS/build/display details and any sustained growth.
