import { rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();

const run = (command, args, options = {}) => {
  console.log(`\n> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};

const runNode = (script, args = []) => run(process.execPath, [script, ...args], { shell: false });
const npmExecPath = process.env.npm_execpath;
const runNpm = (args) => {
  if (npmExecPath) return run(process.execPath, [npmExecPath, ...args], { shell: false });
  const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  return run(command, args);
};

console.log('AedriAIn project bootstrap');
console.log('This synchronizes node_modules with package.json, stages local runtime assets, and clears stale Vite dependency cache.');

const lockCheck = spawnSync(process.execPath, ['scripts/verify-lockfile.mjs'], {
  cwd: root,
  encoding: 'utf8',
  shell: false,
});

if (lockCheck.status === 0) {
  if (lockCheck.stdout?.trim()) console.log(lockCheck.stdout.trim());
  console.log('\nValid package-lock.json found; using npm ci for a clean reproducible install.');
  runNpm(['ci', '--no-audit', '--no-fund']);
} else {
  console.log('\nNo valid lockfile found; using npm install to resolve package.json and generate/update package-lock.json.');
  runNpm(['install', '--no-audit', '--no-fund']);
  runNode('scripts/verify-lockfile.mjs');
}

await rm(path.join(root, 'node_modules', '.vite'), { recursive: true, force: true });
console.log('\nCleared node_modules/.vite so the next dev start performs a fresh dependency optimization.');

runNpm(['run', 'setup']);
runNode('scripts/verify-install.mjs');
runNpm(['run', 'verify:assets']);

console.log('\nAedriAIn bootstrap complete.');
console.log('Next: npm run desktop:dev');
console.log('After the first successful networked bootstrap, commit package-lock.json.');
