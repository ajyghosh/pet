import fs from "node:fs";
import crypto from "node:crypto";
const read = (name) =>
  fs.readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
const digest = (text) => crypto.createHash("sha256").update(text).digest("hex");
const pkg = JSON.parse(read("package.json"));
const npmLock = JSON.parse(read("package-lock.json"));
const config = JSON.parse(read("src-tauri/tauri.conf.json"));
const cargoVersion = read("src-tauri/Cargo.toml").match(
  /^version = "([^"]+)"/m,
)?.[1];
const cargoLockVersion = read("src-tauri/Cargo.lock").match(
  /name = "miso-desktop"\nversion = "([^"]+)"/,
)?.[1];
if (
  [
    npmLock.version,
    npmLock.packages[""].version,
    config.version,
    cargoVersion,
    cargoLockVersion,
  ].some((version) => version !== pkg.version)
)
  throw Error("Release versions disagree.");
const manifest = JSON.parse(read("licenses/manifest.json"));
if (
  manifest.npmLockSha256 !== digest(read("package-lock.json")) ||
  manifest.cargoLockSha256 !== digest(read("src-tauri/Cargo.lock")) ||
  manifest.noticesSha256 !== digest(read("THIRD_PARTY_LICENSES.txt"))
)
  throw Error(
    "Dependency notices are stale. Run npm run notices with installed supported-target dependencies.",
  );
for (const file of [
  "THIRD_PARTY_LICENSES.txt",
  "THIRD_PARTY_NOTICES.md",
  "LICENSE",
]) {
  if (config.bundle.resources?.[`../${file}`] !== file)
    throw Error(`Missing packaged notice: ${file}`);
}
console.log(
  `Release ${pkg.version}: versions agree; ${manifest.packages.length} dependency notices verified and configured for packaging.`,
);
