module.exports = {
    dependency: {
        platforms: {
            android: {
                packageImportPath: "import com.microsoft.codepush.react.CodePush;",
                packageInstance:
                    "new CodePush(null,this)"
            }
        }
    }
};
