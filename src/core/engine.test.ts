import { describe, it, expect } from "vitest";
import { advance, createPet, interact } from "./engine";
import { defaults } from "./settings";
describe("pet motion", () => {
  it("turns at both work area edges without touching the taskbar", () => {
    let p = {
      ...createPet(),
      x: 870,
      animation: "walking" as const,
      nextDecision: 99999,
    };
    const right = advance(p, 1000, 0.1, 1000, defaults);
    expect(right.x).toBe(872);
    expect(right.direction).toBe(-1);
    const left = advance(
      { ...p, x: 0, direction: -1 },
      1000,
      0.1,
      1000,
      defaults,
    );
    expect(left.x).toBe(0);
    expect(left.direction).toBe(1);
  });
  it("clamps after unplugging a large monitor and on extremely narrow screens", () => {
    expect(advance({ ...createPet(), x: 3000 }, 0, 0, 800, defaults).x).toBe(
      672,
    );
    expect(advance(createPet(), 0, 0, 90, defaults).x).toBe(0);
  });
  it("does not teleport when the computer resumes", () => {
    const p = {
      ...createPet(),
      animation: "walking" as const,
      nextDecision: Infinity,
    };
    expect(advance(p, 100000, 1000, 1920, defaults).x - p.x).toBeCloseTo(4.5);
  });
  it("jumps then returns to the baseline, and sleeps until interacted with", () => {
    const jump = interact(createPet(), "jumping", 1000);
    expect(advance(jump, 1350, 0.03, 1920, defaults).lift).toBeCloseTo(65);
    expect(advance(jump, 1701, 0.03, 1920, defaults).lift).toBe(0);
    const sleep = interact(createPet(), "sleeping", 1000);
    expect(advance(sleep, 900000, 0.1, 1920, defaults).animation).toBe(
      "sleeping",
    );
    expect(interact(sleep, "happy", 900001).animation).toBe("happy");
  });
  it("stops roaming immediately when disabled and while hovered", () => {
    const p = {
      ...createPet(),
      animation: "walking" as const,
      nextDecision: Infinity,
    };
    expect(advance(p, 1000, 1, 1920, { ...defaults, roaming: false }).x).toBe(
      p.x,
    );
    expect(advance(p, 1000, 0, 1920, defaults).x).toBe(p.x);
  });
});
