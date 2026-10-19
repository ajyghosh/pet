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

it("greeting a sleeping pet clears its indefinite sleep and resumes normal behavior", () => {
  const sleeping = interact(createPet(), "sleeping", 0);
  expect(advance(sleeping, 100000, 0.1, 1000, defaults).animation).toBe(
    "sleeping",
  );
  const awake = interact(sleeping, "happy", 100000);
  expect(awake.animation).toBe("happy");
  expect(Number.isFinite(awake.until)).toBe(true);
  expect(advance(awake, 103000, 0.1, 1000, defaults).animation).toBe("idle");
});

describe("everyday routines without notifications", () => {
  it("walks past the old eleven-second cutoff, then takes a finite rest", () => {
    let pet = advance(createPet(42), 4000, 0.05, 10000, defaults);
    expect(pet.animation).toBe("walking");
    const deadline = pet.nextDecision;
    expect(deadline - 4000).toBeGreaterThanOrEqual(18000);
    expect(deadline - 4000).toBeLessThanOrEqual(38000);
    pet = advance(pet, 15001, 0.05, 10000, defaults);
    expect(pet.animation).toBe("walking");
    pet = advance(pet, deadline, 0.05, 10000, defaults);
    expect(pet.animation).not.toBe("walking");
    expect(pet.nextDecision).toBeGreaterThan(deadline);
    expect(Number.isFinite(pet.nextDecision)).toBe(true);
    pet = advance(pet, pet.nextDecision, 0.05, 10000, defaults);
    expect(pet.animation).toBe("walking");
  });

  it("varies its strolls, looks around, greets, and wakes naturally from naps", () => {
    let pet = createPet(123456);
    const routines = new Set<string>();
    const walkLengths = new Set<number>();
    let turnedWhileResting = false;
    let napWoke = false;
    for (let now = 0; now < 20 * 60_000; now += 100) {
      const previous = pet;
      pet = advance(pet, now, 0.1, 10000, defaults);
      routines.add(pet.routine);
      if (pet.routine === "stroll" && previous.routine !== "stroll")
        walkLengths.add(pet.nextDecision - now);
      if (
        pet.routine === "look" &&
        previous.routine === "look" &&
        pet.direction !== previous.direction
      )
        turnedWhileResting = true;
      if (previous.routine === "nap" && pet.animation === "walking")
        napWoke = true;
      expect(pet.x).toBeGreaterThanOrEqual(0);
      expect(pet.x).toBeLessThanOrEqual(9920);
    }
    expect(routines).toEqual(
      new Set(["rest", "stroll", "look", "greet", "nap"]),
    );
    expect(walkLengths.size).toBeGreaterThan(5);
    expect(turnedWhileResting).toBe(true);
    expect(napWoke).toBe(true);
  });

  it("pauses its routine while hovered and continues the same walk afterward", () => {
    let pet = advance(createPet(42), 4000, 0.05, 10000, defaults);
    const x = pet.x,
      remaining = pet.nextDecision - 4000;
    pet = advance(pet, 64000, 60, 10000, defaults, true);
    expect(pet.x).toBe(x);
    expect(pet.animation).toBe("walking");
    expect(pet.nextDecision - 64000).toBeCloseTo(remaining);
    pet = advance(pet, 64100, 0.1, 10000, defaults);
    expect(pet.x).toBeGreaterThan(x);
    expect(pet.animation).toBe("walking");
  });

  it("pauses to turn at a boundary and never walks on a collapsed walking area", () => {
    const pet = {
      ...createPet(42),
      x: 919,
      animation: "walking" as const,
      nextDecision: Infinity,
    };
    const edge = advance(pet, 1000, 0.1, 1000, defaults);
    expect(edge.x).toBe(920);
    expect(edge.direction).toBe(-1);
    expect(edge.routine).toBe("look");
    expect(edge.animation).toBe("idle");
    expect(
      advance(edge, edge.nextDecision + 1, 0.1, 1000, defaults).x,
    ).toBeLessThan(edge.x);
    const narrow = advance(pet, 5000, 0.1, 70, defaults);
    expect(narrow.x).toBe(0);
    expect(narrow.animation).not.toBe("walking");
  });

  it("keeps explicit sleep asleep and never roams spontaneously in reminder-only mode", () => {
    let asleep = interact(createPet(42), "sleeping", 0);
    let quiet = createPet(42);
    for (let now = 0; now < 120_000; now += 1000) {
      asleep = advance(asleep, now, 0.1, 1000, defaults);
      quiet = advance(quiet, now, 0.1, 1000, { ...defaults, alertsOnly: true });
      expect(asleep.animation).toBe("sleeping");
      expect(quiet.animation).toBe("idle");
      expect(quiet.x).toBe(0);
    }
  });
});
