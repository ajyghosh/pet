import type { Animation, Coat } from "./settings";
export const GRID = 32;
export interface Run {
  x: number;
  y: number;
  width: number;
  color: string;
}
const palettes: Record<Coat, string[]> = {
  ginger: ["#513c32", "#d98c52", "#edb878", "#ffe2af", "#b9693e", "#dd8d89"],
  cream: ["#675342", "#d9c6a0", "#eee0bf", "#fff3d8", "#b99b72", "#e5a4a0"],
  slate: ["#303e48", "#738b99", "#9bb1b9", "#e3e8de", "#526b7a", "#dca3a5"],
};
/** Original hand-built 32×32 pixel character. The same opaque runs form the Win32 region. */
export function sprite(
  animation: Animation,
  frame: number,
  coat: Coat,
  direction: number = 1,
): Run[] {
  const pixels = Array.from({ length: GRID }, () =>
    Array<number>(GRID).fill(-1),
  );
  const rect = (x: number, y: number, w: number, h: number, c: number) => {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++)
        if (j >= 0 && j < GRID && i >= 0 && i < GRID) pixels[j][i] = c;
  };
  const sleep = animation === "sleeping";
  const step = animation === "walking" ? frame % 4 : 0;
  // Tail curls behind the body. The feet always finish on row 31.
  rect(25, sleep ? 23 : 19, 4, 10, 0);
  rect(26, sleep ? 23 : 18, 4, 7, 0);
  rect(26, sleep ? 24 : 20, 2, 7, 1);
  rect(27, sleep ? 24 : 19, 2, 4, 2);
  rect(8, sleep ? 22 : 18, 18, sleep ? 9 : 13, 0);
  rect(9, sleep ? 23 : 19, 16, sleep ? 7 : 11, 1);
  rect(12, 23, 9, 7, 3);
  rect(9, 29, 6, 3 - (step === 1 ? 1 : 0), 0);
  rect(19, 29, 6, 3 - (step === 3 ? 1 : 0), 0);
  rect(10, 29, 4, 2 - (step === 1 ? 1 : 0), 2);
  rect(20, 29, 4, 2 - (step === 3 ? 1 : 0), 2);
  const y = sleep
    ? frame % 12 < 6
      ? 10
      : 9
    : animation === "happy" && frame % 2
      ? 1
      : 0;
  rect(6, 3 + y, 6, 10, 0);
  rect(21, 3 + y, 6, 10, 0);
  rect(7, 5 + y, 4, 7, 1);
  rect(22, 5 + y, 4, 7, 1);
  rect(8, 7 + y, 2, 4, 5);
  rect(23, 7 + y, 2, 4, 5);
  rect(8, 9 + y, 17, 14, 0);
  rect(5, 12 + y, 23, 8, 0);
  rect(7, 12 + y, 19, 8, 2);
  rect(9, 10 + y, 15, 12, 2);
  rect(13, 10 + y, 2, 4, 4);
  rect(17, 10 + y, 2, 3, 4);
  rect(7, 16 + y, 3, 2, 4);
  rect(23, 16 + y, 3, 2, 4);
  rect(12, 18 + y, 9, 3, 3);
  const closed =
    sleep ||
    animation === "happy" ||
    (animation === "idle" && frame % 32 === 30);
  rect(10, 15 + y, 3, closed ? 1 : 3, 0);
  rect(20, 15 + y, 3, closed ? 1 : 3, 0);
  if (!closed) {
    rect(11, 15 + y, 1, 1, 3);
    rect(21, 15 + y, 1, 1, 3);
  }
  rect(16, 18 + y, 2, 1, 5);
  rect(16, 19 + y, 2, 1, 0);
  if (animation === "happy") {
    rect(9, 18 + y, 3, 1, 5);
    rect(22, 18 + y, 3, 1, 5);
  }
  if (animation === "jumping") {
    rect(4, 23, 5, 3, 0);
    rect(5, 23, 4, 2, 2);
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
