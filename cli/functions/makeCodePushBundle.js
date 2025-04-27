const path = require('path');
const shell = require('shelljs');
const zip = require('../utils/zip');
const {generatePackageHashFromDirectory} = require('../utils/hash-utils');

/**
 * Create a CodePush bundle file and return the information.
 *
 * @param contentsPath {string} The directory path containing the contents to be made into a CodePush bundle (usually the 'build/CodePush' directory))
 * @param bundleDirectory {string} The directory path to save the CodePush bundle file
 * @return {Promise<{ bundleFileName: string }>}
 */
async function makeCodePushBundle(contentsPath, bundleDirectory) {
    const updateContentsZipPath = await zip(contentsPath);

    const packageHash = await generatePackageHashFromDirectory(contentsPath, path.join(contentsPath, '..'));

    shell.mkdir('-p', `./${bundleDirectory}`);
    shell.mv(updateContentsZipPath, `./${bundleDirectory}/${packageHash}`);

    return {
        // To allow the "release" command to get the file and hash value from the result of the "bundle" command,
        // use the hash value as the name of the file.
        bundleFileName: packageHash,
    };
}

module.exports = { makeCodePushBundle };
