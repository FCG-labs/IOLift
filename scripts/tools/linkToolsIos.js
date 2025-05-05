const glob = require("glob");
const path = require("path");
const xcode = require("xcode");
const loadProjectPackageJson = require('../utils/loadProjectPackageJson');
const packageFile = loadProjectPackageJson();

const ignoreNodeModules = { ignore: "node_modules/**" };
const ignoreNodeModulesAndPods = { ignore: ["node_modules/**", "ios/Pods/**"] };
const appDelegatePaths = glob.sync("**/AppDelegate.+(mm|m)", ignoreNodeModules);

exports.codePushHeaderImportStatement = `#import <CodePush/CodePush.h>`;
exports.codePushHeaderImportStatementFormatted = `\n${this.codePushHeaderImportStatement}`;
exports.codePushBundleUrl = "[CodePush bundleURL]";
exports.oldBundleUrl = "[[NSBundle mainBundle] URLForResource:@\"main\" withExtension:@\"jsbundle\"]";
exports.linkedJsCodeLocationAssignmentStatement = "jsCodeLocation = [CodePush bundleURL];";

exports.getJsCodeLocationPatch = function(defaultJsCodeLocationAssignmentStatement) {
    return `
  #ifdef DEBUG
    ${defaultJsCodeLocationAssignmentStatement}
  #else
    ${this.linkedJsCodeLocationAssignmentStatement}
  #endif`;
}

// Fix for https://github.com/microsoft/react-native-code-push/issues/477
// Typical location of AppDelegate.m for newer RN versions: $PROJECT_ROOT/ios/<project_name>/AppDelegate.m
// Let's try to find that path by filtering the whole array for any path containing <project_name>
// If we can't find it there, play dumb and pray it is the first path we find.
exports.getAppDeletePath = () => {
    return findFileByAppName(appDelegatePaths, packageFile ? packageFile.name : null) || appDelegatePaths[0];
}

exports.getPlistPath = () => {
    const xcodeProjectPaths = glob.sync(`**/*.xcodeproj/project.pbxproj`, ignoreNodeModulesAndPods);
    if (!xcodeProjectPaths){
        return getDefaultPlistPath();
    }

    if (xcodeProjectPaths.length !== 1) {
        console.log('Could not determine correct xcode proj path to retrieve related plist file, there are multiple xcodeproj under the solution.');
        return getDefaultPlistPath();
    }

    const xcodeProjectPath = xcodeProjectPaths[0];
    let parsedXCodeProj;

    try {
        const proj = xcode.project(xcodeProjectPath);
        //use sync version because there are some problems with async version of xcode lib as of current version
        parsedXCodeProj = proj.parseSync();
    }
    catch(e) {
        console.log('Couldn\'t read info.plist path from xcode project - error: ' + e.message);
        return getDefaultPlistPath();
    }

    const INFO_PLIST_PROJECT_KEY = 'INFOPLIST_FILE';
    const RELEASE_BUILD_PROPERTY_NAME = "Release";
    const targetProductName = packageFile ? packageFile.name : null;

    //Try to get 'Release' build of ProductName matching the package name first and if it doesn't exist then try to get any other if existing
    const plistPathValue = getBuildSettingsPropertyMatchingTargetProductName(parsedXCodeProj, INFO_PLIST_PROJECT_KEY, targetProductName, RELEASE_BUILD_PROPERTY_NAME) ||
        getBuildSettingsPropertyMatchingTargetProductName(parsedXCodeProj, INFO_PLIST_PROJECT_KEY, targetProductName) ||
        getBuildSettingsPropertyMatchingTargetProductName(parsedXCodeProj, INFO_PLIST_PROJECT_KEY, null, RELEASE_BUILD_PROPERTY_NAME) ||
        getBuildSettingsPropertyMatchingTargetProductName(parsedXCodeProj, INFO_PLIST_PROJECT_KEY) ||
        parsedXCodeProj.getBuildProperty(INFO_PLIST_PROJECT_KEY, RELEASE_BUILD_PROPERTY_NAME) ||
        parsedXCodeProj.getBuildProperty(INFO_PLIST_PROJECT_KEY);

    if (!plistPathValue){
        return getDefaultPlistPath();
    }

    //also remove surrounding quotes from plistPathValue to get correct path resolved
    //(see https://github.com/microsoft/react-native-code-push/issues/534#issuecomment-302069326 for details)
    return path.resolve(path.dirname(xcodeProjectPath), '..', plistPathValue.replace(/^"(.*)"$/, '$1'));
}

// Helper that filters an array with AppDelegate.m paths for a path with the app name inside it
// Should cover nearly all cases
function findFileByAppName(array, appName) {
    if (array.length === 0 || !appName) return null;

    for (let i = 0; i < array.length; i++) {
        const path = array[i];
        if (path && path.indexOf(appName) !== -1) {
            return path;
        }
    }

    return null;
}

function getDefaultPlistPath() {
    //this is old logic in case we are unable to find PLIST from xcode/pbxproj - at least we can fallback to default solution
    return glob.sync(`**/${packageFile.name}/*Info.plist`, ignoreNodeModules)[0];
}

// This is enhanced version of standard implementation of xcode 'getBuildProperty' function
// but allows us to narrow results by PRODUCT_NAME property also.
// So we suppose that proj name should be the same as package name, otherwise fallback to default plist path searching logic
function getBuildSettingsPropertyMatchingTargetProductName(parsedXCodeProj, prop, targetProductName, build) {
    let target;
    const COMMENT_KEY = /_comment$/;
    const PRODUCT_NAME_PROJECT_KEY = 'PRODUCT_NAME';
    const TV_OS_DEPLOYMENT_TARGET_PROPERTY_NAME = 'TVOS_DEPLOYMENT_TARGET';
    const TEST_HOST_PROPERTY_NAME = 'TEST_HOST';

    const configs = parsedXCodeProj.pbxXCBuildConfigurationSection();
    for (const configName in configs) {
        if (!COMMENT_KEY.test(configName)) {
            const config = configs[configName];
            if ( (build && config.name === build) || (build === undefined) ) {
                if (targetProductName) {
                    if (config.buildSettings[prop] !== undefined && config.buildSettings[PRODUCT_NAME_PROJECT_KEY] == targetProductName) {
                        target = config.buildSettings[prop];
                    }
                } else {
                    if (config.buildSettings[prop] !== undefined  &&
                    //exclude tvOS projects
                    config.buildSettings[TV_OS_DEPLOYMENT_TARGET_PROPERTY_NAME] == undefined &&
                    //exclude test app
                    config.buildSettings[TEST_HOST_PROPERTY_NAME] == undefined) {
                        target = config.buildSettings[prop];
                    }
                }
            }
        }
    }
    return target;
}
