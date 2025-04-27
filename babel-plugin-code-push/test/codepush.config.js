const {
  SemverVersioning,
} = require("@fcg-labs/iolift/versioning");

class CustomVersioning extends SemverVersioning {
  constructor() {
    super();
  }
}

module.exports = {
  bundleHost: "bundleHost",
  runtimeVersion: "runtimeVersion",
  versioning: CustomVersioning,
};
