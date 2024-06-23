const Path = require("path");
const Moment = require('moment');
const Config = require('./config');
const logOptions = Config.logOptions;

module.exports = {
    getModuleName(path) {
        if (path) {
            const dirName = Path.dirname(path).split(Path.sep);
            const moduleName = `..${Path.sep}${dirName[dirName.length - 1]}${Path.sep}${Path.basename(path)}`;
            return moduleName;
        }
        return "";
    },

    getTimeStamp() {
        return Moment().format(logOptions.date_time_format);
    }
};
