// esbuild bundler for the extension host (Node/CommonJS target).
import esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  sourcemap: true,
  // `vscode` is provided by the runtime, never bundle it.
  external: ['vscode'],
  logLevel: 'info',
  minify: process.env.NODE_ENV === 'production',
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log('[esbuild] watching extension host...');
} else {
  await esbuild.build(options);
  console.log('[esbuild] extension host built.');
}
