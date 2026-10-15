import type { Animation, Coat } from "./settings";
import type { Run } from "./sprite";

// Original procedural figures, rendered offline into transparent atlases. The 3D
// renderer casts orthographic rays at articulated ellipsoids with a depth buffer
// and a fixed studio light; it does not use downloaded models or a remote API.
interface Shape {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  color: number;
}
function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
function tint(color: number, light: number) {
  const r = Math.min(255, Math.round(((color >> 16) & 255) * light));
  const g = Math.min(255, Math.round(((color >> 8) & 255) * light));
  const b = Math.min(255, Math.round((color & 255) * light));
  return (r << 16) | (g << 8) | b;
}
export function collectionSprite(
  id: string,
  grid: number,
  animation: Animation,
  frame: number,
  coat: Coat,
  direction: number,
): Run[] {
  const shapes: Shape[] = [];
  const h = hash(id),
    role = id.split("--")[1] ?? id;
  const has = (pattern: RegExp) => pattern.test(role);
  const is3d = grid === 64;
  const phase = frame % 4,
    walk = animation === "walking",
    sleep = animation === "sleeping";
  const happy = animation === "happy",
    jump = animation === "jumping",
    drink = animation === "drinking";
  const closed = sleep || happy || (animation === "idle" && frame % 32 === 30);
  const bob = walk
    ? (phase % 2) * 0.5
    : animation === "idle"
      ? Math.sin(frame / 5) * 0.12
      : 0;
  const female = has(/girl|woman|grandma|bride|princess|witch|saree|nurse/);
  const elder = has(/grandpa|grandma|elder/);
  const skin = [0xd6a17d, 0xbf8464, 0x995f46, 0xe8b693, 0xad7353, 0xc78c66][
    h % 6
  ];
  const hair = elder
    ? 0xd6d2d8
    : [0x302735, 0x392823, 0x65503a, 0x251e29][(h >>> 4) % 4];
  // Each ID gets its own fabric color; styles change the accent without replacing identity.
  const fabric =
    (((80 + (h % 100)) << 16) |
      ((65 + ((h >>> 8) % 100)) << 8) |
      (95 + ((h >>> 16) % 100))) >>>
    0;
  const accent =
    coat === "ginger" ? 0xef9478 : coat === "cream" ? 0xb6a0ec : 0x77b6ec;
  const white = 0xfff2df,
    ink = 0x292735,
    gold = 0xf1c16c;
  let shirt = fabric,
    pants = 0x3c425e;
  if (has(/doctor|nurse|scientist|chef|mundu|kasavu|wedding|village/))
    shirt = white;
  if (has(/police|ninja/)) shirt = 0x34425e;
  if (has(/firefighter/)) shirt = 0xe4ac4c;
  if (has(/astronaut|space-explorer/)) shirt = 0xdce5ed;
  if (has(/farmer|gardener|hiker|explorer/)) shirt = 0x80936b;
  if (has(/vampire|witch/)) shirt = 0x51416e;
  if (has(/superhero|rockstar/)) shirt = accent;
  if (has(/zombie/)) pants = 0x68634b;
  if (has(/kathakali|theyyam/)) shirt = 0xc65d43;
  const bodySkin = has(/zombie/) ? 0x8ba17a : skin;
  const faceSkin = has(/kathakali/)
    ? 0x7aae67
    : has(/theyyam/)
      ? 0xdd7757
      : bodySkin;
  const scale = has(/tiny-couple/) ? 0.55 : 1;
  let offsetX = 0;
  const sphere = (
    x: number,
    y: number,
    z: number,
    rx: number,
    ry: number,
    rz: number,
    color: number,
  ) => {
    shapes.push({
      x: x * scale + offsetX,
      y: 32 - (32 - y) * scale,
      z,
      rx: rx * scale,
      ry: ry * scale,
      rz: rz * scale,
      color,
    });
  };
  const ball = (x: number, y: number, z: number, r: number, color: number) =>
    sphere(x, y, z, r, r, r, color);
  const limb = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    z: number,
    radius: number,
    color: number,
  ) => {
    const steps = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) * 1.4));
    for (let i = 0; i <= steps; i++)
      ball(
        x1 + ((x2 - x1) * i) / steps,
        y1 + ((y2 - y1) * i) / steps,
        z,
        radius,
        color,
      );
  };
  const figure = () => {
    const stride = walk ? [0, 2, 0, -2][phase] : jump ? 1.3 : 0;
    const head = sleep ? 17.5 + Math.sin(frame / 5) * 0.25 : 8.4 + bob;
    const torso = sleep ? 25.5 : 19.2 + bob;
    // Hair behind the face; a high ponytail/bun distinguishes longer hairstyles.
    if (female) {
      sphere(16, head + 1.3, -1, 7.1, 7.3, 2.5, hair);
      ball(10, head - 4.2, 0, 2.4, hair);
    }
    if (has(/superhero|vampire|wizard|witch|magician|princess/))
      sphere(15, 23, -2, 8, 8, 1.4, accent);
    if (has(/hiker|explorer|traveller|student|school/))
      sphere(10.5, 20, -1.4, 3.4, 6, 2.8, accent);
    limb(12, 24, 11 - stride, 29, 0, 2, pants);
    limb(20, 24, 21 + stride, 29, 0, 2, pants);
    sphere(10.5 - stride, 30.3, 1, 3.1, 1.7, 2.5, fabric);
    sphere(21.5 + stride, 30.3, 1, 3.1, 1.7, 2.5, fabric);
    sphere(10.5 - stride, 31.1, 1.4, 3.1, 0.7, 2.5, white);
    sphere(21.5 + stride, 31.1, 1.4, 3.1, 0.7, 2.5, white);
    sphere(16, torso, 0, 6.1, sleep ? 4 : 6.3, 3.4, shirt);
    if (
      has(
        /saree|kasavu|bride|princess|classical-dancer|grandma|dancer-performing/,
      )
    ) {
      sphere(16, 26, 1, 7, 4.8, 3, shirt);
      limb(11, torso - 3, 20, 27, 3, 1, gold);
    } else if (has(/mundu|kerala-guy|kurta|village|wedding-groom/)) {
      sphere(16, 26, 1, 5.8, 4.8, 3, white);
      limb(19, 23, 19, 30, 4, 0.6, gold);
    }
    // Hands are articulated for walking, greeting, jumping, and water breaks.
    const ly = jump ? 13 : torso + 3 + (walk ? stride / 2 : 0);
    const ry =
      happy || jump
        ? 11 - (phase % 2)
        : drink
          ? head + 4
          : torso + 3 - (walk ? stride / 2 : 0);
    limb(11, torso - 2, 8, ly, 1, 1.8, shirt);
    ball(8, ly + 1, 2, 1.8, bodySkin);
    limb(21, torso - 2, 25, ry, 1, 1.8, shirt);
    ball(25, ry, 2, 1.8, bodySkin);
    sphere(16, head, 1.5, 6.4, 6.6, 4.5, faceSkin);
    ball(9.7, head + 1, 1, 1.4, bodySkin);
    ball(22.2, head + 1, 1, 1.4, bodySkin);
    // Rounded fringe sits on top of the head and leaves the face clear.
    sphere(15, head - 4.6, 1.7, 6.2, 2.4, 4.1, hair);
    sphere(10.7, head - 1.9, 2, 1.7, 3.3, 3, hair);
    if (female) sphere(21.6, head - 1.2, 2, 1.2, 3.7, 2.5, hair);
    for (const x of [13.2, 19.3]) {
      sphere(x, head + 0.8, 5.65, 0.75, closed ? 0.22 : 1.15, 0.6, ink);
      if (!closed) ball(x - 0.15, head + 0.4, 6.2, 0.23, 0xffffff);
    }
    sphere(16.8, head + 2.4, 5.8, 0.8, 0.65, 0.8, faceSkin);
    sphere(
      16.5,
      head + 4,
      5.6,
      happy ? 1.5 : 0.9,
      happy ? 0.65 : 0.25,
      0.4,
      happy ? white : 0x86594e,
    );
    if (
      elder ||
      has(/scientist|developer|manager|teacher|bookworm|detective/)
    ) {
      for (const x of [13.1, 19.3]) {
        sphere(x, head + 0.8, 6, 2.1, 1.8, 0.25, ink);
        sphere(x, head + 0.8, 6.3, 1.6, 1.3, 0.2, 0xbcdbe1);
        sphere(x, head + 0.8, 6.55, 0.65, closed ? 0.2 : 0.8, 0.15, ink);
      }
      limb(15, head + 0.7, 17.3, head + 0.7, 6.5, 0.25, ink);
    }
    if (elder && !female) sphere(16, head + 4.4, 5.4, 2.9, 1.2, 1.2, hair);
    // Role-specific wardrobe and props are modeled rather than downloaded.
    if (has(/office|business|manager|teacher|wedding-groom|employee/)) {
      limb(16, torso - 3, 16, torso + 3, 3.5, 0.7, accent);
      if (has(/business|manager/)) {
        sphere(7, 25, 1, 3, 3, 1.3, ink);
        limb(6, 21, 8, 21, 1, 0.5, gold);
      }
    }
    if (has(/doctor|nurse|scientist/)) {
      limb(13, torso - 3, 13, torso + 1, 3.5, 0.45, ink);
      limb(13, torso + 1, 19, torso + 1, 3.5, 0.45, ink);
      ball(19, torso + 2, 3.7, 1, accent);
    }
    if (has(/nurse/)) {
      sphere(16, head - 5.8, 3, 5, 1.6, 2.3, white);
      limb(16, head - 6.8, 16, head - 4.8, 5.5, 0.4, accent);
      limb(15, head - 5.8, 17, head - 5.8, 5.5, 0.4, accent);
    }
    if (has(/chef/)) {
      sphere(16, head - 5.5, 2, 5, 1.7, 2, white);
      for (const x of [12, 16, 20]) ball(x, head - 7, 2, 2.2, white);
      sphere(16, torso + 1, 3.5, 3.5, 4, 0.5, accent);
    }
    if (has(/police|driver|delivery|cricket|football|runner|skater/)) {
      sphere(16, head - 5.8, 2, 6, 1.8, 3, shirt);
      sphere(21, head - 5, 4.5, 4, 0.6, 2, accent);
    }
    if (has(/firefighter|builder|mechanic/)) {
      sphere(16, head - 5, 2, 6.6, 2.7, 3.8, gold);
      sphere(16, head - 4, 3, 7.5, 0.6, 3.5, gold);
      limb(12, torso - 3, 12, torso + 4, 3.5, 0.7, gold);
      limb(20, torso - 3, 20, torso + 4, 3.5, 0.7, gold);
    }
    if (has(/wizard|witch|magician/)) {
      sphere(16, head - 4.5, 3, 8, 0.8, 4, accent);
      for (let i = 0; i < 5; i++)
        sphere(
          16 + i * 0.25,
          head - 5.5 - i * 0.8,
          2,
          4 - i * 0.65,
          1,
          2,
          accent,
        );
      limb(26, 18, 26, 29, 2, 0.6, gold);
      ball(26, 17, 2, 1.8, 0xa9d9fa);
    }
    if (
      has(/pirate|cowboy|detective|farmer|gardener|explorer|hiker|traveller/)
    ) {
      sphere(16, head - 4.5, 3, 8, 0.7, 3, gold);
      sphere(16, head - 6, 2, 5, 2, 3, has(/pirate/) ? ink : fabric);
    }
    if (has(/pirate/)) {
      sphere(19, head + 0.8, 6.5, 1.6, 1.5, 0.3, ink);
      limb(10, head - 1, 22, head + 2, 6, 0.25, ink);
    }
    if (has(/ninja|martial|samurai/)) {
      limb(10, head - 2.8, 22, head - 2.8, 5, 0.7, accent);
      sphere(16, head + 3.5, 5.5, 4.3, 2, 1, shirt);
      limb(7, 19, 5, 29, 0, 0.6, white);
    }
    if (has(/knight|astronaut|space-explorer/)) {
      sphere(16, head, -0.5, 7.7, 7.6, 4, 0xb4c7d8);
      sphere(16, torso, 3.4, 3.7, 3.3, 0.5, accent);
    }
    if (has(/robot/)) {
      sphere(16, head, 1, 7, 6, 4, 0x9cb8c9);
      sphere(16, head, 5, 5, 3, 0.5, ink);
      sphere(13, head, 5.8, 1, 1, 0.4, accent);
      sphere(19, head, 5.8, 1, 1, 0.4, accent);
      limb(16, head - 6, 16, head - 8, 1, 0.5, ink);
    }
    if (has(/princess|bride/)) {
      for (const x of [12, 16, 20]) ball(x, head - 5.6, 4, 1, gold);
      limb(11, head - 4.7, 21, head - 4.7, 4, 0.6, gold);
    }
    if (has(/street-food/)) {
      sphere(23, 25, 3.8, 6, 0.6, 2, gold);
      for (const x of [20, 24, 27]) {
        sphere(x, 24, 4, 1.3, 1.2, 1.2, white);
        ball(x, 23.3, 4.5, 0.7, accent);
      }
    }
    if (has(/kathakali|theyyam/)) {
      sphere(16, 26, 2, 8, 5, 3, white);
      sphere(16, 27.5, 4, 8, 1.3, 1, shirt);
      limb(12, torso - 2, 20, torso + 2, 4, 0.7, gold);
      limb(20, torso - 2, 12, torso + 2, 4, 0.7, gold);
      sphere(16, head - 3, -1, 9.5, 8, 2, has(/theyyam/) ? 0xdb6545 : gold);
      for (let i = 0; i < 7; i++)
        ball(
          8 + i * 2.6,
          head - 5 - Math.sin((i / 6) * Math.PI) * 3,
          3,
          1.1,
          gold,
        );
      sphere(16, head + 4.7, 4, 6, 1.3, 1, white);
    }
    if (has(/coffee|chai/)) {
      sphere(25, 24, 3, 2.4, 3, 2, accent);
      sphere(25, 21, 3, 2.3, 0.5, 2, 0x75523c);
    }
    if (has(/photographer/)) {
      sphere(23, 24, 3, 4, 2.6, 1.5, ink);
      ball(23, 24, 4.5, 1.8, 0x83b4d2);
    }
    if (has(/music|guitar|rockstar/)) {
      sphere(24, 25, 3, 3.8, 4, 1, gold);
      limb(24, 25, 27, 16, 3, 0.8, fabric);
      ball(24, 25, 4, 1.1, ink);
    }
    if (has(/gamer|console/)) {
      sphere(22, 24, 3.5, 4, 2, 1.1, ink);
      ball(20, 24, 4.5, 0.7, accent);
      ball(24, 24, 4.5, 0.7, gold);
    }
    if (has(/developer|designer|gamer|music/)) {
      limb(10, head - 3, 10, head + 1, 5, 0.8, accent);
      limb(22, head - 3, 22, head + 1, 5, 0.8, accent);
    }
    if (has(/bookworm|student|school|teacher/)) {
      sphere(24, 25, 3.3, 3, 3.5, 0.8, accent);
      limb(24, 22, 24, 28, 4.1, 0.3, white);
    }
    if (has(/painter|designer/)) {
      sphere(24, 24, 3.4, 3.5, 2.7, 0.6, gold);
      for (const [i, c] of [accent, shirt, white].entries())
        ball(22 + i * 1.5, 24, 4.1, 0.5, c);
      limb(7, 22, 6, 29, 3, 0.35, ink);
    }
    if (has(/window-cleaner|farmer|gardener|builder|mechanic/)) {
      limb(26, 18, 26, 29, 2, 0.5, gold);
      sphere(26, 18, 2, 2.6, 1.2, 0.8, 0xa0b6b8);
    }
    if (has(/cricket/)) {
      limb(26, 20, 26, 29, 3, 1.2, gold);
    }
    if (has(/football|fitness/)) {
      ball(25, 26, 3, 3, white);
      ball(25, 25.5, 5.8, 1, ink);
    }
    if (has(/skater/)) {
      sphere(16, 31, 2, 8, 0.6, 1.3, accent);
      ball(10, 31, 3, 0.8, ink);
      ball(22, 31, 3, 0.8, ink);
    }
    if (has(/yoga|dancer|classical|fitness/))
      limb(10, head - 3, 22, head - 3, 4.7, 0.5, accent);
    if (has(/pajama|sleepy/)) {
      sphere(18, head - 5, 2, 5, 2.5, 3, accent);
      ball(23, head - 4, 2, 1.4, white);
    }
    if (has(/grandpa|elder/)) limb(26, 23, 26, 31, 2, 0.5, gold);
    if (has(/cyclist/)) {
      limb(4, 29, 27, 29, 3, 0.5, accent);
      for (const x of [6, 26]) {
        sphere(x, 29, 2, 3, 3, 0.6, ink);
        sphere(x, 29, 3, 2, 2, 0.3, 0xc4d5e3);
      }
    }
    if (has(/superhero/)) {
      sphere(16, torso, 3.6, 1.5, 1.8, 0.4, gold);
    }
    if (has(/vampire/)) {
      ball(15, head + 4, 6, 0.5, white);
      ball(18, head + 4, 6, 0.5, white);
    }
    if (drink) {
      sphere(25, head + 3, 5, 1.7, 2.5, 1.3, accent);
      limb(25, head + 2, 23, head + 1, 6, 0.3, white);
    }
    if (happy || jump) {
      ball(28, 8 + (phase % 2), 3, 0.7, gold);
    }
    if (sleep) {
      sphere(25, 10, 1, 2.5, 0.4, 0.4, accent);
      limb(27, 10, 23, 13, 1, 0.35, accent);
      sphere(25, 13, 1, 2.5, 0.4, 0.4, accent);
    }
  };
  if (id === "soft-bear") {
    // Soft clay bear: broad rounded forms and matte studio shading. Coordinates
    // share the same depth buffer and opaque-pixel hit regions as other pets.
    const fur =
      coat === "cream" ? 0xead6b9 : coat === "slate" ? 0x9199a6 : 0xc99462;
    const cream = 0xffe9cd,
      coral = 0xf05a32,
      nose = 0x443027;
    const t = (frame / 32) * Math.PI * 2;
    const stride = walk ? Math.sin(t * 4) * 1.5 : 0;
    const breathe = Math.sin(t) * 0.18;
    const bounce = walk ? Math.cos(t * 8) * 0.25 : breathe;
    const headY = sleep ? 23 : 11.2 + bounce;
    const headX = sleep ? 21.2 : 16;
    // Tail and feet sit behind the belly; sleeping curls the silhouette sideways.
    ball(sleep ? 6.5 : 22, sleep ? 26 : 24, -1, 2.7, fur);
    sphere(
      sleep ? 13 : 16,
      sleep ? 25.8 : 23 + bounce,
      0,
      sleep ? 9 : 7.5,
      sleep ? 5.1 : 7.1,
      4.2,
      fur,
    );
    for (const [x, step] of [
      [11, stride],
      [21, -stride],
    ]) {
      sphere(x, sleep ? 30 : 30.3 + step * 0.15, 2, 3.3, 2.1, 3, fur);
      sphere(x, sleep ? 30.5 : 30.8 + step * 0.15, 4.5, 1.8, 0.8, 0.6, cream);
    }
    sphere(
      sleep ? 13 : 16,
      sleep ? 26.3 : 24 + bounce,
      4,
      sleep ? 5.7 : 4.7,
      sleep ? 3.1 : 4.8,
      1.5,
      cream,
    );
    const leftY = sleep ? 26 : jump ? 14 : 23 + stride;
    const rightY = sleep
      ? 27
      : happy
        ? 12 + Math.sin(t * 4)
        : jump
          ? 14
          : drink
            ? 17
            : 23 - stride;
    limb(
      sleep ? 9 : 10.2,
      sleep ? 25 : 20 + bounce,
      sleep ? 14 : 7.3,
      leftY,
      2,
      2.3,
      fur,
    );
    limb(
      sleep ? 20 : 21.8,
      sleep ? 25 : 20 + bounce,
      sleep ? 24 : 25,
      rightY,
      2,
      2.3,
      fur,
    );
    // Big circular ears with inset peach pads, then a generously rounded head.
    for (const x of [headX - 6.2, headX + 6.2]) {
      ball(x, headY - 5.5, 0, 3.4, fur);
      sphere(x, headY - 5.5, 2.8, 1.8, 1.9, 0.7, 0xe3af90);
    }
    sphere(headX, headY, 1, 8.4, 7.3, 5.2, fur);
    sphere(headX, headY + 2.5, 5.7, 4.5, 2.8, 1.3, cream);
    for (const x of [headX - 3.2, headX + 3.2]) {
      sphere(x, headY - 0.1, 5.85, 0.65, closed ? 0.19 : 0.85, 0.45, nose);
      if (!closed) ball(x - 0.17, headY - 0.4, 6.2, 0.2, white);
      sphere(
        x + (x < headX ? -1 : 1),
        headY + 1.9,
        5.8,
        1.1,
        0.55,
        0.25,
        0xdfa18a,
      );
    }
    sphere(headX, headY + 1.8, 7, 1.2, 0.8, 0.55, nose);
    limb(headX, headY + 2.4, headX, headY + 3.1, 7, 0.19, nose);
    sphere(
      headX,
      headY + 3.3,
      6.9,
      happy ? 1.2 : 0.75,
      happy ? 0.45 : 0.18,
      0.25,
      nose,
    );
    // A coral scarf remains recognizable across all three fur colours.
    sphere(
      sleep ? 15 : 16,
      sleep ? 26 : 18 + bounce,
      5.1,
      sleep ? 3 : 5.7,
      1.2,
      1.2,
      coral,
    );
    sphere(
      sleep ? 11 : 19.5,
      sleep ? 27 : 21 + bounce,
      5.6,
      1.3,
      sleep ? 1.2 : 3.1,
      0.8,
      coral,
    );
    if (drink) {
      sphere(24, 18, 5, 2, 2.6, 1.6, cream);
      sphere(24, 15.8, 5, 1.8, 0.5, 1.4, 0x79513c);
      limb(23, 16, 21, 15, 6.5, 0.28, coral);
    }
  } else if (id.startsWith("soft-")) {
    // Original stuffed animals: rounded fabric bodies, inset muzzles, bead eyes,
    // stitched bellies, and small bows. Species have distinct ears and silhouettes.
    const species = id.slice(5);
    const palettes: Record<string, number[]> = {
      bunny: [0xe4baa9, 0xf2e4d7, 0xb7b8d5],
      kitten: [0xd9ab7f, 0xf0dfc8, 0x999fac],
      puppy: [0xc59670, 0xe9d4b4, 0x9cabb6],
      panda: [0xf0dfcf, 0xf4eee0, 0xd1dae0],
      duck: [0xf3cb6c, 0xf1e1aa, 0xb2c6ce],
      axolotl: [0xe6a0b2, 0xf2d2c7, 0xb5b0d5],
    };
    const coatIndex = ["ginger", "cream", "slate"].indexOf(coat);
    const fur = palettes[species][coatIndex];
    const dark = species === "panda" ? 0x57505c : tint(fur, 0.77);
    const lining = species === "duck" ? 0xe9a05c : 0xe8a6ac;
    const belly = 0xffecda;
    const thread = 0xb3958c;
    const bead = 0x362d34;
    const ribbon = [0xa05c61, 0x9a7da8, 0x597d81][coatIndex];
    const t = (frame / 32) * Math.PI * 2;
    const stride = walk ? Math.sin(t * 4) * 1.1 : 0;
    const bounce = walk ? Math.cos(t * 8) * 0.25 : Math.sin(t) * 0.15;
    const headX = sleep ? 19 : 16;
    const headY = sleep ? 21 : species === "bunny" ? 14 : 11.6 + bounce;
    const isPanda = species === "panda";
    // Rounded tails sit behind the stuffing, including a curled kitten tail.
    if (species === "kitten") {
      limb(22, 26, 28, 24, -2, 1.8, fur);
      limb(28, 24, 28, 18, -2, 1.8, fur);
      ball(27.5, 17.5, -1, 1.9, fur);
    } else if (species === "axolotl") {
      sphere(24, 25, -2, 6, 3.3, 1.6, fur);
      sphere(28, 24, -2, 2, 3.7, 0.8, lining);
    } else ball(23, 25, -2, 2.7, fur);
    // An oval belly and flattened feet give the toy a weighted, seated silhouette.
    sphere(
      sleep ? 13 : 16,
      sleep ? 26 : 23.5 + bounce,
      0,
      sleep ? 8.5 : 6.7,
      sleep ? 4.8 : 6.6,
      4.1,
      fur,
    );
    for (const [x, step] of [
      [11, stride],
      [21, -stride],
    ]) {
      sphere(
        x,
        sleep ? 30 : 30 + step * 0.2,
        2,
        3.2,
        1.8,
        3,
        isPanda ? dark : fur,
      );
      sphere(
        x,
        30.7 + step * 0.1,
        4.5,
        1.8,
        0.55,
        0.5,
        species === "duck" ? lining : belly,
      );
    }
    sphere(
      sleep ? 13 : 16,
      sleep ? 26.3 : 24 + bounce,
      4,
      4.3,
      sleep ? 2.7 : 4.4,
      1.1,
      belly,
    );
    // Embroidered center seam and a tiny cross stitch on the tummy.
    for (let y = 23; y <= 27; y += 1.3)
      sphere(
        sleep ? 13 : 16,
        y + (sleep ? 1 : bounce),
        5.15,
        0.12,
        0.3,
        0.12,
        thread,
      );
    limb(14.8, 26.8, 15.5, 27.5, 5.2, 0.14, thread);
    limb(15.5, 26.8, 14.8, 27.5, 5.2, 0.14, thread);
    const leftY = sleep ? 27 : jump ? 14 : 24 + stride;
    const rightY = sleep
      ? 27
      : happy
        ? 14 + Math.sin(t * 4)
        : jump
          ? 14
          : drink
            ? 18
            : 24 - stride;
    limb(
      sleep ? 8 : 10.5,
      21 + bounce,
      sleep ? 10 : 7.8,
      leftY,
      1.5,
      2.1,
      isPanda ? dark : fur,
    );
    limb(
      sleep ? 20 : 21.5,
      21 + bounce,
      sleep ? 24 : 25,
      rightY,
      1.5,
      2.1,
      isPanda ? dark : fur,
    );
    // Ears/gills are behind the oversized head, distinct for each animal.
    if (species === "bunny") {
      sphere(headX - 5, headY - 8, 0, 2.6, sleep ? 3.8 : 6.1, 2.2, fur);
      sphere(headX - 5, headY - 8, 2, 1.25, sleep ? 2.5 : 4.5, 0.5, lining);
      sphere(headX + 5, headY - 7, 0, 2.8, 5.1, 2.2, fur);
      sphere(headX + 5.5, headY - 6.5, 2, 1.3, 3.4, 0.5, lining);
    } else if (species === "kitten") {
      for (const dx of [-5.5, 5.5]) {
        sphere(headX + dx, headY - 5.3, 0, 3, 4, 2.3, fur);
        sphere(headX + dx, headY - 5.5, 2.1, 1.4, 2.3, 0.5, lining);
      }
    } else if (species === "puppy") {
      for (const dx of [-7.2, 7.2])
        sphere(headX + dx, headY + 1.5, 0, 3.1, 6.2, 2.4, dark);
    } else if (isPanda) {
      for (const dx of [-5.7, 5.7]) ball(headX + dx, headY - 5.2, 0, 3.4, dark);
    } else if (species === "axolotl") {
      for (const side of [-1, 1])
        for (const offset of [-3, 0, 3]) {
          limb(
            headX + side * 6,
            headY,
            headX + side * 10.5,
            headY + offset * 1.4,
            -1,
            0.9,
            lining,
          );
          ball(headX + side * 10.5, headY + offset * 1.4, 0, 1.3, lining);
        }
    } else {
      sphere(headX, headY - 6, 0, 1.7, 2.8, 1.5, fur);
      sphere(headX + 1.5, headY - 6, 0, 1, 2.2, 1, fur);
    }
    sphere(headX, headY, 1.5, species === "axolotl" ? 8.5 : 7.5, 6.4, 4.9, fur);
    if (isPanda)
      for (const dx of [-3.2, 3.2])
        sphere(headX + dx, headY + 0.3, 5.6, 2.1, 2.4, 0.8, dark);
    if (species === "duck") {
      sphere(headX, headY + 2.7, 6.1, 3.1, 1.4, 1.8, lining);
      limb(headX - 1.7, headY + 3, headX + 1.7, headY + 3, 7.8, 0.15, 0xb37548);
    } else {
      sphere(headX, headY + 2.5, 5.7, 3.7, 2.5, 1.2, belly);
      sphere(
        headX,
        headY + 1.9,
        7,
        0.85,
        0.6,
        0.5,
        species === "bunny" ? lining : bead,
      );
      limb(headX, headY + 2.5, headX, headY + 3.4, 7, 0.14, bead);
      sphere(
        headX,
        headY + 3.5,
        6.9,
        happy ? 1.15 : 0.7,
        happy ? 0.4 : 0.17,
        0.2,
        bead,
      );
    }
    for (const dx of [-3.2, 3.2]) {
      sphere(
        headX + dx,
        headY + 0.1,
        6.1,
        0.65,
        closed ? 0.17 : 0.85,
        0.45,
        bead,
      );
      if (!closed) ball(headX + dx - 0.16, headY - 0.2, 6.5, 0.19, white);
      sphere(headX + dx * 1.5, headY + 2.1, 5.6, 1, 0.45, 0.25, lining);
    }
    // A small cloth bow rather than a human outfit.
    sphere(14, sleep ? 27 : 19.2 + bounce, 5.2, 1.8, 1.1, 0.6, ribbon);
    sphere(18, sleep ? 27 : 19.2 + bounce, 5.2, 1.8, 1.1, 0.6, ribbon);
    ball(16, sleep ? 27 : 19.2 + bounce, 5.7, 0.8, ribbon);
    if (drink) {
      sphere(24, 18.5, 5, 1.8, 2.5, 1.5, belly);
      sphere(24, 16.3, 5, 1.6, 0.4, 1.3, 0x79513c);
      limb(23, 16, 21, 15, 6.5, 0.25, ribbon);
    }
  } else figure();
  if (has(/tiny-couple/)) {
    offsetX = 14;
    figure();
  }
  // Pixel centers and alpha are deterministic: native hit spans use these exact opaque pixels.
  const color = new Int32Array(grid * grid).fill(-1),
    depth = new Float32Array(grid * grid).fill(-Infinity);
  const factor = grid / 32;
  for (const s of shapes) {
    const x0 = Math.max(0, Math.floor((s.x - s.rx) * factor)),
      x1 = Math.min(grid - 1, Math.ceil((s.x + s.rx) * factor));
    const y0 = Math.max(0, Math.floor((s.y - s.ry) * factor)),
      y1 = Math.min(grid - 1, Math.ceil((s.y + s.ry) * factor));
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const dx = ((x + 0.5) / factor - s.x) / s.rx,
          dy = ((y + 0.5) / factor - s.y) / s.ry,
          q = 1 - dx * dx - dy * dy;
        if (q <= 0) continue;
        const dz = Math.sqrt(q),
          z = s.z + s.rz * dz,
          i = y * grid + x;
        if (z <= depth[i]) continue;
        depth[i] = z;
        const nx = dx / s.rx,
          ny = dy / s.ry,
          nz = dz / s.rz,
          length = Math.hypot(nx, ny, nz);
        const lighting =
          0.56 + 0.5 * Math.max(0, (-0.4 * nx - 0.6 * ny + 0.8 * nz) / length);
        const light = is3d
          ? lighting
          : lighting < 0.65
            ? 0.68
            : lighting < 0.88
              ? 0.87
              : 1.03;
        color[i] = tint(s.color, light);
      }
  }
  const runs: Run[] = [];
  for (let y = 0; y < grid; y++)
    for (let x = 0; x < grid;) {
      const index = (xx: number) =>
        y * grid + (direction < 0 ? grid - 1 - xx : xx);
      const c = color[index(x)];
      let end = x + 1;
      while (end < grid && color[index(end)] === c) end++;
      if (c >= 0)
        runs.push({
          x,
          y,
          width: end - x,
          color: `#${c.toString(16).padStart(6, "0")}`,
        });
      x = end;
    }
  return runs;
}
