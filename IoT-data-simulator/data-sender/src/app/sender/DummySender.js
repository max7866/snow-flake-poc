const logger = require('../common/log');
const CommonSender = require('./CommonSender');
const Constants = require('../common/Constants');

class DummySender extends CommonSender {
    constructor() {
        super();
    }

    getAmqpQueue() {
        return Constants.DUMMY_QUEUE;
    }

    /**
     * Send payload (dummy implementation)
     * @param {string} sessionId
     * @param {Object} target
     * @param {string} payload
     * @returns {Promise<void>}
     */
    async sendPayload(sessionId, target, payload) {
        logger.debug(">>> Processing dummy send payload.");
    }
}

module.exports = DummySender;
