import assert from 'node:assert/strict';
import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const out = await mkdtemp(path.join(os.tmpdir(), 'aedriain-core-tests-'));
const resolveBin = async (name) => {
  const local = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? `${name}.cmd` : name);
  try { await access(local); return local; } catch { return process.platform === 'win32' ? `${name}.cmd` : name; }
};

const run = (command, args, cwd = root) => {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32' && command.endsWith('.cmd'),
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};

const tsc = await resolveBin('tsc');

try {
  const gestureOut = path.join(out, 'gesture');
  run(tsc, [
    'src/input/hand/types.ts', 'src/input/hand/gestures.ts', 'src/input/hand/HandIdentityTracker.ts',
    '--target', 'ES2022', '--module', 'commonjs', '--moduleResolution', 'node', '--outDir', gestureOut, '--strict', '--skipLibCheck',
  ]);
  await writeFile(path.join(gestureOut, 'test.cjs'), `
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
`);
  run(process.execPath, [path.join(gestureOut, 'test.cjs')]);

  const commandOut = path.join(out, 'commands');
  run(tsc, [
    'src/core/types.ts', 'src/commands/types.ts', 'src/commands/localParser.ts',
    '--target', 'ES2022', '--module', 'commonjs', '--moduleResolution', 'node', '--outDir', commandOut, '--strict', '--skipLibCheck',
  ]);
  await writeFile(path.join(commandOut, 'test.cjs'), `
const assert = require('node:assert/strict');
const { parseLocalCommand } = require('./commands/localParser.js');
assert.deepEqual(parseLocalCommand('open map'), { type: 'APP_OPEN', appId: 'map' });
assert.deepEqual(parseLocalCommand('close my notes'), { type: 'APP_CLOSE', appId: 'notes' });
assert.deepEqual(parseLocalCommand('study mode'), { type: 'WORKSPACE_APPLY', workspaceId: 'study' });
assert.deepEqual(parseLocalCommand('planning mode'), { type: 'WORKSPACE_APPLY', workspaceId: 'planning' });
assert.deepEqual(parseLocalCommand('research mode'), { type: 'WORKSPACE_APPLY', workspaceId: 'research' });
assert.deepEqual(parseLocalCommand('new notes'), { type: 'APP_SPAWN', appId: 'notes' });
assert.deepEqual(parseLocalCommand('reset workspace'), { type: 'WORKSPACE_RESET' });
assert.deepEqual(parseLocalCommand('hide all'), { type: 'WORKSPACE_SET_ALL', open: false });
assert.equal(parseLocalCommand('make me coffee'), null);
console.log('command-parser: PASS');
`);
  run(process.execPath, [path.join(commandOut, 'test.cjs')]);

  const selectionOut = path.join(out, 'selection');
  run(tsc, [
    'src/input/hand/types.ts', 'src/spatial/handSelection.ts', '--rootDir', 'src',
    '--target', 'ES2022', '--module', 'commonjs', '--moduleResolution', 'node', '--outDir', selectionOut, '--strict', '--skipLibCheck',
  ]);
  await writeFile(path.join(selectionOut, 'test.cjs'), `
const assert = require('node:assert/strict');
const { choosePrimaryHand } = require('./spatial/handSelection.js');
const hand = (id, handedness, gesture, pinching=false, score=.9) => ({ id, handedness, gesture, pinching, score, pointer:{x:.5,y:.5}, pinchPoint:{x:.5,y:.5}, pinchStrength:1 });
assert.equal(choosePrimaryHand([hand('left','Left','POINT'),hand('right','Right','IDLE')], 'right').id, 'right');
assert.equal(choosePrimaryHand([hand('point','Left','POINT'),hand('pinch','Right','PINCH',true)]).id, 'pinch');
console.log('hand-selection: PASS');
`);
  run(process.execPath, [path.join(selectionOut, 'test.cjs')]);

  const virtualOut = path.join(out, 'virtual');
  run(tsc, [
    'src/ui/virtualMath.ts', '--target', 'ES2022', '--module', 'commonjs', '--moduleResolution', 'node', '--outDir', virtualOut, '--strict', '--skipLibCheck',
  ]);
  await writeFile(path.join(virtualOut, 'test.cjs'), `
const assert = require('node:assert/strict');
const { getVisibleRange } = require('./virtualMath.js');
const count = 1000;
const size = 100;
const starts = Array.from({ length: count }, (_, index) => index * size);
const sizes = Array.from({ length: count }, () => size);
assert.deepEqual(getVisibleRange(starts, sizes, 0, 0, 500, 2), { start: 0, end: -1 });
const nearStart = getVisibleRange(starts, sizes, count, 0, 500, 2);
assert.equal(nearStart.start, 0);
assert.ok(nearStart.end < 10);
const nearEnd = getVisibleRange(starts, sizes, count, 98500, 500, 2);
assert.ok(nearEnd.start > 980);
assert.equal(nearEnd.end, 993);
assert.ok(nearEnd.end - nearEnd.start < 15);
console.log('virtual-range: PASS');
`);
  run(process.execPath, [path.join(virtualOut, 'test.cjs')]);

  assert.ok(true);
} finally {
  await rm(out, { recursive: true, force: true });
}
