# heykup pets — 1.3.0-beta.1 follow-up

The app is now branded **heykup pets** in lowercase, using the warm cream, coral/rust and ink colours inspected on [heykup.com](https://heykup.com/) on 15 October 2026. Native/download bundle filenames use `heykup-pets`. The website/domain has not been modified. The legacy `com.miso.desktop` identity, existing data paths and Miso startup registration remain compatible with upgrades.

## Completed

- Fixed the native-save race: a successful save updates the saved baseline without replacing a newer draft. A delayed native-save browser regression proves newer edits survive and Discard returns to the submitted snapshot.
- Fixed Unicode character duplication using code-point truncation; malformed surrogate text is rejected before native serialization. A shared Unicode fixture is tested in both TypeScript and Rust persistence.
- Kept manual character customization functional. **Create from Photo · Unavailable in beta** is disabled; no photo upload or AI model download was added. About now correctly describes manual customization as included.
- Added complete dependency texts for 280 resolved npm runtime / supported-target normal/build Rust packages. Pinned upstream texts omitted from crate archives are stored with provenance. About loads these texts locally; the installed app includes `LICENSE`, `THIRD_PARTY_NOTICES.md` and `THIRD_PARTY_LICENSES.txt`. Resources were compared byte-for-byte with source after packaging.
- Added native stale-frame recovery independent of JavaScript: allow a ten-second startup grace; after five seconds without valid frames, disable pet input and hide overlays. Restart reinstalls input only after a valid frame. Native compositor/hang testing remains required on Windows.
- Added version/resource/notice checks (`npm run check:release`) to the normal check command, and SHA-256 installer/archive generation in CI.
- Rebranded the settings UI, titles/tray, application icons/favicon, artifact names, native display name and README. Original asset/license attribution and source catalog paths remain intact.

## Quick and scheduled custom reminders

Right-click an interactive companion or choose **Quick reminder…** in the tray/menu bar. Settings opens Reminders with a new reminder ready to edit; the pending request survives initial window startup. Mac users without pet-click consent can use the tray entry.

- Quick delay presets: 5, 15, 30 or 60 minutes, with a custom minute delay.
- Scheduled local date/time, optional repeat interval in minutes, editable title/message, pause, reschedule and delete.
- Speech bubble and system notification enabled by default, with individual switches and a Test system notification button. Native notification operations are behind settings-window command checks; the frontend is not given general notification/filesystem permissions.
- Atomic local `reminders.json` separate from appearance preferences; Save/Discard for appearance cannot remove reminders. Up to 100 records. Completed attempts remain visible until deleted.
- Native scheduler continues while settings are closed or JavaScript animation is stalled. It requires the app process to remain running. Closing/quitting the entire app stops delivery; overdue items are attempted after reopening/resuming. Repeated missed intervals coalesce, and simultaneous due items produce a summary.
- Claims are persisted before dispatch to avoid duplicate attempts after restart. A process exit between persistence and dispatch can lose that attempt; an OS notification request is not a guarantee of presentation. Focus settings and platform permissions can suppress delivery. Repeats are fixed minute intervals, not timezone-aware calendar recurrence.
- Browser preview edits/persists reminders without delivering desktop notifications. Windows system notifications require an installed build. Actual macOS/Windows notification presentation still needs installed-app acceptance testing.

## Validation performed

| Check | Result |
| --- | --- |
| Unit suite | 1,350 passed across 8 files |
| Browser suite | 20 passed: creator, Unicode, photo beta restriction, delayed native save, quick-reminder entry, custom reminder CRUD/repeats/validation/persistence, native notification bridge, license display and existing regressions |
| Rust suite | 19 passed: includes persisted one-off/repeat reminder claims, restart behavior, snooze/coalescing, failed writes, corrupt input, Unicode and watchdog deadlines |
| TypeScript / production build | Passed |
| Clippy with warnings denied / rustfmt / Prettier / diff whitespace | Passed |
| Version and generated-notice freshness gate | Passed |
| Mac Intel debug `.app` packaging | Passed; ad-hoc signed, strict signature verification passed; license resources match source |
| Visual review | Lowercase brand and warm theme inspected; main/reminder screenshots updated; no horizontal overflow at 760px |
| Production preview hosted under `/pets/` | Passed: branded title, decoded sprite, loaded notices, zero HTTP asset errors |
| Updated Rust OSV scan | 470 locked registry entries; same `glib` and unmaintained `proc-macro-error` matches, absent from Windows x64 / Mac Intel / Mac Apple Silicon dependency trees; [raw result](beta-1.3.0/rust-osv-audit.json) |

Generated notices can be reproduced with `npm run notices` after installing the locked npm packages and fetching all three supported Cargo targets. Rust commands on this development host use `PATH="/tmp/miso-cargo/bin:$PATH" CARGO_HOME=/tmp/miso-cargo RUSTUP_HOME=/tmp/miso-rustup`.

## Still required before public beta

Commit/tag the intended candidate and run release CI for Windows x64 and both Mac architectures. Test the actual downloaded installations: standard-user/offline Windows install, native click-through and stale-frame recovery, system notification presentation/Focus behavior, Accessibility, startup, upgrades/uninstall, monitor/DPI changes and sleep/resume. Run a representative native resource/soak check. Mac remains ad-hoc signed and unnotarized; Windows is unsigned by default. No signing credentials, release publication, DNS or hosting change was made.

The local Mac artifact is a **debug build for internal testing**, not evidence that all release installers are accepted. The initial [audit](BETA_AUDIT.md) is retained as a historical record; its two source bugs and notice-packaging finding are addressed here, while platform release acceptance remains open.

## Soft friend and source-folder cleanup

Maple, a soft clay-style bear with a cream belly and coral scarf, is available in Characters → Soft Friends. Three fur colours and all six animation states are bundled; the PNGs share their exact opaque pixels with native hit regions. There are now 133 playable companions and 399 PNG atlases.

Character source resources now live under `assets/characters/collections/` and `assets/characters/creator/`. Source imports and native fixtures use those paths. Unused Astra kickoff prompts were removed. Historical audit hashes retain their original paths as a record of the audited snapshot.

Local source archives and debug apps created before this change do not contain Maple or this reorganization. Use the subsequent GitHub Actions installers for this revision.

Validation after the folder move and Maple addition: 1,360 frontend unit tests, 21 browser tests, 19 native tests, release metadata checks, and the production build passed. Native formatting and frontend formatting also passed.

## Windows release-check correction

Windows Git checkouts exposed an LF-only Cargo.lock version parser. The checker now accepts LF and CRLF, and both the notice generator and verifier hash source lockfiles using canonical LF. `.gitattributes` keeps source files at LF while preserving the upstream license bundle and license sources verbatim. Five regression cases cover LF, simulated Windows CRLF, an actual version mismatch, a changed lockfile, and an altered license bundle.
