const path = require('path');
const fs = require('fs');

module.exports = () => {
  const projectRoot = process.env.INIT_CWD || process.cwd();
  const pkgPath = path.join(projectRoot, 'package.json');

  if (!fs.existsSync(pkgPath)) {
    throw new Error(`Cannot find package.json at: ${pkgPath}`);
  }

  return require(pkgPath);
}