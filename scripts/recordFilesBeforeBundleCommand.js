/*
 * This script creates a snapshot of the contents in the resource directory
 * by creating a map with the modified time of all the files in the directory
 * and saving it to a temp file. This snapshot is later referenced in 
 * "generatePackageHash.js" to figure out which files have changed or were
 * newly generated by the "react-native bundle" command.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

const getFilesInFolder = require("./getFilesInFolder");


let resourcesDir = process.argv[2];
let tempFileName = process.argv[3];

let tempFileLocalPath = path.join(os.tmpdir(), tempFileName);
let resourceFiles = [];

try {
    getFilesInFolder(resourcesDir, resourceFiles);
} catch(error) {
    let targetPathNotFoundExceptionMessage = "\nResources directory path does not exist.\n";
    targetPathNotFoundExceptionMessage += "Unable to find '" + resourcesDir;
    targetPathNotFoundExceptionMessage += "' directory. Please check version of Android Plugin for Gradle.";
    error.message += targetPathNotFoundExceptionMessage;
    throw error;
}

let fileToModifiedTimeMap = {};

resourceFiles.forEach(function(resourceFile) {
    fileToModifiedTimeMap[resourceFile.path.substring(resourcesDir.length)] = resourceFile.mtime.getTime();
});

fs.writeFile(tempFileLocalPath, JSON.stringify(fileToModifiedTimeMap), function(err) {
    if (err) {
        throw err;
    }
}); 