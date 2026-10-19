import type { Animation, Settings } from "./settings";
export interface PetState {
  x: number;
  direction: 1 | -1;
  animation: Animation;
  until: number;
  nextDecision: number;
  lift: number;
  walkingDistance: number;
  routine: "rest" | "stroll" | "look" | "greet" | "nap";
  randomState: number;
  glanceAt: number;
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
export function createPet(
  seed = Math.floor(Math.random() * 0xffffffff),
): PetState {
  return {
    x: 80,
    direction: 1,
    animation: "idle",
    until: 0,
    nextDecision: 4000,
    lift: 0,
    walkingDistance: 0,
    routine: "rest",
    randomState: seed >>> 0 || 1,
    glanceAt: Infinity,
    excursion: null,
  };
}
// Keep each pet's choices independent and reproducible without sampling randomness
// every frame. Decisions happen only at activity boundaries.
function random(pet: PetState) {
  let n = pet.randomState;
  n ^= n << 13;
  n ^= n >>> 17;
  n ^= n << 5;
  pet.randomState = n >>> 0;
  return pet.randomState / 0x100000000;
}
function duration(pet: PetState, min: number, max: number) {
  return min + random(pet) * (max - min);
}
function beginRest(pet: PetState, now: number, edge = false) {
  const choice = random(pet);
  pet.routine = edge
    ? "look"
    : choice < 0.5
      ? "rest"
      : choice < 0.78
        ? "look"
        : choice < 0.92
          ? "greet"
          : "nap";
  pet.animation =
    pet.routine === "nap"
      ? "sleeping"
      : pet.routine === "greet"
        ? "happy"
        : "idle";
  const [min, max] = edge
    ? [900, 1600]
    : pet.routine === "nap"
      ? [12000, 22000]
      : pet.routine === "greet"
        ? [2000, 3200]
        : [4000, 9000];
  pet.nextDecision = now + duration(pet, min, max);
  pet.glanceAt =
    pet.routine === "look" && !edge
      ? now + duration(pet, 1200, 2000)
      : Infinity;
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
    glanceAt: Infinity,
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
  paused = false,
): PetState {
  const p = { ...pet, excursion: pet.excursion ? { ...pet.excursion } : null };
  const { left, right, home } = walkingBounds(width, settings);
  const dt = paused ? 0 : Math.max(0, Math.min(delta, 0.1));
  if (paused && !p.until) {
    p.nextDecision += Math.max(0, delta) * 1000;
    p.glanceAt += Math.max(0, delta) * 1000;
  }
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
  const parked = !settings.roaming || settings.alertsOnly || right - left < 1;
  if (parked) {
    p.x = home;
    p.direction = settings.homeSide === "right" ? -1 : 1;
  }
  if (p.until && now >= p.until) {
    p.until = 0;
    p.animation = "idle";
    p.routine = "rest";
    p.nextDecision = now + duration(p, 1500, 3000);
  }
  if (!paused && !p.until && now >= p.nextDecision) {
    if (!parked && p.animation !== "walking") {
      p.routine = "stroll";
      p.animation = "walking";
      // Longer, varied strolls replace the old fixed eleven-second stop.
      p.nextDecision = now + duration(p, 18000, 38000);
      p.glanceAt = Infinity;
      if (p.x <= left) p.direction = 1;
      else if (p.x >= right) p.direction = -1;
      else if (random(p) < 0.35) p.direction = p.direction === 1 ? -1 : 1;
    } else if (settings.alertsOnly) {
      p.animation = "idle";
      p.nextDecision = now + duration(p, 4000, 9000);
    } else beginRest(p, now);
  }
  if (!paused && !p.until && p.routine === "look" && now >= p.glanceAt) {
    if (!parked) p.direction = p.direction === 1 ? -1 : 1;
    p.glanceAt = now + duration(p, 1200, 2400);
  }
  if (parked && p.animation === "walking") p.animation = "idle";
  if (p.animation === "walking") {
    p.x += p.direction * settings.speed * dt;
    if (p.x >= right) {
      p.x = right;
      p.direction = -1;
      if (!p.until && dt > 0) beginRest(p, now, true);
    }
    if (p.x <= left) {
      p.x = left;
      p.direction = 1;
      if (!p.until && dt > 0) beginRest(p, now, true);
    }
    p.walkingDistance += Math.abs(p.x - previousX);
  }
  p.lift =
    p.animation === "jumping"
      ? Math.max(0, Math.sin((1 - (p.until - now) / 700) * Math.PI) * 65)
      : 0;
  return p;
}
