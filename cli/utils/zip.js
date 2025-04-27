/**
 * code based on appcenter-cli
 */

const fs = require('fs');
const path = require('path');
const yazl = require('yazl');
const { generateRandomFilename, normalizePath, isDirectory } = require('./file-utils');
const { walk } = require('./promisfied-fs');

/**
 * @typedef {{ sourceLocation: string, targetLocation: string }} ReleaseFile
 */

/**
 * @param updateContentsPath {string}
 * @return {Promise<string>}
 */
function zip(updateContentsPath) {

    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
        /**
         * @type {ReleaseFile[]}
         */
        const releaseFiles = [];

        try {
            if (!isDirectory(updateContentsPath)) {
                releaseFiles.push({
                    sourceLocation: updateContentsPath,
                    targetLocation: normalizePath(path.basename(updateContentsPath)), // Put the file in the root
                });
            }
        } catch (error) {
            error.message = error.message + ' Make sure you have added the platform you are making a release to.`.';
            reject(error);
        }

        /**
         * @type {string}
         */
        const directoryPath = updateContentsPath;
        const baseDirectoryPath = path.join(directoryPath, '..'); // For legacy reasons, put the root directory in the zip

        /**
         * @type {string[]}
         */
        const files = await walk(updateContentsPath);

        files.forEach((filePath) => {
            /**
             * @type {string}
             */
            const relativePath = path.relative(baseDirectoryPath, filePath);
            releaseFiles.push({
                sourceLocation: filePath,
                targetLocation: normalizePath(relativePath),
            });
        });

        /**
         * @type {string}
         */
        const packagePath = path.join(process.cwd(), generateRandomFilename(15) + '.zip');
        const zipFile = new yazl.ZipFile();
        /**
         * @type {fs.WriteStream}
         */
        const writeStream = fs.createWriteStream(packagePath);

        zipFile.outputStream
            .pipe(writeStream)
            .on('error', (error) => {
                reject(error);
            })
            .on('close', () => {
                resolve(packagePath);
            });

        releaseFiles.forEach((releaseFile) => {
            zipFile.addFile(releaseFile.sourceLocation, releaseFile.targetLocation);
        });

        zipFile.end();
    });
}

module.exports = zip;
