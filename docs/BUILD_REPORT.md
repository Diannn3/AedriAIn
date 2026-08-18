# Core V2 implementation report

## Implemented in this pass

- Three.js raycast-based hand target selection
- Camera-facing ray/plane world-space dragging
- Two-hand translation + relative scale + rotation
- Mouse dragging moved to the same camera/plane math
- Removed DOM rectangle hit-testing path
- Stable temporal hand IDs across detector reordering
- Worker lifecycle phases and dropped-frame telemetry
- GPU initialization with CPU fallback and timeout handling
- MediaPipe model pinned from `latest` to `float16/1`
- Focus invariants fixed so closed windows cannot remain focused
- Persisted workspace schema bumped to v2 with migration
- Generic Maps scope (no UPLB dependency in core)
- App implementations split under `src/apps/`
- Typed app capability names introduced
- File rows can open user-selected files through the existing restricted bridge
- Calendar demo generated from the current week instead of a hardcoded date
- Vite relative production base for desktop packaging
- Electron production custom protocol (`aedriain://app`)
- Electron IPC sender validation and permission-check handler

## Verified locally without external dependencies

- `scripts/test-core.sh` passes
  - gesture classification
  - pinch normalization/hysteresis
  - stable hand identity across detector order swaps
  - local command parsing
- Electron main/preload pass `node --check`
- `git diff --check` passes

## Environment limitation

This execution environment cannot resolve GitHub/npm hosts, and the repository does not include `node_modules` or a lockfile. The full React/R3F/Vite typecheck and runtime launch therefore still require a networked development runner.

## Required first runtime checks

1. `npm install`
2. `npm run typecheck`
3. `npm run build`
4. `npm run dev` and verify camera GPU path + CPU fallback
5. Verify one-hand world-space dragging at multiple viewport sizes
6. Verify two-hand translate/scale/rotate with hand order changes
7. Verify production `npm run desktop` resolves all assets through `aedriain://app`
8. Profile render FPS, inference latency, dropped frames, and memory
