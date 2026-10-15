import { isCollectionCharacter, spriteGrid } from "./characters.ts";
import { collectionSprite } from "./collectionArtwork.ts";
import type { CharacterId } from "./characters";
import type { Animation, Coat } from "./settings";
export const GRID = 32;
export interface Run {
  x: number;
  y: number;
  width: number;
  color: string;
}
// Original MiniMates pixel artwork. Clothing IDs retain compatibility with Miso settings.
const palettes: Record<Coat, string[]> = {
  ginger: [
    "#25243f",
    "#ee795e",
    "#ffae8d",
    "#f4bd97",
    "#cf8d68",
    "#42342e",
    "#fff5e6",
    "#424c7c",
    "#a9e9ff",
  ],
  cream: [
    "#25243f",
    "#a184e8",
    "#c9b4ff",
    "#e5a77e",
    "#bb795a",
    "#3a2929",
    "#fff5e6",
    "#414b71",
    "#a9e9ff",
  ],
  slate: [
    "#25243f",
    "#5479ef",
    "#9bb7ff",
    "#bf815c",
    "#9b5e43",
    "#28232b",
    "#fff5e6",
    "#353b5c",
    "#a9e9ff",
  ],
};
// Reuse poses across the 30 Hz native placement loop. Limit memory to 64 poses.
const poseCache = new Map<string, Run[]>();
export function sprite(
  animation: Animation,
  frame: number,
  coat: Coat,
  direction = 1,
  character: CharacterId = "alex",
): Run[] {
  const normalized = ((Math.floor(frame) % 32) + 32) % 32;
  const key = `${character}:${animation}:${normalized}:${coat}:${direction < 0 ? -1 : 1}`;
  const cached = poseCache.get(key);
  if (cached) return cached;
  const runs = drawSprite(animation, normalized, coat, direction, character);
  if (poseCache.size >= 64) poseCache.delete(poseCache.keys().next().value!);
  poseCache.set(key, runs);
  return runs;
}
function drawSprite(
  animation: Animation,
  frame: number,
  coat: Coat,
  direction = 1,
  character: CharacterId = "alex",
): Run[] {
  if (isCollectionCharacter(character))
    return collectionSprite(
      character,
      spriteGrid(character),
      animation,
      frame,
      coat,
      direction,
    );
  let palette = palettes[coat];
  const pixels = Array.from({ length: GRID }, () =>
    Array<number>(GRID).fill(-1),
  );
  const rect = (x: number, y: number, w: number, h: number, c: number) => {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++)
        if (j >= 0 && j < GRID && i >= 0 && i < GRID) pixels[j][i] = c;
  };
  const step = frame % 4;
  const walking = animation === "walking",
    sleeping = animation === "sleeping";
  const happy = animation === "happy",
    jumping = animation === "jumping",
    drinking = animation === "drinking";
  const bob = walking && step % 2 ? 1 : 0;
  const headY = sleeping
    ? 13 + (frame % 12 < 6 ? 0 : 1)
    : (character === "sage" ? 6 : 2) + bob;
  if (character === "alex" || character === "nova" || character === "sage") {
    // Denim legs, alternating stride, and chunky white-soled sneakers.
    const left = walking && step === 1 ? 9 : 11;
    const right = walking && step === 3 ? 19 : 17;
    rect(left, 23, 5, 8, 0);
    rect(left + 1, 23, 3, 6, 7);
    rect(right, 23, 5, 8, 0);
    rect(right + 1, 23, 3, 6, 7);
    rect(left - 1, 29, 6, 3, 0);
    rect(left, 30, 5, 1, 6);
    rect(right, 29, 6, 3, 0);
    rect(right + 1, 30, 4, 1, 6);
    // Jacket, tee, collar, pockets and hands.
    const bodyY = sleeping ? 23 : 15 + bob;
    rect(10, bodyY, 13, sleeping ? 6 : 10, 0);
    rect(11, bodyY + 1, 11, sleeping ? 4 : 8, 1);
    rect(15, bodyY + 1, 4, 5, 6);
    rect(16, bodyY + 5, 2, 3, 2);
    if (!sleeping) {
      rect(11, 22 + bob, 3, 1, 2);
      rect(20, 22 + bob, 2, 1, 2);
    }
    const armY = bodyY + 1 + (walking && step % 2 ? -1 : 0);
    rect(7, armY, 4, 7, 0);
    rect(8, armY + 1, 3, 4, 1);
    rect(8, armY + 5, 3, 3, 3);
    if (happy || jumping) {
      const wave = happy && step % 2 ? 1 : 0;
      rect(22, 12 - wave, 4, 8, 0);
      rect(23, 13 - wave, 2, 6, 1);
      rect(24, 8 - wave, 4, 6, 0);
      rect(25, 9 - wave, 2, 4, 3);
    } else if (drinking) {
      rect(22, 13, 4, 8, 0);
      rect(23, 14, 2, 6, 1);
      rect(22, 12, 5, 3, 3);
      rect(24, 7, 4, 7, 0);
      rect(25, 8, 2, 5, 8);
      rect(25, 6, 2, 2, 6);
    } else {
      rect(22, armY, 4, 7, 0);
      rect(23, armY + 1, 2, 4, 1);
      rect(23, armY + 5, 3, 3, 3);
    }
    // Neck, rounded face, ears and a swept hairstyle. No downloaded artwork.
    rect(14, headY + 11, 5, 3, 4);
    rect(10, headY + 2, 13, 11, 0);
    rect(11, headY + 3, 11, 9, 3);
    rect(9, headY + 7, 2, 3, 3);
    rect(22, headY + 7, 2, 3, 3);
    rect(10, headY, 12, 5, 5);
    rect(12, headY - 1, 8, 2, 5);
    rect(10, headY + 4, 3, 3, 5);
    rect(12, headY + 3, 5, 2, 5);
    rect(21, headY + 3, 2, 3, 5);
    const closed =
      sleeping || happy || (animation === "idle" && frame % 32 === 30);
    rect(14, headY + 7, 2, closed ? 1 : 2, 0);
    rect(19, headY + 7, 2, closed ? 1 : 2, 0);
    rect(17, headY + 9, 1, 1, 4);
    rect(16, headY + 10, happy ? 4 : 2, 1, happy ? 6 : 0);
    if (sleeping) {
      rect(7, 25, 6, 3, 3);
      rect(21, 25, 5, 3, 3);
    }
    if (jumping) {
      rect(5, 16, 3, 3, 3);
      rect(6, 18, 3, 4, 1);
    }
    if (character === "nova") {
      // High ponytail, long side hair, headphones and a bright jacket.
      rect(6, headY + 1, 4, 11, 5);
      rect(7, headY - 1, 4, 4, 5);
      rect(8, headY + 3, 3, 2, 2);
      rect(10, headY + 4, 2, 8, 5);
      rect(22, headY + 4, 2, 8, 5);
      rect(11, headY + 1, 12, 2, 2);
      rect(9, headY + 5, 3, 4, 2);
      rect(22, headY + 5, 3, 4, 2);
    }
    if (character === "sage") {
      // Pointed wizard hat, cloak, golden clasp, and a little wand.
      rect(8, headY + 1, 17, 3, 0);
      rect(9, headY + 1, 15, 2, 1);
      rect(11, headY - 2, 11, 3, 1);
      rect(14, headY - 4, 6, 3, 1);
      rect(16, headY - 5, 3, 2, 2);
      rect(9, 23, 15, 7, 0);
      rect(10, 23, 13, 6, 1);
      rect(16, 24, 2, 3, 2);
      rect(24, 18, 2, 12, 5);
      rect(23, 17, 4, 3, 8);
      if (happy || jumping) {
        rect(27, 10, 1, 5, 2);
        rect(25, 12, 5, 1, 2);
      }
    }
  } else {
    // All animals and fantasy companions have independent original silhouettes.
    palette = drawCreature(rect, animation, frame, coat, character);
  }
  const runs: Run[] = [];
  for (let y = 0; y < GRID; y++) {
    const row = direction < 0 ? [...pixels[y]].reverse() : pixels[y];
    for (let x = 0; x < GRID;) {
      const c = row[x];
      let end = x + 1;
      while (end < GRID && row[end] === c) end++;
      if (c >= 0) runs.push({ x, y, width: end - x, color: palette[c] });
      x = end;
    }
  }
  return runs;
}
export function silhouette(runs: Run[]): number[][] {
  const rows: number[][] = [];
  for (const r of runs) {
    const last = rows.at(-1);
    if (last && last[1] === r.y && last[0] + last[2] === r.x)
      last[2] += r.width;
    else rows.push([r.x, r.y, r.width]);
  }
  return rows;
}

