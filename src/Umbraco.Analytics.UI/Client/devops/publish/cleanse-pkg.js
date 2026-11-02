import { readFileSync, writeFileSync } from 'fs';

if (process.env.BUILD_BUILDID)
{
    console.log('[Prepublish] Cleansing package.json');

    const packageFile = './package.json';
    const packageJson = JSON.parse(readFileSync(packageFile, 'utf8'));

    // Remove all DevDependencies
    delete packageJson.devDependencies;

    // The npm package only ships types; the code is in the NuGet package. Keep only chart.js:
    // `@umbraco/analytics-ui/external/chart.js` re-exports its types, so it must be installed for
    // them to resolve. Its code still comes from our external entry at runtime, never from npm.
    // Pinned to the exact version we bundle (not the range in package.json), so the types match the code.
    const chartJs = JSON.parse(readFileSync('./node_modules/chart.js/package.json', 'utf8'));
    packageJson.dependencies = { 'chart.js': chartJs.version };
    delete packageJson.scripts;

    // Write the package.json back to disk
    writeFileSync(packageFile, JSON.stringify(packageJson, null, 2), 'utf8');
}
