// Fails when the built JavaScript is over the gzip budget in SPEC.md (120 KB, Chart.js included).
// Sums every .js file under wwwroot (the bundle and lang/), each gzipped on its own as a browser fetches it.
// Source maps and umbraco-package.json aren't counted. Run after the build: `npm run check:size`.
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { gzipSync } from 'zlib';

const BUDGET_BYTES = 120 * 1024;
const root = fileURLToPath(new URL('../../wwwroot/', import.meta.url));

const jsFiles = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory() ? jsFiles(join(dir, entry.name)) : entry.name.endsWith('.js') ? [join(dir, entry.name)] : []);

const kb = (bytes) => (bytes / 1024).toFixed(1);
let raw = 0;
let gzipped = 0;
for (const file of jsFiles(root)) {
    const content = readFileSync(file);
    const size = gzipSync(content, { level: 9 }).length;
    raw += content.length;
    gzipped += size;
    console.log(`[check:size] ${file.slice(root.length)}: ${kb(content.length)} KB raw, ${kb(size)} KB gzip`);
}

console.log(`[check:size] total: ${kb(raw)} KB raw, ${kb(gzipped)} KB gzip (budget ${kb(BUDGET_BYTES)} KB gzip)`);
if (gzipped > BUDGET_BYTES) {
    console.error('[check:size] Over budget. Drop a dependency or raise the budget in SPEC.md and here.');
    process.exit(1);
}
