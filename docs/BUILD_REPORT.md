# Documents V1.1 + Calibration Foundation implementation report

## Baseline

Remote source baseline: `documents-v1` at commit `6a8aab922dcd73b5e09edc0e1e8465ced723a958`.

A literal shell clone was attempted first and failed because this execution environment cannot resolve `github.com`. The previously generated Documents V1 bundle was used as the local source tree, its 98-file project manifest was checked against the pushed branch, and GitHub was treated as source-of-truth for branch metadata. The pushed branch additionally contained a stale `package-lock.json`; it was audited separately and found not to match the V1 package manifest.

## Pre-edit audit

Before V1.1 edits:

- every project/source path from the 98-file Documents V1 manifest was read
- PDF fixtures were treated as binary
- critical PDF/Dexie/Electron/hand/window flows were reviewed manually
- baseline dependency-light regressions passed
- the pushed lockfile/CI mismatch was identified before feature work
- current upstream PDF.js, Media Capture, Dexie/virtualization, and GitHub Actions behavior was rechecked where it affected implementation decisions

## Reliability work

- package version advanced to `0.3.1`
- added strict `scripts/verify-lockfile.mjs`
- CI now triggers on every push, pull request, and manual dispatch
- first CI job verifies or legitimately regenerates a stale/missing lockfile on a networked runner
- one exact lockfile artifact is reused by every downstream `npm ci` job
- added non-blocking high-severity production dependency audit
- added lockfile recovery documentation
- generated-test output added to `.gitignore`

A correct lockfile is intentionally **not fabricated locally** because this shell still cannot reach npm. The first networked CI/local run must generate the real npm resolution.

## Documents V1.1 lifecycle

- DocumentRecords now carry source fingerprints
- desktop picker descriptors include modification time when available
- relinking reuses the same durable document instead of duplicating it
- relinking an obviously different fingerprint warns the user
- source changes invalidate cached page text; same fingerprints preserve it
- recent documents expose Open / Relink / Remove
- removing from AedriAIn never deletes the original OS file
- remove closes attached windows, clears page index, cleans browser Blob, and revokes Electron token when possible
- startup garbage collection removes orphan browser PDF Blobs
- source resolution distinguishes ready / missing / needs-relink

## Cached document search

Dexie schema v2 adds `documentPages` keyed by document/page.

- PDF indexing runs in bounded concurrency
- cached pages are reused on reopen
- indexing is abortable when a document closes
- progress is visible in the viewer
- search reads cached page text instead of re-extracting every PDF page per query
- search normalizes Unicode/whitespace
- whitespace-insensitive fallback handles PDF text fragments split inside words

## Continuous virtualized reader

Added an internal dependency-free virtual list primitive because the baseline lockfile was already invalid and this environment cannot safely introduce another unresolved package.

Features:

- variable measured row heights
- overscan
- ResizeObserver measurement
- binary-search visible-range lookup
- programmatic scroll-to-index
- reset/invalidation after zoom/rotation

The primitive powers:

- thumbnail rail virtualization
- continuous PDF page virtualization

The reader now supports SINGLE and SCROLL modes, tracks the active continuous page, keeps thumbnails synchronized, and persists the reading mode.

An 80-page deterministic PDF fixture plus Playwright assertions guard against mounting one page tree per PDF page.

## PDF error/recovery behavior

- password-required UI through PDF.js `onPassword`
- incorrect-password retry state
- corrupt/load failure state with external-open/remove actions
- expired/missing source guidance
- Electron process-restart source reauthorization through Files relink

## Settings and calibration

Added a real Settings app and durable settings/profile runtime:

- active gesture profiles
- create custom profile
- preferred hand: automatic / left / right
- pointer smoothing
- drag smoothing
- pointer sensitivity
- UI scale
- reduced motion
- tracker status
- two-sample pinch calibration

Calibration samples normalized thumb/index distances, derives hysteresis thresholds, and persists only clamped safe values.

Gesture profiles update the running GestureEngine live. Preferred-hand policy also seeds simultaneous two-hand transform ownership unless an existing capture already owns the gesture.

## Camera lifecycle hardening

Added explicit phases for permission denial, unavailable devices, device loss, and tracker error.

When a camera track ends or final CPU tracker initialization fails:

- stale hands are cleared
- worker is terminated
- stream is stopped/cleared
- smoothing/identity state is reset
- UI returns to an explicit re-enable state

## Accessibility foundation

- UI text scale setting (bounded 90–130%)
- reduced-motion setting
- explicit accessible labels for calibration/profile controls
- existing mouse/keyboard precision path preserved

This is not yet the final accessibility pass; tiny legacy HUD typography and comprehensive keyboard/focus QA remain future work.

## Validation added

Vitest contracts now cover:

- document relink without duplication
- source-change index invalidation
- same-fingerprint index preservation
- document removal
- browser Blob GC
- gesture-profile clamping
- Documents V1 → V1.1 database migration defaults
- cached page search including split-span fallback
- preferred-hand behavior

Playwright contracts now cover:

- Settings persistence
- two PDF windows/reload
- indexed PDF search
- Research workspace
- layout resize
- long-document continuous virtualization
- browser document removal
- browser PDF relink preserving one resource/window
- performance snapshot artifact

## Local validation boundary

Dependency-light tests and source-level parser/import/security checks can run here. Full dependency-aware TypeScript/Vitest/Vite/Playwright/Electron execution cannot be claimed until a networked runner regenerates the lockfile and installs the exact dependency graph.

See `docs/VALIDATION.md` for the final matrix and `docs/PERFORMANCE_BASELINE.md` for benchmark gates.

## Final dependency-light freeze

At final freeze the implementation contains 110 project files. The local matrix passes the GestureEngine, command parser, hand-selection, virtual-range, and file-resource bootstrap regressions; all 68 TS/TSX files parse; 79 source/script files have resolving relative imports; all bare third-party imports are declared; CSS/CI YAML/JSON parse; all three PDF fixtures pass header/EOF sanity checks; and `docs/FILELIST.txt` matches the tree exactly.

The only intentional local gate failure is `scripts/verify-lockfile.mjs`, because no legitimate V1.1 lockfile can be generated without npm network access. The networked CI lockfile job is responsible for that resolution before downstream `npm ci` validation.
