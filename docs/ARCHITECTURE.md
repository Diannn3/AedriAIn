# AedriAIn architecture — Core V2.2 / Documents V1

## Product boundary

AedriAIn is a general-purpose webcam-controlled holographic spatial desktop. Files, documents, schedules, maps, tasks, notes, AI, search, and future plugins sit on one reusable input -> interaction -> window -> resource platform.

## Runtime flow

```text
Camera
  -> MediaPipe Worker
  -> Hand Identity Tracker
  -> Gesture Engine
  -> Hand Runtime
  -> Hand Interaction Controller

Three Camera + Registered Spatial Targets
  -> Raycast
  -> region-aware hover / content action / grab / transform
  -> Desktop Store
  -> Spatial Windows

Mouse
  -> camera-facing drag/resize plane math
  -> Desktop Store

Durable app resources
  -> Dexie / IndexedDB
  -> Notes / Tasks / Documents / Blobs / Settings / Gesture Profiles

Electron file picker
  -> opaque file token in main process
  -> aedriain://app/_resource/file/<token>
  -> PDF.js range-capable document source

Text / Voice
  -> Local Parser
  -> Typed Command Bus
  -> Desktop Store
```

Raw camera landmarks never mutate application state directly.

## Startup ordering and migration safety

`src/main.tsx` initializes the resource database before dynamically importing `App`.

This ordering is deliberate. Core V2.1 stored Notes/Tasks in the Zustand persistence payload. Documents V1 migrates those records into Dexie before `useDesktopStore` is imported/hydrated, preventing the new window-only store schema from racing the legacy resource migration.

After initialization:

- Dexie = durable product resources
- Zustand = windows/workspace/runtime UI state
- vanilla Zustand runtimes = high-frequency hand/interaction/performance state

## Resource database

`AedriAInDatabase` currently contains:

```text
notes
  id, title, content, createdAt, updatedAt

tasks
  id, title, description?, dueAt?, status, priority, createdAt, updatedAt

documents
  id, name, mimeType, size,
  sourceKind, sourceId,
  lastOpenedAt, currentPage, zoom, rotation

browserBlobs
  id, blob

settings
  key, value

gestureProfiles
  id, name, preferredHand,
  pinchOn, pinchOff,
  pointerSmoothing, dragSmoothing, sensitivity
```

The gesture-profile table is intentionally present before the calibration UI so the future settings pass does not require another storage redesign.

## App/window/resource separation

An app definition is not a window and a window is not the durable resource it displays.

```text
SpatialAppDefinition
  -> capabilities
  -> singleton policy
  -> default/min/max geometry
  -> lazy component loader

SpatialWindowModel
  -> appId
  -> resourceId?
  -> title
  -> width / height
  -> position / rotationZ / spatial scale
  -> open / minimized / maximized / focused
  -> zOrder

Durable resource
  -> NoteRecord / DocumentRecord / later ConversationRecord etc.
```

Current instance policy:

- Notes: multi-instance
- Documents: multi-instance
- Tasks: singleton
- Calendar: singleton
- Maps: singleton
- Files: singleton
- AI Console: singleton

Documents are intentionally hidden from the dock. A document window is created by opening a real document resource rather than launching an empty PDF shell.

## Lazy app boundary

The app registry uses dynamic imports/`React.lazy`. Heavy future modules such as PDF, rich notes, maps, calendar, and AI do not enter the initial application chunk merely because they exist in the registry.

Every spatial window wraps its app surface in its own error boundary. A failed PDF/editor/map module therefore does not take down the desktop shell.

## Window geometry vs spatial scale

`SpatialWindowModel` has two different size concepts:

```text
width / height
  -> layout area available to the app
  -> changes DOM panel dimensions and Three interaction geometry together

scale
  -> physical/holographic scale of the whole panel
  -> text/chrome/content scale together
```

The bottom-right resize handle changes layout geometry while keeping the opposite corner anchored, including rotated/scaled windows. Per-app geometry bounds prevent unusably tiny/huge layouts.

## Region-aware spatial interaction

Each visible window registers separate Three targets:

```text
chrome  (higher priority)
content (lower priority)
```

Ray selection uses physical depth first when objects are meaningfully separated. For near-coplanar panels, target priority/window z-order resolves overlap.

One-hand pinch behavior:

