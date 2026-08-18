# AedriAIn architecture — Documents V1.1 / Calibration Foundation

## Product boundary

AedriAIn is a generic webcam-controlled spatial desktop. Files, documents, notes, tasks, schedules, maps, settings, AI, and future plugins sit on one reusable input → interaction → window → resource platform. The core is not campus-specific.

## Runtime flow

```text
Camera
  → MediaPipe Worker
  → Hand Identity Tracker
  → Gesture Engine ← active GestureProfile
  → Hand Runtime
  → Hand Interaction Controller

Three Camera + Spatial Target Registry
  → raycast chrome/content regions
  → hover / content activation / grab / transform
  → Desktop Store
  → Spatial Windows

Mouse / keyboard
  → normal DOM app input + camera-plane window drag/resize

Durable resources
  → Dexie / IndexedDB
  → Notes / Tasks / Documents / PDF page index / browser Blobs / Settings / Gesture Profiles

Electron file picker
  → opaque token in main process
  → aedriain://app/_resource/file/<token>
  → range-capable PDF.js source

Text / Voice
  → Local Parser
  → Typed Command Bus
  → Desktop Store
```

Raw camera landmarks never mutate product resources directly.

## Startup ordering and migrations

`src/main.tsx` runs `initializeStorage()` before dynamically importing `App`.

This ordering prevents Zustand workspace hydration from racing resource migrations. The current durable database uses Dexie schema v2:

```text
notes
  id, title, content, createdAt, updatedAt

tasks
  id, title, description?, status, priority, dueAt?, createdAt, updatedAt

documents
  id, name, mimeType, size,
  sourceKind, sourceId, sourceFingerprint,
  lastOpenedAt, currentPage, zoom, rotation, viewMode

documentPages
  [documentId + pageNumber], text, normalizedText, indexedAt

browserBlobs
  id, blob

settings
  key, value

gestureProfiles
  id, name, preferredHand,
  pinchOn, pinchOff,
  pointerSmoothing, dragSmoothing, sensitivity, updatedAt
```

Dexie v2 upgrades Documents V1 records by adding a source fingerprint and `single` view mode when absent.

Legacy Core V2.1 Notes/Tasks still migrate from the old Zustand payload exactly once.

## State ownership

### Dexie

Owns durable product data:

- note/task/document records
- browser PDF copies
- cached PDF page text
- gesture profiles
- UI preferences

### Zustand desktop store

Owns spatial/runtime workspace state:

- windows
- focus
- z-order
- geometry
- open/minimized/maximized state
- workspace layouts

### vanilla high-frequency stores

Own transient state that should not cause React/resource persistence churn:

- hand runtime
- interaction runtime
- camera runtime
- performance runtime
- active gesture profile mirror

## App / window / resource separation

```text
SpatialAppDefinition
  → id / title / icon
  → singleton policy
  → capabilities
  → default/min/max window geometry
  → lazy component loader

SpatialWindowModel
  → appId
  → resourceId?
  → title
  → width / height
  → position / rotationZ / spatial scale
  → open / minimized / maximized / focused / zOrder

Durable Resource
  → NoteRecord / DocumentRecord / later EventRecord / ConversationRecord
```

Current instance policy:

- Notes: multi-instance
- Documents: multi-instance, resource-created, hidden from dock
- Tasks: singleton
- Calendar: singleton
- Maps: singleton
- Files: singleton
- Settings: singleton
- AI Console: singleton placeholder

## Window interaction regions

Each spatial window registers separate Three.js interaction targets:

```text
chrome
  → one-hand pinch may start a window grab

content
  → one-hand pinch never starts a window drag
  → conservative DOM-control activation can occur

both regions
  → two-hand transform may manipulate the owning window
```

This separation is required for rich app surfaces such as PDF, maps, calendar, and future editors.

## Layout resize vs spatial scale

`width` and `height` change how much app UI fits inside a panel.

`scale` changes the physical/spatial size of the entire hologram.

The resize handle preserves the opposite corner in world space, including rotated/scaled windows. App definitions own default/min/max geometry.

## Hand identity and gesture profiles

MediaPipe detection array order is not identity. `HandIdentityTracker` uses temporal matching and motion prediction to keep stable IDs.

