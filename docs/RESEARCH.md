# Public reference research — Core V2.1

AedriAIn remains a fresh implementation. Public projects and official docs are used to avoid reinventing established interaction/runtime patterns.

## Primary technical references

- `google-ai-edge/mediapipe-samples-web` — current 2026 worker-based MediaPipe Tasks architecture, Hand Landmarker model-buffer loading, pinned `float16/1` model, Playwright E2E examples.
- Three.js `Raycaster` documentation — normalized-device-coordinate camera rays and nearest-intersection behavior.
- `pmndrs/drei` `DragControls` — validates camera-ray + camera-facing-plane + preserved-grab-offset dragging.
- Electron security/session/protocol documentation — sandboxing, context isolation, sender validation, custom protocol preference, complete permission request/check handling.
- Vite documentation — relative `base: './'` for embedded/custom-protocol deployment.
- Vitest documentation — Vite-native unit testing.
- Playwright documentation — CI/browser test recommendations and GitHub Actions patterns.

## Visual/behavior references

- `heeelol/jester` — pinch hysteresis, one/two-hand manipulation, voice-to-structured-action, phone-controller idea. Treat as behavioral reference only unless a usable license is confirmed.
- `quiet-node/gesture-lab` — MIT; MediaPipe/Three interaction and visual experiments.
- `SAGAR-TAMANG/ultron-by-sagar-builds` — MIT; assistant orb/HUD visual reference.
- `collidingScopes/stark-shapes` — hand-driven camera/particle behavior reference.
- `Necookie-Labs/Voxel-Manipulation-via-Hand-Tracking` — gesture/3D manipulation reference.
- `pmndrs/uikit` — potential later native 3D HUD layer; rich productivity surfaces remain DOM-based for now.

## Core V2.1 patterns adopted conceptually

- worker-isolated hand inference
- model buffer loading
- scale-normalized pinch + hysteresis
- temporal hand identity instead of detector-array identity
- camera-derived raycasting
- camera-facing drag planes
- preserved grab offsets
- relative two-hand distance/angle transforms
- typed command/capability boundaries
- opaque privileged-resource identifiers across Electron IPC

No reference project is copied wholesale into AedriAIn.
