# Spatial Student Desktop — Prototype 01

A webcam hand-tracked spatial desktop shell: holographic windows, real Notes/Tasks state, a calendar shell, UPLB map placeholder, file picker bridge, command bar, optional browser speech input, mouse fallback, and a MediaPipe worker.

## What already works in this prototype

- React 19 + React Three Fiber spatial scene
- Two-hand MediaPipe Hand Landmarker in a Web Worker
- Normalized pinch strength by hand scale
- Pinch hysteresis (separate grab/release thresholds)
- Pointer smoothing
- One-hand pinch + drag spatial windows
- Two-hand pinch + relative resize/rotation
- Fist over focused panel resets rotation
- Mouse drag + scale buttons as fallback
- Persistent Notes, Tasks, window transforms via localStorage/Zustand
- Local command parser: `open map`, `open files`, `close notes`, `study mode`, `show all`, `hide all`, `reset workspace`
- Browser speech-recognition hook when available
- Electron shell scaffold with context isolation, renderer sandboxing, restricted file picker bridge

## Run

```bash
npm install
npm run dev
```

Open the local Vite URL and click **Enable hands**. Camera access requires a secure context; localhost qualifies in normal browsers.

### Electron

```bash
npm run desktop:dev
```

For a production shell:

```bash
npm run build
npm run desktop
```

## Hand controls

- Index finger: pointer
- Thumb + index pinch: select/grab
- Pinch + move: drag
- Two simultaneous pinches on the same panel: scale + rotate
- Fist while over focused panel: reset panel rotation

The mouse remains fully usable.

## Reference repos

Run this on a networked development machine to clone the research repos into a separate folder:

```bash
./scripts/clone-references.sh
```

The reference folder should not be committed into this app.

## Immediate next implementation batch

1. Camera ray-plane spatial dragging instead of approximate pixel mapping.
2. Far-pointer ray + dwell/hover feedback.
3. Local MediaPipe model/WASM assets for offline use.
4. MapLibre + UPLB/PMTiles map module.
5. PDF/file viewer and recent-files index.
6. Typed app/plugin manifest and capability permissions.
7. AI provider layer where tool calls dispatch to the same command bus.
8. Phone-as-hand-controller WebSocket provider.
9. WebXR input provider.
