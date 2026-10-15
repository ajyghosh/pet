# Assets and dependencies

All cat sprites, animation frames, scenery, and application icons were created for this project. They are covered by the repository's MIT license. No downloaded artwork, proprietary animation packs, fonts, paid APIs, or asset subscriptions are used. System fonts are used without bundling font files.

Direct open-source dependencies:

| Dependency | License | Purpose |
| --- | --- | --- |
| Tauri 2 and official plugins | MIT / Apache-2.0 | Native shell, tray, startup, single instance |
| React, React DOM | MIT | User interface |
| TypeScript, Playwright | Apache-2.0 | Types and browser testing |
| Vite, Vitest | MIT | Frontend build and unit testing |
| Lucide | ISC | Interface icons |
| windows-sys | MIT / Apache-2.0 | Windows SDK bindings |
| Serde, serde_json | MIT / Apache-2.0 | Local JSON settings |
| tempfile | MIT / Apache-2.0 | Atomic settings replacement |

Dependencies retain their own licenses and copyright notices. `package-lock.json` and `src-tauri/Cargo.lock` describe the resolved dependency trees. When redistributing, preserve applicable notices from the resolved npm packages and Cargo crates. Use `npm ls --all` and `cargo tree --manifest-path src-tauri/Cargo.toml` to inspect the full trees.

Microsoft WebView2 and the Windows SDK are free Microsoft components, **not open-source libraries**. Tauri's Windows webview requires WebView2. The installer bundles Microsoft's offline WebView2 installer under Microsoft's redistribution terms; this does not introduce a paid service or online app dependency. Windows itself is also proprietary. Miso's own code, artwork, and chosen third-party application libraries are open source.
