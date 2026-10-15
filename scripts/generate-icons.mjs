// Original Miso artwork; dependency-free PNG/ICO encoder. Run with Node 22+.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
const pixels = Array.from({ length: 32 }, () => Array(32).fill(null));
const colors = [
  "#513c32",
  "#d98c52",
  "#edb878",
  "#ffe2af",
  "#b9693e",
  "#dd8d89",
];
function rect(x, y, w, h, c) {
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++) pixels[j][i] = colors[c];
}
rect(25, 19, 4, 10, 0);
rect(26, 18, 4, 7, 0);
rect(26, 20, 2, 7, 1);
rect(27, 19, 2, 4, 2);
rect(8, 18, 18, 13, 0);
rect(9, 19, 16, 11, 1);
rect(12, 23, 9, 7, 3);
rect(9, 29, 6, 3, 0);
rect(19, 29, 6, 3, 0);
rect(10, 29, 4, 2, 2);
rect(20, 29, 4, 2, 2);
rect(6, 3, 6, 10, 0);
rect(21, 3, 6, 10, 0);
rect(7, 5, 4, 7, 1);
rect(22, 5, 4, 7, 1);
rect(8, 7, 2, 4, 5);
rect(23, 7, 2, 4, 5);
rect(8, 9, 17, 14, 0);
rect(5, 12, 23, 8, 0);
rect(7, 12, 19, 8, 2);
rect(9, 10, 15, 12, 2);
rect(13, 10, 2, 4, 4);
rect(17, 10, 2, 3, 4);
rect(7, 16, 3, 2, 4);
rect(23, 16, 3, 2, 4);
rect(12, 18, 9, 3, 3);
rect(10, 15, 3, 3, 0);
rect(20, 15, 3, 3, 0);
rect(11, 15, 1, 1, 3);
rect(21, 15, 1, 1, 3);
rect(16, 18, 2, 1, 5);
rect(16, 19, 2, 1, 0);
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
console.log("Generated original Miso PNG and Windows ICO assets.");
