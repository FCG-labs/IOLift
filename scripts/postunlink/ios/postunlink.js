
const linkTools = require('../../tools/linkToolsIos');
const fs = require("fs");
const plist = require("plist");
const semver = require('semver');
const loadProjectPackageJson = require('../../utils/loadProjectPackageJson');
const packageFile = loadProjectPackageJson();

module.exports = () => {

    console.log("Running ios postunlink script");

    const appDelegatePath = linkTools.getAppDeletePath();

    if (!appDelegatePath) {
        console.log(`Couldn't find AppDelegate. You might need to update it manually \
    Please refer to plugin configuration section for iOS at \
    https://github.com/microsoft/react-native-code-push#plugin-configuration-ios`);
    } else {
        let appDelegateContents = fs.readFileSync(appDelegatePath, "utf8");

        // 1. Remove the header import statement
        if (!~appDelegateContents.indexOf(linkTools.codePushHeaderImportStatement)) {
            console.log(`"CodePush.h" header already removed.`);
        } else {
            appDelegateContents = appDelegateContents.replace(linkTools.codePushHeaderImportStatementFormatted, "");
        }

        // 2. Modify jsCodeLocation value assignment
        const codePushBundleUrl = linkTools.codePushBundleUrl;
        if (!~appDelegateContents.indexOf(codePushBundleUrl)) {
            console.log(`"jsCodeLocation" already not pointing to "[CodePush bundleURL]".`);
        } else {
            const reactNativeVersion = packageFile && packageFile.dependencies && packageFile.dependencies["react-native"];
            if (!reactNativeVersion) {
                console.log(`Can't take react-native version from package.json`);
            } else if (semver.gte(semver.coerce(reactNativeVersion), "0.59.0")) {
                const oldBundleUrl = linkTools.oldBundleUrl;
                appDelegateContents = appDelegateContents.replace(codePushBundleUrl, oldBundleUrl);
                fs.writeFileSync(appDelegatePath, appDelegateContents);
            } else {
                const linkedJsCodeLocationAssignmentStatement = linkTools.linkedJsCodeLocationAssignmentStatement;
                const jsCodeLocations = appDelegateContents.match(/(jsCodeLocation = .*)/g);
                if (!jsCodeLocations || jsCodeLocations.length !== 2 || !~appDelegateContents.indexOf(linkedJsCodeLocationAssignmentStatement)) {
                    console.log(`AppDelegate isn't compatible for unlinking`);
                } else {
                    if (semver.eq(semver.coerce(reactNativeVersion), "0.57.8") || semver.eq(semver.coerce(reactNativeVersion), "0.57.0")) {
                        // If version of react-native application is 0.57.8 or 0.57 then by default there are two different
                        // jsCodeLocation for debug and release and we should replace only release
                        const unlinkedJsCodeLocations = `jsCodeLocation = [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];`;
                        appDelegateContents = appDelegateContents.replace(linkedJsCodeLocationAssignmentStatement,
                            unlinkedJsCodeLocations);
                    } else {
                        // If version of react-native application is not 0.57.8 or 0.57 and lower than 0.59.0 then by default there is only one
                        // jsCodeLocation and we should stay on only it
                        const defaultJsCodeLocationAssignmentStatement = jsCodeLocations[0];
                        const linkedCodeLocationPatch = linkTools.getJsCodeLocationPatch(defaultJsCodeLocationAssignmentStatement);
                        appDelegateContents = appDelegateContents.replace(linkedCodeLocationPatch,
                            defaultJsCodeLocationAssignmentStatement);
                    }
                    fs.writeFileSync(appDelegatePath, appDelegateContents);
                }
            }
        }
    }

    const plistPath = linkTools.getPlistPath();

    if (!plistPath) {
        return Promise.reject(`Couldn't find .plist file. You might need to update it manually \
    Please refer to plugin configuration section for iOS at \
    https://github.com/microsoft/react-native-code-push#plugin-configuration-ios`);
    }

    let plistContents = fs.readFileSync(plistPath, "utf8");

    // 3. Remove CodePushDeploymentKey from plist file
    const parsedInfoPlist = plist.parse(plistContents);
    if (!parsedInfoPlist.CodePushDeploymentKey) {
        console.log(`"CodePushDeploymentKey" already removed from the plist file.`);
    } else {
        delete parsedInfoPlist.CodePushDeploymentKey;
        plistContents = plist.build(parsedInfoPlist);
        fs.writeFileSync(plistPath, plistContents);
    }

    return Promise.resolve();
}
