# Astra: Import MiniMates Character Collections

Extend the existing MiniMates Windows Tauri + React project with the character definitions from `characters.json`.

- Keep all current functionality and collections; merge by stable character ID.
- Add category/style filters, search, previews, and status indicators.
- Do not treat catalog entries as finished art assets.
- Build transparent sprite sheets with walk-left, walk-right, idle, sit, sleep, jump, wave, dance, and character-specific signature animations.
- Render characters standing on the top edge of the Windows taskbar in a transparent overlay. Keep underlying desktop clicks functional.
- Support multiple characters simultaneously, memory-efficient asset loading, and offline reminders.
- Cute 3D Humans must use a consistent stylized 3D look; pre-render to 2D sprites for runtime performance.
- For the licensed-character references collection, keep items as reference-only unless rights to distribute the designs are confirmed; offer original alternatives.
- Implement and test two fully animated characters first, then expand in batches of ten.
- Do not introduce mandatory paid services or AI APIs.
