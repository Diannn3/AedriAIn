#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${TMPDIR:-/tmp}/spatial-desktop-core-tests"
rm -rf "$OUT"
mkdir -p "$OUT"
cd "$ROOT"

tsc src/input/hand/types.ts src/input/hand/gestures.ts src/input/hand/HandIdentityTracker.ts --target ES2022 --module commonjs --moduleResolution node --outDir "$OUT/gesture" --strict --skipLibCheck
cat > "$OUT/gesture/test.cjs" <<'TEST'
const assert = require('node:assert/strict');
const { GestureEngine, getPinchStrength, classifyPose } = require('./gestures.js');
const { HandIdentityTracker } = require('./HandIdentityTracker.js');
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
let hand = { trackingId: 'hand-1', handedness: 'Right', landmarks: pinch, worldLandmarks: [], score: 0.99 };
assert.equal(engine.analyze(hand, 0).pinching, true);
const mid = baseHand(); mid[4] = {x:.44,y:.25,z:0}; mid[8]={x:.56,y:.25,z:0}; hand = { ...hand, landmarks: mid };
assert.equal(engine.analyze(hand, 0).pinching, true);
const open = baseHand(); open[4] = {x:.40,y:.25,z:0}; open[8]={x:.60,y:.25,z:0}; hand = { ...hand, landmarks: open };
assert.equal(engine.analyze(hand, 0).pinching, false);
const tracker = new HandIdentityTracker();
const makeTracked = (trackingId, handedness, x) => {
  const landmarks = baseHand().map((p) => ({ ...p, x: p.x + x - 0.5 }));
  return { trackingId, handedness, landmarks, worldLandmarks: [], score: 0.99 };
};
const first = tracker.update([
  (({ trackingId, ...rest }) => rest)(makeTracked('x', 'Left', 0.3)),
  (({ trackingId, ...rest }) => rest)(makeTracked('x', 'Right', 0.7)),
]);
const second = tracker.update([
  (({ trackingId, ...rest }) => rest)(makeTracked('x', 'Right', 0.69)),
  (({ trackingId, ...rest }) => rest)(makeTracked('x', 'Left', 0.31)),
]);
assert.equal(first[0].trackingId, second[1].trackingId);
assert.equal(first[1].trackingId, second[0].trackingId);
console.log('gesture-engine: PASS');
TEST
node "$OUT/gesture/test.cjs"

tsc src/core/types.ts src/commands/types.ts src/commands/localParser.ts --target ES2022 --module commonjs --moduleResolution node --outDir "$OUT/commands" --strict --skipLibCheck
cat > "$OUT/commands/test.cjs" <<'TEST'
const assert = require('node:assert/strict');
const { parseLocalCommand } = require('./commands/localParser.js');
assert.deepEqual(parseLocalCommand('open map'), { type: 'APP_OPEN', appId: 'map' });
assert.deepEqual(parseLocalCommand('close my notes'), { type: 'APP_CLOSE', appId: 'notes' });
assert.deepEqual(parseLocalCommand('study mode'), { type: 'WORKSPACE_APPLY', workspaceId: 'study' });
assert.deepEqual(parseLocalCommand('planning mode'), { type: 'WORKSPACE_APPLY', workspaceId: 'planning' });
assert.deepEqual(parseLocalCommand('new notes'), { type: 'APP_SPAWN', appId: 'notes' });
assert.deepEqual(parseLocalCommand('reset workspace'), { type: 'WORKSPACE_RESET' });
assert.deepEqual(parseLocalCommand('hide all'), { type: 'WORKSPACE_SET_ALL', open: false });
assert.equal(parseLocalCommand('make me coffee'), null);
console.log('command-parser: PASS');
TEST
node "$OUT/commands/test.cjs"


tsc src/input/hand/types.ts src/spatial/handSelection.ts --rootDir src --target ES2022 --module commonjs --moduleResolution node --outDir "$OUT/selection" --strict --skipLibCheck
cat > "$OUT/selection/test.cjs" <<'TEST'
const assert = require('node:assert/strict');
const { choosePrimaryHand } = require('./spatial/handSelection.js');
const hand = (id, handedness, gesture, pinching=false, score=.9) => ({ id, handedness, gesture, pinching, score, pointer:{x:.5,y:.5}, pinchPoint:{x:.5,y:.5}, pinchStrength:1 });
assert.equal(choosePrimaryHand([hand('left','Left','POINT'),hand('right','Right','IDLE')], 'right').id, 'right');
assert.equal(choosePrimaryHand([hand('point','Left','POINT'),hand('pinch','Right','PINCH',true)]).id, 'pinch');
console.log('hand-selection: PASS');
TEST
node "$OUT/selection/test.cjs"
