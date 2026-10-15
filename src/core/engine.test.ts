import { describe, it, expect } from "vitest";
import { advance, createPet, interact, remind, walkingBounds } from "./engine";
import { defaults } from "./settings";
describe("pet motion", () => {
  it("turns at both work area edges without touching the taskbar", () => {
    let p = {
      ...createPet(),
      x: 918,
      animation: "walking" as const,
      nextDecision: 99999,
    };
    const right = advance(p, 1000, 0.1, 1000, defaults);
    expect(right.x).toBe(920);
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
      720,
    );
    expect(advance(createPet(), 0, 0, 70, defaults).x).toBe(0);
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
      0,
    );
    expect(advance(p, 1000, 0, 1920, defaults).x).toBe(p.x);
  });
});

describe("walking area and reminder-only excursions", () => {
  const settings = {
    ...defaults,
    walkStart: 25,
    walkEnd: 75,
    alertsOnly: true,
  };
  for (const homeSide of ["left", "right"] as const) {
    it(`parks ${homeSide}, walks, waves, returns, and stays in the chosen area`, () => {
      const s = { ...settings, homeSide };
      const bounds = walkingBounds(1000, s);
      let pet = advance(createPet(), 0, 0.05, 1000, s);
      expect(pet.x).toBe(bounds.home);
      pet = remind(pet, 0, s);
      const seen = new Set<string>();
      for (let now = 50; now <= 9000; now += 50) {
        pet = advance(pet, now, 0.05, 1000, s);
        seen.add(pet.animation);
        expect(pet.x).toBeGreaterThanOrEqual(250);
        expect(pet.x + s.size).toBeLessThanOrEqual(750);
      }
      expect(seen).toEqual(new Set(["walking", "happy", "idle"]));
      expect(pet.excursion).toBeNull();
      expect(pet.x).toBe(bounds.home);
      expect(advance(pet, 900000, 0.1, 1000, s).animation).toBe("idle");
    });
  }
  it("clamps free walks, large characters, and hotplugged small displays", () => {
    const s = { ...settings, alertsOnly: false };
    let p = {
      ...createPet(),
      animation: "walking" as const,
      x: 669,
      nextDecision: Infinity,
    };
    const edge = advance(p, 0, 0.1, 1000, s);
    expect(edge.x).toBe(670);
    expect(edge.direction).toBe(-1);
    expect(
      walkingBounds(500, { ...s, size: 160, walkStart: 90, walkEnd: 100 }),
    ).toEqual({ left: 340, right: 340, home: 340 });
    expect(advance(edge, 0, 0.1, 60, s).x).toBe(0);
  });
  it("pauses an excursion on hover, resumes sleep, and cancels when movement is disabled", () => {
    let p = remind(interact(createPet(), "sleeping", 0), 0, settings);
    p = advance(p, 50, 0.05, 1000, settings);
    expect(advance(p, 5000, 0, 1000, settings).x).toBe(p.x);
    const parked = advance(p, 5000, 0.1, 1000, { ...settings, roaming: false });
    expect(parked.excursion).toBeNull();
    expect(parked.x).toBe(250);
    for (let now = 100; now < 10000; now += 50)
      p = advance(p, now, 0.05, 1000, settings);
    expect(p.animation).toBe("sleeping");
    expect(p.x).toBe(250);
  });
});
