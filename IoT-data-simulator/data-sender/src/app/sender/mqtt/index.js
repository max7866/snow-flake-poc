const CommonSender = require('../CommonSender');
const Constants = require('../../common/Constants');
const AwsHelper = require('./AwsHelper');
const MqttHelper = require('./MqttHelper');

class MqttSender extends CommonSender {
    constructor() {
        super();
        this.awsHelper = new AwsHelper();
        this.mqttHelper = new MqttHelper();
    }

    /**
     * Get the AMQP queue for MQTT
     * @returns {string}
     */
    getAmqpQueue() {
        return Constants.MQTT_QUEUE;
    }

    /**
     * Derive the protocol prefix based on the security type
     * @param {string} securityType
     * @returns {string}
     */
    deriveTargetSystemProtocolPrefix(securityType) {
        switch (securityType) {
            case Constants.SECURITY_CERTIFICATE:
                return Constants.MQTTS_PREFIX;
            case Constants.SECURITY_ACCESS_KEYS:
                return Constants.MQTT_WSS_PREFIX;
            default:
                return Constants.MQTT_PREFIX;
        }
    }

    /**
     * Send payload to the target system
     * @param {string} sessionId
     * @param {Object} target
     * @param {string} payload
     * @returns {Promise<void>}
     */
    async sendPayload(sessionId, target, payload) {
        const helper = this.getMqttHelper(target.url);
        await helper.sendPayload(sessionId, target, payload);
    }

    /**
     * Get the appropriate MQTT helper based on the URL
     * @param {string} mqttUrl
     * @returns {AwsHelper|MqttHelper}
     */
    getMqttHelper(mqttUrl) {
        return mqttUrl.includes(Constants.AMAZON_URL) ? this.awsHelper : this.mqttHelper;
    }
}

module.exports = MqttSender;
