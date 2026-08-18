# AedriAIn — Webcam Holographic Desktop

AedriAIn is a general-purpose webcam-controlled spatial desktop inspired by fictional holographic interfaces, but designed around useful everyday modules: files, schedules, maps, tasks, notes, and AI.

Core V2.1 focuses on the platform contract: stable hand identities, camera-ray spatial interaction, resource-backed windows, secure Electron capabilities, offline-ready MediaPipe assets, and automated validation.

## Core V2.1 highlights

- MediaPipe Hand Landmarker runs in a Web Worker with GPU -> CPU fallback
- local/offline MediaPipe WASM + pinned Hand Landmarker model staging
- stable temporal hand IDs across detector reorderings and short tracking gaps
- configurable pinch thresholds and pointer smoothing
- Three.js raycasting for spatial target selection
- camera-facing ray/plane dragging for both hand and mouse input
- stable hand ownership for one-hand grabs and two-hand transforms
- visible world-space pointer beam with hover/grab/transform feedback
- two-hand translation + scale + rotation, with graceful fallback to one-hand grab
- explicit window geometry, transform bounds, minimize/maximize/focus invariants
- multi-instance Notes with `resourceId`-backed note records
- singleton enforcement for Tasks, Calendar, Maps, Files, and AI Console
- typed app capabilities and typed command bus
- versioned persisted workspace migration
- Electron custom `aedriain://app` production protocol
- sandboxed renderer, validated IPC senders, origin-scoped camera permission handling
- opaque file IDs instead of exposing filesystem paths to the renderer
- read-by-token file capability for the upcoming PDF/document viewer
- separate render FPS/DPR and MediaPipe inference FPS/latency telemetry
- Vitest unit-test suite, Playwright browser E2E, production Electron smoke harness, GitHub Actions CI

## Requirements

- Node.js 22.12+
- npm 10+
- a webcam for hand tracking

## Setup

```bash
npm install
npm run setup
npm run dev
```

`npm run setup` stages the exact MediaPipe WASM runtime from the installed `@mediapipe/tasks-vision` package and downloads the pinned official `float16/1` Hand Landmarker model into `public/mediapipe/`. The app then loads those assets from its own origin.

Click **Enable hands** and allow video-camera access.

### Electron development

```bash
npm run desktop:dev
```

### Production Electron

```bash
npm run setup
npm run build
npm run desktop
```

Production builds intentionally fail if the local MediaPipe model/WASM are missing, preventing an apparently successful package that silently depends on CDN assets.

## Controls

- point: spatial pointer / hover
- thumb + index pinch: grab/select
- pinch + move: move a spatial window
- two simultaneous pinches: move + scale + rotate
- release one hand during a transform: continue as a one-hand grab
- fist over a focused target: reset rotation
- mouse/keyboard remain first-class fallbacks

## Commands

Examples:

```text
open files
open calendar
new notes
study mode
planning mode
minimal mode
hide all
reset workspace
```

## Validation

```bash
npm run test:bootstrap   # dependency-light regression harness
npm run typecheck
npm run test             # Vitest
npm run test:e2e         # Playwright browser tests
npm run build
npm run test:electron    # requires a production build + display/Xvfb on Linux
```

See `docs/VALIDATION.md` for the exact validation matrix and environment limitations.

## Current product boundary

AedriAIn core is not tied to UPLB or any other campus. Generic apps sit on a reusable input -> interaction -> window -> app platform. Campus-specific tools can later be plugins without changing the spatial desktop architecture.

## Next product milestone

After Core V2.1 passes the full networked CI/runtime matrix, the next branch should build the **Files + Spatial PDF Workspace**: secure document bytes/tokens, multiple document windows, PDF rendering/search/zoom, and contextual document selection for the later AI tool layer.

See `docs/ARCHITECTURE.md`, `docs/RESEARCH.md`, and `docs/THIRD_PARTY_NOTES.md` before adapting third-party code or assets.
