var _ = require("../lodash.custom");
import * as path from "path";
import * as fs from "fs";
import { merge, printErrors } from "../cli/cli-options";
var logger = require("eazy-logger").Logger({
    useLevelPrefixes: false
});

/**
 * @param {BrowserSync} browserSync
 * @param {String} [name] - instance name
 * @param {Object} pjson
 * @returns {Function}
 */
module.exports = function(browserSync, name, pjson) {
    return function() {
        /**
         * Handle new + old signatures for init.
         */
        var args = require("../args")(_.toArray(arguments));

        /**
         * If the current instance is already running, just return an error
         */
        if (browserSync.active) {
            return args.cb(new Error(`Instance: ${name} is already running!`));
        }

        // Env specific items
        args.config.version = pjson.version;
        if (!args.config.cwd) args.config.cwd = process.cwd();
        else if (typeof args.config.cwd === 'string') {
            if (args.config.cwd.indexOf('"') > -1) args.config.cwd = args.config.cwd.replace('"', ()=>"") + path.sep;
        }
        if (!fs.existsSync(args.config.cwd)) {
            logger.error(`Invalid directory specified for cwd option. Got: ${args.config.cwd}`);
            return;
        }
        args.config.cwd = path.resolve(args.config.cwd);

        const [opts, errors] = merge(args.config);

        if (errors.length) {
            return args.cb(new Error(printErrors(errors)));
        }

        return browserSync.init(opts, args.cb);
    };
};
