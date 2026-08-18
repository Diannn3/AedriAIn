# Third-party research and licensing notes

AedriAIn product code is written as fresh project code. Third-party libraries are consumed through documented APIs or used as architectural/visual references.

Current runtime/test dependencies and major references include:

- MediaPipe Tasks / browser samples — Apache-2.0
- Mozilla PDF.js / `pdfjs-dist` — Apache-2.0
- Dexie / dexie-react-hooks — Apache-2.0
- fake-indexeddb — Apache-2.0
- Three.js — MIT
- PMNDRS React Three Fiber / Drei / UIKit — MIT
- React / Zustand — MIT
- Vitest — MIT
- Playwright — Apache-2.0
- `quiet-node/gesture-lab` — MIT
- `SAGAR-TAMANG/ultron-by-sagar-builds` — MIT
- `Necookie-Labs/Voxel-Manipulation-via-Hand-Tracking` — MIT

`heeelol/jester` did not expose a usable repository license during inspection, so AedriAIn treats it as behavioral/architectural reference material only and does not vendor/copy its source.

PDF.js viewer UI is not copied wholesale. AedriAIn builds its own React reader on the PDF.js display layer and adapts only the API/TextLayer CSS contract required for correct library operation.

Documents V1.1's internal virtualizer is original project code; TanStack Virtual was researched but not added as a dependency in this milestone.

Before adding BlockNote, FullCalendar, MapLibre, AI SDK, postprocessing, XR, or any other package, re-check the exact version/license in the implementation session and preserve required notices/attribution.
