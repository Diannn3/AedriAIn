# Documents V1 validation matrix

## Environment

The current execution environment has Node 22 and global TypeScript/PostCSS, but shell DNS cannot resolve npm/GitHub hosts. The source baseline was therefore reconstructed from the exact Core V2.1 bundle and verified against the pushed branch manifest/blob metadata before implementation.

## Verified here without installed project dependencies

- all original 70 Core V2.1 paths audited before edits
- dependency-light GestureEngine regression: PASS
- stable hand identity bootstrap regression: PASS
- command parser including Research mode: PASS
- primary-hand selection bootstrap regression: PASS
- pure Electron file-resource Range/MIME regression: PASS
- Electron main/preload `node --check`: PASS
- MediaPipe vendor/verify scripts parse: PASS
- PDF.js vendor/verify scripts parse: PASS
- Electron smoke script parses: PASS
- expanded TS/TSX tree parses with the TypeScript compiler API: PASS
- relative source imports resolve: PASS
- `src/styles.css` parses through PostCSS: PASS
- `git diff --check`: required again at final freeze

## Added dependency-aware tests (must run on first networked runner)

### Vitest

- gesture hysteresis/classification
- stable hand identity
- local commands
- Notes resource independence
- Task creation/toggle
- browser PDF Blob/document view-state persistence
- V2.1 Notes/Tasks -> Dexie migration
- migration idempotence
- Research workspace Files fallback
- Research workspace document focus

Vitest uses `fake-indexeddb/auto` plus an in-memory localStorage shim for Node-side resource tests.

### Playwright browser E2E

- AedriAIn boot + Files app
- independent Notes window creation
- Note persistence across reload
- select/open **two** PDFs as independent document windows
- both browser PDFs survive page reload through IndexedDB Blobs
- PDF search finds the fixture target on page 2
- Research mode before a document -> Files visible
- Research mode with a document -> Document + Notes + Tasks, Files hidden
- layout resize changes width/height independently of spatial scale

### Electron smoke

- build/start production renderer under custom `aedriain://app` protocol
- verifies root window loads instead of failing on custom-protocol asset resolution

## Network-blocked here

A real `npm install --package-lock-only` attempt timed out on registry resolution. Because `node_modules` is absent, this environment cannot truthfully run:

- lockfile generation
- real `npm run typecheck`
- Vitest dependency-aware suite
- Vite build
- runtime MediaPipe asset staging/download
- runtime PDF.js asset staging
- Playwright browser E2E
- Electron launch

Do **not** fabricate a lockfile. The first networked install should generate and commit it.

## CI matrix

`.github/workflows/ci.yml` currently performs:

1. dependency installation (`npm install` until the first lockfile exists)
2. bootstrap core tests
3. `npm run setup` to stage MediaPipe + PDF.js assets
4. TypeScript typecheck
5. Vitest
6. production Vite build
7. Electron syntax checks
8. Chromium Playwright E2E
9. production Electron smoke under Xvfb

After `package-lock.json` is committed, change all CI installs to `npm ci` and enable npm caching.

## Manual Documents V1 matrix after CI is green

### Browser

- open 1, 2, and 4 PDFs
- 10-page and 200+ page documents
- page navigation
- zoom/fit/rotate
- thumbnail lazy rendering
- text selection alignment at 100%, 150%, rotated pages
- phrase search including text split across PDF spans
- reload and confirm browser Blob/document/window state
- resize PDF panel to min/default/max bounds

### Electron

- select PDF: renderer receives no raw path
- HEAD/GET full response
- byte-range request returns correct 206/Content-Range
- invalid range returns 416
- dev Vite origin can fetch `aedriain://` resource through configured CORS headers
- production `aedriain://app` PDF loading is same-origin
- token revocation rejects subsequent requests
- process restart intentionally invalidates session tokens and produces re-select guidance

### Spatial interaction

- content pinch activates toolbar controls but does not drag window
- header pinch drags
- two-hand transform works while hands are over PDF content
- release one hand -> continuous one-hand grab
- detector-order swap does not swap ownership
- resize handle maintains opposite corner on rotated/scaled windows
- mouse/keyboard remain usable with hand tracking enabled

### Webcam lifecycle

- GPU path
- automatic CPU fallback
- camera permission rejection
- worker initialization failure
- temporary hand loss/reacquisition
- hidden-tab behavior
- unplug/end camera track (still needs explicit runtime verification/improvement)

## Performance baseline to record before Notes V2/postprocessing/AI

Record at minimum:

```text
scenarios:
  no hand tracking / 1 PDF
  GPU hand tracking / 1 PDF
  GPU hand tracking / 2 PDFs
  GPU hand tracking / 4 PDFs

metrics:
  R3F render FPS / frame ms
  MediaPipe inference FPS / latency
  dropped camera frames per minute
  JS heap / process memory after 15 minutes
  PDF page-change latency
  PDF search time for 10 / 100 / 300 pages
```

No expensive visual postprocessing should ship until these measurements establish a regression budget.