/** Small hand-drawn pixel primitives shared by the original creature designs. */
function drawCreature(
  rect: (x: number, y: number, w: number, h: number, c: number) => void,
  animation: Animation,
  frame: number,
  coat: Coat,
  character: CharacterId,
): string[] {
  const tones: Record<string, string[]> = {
    cat: ["#eaa463", "#b8a3df", "#879ec1"],
    corgi: ["#da9154", "#c5a08a", "#d8ac72"],
    fox: ["#ec7f45", "#c5a9de", "#82a8c8"],
    rabbit: ["#e9b5ab", "#ddc6ef", "#ceddea"],
    panda: ["#f7e4d3", "#ede1f8", "#e7eff7"],
    penguin: ["#57516d", "#6e5d91", "#3e5679"],
    frog: ["#efbd64", "#9dbb85", "#74c795"],
    robot: ["#ee9679", "#b19be7", "#73bccf"],
    dragon: ["#e89270", "#b392e0", "#79b9bf"],
  };
  const main = tones[character][["ginger", "cream", "slate"].indexOf(coat)];
  const palette = [
    "#302c46",
    main,
    "#fff4e2",
    "#ffe1bc",
    "#665473",
    "#f096aa",
    "#192d42",
    "#78d7f4",
    "#ffffff",
  ];
  const ellipse = (
    x: number,
    y: number,
    w: number,
    h: number,
    color: number,
  ) => {
    for (let row = 0; row < h; row++) {
      const inset = Math.round(
        (w / 2) * (1 - Math.sqrt(1 - ((row + 0.5 - h / 2) / (h / 2)) ** 2)),
      );
      rect(x + inset, y + row, w - inset * 2, 1, color);
    }
  };
  const oval = (x: number, y: number, w: number, h: number, color: number) => {
    ellipse(x, y, w, h, 0);
    ellipse(x + 1, y + 1, w - 2, h - 2, color);
  };
  const box = (x: number, y: number, w: number, h: number, color: number) => {
    rect(x + 1, y, w - 2, h, 0);
    rect(x, y + 1, w, h - 2, 0);
    rect(x + 1, y + 1, w - 2, h - 2, color);
  };
  const sleep = animation === "sleeping",
    walk = animation === "walking";
  const happy = animation === "happy",
    jump = animation === "jumping";
  const drink = animation === "drinking";
  const step = frame % 4,
    bob = walk && step % 2 ? 1 : 0;
  const closed = sleep || happy || (animation === "idle" && frame % 32 === 30);
  const eyes = (x: number, y: number, gap: number) => {
    rect(x, y, 2, closed ? 1 : 3, 6);
    rect(x + gap, y, 2, closed ? 1 : 3, 6);
    if (!closed) {
      rect(x, y, 1, 1, 8);
      rect(x + gap, y, 1, 1, 8);
    }
  };
  const foot = (x: number, color = 1) => box(x, 28, 6, 4, color);
  const left = walk && step === 1 ? 6 : 8,
    right = walk && step === 3 ? 22 : 20;
  const headY = sleep ? 17 + (frame % 12 < 6 ? 0 : 1) : 7 + bob;

  if (character === "robot") {
    rect(15, sleep ? 13 : 2 + bob, 2, 5, 0);
    box(13, sleep ? 12 : bob, 6, 4, happy ? 5 : 7);
    box(7, sleep ? 24 : 18 + bob, 18, sleep ? 6 : 11, 1);
    box(7, headY, 19, 13, 1);
    box(9, headY + 3, 15, 7, 6);
    rect(11, headY + 5, 3, closed ? 1 : 3, 7);
    rect(19, headY + 5, 3, closed ? 1 : 3, 7);
    rect(12, headY + 11, 9, 1, 4);
    if (!sleep) {
      box(11, 22 + bob, 10, 4, 0);
      rect(13, 23 + bob, 2 + step, 2, 7);
    }
    foot(left, 4);
    foot(right, 4);
    box(3, 20, 4, 7, 1);
    box(25, happy || jump ? 11 - (step % 2) : 20, 4, 7, 1);
  } else if (character === "penguin") {
    oval(6, sleep ? 20 : 7 + bob, 21, sleep ? 12 : 24 - bob, 1);
    ellipse(10, sleep ? 24 : 16 + bob, 13, sleep ? 6 : 13, 2);
    ellipse(9, headY + 2, 8, 10, 2);
    ellipse(17, headY + 2, 8, 10, 2);
    eyes(12, headY + 5, 8);
    rect(16, headY + 8, 5, 3, 3);
    oval(3, happy || jump ? 12 : 19, 5, 10, 1);
    oval(25, happy || jump ? 9 + (step % 2) : 18, 5, 10, 1);
    foot(left, 3);
    foot(right, 3);
    if (!sleep) {
      rect(8, 18 + bob, 17, 3, 5);
      rect(10, 21 + bob, 3, 5, 5);
    }
  } else if (character === "frog") {
    oval(6, sleep ? 23 : 18 + bob, 22, sleep ? 8 : 13, 1);
    ellipse(11, sleep ? 25 : 22, 13, 7, 3);
    oval(5, headY + 4, 24, 13, 1);
    oval(7, headY, 8, 9, 1);
    oval(21, headY, 8, 9, 1);
    eyes(10, headY + 3, 14);
    rect(12, headY + 12, 11, 1, 0);
    rect(10, headY + 10, 2, 2, 5);
    rect(25, headY + 10, 2, 2, 5);
    foot(left - 2);
    foot(right + 1);
    if (happy || jump) {
      oval(2, 15 - (step % 2), 5, 6, 1);
      oval(27, 12, 5, 6, 1);
    }
  } else {
    // Tails behind the body keep each species recognizable even at desktop size.
    if (character === "cat") {
      oval(1, sleep ? 23 : 15 + (step % 2), 6, 14, 1);
      rect(4, 23, 6, 5, 1);
    }
    if (character === "fox") {
      oval(0, sleep ? 23 : 17, 13, 13, 1);
      ellipse(0, sleep ? 24 : 17, 6, 7, 2);
    }
    if (character === "rabbit") oval(2, 24, 7, 7, 2);
    if (character === "corgi") oval(2, 22 + (step % 2), 7, 6, 2);
    if (character === "dragon") {
      rect(1, 23, 9, 5, 0);
      rect(2, 24, 9, 3, 1);
      rect(1, 21, 3, 4, 1);
      // Scalloped wing opens wider for a wave or jump.
      const wy = happy || jump ? 9 + (step % 2) : 15;
      rect(5, wy, 3, 12, 0);
      rect(3, wy + 3, 8, 10, 0);
      rect(4, wy + 4, 6, 7, 5);
      rect(7, wy + 3, 2, 9, 1);
    }
    oval(6, sleep ? 23 : 17 + bob, 22, sleep ? 9 : 14 - bob, 1);
    ellipse(
      12,
      sleep ? 25 : 21,
      12,
      sleep ? 5 : 9,
      character === "panda" ? 1 : 2,
    );
    foot(left, character === "panda" ? 0 : 1);
    foot(right, character === "panda" ? 0 : 1);
    if (character === "rabbit") {
      oval(10, headY - 7, 5, 12, 1);
      oval(20, headY - 7, 5, 12, 1);
      rect(12, headY - 5, 1, 7, 5);
      rect(22, headY - 5, 1, 7, 5);
    } else if (character === "panda") {
      oval(7, headY - 2, 7, 7, 0);
      oval(23, headY - 2, 7, 7, 0);
    } else if (character === "dragon") {
      rect(11, headY - 3, 3, 7, 3);
      rect(23, headY - 3, 3, 7, 3);
    } else {
      // Tall corgi ears; angular fox and cat ears.
      const earH = character === "corgi" ? 8 : 6;
      rect(8, headY - earH + 4, 4, earH, 0);
      rect(9, headY - earH + 5, 2, earH - 1, 5);
      rect(24, headY - earH + 4, 4, earH, 0);
      rect(25, headY - earH + 5, 2, earH - 1, 5);
    }
    oval(7, headY + 1, 23, 15, 1);
    if (character === "panda") {
      ellipse(10, headY + 5, 6, 7, 0);
      ellipse(21, headY + 5, 6, 7, 0);
      rect(12, headY + 6, 2, closed ? 1 : 3, 8);
      rect(23, headY + 6, 2, closed ? 1 : 3, 8);
    } else eyes(12, headY + 6, 10);
    if (character === "corgi" || character === "fox") {
      ellipse(12, headY + 10, 16, 5, 2);
      rect(18, headY + 2, 3, 8, 2);
    }
    if (character === "dragon") {
      oval(20, headY + 9, 11, 6, 1);
      rect(27, headY + 10, 1, 1, 0);
      rect(14, headY + 2, 3, 2, 3);
    } else {
      rect(18, headY + 10, 3, 2, character === "rabbit" ? 5 : 0);
      rect(19, headY + 12, happy ? 3 : 1, 1, 0);
    }
    if (character === "cat") {
      rect(15, headY + 2, 2, 3, 4);
      rect(20, headY + 2, 2, 3, 4);
      rect(7, headY + 11, 5, 1, 4);
      rect(26, headY + 11, 5, 1, 4);
    }
    if (happy || jump) {
      oval(25, 16 - (step % 2), 6, 9, character === "panda" ? 0 : 1);
      rect(27, 18 - (step % 2), 2, 2, 5);
    }
  }
  if (drink) {
    box(25, 18, 6, 8, 7);
    rect(27, 15, 1, 6, 8);
    rect(23, 22, 4, 3, 1);
  }
  if (jump) {
    rect(2, 9, 1, 4, 5);
    rect(1, 10, 3, 1, 5);
  }
  if (sleep) {
    rect(2, 8, 4, 1, 7);
    rect(4, 9, 1, 1, 7);
    rect(3, 10, 1, 1, 7);
    rect(2, 11, 4, 1, 7);
  }
  return palette;
}
