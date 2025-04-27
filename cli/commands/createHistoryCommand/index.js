const { program, Option } = require("commander");
const { findAndReadConfigFile } = require("../../utils/fsUtils");
const { createReleaseHistory } = require("./createReleaseHistory");
const { CONFIG_FILE_NAME } = require('../../constant');

program.command('create-history')
    .description('Creates a new release history for the binary app.')
    .requiredOption('-b, --binary-version <string>', '(Required) The target binary version')
    .addOption(new Option('-p, --platform <type>', 'platform').choices(['ios', 'android']).default('ios'))
    .option('-i, --identifier <string>', 'reserved characters to distinguish the release.')
    .option('-c, --config <path>', 'set config file name (JS/TS)', CONFIG_FILE_NAME)
    /**
     * @param {Object} options
     * @param {string} options.binaryVersion
     * @param {string} options.platform
     * @param {string} options.identifier
     * @param {string} options.config
     * @return {void}
     */
    .action(async (options) => {
        const config = findAndReadConfigFile(process.cwd(), options.config);

        await createReleaseHistory(
            options.binaryVersion,
            config.setReleaseHistory,
            options.platform,
            options.identifier
        );
    });
