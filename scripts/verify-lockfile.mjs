import { readFile } from 'node:fs/promises';

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const fail = (message) => {
  console.error(`lockfile: FAIL · ${message}`);
  process.exitCode = 1;
};

let manifest;
let lockfile;
try {
  manifest = await readJson('package.json');
} catch (error) {
  fail(`package.json could not be read: ${error instanceof Error ? error.message : String(error)}`);
  process.exit();
}
try {
  lockfile = await readJson('package-lock.json');
} catch {
  fail('package-lock.json is missing or invalid JSON.');
  process.exit();
}

const root = lockfile.packages?.[''];
if (!root) {
  fail('root package entry packages[""] is missing.');
  process.exit();
}

const compareMap = (name, expected = {}, actual = {}) => {
  const expectedEntries = Object.entries(expected).sort(([a], [b]) => a.localeCompare(b));
  const actualEntries = Object.entries(actual).sort(([a], [b]) => a.localeCompare(b));
  if (JSON.stringify(expectedEntries) !== JSON.stringify(actualEntries)) {
    fail(`${name} do not match package.json.`);
    return false;
  }
  return true;
};

let ok = true;
if (root.name !== manifest.name) { fail(`root name is ${root.name ?? 'missing'}, expected ${manifest.name}.`); ok = false; }
if (root.version !== manifest.version) { fail(`root version is ${root.version ?? 'missing'}, expected ${manifest.version}.`); ok = false; }
ok = compareMap('dependencies', manifest.dependencies, root.dependencies) && ok;
ok = compareMap('devDependencies', manifest.devDependencies, root.devDependencies) && ok;
if (manifest.engines?.node !== root.engines?.node) { fail('root Node engine does not match package.json.'); ok = false; }

if (ok) console.log(`lockfile: PASS · ${manifest.name}@${manifest.version}`);
