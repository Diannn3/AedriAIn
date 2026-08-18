# Public reference research

The implementation remains fresh code. Public projects are used to avoid reinventing solved interaction patterns while keeping AedriAIn's architecture independent.

## Core references

- `google-ai-edge/mediapipe-samples-web` — 2026 worker-based MediaPipe Tasks pattern, pinned model URLs, model-buffer loading, E2E testing architecture.
- `pmndrs/drei` — `DragControls` validates the camera-ray + camera-facing-plane + preserved drag-offset pattern used by Core V2.
- `pmndrs/react-three-fiber` — scene/event architecture and Three.js integration.
- `heeelol/jester` — behavioral reference for pinch hysteresis, one-hand grab, two-hand transforms, voice-to-structured-action design, phone-controller idea. No source is vendored because no repository license was found during inspection.
- `quiet-node/gesture-lab` — MIT; visual/interaction experiments, MediaPipe + Three.js + TypeScript, physics and shader inspiration.
- `SAGAR-TAMANG/ultron-by-sagar-builds` — MIT; holographic HUD/orb visual reference.
- `collidingScopes/stark-shapes` — hand-driven camera/particle behavior reference for the later visual pass.
- `Necookie-Labs/Voxel-Manipulation-via-Hand-Tracking` — simple gesture mapping reference.
- `pmndrs/uikit` — later native spatial UI option once the window interaction contract is stable.

## What was reused conceptually in Core V2

- MediaPipe worker isolation
- scale-normalized pinch + hysteresis
- camera-derived raycasting
- drag planes perpendicular to the camera
- preserved grab offsets
- relative two-hand distance/angle transforms
- typed command/tool boundary

No reference repository has been copied wholesale into the product.
