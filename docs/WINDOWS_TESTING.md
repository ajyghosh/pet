# Windows acceptance checklist

Run on Windows 10 and Windows 11 with the actual installed release build. These checks require an interactive Windows desktop, not just a browser preview or compilation. Record Windows build, monitor layout, scale factors, installer type, and results.

## Window/input behavior

- [ ] Pet launches without a white flash or opaque rectangle. It has no border, taskbar button, or activation focus.
- [ ] Open Notepad behind the cat. Click and drag selection through every transparent corner. Repeat around the tail, between feet, and in every animation and facing direction.
- [ ] Click visible character pixels: happy animation fires and Notepad does not receive the click.
- [ ] Double-click jumps; right-click opens settings; pointer hover stops horizontal motion.
- [ ] Click and drag through a visible speech bubble and around its entire window. Underlying applications receive all input.
- [ ] Keep typing in another application while walking and reminders appear. Keyboard focus stays there.
- [ ] Maximize a normal application. The pet stays visible. No claim is made for UAC, lock screen, or exclusive fullscreen.

## Taskbars, monitors, and scaling

- [ ] Bottom taskbar: feet remain four logical pixels above its top; walking turns inside each horizontal edge.
- [ ] Windows 10 top/left/right taskbars: cat stays on the bottom of the usable work area and never enters the docked bar.
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
- [ ] Sleep the cat; reminders continue. Hide it from tray; both pet and bubbles disappear. Show restores it.
- [ ] Turn off bubbles; all messages disappear while the cat stays interactive.
- [ ] Change name, coat, size, speed, and monitor; save and restart. Discard cancels unsaved changes.
- [ ] Close settings: pet remains. Tray restores settings. Quit removes all windows and the tray icon.
- [ ] Launch a second instance: only one cat remains and existing settings open.
- [ ] Enable startup, sign out/in: cat starts without settings. Disable startup, sign out/in: it does not start.
- [ ] Corrupt settings JSON while quit: defaults and warning appear, original data remains until an explicit save.

## Installed/offline behavior

- [ ] Build NSIS and MSI on Windows, install each separately, and launch from the Start menu.
- [ ] Install with networking disabled, including on a VM without WebView2; bundled runtime installs successfully.
- [ ] Disable networking and close all editors/terminals: app and reminders remain functional.
- [ ] NSIS uninstall removes its startup entry; settings remain. Disable startup before MSI uninstall.
- [ ] Test a clean user account without development tools. All packaged assets load.

If a native error hides the pet, quit via the tray and reopen it after resolving the reported cause. Include exact reproduction steps with failures.
