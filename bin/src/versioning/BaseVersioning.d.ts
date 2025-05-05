declare class BaseVersioning {
    [x: string]: any;
    constructor(releaseHistory: any, sortingMethod: any);
    get sortedEnabledReleaseHistory(): any;
    get sortedMandatoryReleaseHistory(): any;
    findLatestRelease(): any;
    checkIsMandatory(runtimeVersion: any): boolean;
    shouldRollback(runtimeVersion: any): boolean;
    shouldRollbackToBinary(runtimeVersion: any): boolean;
}
export default BaseVersioning;
