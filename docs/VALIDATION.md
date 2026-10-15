# Validation record

## MiniMates 1.2.0 — character collections and movement

Validated on 15 October 2026: 132 playable character definitions (12 originals + 120 supplied original concepts), 396 PNG atlases, and 20 reference-only catalog entries. Every frame is checked against the renderer and native hit spans, including 64×64 3D frames and long-running frame wrap. Movement checks cover selected ranges, both home sides, reminder excursions/return, hover pause, narrow displays, and settings migration. Browser checks cover collection/style filters, selection persistence, unavailable references, and movement controls. Native smoke/compositor acceptance remains distinct from these automated checks.

| 1.2.0 check | Result |
| --- | --- |
| Unit and exhaustive sprite/atlas tests | 1,341 passed across 6 files |
| TypeScript and Vite production build | Passed |
| Browser tests, including mocked native 64×64 frames | 10 passed |
| Rust tests, including settings migration, collection allowlist, geometry and hit routing | 11 passed |
| Rust clippy with warnings denied | Passed |
| Visual inspection | Original animals, pixel collections, Cute 3D collections, gallery filters and movement area inspected |
| Local Mac Intel app bundle | Passed; 65.76 MiB ad-hoc-signed app, strict signature verification passed |
| Native release installer builds | [GitHub Actions run 38712027979](https://github.com/ajyghosh/pet/actions/runs/38712027979) triggered for code commit `3debfac`; prior-release results below do not validate this release |

The shaded figures use original procedural geometry, not imported 3D models. Each ready character has three atlas files and an MIT manifest. Reference-only IDs are rejected by both settings layers. Frame numbers wrap identically in the renderer and PNG atlas, preventing hit-mask drift after extended runtime.

## Previous release: 1.1.0


Development host: macOS 13.7.8 Intel, not Windows. Checked on 15 October 2026.

| Check                                                                  | Result                                                                                                 |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| TypeScript unit tests (`npm run test`)                                 | 22 passed in 5 files                                                                                   |
| Strict TypeScript checking and Vite production build (`npm run build`) | Passed                                                                                                 |
| Browser integration tests in Chrome (`npm run test:e2e`)               | 6 passed, including native-bridge regression cases                                                     |
| Visual inspection                                                      | Settings screen rendered and inspected; screenshot in `preview.png`                                    |
| Prettier source formatting                                             | Passed                                                                                                 |
| Rust unit tests on macOS (`cargo test --locked`)                       | 7 passed, including Mac geometry and click routing                                                     |
| Mac app bundling (`tauri build --debug --bundles app`)                 | Passed; ad-hoc-signed Intel MiniMates.app produced                                                     |
| Mac release app / DMG, Intel and Apple Silicon                         | Passed in GitHub Actions; both installer artifacts uploaded                                            |
| Native Mac startup smoke (1.1.0 debug app)                             | Passed: companion window movement and speech-bubble window observed                                    |
| Interactive Mac desktop / Accessibility tests                          | Not run; see `MACOS_TESTING.md`                                                                        |
| Rust formatting (`cargo fmt --check`)                                  | Passed                                                                                                 |
| Rust host lint (`cargo clippy --locked -- -D warnings`)                | Passed                                                                                                 |
| Windows Win32 source metadata compilation                              | Passed for `x86_64-pc-windows-msvc`                                                                    |
| Full application Windows source metadata compilation                   | Passed for `x86_64-pc-windows-msvc`, using the actual Windows dependencies and generated Tauri context |
| Windows source lint                                                    | Passed with `clippy-driver -D warnings` against the full application's Windows metadata build          |
| npm dependency audit after patching the test runner                    | 0 advisories reported                                                                                  |
| Complete Windows installer build                                       | Passed in GitHub Actions on Windows x64; per-user NSIS artifact uploaded                               |
| Interactive Windows desktop tests                                      | **Not run**: no Windows desktop is available on this host                                              |

The Windows metadata checks recorded above were performed on the initial Windows implementation before the Mac port; they validate Rust source types, including the Windows API bindings, without linking or executing a Windows application. The full application check used `rustc --emit=metadata` and Cargo-generated Windows dependency metadata and Tauri configuration. It does not substitute for a complete `tauri build`, resource compilation, installer execution, or compositor/input testing.

All three release jobs passed for code commit `1233cab` in [build run 38702325911](https://github.com/ajyghosh/pet/actions/runs/38702325911): Windows x64, Mac Intel, and Mac Apple Silicon. Each ran the frontend/browser/Rust checks and uploaded its installer artifact. This validates packaging, not interactive Windows installation or compositor behavior.

The `Desktop builds` workflow now performs native Windows x64, Mac Intel, and Mac Apple Silicon checks and release packaging. GitHub Actions run results are the source of truth for remote build status; local tests do not prove those builds have passed. `WINDOWS_TESTING.md` and `MACOS_TESTING.md` cover remaining native runtime and installation checks, including hit regions, mixed DPI, auto-hide, startup, standard-user installation, and offline use.

Browser checks cover name/outfit/reminder persistence, discard, all six preview states, pause/play, day/night, desktop preferences, responsive layout, and no remote asset requests. Mocked native-bridge checks cover no-query window identity, frame submission, placement failure reporting, recovery, and preview isolation. They do not emulate Win32 or prove the reported invisible-pet issue is resolved on the affected machine. The original Windows 1.0.0 CI build succeeded; its missing-pet runtime report motivates the 1.1.0 startup/recovery changes.

Native smoke details: the live 80×80 companion window moved from X=80 to X=213 while staying at Y=755. Its 280×104 speech-bubble window appeared. The test process was closed afterward. Accessibility and login startup were not enabled; click routing, installation, full-screen behavior, and multi-monitor scenarios remain manual acceptance checks.
