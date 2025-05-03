"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const fs = require("fs");
const mkdirp = require("mkdirp");
const path = require("path");
const slash = require("slash");
const code_push_plugin_testing_framework_1 = require("code-push-plugin-testing-framework");
const Q = require("q");
const del = require("del");
class RNAndroid extends code_push_plugin_testing_framework_1.Platform.Android {
    constructor() {
        super(new code_push_plugin_testing_framework_1.Platform.AndroidEmulatorManager());
    }
    getBundleName() {
        return "index.android.bundle";
    }
    isDiffsSupported() {
        return false;
    }
    getBinaryPath(projectDirectory) {
        return path.join(projectDirectory, code_push_plugin_testing_framework_1.TestConfig.TestAppName, "android", "app", "build", "outputs", "apk", "release", "app-release.apk");
    }
    installPlatform(projectDirectory) {
        const innerprojectDirectory = path.join(projectDirectory, code_push_plugin_testing_framework_1.TestConfig.TestAppName);
        const gradleContent = slash(path.join(innerprojectDirectory, "node_modules", "react-native-code-push", "android", "codepush.gradle"));
        const buildGradle = path.join(innerprojectDirectory, "android", "app", "build.gradle");
        code_push_plugin_testing_framework_1.TestUtil.replaceString(buildGradle, "apply from: file\\(\"../../node_modules/@react-native-community/cli-platform-android/native_modules.gradle\"\\); applyNativeModulesAppBuildGradle\\(project\\)", "apply from: file(\"../../node_modules/@react-native-community/cli-platform-android/native_modules.gradle\"); applyNativeModulesAppBuildGradle(project)\napply from: \"" + gradleContent + "\"");
        const settingsGradle = path.join(innerprojectDirectory, "android", "settings.gradle");
        code_push_plugin_testing_framework_1.TestUtil.replaceString(settingsGradle, "include ':app'", "include ':app', ':react-native-code-push'\nproject(':react-native-code-push').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-code-push/android/app')");
        code_push_plugin_testing_framework_1.TestUtil.replaceString(buildGradle, "versionName \"1.0\"", "versionName \"1.0.0\"");
        code_push_plugin_testing_framework_1.TestUtil.replaceString(path.join(innerprojectDirectory, "android", "app", "src", "main", "AndroidManifest.xml"), "android:versionName=\"1.0\"", "android:versionName=\"1.0.0\"");
        const string = path.join(innerprojectDirectory, "android", "app", "src", "main", "res", "values", "strings.xml");
        const AndroidManifest = path.join(innerprojectDirectory, "android", "app", "src", "main", "AndroidManifest.xml");
        code_push_plugin_testing_framework_1.TestUtil.replaceString(string, code_push_plugin_testing_framework_1.TestUtil.SERVER_URL_PLACEHOLDER, this.getServerUrl());
        code_push_plugin_testing_framework_1.TestUtil.replaceString(string, code_push_plugin_testing_framework_1.TestUtil.ANDROID_KEY_PLACEHOLDER, this.getDefaultDeploymentKey());
        code_push_plugin_testing_framework_1.TestUtil.replaceString(AndroidManifest, "android:allowBackup=\"false\"", "android:allowBackup=\"false\"" + "\n\t" + "android:usesCleartextTraffic=\"true\"");
        return Q(null);
    }
    installApp(projectDirectory) {
        const androidDirectory = path.join(projectDirectory, code_push_plugin_testing_framework_1.TestConfig.TestAppName, "android");
        return code_push_plugin_testing_framework_1.TestUtil.getProcessOutput("adb install -r " + this.getBinaryPath(projectDirectory), { cwd: androidDirectory }).then(() => { return null; });
    }
    buildFunction(androidDirectory) {
        const gradlewCommand = process.platform === "darwin" || process.platform === "linux" ? "./gradlew" : "gradlew";
        return code_push_plugin_testing_framework_1.TestUtil.getProcessOutput(`${gradlewCommand} clean`, { noLogStdOut: true, cwd: androidDirectory })
            .then(() => code_push_plugin_testing_framework_1.TestUtil.getProcessOutput(`${gradlewCommand} assembleRelease --daemon`, { noLogStdOut: true, cwd: androidDirectory }))
            .then(() => { return null; });
    }
    buildApp(projectDirectory) {
        const androidDirectory = path.join(projectDirectory, code_push_plugin_testing_framework_1.TestConfig.TestAppName, "android");
        try {
            return this.buildFunction(androidDirectory);
        }
        catch (_a) {
            return this.buildFunction(androidDirectory);
        }
    }
}
class RNIOS extends code_push_plugin_testing_framework_1.Platform.IOS {
    constructor() {
        super(new code_push_plugin_testing_framework_1.Platform.IOSEmulatorManager());
    }
    getBundleName() {
        return "main.jsbundle";
    }
    isDiffsSupported() {
        return true;
    }
    getBinaryPath(projectDirectory) {
        return path.join(projectDirectory, code_push_plugin_testing_framework_1.TestConfig.TestAppName, "ios", "build", "Build", "Products", "Release-iphonesimulator", code_push_plugin_testing_framework_1.TestConfig.TestAppName + ".app");
    }
    installPlatform(projectDirectory) {
        const iOSProject = path.join(projectDirectory, code_push_plugin_testing_framework_1.TestConfig.TestAppName, "ios");
        const infoPlistPath = path.join(iOSProject, code_push_plugin_testing_framework_1.TestConfig.TestAppName, "Info.plist");
        const appDelegatePath = path.join(iOSProject, code_push_plugin_testing_framework_1.TestConfig.TestAppName, "AppDelegate.mm");
        return code_push_plugin_testing_framework_1.TestUtil.getProcessOutput("pod install", { cwd: iOSProject })
            .then(code_push_plugin_testing_framework_1.TestUtil.replaceString.bind(undefined, infoPlistPath, "</dict>\n</plist>", "<key>CodePushDeploymentKey</key>\n\t<string>" + this.getDefaultDeploymentKey() + "</string>\n\t<key>CodePushServerURL</key>\n\t<string>" + this.getServerUrl() + "</string>\n\t</dict>\n</plist>"))
            .then(code_push_plugin_testing_framework_1.TestUtil.replaceString.bind(undefined, infoPlistPath, "1.0", "1.0.0"))
            .then(code_push_plugin_testing_framework_1.TestUtil.replaceString.bind(undefined, infoPlistPath, "\\$\\(MARKETING_VERSION\\)", "1.0.0"))
            .then(code_push_plugin_testing_framework_1.TestUtil.replaceString.bind(undefined, path.join(iOSProject, code_push_plugin_testing_framework_1.TestConfig.TestAppName + ".xcodeproj", "project.pbxproj"), "\"[$][(]inherited[)]\",\\s*[)];", "\"$(inherited)\"\n\t\t\t\t);"))
            .then(code_push_plugin_testing_framework_1.TestUtil.replaceString.bind(undefined, path.join(iOSProject, code_push_plugin_testing_framework_1.TestConfig.TestAppName + ".xcodeproj", "project.pbxproj"), "PRODUCT_BUNDLE_IDENTIFIER = [^;]*", "PRODUCT_BUNDLE_IDENTIFIER = \"" + code_push_plugin_testing_framework_1.TestConfig.TestNamespace + "\""))
            .then(code_push_plugin_testing_framework_1.TestUtil.copyFile.bind(undefined, path.join(code_push_plugin_testing_framework_1.TestConfig.templatePath, "ios", code_push_plugin_testing_framework_1.TestConfig.TestAppName, "AppDelegate.mm"), appDelegatePath, true))
            .then(code_push_plugin_testing_framework_1.TestUtil.replaceString.bind(undefined, appDelegatePath, code_push_plugin_testing_framework_1.TestUtil.CODE_PUSH_TEST_APP_NAME_PLACEHOLDER, code_push_plugin_testing_framework_1.TestConfig.TestAppName));
    }
    installApp(projectDirectory) {
        return code_push_plugin_testing_framework_1.TestUtil.getProcessOutput("xcrun simctl install booted " + this.getBinaryPath(projectDirectory)).then(() => { return null; });
    }
    buildApp(projectDirectory) {
        const iOSProject = path.join(projectDirectory, code_push_plugin_testing_framework_1.TestConfig.TestAppName, "ios");
        return this.getEmulatorManager().getTargetEmulator()
            .then((targetEmulator) => {
            return code_push_plugin_testing_framework_1.TestUtil.getProcessOutput("xcodebuild -workspace " + path.join(iOSProject, code_push_plugin_testing_framework_1.TestConfig.TestAppName) + ".xcworkspace -scheme " + code_push_plugin_testing_framework_1.TestConfig.TestAppName +
                " -configuration Release -destination \"platform=iOS Simulator,id=" + targetEmulator + "\" -derivedDataPath build EXCLUDED_ARCHS=arm64", { cwd: iOSProject, timeout: 30 * 60 * 1000, maxBuffer: 1024 * 1024 * 5000, noLogStdOut: true });
        })
            .then(() => { return null; }, (error) => {
            console.info(error);
            if (!RNIOS.iosFirstBuild[projectDirectory]) {
                const iosBuildFolder = path.join(iOSProject, "build");
                if (fs.existsSync(iosBuildFolder)) {
                    del.sync([iosBuildFolder], { force: true });
                }
                RNIOS.iosFirstBuild[projectDirectory] = true;
                return this.buildApp(projectDirectory);
            }
            return null;
        });
    }
}
RNIOS.iosFirstBuild = {};
const supportedTargetPlatforms = [new RNAndroid(), new RNIOS()];
class RNProjectManager extends code_push_plugin_testing_framework_1.ProjectManager {
    getPluginName() {
        return "React-Native";
    }
    copyTemplate(templatePath, projectDirectory) {
        function copyDirectoryRecursively(directoryFrom, directoryTo) {
            const promises = [];
            fs.readdirSync(directoryFrom).forEach(file => {
                let fileStats;
                const fileInFrom = path.join(directoryFrom, file);
                const fileInTo = path.join(directoryTo, file);
                try {
                    fileStats = fs.statSync(fileInFrom);
                }
                catch (e) { }
                if (fileStats && fileStats.isFile()) {
                    promises.push(code_push_plugin_testing_framework_1.TestUtil.copyFile(fileInFrom, fileInTo, true));
                }
                else {
                    if (!fs.existsSync(fileInTo))
                        mkdirp.sync(fileInTo);
                    promises.push(copyDirectoryRecursively(fileInFrom, fileInTo));
                }
            });
            return Q.all(promises).then(() => { return null; });
        }
        return copyDirectoryRecursively(templatePath, path.join(projectDirectory, code_push_plugin_testing_framework_1.TestConfig.TestAppName));
    }
    setupProject(projectDirectory, templatePath, appName, appNamespace, version) {
        if (fs.existsSync(projectDirectory)) {
            del.sync([projectDirectory], { force: true });
        }
        mkdirp.sync(projectDirectory);
        return code_push_plugin_testing_framework_1.TestUtil.getProcessOutput("npx react-native init " + appName + " --version 0.71.3 --install-pods", { cwd: projectDirectory, timeout: 30 * 60 * 1000 })
            .then((e) => { console.log(`"npx react-native init ${appName}" success. cwd=${projectDirectory}`); return e; })
            .then(this.copyTemplate.bind(this, templatePath, projectDirectory))
            .then(code_push_plugin_testing_framework_1.TestUtil.getProcessOutput.bind(undefined, code_push_plugin_testing_framework_1.TestConfig.thisPluginInstallString, { cwd: path.join(projectDirectory, code_push_plugin_testing_framework_1.TestConfig.TestAppName) }))
            .then(() => { return null; })
            .catch((error) => {
            console.log(`"npx react-native init ${appName} failed". cwd=${projectDirectory}`, error);
            throw new Error(error);
        });
    }
    setupScenario(projectDirectory, appId, templatePath, jsPath, targetPlatform, version) {
        if (RNProjectManager.currentScenario[projectDirectory] === jsPath)
            return Q(null);
        RNProjectManager.currentScenario[projectDirectory] = jsPath;
        RNProjectManager.currentScenarioHasBuilt[projectDirectory] = false;
        const indexHtml = "index.js";
        const templateIndexPath = path.join(templatePath, indexHtml);
        const destinationIndexPath = path.join(projectDirectory, code_push_plugin_testing_framework_1.TestConfig.TestAppName, indexHtml);
        const scenarioJs = "scenarios/" + jsPath;
        console.log("Setting up scenario " + jsPath + " in " + projectDirectory);
        return code_push_plugin_testing_framework_1.TestUtil.copyFile(templateIndexPath, destinationIndexPath, true)
            .then(code_push_plugin_testing_framework_1.TestUtil.replaceString.bind(undefined, destinationIndexPath, code_push_plugin_testing_framework_1.TestUtil.CODE_PUSH_TEST_APP_NAME_PLACEHOLDER, code_push_plugin_testing_framework_1.TestConfig.TestAppName))
            .then(code_push_plugin_testing_framework_1.TestUtil.replaceString.bind(undefined, destinationIndexPath, code_push_plugin_testing_framework_1.TestUtil.SERVER_URL_PLACEHOLDER, targetPlatform.getServerUrl()))
            .then(code_push_plugin_testing_framework_1.TestUtil.replaceString.bind(undefined, destinationIndexPath, code_push_plugin_testing_framework_1.TestUtil.INDEX_JS_PLACEHOLDER, scenarioJs))
            .then(code_push_plugin_testing_framework_1.TestUtil.replaceString.bind(undefined, destinationIndexPath, code_push_plugin_testing_framework_1.TestUtil.CODE_PUSH_APP_VERSION_PLACEHOLDER, version));
    }
    createUpdateArchive(projectDirectory, targetPlatform, isDiff) {
        const bundleFolder = path.join(projectDirectory, code_push_plugin_testing_framework_1.TestConfig.TestAppName, "CodePush/");
        const bundleName = targetPlatform.getBundleName();
        const bundlePath = path.join(bundleFolder, bundleName);
        const deferred = Q.defer();
        fs.exists(bundleFolder, (exists) => {
            if (exists)
                del.sync([bundleFolder], { force: true });
            mkdirp.sync(bundleFolder);
            deferred.resolve(undefined);
        });
        return deferred.promise
            .then(code_push_plugin_testing_framework_1.TestUtil.getProcessOutput.bind(undefined, "npx react-native bundle --entry-file index.js --platform " + targetPlatform.getName() + " --bundle-output " + bundlePath + " --assets-dest " + bundleFolder + " --dev false", { cwd: path.join(projectDirectory, code_push_plugin_testing_framework_1.TestConfig.TestAppName) }))
            .then(code_push_plugin_testing_framework_1.TestUtil.archiveFolder.bind(undefined, bundleFolder, "", path.join(projectDirectory, code_push_plugin_testing_framework_1.TestConfig.TestAppName, "update.zip"), isDiff));
    }
    preparePlatform(projectDirectory, targetPlatform) {
        const deferred = Q.defer();
        const platformsJSONPath = path.join(projectDirectory, RNProjectManager.platformsJSON);
        fs.exists(platformsJSONPath, (exists) => {
            if (!exists) {
                fs.writeFileSync(platformsJSONPath, "{}");
            }
            const platformJSON = eval("(" + fs.readFileSync(platformsJSONPath, "utf8") + ")");
            if (platformJSON[targetPlatform.getName()] === true)
                deferred.reject("Platform " + targetPlatform.getName() + " is already installed in " + projectDirectory + "!");
            else {
                platformJSON[targetPlatform.getName()] = true;
                fs.writeFileSync(platformsJSONPath, JSON.stringify(platformJSON));
                deferred.resolve(undefined);
            }
        });
        return deferred.promise
            .then(() => {
            return targetPlatform.installPlatform(projectDirectory);
        }, (error) => { console.log(error); return null; });
    }
    cleanupAfterPlatform(projectDirectory, targetPlatform) {
        return Q(null);
    }
    runApplication(projectDirectory, targetPlatform) {
        console.log("Running project in " + projectDirectory + " on " + targetPlatform.getName());
        return Q(null)
            .then(() => {
            if (!RNProjectManager.currentScenarioHasBuilt[projectDirectory]) {
                RNProjectManager.currentScenarioHasBuilt[projectDirectory] = true;
                return targetPlatform.buildApp(projectDirectory);
            }
        })
            .then(() => {
            return targetPlatform.getEmulatorManager().uninstallApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace);
        })
            .then(() => {
            return targetPlatform.installApp(projectDirectory)
                .then(targetPlatform.getEmulatorManager().launchInstalledApplication.bind(undefined, code_push_plugin_testing_framework_1.TestConfig.TestNamespace));
        });
    }
}
RNProjectManager.currentScenario = {};
RNProjectManager.currentScenarioHasBuilt = {};
RNProjectManager.platformsJSON = "platforms.json";
const ScenarioCheckForUpdatePath = "scenarioCheckForUpdate.js";
const ScenarioCheckForUpdateCustomKey = "scenarioCheckForUpdateCustomKey.js";
const ScenarioDisallowRestartImmediate = "scenarioDisallowRestartImmediate.js";
const ScenarioDisallowRestartOnResume = "scenarioDisallowRestartOnResume.js";
const ScenarioDisallowRestartOnSuspend = "scenarioDisallowRestartOnSuspend.js";
const ScenarioDownloadUpdate = "scenarioDownloadUpdate.js";
const ScenarioInstall = "scenarioInstall.js";
const ScenarioInstallOnResumeWithRevert = "scenarioInstallOnResumeWithRevert.js";
const ScenarioInstallOnSuspendWithRevert = "scenarioInstallOnSuspendWithRevert.js";
const ScenarioInstallOnRestartWithRevert = "scenarioInstallOnRestartWithRevert.js";
const ScenarioInstallWithRevert = "scenarioInstallWithRevert.js";
const ScenarioInstallRestart2x = "scenarioInstallRestart2x.js";
const ScenarioSync1x = "scenarioSync.js";
const ScenarioSyncResume = "scenarioSyncResume.js";
const ScenarioSyncSuspend = "scenarioSyncSuspend.js";
const ScenarioSyncResumeDelay = "scenarioSyncResumeDelay.js";
const ScenarioSyncRestartDelay = "scenarioSyncRestartDelay.js";
const ScenarioSyncSuspendDelay = "scenarioSyncSuspendDelay.js";
const ScenarioSync2x = "scenarioSync2x.js";
const ScenarioRestart = "scenarioRestart.js";
const ScenarioRestart2x = "scenarioRestart2x.js";
const ScenarioSyncMandatoryDefault = "scenarioSyncMandatoryDefault.js";
const ScenarioSyncMandatoryResume = "scenarioSyncMandatoryResume.js";
const ScenarioSyncMandatoryRestart = "scenarioSyncMandatoryRestart.js";
const ScenarioSyncMandatorySuspend = "scenarioSyncMandatorySuspend.js";
const UpdateDeviceReady = "updateDeviceReady.js";
const UpdateNotifyApplicationReady = "updateNotifyApplicationReady.js";
const UpdateSync = "updateSync.js";
const UpdateSync2x = "updateSync2x.js";
const UpdateNotifyApplicationReadyConditional = "updateNARConditional.js";
code_push_plugin_testing_framework_1.PluginTestingFramework.initializeTests(new RNProjectManager(), supportedTargetPlatforms, (projectManager, targetPlatform) => {
    code_push_plugin_testing_framework_1.TestBuilder.describe("#window.codePush.checkForUpdate", () => {
        code_push_plugin_testing_framework_1.TestBuilder.it("window.codePush.checkForUpdate.noUpdate", false, (done) => {
            const noUpdateResponse = code_push_plugin_testing_framework_1.ServerUtil.createDefaultResponse();
            noUpdateResponse.is_available = false;
            noUpdateResponse.target_binary_range = "0.0.1";
            code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: noUpdateResponse };
            code_push_plugin_testing_framework_1.ServerUtil.testMessageCallback = (requestBody) => {
                try {
                    assert.strictEqual(requestBody.message, code_push_plugin_testing_framework_1.ServerUtil.TestMessage.CHECK_UP_TO_DATE);
                    done();
                }
                catch (e) {
                    done(e);
                }
            };
            projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
        });
        code_push_plugin_testing_framework_1.TestBuilder.it("window.codePush.checkForUpdate.sendsBinaryHash", false, (done) => {
            if (!targetPlatform.isDiffsSupported()) {
                console.log(targetPlatform.getName() + " does not send a binary hash!");
                done();
                return;
            }
            const noUpdateResponse = code_push_plugin_testing_framework_1.ServerUtil.createDefaultResponse();
            noUpdateResponse.is_available = false;
            noUpdateResponse.target_binary_range = "0.0.1";
            code_push_plugin_testing_framework_1.ServerUtil.updateCheckCallback = (request) => {
                try {
                    assert(request.query.package_hash);
                }
                catch (e) {
                    done(e);
                }
            };
            code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: noUpdateResponse };
            code_push_plugin_testing_framework_1.ServerUtil.testMessageCallback = (requestBody) => {
                try {
                    assert.strictEqual(requestBody.message, code_push_plugin_testing_framework_1.ServerUtil.TestMessage.CHECK_UP_TO_DATE);
                    done();
                }
                catch (e) {
                    done(e);
                }
            };
            projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
        });
        code_push_plugin_testing_framework_1.TestBuilder.it("window.codePush.checkForUpdate.noUpdate.updateAppVersion", false, (done) => {
            const updateAppVersionResponse = code_push_plugin_testing_framework_1.ServerUtil.createDefaultResponse();
            updateAppVersionResponse.is_available = true;
            updateAppVersionResponse.target_binary_range = "2.0.0";
            updateAppVersionResponse.update_app_version = true;
            code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: updateAppVersionResponse };
            code_push_plugin_testing_framework_1.ServerUtil.testMessageCallback = (requestBody) => {
                try {
                    assert.strictEqual(requestBody.message, code_push_plugin_testing_framework_1.ServerUtil.TestMessage.CHECK_UP_TO_DATE);
                    done();
                }
                catch (e) {
                    done(e);
                }
            };
            projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
        });
        code_push_plugin_testing_framework_1.TestBuilder.it("window.codePush.checkForUpdate.update", true, (done) => {
            const updateResponse = code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse();
            code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: updateResponse };
            code_push_plugin_testing_framework_1.ServerUtil.testMessageCallback = (requestBody) => {
                try {
                    assert.strictEqual(requestBody.message, code_push_plugin_testing_framework_1.ServerUtil.TestMessage.CHECK_UPDATE_AVAILABLE);
                    assert.notStrictEqual(requestBody.args[0], null);
                    const remotePackage = requestBody.args[0];
                    assert.strictEqual(remotePackage.downloadUrl, updateResponse.download_url);
                    assert.strictEqual(remotePackage.isMandatory, updateResponse.is_mandatory);
                    assert.strictEqual(remotePackage.label, updateResponse.label);
                    assert.strictEqual(remotePackage.packageHash, updateResponse.package_hash);
                    assert.strictEqual(remotePackage.packageSize, updateResponse.package_size);
                    assert.strictEqual(remotePackage.deploymentKey, targetPlatform.getDefaultDeploymentKey());
                    done();
                }
                catch (e) {
                    done(e);
                }
            };
            code_push_plugin_testing_framework_1.ServerUtil.updateCheckCallback = (request) => {
                try {
                    assert.notStrictEqual(null, request);
                    assert.strictEqual(request.query.deployment_key, targetPlatform.getDefaultDeploymentKey());
                }
                catch (e) {
                    done(e);
                }
            };
            projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
        });
        code_push_plugin_testing_framework_1.TestBuilder.it("window.codePush.checkForUpdate.error", false, (done) => {
            code_push_plugin_testing_framework_1.ServerUtil.updateResponse = "invalid {{ json";
            code_push_plugin_testing_framework_1.ServerUtil.testMessageCallback = (requestBody) => {
                try {
                    assert.strictEqual(requestBody.message, code_push_plugin_testing_framework_1.ServerUtil.TestMessage.CHECK_ERROR);
                    done();
                }
                catch (e) {
                    done(e);
                }
            };
            projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
        });
    }, ScenarioCheckForUpdatePath);
    code_push_plugin_testing_framework_1.TestBuilder.describe("#window.codePush.checkForUpdate.customKey", () => {
        code_push_plugin_testing_framework_1.TestBuilder.it("window.codePush.checkForUpdate.customKey.update", false, (done) => {
            const updateResponse = code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse();
            code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: updateResponse };
            code_push_plugin_testing_framework_1.ServerUtil.updateCheckCallback = (request) => {
                try {
                    assert.notStrictEqual(null, request);
                    assert.strictEqual(request.query.deployment_key, "CUSTOM-DEPLOYMENT-KEY");
                    done();
                }
                catch (e) {
                    done(e);
                }
            };
            projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
        });
    }, ScenarioCheckForUpdateCustomKey);
    code_push_plugin_testing_framework_1.TestBuilder.describe("#remotePackage.download", () => {
        code_push_plugin_testing_framework_1.TestBuilder.it("remotePackage.download.success", false, (done) => {
            code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse(false, targetPlatform) };
            code_push_plugin_testing_framework_1.ServerUtil.updatePackagePath = path.join(code_push_plugin_testing_framework_1.TestConfig.templatePath, "index.js");
            projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
            code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                code_push_plugin_testing_framework_1.ServerUtil.TestMessage.CHECK_UPDATE_AVAILABLE,
                code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DOWNLOAD_SUCCEEDED
            ])
                .then(() => { done(); }, (e) => { done(e); });
        });
        code_push_plugin_testing_framework_1.TestBuilder.it("remotePackage.download.error", false, (done) => {
            code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse(false, targetPlatform) };
            code_push_plugin_testing_framework_1.ServerUtil.updateResponse.update_info.download_url = "http://invalid_url";
            projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
            code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                code_push_plugin_testing_framework_1.ServerUtil.TestMessage.CHECK_UPDATE_AVAILABLE,
                code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DOWNLOAD_ERROR
            ])
                .then(() => { done(); }, (e) => { done(e); });
        });
    }, ScenarioDownloadUpdate);
    code_push_plugin_testing_framework_1.TestBuilder.describe("#localPackage.install", () => {
        code_push_plugin_testing_framework_1.TestBuilder.it("localPackage.install.handlesDiff.againstBinary", false, (done) => {
            code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse(false, targetPlatform) };
            (0, code_push_plugin_testing_framework_1.setupUpdateScenario)(projectManager, targetPlatform, UpdateNotifyApplicationReady, "Diff Update 1")
                .then((updatePath) => {
                code_push_plugin_testing_framework_1.ServerUtil.updatePackagePath = updatePath;
                projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.CHECK_UPDATE_AVAILABLE,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DOWNLOAD_SUCCEEDED,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE
                ]);
            })
                .then(() => {
                targetPlatform.getEmulatorManager().restartApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE
                ]);
            })
                .done(() => { done(); }, (e) => { done(e); });
        });
        code_push_plugin_testing_framework_1.TestBuilder.it("localPackage.install.immediately", false, (done) => {
            code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse(false, targetPlatform) };
            (0, code_push_plugin_testing_framework_1.setupUpdateScenario)(projectManager, targetPlatform, UpdateNotifyApplicationReady, "Update 1")
                .then((updatePath) => {
                code_push_plugin_testing_framework_1.ServerUtil.updatePackagePath = updatePath;
                projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.CHECK_UPDATE_AVAILABLE,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DOWNLOAD_SUCCEEDED,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE
                ]);
            })
                .then(() => {
                targetPlatform.getEmulatorManager().restartApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE
                ]);
            })
                .done(() => { done(); }, (e) => { done(e); });
        });
    }, ScenarioInstall);
    code_push_plugin_testing_framework_1.TestBuilder.describe("#localPackage.install.revert", () => {
        code_push_plugin_testing_framework_1.TestBuilder.it("localPackage.install.revert.dorevert", false, (done) => {
            code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse(false, targetPlatform) };
            (0, code_push_plugin_testing_framework_1.setupUpdateScenario)(projectManager, targetPlatform, UpdateDeviceReady, "Update 1 (bad update)")
                .then((updatePath) => {
                code_push_plugin_testing_framework_1.ServerUtil.updatePackagePath = updatePath;
                projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.CHECK_UPDATE_AVAILABLE,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DOWNLOAD_SUCCEEDED,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE
                ]);
            })
                .then(() => {
                code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse(false, targetPlatform) };
                targetPlatform.getEmulatorManager().restartApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.CHECK_UPDATE_AVAILABLE,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DOWNLOAD_SUCCEEDED,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE
                ]);
            })
                .then(() => {
                targetPlatform.getEmulatorManager().restartApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([code_push_plugin_testing_framework_1.ServerUtil.TestMessage.UPDATE_FAILED_PREVIOUSLY]);
            })
                .done(() => { done(); }, (e) => { done(e); });
        });
        code_push_plugin_testing_framework_1.TestBuilder.it("localPackage.install.revert.norevert", false, (done) => {
            code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse(false, targetPlatform) };
            (0, code_push_plugin_testing_framework_1.setupUpdateScenario)(projectManager, targetPlatform, UpdateNotifyApplicationReady, "Update 1 (good update)")
                .then((updatePath) => {
                code_push_plugin_testing_framework_1.ServerUtil.updatePackagePath = updatePath;
                projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.CHECK_UPDATE_AVAILABLE,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DOWNLOAD_SUCCEEDED,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE
                ]);
            })
                .then(() => {
                targetPlatform.getEmulatorManager().restartApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE]);
            })
                .done(() => { done(); }, (e) => { done(e); });
        });
    }, ScenarioInstallWithRevert);
    code_push_plugin_testing_framework_1.TestBuilder.describe("#localPackage.installOnNextResume", () => {
        code_push_plugin_testing_framework_1.TestBuilder.it("localPackage.installOnNextResume.dorevert", true, (done) => {
            code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse(false, targetPlatform) };
            (0, code_push_plugin_testing_framework_1.setupUpdateScenario)(projectManager, targetPlatform, UpdateDeviceReady, "Update 1")
                .then((updatePath) => {
                code_push_plugin_testing_framework_1.ServerUtil.updatePackagePath = updatePath;
                projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.CHECK_UPDATE_AVAILABLE,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DOWNLOAD_SUCCEEDED,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.UPDATE_INSTALLED
                ]);
            })
                .then(() => {
                targetPlatform.getEmulatorManager().resumeApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE]);
            })
                .then(() => {
                targetPlatform.getEmulatorManager().restartApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([code_push_plugin_testing_framework_1.ServerUtil.TestMessage.UPDATE_FAILED_PREVIOUSLY]);
            })
                .done(() => { done(); }, (e) => { done(e); });
        });
        code_push_plugin_testing_framework_1.TestBuilder.it("localPackage.installOnNextResume.norevert", false, (done) => {
            code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse(false, targetPlatform) };
            (0, code_push_plugin_testing_framework_1.setupUpdateScenario)(projectManager, targetPlatform, UpdateNotifyApplicationReady, "Update 1 (good update)")
                .then((updatePath) => {
                code_push_plugin_testing_framework_1.ServerUtil.updatePackagePath = updatePath;
                projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.CHECK_UPDATE_AVAILABLE,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DOWNLOAD_SUCCEEDED,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.UPDATE_INSTALLED
                ]);
            })
                .then(() => {
                targetPlatform.getEmulatorManager().resumeApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE]);
            })
                .then(() => {
                targetPlatform.getEmulatorManager().restartApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE]);
            })
                .done(() => { done(); }, (e) => { done(e); });
        });
    }, ScenarioInstallOnResumeWithRevert);
    code_push_plugin_testing_framework_1.TestBuilder.describe("#localPackage.installOnNextSuspend", () => {
        code_push_plugin_testing_framework_1.TestBuilder.it("localPackage.installOnNextSuspend.dorevert", true, (done) => {
            code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse(false, targetPlatform) };
            (0, code_push_plugin_testing_framework_1.setupUpdateScenario)(projectManager, targetPlatform, UpdateDeviceReady, "Update 1")
                .then((updatePath) => {
                code_push_plugin_testing_framework_1.ServerUtil.updatePackagePath = updatePath;
                projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.CHECK_UPDATE_AVAILABLE,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DOWNLOAD_SUCCEEDED,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.UPDATE_INSTALLED
                ]);
            })
                .then(() => {
                targetPlatform.getEmulatorManager().resumeApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE]);
            })
                .then(() => {
                targetPlatform.getEmulatorManager().restartApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([code_push_plugin_testing_framework_1.ServerUtil.TestMessage.UPDATE_FAILED_PREVIOUSLY]);
            })
                .done(() => { done(); }, (e) => { done(e); });
        });
        code_push_plugin_testing_framework_1.TestBuilder.it("localPackage.installOnNextSuspend.norevert", false, (done) => {
            code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse(false, targetPlatform) };
            (0, code_push_plugin_testing_framework_1.setupUpdateScenario)(projectManager, targetPlatform, UpdateNotifyApplicationReady, "Update 1 (good update)")
                .then((updatePath) => {
                code_push_plugin_testing_framework_1.ServerUtil.updatePackagePath = updatePath;
                projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.CHECK_UPDATE_AVAILABLE,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DOWNLOAD_SUCCEEDED,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.UPDATE_INSTALLED
                ]);
            })
                .then(() => {
                targetPlatform.getEmulatorManager().resumeApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE]);
            })
                .then(() => {
                targetPlatform.getEmulatorManager().restartApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE]);
            })
                .done(() => { done(); }, (e) => { done(e); });
        });
    }, ScenarioInstallOnSuspendWithRevert);
    code_push_plugin_testing_framework_1.TestBuilder.describe("localPackage installOnNextRestart", () => {
        code_push_plugin_testing_framework_1.TestBuilder.it("localPackage.installOnNextRestart.dorevert", false, (done) => {
            code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse(false, targetPlatform) };
            (0, code_push_plugin_testing_framework_1.setupUpdateScenario)(projectManager, targetPlatform, UpdateDeviceReady, "Update 1")
                .then((updatePath) => {
                code_push_plugin_testing_framework_1.ServerUtil.updatePackagePath = updatePath;
                projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.CHECK_UPDATE_AVAILABLE,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DOWNLOAD_SUCCEEDED,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.UPDATE_INSTALLED
                ]);
            })
                .then(() => {
                console.log("Update hash: " + code_push_plugin_testing_framework_1.ServerUtil.updateResponse.update_info.package_hash);
                targetPlatform.getEmulatorManager().restartApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE]);
            })
                .then(() => {
                console.log("Update hash: " + code_push_plugin_testing_framework_1.ServerUtil.updateResponse.update_info.package_hash);
                targetPlatform.getEmulatorManager().restartApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([code_push_plugin_testing_framework_1.ServerUtil.TestMessage.UPDATE_FAILED_PREVIOUSLY]);
            })
                .done(() => { done(); }, (e) => { done(e); });
        });
        code_push_plugin_testing_framework_1.TestBuilder.it("localPackage.installOnNextRestart.norevert", true, (done) => {
            code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse(false, targetPlatform) };
            (0, code_push_plugin_testing_framework_1.setupUpdateScenario)(projectManager, targetPlatform, UpdateNotifyApplicationReady, "Update 1 (good update)")
                .then((updatePath) => {
                code_push_plugin_testing_framework_1.ServerUtil.updatePackagePath = updatePath;
                projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.CHECK_UPDATE_AVAILABLE,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DOWNLOAD_SUCCEEDED,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.UPDATE_INSTALLED
                ]);
            })
                .then(() => {
                targetPlatform.getEmulatorManager().restartApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE]);
            })
                .then(() => {
                targetPlatform.getEmulatorManager().restartApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE]);
            })
                .done(() => { done(); }, (e) => { done(e); });
        });
        code_push_plugin_testing_framework_1.TestBuilder.it("localPackage.installOnNextRestart.revertToPrevious", false, (done) => {
            code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse(false, targetPlatform) };
            (0, code_push_plugin_testing_framework_1.setupUpdateScenario)(projectManager, targetPlatform, UpdateNotifyApplicationReadyConditional, "Update 1 (good update)")
                .then((updatePath) => {
                code_push_plugin_testing_framework_1.ServerUtil.updatePackagePath = updatePath;
                projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.CHECK_UPDATE_AVAILABLE,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DOWNLOAD_SUCCEEDED,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.UPDATE_INSTALLED
                ]);
            })
                .then(() => {
                code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse(false, targetPlatform) };
                (0, code_push_plugin_testing_framework_1.setupUpdateScenario)(projectManager, targetPlatform, UpdateDeviceReady, "Update 2 (bad update)")
                    .then(() => { return targetPlatform.getEmulatorManager().restartApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace); });
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.CHECK_UPDATE_AVAILABLE,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DOWNLOAD_SUCCEEDED,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.UPDATE_INSTALLED
                ]);
            })
                .then(() => {
                targetPlatform.getEmulatorManager().restartApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE]);
            })
                .then(() => {
                code_push_plugin_testing_framework_1.ServerUtil.testMessageResponse = code_push_plugin_testing_framework_1.ServerUtil.TestMessageResponse.SKIP_NOTIFY_APPLICATION_READY;
                targetPlatform.getEmulatorManager().restartApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SKIPPED_NOTIFY_APPLICATION_READY
                ]);
            })
                .then(() => {
                code_push_plugin_testing_framework_1.ServerUtil.testMessageResponse = undefined;
                targetPlatform.getEmulatorManager().restartApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.UPDATE_FAILED_PREVIOUSLY
                ]);
            })
                .done(() => { done(); }, (e) => { done(e); });
        });
    }, ScenarioInstallOnRestartWithRevert);
    code_push_plugin_testing_framework_1.TestBuilder.describe("#codePush.restartApplication", () => {
        code_push_plugin_testing_framework_1.TestBuilder.it("codePush.restartApplication.checkPackages", true, (done) => {
            code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse(false, targetPlatform) };
            (0, code_push_plugin_testing_framework_1.setupUpdateScenario)(projectManager, targetPlatform, UpdateNotifyApplicationReady, "Update 1")
                .then((updatePath) => {
                code_push_plugin_testing_framework_1.ServerUtil.updatePackagePath = updatePath;
                projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                    new code_push_plugin_testing_framework_1.ServerUtil.AppMessage(code_push_plugin_testing_framework_1.ServerUtil.TestMessage.PENDING_PACKAGE, [null]),
                    new code_push_plugin_testing_framework_1.ServerUtil.AppMessage(code_push_plugin_testing_framework_1.ServerUtil.TestMessage.CURRENT_PACKAGE, [null]),
                    new code_push_plugin_testing_framework_1.ServerUtil.AppMessage(code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_STATUS, [code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_UPDATE_INSTALLED]),
                    new code_push_plugin_testing_framework_1.ServerUtil.AppMessage(code_push_plugin_testing_framework_1.ServerUtil.TestMessage.PENDING_PACKAGE, [code_push_plugin_testing_framework_1.ServerUtil.updateResponse.update_info.package_hash]),
                    new code_push_plugin_testing_framework_1.ServerUtil.AppMessage(code_push_plugin_testing_framework_1.ServerUtil.TestMessage.CURRENT_PACKAGE, [null]),
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE
                ]);
            })
                .then(() => {
                targetPlatform.getEmulatorManager().restartApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE]);
            })
                .done(() => { done(); }, (e) => { done(e); });
        });
    }, ScenarioRestart);
    code_push_plugin_testing_framework_1.TestBuilder.describe("#codePush.restartApplication.2x", () => {
        code_push_plugin_testing_framework_1.TestBuilder.it("blocks when a restart is in progress and doesn't crash if there is a pending package", false, (done) => {
            code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse(false, targetPlatform) };
            (0, code_push_plugin_testing_framework_1.setupTestRunScenario)(projectManager, targetPlatform, ScenarioInstallRestart2x)
                .then(code_push_plugin_testing_framework_1.setupUpdateScenario.bind(this, projectManager, targetPlatform, UpdateDeviceReady, "Update 1"))
                .then((updatePath) => {
                code_push_plugin_testing_framework_1.ServerUtil.updatePackagePath = updatePath;
                projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.CHECK_UPDATE_AVAILABLE,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DOWNLOAD_SUCCEEDED,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.UPDATE_INSTALLED,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE
                ]);
            })
                .done(() => { done(); }, (e) => { done(e); });
        });
        code_push_plugin_testing_framework_1.TestBuilder.it("doesn't block when the restart is ignored", false, (done) => {
            code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse(false, targetPlatform) };
            (0, code_push_plugin_testing_framework_1.setupTestRunScenario)(projectManager, targetPlatform, ScenarioRestart2x)
                .then(code_push_plugin_testing_framework_1.setupUpdateScenario.bind(this, projectManager, targetPlatform, UpdateDeviceReady, "Update 1"))
                .then((updatePath) => {
                code_push_plugin_testing_framework_1.ServerUtil.updatePackagePath = updatePath;
                projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.CHECK_UPDATE_AVAILABLE,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DOWNLOAD_SUCCEEDED,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.UPDATE_INSTALLED,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE
                ]);
            })
                .done(() => { done(); }, (e) => { done(e); });
        });
    });
    code_push_plugin_testing_framework_1.TestBuilder.describe("#window.codePush.sync", () => {
        code_push_plugin_testing_framework_1.TestBuilder.describe("#window.codePush.sync 1x", () => {
            code_push_plugin_testing_framework_1.TestBuilder.it("window.codePush.sync.noupdate", false, (done) => {
                const noUpdateResponse = code_push_plugin_testing_framework_1.ServerUtil.createDefaultResponse();
                noUpdateResponse.is_available = false;
                noUpdateResponse.target_binary_range = "0.0.1";
                code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: noUpdateResponse };
                Q({})
                    .then(p => {
                    projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
                    return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                        new code_push_plugin_testing_framework_1.ServerUtil.AppMessage(code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_STATUS, [code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_UP_TO_DATE])
                    ]);
                })
                    .done(() => { done(); }, (e) => { done(e); });
            });
            code_push_plugin_testing_framework_1.TestBuilder.it("window.codePush.sync.checkerror", false, (done) => {
                code_push_plugin_testing_framework_1.ServerUtil.updateResponse = "invalid {{ json";
                Q({})
                    .then(p => {
                    projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
                    return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                        new code_push_plugin_testing_framework_1.ServerUtil.AppMessage(code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_STATUS, [code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_ERROR])
                    ]);
                })
                    .done(() => { done(); }, (e) => { done(e); });
            });
            code_push_plugin_testing_framework_1.TestBuilder.it("window.codePush.sync.downloaderror", false, (done) => {
                const invalidUrlResponse = code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse();
                invalidUrlResponse.download_url = "http://" + path.join(code_push_plugin_testing_framework_1.TestConfig.templatePath, "invalid_path.zip");
                code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: invalidUrlResponse };
                Q({})
                    .then(p => {
                    projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
                    return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                        new code_push_plugin_testing_framework_1.ServerUtil.AppMessage(code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_STATUS, [code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_ERROR])
                    ]);
                })
                    .done(() => { done(); }, (e) => { done(e); });
            });
            code_push_plugin_testing_framework_1.TestBuilder.it("window.codePush.sync.dorevert", false, (done) => {
                code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse(false, targetPlatform) };
                (0, code_push_plugin_testing_framework_1.setupUpdateScenario)(projectManager, targetPlatform, UpdateDeviceReady, "Update 1 (bad update)")
                    .then((updatePath) => {
                    code_push_plugin_testing_framework_1.ServerUtil.updatePackagePath = updatePath;
                    projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
                    return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE]);
                })
                    .then(() => {
                    targetPlatform.getEmulatorManager().restartApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace);
                    return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                        new code_push_plugin_testing_framework_1.ServerUtil.AppMessage(code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_STATUS, [code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_UP_TO_DATE])
                    ]);
                })
                    .done(() => { done(); }, (e) => { done(e); });
            });
            code_push_plugin_testing_framework_1.TestBuilder.it("window.codePush.sync.update", false, (done) => {
                code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse(false, targetPlatform) };
                (0, code_push_plugin_testing_framework_1.setupUpdateScenario)(projectManager, targetPlatform, UpdateSync, "Update 1 (good update)")
                    .then((updatePath) => {
                    code_push_plugin_testing_framework_1.ServerUtil.updatePackagePath = updatePath;
                    projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
                    return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                        code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE,
                        new code_push_plugin_testing_framework_1.ServerUtil.AppMessage(code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_STATUS, [code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_UP_TO_DATE])
                    ]);
                })
                    .then(() => {
                    const noUpdateResponse = code_push_plugin_testing_framework_1.ServerUtil.createDefaultResponse();
                    noUpdateResponse.is_available = false;
                    noUpdateResponse.target_binary_range = "0.0.1";
                    code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: noUpdateResponse };
                    targetPlatform.getEmulatorManager().restartApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace);
                    return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                        code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE,
                        new code_push_plugin_testing_framework_1.ServerUtil.AppMessage(code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_STATUS, [code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_UP_TO_DATE])
                    ]);
                })
                    .done(() => { done(); }, (e) => { done(e); });
            });
        }, ScenarioSync1x);
        code_push_plugin_testing_framework_1.TestBuilder.describe("#window.codePush.sync 2x", () => {
            code_push_plugin_testing_framework_1.TestBuilder.it("window.codePush.sync.2x.noupdate", false, (done) => {
                const noUpdateResponse = code_push_plugin_testing_framework_1.ServerUtil.createDefaultResponse();
                noUpdateResponse.is_available = false;
                noUpdateResponse.target_binary_range = "0.0.1";
                code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: noUpdateResponse };
                Q({})
                    .then(p => {
                    projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
                    return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                        new code_push_plugin_testing_framework_1.ServerUtil.AppMessage(code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_STATUS, [code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_IN_PROGRESS]),
                        new code_push_plugin_testing_framework_1.ServerUtil.AppMessage(code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_STATUS, [code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_UP_TO_DATE])
                    ]);
                })
                    .done(() => { done(); }, (e) => { done(e); });
            });
            code_push_plugin_testing_framework_1.TestBuilder.it("window.codePush.sync.2x.checkerror", false, (done) => {
                code_push_plugin_testing_framework_1.ServerUtil.updateResponse = "invalid {{ json";
                Q({})
                    .then(p => {
                    projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
                    return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                        new code_push_plugin_testing_framework_1.ServerUtil.AppMessage(code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_STATUS, [code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_IN_PROGRESS]),
                        new code_push_plugin_testing_framework_1.ServerUtil.AppMessage(code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_STATUS, [code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_ERROR])
                    ]);
                })
                    .done(() => { done(); }, (e) => { done(e); });
            });
            code_push_plugin_testing_framework_1.TestBuilder.it("window.codePush.sync.2x.downloaderror", false, (done) => {
                const invalidUrlResponse = code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse();
                invalidUrlResponse.download_url = "http://" + path.join(code_push_plugin_testing_framework_1.TestConfig.templatePath, "invalid_path.zip");
                code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: invalidUrlResponse };
                Q({})
                    .then(p => {
                    projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
                    return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                        new code_push_plugin_testing_framework_1.ServerUtil.AppMessage(code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_STATUS, [code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_IN_PROGRESS]),
                        new code_push_plugin_testing_framework_1.ServerUtil.AppMessage(code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_STATUS, [code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_ERROR])
                    ]);
                })
                    .done(() => { done(); }, (e) => { done(e); });
            });
            code_push_plugin_testing_framework_1.TestBuilder.it("window.codePush.sync.2x.dorevert", false, (done) => {
                code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse(false, targetPlatform) };
                (0, code_push_plugin_testing_framework_1.setupUpdateScenario)(projectManager, targetPlatform, UpdateDeviceReady, "Update 1 (bad update)")
                    .then((updatePath) => {
                    code_push_plugin_testing_framework_1.ServerUtil.updatePackagePath = updatePath;
                    projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
                    return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                        new code_push_plugin_testing_framework_1.ServerUtil.AppMessage(code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_STATUS, [code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_IN_PROGRESS]),
                        code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE
                    ]);
                })
                    .then(() => {
                    targetPlatform.getEmulatorManager().restartApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace);
                    return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                        new code_push_plugin_testing_framework_1.ServerUtil.AppMessage(code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_STATUS, [code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_IN_PROGRESS]),
                        new code_push_plugin_testing_framework_1.ServerUtil.AppMessage(code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_STATUS, [code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_UP_TO_DATE])
                    ]);
                })
                    .done(() => { done(); }, (e) => { done(e); });
            });
            code_push_plugin_testing_framework_1.TestBuilder.it("window.codePush.sync.2x.update", true, (done) => {
                code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse(false, targetPlatform) };
                (0, code_push_plugin_testing_framework_1.setupUpdateScenario)(projectManager, targetPlatform, UpdateSync2x, "Update 1 (good update)")
                    .then((updatePath) => {
                    code_push_plugin_testing_framework_1.ServerUtil.updatePackagePath = updatePath;
                    projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
                    return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                        new code_push_plugin_testing_framework_1.ServerUtil.AppMessage(code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_STATUS, [code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_IN_PROGRESS]),
                        code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE,
                        new code_push_plugin_testing_framework_1.ServerUtil.AppMessage(code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_STATUS, [code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_IN_PROGRESS]),
                        new code_push_plugin_testing_framework_1.ServerUtil.AppMessage(code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_STATUS, [code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_UP_TO_DATE])
                    ]);
                })
                    .then(() => {
                    const noUpdateResponse = code_push_plugin_testing_framework_1.ServerUtil.createDefaultResponse();
                    noUpdateResponse.is_available = false;
                    noUpdateResponse.target_binary_range = "0.0.1";
                    code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: noUpdateResponse };
                    targetPlatform.getEmulatorManager().restartApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace);
                    return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                        code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE,
                        new code_push_plugin_testing_framework_1.ServerUtil.AppMessage(code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_STATUS, [code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_IN_PROGRESS]),
                        new code_push_plugin_testing_framework_1.ServerUtil.AppMessage(code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_STATUS, [code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_UP_TO_DATE])
                    ]);
                })
                    .done(() => { done(); }, (e) => { done(e); });
            });
        }, ScenarioSync2x);
    });
    code_push_plugin_testing_framework_1.TestBuilder.describe("#window.codePush.sync minimum background duration tests", () => {
        code_push_plugin_testing_framework_1.TestBuilder.it("defaults to no minimum for Resume mode", false, (done) => {
            code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse(false, targetPlatform) };
            (0, code_push_plugin_testing_framework_1.setupTestRunScenario)(projectManager, targetPlatform, ScenarioSyncResume).then(() => {
                return (0, code_push_plugin_testing_framework_1.setupUpdateScenario)(projectManager, targetPlatform, UpdateSync, "Update 1 (good update)");
            })
                .then((updatePath) => {
                code_push_plugin_testing_framework_1.ServerUtil.updatePackagePath = updatePath;
                projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                    new code_push_plugin_testing_framework_1.ServerUtil.AppMessage(code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_STATUS, [code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_UPDATE_INSTALLED])
                ]);
            })
                .then(() => {
                const noUpdateResponse = code_push_plugin_testing_framework_1.ServerUtil.createDefaultResponse();
                noUpdateResponse.is_available = false;
                noUpdateResponse.target_binary_range = "0.0.1";
                code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: noUpdateResponse };
                targetPlatform.getEmulatorManager().resumeApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE,
                    new code_push_plugin_testing_framework_1.ServerUtil.AppMessage(code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_STATUS, [code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_UP_TO_DATE])
                ]);
            })
                .done(() => { done(); }, (e) => { done(e); });
        });
        code_push_plugin_testing_framework_1.TestBuilder.it("min background duration 5s for Resume mode", false, (done) => {
            code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse(false, targetPlatform) };
            (0, code_push_plugin_testing_framework_1.setupTestRunScenario)(projectManager, targetPlatform, ScenarioSyncResumeDelay).then(() => {
                return (0, code_push_plugin_testing_framework_1.setupUpdateScenario)(projectManager, targetPlatform, UpdateSync, "Update 1 (good update)");
            })
                .then((updatePath) => {
                code_push_plugin_testing_framework_1.ServerUtil.updatePackagePath = updatePath;
                projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                    new code_push_plugin_testing_framework_1.ServerUtil.AppMessage(code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_STATUS, [code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_UPDATE_INSTALLED])
                ]);
            })
                .then(() => {
                const noUpdateResponse = code_push_plugin_testing_framework_1.ServerUtil.createDefaultResponse();
                noUpdateResponse.is_available = false;
                noUpdateResponse.target_binary_range = "0.0.1";
                code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: noUpdateResponse };
                return targetPlatform.getEmulatorManager().resumeApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace, 3 * 1000);
            })
                .then(() => {
                targetPlatform.getEmulatorManager().resumeApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace, 6 * 1000);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE,
                    new code_push_plugin_testing_framework_1.ServerUtil.AppMessage(code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_STATUS, [code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_UP_TO_DATE])
                ]);
            })
                .done(() => { done(); }, (e) => { done(e); });
        });
        code_push_plugin_testing_framework_1.TestBuilder.it("defaults to no minimum for Suspend mode", false, (done) => {
            code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse(false, targetPlatform) };
            (0, code_push_plugin_testing_framework_1.setupTestRunScenario)(projectManager, targetPlatform, ScenarioSyncSuspend).then(() => {
                return (0, code_push_plugin_testing_framework_1.setupUpdateScenario)(projectManager, targetPlatform, UpdateSync, "Update 1 (good update)");
            })
                .then((updatePath) => {
                code_push_plugin_testing_framework_1.ServerUtil.updatePackagePath = updatePath;
                projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                    new code_push_plugin_testing_framework_1.ServerUtil.AppMessage(code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_STATUS, [code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_UPDATE_INSTALLED])
                ]);
            })
                .then(() => {
                const noUpdateResponse = code_push_plugin_testing_framework_1.ServerUtil.createDefaultResponse();
                noUpdateResponse.is_available = false;
                noUpdateResponse.target_binary_range = "0.0.1";
                code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: noUpdateResponse };
                targetPlatform.getEmulatorManager().resumeApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE,
                    new code_push_plugin_testing_framework_1.ServerUtil.AppMessage(code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_STATUS, [code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_UP_TO_DATE])
                ]);
            })
                .done(() => { done(); }, (e) => { done(e); });
        });
        code_push_plugin_testing_framework_1.TestBuilder.it("min background duration 5s for Suspend mode", false, (done) => {
            code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse(false, targetPlatform) };
            (0, code_push_plugin_testing_framework_1.setupTestRunScenario)(projectManager, targetPlatform, ScenarioSyncSuspendDelay).then(() => {
                return (0, code_push_plugin_testing_framework_1.setupUpdateScenario)(projectManager, targetPlatform, UpdateSync, "Update 1 (good update)");
            })
                .then((updatePath) => {
                code_push_plugin_testing_framework_1.ServerUtil.updatePackagePath = updatePath;
                projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                    new code_push_plugin_testing_framework_1.ServerUtil.AppMessage(code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_STATUS, [code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_UPDATE_INSTALLED])
                ]);
            })
                .then(() => {
                const noUpdateResponse = code_push_plugin_testing_framework_1.ServerUtil.createDefaultResponse();
                noUpdateResponse.is_available = false;
                noUpdateResponse.target_binary_range = "0.0.1";
                code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: noUpdateResponse };
                return targetPlatform.getEmulatorManager().resumeApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace, 3 * 1000);
            })
                .then(() => {
                targetPlatform.getEmulatorManager().resumeApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace, 6 * 1000);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE,
                    new code_push_plugin_testing_framework_1.ServerUtil.AppMessage(code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_STATUS, [code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_UP_TO_DATE])
                ]);
            })
                .done(() => { done(); }, (e) => { done(e); });
        });
        code_push_plugin_testing_framework_1.TestBuilder.it("has no effect on restart", false, (done) => {
            code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse(false, targetPlatform) };
            (0, code_push_plugin_testing_framework_1.setupTestRunScenario)(projectManager, targetPlatform, ScenarioSyncRestartDelay).then(() => {
                return (0, code_push_plugin_testing_framework_1.setupUpdateScenario)(projectManager, targetPlatform, UpdateSync, "Update 1 (good update)");
            })
                .then((updatePath) => {
                code_push_plugin_testing_framework_1.ServerUtil.updatePackagePath = updatePath;
                projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                    new code_push_plugin_testing_framework_1.ServerUtil.AppMessage(code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_STATUS, [code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_UPDATE_INSTALLED])
                ]);
            })
                .then(() => {
                const noUpdateResponse = code_push_plugin_testing_framework_1.ServerUtil.createDefaultResponse();
                noUpdateResponse.is_available = false;
                noUpdateResponse.target_binary_range = "0.0.1";
                code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: noUpdateResponse };
                targetPlatform.getEmulatorManager().restartApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE,
                    new code_push_plugin_testing_framework_1.ServerUtil.AppMessage(code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_STATUS, [code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_UP_TO_DATE])
                ]);
            })
                .done(() => { done(); }, (e) => { done(e); });
        });
    });
    code_push_plugin_testing_framework_1.TestBuilder.describe("#window.codePush.sync mandatory install mode tests", () => {
        code_push_plugin_testing_framework_1.TestBuilder.it("defaults to IMMEDIATE", false, (done) => {
            code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse(true, targetPlatform) };
            (0, code_push_plugin_testing_framework_1.setupTestRunScenario)(projectManager, targetPlatform, ScenarioSyncMandatoryDefault).then(() => {
                return (0, code_push_plugin_testing_framework_1.setupUpdateScenario)(projectManager, targetPlatform, UpdateDeviceReady, "Update 1 (good update)");
            })
                .then((updatePath) => {
                code_push_plugin_testing_framework_1.ServerUtil.updatePackagePath = updatePath;
                projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE]);
            })
                .done(() => { done(); }, (e) => { done(e); });
        });
        code_push_plugin_testing_framework_1.TestBuilder.it("works correctly when update is mandatory and mandatory install mode is Resume", false, (done) => {
            code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse(true, targetPlatform) };
            (0, code_push_plugin_testing_framework_1.setupTestRunScenario)(projectManager, targetPlatform, ScenarioSyncMandatoryResume).then(() => {
                return (0, code_push_plugin_testing_framework_1.setupUpdateScenario)(projectManager, targetPlatform, UpdateDeviceReady, "Update 1 (good update)");
            })
                .then((updatePath) => {
                code_push_plugin_testing_framework_1.ServerUtil.updatePackagePath = updatePath;
                projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                    new code_push_plugin_testing_framework_1.ServerUtil.AppMessage(code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_STATUS, [code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_UPDATE_INSTALLED])
                ]);
            })
                .then(() => {
                const noUpdateResponse = code_push_plugin_testing_framework_1.ServerUtil.createDefaultResponse();
                noUpdateResponse.is_available = false;
                noUpdateResponse.target_binary_range = "0.0.1";
                code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: noUpdateResponse };
                targetPlatform.getEmulatorManager().resumeApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace, 5 * 1000);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE
                ]);
            })
                .done(() => { done(); }, (e) => { done(e); });
        });
        code_push_plugin_testing_framework_1.TestBuilder.it("works correctly when update is mandatory and mandatory install mode is Suspend", false, (done) => {
            code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse(true, targetPlatform) };
            (0, code_push_plugin_testing_framework_1.setupTestRunScenario)(projectManager, targetPlatform, ScenarioSyncMandatorySuspend).then(() => {
                return (0, code_push_plugin_testing_framework_1.setupUpdateScenario)(projectManager, targetPlatform, UpdateDeviceReady, "Update 1 (good update)");
            })
                .then((updatePath) => {
                code_push_plugin_testing_framework_1.ServerUtil.updatePackagePath = updatePath;
                projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                    new code_push_plugin_testing_framework_1.ServerUtil.AppMessage(code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_STATUS, [code_push_plugin_testing_framework_1.ServerUtil.TestMessage.SYNC_UPDATE_INSTALLED])
                ]);
            })
                .then(() => {
                const noUpdateResponse = code_push_plugin_testing_framework_1.ServerUtil.createDefaultResponse();
                noUpdateResponse.is_available = false;
                noUpdateResponse.target_binary_range = "0.0.1";
                code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: noUpdateResponse };
                targetPlatform.getEmulatorManager().resumeApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE
                ]);
            })
                .done(() => { done(); }, (e) => { done(e); });
        });
        code_push_plugin_testing_framework_1.TestBuilder.it("has no effect on updates that are not mandatory", false, (done) => {
            code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse(false, targetPlatform) };
            (0, code_push_plugin_testing_framework_1.setupTestRunScenario)(projectManager, targetPlatform, ScenarioSyncMandatoryRestart).then(() => {
                return (0, code_push_plugin_testing_framework_1.setupUpdateScenario)(projectManager, targetPlatform, UpdateDeviceReady, "Update 1 (good update)");
            })
                .then((updatePath) => {
                code_push_plugin_testing_framework_1.ServerUtil.updatePackagePath = updatePath;
                projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE]);
            })
                .done(() => { done(); }, (e) => { done(e); });
        });
    });
    code_push_plugin_testing_framework_1.TestBuilder.describe("#codePush.disallowRestart", () => {
        code_push_plugin_testing_framework_1.TestBuilder.it("disallowRestart with IMMEDIATE install mode", false, (done) => {
            code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse(false, targetPlatform) };
            (0, code_push_plugin_testing_framework_1.setupTestRunScenario)(projectManager, targetPlatform, ScenarioDisallowRestartImmediate)
                .then(code_push_plugin_testing_framework_1.setupUpdateScenario.bind(this, projectManager, targetPlatform, UpdateNotifyApplicationReady, "Update 1"))
                .then((updatePath) => {
                code_push_plugin_testing_framework_1.ServerUtil.updatePackagePath = updatePath;
                projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.CHECK_UPDATE_AVAILABLE,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DOWNLOAD_SUCCEEDED,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.UPDATE_INSTALLED,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE
                ]);
            })
                .done(() => { done(); }, (e) => { done(e); });
        });
        code_push_plugin_testing_framework_1.TestBuilder.it("disallowRestart with ON_NEXT_RESUME install mode", false, (done) => {
            code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse(false, targetPlatform) };
            (0, code_push_plugin_testing_framework_1.setupTestRunScenario)(projectManager, targetPlatform, ScenarioDisallowRestartOnResume)
                .then(code_push_plugin_testing_framework_1.setupUpdateScenario.bind(this, projectManager, targetPlatform, UpdateDeviceReady, "Update 1"))
                .then((updatePath) => {
                code_push_plugin_testing_framework_1.ServerUtil.updatePackagePath = updatePath;
                projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.CHECK_UPDATE_AVAILABLE,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DOWNLOAD_SUCCEEDED,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.UPDATE_INSTALLED
                ]);
            })
                .then(() => {
                return targetPlatform.getEmulatorManager().resumeApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace);
            })
                .then(() => {
                targetPlatform.getEmulatorManager().restartApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE]);
            })
                .done(() => { done(); }, (e) => { done(e); });
        });
        code_push_plugin_testing_framework_1.TestBuilder.it("disallowRestart with ON_NEXT_SUSPEND install mode", false, (done) => {
            code_push_plugin_testing_framework_1.ServerUtil.updateResponse = { update_info: code_push_plugin_testing_framework_1.ServerUtil.createUpdateResponse(false, targetPlatform) };
            (0, code_push_plugin_testing_framework_1.setupTestRunScenario)(projectManager, targetPlatform, ScenarioDisallowRestartOnSuspend)
                .then(code_push_plugin_testing_framework_1.setupUpdateScenario.bind(this, projectManager, targetPlatform, UpdateDeviceReady, "Update 1"))
                .then((updatePath) => {
                code_push_plugin_testing_framework_1.ServerUtil.updatePackagePath = updatePath;
                projectManager.runApplication(code_push_plugin_testing_framework_1.TestConfig.testRunDirectory, targetPlatform);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.CHECK_UPDATE_AVAILABLE,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DOWNLOAD_SUCCEEDED,
                    code_push_plugin_testing_framework_1.ServerUtil.TestMessage.UPDATE_INSTALLED
                ]);
            })
                .then(() => {
                return targetPlatform.getEmulatorManager().resumeApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace);
            })
                .then(() => {
                targetPlatform.getEmulatorManager().restartApplication(code_push_plugin_testing_framework_1.TestConfig.TestNamespace);
                return code_push_plugin_testing_framework_1.ServerUtil.expectTestMessages([code_push_plugin_testing_framework_1.ServerUtil.TestMessage.DEVICE_READY_AFTER_UPDATE]);
            })
                .done(() => { done(); }, (e) => { done(e); });
        });
    });
});
//# sourceMappingURL=test.js.map