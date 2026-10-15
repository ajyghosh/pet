import { characters, spriteGrid } from "./characters";
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { describe, it, expect } from "vitest";
import { sprite } from "./sprite";
import type { Animation, Coat } from "./settings";
describe("shipped PNG assets match the native click regions", () => {
  const states: Animation[] = [
    "idle",
    "walking",
    "sleeping",
    "jumping",
    "happy",
    "drinking",
  ];
  for (const character of characters)
    for (const coat of ["ginger", "cream", "slate"] as Coat[])
      it(`${character.id} ${coat}: every frame, direction, and color matches`, () => {
        const grid = spriteGrid(character.id);
        const width = grid * 32,
          stride = width * 4 + 1;
        const png = readFileSync(
          new URL(
            `../../public/characters/${character.id}-${coat}.png`,
            import.meta.url,
          ),
        );
        expect(png.readUInt32BE(16)).toBe(width);
        expect(png.readUInt32BE(20)).toBe(grid * 12);
        const chunks: Buffer[] = [];
        for (let offset = 8; offset < png.length;) {
          const length = png.readUInt32BE(offset);
          if (png.toString("ascii", offset + 4, offset + 8) === "IDAT")
            chunks.push(png.subarray(offset + 8, offset + 8 + length));
          offset += length + 12;
        }
        const scan = inflateSync(Buffer.concat(chunks));
        expect(
          Array.from({ length: grid * 12 }, (_, y) => scan[y * stride]).every(
            (filter) => filter === 0,
          ),
        ).toBe(true);
        states.forEach((animation, index) => {
          for (const direction of [1, -1])
            for (let frame = 0; frame < 32; frame++) {
              const expected = Buffer.alloc(grid * grid * 4),
                actual = Buffer.alloc(grid * grid * 4);
              for (const r of sprite(
                animation,
                frame,
                coat,
                direction,
                character.id,
              ))
                for (let x = r.x; x < r.x + r.width; x++) {
                  const o = (r.y * grid + x) * 4;
                  expected[o] = parseInt(r.color.slice(1, 3), 16);
                  expected[o + 1] = parseInt(r.color.slice(3, 5), 16);
                  expected[o + 2] = parseInt(r.color.slice(5, 7), 16);
                  expected[o + 3] = 255;
                }
              const row = index * 2 + (direction < 0 ? 1 : 0);
              for (let y = 0; y < grid; y++) {
                const offset = (row * grid + y) * stride;
                scan.copy(
                  actual,
                  y * grid * 4,
                  offset + 1 + frame * grid * 4,
                  offset + 1 + (frame + 1) * grid * 4,
                );
              }
              expect(
                actual.equals(expected),
                `${animation} frame ${frame} direction ${direction}`,
              ).toBe(true);
            }
        });
      }, 20000);
});
