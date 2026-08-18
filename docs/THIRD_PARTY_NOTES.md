# Third-party research and licensing notes

AedriAIn product code is written as fresh project code. Third-party packages/repositories are used through their documented APIs or as architectural/visual references.

Licenses checked for current runtime/test dependencies and major references:

- MediaPipe browser samples / Tasks references — Apache-2.0
- Mozilla PDF.js / `pdfjs-dist` — Apache-2.0
- Dexie — Apache-2.0
- fake-indexeddb — Apache-2.0
- Three.js — MIT
- PMNDRS React Three Fiber / Drei / UIKit — MIT
- Vitest — MIT
- Playwright — Apache-2.0
- `quiet-node/gesture-lab` — MIT
- `SAGAR-TAMANG/ultron-by-sagar-builds` — MIT
- `Necookie-Labs/Voxel-Manipulation-via-Hand-Tracking` — MIT

`heeelol/jester` did not expose a usable repository license during inspection, so AedriAIn treats it as a behavioral/architectural reference only and does not vendor/copy its source.

PDF.js viewer UI is not copied wholesale. Documents V1 builds an AedriAIn-specific React viewer on the PDF.js display layer and adapts only the display/text-layer API/CSS contract required by the library.

Before vendoring any new code/assets, re-check the exact current license and preserve required notices/attribution.
