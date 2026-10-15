import { characters, spriteGrid } from "./characters";
import { describe, it, expect } from "vitest";
import { silhouette, sprite } from "./sprite";
import type { Animation } from "./settings";
describe("original sprite and native hit region", () => {
  for (const character of characters)
    for (const animation of [
      "idle",
      "walking",
      "sleeping",
      "jumping",
      "happy",
      "drinking",
    ] as Animation[]) {
      it(`${character.id} ${animation}: hit region covers exactly the rendered pixels, both directions, every frame`, () => {
        const grid = spriteGrid(character.id);
        for (let frame = 0; frame < 32; frame++)
          for (const direction of [-1, 1]) {
            const runs = sprite(
                animation,
                frame,
                "ginger",
                direction,
                character.id,
              ),
              rows = silhouette(runs);
            const visual = new Set<string>(),
              hit = new Set<string>();
            for (const r of runs)
              for (let x = r.x; x < r.x + r.width; x++)
                visual.add(`${x},${r.y}`);
            for (const [left, y, width] of rows) {
              for (let x = left; x < left + width; x++) hit.add(`${x},${y}`);
            }
            expect(rows.length).toBeLessThanOrEqual(1024);
            expect(
              rows.every(
                ([x, y, w]) =>
                  x >= 0 && y >= 0 && y < grid && w > 0 && x + w <= grid,
              ),
            ).toBe(true);
            expect(hit).toEqual(visual);
            expect(hit.size).toBeGreaterThan(50);
            expect(hit.has("0,0")).toBe(false);
            expect([...hit].some((p) => p.endsWith(`,${grid - 1}`))).toBe(true);
          }
      });
    }
  it("every character has a distinct design", () => {
    expect(
      new Set(
        characters.map((c) =>
          JSON.stringify(sprite("idle", 0, "slate", 1, c.id)),
        ),
      ).size,
    ).toBe(characters.length);
  });
  for (const character of characters)
    it(`${character.id}: uses distinct frames for all six animation states`, () => {
      const animations = [
        "idle",
        "walking",
        "sleeping",
        "jumping",
        "happy",
        "drinking",
      ] as Animation[];
      expect(
        new Set(
          animations.map((a) =>
            JSON.stringify(sprite(a, 1, "ginger", 1, character.id)),
          ),
        ).size,
      ).toBe(6);
    });
});

it("native regions use the same looping frame as the atlas after extended runtime", () => {
  for (const c of characters)
    for (const state of ["idle", "sleeping", "walking"] as const) {
      expect(sprite(state, 97, "slate", 1, c.id)).toEqual(
        sprite(state, 1, "slate", 1, c.id),
      );
    }
});
