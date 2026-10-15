# MiniMates beta readiness audit

**Historical audit:** subsequent fixes, lowercase heykup pets branding, custom reminders and current validation are tracked in [the beta follow-up](BETA_FIXES.md). The original findings below describe the earlier audited snapshot.

**Decision: do not publish a public beta of the current workspace yet. Suitable for internal testing while the release gates below are completed.**

Audited 15 October 2026. Scope: the current local working tree based on `a02f645`, including the uncommitted manual creator. This is a source, automated-test, dependency and packaging review, not a penetration-test certification or native Windows acceptance sign-off. No application source was changed during the audit. Two additional targeted probes reproduced bugs that the passing test suite does not cover.

## Findings requiring action

### 1. High — no tested release candidate for the current source

Evidence: `git status --short` includes modified tracked files and new, untracked creator sources; existing release evidence in `docs/VALIDATION.md` describes earlier commits. `docs/CREATOR_STATUS.md:37` explicitly records missing current native installation/compositor acceptance. All three platforms are configured in `.github/workflows/desktop.yml`, but a workflow definition is not evidence that the current candidate built or ran correctly.

Impact: earlier 1.2 installers/source archives can omit the creator or differ from the code reviewed here. Browser mocks cannot establish click-through behavior, Accessibility consent, standard-user installation, offline WebView2 installation, sign-in startup or mixed-DPI placement.

Before public beta: choose a distinct beta version, commit all intended files, build Windows x64 / Mac Intel / Mac Apple Silicon from that exact commit, and test the actual downloaded packages. Record results using `WINDOWS_TESTING.md` and `MACOS_TESTING.md`, including upgrade, uninstall, settings/custom-library retention, hide/show, restart, lock/resume, opaque versus transparent clicks, and multi-monitor behavior. Publish immutable download artifacts with checksums, known issues and a bug-report channel. Existing workflow artifacts expire after 30 days and are not GitHub Releases.

### 2. High — distribution notices are incomplete and not packaged

Evidence: `THIRD_PARTY_NOTICES.md:5` lists only direct dependency names/license labels. It directs redistributors to preserve notices at line 20 but does not include the full applicable license texts/copyright notices. `src-tauri/tauri.conf.json:18` does not configure notice resources or a license file; `dist/` contains no license/notice files. The newly built Mac Intel debug app contains only `icon.icns` in `Contents/Resources` and no license/notice files. The frontend JavaScript retains short license headers but does not contain the MIT permission text or a complete notice collection. For example, installed `node_modules/react/LICENSE`, `react-dom/LICENSE` and `lucide-react/LICENSE` contain notices absent from the distributed frontend.

Impact: the repository's dependency overview does not establish that end users receive the applicable third-party notices with standalone binaries.

Before public beta: generate a notice bundle from the resolved dependencies actually redistributed, including native transitive dependencies; retain any additional required notices, package the bundle with every installer/app, and make it accessible from About or accompanying release files. Verify the actual packaged output. This is a concrete distribution-documentation gap; this audit does not provide a legal opinion or independently verify the provenance of every claimed-original asset.

### 3. Medium — edits made during saving are silently overwritten (reproduced)

Location: `src/App.tsx:211`, especially `setSettings(s)` after the awaited save at line 216. Only Save/Discard buttons are disabled while busy; editable inputs and library controls remain usable.

Reproduction: mock native `save_settings` with a 1.2-second delay; set the companion name to `Saved snapshot`; click Save changes; immediately change it to `New edit during save`. Once the first save completes, the input returns to `Saved snapshot`, and the later edit is lost. A temporary browser probe confirmed this exact result.

Fix: preserve the submitted snapshot separately from the current draft, update the saved baseline on success, and replace the draft only if it has not changed since submission; alternatively, disable all affected editing controls for the duration of a save. Add a regression test with delayed native persistence and a second edit.

### 4. Medium — duplicating an emoji-containing name can make native saving/export fail (reproduced)

Location: `src/components/CustomCharacterLibrary.tsx:304`, `c.name.slice(0, 74)`.

Reproduction: create a character named 73 ASCII `a` characters followed by `🙂`. This name fits the editor's length limit. Duplicate it. JavaScript slices the UTF-16 surrogate pair in half, producing a lone `\ud83d` before ` copy`. `validateCustomCharacter` accepts it, but parsing that exported JSON with the project's compiled `serde_json` returns `unexpected end of hex escape`. Thus native command arguments cannot deserialize; native save/export fails. This bug was introduced with the creator and is not covered by the normal successful Unicode roundtrip test.

Fix: truncate by Unicode code points, consistent with the existing native name limit, and reject malformed Unicode at the frontend/native boundary. Add a duplicate-name regression test that verifies native JSON deserialization.

## Other beta risks and limitations

