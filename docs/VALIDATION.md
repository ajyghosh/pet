# Validation record

Development host: macOS 13.7.8 Intel, not Windows. Checked on 15 October 2026.

| Check                                                                  | Result                                                                                                 |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| TypeScript unit tests (`npm run test`)                                 | 22 passed in 5 files                                                                                   |
| Strict TypeScript checking and Vite production build (`npm run build`) | Passed                                                                                                 |
| Browser integration tests in Chrome (`npm run test:e2e`)               | 3 passed                                                                                               |
| Visual inspection                                                      | Settings screen rendered and inspected; screenshot in `preview.png`                                    |
| Prettier source formatting                                             | Passed                                                                                                 |
| Rust unit tests on macOS (`cargo test --locked`)                       | 7 passed, including Mac geometry and click routing                                                     |
| Mac app bundling (`tauri build --debug --bundles app`)                 | Passed; ad-hoc-signed Intel MiniMates.app produced                                                     |
| Mac release DMG / Apple Silicon build                                  | Delegated to the native CI matrix; not built on this host                                              |
| Interactive Mac desktop / Accessibility tests                          | Not run; see `MACOS_TESTING.md`                                                                        |
| Rust formatting (`cargo fmt --check`)                                  | Passed                                                                                                 |
| Rust host lint (`cargo clippy --locked -- -D warnings`)                | Passed                                                                                                 |
| Windows Win32 source metadata compilation                              | Passed for `x86_64-pc-windows-msvc`                                                                    |
| Full application Windows source metadata compilation                   | Passed for `x86_64-pc-windows-msvc`, using the actual Windows dependencies and generated Tauri context |
| Windows source lint                                                    | Passed with `clippy-driver -D warnings` against the full application's Windows metadata build          |
| npm dependency audit after patching the test runner                    | 0 advisories reported                                                                                  |
| Complete Windows installer build                                       | **Not completed on this host**: Windows resource compilation requires `llvm-rc` / Windows build tools  |
| Interactive Windows desktop tests                                      | **Not run**: no Windows desktop is available on this host                                              |

The Windows metadata checks recorded above were performed on the initial Windows implementation before the Mac port; they validate Rust source types, including the Windows API bindings, without linking or executing a Windows application. The full application check used `rustc --emit=metadata` and Cargo-generated Windows dependency metadata and Tauri configuration. It does not substitute for a complete `tauri build`, resource compilation, installer execution, or compositor/input testing.

The `Desktop builds` workflow now performs native Windows x64, Mac Intel, and Mac Apple Silicon checks and release packaging. GitHub Actions run results are the source of truth for remote build status; local tests do not prove those builds have passed. `WINDOWS_TESTING.md` and `MACOS_TESTING.md` cover remaining native runtime and installation checks, including hit regions, mixed DPI, auto-hide, startup, standard-user installation, and offline use.

Browser checks cover name/outfit/reminder persistence, discard, all six preview states, pause/play, day/night, desktop preferences, responsive layout, and no remote asset requests. Mocked native-bridge checks cover no-query window identity, frame submission, placement failure reporting, recovery, and preview isolation. They do not emulate Win32 or prove the reported invisible-pet issue is resolved on the affected machine. The original Windows 1.0.0 CI build succeeded; its missing-pet runtime report motivates the 1.1.0 startup/recovery changes.
