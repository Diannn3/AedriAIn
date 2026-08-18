#!/usr/bin/env bash
set -euo pipefail
DEST="${1:-./references}"
mkdir -p "$DEST"
cd "$DEST"
repos=(
  "https://github.com/heeelol/jester.git"
  "https://github.com/quiet-node/gesture-lab.git"
  "https://github.com/SAGAR-TAMANG/ultron-by-sagar-builds.git"
  "https://github.com/google-ai-edge/mediapipe-samples-web.git"
  "https://github.com/Necookie-Labs/Voxel-Manipulation-via-Hand-Tracking.git"
  "https://github.com/pmndrs/react-three-fiber.git"
  "https://github.com/pmndrs/uikit.git"
)
for repo in "${repos[@]}"; do
  name="$(basename "$repo" .git)"
  [ -d "$name" ] || git clone --depth=1 "$repo" "$name"
done
