import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const project = await mkdtemp(path.join(os.tmpdir(), 'aedriain-install-guard-'));
const verifier = path.resolve('scripts/verify-install.mjs');

const writeJson = (file, value) => writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
const addPackage = async (name, version) => {
  const dir = path.join(project, 'node_modules', ...name.split('/'));
  await mkdir(dir, { recursive: true });
  await writeJson(path.join(dir, 'package.json'), { name, version });
};
const verify = () => spawnSync(process.execPath, [verifier], {
  cwd: project,
  encoding: 'utf8',
  env: { ...process.env, npm_config_user_agent: 'npm/10.9.2 node/v22.16.0' },
});

try {
  await writeJson(path.join(project, 'package.json'), {
    name: 'install-guard-fixture',
    version: '1.0.0',
    packageManager: 'npm@10.9.2',
    dependencies: { dexie: '4.4.4' },
    devDependencies: { vite: '8.0.16' },
    engines: { node: '>=22.12.0' },
  });
  await addPackage('vite', '8.0.16');

  const stale = verify();
  assert.notEqual(stale.status, 0);
  assert.match(`${stale.stdout}\n${stale.stderr}`, /dexie@4\.4\.4 is missing from node_modules/);
  assert.match(`${stale.stdout}\n${stale.stderr}`, /Run: npm run bootstrap/);

  await addPackage('dexie', '4.4.4');
  const repaired = verify();
  assert.equal(repaired.status, 0, repaired.stderr);
  assert.match(repaired.stdout, /install: PASS/);

  await addPackage('dexie', '4.3.0');
  const wrongVersion = verify();
  assert.notEqual(wrongVersion.status, 0);
  assert.match(`${wrongVersion.stdout}\n${wrongVersion.stderr}`, /dexie is 4\.3\.0, expected 4\.4\.4/);

  console.log('install-guard: PASS');
} finally {
  await rm(project, { recursive: true, force: true });
}
