import { footPose } from "./gait.ts";
import type { Animation, Coat } from "./settings";

export interface Shape {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  color: number;
}

/** Original small reptiles, built from shaded forms in a 32-point art space. */
export function reptileShapes(
  id: string,
  animation: Animation,
  frame: number,
  coat: Coat,
): Shape[] {
  const shapes: Shape[] = [];
  const species = id.slice("reptile-".length);
  const walking = animation === "walking",
    sleeping = animation === "sleeping";
  const happy = animation === "happy",
    jumping = animation === "jumping",
    drinking = animation === "drinking";
  const t = (frame / 32) * Math.PI * 2;
  const palette: Record<string, number[]> = {
    chameleon: [0x79b85d, 0xd0bb6d, 0x6eaaa6],
    gecko: [0xe0af59, 0xead69e, 0x8ca4bd],
    tortoise: [0x80965b, 0xb8a16b, 0x769b8f],
    snake: [0xb8a259, 0xd7c595, 0x9292bb],
    crocodile: [0x71945b, 0xa1a778, 0x6f9293],
  };
  const skin = palette[species][["ginger", "cream", "slate"].indexOf(coat)];
  const shade = (color: number, factor: number) => {
    const channel = (shift: number) =>
      Math.min(255, Math.round(((color >> shift) & 255) * factor));
    return (channel(16) << 16) | (channel(8) << 8) | channel(0);
  };
  const dark = shade(skin, 0.66),
    belly = 0xe9dcaa,
    ink = 0x293332;
  const sphere = (
    x: number,
    y: number,
    z: number,
    rx: number,
    ry: number,
    rz: number,
    color = skin,
  ) => {
    shapes.push({ x, y, z, rx, ry, rz, color });
  };
  const ball = (
    x: number,
    y: number,
    z: number,
    radius: number,
    color = skin,
  ) => sphere(x, y, z, radius, radius, radius, color);
  const line = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    z: number,
    radius: number,
    color = skin,
  ) => {
    const count = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) * 1.5));
    for (let i = 0; i <= count; i++)
      ball(
        x1 + ((x2 - x1) * i) / count,
        y1 + ((y2 - y1) * i) / count,
        z,
        radius,
        color,
      );
  };
  const closed = sleeping || happy || (animation === "idle" && frame >= 29);
  const breathe = Math.sin(t) * (sleeping ? 0.3 : 0.16);
  const bob = jumping ? -1.5 : walking ? Math.cos(t * 8) * 0.18 : breathe;
  const eye = (x: number, y: number, z = 5, turret = false) => {
    if (turret) sphere(x, y, z, 2.2, 2.2, 1.3, shade(skin, 1.14));
    sphere(
      x + (turret ? Math.sin(t) * 0.45 : 0),
      y,
      z + (turret ? 1.2 : 0),
      closed ? 1 : 0.72,
      closed ? 0.2 : 1.1,
      0.6,
      ink,
    );
    if (!closed)
      ball(x - 0.18, y - 0.32, z + (turret ? 1.8 : 0.6), 0.22, 0xffffff);
  };
  const feet = (xs: number[], bodyY: number) => {
    // Diagonal pairs step together; at least one pair stays planted.
    for (const behind of [true, false])
      for (const [index, x] of xs.entries()) {
        const pose = footPose(frame, (index % 2 === 0) !== behind);
        const step = walking ? pose.travel * 1.5 : 0;
        const lift = walking
          ? pose.lift
          : happy && index === xs.length - 1 && !behind
            ? 5 + Math.sin(t * 4)
            : 0;
        const z = behind ? -2 : 4;
        line(
          x,
          bodyY,
          x + step + 0.8,
          30.3 - lift,
          z,
          species === "gecko" ? 0.95 : 1.3,
          behind ? dark : skin,
        );
        sphere(
          x + step + 1.1,
          31.1 - lift,
          z + 0.4,
          1.8,
          0.95,
          1.4,
          behind ? dark : skin,
        );
        if (species === "gecko" || species === "chameleon") {
          for (const dx of [-0.8, 0.4, 1.5])
            line(
              x + step + 0.5,
              30.9 - lift,
              x + step + dx + 0.9,
              31.55 - lift,
              z + 1,
              0.28,
              belly,
            );
        }
      }
  };

  if (species === "snake") {
    // A continuous low slither, rather than borrowing a mammal's leg animation.
    for (let i = 0; i <= 32; i++) {
      const u = i / 32;
      const wave = Math.sin(u * Math.PI * 3 + (walking ? t * 4 : t * 0.15));
      const x = 2 + u * 23;
      const y = sleeping
        ? 28 + Math.sin(u * Math.PI * 4) * 2
        : 28 + wave * 1.7 - u * (happy || jumping ? 7 : 4);
      ball(x, y, u * 0.08, 0.65 + u * 1.45, skin);
      if (i % 4 === 0) sphere(x, y - 0.7, 1.7, 0.6, 0.8, 0.3, dark);
    }
    const headY = sleeping
      ? 28
      : happy || jumping
        ? 18.5
        : 23.2 + bob + (drinking ? 1 : 0);
    sphere(25, headY, 1, 4.6, 3.4, 3, skin);
    sphere(27, headY + 1.5, 3.4, 3.2, 1, 0.65, belly);
    eye(26, headY - 0.7);
    if (!sleeping && (happy || (frame >= 10 && frame <= 14))) {
      line(29, headY + 1, 31, headY + 1.5, 3, 0.24, 0xd87383);
      line(30.3, headY + 1.4, 31.4, headY + 0.8, 3, 0.18, 0xd87383);
    }
    // The lowest coil always rests on the ground, including the raised-head pose.
    sphere(8, 30.7, 1, 3.8, 1.3, 2, skin);
  } else if (species === "tortoise") {
    feet([10, 21], 26);
    sphere(15, 27.5 + breathe, 0, 10, 3.6, 4.6, belly);
    sphere(14.8, 23.5 + breathe, 0, 9.6, 7, 5.6, dark);
    // Raised shell plates give a silhouette and texture unique to Moss.
    for (const [x, y, radius] of [
      [10, 22, 2.9],
      [16, 20, 3.4],
      [21, 23, 2.8],
      [14, 26, 3.1],
    ]) {
      sphere(x, y + breathe, 4.7, radius, radius * 0.85, 1.3, skin);
    }
    const headX = sleeping ? 23 : 26;
    const headY = sleeping ? 27.5 : 25 + bob + (drinking ? 1 : 0);
    sphere(headX, headY, 1, sleeping ? 2.6 : 4.1, 3.4, 3, skin);
    eye(headX + 1, headY - 0.4);
    ball(4.7, 28.4, -1, 1, skin);
  } else {
    const chameleon = species === "chameleon",
      gecko = species === "gecko";
    const bodyY = sleeping ? 26.5 : (gecko ? 24 : 23) + bob;
    // A true curled tail for the chameleon; tapered tails for the other reptiles.
    if (chameleon) {
      for (let i = 0; i <= 28; i++) {
        const angle = -0.4 + (i / 28) * Math.PI * 3.1;
        const radius = 4.5 * (1 - i / 35);
        ball(
          6.7 + Math.cos(angle) * radius,
          25 + Math.sin(angle) * radius,
          -0.5,
          0.8,
          skin,
        );
      }
    } else {
      for (let i = 0; i <= 20; i++) {
        const u = i / 20;
        ball(
          1.1 + u * 12,
          27 +
            Math.sin(u * Math.PI + t * (walking ? 4 : 1)) * (gecko ? 1.6 : 0.7),
          -1,
          0.5 + u * 2.2,
          skin,
        );
      }
    }
    feet(gecko ? [13, 22] : [13, 22.5], bodyY + 1);
    sphere(
      17,
      bodyY,
      0,
      gecko ? 6.7 : 7.8,
      chameleon ? 5.6 : gecko ? 3.9 : 4.4,
      4,
      skin,
    );
    sphere(18.4, bodyY + 2, 3.3, 5.3, 2, 1.3, belly);
    const headY = sleeping
      ? 25.5
      : (chameleon ? 16 : gecko ? 17.5 : 21.5) + bob + (drinking ? 1.2 : 0);
    sphere(
      24,
      headY,
      1.3,
      gecko ? 5.5 : 4.8,
      chameleon ? 5.7 : gecko ? 4.7 : 3.7,
      3.9,
      skin,
    );
    if (chameleon) {
      sphere(21.5, headY - 3.2, -0.8, 2, 4.2, 2.2, dark);
      eye(25.2, headY - 0.8, 5, true);
      for (let x = 11; x < 21; x += 1.8) ball(x, bodyY - 4.5, 0, 0.75, dark);
    } else if (gecko) {
      eye(24.4, headY - 1);
      for (const [x, y] of [
        [13, 22],
        [18, 23],
        [21, 20],
        [15, 25],
      ])
        sphere(x, y + bob, 4, 0.8, 1, 0.35, dark);
    } else {
      // Long rounded muzzle, nostrils and a row of small back scutes.
      sphere(27, headY + 1.2, 2, 4.7, 2.1, 3.2, skin);
      sphere(27, headY + 2.6, 4.1, 4.2, 0.5, 0.6, belly);
      eye(23.5, headY - 1.8);
      ball(30, headY + 0.4, 4.8, 0.32, ink);
      for (let x = 8; x < 22; x += 2.5)
        sphere(x, bodyY - 3.5, 0, 1.1, 1.7, 1.3, dark);
    }
    if (!sleeping) line(25, headY + 2, 28.2, headY + 2.2, 5.2, 0.18, ink);
    if (chameleon && !sleeping && (happy || frame === 12 || frame === 13))
      line(28, headY + 2, 31.2, headY + 1, 4.5, 0.27, 0xd58291);
  }
  if (drinking) {
    sphere(29, 29, 5, 2.2, 2.9, 1.6, 0x83bcd2);
    sphere(29, 26.4, 5, 1.9, 0.45, 1.3, 0xc9f0f7);
    ball(28.5, 25, 5, 0.6, 0x83bcd2);
  }
  return shapes;
}
