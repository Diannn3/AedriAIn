import { access, readFile, readdir, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const manifestPath = path.join(root, 'package.json');

const readJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const exists = async (file) => {
  try {
    await access(file, constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const parseVersion = (value) => {
  const match = String(value).match(/^(\d+)\.(\d+)\.(\d+)/);
  return match ? match.slice(1).map(Number) : null;
};

const atLeast = (actual, minimum) => {
  const a = parseVersion(actual);
  const b = parseVersion(minimum);
  if (!a || !b) return false;
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index];
  }
  return true;
};

const packageJsonPath = (name) => path.join(root, 'node_modules', ...name.split('/'), 'package.json');
const assetFiles = [
  ['MediaPipe model', 'public/mediapipe/models/hand_landmarker.task', 100_000],
  ['PDF.js worker', 'public/pdfjs/pdf.worker.min.mjs', 100_000],
];
const assetDirectories = [
  ['MediaPipe WASM', 'public/mediapipe/wasm', (name) => name.endsWith('.wasm')],
  ['PDF.js CMaps', 'public/pdfjs/cmaps', (name) => !name.startsWith('.')],
  ['PDF.js standard fonts', 'public/pdfjs/standard_fonts', (name) => !name.startsWith('.')],
  ['PDF.js WASM', 'public/pdfjs/wasm', (name) => !name.startsWith('.')],
  ['PDF.js ICC profiles', 'public/pdfjs/iccs', (name) => !name.startsWith('.')],
];

let manifest;
try {
  manifest = await readJson(manifestPath);
} catch (error) {
  console.error(`install: FAIL · cannot read package.json: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const minimumNode = String(manifest.engines?.node ?? '').match(/>=\s*(\d+\.\d+\.\d+)/)?.[1];
const errors = [];
const warnings = [];

if (minimumNode && !atLeast(process.versions.node, minimumNode)) {
  errors.push(`Node ${process.versions.node} is too old; package.json requires ${manifest.engines.node}.`);
}

const expectedPackages = {
  ...(manifest.dependencies ?? {}),
  ...(manifest.devDependencies ?? {}),
};

if (!(await exists(path.join(root, 'node_modules')))) {
  errors.push('node_modules is missing.');
} else {
  for (const [name, expectedVersion] of Object.entries(expectedPackages)) {
    const file = packageJsonPath(name);
    if (!(await exists(file))) {
      errors.push(`${name}@${expectedVersion} is missing from node_modules.`);
      continue;
    }
    try {
      const installed = await readJson(file);
      if (installed.version !== expectedVersion) {
        errors.push(`${name} is ${installed.version ?? 'unknown'}, expected ${expectedVersion}.`);
      }
    } catch (error) {
      errors.push(`${name} metadata could not be read: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

const packageManager = String(manifest.packageManager ?? '');
const expectedNpm = packageManager.match(/^npm@(\d+\.\d+\.\d+)$/)?.[1];
const npmAgent = process.env.npm_config_user_agent ?? '';
const runningNpm = npmAgent.match(/npm\/(\d+\.\d+\.\d+)/)?.[1];
if (expectedNpm && runningNpm && runningNpm !== expectedNpm) {
  warnings.push(`running npm ${runningNpm}; repository packageManager requests npm ${expectedNpm}.`);
}

if (!(await exists(path.join(root, 'package-lock.json')))) {
  warnings.push('package-lock.json is not committed yet; run npm run bootstrap on a networked machine, then commit the generated lockfile.');
}

for (const [label, relative, minimumSize] of assetFiles) {
  const target = path.join(root, relative);
  try {
    const info = await stat(target);
    if (!info.isFile() || info.size < minimumSize) warnings.push(`${label} is not staged; run npm run setup before using hand tracking/PDF features.`);
  } catch {
    warnings.push(`${label} is not staged; run npm run setup before using hand tracking/PDF features.`);
  }
}

for (const [label, relative, predicate] of assetDirectories) {
  try {
    const entries = await readdir(path.join(root, relative));
    if (!entries.some(predicate)) warnings.push(`${label} assets are not staged; run npm run setup.`);
  } catch {
    warnings.push(`${label} assets are not staged; run npm run setup.`);
  }
}

for (const warning of warnings) console.warn(`install: WARN · ${warning}`);

if (errors.length) {
  for (const error of errors) console.error(`install: FAIL · ${error}`);
  console.error('\nDependency state is out of sync with package.json.');
  console.error('Run: npm run bootstrap');
  console.error('If you only need to repair dependencies manually: npm install && npm run setup');
  process.exit(1);
}

console.log(`install: PASS · ${Object.keys(expectedPackages).length} direct packages match package.json`);
