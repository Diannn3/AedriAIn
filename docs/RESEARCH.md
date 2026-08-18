# Research references used for Prototype 01

The implementation is fresh code. The following public projects were studied for interaction and architecture patterns:

- `heeelol/jester` — clean pinch hysteresis, one-hand grab, two-hand relative scale/rotation, voice-to-structured-action architecture, phone controller concept.
- `google-ai-edge/mediapipe-samples-web` — 2026 worker-based Hand Landmarker pattern and two-hand tracking.
- `Necookie-Labs/Voxel-Manipulation-via-Hand-Tracking` — simple MediaPipe + Three.js gesture mapping and screen/world interaction prototype.
- `quiet-node/gesture-lab` — modern MediaPipe + Three.js + TypeScript visual experiments and spatial interaction ideas.
- `SAGAR-TAMANG/ultron-by-sagar-builds` — holographic UI/orb visual reference.
- `pmndrs/react-three-fiber` / `pmndrs/drei` — React/Three scene architecture and HTML-in-3D bridge.
- `pmndrs/uikit` — future native 3D UI layer; intentionally not required for the first MVP.

## Important differences from the references

- This code separates high-frequency hand runtime state from persistent desktop/app state.
- Spatial windows are modules, not hard-coded holograms.
- Mouse fallback is first-class.
- The assistant layer is represented as a command interface, not coupled to one AI provider.
- Electron privileged access is kept behind an allow-listed preload bridge.
