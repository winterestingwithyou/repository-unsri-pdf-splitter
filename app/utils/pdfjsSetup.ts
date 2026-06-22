/**
 * Shared PDF.js initialization.
 *
 * Vite mendukung `new URL('...', import.meta.url)` untuk resolve path ke
 * file dalam node_modules. Worker URL dikalkulasi sekali di module-level
 * sehingga Vite bisa mem-bundle file worker dengan benar.
 *
 * PENTING: Selalu gunakan `.slice(0)` pada ArrayBuffer sebelum diberikan ke
 * getDocument() karena PDF.js men-transfer (detach) ArrayBuffer ke worker
 * thread. Tanpa copy, buffer asli di React state akan ter-detach dan tidak
 * bisa digunakan lagi oleh fungsi lain.
 */

// Resolve URL worker di build time — Vite akan copy file ini ke output dir
const WORKER_URL = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

let initialized = false;

export async function getPdfjsLib() {
  const pdfjsLib = await import("pdfjs-dist");

  if (!initialized) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;
    initialized = true;
  }

  return pdfjsLib;
}
