"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const logging_1 = __importDefault(require("./logging"));
const hoist_non_react_statics_1 = __importDefault(require("hoist-non-react-statics"));
const SemverVersioning_1 = __importDefault(require("./versioning/SemverVersioning"));
const package_mixins_1 = __importDefault(require("./package-mixins"));
const NativeCodePush = react_native_1.NativeModules.CodePush;
const PackageMixins = (0, package_mixins_1.default)(NativeCodePush);
if (!react_1.default || typeof react_1.default.Component !== 'function') {
    throw new Error(`Unable to find the "React.Component" class.\n` +
        `Please ensure:\n` +
        ` 1) React and React Native are properly installed (React>=16, RN>=0.60),\n` +
        ` 2) Or call CodePush.sync() directly instead of using the @codePush decorator.`);
}
function checkForUpdate(handleBinaryVersionMismatchCallback = null) {
    return __awaiter(this, void 0, void 0, function* () {
        const nativeConfig = yield getConfiguration();
        const localPackage = yield module.exports.getCurrentPackage();
        let queryPackage;
        if (localPackage) {
            queryPackage = localPackage;
        }
        else {
            queryPackage = { appVersion: nativeConfig.appVersion };
            if (react_native_1.Platform.OS === "ios" && nativeConfig.packageHash) {
                queryPackage.packageHash = nativeConfig.packageHash;
            }
        }
        const update = yield (() => __awaiter(this, void 0, void 0, function* () {
            try {
                const updateRequest = {
                    app_version: queryPackage.appVersion,
                    package_hash: queryPackage.packageHash,
                    is_companion: nativeConfig.ignoreAppVersion,
                    label: queryPackage.label,
                    client_unique_id: nativeConfig.clientUniqueId,
                };
                const updateChecker = sharedCodePushOptions.updateChecker;
                if (updateChecker) {
                    const { update_info } = yield updateChecker(updateRequest);
                    return update_info;
                }
                else {
                    const releaseHistory = yield sharedCodePushOptions.releaseHistoryFetcher(updateRequest);
                    const runtimeVersion = updateRequest.label;
                    const versioning = new SemverVersioning_1.default(releaseHistory);
                    const shouldRollbackToBinary = versioning.shouldRollbackToBinary(runtimeVersion);
                    if (shouldRollbackToBinary) {
                        IOLift.clearUpdates();
                        IOLift.allowRestart();
                        IOLift.restartApp();
                    }
                    const [latestVersion, latestReleaseInfo] = versioning.findLatestRelease();
                    const isMandatory = versioning.checkIsMandatory(runtimeVersion);
                    const updateInfo = {
                        download_url: latestReleaseInfo.downloadUrl,
                        is_available: latestReleaseInfo.enabled,
                        package_hash: latestReleaseInfo.packageHash,
                        is_mandatory: isMandatory,
                        target_binary_range: updateRequest.app_version,
                        label: latestVersion,
                        update_app_version: false,
                        description: "",
                        is_disabled: false,
                        package_size: 0,
                        should_run_binary_version: false,
                    };
                    return updateInfo;
                }
            }
            catch (error) {
                (0, logging_1.default)(`An error has occurred at update checker :`);
                console.error(error);
                return undefined;
            }
        }))();
        if (!update || update.updateAppVersion ||
            localPackage && (update.packageHash === localPackage.packageHash) ||
            (!localPackage || localPackage._isDebugOnly) && nativeConfig.packageHash === update.packageHash) {
            if (update && update.updateAppVersion) {
                (0, logging_1.default)("An update is available but it is not targeting the binary version of your app.");
                if (handleBinaryVersionMismatchCallback && typeof handleBinaryVersionMismatchCallback === "function") {
                    handleBinaryVersionMismatchCallback(update);
                }
            }
            return null;
        }
        else {
            const remotePackage = Object.assign(Object.assign({}, update), PackageMixins.remote());
            remotePackage.failedInstall = yield NativeCodePush.isFailedUpdate(remotePackage.packageHash);
            return remotePackage;
        }
    });
}
const getConfiguration = () => __awaiter(void 0, void 0, void 0, function* () {
    return yield NativeCodePush.getConfiguration();
});
function getCurrentPackage() {
    return __awaiter(this, void 0, void 0, function* () {
        return yield getUpdateMetadata(IOLift.UpdateState.LATEST);
    });
}
function getUpdateMetadata(updateState) {
    return __awaiter(this, void 0, void 0, function* () {
        let updateMetadata = yield NativeCodePush.getUpdateMetadata(updateState || IOLift.UpdateState.RUNNING);
        if (updateMetadata) {
            updateMetadata = Object.assign(Object.assign({}, PackageMixins.local), updateMetadata);
            updateMetadata.failedInstall = yield NativeCodePush.isFailedUpdate(updateMetadata.packageHash);
            updateMetadata.isFirstRun = yield NativeCodePush.isFirstRun(updateMetadata.packageHash);
        }
        return updateMetadata;
    });
}
const notifyApplicationReady = (() => {
    let notifyApplicationReadyPromise;
    return () => {
        if (!notifyApplicationReadyPromise) {
            notifyApplicationReadyPromise = notifyApplicationReadyInternal();
        }
        return notifyApplicationReadyPromise;
    };
})();
function notifyApplicationReadyInternal() {
    return __awaiter(this, void 0, void 0, function* () {
        yield NativeCodePush.notifyApplicationReady();
        const statusReport = yield NativeCodePush.getNewStatusReport();
        statusReport && tryReportStatus(statusReport);
        return statusReport;
    });
}
function tryReportStatus(statusReport, retryOnAppResume) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (statusReport.appVersion) {
                (0, logging_1.default)(`Reporting binary update (${statusReport.appVersion})`);
            }
            else {
                const label = statusReport.package.label;
                if (statusReport.status === "DeploymentSucceeded") {
                    (0, logging_1.default)(`Reporting IOLift update success (${label})`);
                    sharedCodePushOptions === null || sharedCodePushOptions === void 0 ? void 0 : sharedCodePushOptions.onUpdateSuccess(label);
                }
                else {
                    (0, logging_1.default)(`Reporting IOLift update rollback (${label})`);
                    yield NativeCodePush.setLatestRollbackInfo(statusReport.package.packageHash);
                    sharedCodePushOptions === null || sharedCodePushOptions === void 0 ? void 0 : sharedCodePushOptions.onUpdateRollback(label);
                }
            }
            NativeCodePush.recordStatusReported(statusReport);
            retryOnAppResume && retryOnAppResume.remove();
        }
        catch (e) {
            (0, logging_1.default)(`${e}`);
            (0, logging_1.default)(`Report status failed: ${JSON.stringify(statusReport)}`);
            NativeCodePush.saveStatusReportForRetry(statusReport);
            if (!retryOnAppResume) {
                const resumeListener = react_native_1.AppState.addEventListener("change", (newState) => __awaiter(this, void 0, void 0, function* () {
                    if (newState !== "active")
                        return;
                    const refreshedStatusReport = yield NativeCodePush.getNewStatusReport();
                    if (refreshedStatusReport) {
                        tryReportStatus(refreshedStatusReport, resumeListener);
                    }
                    else {
                        resumeListener && resumeListener.remove();
                    }
                }));
            }
        }
    });
}
function shouldUpdateBeIgnored(remotePackage, syncOptions) {
    return __awaiter(this, void 0, void 0, function* () {
        let { rollbackRetryOptions } = syncOptions;
        const isFailedPackage = remotePackage && remotePackage.failedInstall;
        if (!isFailedPackage || !syncOptions.ignoreFailedUpdates) {
            return false;
        }
        if (!rollbackRetryOptions) {
            return true;
        }
        if (typeof rollbackRetryOptions !== "object") {
            rollbackRetryOptions = IOLift.DEFAULT_ROLLBACK_RETRY_OPTIONS;
        }
        else {
            rollbackRetryOptions = Object.assign(Object.assign({}, IOLift.DEFAULT_ROLLBACK_RETRY_OPTIONS), rollbackRetryOptions);
        }
        if (!validateRollbackRetryOptions(rollbackRetryOptions)) {
            return true;
        }
        const latestRollbackInfo = yield NativeCodePush.getLatestRollbackInfo();
        if (!validateLatestRollbackInfo(latestRollbackInfo, remotePackage.packageHash)) {
            (0, logging_1.default)("The latest rollback info is not valid.");
            return true;
        }
        const { delayInHours, maxRetryAttempts } = rollbackRetryOptions;
        const hoursSinceLatestRollback = (Date.now() - latestRollbackInfo.time) / (1000 * 60 * 60);
        if (hoursSinceLatestRollback >= delayInHours && maxRetryAttempts >= latestRollbackInfo.count) {
            (0, logging_1.default)("Previous rollback should be ignored due to rollback retry options.");
            return false;
        }
        return true;
    });
}
function validateLatestRollbackInfo(latestRollbackInfo, packageHash) {
    return latestRollbackInfo &&
        latestRollbackInfo.time &&
        latestRollbackInfo.count &&
        latestRollbackInfo.packageHash &&
        latestRollbackInfo.packageHash === packageHash;
}
function validateRollbackRetryOptions(rollbackRetryOptions) {
    if (typeof rollbackRetryOptions.delayInHours !== "number") {
        (0, logging_1.default)("The 'delayInHours' rollback retry parameter must be a number.");
        return false;
    }
    if (typeof rollbackRetryOptions.maxRetryAttempts !== "number") {
        (0, logging_1.default)("The 'maxRetryAttempts' rollback retry parameter must be a number.");
        return false;
    }
    if (rollbackRetryOptions.maxRetryAttempts < 1) {
        (0, logging_1.default)("The 'maxRetryAttempts' rollback retry parameter cannot be less then 1.");
        return false;
    }
    return true;
}
function restartApp(onlyIfUpdateIsPending = false) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield NativeCodePush.restartApp(onlyIfUpdateIsPending);
    });
}
const sync = (() => {
    let syncInProgress = false;
    const setSyncCompleted = () => { syncInProgress = false; };
    return (options = {}, syncStatusChangeCallback, downloadProgressCallback, handleBinaryVersionMismatchCallback) => {
        let syncStatusCallbackWithTryCatch, downloadProgressCallbackWithTryCatch;
        if (typeof syncStatusChangeCallback === "function") {
            syncStatusCallbackWithTryCatch = (...args) => {
                try {
                    syncStatusChangeCallback(...args);
                }
                catch (error) {
                    (0, logging_1.default)(`An error has occurred : ${error.stack}`);
                }
            };
        }
        if (typeof downloadProgressCallback === "function") {
            downloadProgressCallbackWithTryCatch = (...args) => {
                try {
                    downloadProgressCallback(...args);
                }
                catch (error) {
                    (0, logging_1.default)(`An error has occurred: ${error.stack}`);
                }
            };
        }
        if (syncInProgress) {
            typeof syncStatusCallbackWithTryCatch === "function"
                ? syncStatusCallbackWithTryCatch(IOLift.SyncStatus.SYNC_IN_PROGRESS)
                : (0, logging_1.default)("Sync already in progress.");
            return Promise.resolve(IOLift.SyncStatus.SYNC_IN_PROGRESS);
        }
        syncInProgress = true;
        const syncPromise = syncInternal(options, syncStatusCallbackWithTryCatch, downloadProgressCallbackWithTryCatch, handleBinaryVersionMismatchCallback);
        syncPromise
            .then(setSyncCompleted)
            .catch(setSyncCompleted);
        return syncPromise;
    };
})();
function syncInternal(options = {}, syncStatusChangeCallback, downloadProgressCallback, handleBinaryVersionMismatchCallback) {
    return __awaiter(this, void 0, void 0, function* () {
        let resolvedInstallMode;
        const syncOptions = Object.assign({ deploymentKey: null, ignoreFailedUpdates: true, rollbackRetryOptions: null, installMode: IOLift.InstallMode.ON_NEXT_RESTART, mandatoryInstallMode: IOLift.InstallMode.IMMEDIATE, minimumBackgroundDuration: 0, updateDialog: null }, options);
        syncStatusChangeCallback = typeof syncStatusChangeCallback === "function"
            ? syncStatusChangeCallback
            : (syncStatus) => {
                switch (syncStatus) {
                    case IOLift.SyncStatus.CHECKING_FOR_UPDATE:
                        (0, logging_1.default)("Checking for update.");
                        break;
                    case IOLift.SyncStatus.AWAITING_USER_ACTION:
                        (0, logging_1.default)("Awaiting user action.");
                        break;
                    case IOLift.SyncStatus.DOWNLOADING_PACKAGE:
                        (0, logging_1.default)("Downloading package.");
                        break;
                    case IOLift.SyncStatus.INSTALLING_UPDATE:
                        (0, logging_1.default)("Installing update.");
                        break;
                    case IOLift.SyncStatus.UP_TO_DATE:
                        (0, logging_1.default)("App is up to date.");
                        break;
                    case IOLift.SyncStatus.UPDATE_IGNORED:
                        (0, logging_1.default)("User cancelled the update.");
                        break;
                    case IOLift.SyncStatus.UPDATE_INSTALLED:
                        if (resolvedInstallMode == IOLift.InstallMode.ON_NEXT_RESTART) {
                            (0, logging_1.default)("Update is installed and will be run on the next app restart.");
                        }
                        else if (resolvedInstallMode == IOLift.InstallMode.ON_NEXT_RESUME) {
                            if (syncOptions.minimumBackgroundDuration > 0) {
                                (0, logging_1.default)(`Update is installed and will be run after the app has been in the background for at least ${syncOptions.minimumBackgroundDuration} seconds.`);
                            }
                            else {
                                (0, logging_1.default)("Update is installed and will be run when the app next resumes.");
                            }
                        }
                        break;
                    case IOLift.SyncStatus.UNKNOWN_ERROR:
                        (0, logging_1.default)("An unknown error occurred.");
                        break;
                }
            };
        let remotePackageLabel;
        try {
            yield IOLift.notifyAppReady();
            syncStatusChangeCallback(IOLift.SyncStatus.CHECKING_FOR_UPDATE);
            const remotePackage = yield checkForUpdate(handleBinaryVersionMismatchCallback);
            remotePackageLabel = remotePackage === null || remotePackage === void 0 ? void 0 : remotePackage.label;
            const doDownloadAndInstall = () => __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                syncStatusChangeCallback(IOLift.SyncStatus.DOWNLOADING_PACKAGE);
                (_a = sharedCodePushOptions.onDownloadStart) === null || _a === void 0 ? void 0 : _a.call(sharedCodePushOptions, remotePackageLabel);
                const localPackage = yield remotePackage.download(downloadProgressCallback);
                (_b = sharedCodePushOptions.onDownloadSuccess) === null || _b === void 0 ? void 0 : _b.call(sharedCodePushOptions, remotePackageLabel);
                resolvedInstallMode = localPackage.isMandatory ? syncOptions.mandatoryInstallMode : syncOptions.installMode;
                syncStatusChangeCallback(IOLift.SyncStatus.INSTALLING_UPDATE);
                yield localPackage.install(resolvedInstallMode, syncOptions.minimumBackgroundDuration, () => {
                    syncStatusChangeCallback(IOLift.SyncStatus.UPDATE_INSTALLED);
                });
                return IOLift.SyncStatus.UPDATE_INSTALLED;
            });
            const updateShouldBeIgnored = yield shouldUpdateBeIgnored(remotePackage, syncOptions);
            if (!remotePackage || updateShouldBeIgnored) {
                if (updateShouldBeIgnored) {
                    (0, logging_1.default)("An update is available, but it is being ignored due to having been previously rolled back.");
                }
                const currentPackage = yield getCurrentPackage();
                if (currentPackage && currentPackage.isPending) {
                    syncStatusChangeCallback(IOLift.SyncStatus.UPDATE_INSTALLED);
                    return IOLift.SyncStatus.UPDATE_INSTALLED;
                }
                else {
                    syncStatusChangeCallback(IOLift.SyncStatus.UP_TO_DATE);
                    return IOLift.SyncStatus.UP_TO_DATE;
                }
            }
            else if (syncOptions.updateDialog) {
                if (typeof syncOptions.updateDialog !== "object") {
                    syncOptions.updateDialog = IOLift.DEFAULT_UPDATE_DIALOG;
                }
                else {
                    syncOptions.updateDialog = Object.assign(Object.assign({}, IOLift.DEFAULT_UPDATE_DIALOG), syncOptions.updateDialog);
                }
                return yield new Promise((resolve, reject) => {
                    let message = null;
                    let installButtonText = null;
                    const dialogButtons = [];
                    if (remotePackage.isMandatory) {
                        message = syncOptions.updateDialog.mandatoryUpdateMessage;
                        installButtonText = syncOptions.updateDialog.mandatoryContinueButtonLabel;
                    }
                    else {
                        message = syncOptions.updateDialog.optionalUpdateMessage;
                        installButtonText = syncOptions.updateDialog.optionalInstallButtonLabel;
                        dialogButtons.push({
                            text: syncOptions.updateDialog.optionalIgnoreButtonLabel,
                            onPress: () => {
                                syncStatusChangeCallback(IOLift.SyncStatus.UPDATE_IGNORED);
                                resolve(IOLift.SyncStatus.UPDATE_IGNORED);
                            }
                        });
                    }
                    dialogButtons.push({
                        text: installButtonText,
                        onPress: () => {
                            doDownloadAndInstall()
                                .then(resolve, reject);
                        }
                    });
                    if (syncOptions.updateDialog.appendReleaseDescription && remotePackage.description) {
                        message += `${syncOptions.updateDialog.descriptionPrefix} ${remotePackage.description}`;
                    }
                    syncStatusChangeCallback(IOLift.SyncStatus.AWAITING_USER_ACTION);
                });
            }
            else {
                return yield doDownloadAndInstall();
            }
        }
        catch (error) {
            syncStatusChangeCallback(IOLift.SyncStatus.UNKNOWN_ERROR);
            sharedCodePushOptions === null || sharedCodePushOptions === void 0 ? void 0 : sharedCodePushOptions.onSyncError(remotePackageLabel !== null && remotePackageLabel !== void 0 ? remotePackageLabel : 'unknown', error);
            (0, logging_1.default)(error.message);
            throw error;
        }
    });
}
;
const sharedCodePushOptions = {
    releaseHistoryFetcher: undefined,
    setReleaseHistoryFetcher(releaseHistoryFetcherFunction) {
        if (!releaseHistoryFetcherFunction || typeof releaseHistoryFetcherFunction !== 'function')
            throw new Error('Please implement the releaseHistoryFetcher function');
        this.releaseHistoryFetcher = releaseHistoryFetcherFunction;
    },
    updateChecker: undefined,
    setUpdateChecker(updateCheckerFunction) {
        if (!updateCheckerFunction)
            return;
        if (typeof updateCheckerFunction !== 'function')
            throw new Error('Please pass a function to updateChecker');
        this.updateChecker = updateCheckerFunction;
    },
    onUpdateSuccess: undefined,
    setOnUpdateSuccess(onUpdateSuccessFunction) {
        if (!onUpdateSuccessFunction)
            return;
        if (typeof onUpdateSuccessFunction !== 'function')
            throw new Error('Please pass a function to onUpdateSuccess');
        this.onUpdateSuccess = onUpdateSuccessFunction;
    },
    onUpdateRollback: undefined,
    setOnUpdateRollback(onUpdateRollbackFunction) {
        if (!onUpdateRollbackFunction)
            return;
        if (typeof onUpdateRollbackFunction !== 'function')
            throw new Error('Please pass a function to onUpdateRollback');
        this.onUpdateRollback = onUpdateRollbackFunction;
    },
    onDownloadStart: undefined,
    setOnDownloadStart(onDownloadStartFunction) {
        if (!onDownloadStartFunction)
            return;
        if (typeof onDownloadStartFunction !== 'function')
            throw new Error('Please pass a function to onDownloadStart');
        this.onDownloadStart = onDownloadStartFunction;
    },
    onDownloadSuccess: undefined,
    setOnDownloadSuccess(onDownloadSuccessFunction) {
        if (!onDownloadSuccessFunction)
            return;
        if (typeof onDownloadSuccessFunction !== 'function')
            throw new Error('Please pass a function to onDownloadSuccess');
        this.onDownloadSuccess = onDownloadSuccessFunction;
    },
    onSyncError: undefined,
    setOnSyncError(onSyncErrorFunction) {
        if (!onSyncErrorFunction)
            return;
        if (typeof onSyncErrorFunction !== 'function')
            throw new Error('Please pass a function to onSyncError');
        this.onSyncError = onSyncErrorFunction;
    },
};
function IOLift(options = { checkFrequency: IOLift.CheckFrequency.ON_APP_START, releaseHistoryFetcher: undefined }) {
    if (options.updateChecker && !options.releaseHistoryFetcher) {
        throw new Error('If you want to use `updateChecker`, pass a no-op function to releaseHistoryFetcher option. (e.g. `releaseHistoryFetcher: async () => ({})`)');
    }
    sharedCodePushOptions.setReleaseHistoryFetcher(options.releaseHistoryFetcher);
    sharedCodePushOptions.setUpdateChecker(options.updateChecker);
    sharedCodePushOptions.setOnUpdateSuccess(options.onUpdateSuccess);
    sharedCodePushOptions.setOnUpdateRollback(options.onUpdateRollback);
    sharedCodePushOptions.setOnDownloadStart(options.onDownloadStart);
    sharedCodePushOptions.setOnDownloadSuccess(options.onDownloadSuccess);
    sharedCodePushOptions.setOnSyncError(options.onSyncError);
    const decorator = (RootComponent) => {
        class CodePushComponent extends react_1.default.Component {
            constructor(props) {
                super(props);
                this.rootComponentRef = react_1.default.createRef();
            }
            componentDidMount() {
                if (options.checkFrequency === IOLift.CheckFrequency.MANUAL) {
                    IOLift.notifyAppReady();
                }
                else {
                    const rootComponentInstance = this.rootComponentRef.current;
                    let syncStatusCallback;
                    if (rootComponentInstance && rootComponentInstance.codePushStatusDidChange) {
                        syncStatusCallback = rootComponentInstance.codePushStatusDidChange.bind(rootComponentInstance);
                    }
                    let downloadProgressCallback;
                    if (rootComponentInstance && rootComponentInstance.codePushDownloadDidProgress) {
                        downloadProgressCallback = rootComponentInstance.codePushDownloadDidProgress.bind(rootComponentInstance);
                    }
                    let handleBinaryVersionMismatchCallback;
                    if (rootComponentInstance && rootComponentInstance.codePushOnBinaryVersionMismatch) {
                        handleBinaryVersionMismatchCallback = rootComponentInstance.codePushOnBinaryVersionMismatch.bind(rootComponentInstance);
                    }
                    IOLift.sync(options, syncStatusCallback, downloadProgressCallback, handleBinaryVersionMismatchCallback);
                    if (options.checkFrequency === IOLift.CheckFrequency.ON_APP_RESUME) {
                        react_native_1.AppState.addEventListener("change", (newState) => {
                            if (newState === "active") {
                                IOLift.sync(options, syncStatusCallback, downloadProgressCallback);
                            }
                        });
                    }
                }
            }
            render() {
                const props = Object.assign({}, this.props);
                if (RootComponent.prototype && RootComponent.prototype.render) {
                    props.ref = this.rootComponentRef;
                }
                else {
                    if (process.env.NODE_ENV !== 'production') {
                        console.error(`CodePush: You're using a function component (${RootComponent.displayName || RootComponent.name || 'Component'}) with CodePush. ` +
                            `To use refs with function components, wrap your component with React.forwardRef() before applying the CodePush decorator.`);
                    }
                }
                return react_1.default.createElement(RootComponent, Object.assign({}, props));
            }
        }
        return (0, hoist_non_react_statics_1.default)(CodePushComponent, RootComponent);
    };
    if (typeof options === "function") {
        return decorator(options);
    }
    else {
        return decorator;
    }
}
if (NativeCodePush) {
    Object.assign(IOLift, {
        checkForUpdate,
        getConfiguration,
        getCurrentPackage,
        getUpdateMetadata,
        log: logging_1.default,
        notifyAppReady: notifyApplicationReady,
        notifyApplicationReady,
        restartApp,
        sync,
        disallowRestart: NativeCodePush.disallow,
        allowRestart: NativeCodePush.allow,
        clearUpdates: NativeCodePush.clearUpdates,
        InstallMode: {
            IMMEDIATE: NativeCodePush.codePushInstallModeImmediate,
            ON_NEXT_RESTART: NativeCodePush.codePushInstallModeOnNextRestart,
            ON_NEXT_RESUME: NativeCodePush.codePushInstallModeOnNextResume,
            ON_NEXT_SUSPEND: NativeCodePush.codePushInstallModeOnNextSuspend
        },
        SyncStatus: {
            UP_TO_DATE: 0,
            UPDATE_INSTALLED: 1,
            UPDATE_IGNORED: 2,
            UNKNOWN_ERROR: 3,
            SYNC_IN_PROGRESS: 4,
            CHECKING_FOR_UPDATE: 5,
            AWAITING_USER_ACTION: 6,
            DOWNLOADING_PACKAGE: 7,
            INSTALLING_UPDATE: 8
        },
        CheckFrequency: {
            ON_APP_START: 0,
            ON_APP_RESUME: 1,
            MANUAL: 2
        },
        UpdateState: {
            RUNNING: NativeCodePush.codePushUpdateStateRunning,
            PENDING: NativeCodePush.codePushUpdateStatePending,
            LATEST: NativeCodePush.codePushUpdateStateLatest
        },
        DeploymentStatus: {
            FAILED: "DeploymentFailed",
            SUCCEEDED: "DeploymentSucceeded",
        },
        DEFAULT_UPDATE_DIALOG: {
            appendReleaseDescription: false,
            descriptionPrefix: " Description: ",
            mandatoryContinueButtonLabel: "Continue",
            mandatoryUpdateMessage: "An update is available that must be installed.",
            optionalIgnoreButtonLabel: "Ignore",
            optionalInstallButtonLabel: "Install",
            optionalUpdateMessage: "An update is available. Would you like to install it?",
            title: "Update available"
        },
        DEFAULT_ROLLBACK_RETRY_OPTIONS: {
            delayInHours: 24,
            maxRetryAttempts: 1
        },
    });
}
else {
    (0, logging_1.default)("The IOLift module doesn't appear to be properly installed. Please double-check that everything is setup correctly.");
}
exports.default = IOLift;
//# sourceMappingURL=IOLift.js.map