/**
 * code based on appcenter-cli
 */

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const shell = require('shelljs');

/**
 * Run Hermes compile CLI command
 *
 * @param bundleName {string} JS bundle file name
 * @param outputPath {string} Path to output .hbc file
 * @param sourcemapOutput {string} Path to output sourcemap file (Warning: if sourcemapOutput points to the outputPath, the sourcemap will be included in the CodePush bundle and increase the deployment size)
 * @param extraHermesFlags {string[]} Additional options to pass to `hermesc` command
 * @return {Promise<void>}
 */
async function runHermesEmitBinaryCommand(
    bundleName,
    outputPath,
    sourcemapOutput,
    extraHermesFlags = [],
) {
    /**
     * @type {string[]}
     */
    const hermesArgs = [
        '-emit-binary',
        '-out',
        path.join(outputPath, bundleName + '.hbc'),
        path.join(outputPath, bundleName),
        ...extraHermesFlags,
    ];
    if (sourcemapOutput) {
        hermesArgs.push('-output-source-map');
    }

    console.log('Converting JS bundle to byte code via Hermes, running command:\n');

    return new Promise((resolve, reject) => {
        try {
            const hermesCommand = getHermesCommand();

            const disableAllWarningsArg = '-w';
            shell.exec(`${hermesCommand} ${hermesArgs.join(' ')} ${disableAllWarningsArg}`);

            // Copy HBC bundle to overwrite JS bundle
            const source = path.join(outputPath, bundleName + '.hbc');
            const destination = path.join(outputPath, bundleName);
            shell.cp(source, destination);
            shell.rm(source);
            resolve();
        } catch (e) {
            reject(e);
        }
    }).then(() => {
        if (!sourcemapOutput) {
            // skip source map compose if source map is not enabled
            return;
        }

        // compose-source-maps.js file path
        const composeSourceMapsPath = getComposeSourceMapsPath();
        if (composeSourceMapsPath === null) {
            throw new Error('react-native compose-source-maps.js scripts is not found');
        }

        const jsCompilerSourceMapFile = path.join(outputPath, bundleName + '.hbc' + '.map');
        if (!fs.existsSync(jsCompilerSourceMapFile)) {
            throw new Error(`sourcemap file ${jsCompilerSourceMapFile} is not found`);
        }

        return new Promise((resolve, reject) => {
            const composeSourceMapsArgs = [
                composeSourceMapsPath,
                sourcemapOutput,
                jsCompilerSourceMapFile,
                '-o',
                sourcemapOutput,
            ];
            const composeSourceMapsProcess = childProcess.spawn('node', composeSourceMapsArgs);
            console.log(`${composeSourceMapsPath} ${composeSourceMapsArgs.join(' ')}`);

            composeSourceMapsProcess.stdout.on('data', (data) => {
                console.log(data.toString().trim());
            });

            composeSourceMapsProcess.stderr.on('data', (data) => {
                console.error(data.toString().trim());
            });

            composeSourceMapsProcess.on('close', (exitCode, signal) => {
                if (exitCode !== 0) {
                    reject(new Error(`"compose-source-maps" command failed (exitCode=${exitCode}, signal=${signal}).`));
                }

                // Delete the HBC sourceMap, otherwise it will be included in 'code-push' bundle as well
                fs.unlink(jsCompilerSourceMapFile, (err) => {
                    if (err != null) {
                        console.error(err);
                        reject(err);
                    }

                    resolve();
                });
            });
        });
    });
}

/**
 * @return {string}
 */
function getHermesCommand() {
    /**
     * @type {(file: string) => boolean}
     */
    const fileExists = (file) => {
        try {
            return fs.statSync(file).isFile();
        } catch (e) {
            return false;
        }
    };
    // Hermes is bundled with react-native since 0.69
    const bundledHermesEngine = path.join(
        getReactNativePackagePath(),
        'sdks',
        'hermesc',
        getHermesOSBin(),
        getHermesOSExe(),
    );
    if (fileExists(bundledHermesEngine)) {
        return bundledHermesEngine;
    }
    throw new Error('Hermes engine binary not found. Please upgrade to react-native 0.69 or later');
}

/**
 * @return {string}
 */
function getHermesOSBin() {
    switch (process.platform) {
        case 'win32':
            return 'win64-bin';
        case 'darwin':
            return 'osx-bin';
        case 'freebsd':
        case 'linux':
        case 'sunos':
        default:
            return 'linux64-bin';
    }
}

/**
 * @return {string}
 */
function getHermesOSExe() {
    const hermesExecutableName = 'hermesc';
    switch (process.platform) {
        case 'win32':
            return hermesExecutableName + '.exe';
        default:
            return hermesExecutableName;
    }
}

/**
 * @return {string | null}
 */
function getComposeSourceMapsPath() {
    // detect if compose-source-maps.js script exists
    const composeSourceMaps = path.join(getReactNativePackagePath(), 'scripts', 'compose-source-maps.js');
    if (fs.existsSync(composeSourceMaps)) {
        return composeSourceMaps;
    }
    return null;
}

/**
 * @return {string}
 */
function getReactNativePackagePath() {
    const result = childProcess.spawnSync('node', [
        '--print',
        "require.resolve('react-native/package.json')",
    ]);
    const packagePath = path.dirname(result.stdout.toString());
    if (result.status === 0 && directoryExistsSync(packagePath)) {
        return packagePath;
    }

    return path.join('node_modules', 'react-native');
}

/**
 * @param dirname {string}
 * @return {boolean}
 */
function directoryExistsSync(dirname) {
    try {
        return fs.statSync(dirname).isDirectory();
    } catch (err) {
        if (err.code !== 'ENOENT') {
            throw err;
        }
    }
    return false;
}

module.exports = { runHermesEmitBinaryCommand };
