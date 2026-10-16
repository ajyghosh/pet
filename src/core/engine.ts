import type { Animation, Settings } from "./settings";
export interface PetState {
  x: number;
  direction: 1 | -1;
  animation: Animation;
  until: number;
  nextDecision: number;
  lift: number;
  walkingDistance: number;
  excursion: {
    phase: "out" | "wave" | "home";
    elapsed: number;
    resumeSleep: boolean;
  } | null;
}
/** Percentages describe the whole character's footprint within the work area. */
export function walkingBounds(width: number, settings: Settings) {
  const available = Math.max(0, width - settings.size);
  const left = Math.min(
    available,
    Math.max(0, (width * settings.walkStart) / 100),
  );
  const right = Math.max(
    left,
    Math.min(available, (width * settings.walkEnd) / 100 - settings.size),
  );
  return { left, right, home: settings.homeSide === "right" ? right : left };
}
export function createPet(): PetState {
  return {
    x: 80,
    direction: 1,
    animation: "idle",
    until: 0,
    nextDecision: 4000,
    lift: 0,
    walkingDistance: 0,
    excursion: null,
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
    excursion: null,
  };
}
export function remind(
  pet: PetState,
  now: number,
  settings: Settings,
  water = false,
): PetState {
  if (settings.roaming && settings.alertsOnly) {
    return {
      ...pet,
      until: 0,
      lift: 0,
      excursion: {
        phase: "out",
        elapsed: 0,
        resumeSleep: pet.animation === "sleeping",
      },
    };
  }
  return interact(pet, water ? "drinking" : "happy", now);
}
export function advance(
  pet: PetState,
  now: number,
  delta: number,
  width: number,
  settings: Settings,
): PetState {
  const p = { ...pet, excursion: pet.excursion ? { ...pet.excursion } : null };
  const { left, right, home } = walkingBounds(width, settings);
  const dt = Math.max(0, Math.min(delta, 0.1));
  p.x = Math.max(left, Math.min(right, p.x));
  const previousX = p.x;
  if (!(settings.roaming && settings.alertsOnly)) p.excursion = null;
  if (p.excursion) {
    const trip = p.excursion;
    const inward = settings.homeSide === "right" ? -1 : 1;
    const target =
      trip.phase === "home"
        ? home
        : home + inward * Math.min(right - left, settings.speed * 2);
    p.lift = 0;
    if (trip.phase === "wave") {
      p.animation = "happy";
      trip.elapsed += dt;
      if (trip.elapsed >= 2.3) {
        trip.phase = "home";
        trip.elapsed = 0;
      }
    } else {
      const distance = target - p.x;
      p.direction = distance < 0 ? -1 : distance > 0 ? 1 : inward;
      p.animation = "walking";
      p.x +=
        Math.sign(distance) * Math.min(Math.abs(distance), settings.speed * dt);
      if (Math.abs(target - p.x) < 0.01) {
        if (trip.phase === "out") {
          trip.phase = "wave";
          p.animation = "happy";
        } else {
          p.excursion = null;
          p.animation = trip.resumeSleep ? "sleeping" : "idle";
          p.until = trip.resumeSleep ? Infinity : 0;
          p.direction = inward;
        }
      }
    }
    p.walkingDistance += Math.abs(p.x - previousX);
    return p;
  }
  const parked = !settings.roaming || settings.alertsOnly;
  if (parked) {
    p.x = home;
    p.direction = settings.homeSide === "right" ? -1 : 1;
  }
  if (p.until && now >= p.until) {
    p.until = 0;
    p.animation = "idle";
    p.nextDecision = now + 2200;
  }
  if (!p.until && now >= p.nextDecision) {
    p.animation = !parked && p.animation !== "walking" ? "walking" : "idle";
    p.nextDecision = now + (p.animation === "walking" ? 11000 : 4500);
  }
  if (parked && p.animation === "walking") p.animation = "idle";
  if (p.animation === "walking") {
    p.x += p.direction * settings.speed * dt;
    if (p.x >= right) {
      p.x = right;
      p.direction = -1;
    }
    if (p.x <= left) {
      p.x = left;
      p.direction = 1;
    }
    p.walkingDistance += Math.abs(p.x - previousX);
  }
  p.lift =
    p.animation === "jumping"
      ? Math.max(0, Math.sin((1 - (p.until - now) / 700) * Math.PI) * 65)
      : 0;
  return p;
}
