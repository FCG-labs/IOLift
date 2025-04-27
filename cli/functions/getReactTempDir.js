/**
 * code based on appcenter-cli
 */

const os = require('os');

/**
 * Return the path of the temporary directory for react-native bundling
 *
 * @return {string}
 */
function getReactTempDir() {
    return `${os.tmpdir()}/react-*`;
}

module.exports = { getReactTempDir };
