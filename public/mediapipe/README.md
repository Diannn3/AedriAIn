# MediaPipe runtime assets

Run `npm run assets:mediapipe` after installing dependencies.

That command copies the exact `@mediapipe/tasks-vision` WASM runtime from `node_modules` and downloads the pinned official Hand Landmarker `float16/1` model into `public/mediapipe/models/hand_landmarker.task`.

AedriAIn resolves both assets from its own origin at runtime so the packaged Electron app can run hand tracking without reaching jsDelivr or Google Storage.
