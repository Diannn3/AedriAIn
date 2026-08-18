# Lockfile recovery

## Why this exists

Documents V1 introduced dependencies that were not present in the previous package graph. A stale or missing lockfile must be resolved by npm from the exact current `package.json`; it must never be fabricated or hand-edited.

AedriAIn now exposes one cross-platform recovery command:

```bash
npm run bootstrap
```

## What bootstrap does

1. runs the repository lockfile verifier
2. if the lock is valid, runs `npm ci` for a clean frozen install
3. if the lock is missing/stale, runs `npm install` to resolve `package.json` and generate/update `package-lock.json`
4. verifies the resulting lock when npm had to regenerate it
5. clears `node_modules/.vite`
6. stages MediaPipe + PDF.js runtime assets
7. verifies direct installed package versions and staged assets

After the first successful networked bootstrap, commit the generated `package-lock.json`.

## Manual local recovery

When no valid lockfile exists:

```bash
npm install --no-audit --no-fund
npm run verify:lockfile
npm run setup
npm run verify:install
```

When a valid lockfile exists:

```bash
npm ci
npm run setup
npm run verify:install
```

## CI recovery path

`.github/workflows/ci.yml` still has a networked lockfile gate so a branch with a missing/stale lock can be validated rather than silently skipped.

It:

1. checks out the branch
2. verifies the committed lock
3. if necessary, regenerates it with the repository npm version
4. uploads the exact generated lockfile as `aedriain-lockfile`
5. makes every downstream validation job use that exact file with `npm ci`
6. runs `npm run verify:install` after installation

This is a recovery mechanism. The desired steady state remains a committed, current `package-lock.json`.

## Verification scope

`npm run verify:lockfile` compares the root lock entry with the current manifest:

- package name/version
- direct dependencies
- direct devDependencies
- Node engine

`npm run verify:install` separately verifies the direct packages actually present in `node_modules`, catching stale local installs even when Vite itself is already installed.
