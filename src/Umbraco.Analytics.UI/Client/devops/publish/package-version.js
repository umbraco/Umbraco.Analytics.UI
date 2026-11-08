import { readFileSync } from 'fs';

// The version both npm packages are built with: NPM_PACKAGE_VERSION (the pipeline), else version.json at the repo root.
export function resolvePackageVersion(versionFile = '../../../version.json')
{
    if (process.env.NPM_PACKAGE_VERSION)
    {
        console.log('-- resolved version from environment variable --');
        return process.env.NPM_PACKAGE_VERSION;
    }

    console.log('-- resolved version from version file --');
    return JSON.parse(readFileSync(versionFile, 'utf8'))['version'];
}
