#!/usr/bin/env sh
set -eu

node -e '
const [major, minor] = process.versions.node.split(".").map(Number)
const supported = (major === 20 && minor >= 19) || major >= 22 && (major > 22 || minor >= 12)
if (!supported) {
  console.error(`Node.js ${process.versions.node} is unsupported. Use 20.19+ or 22.12+ (20.x/22.x), as specified in .nvmrc.`)
  process.exit(1)
}
'

if ! command -v rustup >/dev/null 2>&1; then
  if ! command -v curl >/dev/null 2>&1; then
    echo 'curl is required to install Rust via rustup.' >&2
    exit 1
  fi
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal --default-toolchain stable
fi

if [ -f "$HOME/.cargo/env" ]; then
  . "$HOME/.cargo/env"
fi

if ! command -v cargo >/dev/null 2>&1 || ! command -v rustup >/dev/null 2>&1; then
  echo 'Rust/Cargo installation was not found after rustup setup.' >&2
  exit 1
fi

pnpm --dir examples install --frozen-lockfile
rustup target add wasm32-unknown-unknown
pnpm wasm:build