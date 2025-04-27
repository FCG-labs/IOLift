const shell = require('shelljs');

/**
 * @param deleteDirs {string[]} Directories to delete
 * @param makeDir {string} Directory path to create
 */
function prepareToBundleJS({ deleteDirs, makeDir }) {
    shell.rm('-rf', deleteDirs);
    shell.mkdir('-p', makeDir);
}

module.exports = { prepareToBundleJS };
