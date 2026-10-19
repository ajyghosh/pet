# Contributing to heykup pets

Thanks for helping make a little desktop company better. Code, original character artwork, documentation improvements, accessibility fixes, and testing on Windows and macOS are all useful contributions.

## Start here

For a bug, [open an issue](https://github.com/ajyghosh/pet/issues) with the app version, OS version, reproduction steps, expected behavior, and actual behavior. For placement or input problems, include monitor layout and display scaling. Remove personal information from screenshots and logs.

For a larger feature or new dependency, discuss the idea in an issue before starting. The app currently supports one active companion; the [README](README.md#current-scope-and-future-work) explain the current scope.

## Set up a checkout

Fork the repository on GitHub, clone your fork, and create a branch for your change. Install Node.js 24, then run:

```sh
npm ci
npm run dev
```

Open http://localhost:1420 to work on the settings UI, galleries and previews. To work on desktop behavior, install the platform prerequisites in the [README](README.md#run-the-desktop-app) and run `npm run desktop:dev`.

## Make your change

- Keep pull requests focused and describe the user-visible problem they solve.
- Preserve offline operation. Bundle runtime assets locally and avoid adding remote service requirements.
- Use original artwork or assets whose licenses permit redistribution. Document third-party attribution.
- Keep native commands validated in Rust and update both frontend and native validation when changing shared settings.
- Update documentation and add relevant regression coverage for behavior changes. Include screenshots for visual changes.

Bundled sprites and icons are generated with `npm run icons`. The renderer lives in `src/core/collectionArtwork.ts`; character catalogs live in `assets/characters/`. Generated pixels and native hit regions must agree. See the [collection catalog](assets/characters/collections/README.md) before adding a character.

## Check your work

For code changes, run the frontend tests, release consistency checks, and production build:

```sh
npm run check
```

For UI or browser behavior changes:

```sh
npx playwright install chromium
npm run test:e2e
```

For native Rust changes, run these on the supported platform you are developing on:

```sh
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo test --locked --manifest-path src-tauri/Cargo.toml
cargo clippy --locked --manifest-path src-tauri/Cargo.toml -- -D warnings
```

Use Prettier to format changed frontend files. For documentation-only changes, check links, image paths, and the rendered Markdown, then run `git diff --check`.

Dependency updates must keep lockfiles and third-party notices in sync; see the [guide's distribution notes](docs/USER_GUIDE.md#distribution-and-brand) for `npm run notices` prerequisites. The [desktop CI workflow](.github/workflows/desktop.yml) runs frontend, browser, and native checks before packaging all three supported targets.

## Open a pull request

Explain what changed, why, and how you verified it. Link the related issue, include screenshots for UI changes, and state any platform checks you could not run. Do not include generated installers, local settings, secrets, or unrelated formatting changes.

Browser tests and mocked Tauri calls cannot prove native overlay behavior. For placement, mouse handling, startup, reminders, or packaging changes, use the [Windows](docs/WINDOWS_TESTING.md) or [macOS](docs/MACOS_TESTING.md) acceptance checklist and report what you actually tested.

Contributions are distributed under the project's [MIT License](LICENSE). Third-party material retains its own applicable license and attribution.
