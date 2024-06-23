const logger = require('../../common/log/index');
const CommonSender = require('../CommonSender');
const Constants = require('../../common/Constants');
const SecurityBuilder = require('../../security/SecurityBuilder');
const Mqtt = require("async-mqtt");

class MqttHelper extends CommonSender {
    constructor() {
        super();
    }

    /**
     * Send payload to MQTT broker
     * @param {string} sessionId
     * @param {Object} target
     * @param {string} payload
     * @returns {Promise<void>}
     */
    async sendPayload(sessionId, target, payload) {
        logger.debug(">>> Mqtt send payload: processing mqtt send payload.");

        const connectionMapKey = JSON.stringify(target);
        let clientConnection = this.clientConnections.get(connectionMapKey);

        if (!clientConnection) {
            clientConnection = await this.getClientConnection(target, connectionMapKey);
            this.clientConnections.set(connectionMapKey, clientConnection);
        }

        logger.debug(`>>> Mqtt send payload: sending payload ${payload} for session ${sessionId} to the mqtt broker: ${JSON.stringify(target)}.`);
        await clientConnection.publish(target.topic, payload);
    }

    /**
     * Get client connection
     * @param {Object} target
     * @param {string} connectionMapKey
     * @returns {Promise<Mqtt.AsyncMqttClient>}
     */
    async getClientConnection(target, connectionMapKey) {
        logger.debug(`>>> Opening mqtt connection to target: ${JSON.stringify(target)}`);

        const options = await this.getSecurityData(target.security);
        options.rejectUnauthorized = false;
        const mqttUrl = this.getMqttUrl(target, options);

        return new Promise((resolve, reject) => {
            const connection = Mqtt.connect(mqttUrl, options);

            connection.on('connect', () => {
                logger.debug(">>> Mqtt connection has been opened.");
                resolve(connection);
            });

            connection.on('error', (error) => {
                logger.error(`>>> Mqtt connection has been failed due to error: ${JSON.stringify(error.message)}`);
                this.clientConnections.delete(connectionMapKey);
                connection.end();
                reject(error);
            });

            connection.on('close', (error) => {
                logger.debug(">>> Mqtt connection has been closed");
                this.clientConnections.delete(connectionMapKey);
                connection.end();
                if (error) {
                    logger.error(error);
                    reject(error);
                }
            });
        });
    }

    /**
     * Get MQTT URL
     * @param {Object} target
     * @param {Object} options
     * @returns {string}
     */
    getMqttUrl(target, options) {
        return options.url || target.url;
    }

    /**
     * Get security data
     * @param {Object} security
     * @returns {Promise<Object>}
     */
    async getSecurityData(security = {}) {
        return new Promise((resolve, reject) => {
            if (!security.type) {
                return resolve({});
            }

            switch (security.type) {
                case Constants.SECURITY_CREDENTIALS:
                    resolve(SecurityBuilder.getCredentials(security));
                    break;
                case Constants.SECURITY_CERTIFICATE:
                    resolve(SecurityBuilder.getCertificates(security));
                    break;
                case Constants.SECURITY_TOKEN:
                    resolve(SecurityBuilder.getSecurityTokenMqtt(security));
                    break;
                default:
                    reject(new Error(`${security.type} doesn't supported`));
            }
        });
    }
}

module.exports = MqttHelper;
