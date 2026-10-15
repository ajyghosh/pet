# Integration plan

## 0. Repository inspection
1. Inventory UI routes/components, state management, Tauri plugins, animation renderer, character packs, storage, updater, Windows/macOS overlays.
2. Back up or commit the current state before modifications. Avoid destructive schema changes.
3. Document platform constraints: macOS Dock is not a fixed Windows-style taskbar; respect auto-hide, Dock placement, multiple displays and fullscreen.
4. Establish baseline tests and memory use.

## 1. Manual creator (ship first)
- Add Character Library > Create Character > Create Manually.
- Offer selectable compatible base body, face/skin tone, eyes, hairstyle/color, outfit, shoes, accessories, display name and personality.
- Build live preview and undo/reset; use reusable layered assets or rigged models only if supported by actual repository assets.
- Create a normalized saved-character record and store it in the existing application data directory; preserve after updates.
- Map created appearance to a reusable animation rig or render sprite atlas from compatible parts; show honest fallback if an asset is missing.
- Integrate saved characters into My Custom Characters and desktop activation.

## 2. Photo intake
- Use native file dialog; JPG/PNG/WebP; validate file signatures, dimensions, size, decode errors; crop/rotate/preview.
- Strip EXIF and keep files local; explicitly choose whether to retain the source image, default discard after processing.
- Never silently transmit photos.

## 3. Optional local AI
- Implement a pluggable image-to-character backend only after evaluating real local model support and licenses.
- Display model size, hardware requirements, expected processing time and explicit download consent.
- Distinguish a stylized likeness from an exact likeness. Portrait-only input does not reveal full-body attire.
- Convert AI output into an editable character template where technically feasible; do not imply one image automatically provides a fully rigged 3D model.
- If no suitable GPU/model, provide the manual editor with photo side-by-side as reference.
- Shut down inference process and release model memory when finished.

## 4. Animation and import/export
- Ensure every usable character has real walking left/right, idle, sitting, sleeping, jumping, waving, dancing, stretching and water animations, or explicitly indicate unavailable actions.
- Prefer shared skeleton/layer system and pre-rendered transparent sprites to reduce runtime GPU load.
- Validate pack schema, assets, paths and sizes. Prevent ZIP slip and archive bombs. Export with metadata and license details.
- Keep overlay mouse pass-through behavior, proper taskbar baseline and optional Dock-area behavior.

## 5. Release validation
- Run Windows and macOS tests, including Intel and Apple Silicon where build infrastructure allows.
- Verify privacy, no paid dependency, persistence, migration, memory, tray, startup, update compatibility.
- Signed/notarized public builds are separate release concerns; do not bypass operating-system security.
