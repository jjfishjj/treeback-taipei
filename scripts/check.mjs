import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

async function modules(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await modules(file));
    else if (entry.name.endsWith('.mjs')) files.push(file);
  }
  return files;
}
const files = ['playwright.config.mjs'];
for (const directory of ['public', 'scripts', 'tests']) files.push(...await modules(directory));
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`Syntax checks passed: ${files.length} modules.`);
