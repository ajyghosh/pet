#!/usr/bin/env bash
set -euo pipefail

# Build directly from a source folder. Finder customization mounts a temporary
# image and can fail to eject it on CI with "Resource busy".
target="${1:?Expected a Rust build target}"
case "$target" in
  x86_64-apple-darwin) arch=x64 ;;
  aarch64-apple-darwin) arch=aarch64 ;;
  *) echo "Unsupported Mac target: $target" >&2; exit 1 ;;
esac
bundle="src-tauri/target/$target/release/bundle"
version="$(node -p 'JSON.parse(require("fs").readFileSync("package.json", "utf8")).version')"
stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT
ditto "$bundle/macos/heykup-pets.app" "$stage/heykup-pets.app"
ln -s /Applications "$stage/Applications"
mkdir -p "$bundle/dmg"
hdiutil create -volname heykup-pets -srcfolder "$stage" -ov -format UDZO \
  "$bundle/dmg/heykup-pets_${version}_${arch}.dmg"
