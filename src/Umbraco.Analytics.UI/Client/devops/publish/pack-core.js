import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { resolvePackageVersion } from './package-version.js';

// Packs @umbraco/analytics-ui-core from the built dist/core and types/core into ./artifacts, beside the main package.
// The package is assembled in ./temp/core-package from the core/ folder (package.json, README.md), so the main
// package.json is left alone and core/package.json keeps its placeholder version.
const coreFolder = join(dirname(fileURLToPath(import.meta.url)), '../../core');
const stage = resolve('./temp/core-package');
const artifacts = resolve('./artifacts');

for (const built of ['dist/core/analytics-ui-core.js', 'types/core/analytics-ui-core.d.ts'])
{
    if (!existsSync(built)) throw new Error(`${built} not found. Run the build first.`);
}

console.log('[Prepack] Staging @umbraco/analytics-ui-core');
mkdirSync(artifacts, { recursive: true });

const packageJson = JSON.parse(readFileSync(join(coreFolder, 'package.json'), 'utf8'));
packageJson['version'] = resolvePackageVersion();
// core/package.json is private so `npm publish` from core/ can't ship the 0.0.0 placeholder; the staged copy is the real package.
delete packageJson['private'];

rmSync(stage, { recursive: true, force: true });
try
{
    mkdirSync(stage, { recursive: true });
    writeFileSync(join(stage, 'package.json'), JSON.stringify(packageJson, null, 2), 'utf8');
    cpSync('./dist/core', join(stage, 'dist/core'), { recursive: true });
    cpSync('./types/core', join(stage, 'types/core'), { recursive: true });
    copyFileSync(join(coreFolder, 'README.md'), join(stage, 'README.md'));
    copyFileSync('../../../LICENSE.md', join(stage, 'LICENSE.md'));

    // npm is npm.cmd on Windows, which execFileSync can only start through a shell.
    execFileSync('npm', ['pack', '--pack-destination', artifacts], { cwd: stage, stdio: 'inherit', shell: process.platform === 'win32' });
}
finally
{
    rmSync(stage, { recursive: true, force: true });
}
console.log(`version: ${packageJson['version']}`);
