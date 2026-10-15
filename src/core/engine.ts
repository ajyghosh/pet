import type { Animation, Settings } from "./settings";
export interface PetState {
  x: number;
  direction: 1 | -1;
  animation: Animation;
  until: number;
  nextDecision: number;
  lift: number;
}
export function createPet(): PetState {
  return {
    x: 80,
    direction: 1,
    animation: "idle",
    until: 0,
    nextDecision: 4000,
    lift: 0,
  };
}
export function interact(
  pet: PetState,
  animation: Animation,
  now: number,
): PetState {
  return {
    ...pet,
    animation,
    until:
      animation === "sleeping"
        ? Infinity
        : now + (animation === "jumping" ? 700 : 2300),
    lift: 0,
  };
}
export function advance(
  pet: PetState,
  now: number,
  delta: number,
  width: number,
  settings: Settings,
): PetState {
  const p = { ...pet },
    max = Math.max(0, width - settings.size);
  p.x = Math.max(0, Math.min(max, p.x));
  if (p.until && now >= p.until) {
    p.until = 0;
    p.animation = "idle";
    p.nextDecision = now + 2200;
  }
  if (!p.until && now >= p.nextDecision) {
    p.animation =
      settings.roaming && p.animation !== "walking" ? "walking" : "idle";
    p.nextDecision = now + (p.animation === "walking" ? 11000 : 4500);
  }
  if (!settings.roaming && p.animation === "walking") p.animation = "idle";
  if (p.animation === "walking") {
    p.x += p.direction * settings.speed * Math.max(0, Math.min(delta, 0.1));
    if (p.x >= max) {
      p.x = max;
      p.direction = -1;
    }
    if (p.x <= 0) {
      p.x = 0;
      p.direction = 1;
    }
  }
  p.lift =
    p.animation === "jumping"
      ? Math.max(0, Math.sin((1 - (p.until - now) / 700) * Math.PI) * 65)
      : 0;
  return p;
}
