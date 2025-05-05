import BaseVersioning from "./BaseVersioning";
import { ReleaseHistoryInterface } from "~/IOLift";

class IncrementalVersioning extends BaseVersioning {
  constructor(releaseHistory: ReleaseHistoryInterface) {
    super(releaseHistory, (v1: string, v2: string) => Number(v2) - Number(v1));
  }
}

export default IncrementalVersioning;