```text
chrome pinch
  -> begin/continue window grab

content pinch
  -> focus window
  -> conservatively activate/focus a real DOM control under the hand
  -> does NOT drag the window
```

The DOM bridge only handles normal controls such as buttons/inputs/selects/links. It does not emulate arbitrary mouse motion or synthetic text dragging.

Two-hand transforms remain window-level even when the hands originate over content:

- midpoint -> translation
- relative distance -> scale
- angle delta -> rotation

Gesture ownership is held by stable hand IDs. Releasing one hand during a transform hands control to the remaining pinching hand.

## MediaPipe runtime

`HandTrackingProvider` owns camera lifecycle and worker recovery:

- GPU-first initialization
- CPU fallback
- initialization timeout
- hidden-tab frame suppression
- one-inference-in-flight backpressure
- inference latency/FPS and dropped-frame telemetry
- stable identity tracker between raw detections and gestures

The worker loads local runtime assets staged under:

```text
public/mediapipe/wasm/
public/mediapipe/models/hand_landmarker.task
```

The model is passed to `HandLandmarker` as a byte buffer.

## Secure Electron file capability

Raw OS paths remain in Electron main.

Picker output to renderer:

```text
FileDescriptor {
  id          // opaque session token
  name
  size
  mimeType
}
```

Renderer capabilities:

```text
pickFiles()
openFile(id)
readFile(id)          // small/bounded read path
fileResourceUrl(id)  // same-origin stream URL
revokeFile(id)
```

The resource URL is:

```text
aedriain://app/_resource/file/<opaque-token>
```

The protocol handler validates the token and serves only user-approved files. It supports:

- GET
- HEAD
- OPTIONS for dev CORS
- a single HTTP byte range (206)
- 416 invalid range handling
- MIME metadata
- `nosniff`
- `no-store`
- bounded token registry

Development mode allows only the configured Vite origin and explicitly exposes Range/Content-Range headers. Production document loads are same-origin under `aedriain://app`.

Tokens are intentionally process/session scoped. A desktop document from a previous Electron process may need to be re-selected, preserving the rule that renderer persistence never stores a raw filesystem path.

## Browser document source

Browser-selected PDFs are stored as `Blob` values in IndexedDB. The document app resolves them to temporary `blob:` URLs and revokes those URLs when the source changes/unmounts.

Electron and browser sources converge on a URL-like `DocumentSource`, keeping the PDF app platform-agnostic.

## Documents V1 / PDF.js

Documents V1 uses the **PDF.js display layer directly** rather than embedding the stock Firefox viewer or an iframe-based wrapper.

Reasons:

- strict AedriAIn CSP remains intact
- local/self-hosted worker and support assets
- custom AedriAIn toolbar/layout
- no runtime CDN dependency
- clean integration with Electron range-capable resource URLs
- multi-window lazy loading

Staged PDF.js assets:

```text
public/pdfjs/pdf.worker.min.mjs
public/pdfjs/cmaps/
public/pdfjs/standard_fonts/
public/pdfjs/wasm/
public/pdfjs/iccs/
```

Current viewer layers:

```text
DocumentApp
  -> document metadata/source resolution
  -> PDF loading task
  -> toolbar/search/thumbnails/view state

PdfPageView
  -> HiDPI canvas render
  -> PDF.js TextLayer for selectable text
  -> lightweight local search highlighting

PdfThumbnail
  -> IntersectionObserver lazy thumbnail rendering
```

Search scans page text asynchronously and can be cancelled by starting/changing a query. Typing a search term no longer rerenders the PDF canvas; page rendering and text highlighting are separate effects.

## Research workspace

Research mode is resource-aware at the window layer:

- existing document -> primary Document + Notes + Tasks
- no document yet -> Files opens/focuses so the user can select one

The primary document is chosen from existing document windows by z-order, so the most recently focused document naturally becomes the Research surface.

## Performance telemetry

`PerformanceProbe` records render FPS/frame time/DPR.

`HandTrackingProvider` separately records:

- MediaPipe inference FPS
- inference latency
- dropped camera frames

Documents V1 must be manually profiled with multiple PDF windows before postprocessing/AI is added.

## Next architecture work after runtime validation

1. user-facing gesture calibration/profile selection
2. richer Notes editor on Dexie
3. Tasks/Calendar real data model/UI upgrades
4. generic MapLibre app
5. capability enforcement around AI tools
6. selective visual/postprocessing layer with performance guardrails
