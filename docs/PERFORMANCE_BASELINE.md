# AedriAIn performance baseline

## Purpose

This file defines the performance measurements that must be captured before Notes V2, AI, or expensive holographic postprocessing ships. It intentionally contains **no invented numbers**: this execution environment cannot run the installed browser/Electron stack because npm registry access is unavailable.

The Playwright test `tests/e2e/performance.spec.ts` attaches a machine-readable `documents-performance-baseline.json` snapshot on the first networked CI run.

## Browser snapshot automatically captured

The current E2E snapshot records:

- total DOM node count
- mounted continuous PDF page rows
- mounted thumbnail rows
- Chromium JS heap values when exposed
- Status HUD text, including render/inference telemetry

The long fixture contains 80 pages and asserts that continuous mode mounts fewer than 20 page rows at once. This is a correctness guard for virtualization, not a universal performance target.

## Manual benchmark matrix

Record each scenario after CI is green:

| Scenario | Hand tracking | PDFs | Notes | Duration |
|---|---|---:|---:|---:|
| shell baseline | off | 0 | 0 | 5 min |
| reading baseline | off | 1 | 0 | 5 min |
| spatial reading | GPU | 1 | 0 | 10 min |
| research workspace | GPU | 2 | 1 | 15 min |
| stress documents | GPU | 4 | 1 | 15 min |
| CPU fallback | CPU | 1 | 0 | 10 min |

For each scenario record:

- R3F render FPS / approximate frame time
- MediaPipe inference FPS and latency
- dropped camera frames per minute
- browser JS heap when available
- Electron renderer/main process memory
- PDF page-change latency
- continuous-scroll hitching observations
- PDF text-index completion time
- cached-search latency after indexing

## Document-size matrix

Test at minimum:

- 1 page
- 10 pages
- 80-page fixture
- 200+ pages
- 1000+ pages when a suitable non-sensitive local test PDF is available

For long documents, capture:

- mounted virtual page count
- mounted virtual thumbnail count
- initial open time
- jump-to-page time near the end of the document
- memory after scrolling from beginning to end and back

## Regression policy

Do not add expensive visual postprocessing until these measurements exist.

A future change should be investigated when it causes a repeatable material regression in any core scenario, especially:

- sustained render FPS degradation while hands are active
- increasing dropped-frame rate
- page/thumbnail mount count scaling with total PDF page count
- search reverting to full PDF text extraction on every query
- memory growing without stabilizing after closing/removing document windows

## First-run workflow

1. Push the V1.1 branch so networked CI runs.
2. Download the Playwright report artifact.
3. Record the attached JSON snapshot here or in a dated benchmark result file.
4. Run the manual browser/Electron/webcam scenarios on the target laptop.
5. Keep the raw machine/browser version with the measurements so future comparisons are meaningful.
