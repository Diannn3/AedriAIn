# Prototype 01 build report

## Implemented

- Worker-based MediaPipe Hand Landmarker scaffold (2 hands, GPU-first)
- Hand runtime separate from persistent React state
- Scale-normalized pinch metric
- Pinch hysteresis and pointer smoothing
- One-hand window dragging
- Two-hand relative scale + rotation
- Mouse drag and explicit resize fallback
- Holographic R3F scene + animated assistant orb
- Notes, Tasks, Calendar, Map placeholder, Files, AI Console modules
- Persistent workspace / notes / tasks
- Typed desktop command bus
- Local text commands and optional browser speech-recognition input
- Electron renderer sandbox + context isolation + allow-listed preload API
- User-approved file picker/open path flow
- Reference cloning script
- Research / third-party notes
- Core gesture and command parser tests

## Verified in this environment

- `scripts/test-core.sh` passes
- Electron main/preload files pass `node --check`
- Reference clone script passes `bash -n`

## Environment limitation

The execution container cannot resolve GitHub/npm hosts, so dependencies could not be installed and the full Vite/R3F application could not be launched here. Run `npm install && npm run dev` on a networked machine for the first visual/runtime test.

## First runtime checks to perform

1. Confirm MediaPipe WASM/model URLs are permitted by the browser CSP.
2. Confirm camera frame transfer works in Chromium/Opera and Electron.
3. Tune pinch thresholds on 3-5 users/camera distances.
4. Replace approximate pixel-to-world drag mapping with camera ray-plane math.
5. Profile hand inference and R3F frame time independently.
