const Constants = require('./Constants');

module.exports = {
    /**
     * Parse the protocol from a given URL
     * @param {string} url
     * @returns {string}
     */
    parseProtocol(url) {
        /**
         * Built-in 'url' module for url 'localhost:8000' returns protocol 'localhost:'
         * but it is expected to get nothing in this case.
         * So, parsing protocol manually
         */
        if (url) {
            const delimiterIndex = url.indexOf(Constants.URL_PROTOCOL_DELIMITER);
            if (delimiterIndex >= 0) {
                return url.substring(0, delimiterIndex);
            }
        }
        return ''; // Return empty string if no protocol is found
    },

    /**
     * Check if a value is a string
     * @param {any} value
     * @returns {boolean}
     */
    isStringValue(value) {
        return typeof value === 'string' || value instanceof String;
    }
};
