# AedriAIn — Webcam Holographic Desktop

AedriAIn is a general-purpose webcam-controlled spatial desktop inspired by fictional holographic interfaces, but built around useful everyday work: files, documents, schedules, maps, tasks, notes, and AI.

The current implementation milestone is **Documents V1 on Core V2.2**. It keeps the Core V2.1 hand/window/security foundation and adds a real resource database, app/window geometry contracts, secure file streaming, and a custom spatial PDF workflow.

## Current highlights

### Spatial input and windows

- MediaPipe Hand Landmarker in a Web Worker with GPU -> CPU fallback
- local MediaPipe WASM + pinned Hand Landmarker model staging
- stable temporal hand IDs with motion prediction
- configurable pinch hysteresis/pointer smoothing
- Three.js raycasting against explicit spatial targets
- separate window `chrome` and app `content` interaction regions
- one-hand header pinch -> world-space window grab
- content pinch -> focus/activate normal app controls without dragging the window
- two-hand translation + scale + rotation with stable gesture ownership
- two-hand -> one-hand continuation when one hand releases
- visible world-space pointer beam
- mouse dragging on the same camera-facing world-plane math
- true layout resize (`width`/`height`) separate from hologram scale
- per-app default/min/max window geometry
- minimize/maximize/focus/z-order invariants
- lazy-loaded apps with per-window error isolation

### Durable resources

- Dexie/IndexedDB owns durable Notes, Tasks, Documents, browser PDF Blobs, settings, and gesture-profile records
- Zustand persists only workspace/window state
- legacy Core V2.1 Notes/Tasks migrate into Dexie **before the Zustand store is imported**
- Notes are true multi-resource/multi-window records
- Tasks are durable resources rather than demo state
- browser-selected PDFs are retained as IndexedDB Blobs

### Files and Documents V1

- Electron never exposes filesystem paths to renderer code
- user-approved files receive opaque session tokens
- `aedriain://app/_resource/file/<token>` streams approved desktop files
- GET / HEAD / single-range responses for PDF.js partial loading
- dev-mode CORS exposes Range/Content-Range safely for the custom resource origin
- bounded direct-read IPC remains only for smaller future text/JSON workflows
- Files opens PDFs **inside AedriAIn** while unsupported formats still use the system viewer
- multiple PDF files can spawn independent spatial document windows
- recent document resources persist
- custom AedriAIn PDF.js viewer with:
  - page navigation
  - zoom
  - fit width / fit page
  - rotation
  - selectable text layer
  - lazy thumbnails
  - document-wide text search
  - persisted page/zoom/rotation
  - external-open fallback
- `research mode` arranges Document + Notes + Tasks; before a PDF exists, it opens Files instead

### Validation/tooling

- dependency-light bootstrap tests
- Vitest unit contracts for hand/command/storage/workspace behavior
- fake IndexedDB test runtime for Dexie tests
- Playwright browser E2E for notes, files, two-PDF persistence, PDF search, Research workspace, and layout resize
- production Electron smoke harness
- GitHub Actions validation matrix
- render FPS/DPR and MediaPipe inference FPS/latency telemetry

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

`npm run setup` stages runtime assets from the pinned packages:

- MediaPipe Tasks WASM from `@mediapipe/tasks-vision`
- the pinned official Hand Landmarker model
- PDF.js worker/CMaps/standard fonts/WASM/ICC assets from `pdfjs-dist`

The application then serves those runtime assets from its own origin rather than relying on runtime CDNs.

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

Production builds intentionally fail when required MediaPipe/PDF.js assets are missing.

## Controls

- point -> spatial hover/pointer
- pinch window header -> grab/move window
- pinch an app control -> focus/activate that control
- two simultaneous pinches on one window -> move + scale + rotate
- release one hand mid-transform -> continue as one-hand grab
- fist over focused target -> reset rotation
- bottom-right resize handle -> change app layout area without changing spatial scale
- mouse/keyboard remain first-class fallbacks

## Commands

Examples:

```text
open files
open calendar
new notes
study mode
planning mode
research mode
minimal mode
hide all
reset workspace
```

## Validation

```bash
npm run test:bootstrap
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm run test:electron
```

See `docs/VALIDATION.md` for what has been verified in the current restricted build environment and what still requires the first networked dependency install/CI run.

## Current limitations

- The first networked `npm install` still needs to generate and commit `package-lock.json`.
- This environment cannot currently perform the real dependency-aware Vite/Vitest/Playwright/Electron runtime matrix because shell DNS/registry access is unavailable.
- Electron file tokens are intentionally session-scoped. After a full Electron process restart, a recent desktop PDF may ask the user to re-select the file; the renderer still never stores its raw OS path.
- PDF annotations/editing and continuous multi-page virtualization are later document milestones; Documents V1 focuses on reliable reading/search/navigation.

## Product boundary

AedriAIn core is not tied to UPLB or another campus. Campus-specific features can later be plugins without changing the spatial input/window/resource architecture.

## Next milestone after Documents V1 runtime validation

1. gesture calibration profiles and settings UI
2. Notes V2 rich editor on the resource database
3. Tasks/Calendar upgrades
4. generic Maps V2
5. permission-checked AI tools using the same resource/command boundaries
6. Tony-Stark visual/postprocessing pass only after performance baselines remain healthy

See `docs/ARCHITECTURE.md`, `docs/RESEARCH.md`, `docs/THIRD_PARTY_NOTES.md`, and `docs/VALIDATION.md` for implementation details.
