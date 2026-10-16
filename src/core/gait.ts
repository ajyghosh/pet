/** Eight poses per stride; one stride covers twelve artwork pixels at pet size. */
export const WALK_FRAMES = 8;
export function walkingFrame(distance: number, size: number) {
  return Math.floor((distance / Math.max(1, size * (12 / 32))) * WALK_FRAMES);
}

/** Linear ground contact, followed by a lifted forward swing. */
export function footPose(frame: number, opposite = false) {
  const phase = (((frame / WALK_FRAMES + (opposite ? 0.5 : 0)) % 1) + 1) % 1;
  return {
    travel: phase < 0.5 ? 1 - phase * 4 : (phase - 0.5) * 4 - 1,
    lift: phase < 0.5 ? 0 : Math.sin((phase - 0.5) * Math.PI * 2) * 2,
  };
}
