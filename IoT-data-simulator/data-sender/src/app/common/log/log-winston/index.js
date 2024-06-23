const { createLogger, format, transports, config } = require('winston');
const { combine, timestamp, printf, colorize } = format;
const loggerUtil = require('./logger');
const Config = require('./config');
const logOptions = Config.logOptions;

// Define custom format for Winston
const customFormat = printf(({ level, message, meta }) => {
    return `[${loggerUtil.getTimeStamp()}] ${meta.module}\n[${level.toUpperCase()}]\t${message}`;
});

// Create a new logger instance with the updated Winston API
const logger = createLogger({
    levels: logOptions.custom_levels,
    format: combine(
        timestamp({ format: logOptions.date_time_format }),
        colorize({ all: true }),
        customFormat
    ),
    transports: [
        new transports.Console({
            level: logOptions.level,
            handleExceptions: true
        })
    ],
    exitOnError: false
});

function error(args, filename) {
    logger.error(args, { module: loggerUtil.getModuleName(filename) });
}

function warn(args, filename) {
    logger.warn(args, { module: loggerUtil.getModuleName(filename) });
}

function info(args, filename) {
    logger.info(args, { module: loggerUtil.getModuleName(filename) });
}

function debug(args, filename) {
    logger.debug(args, { module: loggerUtil.getModuleName(filename) });
}

function trace(args, filename) {
    logger.trace(args, { module: loggerUtil.getModuleName(filename) });
}

module.exports = {
    error,
    warn,
    info,
    debug,
    trace
};
