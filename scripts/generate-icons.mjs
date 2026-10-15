// Original Miso artwork; dependency-free PNG/ICO encoder. Run with Node 22+.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { sprite } from "../src/core/sprite.ts";
const pixels = Array.from({ length: 32 }, () => Array(32).fill(null));
for (const r of sprite("idle", 0, "slate"))
  for (let x = r.x; x < r.x + r.width; x++) pixels[r.y][x] = r.color;
function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([len, name, data, crc]);
}
function png(size) {
  const scan = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const c =
        pixels[Math.floor((y * 32) / size)][Math.floor((x * 32) / size)];
      if (!c) continue;
      const offset = y * (size * 4 + 1) + 1 + x * 4;
      scan[offset] = parseInt(c.slice(1, 3), 16);
      scan[offset + 1] = parseInt(c.slice(3, 5), 16);
      scan[offset + 2] = parseInt(c.slice(5, 7), 16);
      scan[offset + 3] = 255;
    }
  const head = Buffer.alloc(13);
  head.writeUInt32BE(size);
  head.writeUInt32BE(size, 4);
  head[8] = 8;
  head[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", head),
    chunk("IDAT", deflateSync(scan)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
mkdirSync("src-tauri/icons", { recursive: true });
const sizes = [32, 128, 256],
  images = sizes.map(png);
sizes.forEach((s, i) =>
  writeFileSync(`src-tauri/icons/${s}x${s}.png`, images[i]),
);
writeFileSync("src-tauri/icons/icon.png", images[1]);
const header = Buffer.alloc(6);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const entries = sizes.map((size, i) => {
  const b = Buffer.alloc(16);
  b[0] = size % 256;
  b[1] = size % 256;
  b.writeUInt16LE(1, 4);
  b.writeUInt16LE(32, 6);
  b.writeUInt32LE(images[i].length, 8);
  b.writeUInt32LE(offset, 12);
  offset += images[i].length;
  return b;
});
writeFileSync(
  "src-tauri/icons/icon.ico",
  Buffer.concat([header, ...entries, ...images]),
);
const macImages = [
  ["ic07", 128],
  ["ic08", 256],
  ["ic09", 512],
  ["ic10", 1024],
].map(([type, size]) => {
  const data = png(size);
  const header = Buffer.alloc(8);
  header.write(type, 0, 4, "ascii");
  header.writeUInt32BE(data.length + 8, 4);
  return Buffer.concat([header, data]);
});
const macHeader = Buffer.alloc(8);
macHeader.write("icns", 0, 4, "ascii");
macHeader.writeUInt32BE(
  8 + macImages.reduce((sum, data) => sum + data.length, 0),
  4,
);
writeFileSync(
  "src-tauri/icons/icon.icns",
  Buffer.concat([macHeader, ...macImages]),
);
const states = ["idle", "walking", "sleeping", "jumping", "happy", "drinking"];
mkdirSync("public/characters", { recursive: true });
for (const coat of ["ginger", "cream", "slate"]) {
  const width = 32 * 32,
    height = states.length * 2 * 32;
  const scan = Buffer.alloc((width * 4 + 1) * height);
  states.forEach((state, index) => {
    for (const direction of [1, -1])
      for (let frame = 0; frame < 32; frame++) {
        const row = index * 2 + (direction < 0 ? 1 : 0);
        for (const r of sprite(state, frame, coat, direction))
          for (let x = r.x; x < r.x + r.width; x++) {
            const o =
              (row * 32 + r.y) * (width * 4 + 1) + 1 + (frame * 32 + x) * 4;
            scan[o] = parseInt(r.color.slice(1, 3), 16);
            scan[o + 1] = parseInt(r.color.slice(3, 5), 16);
            scan[o + 2] = parseInt(r.color.slice(5, 7), 16);
            scan[o + 3] = 255;
          }
      }
  });
  const head = Buffer.alloc(13);
  head.writeUInt32BE(width);
  head.writeUInt32BE(height, 4);
  head[8] = 8;
  head[9] = 6;
  writeFileSync(
    `public/characters/alex-${coat}.png`,
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk("IHDR", head),
      chunk("IDAT", deflateSync(scan)),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}
writeFileSync(
  "public/characters/alex.json",
  JSON.stringify(
    {
      id: "alex",
      name: "Alex",
      personality: "The everyday optimist",
      license: "MIT",
      artist: "Original MiniMates project artwork",
      frameWidth: 32,
      frameHeight: 32,
      framesPerAnimation: 32,
      frameDurationMs: 160,
      states,
      directions: ["right", "left"],
      outfits: ["ginger", "cream", "slate"],
      layout:
        "Each state occupies two rows: right, then left. Frames advance across columns.",
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "Generated original MiniMates human sprite sheets, PNG, ICO, and ICNS assets.",
);
