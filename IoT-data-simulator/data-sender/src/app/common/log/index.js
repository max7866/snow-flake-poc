const logConsole = require('./log-winston/index');

module.exports = {
    error(...args) {
        logConsole.error(args, module.filename);
    },

    warn(...args) {
        logConsole.warn(args, module.filename);
    },

    info(...args) {
        logConsole.info(args, module.filename);
    },

    debug(...args) {
        logConsole.debug(args, module.filename);
    },

    trace(...args) {
        logConsole.trace(args, module.filename);
    }
};
