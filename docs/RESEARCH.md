# Public reference research — Documents V1

AedriAIn remains a fresh implementation. Public projects and primary documentation are used to reuse mature architectural patterns and avoid unnecessary reimplementation.

## Hand/spatial platform references

- `google-ai-edge/mediapipe-samples-web` — worker-isolated MediaPipe Tasks architecture, model-buffer loading, pinned Hand Landmarker model patterns, browser E2E structure.
- Three.js `Raycaster` — normalized-device-coordinate camera rays/intersections.
- PMNDRS Drei `DragControls` — camera-facing drag plane and preserved grab-offset pattern.
- React Three Fiber — scene/event/runtime integration and performance concepts.
- Electron security/session/protocol documentation — sandboxing, context isolation, sender validation, custom protocols, permission request/check policies.
- Vite — ESM/custom deployment build behavior.

## Resource/storage references

- Dexie 4.4.x — IndexedDB wrapper, schema versions/transactions/reactive querying.
- `dexie-react-hooks` — `useLiveQuery` resource views.
- `fake-indexeddb` — test-only in-memory IndexedDB implementation for Node/Vitest resource tests.

## PDF research and decision

Three PDF approaches were evaluated during Documents V1:

### EmbedPDF

Current 2.14.x is feature-rich and MIT-licensed, but its current PDFium worker/CSP path introduces a blob-worker concern for AedriAIn's strict self-contained desktop policy. It remains worth re-evaluating for future annotations if that constraint changes upstream.

### `pdfjs-viewer-element`

The wrapper is MIT-licensed and exposes the mature PDF.js viewer, but current source constructs the internal viewer through `iframe.srcdoc` and injected script text. Using it under AedriAIn's CSP would pressure the app toward inline-script allowances.

### Mozilla PDF.js display layer — selected

Documents V1 therefore uses `pdfjs-dist` 6.2.108 directly.

The display layer is the supported custom-viewer API. AedriAIn supplies its own React toolbar/layout while PDF.js provides document parsing, rendering, text streams/layers, worker execution, and range-capable network loading.

The current TextLayer implementation was checked directly because PDF.js 6.x moved more text-position scaling into its CSS-variable/layout contract. AedriAIn adapts only the TextLayer layout rules needed for accurate selectable text rather than importing the stock viewer UI globally.

## Visual/behavior references

- `heeelol/jester` — behavioral reference for pinch hysteresis, one/two-hand transforms, voice structured actions, phone controller. No source vendoring without a usable license.
- `quiet-node/gesture-lab` — MIT interaction/visual experiments.
- `SAGAR-TAMANG/ultron-by-sagar-builds` — MIT HUD/orb visual inspiration.
- `collidingScopes/stark-shapes` — hand-driven particles/camera behavior inspiration.
- `Necookie-Labs/Voxel-Manipulation-via-Hand-Tracking` — simple gesture/3D manipulation reference.
- PMNDRS UIKit — candidate for later native 3D HUD elements; rich productivity surfaces stay DOM-based.

## Deliberately not adopted yet

- BlockNote — planned Notes V2 rich editor after Documents runtime validation.
- FullCalendar Standard — planned Calendar V2.
- MapLibre GL JS — planned generic Maps V2.
- Vercel AI SDK — planned provider-agnostic tool layer only after resources/actions are mature.
- postprocessing libraries — deferred until PDF + webcam performance baselines are measured.
