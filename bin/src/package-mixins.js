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
Object.defineProperty(exports, "__esModule", { value: true });
const react_native_1 = require("react-native");
exports.default = (NativeCodePush) => {
    const remote = () => {
        return {
            download(downloadProgressCallback) {
                return __awaiter(this, void 0, void 0, function* () {
                    if (!this.downloadUrl) {
                        throw new Error("Cannot download an update without a download url");
                    }
                    let downloadProgressSubscription;
                    if (downloadProgressCallback) {
                        const codePushEventEmitter = new react_native_1.NativeEventEmitter(NativeCodePush);
                        downloadProgressSubscription = codePushEventEmitter.addListener("CodePushDownloadProgress", downloadProgressCallback);
                    }
                    try {
                        const updatePackageCopy = Object.assign({}, this);
                        Object.keys(updatePackageCopy).forEach((key) => (typeof updatePackageCopy[key] === 'function') && delete updatePackageCopy[key]);
                        const downloadedPackage = yield NativeCodePush.downloadUpdate(updatePackageCopy, !!downloadProgressCallback);
                        return Object.assign(Object.assign({}, downloadedPackage), local);
                    }
                    finally {
                        downloadProgressSubscription && downloadProgressSubscription.remove();
                    }
                });
            },
            isPending: false
        };
    };
    const local = {
        install(installMode = NativeCodePush.codePushInstallModeOnNextRestart, minimumBackgroundDuration = 0, updateInstalledCallback) {
            return __awaiter(this, void 0, void 0, function* () {
                const localPackage = this;
                const localPackageCopy = Object.assign({}, localPackage);
                yield NativeCodePush.installUpdate(localPackageCopy, installMode, minimumBackgroundDuration);
                updateInstalledCallback && updateInstalledCallback();
                if (installMode == NativeCodePush.codePushInstallModeImmediate) {
                    NativeCodePush.restartApp(false);
                }
                else {
                    NativeCodePush.clearPendingRestart();
                    localPackage.isPending = true;
                }
            });
        },
        isPending: false
    };
    return { local, remote };
};
//# sourceMappingURL=package-mixins.js.map