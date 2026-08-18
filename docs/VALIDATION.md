# Documents V1.1 validation matrix

## Environment boundary

The implementation environment has Node 22 plus global TypeScript and basic parsing tools, but shell DNS cannot resolve npm/GitHub hosts. A literal clone and dependency install were attempted first and failed at network resolution.

The working source was reconstructed from the exact Documents V1 bundle produced in the previous milestone and reconciled against the pushed `documents-v1` branch. The pushed branch additionally contained a stale `package-lock.json`, which was audited separately and found not to match the current package manifest.

## Dependency-light validation available here

Run before every freeze:

```bash
npm run test:bootstrap
node --check electron/main.cjs
node --check electron/preload.cjs
node --check electron/file-resource.cjs
node --check scripts/vendor-mediapipe.mjs
node --check scripts/vendor-pdfjs.mjs
node --check scripts/verify-mediapipe-assets.mjs
node --check scripts/verify-pdfjs-assets.mjs
node --check scripts/verify-lockfile.mjs
bash -n scripts/test-core.sh
```

The final freeze also performs:

- TypeScript parser diagnostics over every `.ts`/`.tsx`
- relative-import resolution audit
- bare third-party import vs `package.json` declaration audit
- CSS parse
- CI YAML parse
- JSON parse
- file-manifest regeneration/consistency check
- whitespace/diff checks once a Git baseline is reconstructed

## Lockfile gate

`package-lock.json` must match the exact package name/version/direct dependencies/devDependencies/Node engine.

`node scripts/verify-lockfile.mjs` checks that contract.

Because a real npm resolution cannot run in this environment, CI's first `lockfile` job is allowed to regenerate a missing/stale lockfile on a networked GitHub runner. It uploads one `aedriain-lockfile` artifact. Every downstream job downloads that same file before running `npm ci`.

After the first green networked run, the generated lockfile should be committed. See `docs/LOCKFILE_RECOVERY.md`.

## Vitest contracts

### Hand / commands

- gesture pose/hysteresis
- calibration threshold override
- pointer sensitivity + separate drag smoothing
- stable hand identities
- preferred-hand selection while preserving captured ownership
- command parsing including Research and Settings aliases

### Storage / migration

- Core V2.1 Notes/Tasks migration
- migration idempotence
- Documents V1 → V1.1 schema defaults
- default active gesture profile
- independent Notes
- durable Tasks
- browser PDF Blob/view state
- relink into same DocumentRecord
- changed-source page-index invalidation
- same-fingerprint page-index preservation
- document removal
- orphan Blob garbage collection
- gesture-profile clamp bounds

### Document index

- Unicode/whitespace normalization
- cached page match counts
- whitespace-insensitive split-span phrase fallback

### Workspace/window

- Research before PDF → Files
- Research with PDF → Document focus
- deleting a resource removes all attached windows

## Playwright browser contracts

- shell boot + Files
- independent Notes window
- Note persistence across reload
- two independent PDFs
- PDF reader load
- wait for cached index readiness before deterministic search
- search fixture hit
- both browser PDFs survive reload
- Research fallback and document layout
- layout resize vs spatial scale
- Settings singleton/UI-scale persistence
- long-PDF continuous mode mounts a bounded virtual subset
- remove browser document closes window/recent entry
- relink browser PDF preserves one document resource/window
- performance snapshot attachment

## Electron smoke

- production build starts under `aedriain://app`
- root renderer loads through the custom protocol

Manual Electron document checks remain required:

- picker exposes no raw path
- HEAD/GET/range behavior
- invalid range → 416
- dev CORS Range preflight
- production same-origin resource load
- token revocation
- restart → needs-relink state
- relink reuses durable document identity

## Camera/manual spatial matrix

- GPU tracker path
- GPU → CPU fallback
- final CPU failure returns to explicit re-enable state
- camera permission rejection
- unavailable device
- camera track ended/device unplugged
- temporary hand loss/reacquisition
- hidden-tab behavior
- left/right preferred profile
- one-hand chrome drag
- app-content activation without one-hand drag
- two-hand transform while pointer is over document content
- release one hand → continuous grab
- detector reorder does not swap ownership
- resize opposite-corner anchoring on rotated/scaled windows
- mouse/keyboard remain usable with hands enabled

## Documents/manual matrix

- 1 / 10 / 80 / 200+ page PDFs
- very long PDF (1000+ pages when test data is available)
- single / continuous modes
- zoom / fit / rotate
- page jump near end of long document
- thumbnail synchronization
- text selection at multiple zooms/rotations
- cached search
- phrase split across PDF spans
- corrupt PDF
- password PDF + incorrect password
- browser PDF reload
- expired desktop source relink
- remove/reopen lifecycle

## Performance gate

See `docs/PERFORMANCE_BASELINE.md`.

No Notes V2/AI/postprocessing milestone is considered ready until the first real browser + Electron + webcam baseline is recorded.

## Final dependency-light freeze result for this implementation

The final local source freeze for Documents V1.1 produced:

```text
bootstrap GestureEngine: PASS
bootstrap command parser: PASS
bootstrap hand-selection: PASS
bootstrap virtual-range (1000 rows): PASS
file-resource range/MIME: PASS
Electron/script syntax: PASS
TS/TSX parser: PASS · 68 files
relative import audit: PASS · 79 source/script files
third-party declaration audit: PASS · 16 modules
CSS parse: PASS
CI YAML parse: PASS
JSON parse: PASS
PDF fixture sanity: PASS · 3 fixtures
FILELIST: PASS · 110 project files
runtime milestone labels: PASS · Documents V1.1
```

`package-lock.json` is intentionally absent from this local artifact because the shell cannot perform a legitimate npm resolution. `scripts/verify-lockfile.mjs` therefore fails locally by design; the networked CI lockfile gate must produce the exact lock before dependency-aware jobs run.
