/**
 * code based on appcenter-cli
 */

const fs = require('fs');

/**
 *
 * @param path {string}
 * @return {boolean}
 */
function isDirectory(path) {
    return fs.statSync(path).isDirectory();
}

/**
 *
 * @param length {number}
 * @return {string}
 */
function generateRandomFilename(length) {
    let filename = '';
    const validChar = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        filename += validChar.charAt(Math.floor(Math.random() * validChar.length));
    }

    return filename;
}

/**
 *
 * @param filePath {string}
 * @return {string}
 */
function normalizePath(filePath) {
    //replace all backslashes coming from cli running on windows machines by slashes
    return filePath.replace(/\\/g, '/');
}

module.exports = { isDirectory, generateRandomFilename, normalizePath };