The active `GestureProfile` configures the running `GestureEngine`:

- pinch hysteresis thresholds
- pointer smoothing
- drag/pinch smoothing
- pointer sensitivity
- preferred hand policy

Settings changes propagate live. Existing captured gesture ownership wins over a preference change so an active drag/transform does not jump hands.

Calibration samples normalized thumb/index distance for an open hand and a comfortable pinch, derives hysteresis thresholds, then sends them through bounded profile validation before persistence.

## Camera/tracker lifecycle

`HandTrackingProvider` explicitly represents:

```text
idle
requesting-camera
initializing
ready
tracking
recovering
permission-denied
device-unavailable
device-lost
error
```

GPU initialization falls back to CPU. If the final fallback fails or times out, the worker/stream are torn down and stale hands are cleared. A media-track `ended` event produces `device-lost` and the user can explicitly re-enable tracking.

## Secure desktop file resources

Renderer code never receives raw filesystem paths.

Picker flow:

```text
user picker
  → Electron main resolves path
  → random opaque token
  → renderer gets { id, name, size, mimeType, modifiedAt }
```

PDF access:

```text
aedriain://app/_resource/file/<token>
```

The custom protocol supports:

- GET
- HEAD
- single byte ranges / 206
- 416 for invalid ranges
- restricted dev CORS/preflight for the exact Vite origin
- `Accept-Ranges`, `Content-Range`, `nosniff`, and `no-store`

Tokens are intentionally session-scoped. Durable Electron DocumentRecords can therefore enter a `needs-relink` state after a process restart.

## Document source lifecycle

`DocumentRecord` stores a fingerprint containing name, size, MIME type, and modified time when available.

Relink reuses the same document ID/window/resource. If the fingerprint changes, cached page text is invalidated. A matching fingerprint keeps the existing text index.

Removing a document:

- closes all windows attached to the resource
- deletes cached page text
- deletes DocumentRecord metadata
- deletes an unreferenced browser Blob
- revokes the Electron token when possible
- never deletes the original OS file

Startup garbage collection removes orphan browser Blobs.

## PDF.js reader

Documents lazy-load `pdfjs-dist` and use its display layer directly. Runtime worker/CMap/font/WASM/ICC assets are staged locally.

### Text index

Opening a PDF starts a bounded-concurrency background index:

```text
PDF page
  → getTextContent()
  → normalized page text
  → Dexie documentPages
```

Search reuses this cache rather than extracting the entire PDF on every query. Query normalization includes a whitespace-insensitive fallback for PDF span splits.

### Virtualized reading

The reader supports:

- single-page mode
- continuous mode

The internal `useVirtualList` primitive owns measured variable-height virtualization for:

- continuous pages
- thumbnail rail

It uses overscan, ResizeObserver measurements, programmatic index scrolling, measurement invalidation after zoom/rotation, and binary-search visible-range lookup. Total PDF page count therefore does not equal mounted React/page tree count.

## Settings / accessibility foundation

Settings currently persists:

- active gesture profile
- UI scale
- reduced motion

`App` applies UI scale through `--ui-scale` and a reduced-motion class globally. This is an accessibility foundation, not the final accessibility pass.

## Lazy apps and fault containment

The registry uses `React.lazy`/dynamic imports. PDF/Settings/other apps are not loaded merely because their manifest exists.

Every spatial app is wrapped in an app-level error boundary so a failed document/editor/map module does not crash the desktop shell.

## Validation architecture

Two validation layers exist:

### Dependency-light

- bootstrap GestureEngine/parser/hand-selection tests
- pure Electron file-range/MIME tests
- Node syntax checks
- TS/TSX parser/import audits

### Dependency-aware networked CI

The first CI job verifies the committed lockfile. If it is missing/stale, npm legitimately regenerates it on the networked runner and uploads one exact `aedriain-lockfile` artifact. Every downstream job downloads that same file and uses `npm ci`.

See `docs/LOCKFILE_RECOVERY.md`, `docs/VALIDATION.md`, and `docs/PERFORMANCE_BASELINE.md`.

## Next architecture boundary

After V1.1 passes networked validation and performance measurement, Notes V2 should consume the existing resource/service/window contracts. It should not move durable data back into the desktop store or special-case the spatial interaction engine.
