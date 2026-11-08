import { readFileSync, writeFileSync } from 'fs';
import { resolvePackageVersion } from './package-version.js';

console.log('[Prebuild] Syncing package version');

const packageFile = './package.json';
const packageJson = JSON.parse(readFileSync(packageFile, 'utf8'));

packageJson['version'] = resolvePackageVersion();

writeFileSync(packageFile, JSON.stringify(packageJson, null, 2), 'utf8');

console.log(`version: ${packageJson['version']}`);
