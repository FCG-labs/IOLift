declare function IOLift(options?: CodePushOptions): any;
declare namespace IOLift {
    const DEFAULT_ROLLBACK_RETRY_OPTIONS: RollbackRetryOptions;
    const DEFAULT_UPDATE_DIALOG: UpdateDialog;
    function checkForUpdate(deploymentKey?: string, handleBinaryVersionMismatchCallback?: HandleBinaryVersionMismatchCallback): Promise<RemotePackage | null>;
    function getUpdateMetadata(updateState?: UpdateState): Promise<LocalPackage | null>;
    function notifyAppReady(): Promise<StatusReport | void>;
    function allowRestart(): void;
    function disallowRestart(): void;
    function clearUpdates(): void;
    function restartApp(onlyIfUpdateIsPending?: boolean): void;
    function sync(options?: SyncOptions, syncStatusChangedCallback?: SyncStatusChangedCallback, downloadProgressCallback?: DownloadProgressCallback, handleBinaryVersionMismatchCallback?: HandleBinaryVersionMismatchCallback): Promise<SyncStatus>;
    enum InstallMode {
        IMMEDIATE,
        ON_NEXT_RESTART,
        ON_NEXT_RESUME,
        ON_NEXT_SUSPEND
    }
    enum SyncStatus {
        UP_TO_DATE,
        UPDATE_INSTALLED,
        UPDATE_IGNORED,
        UNKNOWN_ERROR,
        SYNC_IN_PROGRESS,
        CHECKING_FOR_UPDATE,
        AWAITING_USER_ACTION,
        DOWNLOADING_PACKAGE,
        INSTALLING_UPDATE
    }
    enum UpdateState {
        RUNNING,
        PENDING,
        LATEST
    }
    enum DeploymentStatus {
        FAILED,
        SUCCEEDED
    }
    enum CheckFrequency {
        ON_APP_START,
        ON_APP_RESUME,
        MANUAL
    }
}
export interface DownloadProgressCallback {
    (progress: DownloadProgress): void;
}
export interface SyncStatusChangedCallback {
    (status: IOLift.SyncStatus): void;
}
export interface HandleBinaryVersionMismatchCallback {
    (update: RemotePackage): void;
}
export interface UpdateCheckRequest {
    app_version: string;
    client_unique_id?: string;
    is_companion?: boolean;
    label?: string;
    package_hash?: string;
}
export type ReleaseVersion = string;
export interface ReleaseHistoryInterface {
    [key: string]: ReleaseInfo;
}
export interface ReleaseInfo {
    enabled: boolean;
    mandatory: boolean;
    downloadUrl: string;
    packageHash: string;
}
export interface UpdateCheckResponse {
    deploymentKey?: string;
    download_url?: string;
    description?: string;
    is_available: boolean;
    is_disabled?: boolean;
    target_binary_range: string;
    label?: string;
    package_hash?: string;
    package_size?: number;
    should_run_binary_version?: boolean;
    update_app_version?: boolean;
    is_mandatory?: boolean;
}
export interface CodePushOptions extends SyncOptions {
    checkFrequency: IOLift.CheckFrequency;
    releaseHistoryFetcher: (updateRequest: UpdateCheckRequest) => Promise<ReleaseHistoryInterface>;
    updateChecker?: (updateRequest: UpdateCheckRequest) => Promise<{
        update_info: UpdateCheckResponse;
    }>;
    onUpdateSuccess?: (label: string) => void;
    onUpdateRollback?: (label: string) => void;
    onDownloadStart?: (label: string) => void;
    onDownloadSuccess?: (label: string) => void;
    onSyncError?: (label: string, error: Error) => void;
}
export interface SyncOptions {
    deploymentKey?: string;
    ignoreFailedUpdates?: boolean;
    rollbackRetryOptions?: RollbackRetryOptions;
    installMode?: IOLift.InstallMode;
    mandatoryInstallMode?: IOLift.InstallMode;
    minimumBackgroundDuration?: number;
    updateDialog?: UpdateDialog | true;
}
export interface UpdateDialog {
    appendReleaseDescription?: boolean;
    descriptionPrefix?: string;
    mandatoryContinueButtonLabel?: string;
    mandatoryUpdateMessage?: string;
    optionalIgnoreButtonLabel?: string;
    optionalInstallButtonLabel?: string;
    optionalUpdateMessage?: string;
    title?: string;
}
export interface RollbackRetryOptions {
    delayInHours?: number;
    maxRetryAttempts?: number;
}
export interface DownloadProgress {
    totalBytes: number;
    receivedBytes: number;
}
export interface LocalPackage extends Package {
    install(installMode: IOLift.InstallMode, minimumBackgroundDuration?: number): Promise<void>;
}
export interface Package {
    appVersion: string;
    deploymentKey: string;
    description: string;
    failedInstall: boolean;
    isFirstRun: boolean;
    isMandatory: boolean;
    isPending: boolean;
    label: string;
    packageHash: string;
    packageSize: number;
}
export interface RemotePackage extends Package {
    download(downloadProgressCallback?: DownloadProgressCallback): Promise<LocalPackage>;
    downloadUrl: string;
}
export interface StatusReport {
    status: IOLift.DeploymentStatus;
    appVersion?: string;
    package?: Package;
    previousDeploymentKey?: string;
    previousLabelOrAppVersion?: string;
}
export interface CliConfigInterface {
    bundleUploader: (source: string, platform: "ios" | "android", identifier?: string) => Promise<{
        downloadUrl: string;
    }>;
    getReleaseHistory: (targetBinaryVersion: string, platform: "ios" | "android", identifier?: string) => Promise<ReleaseHistoryInterface>;
    setReleaseHistory: (targetBinaryVersion: string, jsonFilePath: string, releaseInfo: ReleaseHistoryInterface, platform: "ios" | "android", identifier?: string) => Promise<void>;
}
export interface CodePushContextType {
    isUpdateAvailable: boolean;
    updateInfo: UpdateCheckResponse;
    checkUpdate: () => Promise<void>;
    applyUpdate: () => Promise<void>;
}
export default IOLift;
