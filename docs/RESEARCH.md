# Public reference research — Documents V1.1 / Calibration Foundation

AedriAIn remains a fresh implementation. Public repositories and primary documentation are used to reuse mature architectural patterns and avoid unnecessary reimplementation.

## Spatial/hand platform

- Google MediaPipe browser samples — worker-isolated Tasks architecture, pinned/local model patterns, browser E2E structure.
- Three.js `Raycaster` / ray-plane primitives — normalized camera picking and world-space manipulation.
- PMNDRS React Three Fiber / Drei — scene/runtime patterns and camera-plane drag behavior.
- Electron security/session/protocol documentation — sandboxing, context isolation, sender validation, permission request/check handlers, custom secure schemes.
- Media Capture and Streams — track lifecycle/error semantics used for camera-ended/device-loss handling.

## Durable resources

- Dexie 4.4.x — IndexedDB schema versions, transactions, reactive resource storage.
- `dexie-react-hooks` — reactive React resource surfaces.
- `fake-indexeddb` — Node/Vitest-only IndexedDB environment.

Documents V1.1 advances the Dexie schema to v2 and adds a compound `[documentId+pageNumber]` text-index table.

## PDF.js

AedriAIn continues to use `pdfjs-dist` directly rather than embedding a stock PDF viewer.

PDF.js provides:

- parsing
- page rendering
- text streams/layers
- worker execution
- password callbacks
- range-capable URL loading

AedriAIn owns:

- toolbar/layout
- resource lifecycle
- text index persistence
- search UX
- page/thumbnail virtualization
- spatial integration
- error/relink states

Runtime PDF worker/CMap/font/WASM/ICC assets are staged locally.

## Virtualization decision

TanStack Virtual was re-evaluated for long PDF lists. It remains a strong maintained option, but Documents V1.1 deliberately does not introduce a new runtime dependency while the pushed Documents V1 lockfile is already stale and this execution environment cannot regenerate npm resolution metadata safely.

Instead, V1.1 contains a small internal `useVirtualList` primitive with:

- overscan
- measured variable-size rows
- ResizeObserver
- binary-search visible range
- scroll-to-index
- reset after zoom/rotation

This implementation is intentionally replaceable. After a real performance baseline exists, compare it with TanStack Virtual rather than assuming either implementation is faster.

## Gesture calibration

Calibration keeps using scale-normalized thumb/index distance rather than raw pixels. The UI captures open/pinch medians and derives hysteresis values that are passed through bounded profile validation.

This preserves the existing normalized/hysteretic gesture architecture while making it device/user configurable.

## CI/action research

Before updating CI, current official GitHub Actions major generations were checked. The workflow uses current checkout/setup-node/artifact major versions and deliberately generates a correct lockfile only on a networked runner when the committed one is stale/missing.

## Future candidates — not adopted in this milestone

- BlockNote Core/React/Ariakit — planned Notes V2 after V1.1 validation; use structured block JSON and AedriAIn-native UI.
- FullCalendar Standard — planned Calendar V2; avoid Premium-only scheduler/resource features unless deliberately licensed.
- MapLibre GL JS — planned generic Maps V2, lazy-loaded.
- Vercel AI SDK — planned provider-independent structured tool layer only after capability enforcement/product services exist.
- postprocessing libraries — deferred until measured PDF + webcam performance budgets exist.
- PMNDRS XR — future input adapter after the desktop interaction contract stops changing.

## Visual/behavior references

- JESTER — behavioral reference only where repository licensing remains unclear; do not copy/vendor source.
- Gesture Lab — MIT interaction/visual reference.
- ULTRON — MIT HUD/orb inspiration.
- Stark Shapes — hand-driven particles/camera inspiration for a later visual pass.

The next phase after V1.1 should focus on Notes V2 and document-linked research workflows, not another core platform rewrite.
