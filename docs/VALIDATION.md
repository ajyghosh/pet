# Validation record

Development host: macOS, not Windows. Checked on 15 October 2026.

| Check | Result |
| --- | --- |
| TypeScript unit tests (`npm run test`) | 18 passed in 4 files |
| Strict TypeScript checking and Vite production build (`npm run build`) | Passed |
| Browser integration tests in Chrome (`npm run test:e2e`) | 3 passed |
| Visual inspection | Settings screen rendered and inspected; screenshot in `preview.png` |
| Prettier source formatting | Passed |
| Rust unit tests on macOS (`cargo test --locked`) | 3 passed |
| Rust formatting (`cargo fmt --check`) | Passed |
| Rust host lint (`cargo clippy --locked -- -D warnings`) | Passed |
| Windows Win32 source metadata compilation | Passed for `x86_64-pc-windows-msvc` |
| Full application Windows source metadata compilation | Passed for `x86_64-pc-windows-msvc`, using the actual Windows dependencies and generated Tauri context |
| Windows source lint | Passed with `clippy-driver -D warnings` against the full application's Windows metadata build |
| npm dependency audit after patching the test runner | 0 advisories reported |
| Complete Windows installer build | **Not completed on this host**: Windows resource compilation requires `llvm-rc` / Windows build tools |
| Interactive Windows desktop tests | **Not run**: no Windows desktop is available on this host |

The Windows metadata checks validate Rust source types, including the Windows API bindings, without linking or executing a Windows application. The full application check used `rustc --emit=metadata` and Cargo-generated Windows dependency metadata and Tauri configuration. It does not substitute for a complete `tauri build`, resource compilation, installer execution, or compositor/input testing.

The checked-in Windows CI workflow performs a normal native Windows build and produces installer artifacts when run in a connected repository. It has not been submitted or executed remotely as part of this delivery. The acceptance checklist in `WINDOWS_TESTING.md` covers the remaining native runtime and installation checks, especially exact hit regions, mixed DPI, taskbar auto-hide, startup, and installation without networking.

Browser checks cover saved name/coat/reminder settings, reload persistence, discard, all five animation controls, sleep/wake, desktop preferences, responsive layout, and no remote asset requests. They do not claim to emulate Win32 behavior.
