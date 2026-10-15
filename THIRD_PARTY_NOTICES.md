# Assets and dependencies

All MiniMates human, animal, robot, and dragon sprites, PNG animation atlases, scenery, and application icons were created for this project. They are covered by the repository's MIT license. No downloaded artwork, proprietary animation packs, fonts, paid APIs, or asset subscriptions are used. System fonts are used without bundling font files.

Direct open-source dependencies:

| Dependency                             | License          | Purpose                                              |
| -------------------------------------- | ---------------- | ---------------------------------------------------- |
| Tauri 2 and official plugins           | MIT / Apache-2.0 | Native shell, tray, startup, single instance         |
| React, React DOM                       | MIT              | User interface                                       |
| TypeScript, Playwright                 | Apache-2.0       | Types and browser testing                            |
| Vite, Vitest                           | MIT              | Frontend build and unit testing                      |
| Lucide                                 | ISC              | Interface icons                                      |
| objc2, objc2-app-kit, objc2-foundation | MIT              | Safe Objective-C bindings for AppKit screens/windows |
| core-graphics, core-foundation         | MIT / Apache-2.0 | macOS mouse event routing and run loops              |
| windows-sys                            | MIT / Apache-2.0 | Windows SDK bindings                                 |
| Serde, serde_json                      | MIT / Apache-2.0 | Local JSON settings                                  |
| tempfile                               | MIT / Apache-2.0 | Atomic settings replacement                          |

Dependencies retain their own licenses and copyright notices. `package-lock.json` and `src-tauri/Cargo.lock` describe the resolved dependency trees. When redistributing, preserve applicable notices from the resolved npm packages and Cargo crates. Use `npm ls --all` and `cargo tree --manifest-path src-tauri/Cargo.toml` to inspect the full trees.

Microsoft WebView2 and the Windows SDK are free Microsoft components, **not open-source libraries**. Tauri's Windows webview requires WebView2. The installer bundles Microsoft's offline WebView2 installer under Microsoft's redistribution terms; this does not introduce a paid service or online app dependency. Windows itself is also proprietary. Miso's own code, artwork, and chosen third-party application libraries are open source.

macOS, AppKit, CoreGraphics, and the system WebKit framework are Apple platform components, not bundled open-source libraries. Miso uses the frameworks supplied with macOS; no paid Apple service is required to build or run an ad-hoc-signed copy.

`public/characters/*.json` documents each character's atlas layout and MIT license. 132 original characters, six animation states, two facing directions, and three color styles are shipped (396 PNG atlases). The user-supplied `MiniMates_Character_Collections` folder contains 140 concept records, not source artwork. Original procedural models/sprites were created here for its 120 planned original concepts. Its 20 named licensed-character references remain catalog text only, with no bundled character artwork or playable assets. The original Miso artwork remains available in Git history under the same license.
