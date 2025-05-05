/* eslint-disable @typescript-eslint/no-namespace */
import React from 'react';
import { AppState, Platform, NativeModules } from "react-native";
import log from "./logging";
import hoistStatics from 'hoist-non-react-statics';
import SemverVersioning from './versioning/SemverVersioning'
import packageMixins from "./package-mixins";

const NativeCodePush = NativeModules.CodePush;
const PackageMixins = packageMixins(NativeCodePush);

// ① React / Component 유무 검증
if (!React || typeof React.Component !== 'function') {
  throw new Error(
    `Unable to find the "React.Component" class.\n` +
    `Please ensure:\n` +
    ` 1) React and React Native are properly installed (React>=16, RN>=0.60),\n` +
    ` 2) Or call CodePush.sync() directly instead of using the @codePush decorator.`
  );
}


async function checkForUpdate(handleBinaryVersionMismatchCallback = null) {
  /*
   * Before we ask the server if an update exists, we
   * need to retrieve three pieces of information from the
   * native side: deployment key, app version (e.g. 1.0.1)
   * and the hash of the currently running update (if there is one).
   * This allows the client to only receive updates which are targetted
   * for their specific deployment and version and which are actually
   * different from the IOLift update they have already installed.
   */
  const nativeConfig = await getConfiguration();

  // Use dynamically overridden getCurrentPackage() during tests.
  const localPackage = await module.exports.getCurrentPackage();

  /*
   * If the app has a previously installed update, and that update
   * was targetted at the same app version that is currently running,
   * then we want to use its package hash to determine whether a new
   * release has been made on the server. Otherwise, we only need
   * to send the app version to the server, since we are interested
   * in any updates for current binary version, regardless of hash.
   */
  let queryPackage;
  if (localPackage) {
    queryPackage = localPackage;
  } else {
    queryPackage = { appVersion: nativeConfig.appVersion };
    if (Platform.OS === "ios" && nativeConfig.packageHash) {
      queryPackage.packageHash = nativeConfig.packageHash;
    }
  }

  const update = await (async () => {
    try {
      const updateRequest = {
        app_version: queryPackage.appVersion,
        package_hash: queryPackage.packageHash,
        is_companion: nativeConfig.ignoreAppVersion,
        label: queryPackage.label,
        client_unique_id: nativeConfig.clientUniqueId,
      };

      /**
       * @type {updateChecker|undefined}
       * @deprecated
       */
      const updateChecker = sharedCodePushOptions.updateChecker;
      if (updateChecker) {
        const { update_info } = await updateChecker(updateRequest);

        return update_info;
      } else {
        /**
         * `releaseHistory`
         * @type {ReleaseHistoryInterface}
         */
        const releaseHistory = await sharedCodePushOptions.releaseHistoryFetcher(updateRequest);

        /**
         * `runtimeVersion`
         * The version of currently running IOLift update. (It can be undefined if the app is running without IOLift update.)
         * @type {string|undefined}
         */
        const runtimeVersion = updateRequest.label;

        const versioning = new SemverVersioning(releaseHistory);

        const shouldRollbackToBinary = versioning.shouldRollbackToBinary(runtimeVersion)
        if (shouldRollbackToBinary) {
          // Reset to latest major version and restart
          IOLift.clearUpdates();
          IOLift.allowRestart();
          IOLift.restartApp();
        }

        const [latestVersion, latestReleaseInfo] = versioning.findLatestRelease();
        const isMandatory = versioning.checkIsMandatory(runtimeVersion);

        /**
         * Convert the update information decided from `ReleaseHistoryInterface` to be passed to the library core (original IOLift library).
         *
         * @type {UpdateCheckResponse} the interface required by the original IOLift library.
         */
        const updateInfo = {
          download_url: latestReleaseInfo.downloadUrl,
          // (`enabled` will always be true in the release information obtained from the previous process.)
          is_available: latestReleaseInfo.enabled,
          package_hash: latestReleaseInfo.packageHash,
          is_mandatory: isMandatory,
          /**
           * The `ReleaseHistoryInterface` data returned by the `releaseHistoryFetcher` function is
           * based on the assumption that it is compatible with the current runtime binary.
           * (because it is querying the update history deployed for the current binary version)
           * Therefore, the current runtime binary version should be passed as it is.
           */
          target_binary_range: updateRequest.app_version,
          /**
           * Retrieve the update version from the ReleaseHistory and store it in the label.
           * This information can be accessed at runtime through the IOLift bundle metadata.
           */
          label: latestVersion,
          // `false` should be passed to work properly
          update_app_version: false,
          // currently not used.
          description: "",
          // not used at runtime.
          is_disabled: false,
          // not used at runtime.
          package_size: 0,
          // not used at runtime.
          should_run_binary_version: false,
        };

        return updateInfo;
      }
    } catch (error) {
      log(`An error has occurred at update checker :`);
      console.error(error)
      // update will not happen
      return undefined;
    }
  })();

  /*
   * There are four cases where checkForUpdate will resolve to null:
   * ----------------------------------------------------------------
   * 1) The server said there isn't an update. This is the most common case.
   * 2) The server said there is an update but it requires a newer binary version.
   *    This would occur when end-users are running an older binary version than
   *    is available, and IOLift is making sure they don't get an update that
   *    potentially wouldn't be compatible with what they are running.
   * 3) The server said there is an update, but the update's hash is the same as
   *    the currently running update. This should _never_ happen, unless there is a
   *    bug in the server, but we're adding this check just to double-check that the
   *    client app is resilient to a potential issue with the update check.
   * 4) The server said there is an update, but the update's hash is the same as that
   *    of the binary's currently running version. This should only happen in Android -
   *    unlike iOS, we don't attach the binary's hash to the updateCheck request
   *    because we want to avoid having to install diff updates against the binary's
   *    version, which we can't do yet on Android.
   */
  if (!update || update.updateAppVersion ||
      localPackage && (update.packageHash === localPackage.packageHash) ||
      (!localPackage || localPackage._isDebugOnly) && nativeConfig.packageHash === update.packageHash) {
    if (update && update.updateAppVersion) {
      log("An update is available but it is not targeting the binary version of your app.");
      if (handleBinaryVersionMismatchCallback && typeof handleBinaryVersionMismatchCallback === "function") {
        handleBinaryVersionMismatchCallback(update)
      }
    }

    return null;
  } else {
    const remotePackage = { ...update, ...PackageMixins.remote() };
    remotePackage.failedInstall = await NativeCodePush.isFailedUpdate(remotePackage.packageHash);
    return remotePackage;
  }
}

