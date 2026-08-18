# Documents V1 implementation report

## Baseline

Source baseline: pushed `core-v2.1` branch at commit `59b360f7643133a6722dc4a13fde8555491ea9a6`.

A literal `git clone` could not be completed inside this execution environment because shell DNS cannot resolve GitHub. The previously generated Core V2.1 bundle was therefore extracted locally and verified against the pushed branch's 70-file manifest and representative Git blob hashes before edits began.

## Pre-edit audit

Before modifying code:

- all 70 tracked paths were enumerated
- the complete ~3.4k-line source/config/doc tree was inspected programmatically
- critical runtime/security/interaction files were reviewed manually
- every relative import resolved
- no TODO/FIXME/HACK markers were present
- bootstrap gesture/parser/hand-selection regressions passed
- Electron/runtime utility scripts parsed

## Implemented — Core V2.2 app/window contract

- per-app default/min/max geometry
- true layout width/height separate from spatial scale
- bottom-right resize with opposite-corner anchoring for rotated/scaled windows
- app registry converted to lazy dynamic imports
- per-window error isolation
- separate Three.js `chrome` and `content` spatial targets
- depth-aware + z-order-aware ray selection
- chrome pinch moves window; content pinch never starts a one-hand drag
- conservative hand activation/focus bridge for normal DOM controls
- Research workspace added
- Research mode opens Files if no document exists yet

## Implemented — durable resource storage

- Dexie database introduced
- durable Notes, Tasks, Documents, browser Blobs, Settings, GestureProfiles tables
- Notes and Tasks removed from Zustand persistence
- legacy V2.1 Notes/Tasks migration to Dexie
- migration runs before dynamic import of `App`/Zustand store
- independent Note resources/windows retained
- browser PDF Blobs persist through reload
- deterministic fake-IndexedDB tests added for resources/migration
- workspace tests added for Research fallback/focus

## Implemented — secure file resource service

- opaque picker token remains the only renderer file identity
- real paths remain in Electron main
- bounded approved-file registry
- session resource URL `aedriain://app/_resource/file/<token>`
- streamed GET/HEAD
- single byte-range parsing and 206 responses
- 416 invalid ranges
- dev-mode Range CORS/preflight/exposed headers
- MIME + nosniff + no-store response metadata
- token revocation capability
- bounded direct-read IPC retained for small non-PDF workflows

## Implemented — Files/Documents V1

- Files distinguishes PDFs from externally-opened formats
- browser and Electron files become durable `DocumentRecord`s
- PDF files spawn independent `document` windows
- Documents hidden from dock; they are resource-created apps
- Recent Documents list backed by Dexie
- multiple PDF windows supported
- browser-selected PDFs persist as IndexedDB Blobs
- source lifecycle distinguishes missing metadata vs loading vs expired Electron token
- custom PDF.js display-layer viewer added
- locally staged PDF.js worker/CMap/font/WASM/ICC assets
- page navigation
- zoom +/-
- fit width / fit page
- rotation
- lazy thumbnails
- selectable PDF.js TextLayer
- document-wide asynchronous search
- search-result page navigation
- persisted current page/zoom/rotation
- external-open fallback
- PDF render cancellation/cleanup
- search highlighting separated from expensive canvas/text-layer rendering

## Implemented — validation expansion

- bootstrap command test now covers Research mode
- storage resource tests
- storage migration tests
- workspace contract tests
- Playwright two-PDF open/persistence scenario
- Playwright PDF search scenario
- Research workspace before/after-document scenarios
- layout resize E2E
- PDF fixture files
- PDF.js asset staging/verification scripts
- CI stages both MediaPipe and PDF.js local runtime assets
- `fake-indexeddb` added as test-only dependency

## Verified locally without dependency registry access

- bootstrap gesture engine: PASS
- command parser including Research mode: PASS
- hand selection: PASS
- Electron main/preload syntax: PASS
- file resource Range/MIME regression: PASS
- runtime/vendor script syntax: PASS
- TypeScript parser pass across the expanded TS/TSX tree: PASS
- all relative imports resolve: PASS
- CSS parses through PostCSS: PASS
- `git diff --check`: PASS (rerun at final freeze)

## Network/runtime limitation

This shell environment still cannot resolve npm/GitHub hosts. A real `npm install --package-lock-only` attempt hung on registry resolution and was terminated. Therefore this session cannot truthfully claim:

- generated `package-lock.json`
- dependency-aware TypeScript typecheck
- actual Vitest execution with Dexie/fake-indexeddb
- Vite production build
- PDF.js asset staging from installed package
- Playwright browser runtime
- production Electron launch
- webcam GPU/CPU interaction tests

The code and CI intentionally fail loudly when runtime assets are not staged rather than silently falling back to CDNs.

## Exit criteria for merging Documents V1

On the first networked runner:

```bash
npm install
npm run setup
npm run typecheck
npm run test
npm run build
npm run test:e2e
xvfb-run -a npm run test:electron  # Linux CI
```

Then commit the generated `package-lock.json`, switch CI installation to `npm ci` only, and complete the manual webcam/performance matrix in `docs/VALIDATION.md`.
