import { execFile } from 'node:child_process';
import { access, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = process.cwd();
const outputPath = path.join(root, 'docs', 'FILELIST.txt');
const excludedDirs = new Set(['.git', 'node_modules', 'dist', 'references', 'playwright-report', 'test-results']);

async function gitFiles() {
  try {
    const { stdout } = await execFileAsync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: root });
    const files = stdout.split(/\r?\n/).filter(Boolean);
    const existing = [];
    for (const file of files) {
      try { await access(path.join(root, file)); existing.push(file); } catch { /* staged deletion */ }
    }
    return existing.length ? existing : null;
  } catch {
    return null;
  }
}

async function walk(relative = '') {
  const dir = path.join(root, relative);
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && excludedDirs.has(entry.name)) continue;
    const next = path.posix.join(relative.replaceAll('\\', '/'), entry.name);
    if (entry.isDirectory()) files.push(...await walk(next));
    else files.push(next);
  }
  return files;
}

const files = (await gitFiles()) ?? await walk();
const normalized = files
  .map((file) => file.replaceAll('\\', '/'))
  .sort();

await writeFile(outputPath, `${normalized.join('\n')}\n`);
console.log(`FILELIST: wrote ${normalized.length} paths`);
