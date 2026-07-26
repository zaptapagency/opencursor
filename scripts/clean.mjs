// Remove build output directories.
import { rm } from 'node:fs/promises';

for (const dir of ['dist', 'media/webview']) {
  await rm(dir, { recursive: true, force: true });
}
console.log('[clean] removed build output.');
