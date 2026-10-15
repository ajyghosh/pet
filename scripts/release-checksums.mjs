import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const directory = process.argv[2];
if (!directory)
  throw Error("Usage: node scripts/release-checksums.mjs <bundle-directory>");
const files = fs
  .readdirSync(directory, { recursive: true })
  .filter((name) => /(?:\.dmg|-setup\.exe|\.app\.tar\.gz)$/.test(name))
  .sort();
if (!files.length) throw Error("No release installers/archives found.");
const sums = files.map(
  (name) =>
    `${crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(directory, name)))
      .digest("hex")}  ${name.split(path.sep).join("/")}`,
);
fs.writeFileSync(
  path.join(directory, "SHA256SUMS.txt"),
  sums.join("\n") + "\n",
);
console.log(`Wrote checksums for ${files.length} release files.`);
