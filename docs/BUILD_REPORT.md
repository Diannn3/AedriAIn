# Core V2.1 implementation report

## Recovered from Core V2 branch omission

The pushed Core V2 commit referenced new app/interaction/identity/workspace modules that were absent from the Git tree. Core V2.1 restores the intended modules and then hardens them rather than restoring the original bundle unchanged.

## Implemented

- restored app registry + six app modules
- restored camera runtime, target registry, interaction runtime, hand controller, pointer beam
- restored workspace layouts and stable hand identity tracker
- fixed pointer beam world endpoint bug
- stable active-hand ownership across MediaPipe reorderings
- transform -> one-hand-grab continuity when one hand releases
- motion-predicted/global hand identity assignment
- explicit window world dimensions
- canvas-relative mouse ray coordinates
- resource IDs on windows
- multi-resource Notes records and per-note windows
- singleton enforcement for non-Notes apps
- window transform bounds and focus/maximize invariants
- opaque Electron file IDs instead of renderer-visible paths
- bounded read-by-token file IPC for future PDF rendering
- render FPS/DPR + MediaPipe inference FPS/latency instrumentation
- origin-aware Electron media permission handling
- self-contained CSP for current core functionality
- local MediaPipe asset staging + production asset verification
- model-buffer initialization in the worker
- Vitest unit tests and fixture-backed identity tests
- Playwright browser E2E
- production Electron smoke harness
- GitHub Actions validation workflow
- Node/npm/toolchain versions pinned at the top level

## Verified locally in this environment

See `docs/VALIDATION.md`. Full npm/Vite/runtime validation remains blocked by shell network resolution, not by a known source-code failure.

## Known blocked item

`package-lock.json` cannot be truthfully generated offline because npm has no cached `@mediapipe/tasks-vision` metadata. Generate it with the first networked `npm install` and commit it before treating dependency resolution as reproducible.

## Next branch after validation

Files + Spatial PDF Workspace.
