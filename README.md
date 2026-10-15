# Miso · a little company

An offline Windows desktop cat built with **Tauri 2, React, TypeScript, and Rust**. Original pixel artwork and code are MIT licensed. No account, backend, subscription, paid API, or paid assets.

![Miso settings preview](docs/preview.png)

## What is included

- A transparent, borderless, non-activating, always-on-top pet window, separate from settings.
- Horizontal walking just above the bottom taskbar; idle, walking, sleeping, jumping, and happy animation states.
- A Win32 window region derived from the exact opaque sprite pixels. Transparent areas are outside the native window, so clicks reach the application underneath. This does not rely on CSS `pointer-events` or cursor polling.
- Completely click-through speech bubbles in their own non-activating window.
- Click to pet, double-click to jump, right-click for settings; hovering pauses movement.
- Editable water, stretch, and break intervals and messages; individual switches; 15-minute snooze.
- Three coats, pet name, three sizes, walking speed, monitor selection, roaming and bubble switches.
- Per-monitor work-area and DPI detection, negative desktop coordinates, taskbar edge and auto-hide detection, and hot-plug fallback to the primary display.
- System tray menu, single-instance behavior, close-to-tray settings, and optional Windows sign-in startup.
- Validated local JSON settings written atomically. No runtime network requests or external assets.
- NSIS `.exe` and WiX `.msi` configurations, offline WebView2 installer, Windows build CI, unit tests, browser tests, and a Windows acceptance checklist.

## Run the preview

Install Node.js 24 LTS (or a compatible modern Node version), then open a terminal in this folder:

```sh
npm ci
npm run dev
```

Open `http://localhost:1420`. The browser preview includes appearance, animations, reminders editing, and local settings. Native desktop placement, startup, and tray require the Windows app. The browser preview does not schedule desktop reminders.

## Build and run on Windows

Build prerequisites (needed only by the person compiling the source):

