"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class BaseVersioning {
    constructor(releaseHistory, sortingMethod) {
        if (this.constructor == BaseVersioning) {
            throw new Error("Abstract classes can't be instantiated.");
        }
        if (releaseHistory == null || sortingMethod == null) {
            throw new Error("param releaseHistory and sortingMethod is needed");
        }
        this.sortingMethod = sortingMethod;
        this.originalReleaseHistory = releaseHistory;
        this.sortedReleaseHistory = Object.entries(releaseHistory).sort(([a], [b]) => this.sortingMethod(a, b));
    }
    get sortedEnabledReleaseHistory() {
        return this.sortedReleaseHistory.filter(([_, bundle]) => bundle.enabled);
    }
    get sortedMandatoryReleaseHistory() {
        return this.sortedEnabledReleaseHistory.filter(([_, bundle]) => bundle.mandatory);
    }
    findLatestRelease() {
        const latestReleaseInfo = this.sortedEnabledReleaseHistory.at(0);
        if (!latestReleaseInfo) {
            throw new Error("There is no latest release.");
        }
        return latestReleaseInfo;
    }
    checkIsMandatory(runtimeVersion) {
        if (this.shouldRollback(runtimeVersion)) {
            return true;
        }
        if (this.sortedMandatoryReleaseHistory.length === 0) {
            return false;
        }
        if (!runtimeVersion) {
            return true;
        }
        const [latestMandatoryVersion, _] = this.sortedMandatoryReleaseHistory[0];
        const [larger] = [latestMandatoryVersion, runtimeVersion].sort(this.sortingMethod);
        return runtimeVersion !== latestMandatoryVersion && larger === latestMandatoryVersion;
    }
    shouldRollback(runtimeVersion) {
        if (!runtimeVersion) {
            return false;
        }
        const [latestRelease] = this.findLatestRelease();
        const [larger] = [latestRelease, runtimeVersion].sort(this.sortingMethod);
        return runtimeVersion !== latestRelease && larger === runtimeVersion;
    }
    shouldRollbackToBinary(runtimeVersion) {
        if (!runtimeVersion) {
            return false;
        }
        const [latestReleaseVersion] = this.findLatestRelease();
        const [binaryAppVersion] = this.sortedReleaseHistory.at(-1);
        return (runtimeVersion !== latestReleaseVersion &&
            this.shouldRollback(runtimeVersion) &&
            latestReleaseVersion === binaryAppVersion);
    }
}
exports.default = BaseVersioning;
//# sourceMappingURL=BaseVersioning.js.map