var _ = require("../lodash.custom");
import * as path from "path";
import * as fs from "fs";
import { merge, printErrors } from "../cli/cli-options";

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
        else if (!fs.existsSync(args.config.cwd)) throw new Error(`Invalid directory specified for cwd option.`);
        else args.config.cwd = path.resolve(args.config.cwd);

        const [opts, errors] = merge(args.config);

        if (errors.length) {
            return args.cb(new Error(printErrors(errors)));
        }

        return browserSync.init(opts, args.cb);
    };
};
