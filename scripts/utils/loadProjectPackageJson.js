const path = require('path');
const fs = require('fs');

module.exports = () => {
  // Attempt to locate the nearest package.json by traversing up from the
  // current working directory (or INIT_CWD if available). This makes the
  // utility more robust when it is invoked from a nested sub-folder such as
  // a post-install script.
  let dir = process.env.INIT_CWD || process.cwd();

  // Walk up the directory tree until we either find a package.json or hit the
  // filesystem root.
  while (true) {
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      return require(pkgPath);
    }
    const parentDir = path.dirname(dir);
    if (parentDir === dir) {
      // We have reached the root of the drive/container.
      throw new Error(
        `Cannot find package.json. Searched from ${process.cwd()} upwards.`
      );
    }
    dir = parentDir;
  }
};