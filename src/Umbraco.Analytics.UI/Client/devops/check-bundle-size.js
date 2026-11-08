// Fails when the built JavaScript is over the gzip budget in SPEC.md (130 KB, Chart.js included).
// Sums every .js file under wwwroot (the bundle and lang/), each gzipped on its own as a browser fetches it.
// Source maps and umbraco-package.json aren't counted. Run after the build: `npm run check:size`.
// The core build (dist/core/analytics-ui-core.js) has its own fixed budget (CORE_BUDGET_BYTES), and must import only
// lit, @umbraco-ui/uui and chart.js (so nothing from @umbraco-cms/), contain no source from node_modules/ (a bundled
// copy of a library), and keep the Lucide ISC licence. `node devops/check-bundle-size.js core [file]` checks the core
// alone; the file defaults to dist/core/analytics-ui-core.js, and its source map is read from beside it.
// Also fails if the main bundle imports the shared Chart.js by a relative path (`./external/...`) instead of
// `@umbraco/analytics-ui/external/chart.js`: the CMS adds a cache-buster query to import map URLs, so a relative
// import would be a second URL, and the browser would load Chart.js twice.
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { gzipSync } from 'zlib';

const BUDGET_BYTES = 130 * 1024;
// The core's gzip budget is fixed at 56 KB (a product decision): about what the Umbraco bundle plus its translations
// weigh, plus the code only the core carries (its own localization and fallback icons). It is not derived from the
// Umbraco budget: raising it is a decision to make on its own, here and in SPEC.md.
const CORE_BUDGET_BYTES = 56 * 1024;
const root = fileURLToPath(new URL('../../wwwroot/', import.meta.url));
const coreOnly = process.argv[2] === 'core';
const coreFile = process.argv[3] ?? fileURLToPath(new URL('../dist/core/analytics-ui-core.js', import.meta.url));

const jsFiles = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory() ? jsFiles(join(dir, entry.name)) : entry.name.endsWith('.js') ? [join(dir, entry.name)] : []);

const kb = (bytes) => (bytes / 1024).toFixed(1);
// The only modules the core may import: the host page provides each one (Lit, UUI and Chart.js by import map).
const ALLOWED_IMPORTS = [/^lit(\/.*)?$/, /^@umbraco-ui\/uui$/, /^chart\.js$/];
// Every module specifier the file imports, read from statement positions only (so text inside a string or template that
// happens to say `from "x"` isn't taken for an import): `import a from "x"`, `export * from "x"`, `import "x"`, `import("x")`.
const importSpecifiers = (content) =>
    [
        ...content.matchAll(/(?:^|[;}\n])[ \t]*(?:import|export)\b[^;"'`()]*?\bfrom\s*["']([^"'\n]+)["']/g),
        ...content.matchAll(/(?:^|[;}\n])[ \t]*import\s*["']([^"'\n]+)["']/g),
        ...content.matchAll(/\bimport\(\s*["']([^"'\n]+)["']\s*\)/g),
    ].map((match) => match[1]);

function checkCore() {
    let content;
    let map;
    try {
        content = readFileSync(coreFile, 'utf8');
        map = JSON.parse(readFileSync(`${coreFile}.map`, 'utf8'));
    } catch {
        console.error(`[check:size] ${coreFile} or its .map is missing. Run \`npm run build\` first.`);
        process.exit(1);
    }
    const gzip = gzipSync(content, { level: 9 }).length;
    console.log(`[check:size] core: ${kb(Buffer.byteLength(content))} KB raw, ${kb(gzip)} KB gzip (budget ${kb(CORE_BUDGET_BYTES)} KB gzip)`);
    const failures = [];
    const specifiers = importSpecifiers(content);
    for (const specifier of new Set(specifiers)) {
        if (!ALLOWED_IMPORTS.some((allowed) => allowed.test(specifier))) {
            failures.push(`it imports "${specifier}": the core may import only lit, @umbraco-ui/uui and chart.js, and nothing from @umbraco-cms/.`);
        }
    }
    for (const library of ['lit', '@umbraco-ui/uui', 'chart.js']) {
        if (!specifiers.some((specifier) => specifier === library || specifier.startsWith(`${library}/`))) failures.push(`it does not import ${library}.`);
    }
    const bundled = (map.sources ?? []).filter((source) => source.includes('node_modules/'));
    if (bundled.length > 0) failures.push(`it contains source from node_modules/ (${bundled[0]}${bundled.length > 1 ? ` and ${bundled.length - 1} more` : ''}): keep libraries external.`);
    if (!content.includes('ISC License')) failures.push('the Lucide ISC licence is missing: the core build must keep legal comments.');
    if (gzip > CORE_BUDGET_BYTES) failures.push('it is over budget. Drop a dependency or raise the budget here and in SPEC.md.');
    if (failures.length > 0) {
        for (const failure of failures) console.error(`[check:size] analytics-ui-core.js: ${failure}`);
        process.exit(1);
    }
}

if (coreOnly) {
    checkCore();
    process.exit(0);
}

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

checkCore();
