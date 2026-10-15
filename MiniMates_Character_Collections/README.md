# MiniMates Character Collection Pack

This pack contains **character specifications**, not finished images, 3D models, or animated sprite sheets.

Use `characters.json` as the character library seed data. Every character has a collection, style, and proposed signature action.

## Instructions for Astra
1. Import the JSON into the existing MiniMates character library without replacing existing records. Deduplicate by `id`.
2. Treat `asset_status: planned` as not playable. Do not show an Add to Desktop button until valid sprite sheets exist.
3. Build one working character with transparent walking/idle sprites and test taskbar positioning first.
4. Expand in batches, preserving existing reminder, tray, and multi-character behavior.
5. For Cute 3D Humans, create original stylized 3D characters and pre-render sprites for low runtime overhead.
6. Famous-character entries are reference-only. Do not bundle protected designs or names in a public release without appropriate rights.
7. Require transparent sprite assets, manifest validation, and licensing metadata for each installable pack.

## Files
- `characters.json`: all character definitions
- `characters.csv`: spreadsheet-friendly inventory
- `ASTRA_PROMPT.md`: copyable implementation brief
