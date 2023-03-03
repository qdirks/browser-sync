"use strict";

var messages = require("./connect-utils");
var utils = require("./utils");
var _ = require("./lodash.custom");
var path = require("path");
var chalk = require("chalk");

var template = (prefix) => "[" + chalk.blue(prefix) + "] "

var logger = require("eazy-logger").Logger({
    useLevelPrefixes: false
});

module.exports.logger = logger;

/**
 * @param name
 * @returns {*}
 */
module.exports.getLogger = function(name) {
    return logger.clone(function(config) {
        config.prefix = config.prefix + template(name)
        return config;
    });
};

/**
 * Logging Callbacks
 */
module.exports.callbacks = {
    /**
     * Log when file-watching has started
     * @param {BrowserSync} bs
     * @param data
     */
    "file:watching": function(bs, data) {
        if (Object.keys(data).length) {
            logger.info("Watching files...");
        }
    },
    /**
     * Log when a file changes
     * @param {BrowserSync} bs
     * @param data
     */
    "file:reload": function(bs, data) {
        if (canLogFileChange(bs, data)) {
            if (data.path[0] === "*") {
                return logger.info(
                    chalk.cyan("Reloading files that match: %s"),
                    chalk.magenta(data.path)
                );
            }

            logger.info(
                chalk.cyan("File event [%s] : %s"),
                data.event,
                chalk.magenta(data.path),
            );
        }
    },
    /**
     *
     */
    "service:exit": function() {
        logger.debug("Exiting...");
    },
    /**
     *
     */
    "browser:reload": function(bs, data = {}) {
        if (canLogFileChange(bs)) {
            if (data.files && data.files.length > 1) {
                return logger.info(
                    chalk.cyan(`Reloading Browsers... (buffered %s events)`),
                    data.files.length
                );
            }
            logger.info(chalk.cyan("Reloading Browsers..."));
        }
    },
    /**
     *
     */
    "browser:error": function() {
        logger.error(
            "Couldn't open browser (if you are using BrowserSync in a " +
            "headless environment, you might want to set the %s option to %s)",
            chalk.cyan("open"),
            chalk.cyan("false"),
        );
    },
    /**
     * @param {BrowserSync} bs
     * @param data
     */
    "stream:changed": function(bs, data) {
        if (canLogFileChange(bs)) {
            var changed = data.changed;

            logger.info(
                chalk.cyan("%s %s changed (%s)"),
                changed.length,
                changed.length > 1 ? "files" : "file",
                chalk.magenta(changed.join(", "))
            );
        }
    },
    /**
     * Client connected logging
     * @param {BrowserSync} bs
     * @param data
     */
    "client:connected": function(bs, data) {
        var uaString = utils.getUaString(data.ua);
        var msg = chalk.cyan("Browser Connected: %s, version: %s");
        var method = "info";

        if (!bs.options.get("logConnections")) {
            method = "debug";
        }

        logger.log(method, msg, chalk.magenta(uaString.name), chalk.magenta(uaString.version));
    },
    /**
     * Main logging when the service is running
     * @param {BrowserSync} bs
     * @param data
     */
    "service:running": function(bs, data) {
        const type = data.type;
        if (bs.options.get("json")) {
            return console.log(
                JSON.stringify({
                    "service:running": {
                        options: bs.options.toJS()
                    }
                })
            );
        }
        if (type === "server") {
            var baseDir = bs.options.getIn(["server", "baseDir"]);

            logUrls(bs.options.get("urls").toJS());

            if (baseDir) {
                if (utils.isList(baseDir)) {
                    baseDir.forEach(serveFiles);
                } else {
                    serveFiles(baseDir);
                }
            }
        }

        if (type === "proxy") {
            logger.info(
                "Proxying: %s",
                chalk.cyan(bs.options.getIn(["proxy", "target"]))
            );
            logUrls(bs.options.get("urls").toJS());
        }

        if (type === "snippet") {
            if (bs.options.get("logSnippet")) {
                logger.info(
                    chalk.bold(`Copy the following snippet into your website, just before the closing ${chalk.cyan('</body>')} tag`)
                );

                logger.unprefixed("info", messages.scriptTags(bs.options));
            }

            logUrls(
                bs.options
                    .get("urls")
                    .filter(function(value, key) {
                        return key.slice(0, 2) === "ui";
                    })
                    .toJS()
            );
        }

        function serveFiles(base) {
            const base_ = path.resolve(base);
            const parr = base_.split(path.sep);
            const abbr = "...";
            if (parr.length > 2 && parr.slice(1, -1).join(path.sep).length > abbr.length)
                base = parr[0] + path.sep + abbr + path.sep + parr[parr.length - 1];
            else base = base_;
            logger.info("Serving files from: %s", chalk.magenta(base));
        }
    }
};

/**
 * Plugin interface for BrowserSync
 * @param {EventEmitter} emitter
 * @param {BrowserSync} bs
 * @returns {Object}
 */
module.exports.plugin = function(emitter, bs) {
    var logPrefix = bs.options.get("logPrefix");
    var logLevel = bs.options.get("logLevel");

    // Should set logger level here!
    logger.setLevel(logLevel);

    if (logPrefix) {
        if (_.isFunction(logPrefix)) {
            logger.setPrefix(logPrefix);
        } else {
            logger.setPrefix(template(logPrefix));
        }
    }

    _.each(exports.callbacks, function(func, event) {
        emitter.on(event, func.bind(this, bs));
    });

    return logger;
};

/**
 *
 * @param urls
 */
function logUrls(urls) {
    var locationNames = Object.keys(urls);
    var maxName = 0;
    var maxUrl = 0;

    // determine the max width of the output
    locationNames.forEach(function (name) {
        if (urls[name].length > maxUrl) maxUrl = urls[name].length;
        name = transform(name);
        if (name.length > maxName) maxName = name.length;
    });
    var maxWidth = maxName + maxUrl + 2;

    // log the access urls
    var underline = "".padEnd(maxWidth, '-');
    logger.info(chalk.bold("Access URLs:"));
    logger.unprefixed("info", " %s", chalk.grey(underline));
    locationNames.forEach(function (name, ix) {
        var tName = transform(name).padStart(maxName);
        logger.unprefixed("info", " %s: %s", tName, chalk.magenta(urls[name]));
        if (ix % 2) logger.unprefixed("info", " %s", chalk.grey(underline));
    });
}

/**
 * Transform url-key names into something more presentable
 * @param {string} key
 * @returns {string}
 */
function transform(key) {
    if (key === 'ui')          return "UI Local";
    if (key === 'ui-external') return "UI External";

    // otherwise capitalize
    return key.substring(0, 1).toUpperCase() + key.substring(1);
}

/**
 * Determine if file changes should be logged
 * @param bs
 * @param data
 * @returns {boolean}
 */
function canLogFileChange(bs, data) {
    if (data && data.log === false) {
        return false;
    }

    return bs.options.get("logFileChanges");
}
