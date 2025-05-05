const fs = require("fs");
const glob = require("glob");
const path = require("path");

const ignoreFolders = { ignore: ["node_modules/**", "**/build/**"] };
const manifestPath = glob.sync("**/AndroidManifest.xml", ignoreFolders)[0];

exports.getJSBundleFileOverride = `
    @Override
    protected String getJSBundleFile(){
      return CodePush.getJSBundleFile();
    }
`;
exports.reactNativeHostInstantiation = "new ReactNativeHost(this) {";
exports.mainActivityClassDeclaration = "public class MainActivity extends ReactActivity {";
exports.codePushGradleLink = `\napply from: "../../node_modules/react-native-code-push/android/codepush.gradle"`;
exports.deploymentKeyName = "CodePushDeploymentKey";

exports.getMainApplicationLocation = function () {
    return findMainApplication() || glob.sync("**/MainApplication.java", ignoreFolders)[0];
}

exports.getMainActivityPath = function () {
    return glob.sync("**/MainActivity.java", ignoreFolders)[0]
}

exports.getStringsResourcesPath = function () {
    return glob.sync("**/strings.xml", ignoreFolders)[0];
}

exports.getBuildGradlePath = function () {
    return path.join("android", "app", "build.gradle");
}

exports.isJsBundleOverridden = function (codeContents) {
    return /@Override\s*\n\s*protected String getJSBundleFile\(\)\s*\{[\s\S]*?\}/.test(codeContents);
}

function findMainApplication() {
    if (!manifestPath) {
        return null;
    }

    const manifest = fs.readFileSync(manifestPath, "utf8");

    // Android manifest must include single 'application' element
    const matchResult = manifest.match(/application\s+android:name\s*=\s*"(.*?)"/);
    let appName;
    if (matchResult) {
        appName = matchResult[1];
    } else {
        return null;
    }

    const nameParts = appName.split('.');
    const searchPath = glob.sync("**/" + nameParts[nameParts.length - 1] + ".java", ignoreFolders)[0];
    return searchPath;
}
