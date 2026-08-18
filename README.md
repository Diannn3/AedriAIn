# AedriAIn — Webcam Holographic Desktop

AedriAIn is a webcam-controlled spatial desktop inspired by fictional holographic interfaces, but built around useful everyday modules: files, schedules, maps, tasks, notes, and AI.

The project combines local hand tracking, a Three.js spatial window manager, normal mouse/keyboard fallbacks, a typed command bus, and a sandboxed Electron desktop shell.

## Core V2 status

- MediaPipe Hand Landmarker runs in a Web Worker
- explicit tracker lifecycle with GPU -> CPU fallback
- stable hand IDs across detector reorderings
- scale-normalized pinch strength + hysteresis
- real Three.js raycasting for spatial target selection
- camera-facing ray/plane dragging instead of pixel/world constants
- one-hand pinch + world-space drag
- two-hand translation + scale + rotation
- mouse drag uses the same camera-plane interaction math
- Notes, Tasks, Calendar, generic Maps, Files, and AI Console app shells
- typed app capabilities under `src/apps/`
- versioned persistent workspace state
- Electron custom `aedriain://app` production protocol
- sandboxed renderer, validated IPC senders, restricted file picker/open bridge

## Run

```bash
npm install
npm run dev
```

Click **Enable hands** and allow camera access.

### Electron development

```bash
npm run desktop:dev
```

### Production build

```bash
npm run build
npm run desktop
```

## Controls

- point: spatial hover/pointer
- thumb + index pinch: grab/select
- pinch + move: move a window in world space
- two simultaneous pinches: move + scale + rotate
- fist over the focused/hovered panel: reset rotation
- mouse/keyboard remain fully supported

## Research references

`./scripts/clone-references.sh` clones the public research repositories into `./references/` on a networked machine. That directory is ignored by git and is not part of the product source.

See `docs/RESEARCH.md` and `docs/THIRD_PARTY_NOTES.md` before vendoring any code or assets.

## Next implementation target

1. Full dependency install/typecheck/runtime validation on a networked runner.
2. Multi-window Window Manager V2 (`AppDefinition` != `WindowInstance`).
3. Visible spatial ray/hover/selection feedback and gesture calibration.
4. Real Files + PDF viewer workflow.
5. Real Notes/Tasks/Calendar/Maps.
6. Permission-checked AI tool layer using the same typed command bus.
7. Offline-vendored MediaPipe model/WASM assets.
8. Phone controller and WebXR providers after the desktop contract stabilizes.
