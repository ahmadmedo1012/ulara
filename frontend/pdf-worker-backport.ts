// Remove when updating to a PDF.js release with the terminated guard in setupDoc.onFailure.
// Upstream: https://github.com/mozilla/pdf.js/blob/v5.5.207/src/core/worker.js
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { Plugin } from 'vite';

const worker = 'pdfjs-dist/build/pdf.worker.min.mjs';
const digest = '1baa1844c89c80a5b2797c916e75ab29254be46d8e9cb53cb6364d7aad84be36';

export function pdfWorkerBackport(): Plugin {
  return {
    name: 'ulara-pdf-worker-cancellation',
    enforce: 'pre',
    resolveId(id) {
      if (id !== worker + '?url') return;
      const source = readFileSync(createRequire(import.meta.url).resolve(worker), 'utf8');
      // Only this precise distribution uses "a" for the per-document termination flag.
      // A version change requires inspecting upstream; never blindly patch new code.
      if (createHash('sha256').update(source).digest('hex') !== digest) {
        throw new Error('Recheck the PDF.js cancellation backport against the installed worker');
      }
      const fixed = source.replace('function onFailure(e){ensureNotTerminated();',
        'function onFailure(e){if(a)return;');
      const cache = path.resolve(__dirname, 'node_modules/.vite-pdf');
      mkdirSync(cache, { recursive: true });
      const file = path.join(cache, 'pdf.worker.min.mjs');
      writeFileSync(file, fixed);
      // Vite copies and content-hashes this self-hosted asset like the original.
      return file + '?url';
    },
  };
}
