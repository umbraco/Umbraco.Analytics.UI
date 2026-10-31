import { readFileSync, writeFileSync } from 'fs';

if (process.env.BUILD_BUILDID)
{
    console.log('[Prepublish] Cleansing package.json');

    const packageFile = './package.json';
    const packageJson = JSON.parse(readFileSync(packageFile, 'utf8'));

    // Remove all DevDependencies
    delete packageJson.devDependencies;

    // Remove dependencies: they are bundled into the NuGet package (e.g. chart.js) and the
    // npm package only ships types, so consumers must never install them
    delete packageJson.dependencies;
    delete packageJson.scripts;

    // Write the package.json back to disk
    writeFileSync(packageFile, JSON.stringify(packageJson, null, 2), 'utf8');
}
