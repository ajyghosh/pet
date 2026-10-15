import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const digest = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");
// Source lockfiles use canonical LF; upstream license text stays byte-exact.
const digestSource = (text) => digest(text.replace(/\r\n/g, "\n"));
const lock = JSON.parse(read("package-lock.json"));
const overrides = JSON.parse(read("licenses/overrides.json"));
const cargoHome = process.env.CARGO_HOME || path.join(os.homedir(), ".cargo");
const registry = path.join(cargoHome, "registry", "src");
const registries = fs
  .readdirSync(registry)
  .sort()
  .map((name) => path.join(registry, name));
const cargo = process.env.CARGO || "cargo";
const targets = [
  "x86_64-pc-windows-msvc",
  "x86_64-apple-darwin",
  "aarch64-apple-darwin",
];
const packages = new Map();
for (const target of targets) {
  const tree = execFileSync(
    cargo,
    [
      "tree",
      "--locked",
      "--offline",
      "--manifest-path",
      "src-tauri/Cargo.toml",
      "--target",
      target,
      "--prefix",
      "none",
      "--format",
      "{p}|{l}",
      "-e",
      "normal,build",
    ],
    { cwd: root, encoding: "utf8" },
  );
  for (const line of tree.split("\n")) {
    const match = line.match(/^(\S+) v(\S+).*?\|(.+?)(?: \(\*\))?$/);
    if (match && match[1] !== "miso-desktop")
      packages.set(`${match[1]}@${match[2]}`, {
        ecosystem: "cargo",
        name: match[1],
        version: match[2],
        license: match[3],
      });
  }
}
for (const [location, item] of Object.entries(lock.packages)) {
  if (!location || item.dev || item.devOptional) continue;
  const manifest = JSON.parse(read(`${location}/package.json`));
  if (manifest.version !== item.version)
    throw Error(`Installed npm package differs from lock: ${location}`);
  packages.set(`npm:${manifest.name}@${manifest.version}`, {
    ecosystem: "npm",
    name: manifest.name,
    version: manifest.version,
    license: manifest.license,
    directory: path.join(root, location),
  });
}
const licenseName =
  /^(licenses?|licences?|copying|copyright|notices?|unlicense)([._-]|$)/i;
function licenseFiles(directory) {
  const files = [];
  for (const entry of fs
    .readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name, "en"))) {
    if (!licenseName.test(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      for (const child of fs.readdirSync(full, { recursive: true }).sort()) {
        const file = path.join(full, child);
        if (fs.statSync(file).isFile())
          files.push({
            name: `${entry.name}/${child}`,
            text: fs.readFileSync(file, "utf8"),
          });
      }
    } else
      files.push({ name: entry.name, text: fs.readFileSync(full, "utf8") });
  }
  return files;
}
const sections = [
  "heykup pets — THIRD-PARTY LICENSES AND NOTICES",
  "Generated from the locked npm runtime dependencies and the union of normal/build Rust dependencies for Windows x64, Mac Intel and Mac Apple Silicon. Some included components are build tools rather than code present in every binary. No dependency license is replaced by heykup pets' own MIT license.",
  "Source availability: unmodified crate source archives are available at the exact static.crates.io URLs listed below. In particular, source for MPL-2.0 components is available there under its original license. Upstream license files omitted from crate archives are preserved under licenses/upstream with pinned source provenance. Platform WebView2/WebKit components retain their vendor terms; see THIRD_PARTY_NOTICES.md.",
  `heykup pets project license\n${read("LICENSE").trimEnd()}`,
];
const records = [];
for (const item of [...packages.values()].sort((a, b) =>
  `${a.ecosystem}:${a.name}@${a.version}`.localeCompare(
    `${b.ecosystem}:${b.name}@${b.version}`,
    "en",
  ),
)) {
  const id = `${item.name}@${item.version}`;
  const directory =
    item.directory ||
    registries
      .map((base) => path.join(base, `${item.name}-${item.version}`))
      .find((dir) => fs.existsSync(dir));
  if (!directory)
    throw Error(
      `Missing installed source: ${id}. Fetch all supported targets first.`,
    );
  let files = licenseFiles(directory);
  const upstream = overrides[id];
  if (!files.length && upstream)
    files = upstream.files.map(({ file, source }) => ({
      name: file,
      text: `${read(file).trimEnd()}\n\nLicense source: ${source}`,
    }));
  if (!files.length)
    throw Error(
      `Missing full license text: ${id}; preserve a pinned upstream notice before generating.`,
    );
  const source =
    item.ecosystem === "cargo"
      ? `https://static.crates.io/crates/${item.name}/${item.name}-${item.version}.crate`
      : `https://www.npmjs.com/package/${item.name}/v/${item.version}`;
  const metadata =
    item.ecosystem === "cargo"
      ? fs
          .readFileSync(path.join(directory, "Cargo.toml"), "utf8")
          .match(/^authors = \[[\s\S]*?\]/m)?.[0]
      : undefined;
  const header = `${item.ecosystem}: ${id}\nDeclared license: ${item.license}\nOriginal source: ${source}${upstream ? `\nRepository: ${upstream.repository}\nSource commit: ${upstream.commit}` : ""}${metadata ? `\n${metadata}` : ""}`;
  sections.push(
    header +
      "\n\n" +
      files.map((f) => `--- ${f.name} ---\n${f.text.trimEnd()}`).join("\n\n"),
  );
  records.push({
    ecosystem: item.ecosystem,
    name: item.name,
    version: item.version,
    license: item.license,
    source,
    notices: files.map((f) => ({ name: f.name, sha256: digest(f.text) })),
  });
}
const output = sections.join("\n\n" + "=".repeat(78) + "\n\n") + "\n";
fs.writeFileSync(path.join(root, "THIRD_PARTY_LICENSES.txt"), output);
fs.writeFileSync(
  path.join(root, "licenses/manifest.json"),
  JSON.stringify(
    {
      npmLockSha256: digestSource(read("package-lock.json")),
      cargoLockSha256: digestSource(read("src-tauri/Cargo.lock")),
      noticesSha256: digest(output),
      targets,
      packages: records,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Generated notices for ${records.length} packages (${Buffer.byteLength(output)} bytes).`,
);
