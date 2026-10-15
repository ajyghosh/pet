# Character collections

Source catalog and spreadsheet inventory for heykup pets. `src/core/characters.ts` imports `characters.json`; native tests also validate it.

The catalog preserves 120 original concepts and 20 reference-only concepts. Original concepts have generated playable assets; reference-only entries remain unavailable. The catalog's historical `planned` status is combined with `src/core/ready-characters.json` to determine availability.

Finished sprite atlases and manifests live in `public/characters/`. Generate them with `npm run icons`, or generate one companion with `node scripts/generate-icons.mjs --character=soft-bear`.

Maple is defined separately in `src/core/characters.ts` in the Soft Friends collection.
