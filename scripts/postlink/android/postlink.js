const linkTools = require('../../tools/linkToolsAndroid');
const fs = require("fs");
const inquirer = require('inquirer');

module.exports = () => {

    console.log("Running android postlink script");

    const buildGradlePath = linkTools.getBuildGradlePath();
    const mainApplicationPath = linkTools.getMainApplicationLocation();

    // 1. Add the getJSBundleFile override
    const getJSBundleFileOverride = linkTools.getJSBundleFileOverride;

    if (mainApplicationPath) {
        let mainApplicationContents = fs.readFileSync(mainApplicationPath, "utf8");
        if (linkTools.isJsBundleOverridden(mainApplicationContents)) {
            console.log(`"getJSBundleFile" is already overridden`);
        } else {
            const reactNativeHostInstantiation = linkTools.reactNativeHostInstantiation;
            mainApplicationContents = mainApplicationContents.replace(reactNativeHostInstantiation,
                `${reactNativeHostInstantiation}${getJSBundleFileOverride}`);
            fs.writeFileSync(mainApplicationPath, mainApplicationContents);
        }
    } else {
        const mainActivityPath = linkTools.getMainActivityPath();
        if (mainActivityPath) {
            let mainActivityContents = fs.readFileSync(mainActivityPath, "utf8");
            if (linkTools.isJsBundleOverridden(mainActivityContents)) {
                console.log(`"getJSBundleFile" is already overridden`);
            } else {
                const mainActivityClassDeclaration = linkTools.mainActivityClassDeclaration;
                mainActivityContents = mainActivityContents.replace(mainActivityClassDeclaration,
                    `${mainActivityClassDeclaration}${getJSBundleFileOverride}`);
                fs.writeFileSync(mainActivityPath, mainActivityContents);
            }
        } else {
            return Promise.reject(`Couldn't find Android application entry point. You might need to update it manually. \
    Please refer to plugin configuration section for Android at \
    https://github.com/microsoft/react-native-code-push/blob/master/docs/setup-android.md#plugin-configuration-for-react-native-lower-than-060-android for more details`);
        }
    }

    if (!fs.existsSync(buildGradlePath)) {
        return Promise.reject(`Couldn't find build.gradle file. You might need to update it manually. \
    Please refer to plugin installation section for Android at \
    https://github.com/microsoft/react-native-code-push/blob/master/docs/setup-android.md#plugin-installation-android---manual`);
    }

    // 2. Add the codepush.gradle build task definitions
    var buildGradleContents = fs.readFileSync(buildGradlePath, "utf8");
    const reactGradleLink = buildGradleContents.match(/\napply from: ["'].*?react\.gradle["']/)[0];
    const codePushGradleLink = linkTools.codePushGradleLink;
    if (~buildGradleContents.indexOf(codePushGradleLink)) {
        console.log(`"codepush.gradle" is already linked in the build definition`);
    } else {
        buildGradleContents = buildGradleContents.replace(reactGradleLink,
            `${reactGradleLink}${codePushGradleLink}`);
        fs.writeFileSync(buildGradlePath, buildGradleContents);
    }

    //3. Add deployment key
    const stringsResourcesPath = linkTools.getStringsResourcesPath();
    if (!stringsResourcesPath) {
        return Promise.reject(new Error(`Couldn't find strings.xml. You might need to update it manually.`));
    } else {
        let stringsResourcesContent = fs.readFileSync(stringsResourcesPath, "utf8");
        const deploymentKeyName = linkTools.deploymentKeyName;
        if (~stringsResourcesContent.indexOf(deploymentKeyName)) {
            console.log(`${deploymentKeyName} already specified in the strings.xml`);
        } else {
            return inquirer.prompt({
                "type": "input",
                "name": "androidDeploymentKey",
                "message": "What is your CodePush deployment key for Android (hit <ENTER> to ignore)"
            }).then(function(answer) {
                const insertAfterString = "<resources>";
                const deploymentKeyString = `\t<string moduleConfig="true" name="${deploymentKeyName}">${answer.androidDeploymentKey || "deployment-key-here"}</string>`;
                stringsResourcesContent = stringsResourcesContent.replace(insertAfterString,`${insertAfterString}\n${deploymentKeyString}`);
                fs.writeFileSync(stringsResourcesPath, stringsResourcesContent);
                return Promise.resolve();
            });
        }
    }

    return Promise.resolve();
}
