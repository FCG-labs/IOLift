const fs = require("fs");
const path = require("path");

/**
 * allows to require a config file with .ts extension
 * @param filePath {string}
 * @returns {*} FIXME type
 */
function requireConfig(filePath) {
  const ext = path.extname(filePath);

  if (ext === '.ts') {
    try {
      require('ts-node/register');
    } catch {
      console.error('ts-node not found. Please install ts-node as a devDependency.');
      process.exit(1);
    }
  } else if (ext === '.js') {
    // do nothing
  } else {
    throw new Error(`Unsupported file extension: ${ext}`);
  }

  return require(filePath);
}

/**
 * @param startDir {string}
 * @param configFileName {string}
 * @returns {*|null} FIXME type
 */
function findAndReadConfigFile(startDir, configFileName) {
  let dir = startDir;

  while (dir !== path.parse(dir).root) {
    const configPath = path.join(dir, configFileName);
    if (fs.existsSync(configPath)) {
      const config = requireConfig(configPath);
      return config;
    }
    dir = path.dirname(dir);
  }

  console.error(`${configFileName} not found.`);
  return null;
}

module.exports = { findAndReadConfigFile };
