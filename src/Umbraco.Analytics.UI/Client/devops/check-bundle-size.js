// Fails when the built JavaScript is over the gzip budget in SPEC.md (120 KB, Chart.js included).
// Sums every .js file under wwwroot (the bundle and lang/), each gzipped on its own as a browser fetches it.
// Source maps and umbraco-package.json aren't counted. Run after the build: `npm run check:size`.
// Also fails if the main bundle imports the shared Chart.js by a relative path (`./external/...`) instead of
// `@umbraco/analytics-ui/external/chart.js`: the CMS adds a cache-buster query to import map URLs, so a relative
// import would be a second URL, and the browser would load Chart.js twice.
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

const main = readFileSync(join(root, 'umbraco-analytics-ui.js'), 'utf8');
if (/(from|import)\s*\(?\s*["']\.{1,2}\/external\//.test(main)) {
    console.error('[check:size] umbraco-analytics-ui.js imports ./external/ by a relative path. Import @umbraco/analytics-ui/external/chart.js instead.');
    process.exit(1);
}
if (!main.includes('"@umbraco/analytics-ui/external/chart.js"')) {
    console.error('[check:size] umbraco-analytics-ui.js does not import @umbraco/analytics-ui/external/chart.js, so it may bundle its own Chart.js.');
    process.exit(1);
}

console.log(`[check:size] total: ${kb(raw)} KB raw, ${kb(gzipped)} KB gzip (budget ${kb(BUDGET_BYTES)} KB gzip)`);
if (gzipped > BUDGET_BYTES) {
    console.error('[check:size] Over budget. Drop a dependency or raise the budget in SPEC.md and here.');
    process.exit(1);
}