1. Windows 10 or 11, x64, Node.js 24 LTS, and the current stable Rust **MSVC** toolchain from [rustup](https://rustup.rs/).
2. Visual Studio 2022 Build Tools with **Desktop development with C++**, MSVC, and the Windows SDK. The full Visual Studio editor and VS Code are not required.
3. Microsoft Edge WebView2 Runtime for development. Release installers include the offline runtime installer.
4. For `.msi`, enable the Windows VBScript optional feature if WiX reports `light.exe` errors. NSIS can be built independently.

From PowerShell in this directory:

```powershell
npm ci
npm run check
cargo test --locked --manifest-path src-tauri/Cargo.toml
npm run desktop:dev
```

The first native launch opens settings and the cat. Subsequent launches restore the pet; click the Miso tray icon to open settings. If Windows hides the tray icon in the overflow menu, open that menu to find it.

Build installers:

```powershell
npm run desktop:build -- -- --locked
```

Outputs:

```text
src-tauri/target/release/bundle/nsis/Miso_1.0.0_x64-setup.exe
src-tauri/target/release/bundle/msi/Miso_1.0.0_x64_en-US.msi
```

To build only the recommended per-user NSIS installer:

```powershell
npm run desktop:build -- --bundles nsis -- --locked
```

The first build downloads build dependencies, bundling tools, and the offline WebView2 installer. **The resulting app and installer work without an internet connection.** Bundling WebView2 makes the installer substantially larger than the app executable. Installers are unsigned by default; Windows may show an unknown-publisher/SmartScreen prompt. A paid signing certificate is optional and is not required to build or use Miso.

The Windows GitHub Actions workflow runs tests and uploads both installers as artifacts; it does not publish a release. It can also be run manually under Actions. Local builds do not require a GitHub account or CI service.

## Use the installed app

Run the setup executable, launch **Miso** from the Start menu, and save your preferences. After installation you do **not** need Node, Rust, Visual Studio, VS Code, or a terminal.

| Action | Result |
| --- | --- |
| Click the cat | Happy face and a speech bubble; wakes a sleeping cat |
| Double-click the cat | Jump |
| Hover the cat | Pause horizontal movement |
| Right-click the cat | Open settings |
| Click tray icon | Open settings |
| Right-click tray icon | Hide/show, sleep, wake, snooze, quit |
| Close settings | Keep pet running in tray |
| Desktop & startup → Meet me at sign-in | Register or remove per-user Windows startup |
| Save changes | Persist preferences and apply them to the desktop pet |

Automatic startup is **off initially**; enabling it launches Miso quietly at sign-in. It uses the official Tauri autostart plugin's per-user Windows Run registration. The NSIS uninstaller removes that entry. For MSI uninstall, first turn off startup in Miso. Settings are retained on uninstall so reinstalls can restore preferences.

## Reminders and local data

Intervals range from 1 to 240 minutes. Timers use elapsed monotonic time, restart on app launch, and reset only when that reminder's configuration changes. Sleep animation does not disable reminders. Snooze pauses all reminder delivery for 15 minutes. Missed intervals combine into one reminder after suspend or snooze; no queue of overdue bubbles appears. Bubbles last seven seconds. Turning off speech bubbles silences all visual reminders. Hiding the pet from the tray hides bubbles too.

Native settings: `%APPDATA%\com.miso.desktop\settings.json`. Use the tray to quit before manually editing this file. A malformed file is preserved, defaults are loaded, and settings show a warning; saving intentionally replaces the file. Browser preview settings use localStorage under `miso.settings.v1` and are separate from native settings. No analytics, log upload, or cloud storage is implemented.

## Monitor and input behavior

`EnumDisplayMonitors` and `GetMonitorInfoW` supply each monitor's physical bounds and available work area, including areas reserved by app bars. Explorer taskbar windows identify the taskbar edge; `ABM_GETAUTOHIDEBAREX` detects auto-hidden taskbars per display. Physical coordinates and monitor DPI are used for placement and region construction. Display layout is refreshed every two seconds, including after unlock or monitor hot-plug. Selecting a missing monitor falls back to the primary display without deleting the preference.

On the usual bottom taskbar, the cat's feet sit four logical pixels above the work-area bottom. With top, left, or right taskbars, it still walks **horizontally at the bottom of the available work area**, away from the docked bar. On auto-hide taskbars, an extra reveal margin leaves the screen edge accessible. Expanding an auto-hidden taskbar can temporarily cover the pet; Miso does not force Explorer's taskbar open or closed.

The sprite's native hit region is a union of its opaque pixel spans, rebuilt only when the silhouette or scale changes. Speech bubbles never accept input. If a region or placement operation fails, Miso hides the overlay and reports the problem in settings. Settings are a normal interactive window. Secure desktops (UAC, lock screen), exclusive fullscreen applications, and other topmost windows can cover the cat; Windows does not guarantee a normal app can appear above those surfaces.

## Tests

```powershell
npm run check
npx playwright install chromium
npm run test:e2e
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo test --locked --manifest-path src-tauri/Cargo.toml
cargo clippy --locked --manifest-path src-tauri/Cargo.toml -- -D warnings
```

TypeScript tests cover motion boundaries, jump timing, sleep/wake, resume clamping, reminder deadlines/snooze/coalescing, settings normalization, and exact equality between visual pixels and native hit spans across all animation frames and directions. Browser tests cover persistence, discard, controls, animation actions, small-window layout, and absence of remote asset requests. Rust tests cover atomic persistence, corrupt-file handling, input validation, and negative-coordinate/DPI placement.

Browser and logic tests cannot prove Windows compositor or taskbar behavior. Run [the Windows acceptance checklist](docs/WINDOWS_TESTING.md) on a real Windows desktop before distributing an installer. See [validation notes](docs/VALIDATION.md) for checks actually performed in the development environment.

## Source map

```text
src/App.tsx                 Settings UI and browser preview
src/PetWindow.tsx           Native pet and bubble webviews, timers and interaction
src/core/                  Original sprite, motion engine, settings, reminders, tests
src/api.ts                 Small typed Tauri bridge / local browser adapter
src-tauri/src/lib.rs        Native commands, windows, tray, startup, validation
src-tauri/src/platform.rs   Win32 taskbar/monitor enumeration and exact window region
src-tauri/src/geometry.rs   Physical placement and DPI logic
src-tauri/src/settings.rs   Validated atomic JSON persistence
src-tauri/tauri.conf.json   CSP, NSIS/MSI, offline runtime packaging
scripts/generate-icons.mjs  Reproducible original PNG/ICO generation
.github/workflows/          Windows tests and installer artifacts
```

No shell, filesystem, HTTP, or autostart commands are exposed directly to the frontend. Rust commands restrict caller window labels and validate inputs. The application has a local-only content security policy. The only frontend capability is listening to app events.

Technical references: [Tauri Windows installers](https://v2.tauri.app/distribute/windows-installer/), [Tauri autostart](https://v2.tauri.app/plugin/autostart/), [Tauri tray](https://v2.tauri.app/learn/system-tray/), [Microsoft MONITORINFO](https://learn.microsoft.com/en-us/windows/win32/api/winuser/ns-winuser-monitorinfo), [Microsoft SetWindowRgn](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowrgn), [Microsoft SHAppBarMessage](https://learn.microsoft.com/en-us/windows/win32/api/shellapi/nf-shellapi-shappbarmessage).

License: [MIT](LICENSE). See [third-party notices](THIRD_PARTY_NOTICES.md) for open-source dependencies and the free proprietary WebView2 prerequisite.
