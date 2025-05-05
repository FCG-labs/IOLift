import BaseVersioning from "./BaseVersioning";
import { ReleaseHistoryInterface } from "~/IOLift";
declare class IncrementalVersioning extends BaseVersioning {
    constructor(releaseHistory: ReleaseHistoryInterface);
}
export default IncrementalVersioning;
