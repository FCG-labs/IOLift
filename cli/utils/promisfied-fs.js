/**
 * code based on appcenter-cli
 */

const { promises: fs } = require('fs');
const path = require('path');

/**
 *
 * @param dir {string}
 * @return {Promise<string[]>}
 */
async function walk(dir) {
    const stats = await fs.stat(dir);
    if (stats.isDirectory()) {
        /**
         * @type {string[]}
         */
        let files = [];
        for (const file of await fs.readdir(dir)) {
            files = files.concat(await walk(path.join(dir, file)));
        }
        return files;
    } else {
        return [dir];
    }
}

module.exports = { walk };
