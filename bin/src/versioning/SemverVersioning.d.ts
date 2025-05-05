import BaseVersioning from "./BaseVersioning";
import { ReleaseHistoryInterface } from "~/IOLift";
declare class SemverVersioning extends BaseVersioning {
    constructor(releaseHistory: ReleaseHistoryInterface);
}
export default SemverVersioning;
