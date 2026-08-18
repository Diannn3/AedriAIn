#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${TMPDIR:-/tmp}/spatial-desktop-core-tests"
rm -rf "$OUT"
mkdir -p "$OUT"
cd "$ROOT"

tsc src/input/hand/types.ts src/input/hand/gestures.ts --target ES2022 --module commonjs --moduleResolution node --outDir "$OUT/gesture" --strict --skipLibCheck
cat > "$OUT/gesture/test.cjs" <<'TEST'
const assert = require('node:assert/strict');
const { GestureEngine, getPinchStrength, classifyPose } = require('./gestures.js');
function baseHand() {
  const lm = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.7, z: 0 }));
  lm[0] = { x: 0.5, y: 0.8, z: 0 }; lm[9] = { x: 0.5, y: 0.5, z: 0 };
  lm[4] = { x: 0.46, y: 0.32, z: 0 }; lm[8] = { x: 0.54, y: 0.25, z: 0 }; lm[6] = { x: 0.52, y: 0.46, z: 0 };
  lm[10] = { x: 0.5, y: 0.56, z: 0 }; lm[12] = { x: 0.5, y: 0.72, z: 0 };
  lm[14] = { x: 0.56, y: 0.58, z: 0 }; lm[16] = { x: 0.55, y: 0.72, z: 0 };
  lm[18] = { x: 0.62, y: 0.62, z: 0 }; lm[20] = { x: 0.61, y: 0.74, z: 0 };
  return lm;
}
const point = baseHand();
assert.equal(classifyPose(point, false), 'POINT');
const pinch = baseHand(); pinch[4] = { x: 0.50, y: 0.25, z: 0 }; pinch[8] = { x: 0.515, y: 0.25, z: 0 };
assert.ok(getPinchStrength(pinch) < 0.31);
const engine = new GestureEngine();
let hand = { handedness: 'Right', landmarks: pinch, worldLandmarks: [], score: 0.99 };
assert.equal(engine.analyze(hand, 0).pinching, true);
const mid = baseHand(); mid[4] = {x:.44,y:.25,z:0}; mid[8]={x:.56,y:.25,z:0}; hand = { ...hand, landmarks: mid };
assert.equal(engine.analyze(hand, 0).pinching, true);
const open = baseHand(); open[4] = {x:.40,y:.25,z:0}; open[8]={x:.60,y:.25,z:0}; hand = { ...hand, landmarks: open };
assert.equal(engine.analyze(hand, 0).pinching, false);
console.log('gesture-engine: PASS');
TEST
node "$OUT/gesture/test.cjs"

tsc src/core/types.ts src/commands/types.ts src/commands/localParser.ts --target ES2022 --module commonjs --moduleResolution node --outDir "$OUT/commands" --strict --skipLibCheck
cat > "$OUT/commands/test.cjs" <<'TEST'
const assert = require('node:assert/strict');
const { parseLocalCommand } = require('./commands/localParser.js');
assert.deepEqual(parseLocalCommand('open map'), { type: 'APP_OPEN', appId: 'map' });
assert.deepEqual(parseLocalCommand('close my notes'), { type: 'APP_CLOSE', appId: 'notes' });
assert.deepEqual(parseLocalCommand('study mode'), { type: 'WORKSPACE_STUDY' });
assert.deepEqual(parseLocalCommand('reset workspace'), { type: 'WORKSPACE_RESET' });
assert.deepEqual(parseLocalCommand('hide all'), { type: 'WORKSPACE_SET_ALL', open: false });
assert.equal(parseLocalCommand('make me coffee'), null);
console.log('command-parser: PASS');
TEST
node "$OUT/commands/test.cjs"