const getConfiguration = async () => {
  return await NativeCodePush.getConfiguration()
};

async function getCurrentPackage() {
  return await getUpdateMetadata(IOLift.UpdateState.LATEST);
}

async function getUpdateMetadata(updateState) {
  let updateMetadata = await NativeCodePush.getUpdateMetadata(updateState || IOLift.UpdateState.RUNNING);
  if (updateMetadata) {
    updateMetadata = {...PackageMixins.local, ...updateMetadata};
    updateMetadata.failedInstall = await NativeCodePush.isFailedUpdate(updateMetadata.packageHash);
    updateMetadata.isFirstRun = await NativeCodePush.isFirstRun(updateMetadata.packageHash);
  }
  return updateMetadata;
}

// This ensures that notifyApplicationReadyInternal is only called once
// in the lifetime of this module instance.
const notifyApplicationReady = (() => {
  let notifyApplicationReadyPromise;
  return () => {
    if (!notifyApplicationReadyPromise) {
      notifyApplicationReadyPromise = notifyApplicationReadyInternal();
    }

    return notifyApplicationReadyPromise;
  };
})();

async function notifyApplicationReadyInternal() {
  await NativeCodePush.notifyApplicationReady();
  const statusReport = await NativeCodePush.getNewStatusReport();
  statusReport && tryReportStatus(statusReport); // Don't wait for this to complete.

  return statusReport;
}

async function tryReportStatus(statusReport:any, retryOnAppResume?:any) {
  try {
    if (statusReport.appVersion) {
      log(`Reporting binary update (${statusReport.appVersion})`);
    } else {
      const label = statusReport.package.label;
      if (statusReport.status === "DeploymentSucceeded") {
        log(`Reporting IOLift update success (${label})`);
        sharedCodePushOptions?.onUpdateSuccess(label);
      } else {
        log(`Reporting IOLift update rollback (${label})`);
        await NativeCodePush.setLatestRollbackInfo(statusReport.package.packageHash);
        sharedCodePushOptions?.onUpdateRollback(label);
      }
    }

    NativeCodePush.recordStatusReported(statusReport);
    retryOnAppResume && retryOnAppResume.remove();
  } catch (e) {
    log(`${e}`)
    log(`Report status failed: ${JSON.stringify(statusReport)}`);
    NativeCodePush.saveStatusReportForRetry(statusReport);
    // Try again when the app resumes
    if (!retryOnAppResume) {
      const resumeListener = AppState.addEventListener("change", async (newState) => {
        if (newState !== "active") return;
        const refreshedStatusReport = await NativeCodePush.getNewStatusReport();
        if (refreshedStatusReport) {
          tryReportStatus(refreshedStatusReport, resumeListener);
        } else {
          resumeListener && resumeListener.remove();
        }
      });
    }
  }
}

