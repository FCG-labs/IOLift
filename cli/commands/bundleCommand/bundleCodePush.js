const fs = require('fs');
const { prepareToBundleJS } = require('../../functions/prepareToBundleJS');
const { runReactNativeBundleCommand } = require('../../functions/runReactNativeBundleCommand');
const { getReactTempDir } = require('../../functions/getReactTempDir');
const { runHermesEmitBinaryCommand } = require('../../functions/runHermesEmitBinaryCommand');
const { makeCodePushBundle } = require('../../functions/makeCodePushBundle');
const { ROOT_OUTPUT_DIR, ENTRY_FILE } = require('../../constant');

/**
 * @param platform {string} 'ios' | 'android'
 * @param outputRootPath {string}
 * @param entryFile {string}
 * @param jsBundleName {string|undefined}
 * @param bundleDirectory {string}
 * @return {Promise<string>} CodePush bundle file name (equals to packageHash)
 */
async function bundleCodePush(
  platform = 'ios',
  outputRootPath = ROOT_OUTPUT_DIR,
  entryFile = ENTRY_FILE,
  jsBundleName, // JS bundle file name (not CodePush bundle file)
  bundleDirectory, // CodePush bundle output directory
) {
    if (fs.existsSync(outputRootPath)) {
        fs.rmSync(outputRootPath, { recursive: true });
    }

    const OUTPUT_CONTENT_PATH = `${outputRootPath}/CodePush`;
    const DEFAULT_JS_BUNDLE_NAME = platform === 'ios' ? 'main.jsbundle' : 'index.android.bundle';
    const _jsBundleName = jsBundleName || DEFAULT_JS_BUNDLE_NAME; // react-native JS bundle output name
    const SOURCEMAP_OUTPUT = `${outputRootPath}/${_jsBundleName}.map`;

    prepareToBundleJS({ deleteDirs: [outputRootPath, getReactTempDir()], makeDir: OUTPUT_CONTENT_PATH });

    runReactNativeBundleCommand(
      _jsBundleName,
      OUTPUT_CONTENT_PATH,
      platform,
      SOURCEMAP_OUTPUT,
      entryFile,
    );
    console.log('log: JS bundling complete');

    await runHermesEmitBinaryCommand(
      _jsBundleName,
      OUTPUT_CONTENT_PATH,
      SOURCEMAP_OUTPUT,
    );
    console.log('log: Hermes compilation complete');

    const { bundleFileName: codePushBundleFileName } = await makeCodePushBundle(OUTPUT_CONTENT_PATH, bundleDirectory);
    console.log(`log: CodePush bundle created (file path: ./${bundleDirectory}/${codePushBundleFileName})`);

    return codePushBundleFileName;
}

module.exports = { bundleCodePush: bundleCodePush };
