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
export function sprite(
  animation: Animation,
  frame: number,
  coat: Coat,
  direction = 1,
): Run[] {
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
  const headY = sleeping ? 13 + (frame % 12 < 6 ? 0 : 1) : 2 + bob;
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
  const runs: Run[] = [];
  for (let y = 0; y < GRID; y++) {
    const row = direction < 0 ? [...pixels[y]].reverse() : pixels[y];
    for (let x = 0; x < GRID;) {
      const c = row[x];
      let end = x + 1;
      while (end < GRID && row[end] === c) end++;
      if (c >= 0) runs.push({ x, y, width: end - x, color: palettes[coat][c] });
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
