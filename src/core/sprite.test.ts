import { describe, it, expect } from "vitest";
import { silhouette, sprite } from "./sprite";
import type { Animation } from "./settings";
describe("original sprite and native hit region", () => {
  for (const animation of [
    "idle",
    "walking",
    "sleeping",
    "jumping",
    "happy",
    "drinking",
  ] as Animation[]) {
    it(`${animation}: hit region covers exactly the rendered pixels, both directions, every frame`, () => {
      for (let frame = 0; frame < 32; frame++)
        for (const direction of [-1, 1]) {
          const runs = sprite(animation, frame, "ginger", direction),
            rows = silhouette(runs);
          const visual = new Set<string>(),
            hit = new Set<string>();
          for (const r of runs)
            for (let x = r.x; x < r.x + r.width; x++) visual.add(`${x},${r.y}`);
          for (const [left, y, width] of rows) {
            expect(left).toBeGreaterThanOrEqual(0);
            expect(left + width).toBeLessThanOrEqual(32);
            expect(y).toBeGreaterThanOrEqual(0);
            expect(y).toBeLessThan(32);
            for (let x = left; x < left + width; x++) hit.add(`${x},${y}`);
          }
          expect(hit).toEqual(visual);
          expect(hit.size).toBeGreaterThan(150);
          expect(hit.has("0,0")).toBe(false);
          expect([...hit].some((p) => p.endsWith(",31"))).toBe(true);
        }
    });
  }
  it("uses distinct frames for all six animation states", () => {
    const animations = [
      "idle",
      "walking",
      "sleeping",
      "jumping",
      "happy",
      "drinking",
    ] as Animation[];
    expect(
      new Set(animations.map((a) => JSON.stringify(sprite(a, 1, "ginger"))))
        .size,
    ).toBe(6);
  });
});
