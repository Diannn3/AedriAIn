# AedriAIn architecture — Core V2.1

## Product boundary

AedriAIn is a general-purpose webcam-controlled holographic spatial desktop. Files, schedules, maps, tasks, notes, AI, search, and future plugins sit on the same interaction/window platform.

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
  -> Hover / Grab / Transform
  -> Desktop Store
  -> Spatial Windows

Mouse
  -> same camera-facing drag-plane math
  -> Desktop Store

Text / Voice
  -> Local Parser
  -> Typed Command Bus
  -> Desktop Store
```

Raw landmarks never mutate application state directly.

## MediaPipe runtime

`HandTrackingProvider` owns camera lifecycle and worker recovery. It boots GPU first, falls back to CPU, tracks inference latency/dropped frames, and pauses frame submission while the page is hidden.

The worker loads:

```text
mediapipe/wasm/
mediapipe/models/hand_landmarker.task
```

from the current app origin. `scripts/vendor-mediapipe.mjs` stages those assets. The worker loads the model as a byte buffer before creating `HandLandmarker`, following the architecture used by Google's current browser samples.

## Stable hand identity

MediaPipe detection-array order is not treated as identity. `HandIdentityTracker` matches detections globally against prior tracks using:

- palm/MCP center
- short-term velocity prediction
- handedness penalty
- missed-frame retention

Gesture ownership therefore survives detector reorderings and short gaps.

## Gesture engine

The gesture layer currently exposes POINT, PINCH, FIST, OPEN, and IDLE. Pinch uses separate on/off thresholds (hysteresis) and the pointer uses configurable smoothing.

The constants live behind `GestureConfig`; a later calibration UI can change the profile without replacing the engine.

## Spatial interaction

Each visible window owns an invisible Three.js plane whose dimensions come from `SpatialWindowModel.width/height`.

Hand coordinates become normalized device coordinates, then `THREE.Raycaster` resolves the frontmost registered target. Z-order breaks ties for nearly coplanar DOM-backed panels.

A grab creates a camera-facing plane and preserves the original grab offset. Two pinches use:

- midpoint -> translation
- relative distance -> scale
- angle delta -> rotation

The active hand IDs are preserved for the lifetime of the gesture. If one hand disappears/releases during a transform, the remaining pinching hand inherits a one-hand grab rather than forcing a re-pinch.

`interactionRuntime.pointerWorld` is always populated from the target hit or a fallback camera-facing plane, which drives `SpatialPointerBeam`.

## Window model

A window is not the same thing as an app resource.

```ts
WindowInstance {
  id
  appId
  resourceId?
  title
  width
  height
  position
  rotationZ
  scale
  open / minimized / maximized / focused
  zOrder
}
```

Notes already demonstrate this boundary: separate note records can be attached to separate windows using `resourceId`.

Current singleton policy:

- Notes: multi-instance
- Tasks: singleton
- Calendar: singleton
- Maps: singleton
- Files: singleton
- AI Console: singleton

The store enforces the policy even when commands ask to spawn a new singleton app.

## Durable vs transient state

Transient high-frequency state:

- `handRuntime`
- `interactionRuntime`

Persistent UI/product state:

- `useDesktopStore`

The persistent schema is versioned and migrates older Prototype/Core V2 state. Core V2.1 introduces note records and window resource IDs. A later storage branch should move durable app data to IndexedDB/Dexie while leaving transient/window runtime state in Zustand.

## Files security boundary

Electron keeps the real path in the main process. When the user chooses a file, the renderer receives an opaque descriptor:

```text
{id, name, size}
```

The renderer can request `openFile(id)` or `readFile(id)`, but cannot supply arbitrary paths. The main process resolves the ID only if it was created by a user-approved picker action. `readFile` is size-bounded and returns bytes plus safe metadata for the upcoming document viewer.

This is the boundary the future PDF/AI tools should extend rather than exposing the filesystem.

## Electron security

Production is served through `aedriain://app`, not `file://`.

- `nodeIntegration: false`
- `contextIsolation: true`
- `sandbox: true`
- popups denied
- navigation allow-listed by parsed origin
- IPC sender validation
- permission request + permission check handlers
- camera permission restricted to trusted main-frame/video requests
- restrictive CSP

## Performance telemetry

`PerformanceProbe` records R3F render FPS/frame time/DPR in a transient store. `HandTrackingProvider` separately tracks MediaPipe inference FPS, inference latency, and dropped camera frames. This keeps rendering and CV performance diagnosable before PDF/postprocessing/AI increase load.

## Testing contract

- bootstrap shell test for gesture/identity/parser logic
- Vitest for deterministic unit tests
- Playwright browser E2E for workspace behavior/persistence
- Playwright Electron smoke harness for the packaged custom-protocol path
- GitHub Actions runs build/test/browser/electron jobs

## Next architecture milestone

Files + Spatial PDF Workspace should add secure document-read capabilities and document resources without breaking the renderer/main-process boundary. AI comes after documents/notes/tasks/calendar have stable resource identities and tool contracts.
