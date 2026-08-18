# Local PDF.js runtime assets

AedriAIn keeps PDF rendering self-contained. Run `npm run assets:pdfjs` after installing dependencies.
The staging script copies the PDF.js worker and supporting CMap, standard-font, WASM, and ICC assets from the pinned `pdfjs-dist` package into this directory.

The generated runtime assets are intentionally not hand-edited. Production builds verify that the required staged files exist before Vite runs.
