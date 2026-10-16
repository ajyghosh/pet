import { describe, expect, it } from "vitest";
import { footPose, walkingFrame } from "./gait";
import {
  advance,
  createPet,
  remind,
  walkingBounds,
  type PetState,
} from "./engine";
import { defaults } from "./settings";

describe("grounded walking", () => {
  it("keeps a supporting foot planted as the body travels, then lifts it to step", () => {
    for (const size of [48, 80, 160]) {
      const stride = size * (12 / 32);
      for (let frame = 0; frame <= 4; frame++) {
        const distance = (frame / 8) * stride;
        const foot = footPose(walkingFrame(distance, size));
        expect(foot.lift).toBe(0);
        expect(distance + (foot.travel * stride) / 4).toBeCloseTo(stride / 4);
      }
    }
    expect(footPose(6).lift).toBe(2);
    expect(footPose(6, true).lift).toBe(0);
    expect(footPose(8)).toEqual(footPose(0));
  });

  it("advances the gait by distance at every walking speed and freezes on hover", () => {
    for (const speed of [10, 45, 100]) {
      let pet: PetState = {
        ...createPet(),
        animation: "walking" as const,
        nextDecision: Infinity,
      };
      for (let tick = 0; tick < 10; tick++)
        pet = advance(pet, tick * 100, 0.1, 1920, { ...defaults, speed });
      expect(pet.walkingDistance).toBeCloseTo(speed);
      expect(walkingFrame(pet.walkingDistance, defaults.size)).toBe(
        walkingFrame(speed, defaults.size),
      );
      expect(advance(pet, 2000, 0, 1920, defaults).walkingDistance).toBe(
        pet.walkingDistance,
      );
    }
  });

  it("counts actual travel at boundaries, excludes repositioning, and steps on reminder trips", () => {
    const pet = {
      ...createPet(),
      x: 919,
      animation: "walking" as const,
      nextDecision: Infinity,
    };
    const edge = advance(pet, 0, 0.1, 1000, defaults);
    expect(edge.walkingDistance).toBe(1);
    expect(advance(edge, 0, 0, 500, defaults).walkingDistance).toBe(1);
    expect(
      advance(edge, 0, 0.1, 1000, { ...defaults, roaming: false })
        .walkingDistance,
    ).toBe(1);
    const settings = {
      ...defaults,
      alertsOnly: true,
      homeSide: "right" as const,
    };
    const home = { ...createPet(), x: walkingBounds(1000, settings).home };
    const trip = advance(remind(home, 0, settings), 100, 0.1, 1000, settings);
    expect(trip.direction).toBe(-1);
    expect(trip.walkingDistance).toBeCloseTo(settings.speed * 0.1);
  });
});
