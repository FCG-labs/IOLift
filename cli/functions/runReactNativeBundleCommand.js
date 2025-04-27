/**
 * code based on appcenter-cli
 */

const path = require('path');
const shell = require('shelljs');

/**
 * Run `react-native bundle` CLI command
 *
 * @param bundleName {string} JS bundle file name
 * @param entryFile {string} App code entry file name (default: index.ts)
 * @param outputPath {string} Path to output JS bundle file and assets
 * @param platform {string} Platform (ios | android)
 * @param sourcemapOutput {string} Path to output sourcemap file (Warning: if sourcemapOutput points to the outputPath, the sourcemap will be included in the CodePush bundle and increase the deployment size)
 * @param extraBundlerOptions {string[]} Additional options to pass to `react-native bundle` command
 * @return {void}
 */
function runReactNativeBundleCommand(
    bundleName,
    outputPath,
    platform,
    sourcemapOutput,
    entryFile,
    extraBundlerOptions = [],
) {
    /**
     * @return {string}
     */
    function getCliPath() {
        return path.join('node_modules', '.bin', 'react-native');
    }

    /**
     * @type {string[]}
     */
    const reactNativeBundleArgs = [
        'bundle',
        '--assets-dest',
        outputPath,
        '--bundle-output',
        path.join(outputPath, bundleName),
        '--dev',
        'false',
        '--entry-file',
        entryFile,
        '--platform',
        platform,
        '--sourcemap-output',
        sourcemapOutput,
        ...extraBundlerOptions,
    ];

    console.log('Running "react-native bundle" command:\n');

    shell.exec(`${getCliPath()} ${reactNativeBundleArgs.join(' ')}`);
}

module.exports = { runReactNativeBundleCommand };
