/**
 * code based on appcenter-cli
 */

/**
 * NOTE!!! This utility file is duplicated for use by the CodePush service (for server-driven hashing/
 * integrity checks) and Management SDK (for end-to-end code signing), please keep them in sync.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { isDirectory } = require('./file-utils');
const { walk } = require('./promisfied-fs');

// Do not throw an exception if either of these modules are missing, as they may not be needed by the
// consumer of this file.
const HASH_ALGORITHM = 'sha256';
class PackageManifest {
    /**
     * @type {Map<string, string>}
     * @private
     */
    _map;

    /**
     * @param map {Map<string, string>?}
     * @public
     */
    constructor(map) {
        if (map == null) {
            map = new Map();
        }
        this._map = map;
    }

    /**
     * @return {Map<string, string>}
     * @public
     */
    toMap() {
        return this._map;
    }

    /**
     * @return {string}
     * @public
     */
    computePackageHash() {
        /**
         * @type {string[]}
         */
        let entries = [];
        this._map.forEach((hash, name) => {
            entries.push(name + ':' + hash);
        });

        // Make sure this list is alphabetically ordered so that other clients
        // can also compute this hash easily given the update contents.
        entries = entries.sort();

        return crypto.createHash(HASH_ALGORITHM).update(JSON.stringify(entries)).digest('hex');
    }

    /**
     * @return {string}
     * @public
     */
    serialize() {
        const obj = {};

        this._map.forEach(function (value, key) {
            obj[key] = value;
        });

        return JSON.stringify(obj);
    }

    /**
     * @param filePath {string}
     * @return {string}
     * @public
     */
    static normalizePath(filePath) {
        //replace all backslashes coming from cli running on windows machines by slashes
        return filePath.replace(/\\/g, '/');
    }

    /**
     * @param relativeFilePath {string}
     * @return {boolean}
     * @public
     */
    static isIgnored(relativeFilePath) {
        const __MACOSX = '__MACOSX/';
        const DS_STORE = '.DS_Store';
        const CODEPUSH_METADATA = '.codepushrelease';
        return (
            relativeFilePath.startsWith(__MACOSX) ||
            relativeFilePath === DS_STORE ||
            relativeFilePath.endsWith('/' + DS_STORE) ||
            relativeFilePath === CODEPUSH_METADATA ||
            relativeFilePath.endsWith('/' + CODEPUSH_METADATA)
        );
    }
}

/**
 *
 * @param directoryPath {string}
 * @param basePath {string}
 * @return {Promise<string>}
 */
async function generatePackageHashFromDirectory(directoryPath, basePath) {
    try {
        if (!isDirectory(directoryPath)) {
            throw new Error('Not a directory. Please either create a directory, or use hashFile().');
        }
    } catch (error) {
        throw new Error('Directory does not exist. Please either create a directory, or use hashFile().');
    }

    /**
     * @type {PackageManifest}
     */
    const manifest = await generatePackageManifestFromDirectory(directoryPath, basePath);
    return manifest.computePackageHash();
}

/**
 *
 * @param directoryPath {string}
 * @param basePath {string}
 * @return {Promise<PackageManifest>}
 */
function generatePackageManifestFromDirectory(directoryPath, basePath) {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
        /**
         * @type {Map<string, string>}
         */
        const fileHashesMap = new Map();

        /**
         * @type {string[]}
         */
        const files = await walk(directoryPath);

        if (!files || files.length === 0) {
            reject('Error: Cannot sign the release because no files were found.');
            return;
        }

        /**
         * @type {Promise<void>}
         */
        // Hash the files sequentially, because streaming them in parallel is not necessarily faster
        const generateManifestPromise = files.reduce((soFar, filePath) => {
            return soFar.then(() => {
                /**
                 * @type {string}
                 */
                const relativePath = PackageManifest.normalizePath(path.relative(basePath, filePath));
                if (!PackageManifest.isIgnored(relativePath)) {
                    return hashFile(filePath).then((hash) => {
                        fileHashesMap.set(relativePath, hash);
                    });
                }
            });
        }, Promise.resolve(null));

        generateManifestPromise.then(() => {
            resolve(new PackageManifest(fileHashesMap));
        }, reject);
    });
}

/**
 *
 * @param filePath {string}
 * @return {Promise<string>}
 */
function hashFile(filePath) {
    /**
     * @type {fs.ReadStream}
     */
    const readStream = fs.createReadStream(filePath);
    return hashStream(readStream);
}

/**
 *
 * @param readStream {stream.Readable}
 * @return {Promise<string>}
 */
function hashStream(readStream) {
    return new Promise((resolve, reject) => {
        /**
         * @type {stream.Transform}
         */
        const _hashStream = crypto.createHash(HASH_ALGORITHM)

        readStream
            .on('error', (error) => {
                _hashStream.end();
                reject(error);
            })
            .on('end', () => {
                _hashStream.end();

                /**
                 * @type {Buffer}
                 */
                const buffer = _hashStream.read();
                /**
                 * @type {string}
                 */
                const hash = buffer.toString('hex');

                resolve(hash);
            });

        readStream.pipe(_hashStream);
    });
}

module.exports = { generatePackageHashFromDirectory };
