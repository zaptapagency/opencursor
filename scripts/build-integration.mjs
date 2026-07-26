// Bundle integration tests (TS) to CommonJS .js so @vscode/test-cli + mocha
// can load them. `vscode` and `mocha`/`node:*` stay external (runtime-provided).
import esbuild from 'esbuild';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

async function findTests(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await findTests(full)));
    } else if (entry.name.endsWith('.test.ts')) {
      out.push(full);
    }
  }
  return out;
}

const entries = await findTests('test/integration');

if (entries.length > 0) {
  await esbuild.build({
    entryPoints: entries,
    outdir: 'test/integration',
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    external: ['vscode', 'mocha'],
    logLevel: 'info',
  });
}
console.log(`[build-integration] compiled ${entries.length} test file(s).`);
