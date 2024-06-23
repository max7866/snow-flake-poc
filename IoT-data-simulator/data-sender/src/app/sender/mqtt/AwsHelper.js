const logger = require('../../common/log/index');
const CommonSender = require('../CommonSender');
const Constants = require('../../common/Constants');
const SecurityBuilder = require('../../security/SecurityBuilder');
const { device: AwsDevice } = require("aws-iot-device-sdk");
const url = require('url');

class AwsHelper extends CommonSender {
    constructor() {
        super();
    }

    /**
     * Send payload to AWS MQTT broker
     * @param {string} sessionId
     * @param {Object} target
     * @param {string} payload
     * @returns {Promise<void>}
     */
    async sendPayload(sessionId, target, payload) {
        logger.debug(">>> Aws mqtt send payload: processing mqtt send payload.");

        const connectionMapKey = JSON.stringify(target);
        let clientConnection = this.clientConnections.get(connectionMapKey);

        if (!clientConnection) {
            clientConnection = this.getClientConnection(target, connectionMapKey);
            this.clientConnections.set(connectionMapKey, clientConnection);
        }

        logger.debug(`>>> Aws mqtt send payload: sending payload ${payload} for session ${sessionId} to the aws mqtt broker: ${JSON.stringify(target)}.`);

        const client = await this.getClient(clientConnection);
        client.publish(target.topic, payload);
    }

    /**
     * Get client connection
     * @param {Promise} clientConnection
     * @returns {Promise}
     */
    async getClient(clientConnection) {
        return await clientConnection;
    }

    /**
     * Get client connection
     * @param {Object} target
     * @param {string} connectionMapKey
     * @returns {Promise}
     */
    async getClientConnection(target, connectionMapKey) {
        logger.debug(`>>> Opening aws mqtt connection to target: ${JSON.stringify(target)}`);

        const options = await this.getSecurityData(target.security);
        const urlObj = url.parse(target.url);
        options.host = urlObj.host ? urlObj.host : urlObj.path;

        if (options.accessKeyId) {
            options.protocol = this.getProtocol(urlObj);
        }

        return new Promise((resolve, reject) => {
            const client = AwsDevice(options);

            client.on('connect', () => {
                logger.debug(">>> AWS mqtt connection has been opened.");
                resolve(client);
            });

            client.on('error', (error) => {
                logger.error(`>>> AWS mqtt connection has been failed due to error: ${JSON.stringify(error)}`);
                this.clientConnections.delete(connectionMapKey);
                reject(error);
            });

            client.on('close', () => {
                logger.error(">>> AWS mqtt connection has been closed");
                this.clientConnections.delete(connectionMapKey);
                resolve();
            });
        });
    }

    /**
     * Get security data
     * @param {Object} security
     * @returns {Promise}
     */
    async getSecurityData(security = {}) {
        return new Promise((resolve, reject) => {
            switch (security.type) {
                case Constants.SECURITY_CERTIFICATE:
                    resolve(SecurityBuilder.getAwsCertificates(security));
                    break;
                case Constants.SECURITY_ACCESS_KEYS:
                    resolve(SecurityBuilder.getAccessKeysForMqtt(security));
                    break;
                default:
                    reject(new Error(`${security.type} doesn't supported`));
            }
        });
    }

    /**
     * Get protocol from URL object
     * @param {Object} urlObj
     * @returns {string}
     */
    getProtocol(urlObj) {
        // After URL parsing, we need to remove the ':' sign from the protocol string
        return urlObj.protocol.slice(0, -1);
    }
}

module.exports = AwsHelper;
