# Installation troubleshooting

## Vite: `Failed to resolve import "dexie"`

This message means the source code imports a package declared by `package.json`, but the current local install does not contain that package at the expected version.

Documents V1/V1.1 added runtime dependencies including Dexie, Dexie React hooks, and PDF.js. A `node_modules` directory created on an older branch can therefore still contain Vite/React while missing the newer packages.

### Preferred repair

From the repository root:

```bash
npm run bootstrap
```

The bootstrap chooses the safe install mode automatically:

- valid lockfile -> `npm ci`
- missing/stale lockfile -> `npm install`

It then removes `node_modules/.vite`, stages the local MediaPipe/PDF.js assets, and verifies the resulting install.

### Diagnose without changing anything

```bash
npm run doctor
```

The doctor checks every direct dependency/devDependency declared by `package.json` against the installed package metadata. Missing or wrong versions are printed individually.

Example:

```text
install: FAIL · dexie@4.4.4 is missing from node_modules.
Dependency state is out of sync with package.json.
Run: npm run bootstrap
```

### Manual recovery

If you prefer to perform each operation yourself:

```bash
npm install
npm run verify:lockfile
npm run setup
npm run verify:install
```

When a valid lockfile is already committed, use a clean install instead:

```bash
npm ci
npm run setup
npm run verify:install
```

After changing dependencies, restart Vite. `npm run bootstrap` also removes `node_modules/.vite` so the next development start performs a fresh dependency optimization.

## Do not fix module resolution with a Vite alias

`dexie` is a normal npm package dependency. Do not map it manually in `resolve.alias`, copy files into `node_modules`, or silence the error by disabling Vite's overlay. Repair the package install instead.

## Runtime assets vs npm dependencies

A successful dependency install and staged runtime assets are different checks:

- `npm run verify:install` verifies direct npm packages
- `npm run verify:assets` verifies MediaPipe/PDF.js files served by AedriAIn
- `npm run setup` stages those runtime assets after dependencies are installed
