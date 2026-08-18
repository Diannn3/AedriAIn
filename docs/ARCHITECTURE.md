# AedriAIn architecture — Core V2

## Product boundary

AedriAIn is a general-purpose webcam-controlled holographic spatial desktop. The core is not UPLB-specific: files, schedules, maps, tasks, notes, AI, search, and future plugins all sit on top of the same interaction/window platform.

## Core rule

Raw landmarks never directly manipulate application state. Camera providers emit normalized hand detections, identity tracking stabilizes hand IDs, the gesture layer derives intent, and the spatial interaction engine manipulates registered 3D window targets through camera rays.

## Current data flow

Camera -> MediaPipe Worker -> Hand Identity Tracker -> Gesture Engine -> Hand Runtime
                                                               |
                                                               v
Three Camera -> Spatial Target Registry -> Raycast/Drag Plane -> Interaction Controller -> Desktop Store -> Spatial Windows

Mouse -------------------------------------> same Camera/Drag Plane math ----------------------^

Text/Voice -> Local Command Parser -> Typed Command Bus -> Desktop Store

## Spatial interaction

Prototype 01 used DOM `getBoundingClientRect()` hit-testing and hard-coded pixel-to-world scale constants. Core V2 removes that path.

Each window owns an invisible Three.js interaction plane. Hand coordinates are converted to normalized device coordinates, raycast from the active camera, and resolved against those planes. Grabs create a camera-facing drag plane and preserve the original grab offset. Two hands use their midpoint for translation, their relative distance for scale, and their angle delta for rotation.

## High-frequency state

`handRuntime` and `interactionRuntime` are vanilla Zustand stores. They contain transient tracking/interaction state and are not persisted.

Persistent productivity/window state remains in `useDesktopStore` for now, with a versioned migration boundary. A later storage adapter will split browser IndexedDB and desktop SQLite from UI state.

## Apps

Apps are now split under `src/apps/` instead of sharing one registry implementation file. The registry exposes typed capability declarations such as `files.pick`, `files.open`, `map.network`, and `ai.tools`.

The next app-system milestone is separating `AppDefinition` from `WindowInstance` so one app can create multiple spatial windows.

## Hand tracking lifecycle

The provider now has explicit lifecycle phases, initialization timeout handling, GPU-first startup, CPU fallback, tab-visibility throttling, dropped-frame telemetry, and stable hand IDs across detector reorderings.

The model URL is pinned to MediaPipe Hand Landmarker `float16/1`. A future offline pass will copy the model and WASM assets into the packaged app rather than fetching them from the network.

## Desktop security

Production uses the custom `aedriain://app` protocol instead of `file://`. Electron keeps `nodeIntegration: false`, `contextIsolation: true`, and `sandbox: true`; navigation/popups are denied; IPC senders are validated; camera permission requests/checks are limited to the trusted renderer; filesystem operations remain user-approved and allow-listed.

## Next milestones

1. Install dependencies on a networked runner and perform full TypeScript/Vite/Electron runtime validation.
2. Tune interaction target dimensions from actual projected HTML bounds without returning to DOM hit-testing.
3. Add hover/selection visual feedback on the 3D targets and hand rays.
4. Separate `AppDefinition` from `WindowInstance` and support multiple windows, minimize/maximize, docking, and layouts.
5. Add a real Files/PDF workflow before AI.
6. Add real Notes, Tasks, Calendar, generic Maps, then AI tools.
7. Vendor MediaPipe model/WASM for offline tracking.
8. Add phone and WebXR input providers after the desktop interaction contract stabilizes.
