import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { characters, referenceCharacters, spriteGrid } from "./characters";
import seed from "../../MiniMates_Character_Collections/characters.json";
import { normalizeSettings } from "./settings";
describe("complete character collections", () => {
  it("includes every original concept once and keeps references unavailable", () => {
    expect(characters).toHaveLength(132);
    expect(new Set(characters.map((c) => c.id)).size).toBe(132);
    expect(characters.filter((c) => c.style === "cute-3d")).toHaveLength(50);
    expect(referenceCharacters).toHaveLength(20);
    for (const c of seed.characters) {
      expect(characters.some((ready) => ready.id === c.id)).toBe(
        c.asset_status === "planned",
      );
      expect(normalizeSettings({ character: c.id }).character).toBe(
        c.asset_status === "planned" ? c.id : "alex",
      );
    }
  });
  it("ships complete licensed manifests and atlases for every playable character", () => {
    for (const c of characters) {
      const manifest = JSON.parse(
        readFileSync(
          new URL(`../../public/characters/${c.id}.json`, import.meta.url),
          "utf8",
        ),
      );
      expect(manifest).toMatchObject({
        id: c.id,
        assetStatus: "ready",
        license: "MIT",
        frameWidth: spriteGrid(c.id),
        frameHeight: spriteGrid(c.id),
        framesPerAnimation: 32,
        frameDurationMs: 160,
      });
      expect(manifest.states).toHaveLength(6);
      expect(manifest.directions).toEqual(["right", "left"]);
      expect(manifest.outfits).toHaveLength(3);
    }
  });
});