- **Stalled overlay recovery needs native failure testing.** `src-tauri/src/lib.rs:341` detects a stale heartbeat only to return a status string. It does not automatically hide/release the Windows region. `src/PetWindow.tsx:169` reports caught errors, but hung JavaScript cannot run that handler. macOS hit testing expires after 250 ms; Windows has no corresponding native stale-frame expiry. Source review establishes this recovery gap, not a reproduced invisible-input-blocker incident. Test a renderer hang/crash on Windows and add a native watchdog or establish a safe recovery policy before relying on the fail-safe claim.
- **Mac downloads are ad-hoc signed and not notarized.** `src-tauri/tauri.macos.conf.json:9` sets `signingIdentity` to `-`. A locally valid signature does not establish a smooth downloaded-app Gatekeeper flow. This is an intentional cost-free distribution constraint, not proof of malicious software. A private beta can use a documented, tested per-app approval flow; broad distribution should have a deliberate signing/notarization plan. See [Tauri's signing guidance](https://v2.tauri.app/distribute/sign/macos/). Windows is also unsigned by default; disclose unknown-publisher prompts and test installation as a standard user.
- **No runtime CPU, memory, battery or long-duration soak acceptance.** A small desktop companion must be tested with settings closed, maximum custom-library size, a 3D gallery, repeated edits and sleep/resume. No resource-use or leak guarantee follows from the unit suite. Custom canvases rasterize in `useLayoutEffect`; the native loop runs about 30 times per second, and the settings view keeps a 160 ms frame timer even when hidden.
- **No automatic updater or telemetry/crash upload.** These need not block a beta, but releases need a manual upgrade path, settings-backup/recovery instructions and an explicit way for testers to report failures. Privacy documentation should describe local data, optional macOS mouse-event access, and retained settings after uninstall.
- **Declared feature limits are honest.** Photo conversion, pack import, multiple active companions and extra animation states remain unavailable. Do not advertise them as beta features. Reference-only famous-character entries have no playable artwork, and native/frontend selection rejects them; no rights clearance of those catalog labels was performed.

## Checks actually performed

| Check | Audit result |
| --- | --- |
| `npm run check` | 1,346 tests passed across 7 files; strict TypeScript and production Vite build passed |
| `npm run test:e2e` with installed Chrome | 13 passed; includes creator lifecycle, offline requests, native bridge/frame matching and native export bridge |
| Rust `cargo test --locked` on Mac Intel | 14 passed |
| Rust clippy with `-D warnings` | Passed |
| Rust formatting, Prettier and `git diff --check` | Passed |
| Fresh `npm audit --json` | Zero known advisories; [raw result](audit-2026-10-15/npm-audit.json) |
| Rust lockfile OSV query | 460 registry package/version entries checked; two affected package names; [raw result](audit-2026-10-15/rust-osv-audit.json) |
| Rust advisory target applicability | `glib` and `proc-macro-error` absent from dependency trees for Windows x64, Mac Intel and Mac Apple Silicon using locked, offline target-specific `cargo tree -i` queries |
| High-confidence private-key/token pattern scan | No matching project files outside dependencies, build output, archives and `.git`; not a full historical secret scan |
| Targeted delayed-save probe | Confirmed silent loss of newer edits |
| Targeted Unicode duplicate + native parser probe | Confirmed frontend acceptance followed by native JSON rejection |
| Local Mac Intel debug app packaging | Passed; 65.93 MiB, ad-hoc signed; strict signature verification passed; no app was launched or installed |
| Windows / Apple Silicon release packaging and native interactive acceptance for this candidate | Not performed |

The Rust scan reported [RUSTSEC-2024-0429](https://rustsec.org/advisories/RUSTSEC-2024-0429.html), a `glib 0.18.5` iterator-unsoundness issue (also indexed as GHSA-wrw7-89jp-8q8g), and [RUSTSEC-2024-0370](https://rustsec.org/advisories/RUSTSEC-2024-0370.html), an unmaintained `proc-macro-error 1.0.4` notice. These are two affected packages, not three independent vulnerabilities. Neither is present in the supported-target dependency trees checked here; do not label the Windows/Mac runtime vulnerable solely from these lockfile matches. Review them if Linux or other targets are added. This was an OSV scan, not a `cargo audit` invocation, and cannot prove the absence of unknown vulnerabilities.

The application's local-only CSP, window-label command checks, allowlisted actions and appearance values, bounded frame dimensions/row counts, atomic settings replacement, and validated exports without overwriting are good foundations. No obvious remote code-execution path, runtime telemetry or general frontend shell/filesystem permission was found in the reviewed application code. These are review observations, not a security guarantee.

## Exit criteria

For a public beta: fix findings 3 and 4 with regressions; resolve the packaged-notice gap; produce release artifacts from a complete, uniquely versioned commit; verify native startup, click-through, hang recovery, reminders, settings/custom persistence, installation/upgrade/uninstall and startup on the supported platforms; document signing limitations and missing features; and record a representative resource/soak run. A controlled private test can be the mechanism for completing native acceptance, with explicit known issues and recoverable test data.

Application source and dependency lockfiles were left unchanged by this audit. The newly generated audit documents and raw scan reports are the only intended repository additions.


## Packaging addendum and source identity

Ran `PATH="/tmp/miso-cargo/bin:$PATH" CARGO_HOME=/tmp/miso-cargo RUSTUP_HOME=/tmp/miso-rustup npm run desktop:build -- --debug --bundles app -- --locked`. Tauri successfully produced `src-tauri/target/debug/bundle/macos/MiniMates.app` (65.93 MiB). `codesign --verify --deep --strict` passed; signature inspection reports an ad-hoc signature. The build explicitly skipped notarization. This verifies local Intel debug app packaging only: it is not a release DMG, downloaded/quarantined installation, native runtime acceptance, Windows build or Apple Silicon build. The app was not launched against the user's live settings.

[SHA-256 source manifest](audit-2026-10-15/source-sha256.txt) records existing tracked and non-ignored source/assets present for this audit, excluding the newly created audit report/evidence folder. Use a committed, uniquely versioned candidate for release; this manifest is evidence of the reviewed workspace, not a substitute for a release commit.