async function shouldUpdateBeIgnored(remotePackage, syncOptions) {
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
  } else {
    rollbackRetryOptions = { ...IOLift.DEFAULT_ROLLBACK_RETRY_OPTIONS, ...rollbackRetryOptions };
  }

  if (!validateRollbackRetryOptions(rollbackRetryOptions)) {
    return true;
  }

  const latestRollbackInfo = await NativeCodePush.getLatestRollbackInfo();
  if (!validateLatestRollbackInfo(latestRollbackInfo, remotePackage.packageHash)) {
    log("The latest rollback info is not valid.");
    return true;
  }

  const { delayInHours, maxRetryAttempts } = rollbackRetryOptions;
  const hoursSinceLatestRollback = (Date.now() - latestRollbackInfo.time) / (1000 * 60 * 60);
  if (hoursSinceLatestRollback >= delayInHours && maxRetryAttempts >= latestRollbackInfo.count) {
    log("Previous rollback should be ignored due to rollback retry options.");
    return false;
  }

  return true;
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
    log("The 'delayInHours' rollback retry parameter must be a number.");
    return false;
  }

  if (typeof rollbackRetryOptions.maxRetryAttempts !== "number") {
    log("The 'maxRetryAttempts' rollback retry parameter must be a number.");
    return false;
  }

  if (rollbackRetryOptions.maxRetryAttempts < 1) {
    log("The 'maxRetryAttempts' rollback retry parameter cannot be less then 1.");
    return false;
  }

  return true;
}

async function restartApp(onlyIfUpdateIsPending = false) {
  return await NativeCodePush.restartApp(onlyIfUpdateIsPending);
}

