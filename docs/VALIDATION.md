# Core V2.1 validation matrix

## Verified in the current build environment

The current execution environment has Node 22 and global TypeScript but cannot resolve npm/GitHub hosts from the shell.

Verified here:

- dependency-light gesture regression harness passes
- stable hand identity reorder regression passes through bootstrap harness
- local command parser regression passes
- active-hand selection bootstrap regression passes
- all TS/TSX files parse through the TypeScript compiler API
- Electron main/preload syntax passes `node --check`
- asset/vendor scripts parse with Node
- `git diff --check` passes

## Network-blocked here

These require a networked runner because `node_modules` are not available and npm has no usable offline cache:

- `npm install` / lockfile generation
- full `npm run typecheck` with real dependency declarations
- Vitest execution
- Vite production build
- Playwright browser runtime
- Electron package/runtime launch
- downloading/staging the Hand Landmarker binary

An attempted offline `npm install --package-lock-only --offline` fails because `@mediapipe/tasks-vision` is not cached. Do not fabricate a lockfile; the first networked install should generate and commit it.

## CI matrix

`.github/workflows/ci.yml` performs:

1. dependency install (`npm ci` once a lockfile exists; `npm install` before then)
2. bootstrap core regression
3. local MediaPipe asset staging
4. TypeScript typecheck
5. Vitest unit tests
6. production build
7. Electron syntax checks
8. Playwright browser E2E
9. production Electron smoke under Xvfb

## Manual interaction matrix after CI is green

Test at minimum:

- Chromium browser + Electron development + Electron production
- GPU hand tracker path
- forced/automatic CPU fallback
- one-hand grab at 1280x720, 1920x1080, and a resized Electron window
- two-hand translate/scale/rotate with detector order swapping
- release one hand mid-transform and confirm continuous one-hand control
- temporary hand loss and reacquisition
- mouse drag using the same spatial plane math
- maximize/minimize/focus fallback
- spawn two independent Notes resources
- workspace layouts with extra Notes windows
- persistence migration from old `aedriain-desktop` state
- file picker returns no raw path to renderer
- production `aedriain://app` loads scripts/workers/MediaPipe assets

## Performance baseline to record

Before adding PDF/postprocessing/AI, record:

- R3F render FPS/frame time
- MediaPipe inference latency
- dropped camera frames per minute
- memory after 15 minutes
- 1 vs 3 vs 6 visible windows
- GPU vs CPU tracking

Those numbers become the regression baseline for later features.
