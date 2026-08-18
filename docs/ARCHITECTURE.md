# Architecture

## Core rule

Raw landmarks never directly manipulate application state. Input providers emit normalized hand snapshots, the gesture layer turns them into interaction intent, and the spatial window manager owns transforms. Mouse and future WebXR providers can target the same window manager.

## Current data flow

Camera -> MediaPipe Worker -> HandRuntime -> GestureEngine -> Hand Window Controller -> Desktop Store -> Spatial Windows

Mouse -> DOM pointer events -----------------------------------------> Desktop Store

Text/Voice -> Local Command Parser -> Typed Command Bus -> Desktop Store

## Modules

Each app is registered in `src/modules/registry.tsx`. The MVP ships Notes, Tasks, Calendar, UPLB Map placeholder, Files, and AI Console. The registry is deliberately independent of tracking.

## High-frequency state

Landmarks and pointers live in `handRuntime`, a vanilla Zustand store. React components only subscribe when they actually need live hand state. Persistent productivity/window state lives in `useDesktopStore`.

## Two-hand manipulation

The controller records baseline hand distance + angle when a two-pinch gesture starts. Relative distance changes scale; relative angle changes `rotationZ`. One pinch becomes a drag. Threshold hysteresis is handled in `GestureEngine`.

## Desktop security

Electron renderer has `nodeIntegration: false`, `contextIsolation: true`, and `sandbox: true`. Privileged APIs are exposed through a tiny preload bridge. The file API begins with user-selected files rather than arbitrary shell access.

## Next architecture milestones

1. Replace approximate pixel-to-world dragging with camera-ray/plane intersection.
2. Add far-pointer ray interaction and direct near-hand interaction modes.
3. Move MediaPipe model/WASM assets local for offline mode.
4. Expand the typed command bus and capability-aware plugin manifest into permission prompts and external app tools.
5. Add SQLite persistence on Electron while retaining browser storage.
6. Add MapLibre/PMTiles, PDF viewer, BlockNote, and calendar integration.
7. Add LLM tool calls that emit the exact same command types as local/voice actions.
8. Add phone WebSocket provider and WebXR provider.
