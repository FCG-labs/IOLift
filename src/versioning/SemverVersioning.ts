import Semver from "semver";
import BaseVersioning from "./BaseVersioning";
import { ReleaseHistoryInterface } from "~/IOLift";

class SemverVersioning extends BaseVersioning {
  constructor(releaseHistory: ReleaseHistoryInterface) {
    super(releaseHistory, (v1: string, v2: string) => (Semver.gt(v1, v2) ? -1 : 1));
  }
}

export default SemverVersioning;