// This function allows only one syncInternal operation to proceed at any given time.
// Parallel calls to sync() while one is ongoing yields IOLift.SyncStatus.SYNC_IN_PROGRESS.
const sync = (() => {
  let syncInProgress = false;
  const setSyncCompleted = () => { syncInProgress = false; };

  return (options = {}, syncStatusChangeCallback, downloadProgressCallback, handleBinaryVersionMismatchCallback) => {
    let syncStatusCallbackWithTryCatch, downloadProgressCallbackWithTryCatch;
    if (typeof syncStatusChangeCallback === "function") {
      syncStatusCallbackWithTryCatch = (...args) => {
        try {
          syncStatusChangeCallback(...args);
        } catch (error) {
          log(`An error has occurred : ${error.stack}`);
        }
      }
    }

    if (typeof downloadProgressCallback === "function") {
      downloadProgressCallbackWithTryCatch = (...args) => {
        try {
          downloadProgressCallback(...args);
        } catch (error) {
          log(`An error has occurred: ${error.stack}`);
        }
      }
    }

    if (syncInProgress) {
      typeof syncStatusCallbackWithTryCatch === "function"
        ? syncStatusCallbackWithTryCatch(IOLift.SyncStatus.SYNC_IN_PROGRESS)
        : log("Sync already in progress.");
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

/*
 * The syncInternal method provides a simple, one-line experience for
 * incorporating the check, download and installation of an update.
 *
 * It simply composes the existing API methods together and adds additional
 * support for respecting mandatory updates, ignoring previously failed
 * releases, and displaying a standard confirmation UI to the end-user
 * when an update is available.
 */
async function syncInternal(options = {}, syncStatusChangeCallback, downloadProgressCallback, handleBinaryVersionMismatchCallback) {
  let resolvedInstallMode;
  const syncOptions = {
    deploymentKey: null,
    ignoreFailedUpdates: true,
    rollbackRetryOptions: null,
    installMode: IOLift.InstallMode.ON_NEXT_RESTART,
    mandatoryInstallMode: IOLift.InstallMode.IMMEDIATE,
    minimumBackgroundDuration: 0,
    updateDialog: null,
    ...options
  };

  syncStatusChangeCallback = typeof syncStatusChangeCallback === "function"
    ? syncStatusChangeCallback
    : (syncStatus) => {
        switch(syncStatus) {
          case IOLift.SyncStatus.CHECKING_FOR_UPDATE:
            log("Checking for update.");
            break;
          case IOLift.SyncStatus.AWAITING_USER_ACTION:
            log("Awaiting user action.");
            break;
          case IOLift.SyncStatus.DOWNLOADING_PACKAGE:
            log("Downloading package.");
            break;
          case IOLift.SyncStatus.INSTALLING_UPDATE:
            log("Installing update.");
            break;
          case IOLift.SyncStatus.UP_TO_DATE:
            log("App is up to date.");
            break;
          case IOLift.SyncStatus.UPDATE_IGNORED:
            log("User cancelled the update.");
            break;
          case IOLift.SyncStatus.UPDATE_INSTALLED:
            if (resolvedInstallMode == IOLift.InstallMode.ON_NEXT_RESTART) {
              log("Update is installed and will be run on the next app restart.");
            } else if (resolvedInstallMode == IOLift.InstallMode.ON_NEXT_RESUME) {
              if (syncOptions.minimumBackgroundDuration > 0) {
                log(`Update is installed and will be run after the app has been in the background for at least ${syncOptions.minimumBackgroundDuration} seconds.`);
              } else {
                log("Update is installed and will be run when the app next resumes.");
              }
            }
            break;
          case IOLift.SyncStatus.UNKNOWN_ERROR:
            log("An unknown error occurred.");
            break;
        }
      };

  let remotePackageLabel;
  try {
    await IOLift.notifyAppReady();

    syncStatusChangeCallback(IOLift.SyncStatus.CHECKING_FOR_UPDATE);
    const remotePackage = await checkForUpdate(handleBinaryVersionMismatchCallback);
    remotePackageLabel = remotePackage?.label;

    const doDownloadAndInstall = async () => {
      syncStatusChangeCallback(IOLift.SyncStatus.DOWNLOADING_PACKAGE);
      sharedCodePushOptions.onDownloadStart?.(remotePackageLabel);

      const localPackage = await remotePackage.download(downloadProgressCallback);

      sharedCodePushOptions.onDownloadSuccess?.(remotePackageLabel);

      // Determine the correct install mode based on whether the update is mandatory or not.
      resolvedInstallMode = localPackage.isMandatory ? syncOptions.mandatoryInstallMode : syncOptions.installMode;

      syncStatusChangeCallback(IOLift.SyncStatus.INSTALLING_UPDATE);
      await localPackage.install(resolvedInstallMode, syncOptions.minimumBackgroundDuration, () => {
        syncStatusChangeCallback(IOLift.SyncStatus.UPDATE_INSTALLED);
      });

      return IOLift.SyncStatus.UPDATE_INSTALLED;
    };

    const updateShouldBeIgnored = await shouldUpdateBeIgnored(remotePackage, syncOptions);

    if (!remotePackage || updateShouldBeIgnored) {
      if (updateShouldBeIgnored) {
          log("An update is available, but it is being ignored due to having been previously rolled back.");
      }

      const currentPackage = await getCurrentPackage();
      if (currentPackage && currentPackage.isPending) {
        syncStatusChangeCallback(IOLift.SyncStatus.UPDATE_INSTALLED);
        return IOLift.SyncStatus.UPDATE_INSTALLED;
      } else {
        syncStatusChangeCallback(IOLift.SyncStatus.UP_TO_DATE);
        return IOLift.SyncStatus.UP_TO_DATE;
      }
    } else if (syncOptions.updateDialog) {
      // updateDialog supports any truthy value (e.g. true, "goo", 12),
      // but we should treat a non-object value as just the default dialog
      if (typeof syncOptions.updateDialog !== "object") {
        syncOptions.updateDialog = IOLift.DEFAULT_UPDATE_DIALOG;
      } else {
        syncOptions.updateDialog = { ...IOLift.DEFAULT_UPDATE_DIALOG, ...syncOptions.updateDialog };
      }

      return await new Promise((resolve, reject) => {
        let message = null;
        let installButtonText = null;

        const dialogButtons = [];

        if (remotePackage.isMandatory) {
          message = syncOptions.updateDialog.mandatoryUpdateMessage;
          installButtonText = syncOptions.updateDialog.mandatoryContinueButtonLabel;
        } else {
          message = syncOptions.updateDialog.optionalUpdateMessage;
          installButtonText = syncOptions.updateDialog.optionalInstallButtonLabel;
          // Since this is an optional update, add a button
          // to allow the end-user to ignore it
          dialogButtons.push({
            text: syncOptions.updateDialog.optionalIgnoreButtonLabel,
            onPress: () => {
              syncStatusChangeCallback(IOLift.SyncStatus.UPDATE_IGNORED);
              resolve(IOLift.SyncStatus.UPDATE_IGNORED);
            }
          });
        }

        // Since the install button should be placed to the
        // right of any other button, add it last
        dialogButtons.push({
          text: installButtonText,
          onPress:() => {
            doDownloadAndInstall()
              .then(resolve, reject);
          }
        })

        // If the update has a description, and the developer
        // explicitly chose to display it, then set that as the message
        if (syncOptions.updateDialog.appendReleaseDescription && remotePackage.description) {
          message += `${syncOptions.updateDialog.descriptionPrefix} ${remotePackage.description}`;
        }

        syncStatusChangeCallback(IOLift.SyncStatus.AWAITING_USER_ACTION);
      });
    } else {
      return await doDownloadAndInstall();
    }
  } catch (error) {
    syncStatusChangeCallback(IOLift.SyncStatus.UNKNOWN_ERROR);
    sharedCodePushOptions?.onSyncError(remotePackageLabel ?? 'unknown', error);
    log(error.message);
    throw error;
  }
};

/**
 * @callback releaseHistoryFetcher
 * @param {UpdateCheckRequest} updateRequest Current package information to check for updates.
 * @returns {Promise<ReleaseHistoryInterface>} The release history of the updates deployed for a specific binary version.
 */

/**
 * @callback updateChecker
 * @param {UpdateCheckRequest} updateRequest Current package information to check for updates.
 * @returns {Promise<{update_info: UpdateCheckResponse}>} The result of the update check. Follows the AppCenter API response interface.
 *
 * @deprecated It will be removed in the next major version.
 */

/**
 * If you pass options once when calling `codePushify`, they will be shared with related functions.
 * @type {{
 *   releaseHistoryFetcher: releaseHistoryFetcher | undefined,
 *   setReleaseHistoryFetcher(releaseHistoryFetcherFunction: releaseHistoryFetcher | undefined): void,
 *
 *   updateChecker: updateChecker | undefined,
 *   setUpdateChecker(updateCheckerFunction: updateChecker | undefined): void,
 *
 *   onUpdateSuccess: (label: string) => void | undefined,
 *   setOnUpdateSuccess(onUpdateSuccessFunction: (label: string) => void | undefined): void,
 *
 *   onUpdateRollback: (label: string) => void | undefined,
 *   setOnUpdateRollback(onUpdateRollbackFunction: (label: string) => void | undefined): void,
 *
 *   onDownloadStart: (label: string) => void | undefined,
 *   setOnDownloadStart(onDownloadStartFunction: (label: string) => void | undefined): void,
 *
 *   onDownloadSuccess: (label: string) => void | undefined,
 *   setOnDownloadSuccess(onDownloadSuccessFunction: (label: string) => void | undefined): void,
 *
 *   onSyncError: (label: string, error: Error) => void | undefined,
 *   setOnSyncError(onSyncErrorFunction: (label: string, error: Error) => void | undefined): void,
 * }}
 */
const sharedCodePushOptions = {
  releaseHistoryFetcher: undefined,
  setReleaseHistoryFetcher(releaseHistoryFetcherFunction) {
    if (!releaseHistoryFetcherFunction || typeof releaseHistoryFetcherFunction !== 'function') throw new Error('Please implement the releaseHistoryFetcher function');
    this.releaseHistoryFetcher = releaseHistoryFetcherFunction;
  },
  updateChecker: undefined,
  setUpdateChecker(updateCheckerFunction) {
    if (!updateCheckerFunction) return;
    if (typeof updateCheckerFunction !== 'function') throw new Error('Please pass a function to updateChecker');
    this.updateChecker = updateCheckerFunction;
  },
  onUpdateSuccess: undefined,
  setOnUpdateSuccess(onUpdateSuccessFunction) {
    if (!onUpdateSuccessFunction) return;
    if (typeof onUpdateSuccessFunction !== 'function') throw new Error('Please pass a function to onUpdateSuccess');
    this.onUpdateSuccess = onUpdateSuccessFunction;
  },
  onUpdateRollback: undefined,
  setOnUpdateRollback(onUpdateRollbackFunction) {
    if (!onUpdateRollbackFunction) return;
    if (typeof onUpdateRollbackFunction !== 'function') throw new Error('Please pass a function to onUpdateRollback');
    this.onUpdateRollback = onUpdateRollbackFunction;
  },
  onDownloadStart: undefined,
  setOnDownloadStart(onDownloadStartFunction) {
    if (!onDownloadStartFunction) return;
    if (typeof onDownloadStartFunction !== 'function') throw new Error('Please pass a function to onDownloadStart');
    this.onDownloadStart = onDownloadStartFunction;
  },
  onDownloadSuccess: undefined,
  setOnDownloadSuccess(onDownloadSuccessFunction) {
    if (!onDownloadSuccessFunction) return;
    if (typeof onDownloadSuccessFunction !== 'function') throw new Error('Please pass a function to onDownloadSuccess');
    this.onDownloadSuccess = onDownloadSuccessFunction;
  },
  onSyncError: undefined,
  setOnSyncError(onSyncErrorFunction) {
    if (!onSyncErrorFunction) return;
    if (typeof onSyncErrorFunction !== 'function') throw new Error('Please pass a function to onSyncError');
    this.onSyncError = onSyncErrorFunction;
  },
}

function IOLift(options: CodePushOptions = {checkFrequency: IOLift.CheckFrequency.ON_APP_START, releaseHistoryFetcher: undefined}) {
  if (options.updateChecker && !options.releaseHistoryFetcher) {
    throw new Error('If you want to use `updateChecker`, pass a no-op function to releaseHistoryFetcher option. (e.g. `releaseHistoryFetcher: async () => ({})`)');
  }

  sharedCodePushOptions.setReleaseHistoryFetcher(options.releaseHistoryFetcher);
  sharedCodePushOptions.setUpdateChecker(options.updateChecker);

  // set telemetry callbacks
  sharedCodePushOptions.setOnUpdateSuccess(options.onUpdateSuccess);
  sharedCodePushOptions.setOnUpdateRollback(options.onUpdateRollback);
  sharedCodePushOptions.setOnDownloadStart(options.onDownloadStart);
  sharedCodePushOptions.setOnDownloadSuccess(options.onDownloadSuccess);
  sharedCodePushOptions.setOnSyncError(options.onSyncError);

  const decorator = (RootComponent) => {
    class CodePushComponent extends React.Component {
      rootComponentRef: React.RefObject<any>;

      constructor(props) {
        super(props);
        this.rootComponentRef = React.createRef();
      }

      componentDidMount() {
        if (options.checkFrequency === IOLift.CheckFrequency.MANUAL) {
          IOLift.notifyAppReady();
        } else {
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
            AppState.addEventListener("change", (newState) => {
              if (newState === "active") {
                IOLift.sync(options, syncStatusCallback, downloadProgressCallback);
              }
            });
          }
        }
      }

      render() {
        // Create a properly typed props object with ref support
        const props: React.ClassAttributes<any> & Record<string, any> = {
          ...this.props
        };

        // Only set ref for class components
        // Function components don't accept refs unless they're wrapped with forwardRef
        if (RootComponent.prototype && RootComponent.prototype.render) {
          // It's a class component, we can set ref directly
          props.ref = this.rootComponentRef;
        } else {
          // For function components, we can't set ref directly
          // Instead, add a warning in development
          if (process.env.NODE_ENV !== 'production') {
            console.error(
              `CodePush: You're using a function component (${RootComponent.displayName || RootComponent.name || 'Component'}) with CodePush. ` +
              `To use refs with function components, wrap your component with React.forwardRef() before applying the CodePush decorator.`
            );
          }
          // We don't set props.ref for function components
        }

        return <RootComponent {...props} />
      }
    }

    return hoistStatics(CodePushComponent, RootComponent);
  }

  if (typeof options === "function") {
    // Infer that the root component was directly passed to us.
    return decorator(options);
  } else {
    return decorator;
  }
}

if (NativeCodePush) {
  Object.assign(IOLift, {
    checkForUpdate,
    getConfiguration,
    getCurrentPackage,
    getUpdateMetadata,
    log,
    notifyAppReady: notifyApplicationReady,
    notifyApplicationReady,
    restartApp,
    sync,
    disallowRestart: NativeCodePush.disallow,
    allowRestart: NativeCodePush.allow,
    clearUpdates: NativeCodePush.clearUpdates,
    InstallMode: {
      IMMEDIATE: NativeCodePush.codePushInstallModeImmediate, // Restart the app immediately
      ON_NEXT_RESTART: NativeCodePush.codePushInstallModeOnNextRestart, // Don't artificially restart the app. Allow the update to be "picked up" on the next app restart
      ON_NEXT_RESUME: NativeCodePush.codePushInstallModeOnNextResume, // Restart the app the next time it is resumed from the background
      ON_NEXT_SUSPEND: NativeCodePush.codePushInstallModeOnNextSuspend // Restart the app _while_ it is in the background,
      // but only after it has been in the background for "minimumBackgroundDuration" seconds (0 by default),
      // so that user context isn't lost unless the app suspension is long enough to not matter
    },
    SyncStatus: {
      UP_TO_DATE: 0, // The running app is up-to-date
      UPDATE_INSTALLED: 1, // The app had an optional/mandatory update that was successfully downloaded and is about to be installed.
      UPDATE_IGNORED: 2, // The app had an optional update which the end user chose to ignore.
      UNKNOWN_ERROR: 3,
      SYNC_IN_PROGRESS: 4, // There is an ongoing sync operation running which prevents the current call from being executed.
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
} else {
  log("The IOLift module doesn't appear to be properly installed. Please double-check that everything is setup correctly.");
}

declare namespace IOLift {
  const DEFAULT_ROLLBACK_RETRY_OPTIONS: RollbackRetryOptions;
  /**
   * Represents the default settings that will be used by the sync method if
   * an update dialog is configured to be displayed.
   */
  const DEFAULT_UPDATE_DIALOG: UpdateDialog;

  /**
   * Asks the IOLift service whether the configured app deployment has an update available.
   *
   * @param deploymentKey The deployment key to use to query the IOLift server for an update.
   *
   * @param handleBinaryVersionMismatchCallback An optional callback for handling target binary version mismatch
   */
  function checkForUpdate(deploymentKey?: string, handleBinaryVersionMismatchCallback?: HandleBinaryVersionMismatchCallback): Promise<RemotePackage | null>;

  /**
   * Retrieves the metadata for an installed update (e.g. description, mandatory).
   *
   * @param updateState The state of the update you want to retrieve the metadata for. Defaults to UpdateState.RUNNING.
   */
  function getUpdateMetadata(updateState?: UpdateState): Promise<LocalPackage|null>;

  /**
   * Notifies the IOLift runtime that an installed update is considered successful.
   */
  function notifyAppReady(): Promise<StatusReport|void>;

  /**
   * Allow IOLift to restart the app.
   */
  function allowRestart(): void;

  /**
   * Forbid IOLift to restart the app.
   */
  function disallowRestart(): void;

  /**
   * Clear all downloaded IOLift updates.
   * This is useful when switching to a different deployment which may have an older release than the current package.
   * Note: we don’t recommend to use this method in scenarios other than that (IOLift will call
   * this method automatically when needed in other cases) as it could lead to unpredictable behavior.
   */
  function clearUpdates(): void;

  /**
   * Immediately restarts the app.
   *
   * @param onlyIfUpdateIsPending Indicates whether you want the restart to no-op if there isn't currently a pending update.
   */
  function restartApp(onlyIfUpdateIsPending?: boolean): void;

  /**
   * Allows checking for an update, downloading it and installing it, all with a single call.
   *
   * @param options Options used to configure the end-user update experience (e.g. show an prompt?, install the update immediately?).
   * @param syncStatusChangedCallback An optional callback that allows tracking the status of the sync operation, as opposed to simply checking the resolved state via the returned Promise.
   * @param downloadProgressCallback An optional callback that allows tracking the progress of an update while it is being downloaded.
   * @param handleBinaryVersionMismatchCallback An optional callback for handling target binary version mismatch
   */
  function sync(options?: SyncOptions, syncStatusChangedCallback?: SyncStatusChangedCallback, downloadProgressCallback?: DownloadProgressCallback, handleBinaryVersionMismatchCallback?: HandleBinaryVersionMismatchCallback): Promise<SyncStatus>;

  /**
   * Indicates when you would like an installed update to actually be applied.
   */
  enum InstallMode {
      /**
       * Indicates that you want to install the update and restart the app immediately.
       */
      IMMEDIATE,

      /**
       * Indicates that you want to install the update, but not forcibly restart the app.
       */
      ON_NEXT_RESTART,

      /**
       * Indicates that you want to install the update, but don't want to restart the app until the next time
       * the end user resumes it from the background. This way, you don't disrupt their current session,
       * but you can get the update in front of them sooner then having to wait for the next natural restart.
       * This value is appropriate for silent installs that can be applied on resume in a non-invasive way.
       */
      ON_NEXT_RESUME,

      /**
       * Indicates that you want to install the update when the app is in the background,
       * but only after it has been in the background for "minimumBackgroundDuration" seconds (0 by default),
       * so that user context isn't lost unless the app suspension is long enough to not matter.
       */
      ON_NEXT_SUSPEND
  }

  /**
   * Indicates the current status of a sync operation.
   */
  enum SyncStatus {
      /**
       * The app is up-to-date with the IOLift server.
       */
      UP_TO_DATE,

      /**
       * An available update has been installed and will be run either immediately after the
       * syncStatusChangedCallback function returns or the next time the app resumes/restarts,
       * depending on the InstallMode specified in SyncOptions
       */
      UPDATE_INSTALLED,

      /**
       * The app had an optional update which the end user chose to ignore.
       * (This is only applicable when the updateDialog is used)
       */
      UPDATE_IGNORED,

      /**
       * The sync operation encountered an unknown error.
       */
      UNKNOWN_ERROR,

      /**
       * There is an ongoing sync operation running which prevents the current call from being executed.
       */
      SYNC_IN_PROGRESS,

      /**
       * The IOLift server is being queried for an update.
       */
      CHECKING_FOR_UPDATE,

      /**
       * An update is available, and a confirmation dialog was shown
       * to the end user. (This is only applicable when the updateDialog is used)
       */
      AWAITING_USER_ACTION,

      /**
       * An available update is being downloaded from the IOLift server.
       */
      DOWNLOADING_PACKAGE,

      /**
       * An available update was downloaded and is about to be installed.
       */
      INSTALLING_UPDATE
  }

  /**
   * Indicates the state that an update is currently in.
   */
  enum UpdateState {
      /**
       * Indicates that an update represents the
       * version of the app that is currently running.
       */
      RUNNING,

      /**
       * Indicates than an update has been installed, but the
       * app hasn't been restarted yet in order to apply it.
       */
      PENDING,

      /**
       * Indicates than an update represents the latest available
       * release, and can be either currently running or pending.
       */
      LATEST
  }

  /**
   * Indicates the status of a deployment (after installing and restarting).
   */
  enum DeploymentStatus {
      /**
       * The deployment failed (and was rolled back).
       */
      FAILED,

      /**
       * The deployment succeeded.
       */
      SUCCEEDED
  }

  /**
   * Indicates when you would like to check for (and install) updates from the IOLift server.
   */
  enum CheckFrequency {
      /**
       * When the app is fully initialized (or more specifically, when the root component is mounted).
       */
      ON_APP_START,

      /**
       * When the app re-enters the foreground.
       */
      ON_APP_RESUME,

      /**
       * Don't automatically check for updates, but only do it when IOLift.sync() is manully called inside app code.
       */
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
    updateChecker?: (updateRequest: UpdateCheckRequest) => Promise<{ update_info: UpdateCheckResponse }>;
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
  /**
   * Whether the deployment succeeded or failed.
   */
  status: IOLift.DeploymentStatus;

  /**
   * The version of the app that was deployed (for a native app upgrade).
   */
  appVersion?: string;

  /**
   * Details of the package that was deployed (or attempted to).
   */
  package?: Package;

  /**
   * Deployment key used when deploying the previous package.
   */
  previousDeploymentKey?: string;

  /**
   * The label (v#) of the package that was upgraded from.
   */
  previousLabelOrAppVersion?: string;
}

export interface CliConfigInterface {
  /**
   * Interface that must be implemented to upload CodePush bundle files to an arbitrary infrastructure.
   *
   * Used in the `release` command, and must return a URL that allows downloading the file after the upload is completed.
   * The URL is recorded in the ReleaseHistory, and the IOLift runtime library downloads the bundle file from this address.
   *
   * @param source The relative path of the generated bundle file. (e.g. build/bundleOutput/1087bc338fc45a961c...)
   * @param platform The target platform of the bundle file. This is the string passed when executing the CLI command. ('ios'/'android')
   * @param identifier An additional identifier string. This can be used to distinguish execution environments by incorporating it into the upload path or file name. This string is passed when executing the CLI command.
   */
  bundleUploader: (
      source: string,
      platform: "ios" | "android",
      identifier?: string,
  ) => Promise<{downloadUrl: string}>;

  /**
   * Interface that must be implemented to retrieve ReleaseHistory information.
   *
   * Use `fetch`, `axios`, or similar methods to fetch the data and return it.
   *
   * @param targetBinaryVersion The target binary app version for which ReleaseHistory information is retrieved. This string is passed when executing the CLI command. (e.g., '1.0.0')
   * @param platform The target platform for which the information is retrieved. This string is passed when executing the CLI command. ('ios'/'android')
   * @param identifier An additional identifier string. This string is passed when executing the CLI command.
   */
  getReleaseHistory: (
      targetBinaryVersion: string,
      platform: "ios" | "android",
      identifier?: string,
  ) => Promise<ReleaseHistoryInterface>;

  /**
   * Interface that must be implemented to create or update ReleaseHistory information.
   *
   * Used in the `create-history`, `release`, and `update-history` commands.
   * The created or modified object and the JSON file path containing the result of the command execution are provided.
   * Implement this function to upload the file or call a REST API to update the release history.
   *
   * @param targetBinaryVersion The target binary app version for the ReleaseHistory. This string is passed when executing the CLI command. (e.g., '1.0.0')
   * @param jsonFilePath The absolute path to a JSON file following the `ReleaseHistoryInterface` structure. The file is created in the project's root directory and deleted when the command execution completes.
   * @param releaseInfo A plain object following the `ReleaseHistoryInterface` structure.
   * @param platform The target platform. This string is passed when executing the CLI command. ('ios'/'android')
   * @param identifier An additional identifier string. This string is passed when executing the CLI command.
   */
  setReleaseHistory: (
      targetBinaryVersion: string,
      jsonFilePath: string,
      releaseInfo: ReleaseHistoryInterface,
      platform: "ios" | "android",
      identifier?: string,
  ) => Promise<void>;
}

export interface CodePushContextType {
    isUpdateAvailable: boolean;
    updateInfo: UpdateCheckResponse;
    checkUpdate: () => Promise<void>;
    applyUpdate: () => Promise<void>;
}

export default IOLift;