import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

// Run the real release checker against an isolated copy of release metadata.
// This catches checkout-dependent parsing and hashing without changing the repo.
const files = [
  "scripts/check-release.mjs",
  "package.json",
  "package-lock.json",
  "src-tauri/tauri.conf.json",
  "src-tauri/Cargo.toml",
  "src-tauri/Cargo.lock",
  "licenses/manifest.json",
  "THIRD_PARTY_LICENSES.txt",
];
let root: string;
const read = (file: string) => readFileSync(join(root, file), "utf8");
const write = (file: string, value: string) =>
  writeFileSync(join(root, file), value);
const check = () =>
  spawnSync(process.execPath, [join(root, "scripts/check-release.mjs")], {
    encoding: "utf8",
  });

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "heykup-release-"));
  for (const file of files) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    write(
      file,
      readFileSync(new URL(`../../${file}`, import.meta.url), "utf8"),
    );
  }
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("release checks across source checkout line endings", () => {
  for (const lineEnding of ["\n", "\r\n"]) {
    it(`accepts matching metadata with ${lineEnding === "\n" ? "LF" : "Windows CRLF"} source files`, () => {
      for (const file of files.filter((f) => f !== "THIRD_PARTY_LICENSES.txt"))
        write(
          file,
          read(file).replace(/\r\n/g, "\n").replace(/\n/g, lineEnding),
        );
      const result = check();
      expect(result.stderr).toBe("");
      expect(result.status).toBe(0);
    });
  }
  it("still rejects an actual native version mismatch", () => {
    write(
      "src-tauri/Cargo.toml",
      read("src-tauri/Cargo.toml").replace(
        /^version = "[^"]+"/m,
        'version = "0.0.0"',
      ),
    );
    const result = check();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Release versions disagree");
    expect(result.stderr).toContain('"Cargo.toml":"0.0.0"');
  });
  it("still rejects a changed dependency lockfile", () => {
    write(
      "src-tauri/Cargo.lock",
      read("src-tauri/Cargo.lock") + "# changed dependencies\n",
    );
    const result = check();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Dependency notices are stale");
  });
  it("continues to verify the exact bytes of the packaged license bundle", () => {
    write("THIRD_PARTY_LICENSES.txt", read("THIRD_PARTY_LICENSES.txt") + "\n");
    const result = check();
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Dependency notices are stale");
  });
});
