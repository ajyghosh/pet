> **Current scope:** The custom-character library, manual creator, photo-creation entry, and preset export have been removed. Creator details below describe an earlier snapshot.

# Offline character creator — Phase 1

For the current lowercase **heykup pets** brand, beta fixes and custom reminders, see [the beta follow-up](BETA_FIXES.md). This document records the original creator integration.

Implemented on 15 October 2026 against the existing Tauri 2 / React / TypeScript application. The interrupted workspace contained metadata validation and partial settings changes, but no creator UI, custom artwork integration, native persistence or native selection support. A source backup of that state was saved at `/tmp/minimates-resume-backup/workspace-before-creator.tgz` (temporary local file, not a release artifact).

## Implementation

- `src/components/CustomCharacterLibrary.tsx`: manual editor, live animated preview, left/right views, undo/reset, custom library, preview/edit/rename, duplicate, delete, export and desktop selection. Library changes use the existing Save/Discard workflow. Maximum 50 saved presets and one active companion.
- `src/core/customCharacters.ts` and `creator-options.json`: strict appearance-only preset validation and shared option allowlists. Names support up to 80 Unicode code points; personality is descriptive metadata.
- `src/core/collectionArtwork.ts`, `sprite.ts`, `characters.ts`, `src/components/PetSprite.tsx` and `CompanionPreview.tsx`: extend the original articulated ellipsoid renderer; custom figures use 64×64 canvas pixels and matching native hit spans. Edits invalidate pose cache entries. Bundled PNG atlases and existing character IDs remain unchanged. Preview respects reduced-motion preferences on entry.
- `src/core/settings.ts`, `src/api.ts`, `src/App.tsx` and `src/PetWindow.tsx`: migrate old settings with an empty library, restore custom metadata, apply saved changes to the native pet and preserve reminders/placement controls.
- `src-tauri/src/custom_characters.rs`, `settings.rs` and `lib.rs`: validate custom records before atomic settings persistence and activation. A settings-window-only export command writes validated JSON into Downloads without replacing previous files. Browser export uses a local download.
- `assets/characters/creator/schemas/character.schema.json`: narrowed the starter schema to the implemented manual preset format, including supported face/clothing fields and no external animation paths.

No new dependency, network API, inference model, photo access or frontend filesystem capability was added. The original source artwork and renderer remain MIT licensed. There was no existing updater or multi-pet implementation to extend.

## Validation

| Check | Result |
| --- | --- |
| `npm run check` | 1,346 tests passed across 7 files; TypeScript and production Vite build passed |
| `MISO_CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:e2e` | 13 browser tests passed, including creator lifecycle, offline behavior, native 64px frame matching and native export bridge |
| `cargo test --locked --manifest-path src-tauri/Cargo.toml` | 14 tests passed on Mac Intel, including migration, rejected unsafe presets, atomic persistence and exports without overwriting |
| `cargo clippy --locked --manifest-path src-tauri/Cargo.toml -- -D warnings` | Passed |
| `cargo fmt --manifest-path src-tauri/Cargo.toml --check` | Passed |
| `npx prettier --check src scripts tests '*.ts' '*.json' index.html` | Passed |
| `git diff --check` | Passed |
| Visual inspection | Manual editor and rendered character inspected; screenshot in `creator.png` |

The local Rust toolchain is under `/tmp/miso-cargo` and `/tmp/miso-rustup`. On this host prefix Cargo commands with `CARGO_HOME=/tmp/miso-cargo RUSTUP_HOME=/tmp/miso-rustup` and use `/tmp/miso-cargo/bin/cargo`. Browser tests require permission to bind a local server and launch Chrome outside the filesystem sandbox.

The browser lifecycle test verifies visible appearance changes, undo/reset, all six animation controls, create/edit/duplicate, export contents, Save/Discard, reload persistence, active selection, active-character deletion fallback, and no external requests or JavaScript errors. Renderer tests ensure every advertised appearance choice changes the output, mirrored spans match, native bounds remain valid, and editing an existing ID cannot reuse stale artwork.

## Scope and remaining acceptance work

Phase 1 provides six actual shared animations: idle, walk left/right, wave, jump, drink water and sleep. Sitting, dancing, stretching and additional viewing angles are unavailable. Export is appearance JSON for this renderer, not an independently playable sprite pack; imports are unavailable.

Photo intake, cropping, local AI, model compatibility/downloads, ZIP import/export, multiple active characters, quiet hours and release packaging are later work. The supplied broader checklist intentionally remains incomplete. No performance or whole-app memory benchmark was taken. No new Windows installer, Apple Silicon build, native desktop smoke, Accessibility interaction or compositor/monitor acceptance run was performed for these changes; mocked bridge and geometry tests do not substitute for them. Existing platform acceptance checklists still apply.

To try it, run `npm run dev` or `npm run desktop:dev`, open Characters → Create Character → Create Manually, select Keep character, Add to Desktop, then Save changes. No account or model setup is required.
