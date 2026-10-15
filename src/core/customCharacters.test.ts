import unicodeDuplicate from "../../tests/fixtures/unicode-duplicate.json";
import { afterEach, describe, expect, it } from "vitest";
import {
  creatorOptions,
  newCustomCharacter,
  registerCustomCharacters,
  validateCustomCharacter,
  validateCustomCharacters,
} from "./customCharacters";
import { defaults, normalizeSettings } from "./settings";
import { sprite, silhouette } from "./sprite";
import { spriteGrid } from "./characters";
import { collectionSprite } from "./collectionArtwork";

afterEach(() => registerCustomCharacters([]));
describe("manual character persistence and validation", () => {
  it("migrates old settings and preserves new presets and Unicode names", () => {
    expect(normalizeSettings({ name: "My Miso" }).customCharacters).toEqual([]);
    const c = newCustomCharacter();
    c.name = "🙂".repeat(80);
    const s = {
      ...structuredClone(defaults),
      name: c.name,
      character: c.id,
      customCharacters: [c],
    };
    expect(normalizeSettings(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
  it("rejects unsafe, duplicate, oversized, and unsupported records", () => {
    const c = newCustomCharacter();
    for (const patch of [
      { id: "../alex" },
      { id: "alex" },
      { source: "photo-local-ai" },
      { name: " " },
      { name: "x".repeat(81) },
      { unexpected: "file" },
      { animations: { idle: "../../file" } },
      { appearance: { ...c.appearance, skinTone: "invalid" } },
      { appearance: { ...c.appearance, accessories: ["hat", "hat"] } },
      { appearance: { ...c.appearance, outfitColor: "url(x)" } },
    ])
      expect(() => validateCustomCharacter({ ...c, ...patch })).toThrow();
    expect(() => validateCustomCharacters([c, c])).toThrow();
    expect(() =>
      validateCustomCharacters(Array.from({ length: 51 }, newCustomCharacter)),
    ).toThrow();
  });
  it("fills optional appearance fields from compatible defaults", () => {
    const c = newCustomCharacter();
    const { faceShape, outfitColor, ...appearance } = c.appearance;
    expect(validateCustomCharacter({ ...c, appearance })).toEqual(c);
  });
});
describe("shared custom animation renderer", () => {
  it("renders every advertised appearance choice visibly", () => {
    const c = newCustomCharacter();
    const render = () =>
      JSON.stringify(
        collectionSprite(c.id, 64, "idle", 0, "slate", 1, c.appearance),
      );
    for (const [key, choices] of Object.entries(creatorOptions)) {
      const results = choices.map((choice) => {
        c.appearance = {
          ...newCustomCharacter().appearance,
          [key]: key === "accessories" ? [choice] : choice,
        };
        return render();
      });
      expect(new Set(results).size, key).toBe(choices.length);
    }
  });
  it("uses real poses, exact mirrored spans, and refreshes edited appearance without stale cache", () => {
    const c = newCustomCharacter();
    registerCustomCharacters([c]);
    expect(spriteGrid(c.id)).toBe(64);
    const idle = sprite("idle", 0, "slate", 1, c.id);
    for (const state of [
      "walking",
      "happy",
      "jumping",
      "drinking",
      "sleeping",
    ] as const) {
      const runs = sprite(state, 1, "slate", 1, c.id);
      expect(runs.length).toBeGreaterThan(0);
      expect(runs).not.toEqual(idle);
      const spans = silhouette(runs);
      expect(spans.length).toBeLessThanOrEqual(1024);
      expect(
        spans.every(([x, y, w]) => x >= 0 && y >= 0 && y < 64 && x + w <= 64),
      ).toBe(true);
    }
    const pixels = (direction: number) =>
      new Set(
        sprite("walking", 1, "slate", direction, c.id).flatMap((r) =>
          Array.from(
            { length: r.width },
            (_, n) => `${direction < 0 ? 63 - r.x - n : r.x + n},${r.y}`,
          ),
        ),
      );
    expect(pixels(-1)).toEqual(pixels(1));
    c.appearance.hairColor = "rose";
    registerCustomCharacters([c]);
    expect(sprite("idle", 0, "slate", 1, c.id)).not.toEqual(idle);
  });
});

describe("Unicode duplication and native JSON compatibility", () => {
  it("duplicates a boundary emoji without splitting its surrogate pair", async () => {
    const { duplicateCustomCharacter, assertUnicodeText } =
      await import("./customCharacters");
    const original = newCustomCharacter();
    original.name = "a".repeat(73) + "🙂";
    const copy = duplicateCustomCharacter(original);
    expect(copy.id).not.toBe(original.id);
    expect(copy.name).toBe(original.name + " copy");
    expect(
      validateCustomCharacter({
        ...unicodeDuplicate,
        id: copy.id,
        personality: original.personality,
      }),
    ).toEqual(copy);
    expect(() => assertUnicodeText(copy)).not.toThrow();
    original.name = "🙂".repeat(80);
    expect([...duplicateCustomCharacter(original).name]).toHaveLength(80);
  });
  it("rejects lone surrogates in custom metadata and general settings", async () => {
    const { assertUnicodeText } = await import("./customCharacters");
    for (const field of ["name", "personality", "license"]) {
      expect(() =>
        validateCustomCharacter({
          ...newCustomCharacter(),
          [field]: "broken\ud83d",
        }),
      ).toThrow(/Unicode/);
    }
    expect(() =>
      assertUnicodeText({ reminders: { water: { message: "\ude42" } } }),
    ).toThrow(/Unicode/);
    expect(() =>
      assertUnicodeText({ name: "🙂 Malayalam മലയാളം" }),
    ).not.toThrow();
  });
});
