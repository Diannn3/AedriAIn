# AedriAIn — Webcam Holographic Desktop

AedriAIn is a general-purpose webcam-controlled spatial desktop inspired by fictional holographic interfaces, but built around useful everyday work: files, documents, schedules, maps, tasks, notes, settings, and eventually AI.

The current milestone is **Documents V1.1 + Calibration Foundation**. It keeps the Core V2.2 spatial/window/security contract and hardens the first real productivity workflow: durable PDFs, relinking/removal, cached search, virtualized long-document reading, gesture profiles, and explicit camera/tracker recovery states.

## Current capabilities

### Spatial input and windows

- MediaPipe Hand Landmarker runs in a Web Worker with GPU → CPU fallback.
- Hand identities remain stable across detector reordering and short gaps.
- Three.js camera rays target explicit spatial surfaces rather than DOM rectangles.
- Window `chrome` and app `content` are separate interaction regions.
- Header pinch moves a window; content pinch can activate normal app controls without starting a one-hand window drag.
- Two-hand pinch translates, spatially scales, and rotates a window while preserving captured hand ownership.
- Releasing one hand during a transform falls back to a continuous one-hand grab.
- Window layout resize is distinct from hologram/spatial scale.
- Apps are lazy-loaded and isolated by per-window error boundaries.
- Mouse and keyboard remain first-class fallbacks.

### Durable resources

Dexie/IndexedDB owns durable product data:

- Notes
- Tasks
- Documents
- browser PDF Blobs
- cached PDF page text
- settings
- gesture profiles

Zustand owns only spatial workspace/window state. The legacy Core V2.1 Notes/Tasks payload migrates into Dexie before the window store is imported.

### Files and Documents V1.1

- Desktop filesystem paths stay in Electron main.
- User-approved files receive opaque session tokens.
- `aedriain://app/_resource/file/<token>` serves approved desktop files with GET/HEAD and single-range responses for PDF.js.
- Browser PDFs are stored as IndexedDB Blobs.
- PDFs open inside AedriAIn as independent resource-backed spatial windows.
- Recent documents can be reopened, relinked into the same resource, or removed from AedriAIn without deleting the original OS file.
- Browser Blob garbage collection removes unreferenced copies.
- A source fingerprint warns before relinking an obviously different PDF.
- Cached per-page text indexing runs with bounded concurrency and is reused by later searches.
- Search supports normalized whitespace and a whitespace-insensitive fallback for awkward PDF text-span splits.
- Reader modes:
  - single page
  - continuous virtualized scroll
- Thumbnail and continuous-page lists mount only nearby rows with measured-size overscan.
- PDF reader includes page navigation, zoom, fit width/page, rotation, selectable text, search results, lazy/virtualized thumbnails, persisted page/zoom/rotation/mode, password prompts, explicit corrupt/missing-source states, and external-open fallback.
- `research mode` arranges Document + Notes + Tasks, or opens Files when no document exists yet.

### Settings and gesture calibration

The Settings app now provides:

- active gesture-profile selection
- new custom profiles
- automatic / left / right preferred hand
- separate pointer and drag smoothing
- pointer sensitivity
- two-sample pinch calibration with bounded thresholds
- UI text scaling
- reduced-motion preference
- tracker phase/delegate/inference status

The active profile updates the running GestureEngine without restarting the camera. Preferred-hand policy also participates in two-hand transform ownership unless an existing gesture capture already owns control.

### Camera/tracker recovery

The runtime distinguishes:

- requesting camera
- initializing
- ready
- tracking
- recovering / CPU fallback
- permission denied
- device unavailable
- device lost
- tracker error

If the camera track ends or the final tracker fallback fails, stale hands are cleared and the failed stream/worker are torn down so the user can explicitly re-enable tracking.

## Requirements

- Node.js 22.12+
- npm 10+
- webcam for hand tracking

## Setup

### First setup, branch changes, or dependency repairs

Use the project bootstrap instead of starting Vite against an old `node_modules` tree:

```bash
npm run bootstrap
```

`bootstrap` is dependency-free project tooling. It:

1. verifies whether the current `package-lock.json` matches `package.json`
2. uses `npm ci` when the lock is valid, otherwise `npm install` to resolve the manifest and create/update the lock
3. clears Vite's `node_modules/.vite` dependency cache
4. stages MediaPipe and PDF.js runtime assets
5. verifies the installed direct dependency versions and runtime assets

After that:

```bash
npm run dev
# or
npm run desktop:dev
```

Both development commands run `npm run verify:install` before Vite starts. A stale install therefore fails in the terminal with an actionable repair command instead of reaching a Vite `Failed to resolve import` overlay.

You can run the dependency doctor directly at any time:

```bash
npm run doctor
```

If the committed lockfile is stale or absent, see `docs/LOCKFILE_RECOVERY.md`. After the first successful networked bootstrap, verify and commit the generated `package-lock.json` so future clean checkouts can use `npm ci`.

`npm run setup` stages local runtime assets from pinned packages:

- MediaPipe Tasks WASM
- pinned Hand Landmarker model
- PDF.js worker, CMaps, standard fonts, WASM, and ICC assets

Production runtime does not rely on a PDF or MediaPipe CDN.

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

## Controls

- point → spatial hover/pointer
- pinch window header → move window
- pinch app control → activate/focus app control
- two pinches on one window → move + spatial scale + rotate
- release one hand mid-transform → continue one-hand grab
- fist over focused target → reset rotation
- bottom-right resize handle → change app layout area without changing hologram scale
- mouse/keyboard → full fallback/precision path

## Commands

```text
open files
open calendar
open settings
new notes
study mode
planning mode
research mode
minimal mode
hide all
reset workspace
```

## Validation

Install/bootstrap diagnostics:

```bash
npm run doctor
npm run verify:lockfile
npm run test:bootstrap
```

`npm run test:bootstrap` is cross-platform Node tooling; it no longer requires Bash on Windows.

Full networked validation:

```bash
npm ci
npm run setup
npm run typecheck
npm run test
npm run build
npm run test:e2e
npm run test:electron
```

See:

- `docs/VALIDATION.md`
- `docs/PERFORMANCE_BASELINE.md`
- `docs/LOCKFILE_RECOVERY.md`
- `docs/INSTALL_TROUBLESHOOTING.md`

## Current limitations

- This execution environment still cannot reach npm/GitHub from the shell, so the current V1.1 source cannot truthfully claim a locally regenerated dependency lock or dependency-aware runtime build here.
- Electron file authorization is intentionally session-scoped. After a full Electron process restart, a desktop PDF can require relinking; the durable DocumentRecord survives.
- The continuous reader virtualizes mounted React/page trees, but page-height estimation is still refined as rows are measured; very large heterogeneous PDFs require the first networked/manual benchmark pass.
- PDF annotation/editing is not part of Documents V1.1.
- Rich Notes, real Calendar/Maps, capability enforcement, AI tools, advanced visual effects, phone input, and WebXR remain later milestones.

## Next milestone

After V1.1 passes the networked CI/runtime/performance gate, the next product branch is **Notes V2 + Document-linked Research Workspace**. That branch should reuse the existing resource/window/document-index contracts rather than change the platform foundation again.

AedriAIn core remains generic; campus-specific functionality can be layered later as plugins or domain modules.
