#!/usr/bin/env bash
# Build the Night Drive macroquad game to wasm and drop it into public/game/
# so the garage monitor (and /game/) picks it up. Re-run after editing the Rust.
#
#   ./game/build.sh
#
# One-time setup:  rustup target add wasm32-unknown-unknown
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
crate="$here/night-drive"
out="$here/../public/game"

echo "▶ building night-drive (wasm, release)…"
cargo build --release --target wasm32-unknown-unknown --manifest-path "$crate/Cargo.toml"

wasm="$crate/target/wasm32-unknown-unknown/release/night-drive.wasm"
cp "$wasm" "$out/night-drive.wasm"
echo "✔ copied → public/game/night-drive.wasm ($(du -h "$out/night-drive.wasm" | cut -f1))"
