const amqp = require('amqplib');
const logger = require('../common/log');
const CommonSender = require('./CommonSender');
const Constants = require('../common/Constants');
const SecurityBuilder = require('../security/SecurityBuilder');
const { URL } = require('url');

class AmqpSender extends CommonSender {
    constructor() {
        super();
    }

    /**
     * Get the AMQP queue
     * @returns {string}
     */
    getAmqpQueue() {
        return Constants.AMQP_QUEUE;
    }

    /**
     * Derive the protocol prefix based on the security type
     * @param {string} securityType
     * @returns {string}
     */
    deriveTargetSystemProtocolPrefix(securityType) {
        switch (securityType) {
            case Constants.SECURITY_CERTIFICATE:
                return Constants.AMQP_TLS_PREFIX;
            default:
                return Constants.AMQP_PREFIX;
        }
    }

    /**
     * Send payload to AMQP broker
     * @param {string} sessionId
     * @param {Object} target
     * @param {string} payload
     * @returns {Promise<void>}
     */
    async sendPayload(sessionId, target, payload) {
        logger.debug(">>> Amqp send payload: processing amqp send payload.");

        const connectionMapKey = JSON.stringify(target);
        let clientConnection = this.clientConnections.get(connectionMapKey);

        logger.debug(`>>> Amqp send payload: sending payload ${payload} for session ${sessionId} to the amqp broker: ${JSON.stringify(target)}.`);

        if (!clientConnection) {
            const options = await this.getClientConnectionOptions(target);
            clientConnection = await amqp.connect(target.url, options);
            this.clientConnections.set(connectionMapKey, clientConnection);

            clientConnection.on('error', (error) => {
                logger.error(`>>> Amqp connection has been failed due to error: ${JSON.stringify(error.message)}`);
                this.clientConnections.delete(connectionMapKey);
            });

            clientConnection.on('close', (error) => {
                logger.debug(">>> Amqp connection has been closed");
                this.clientConnections.delete(connectionMapKey);
                if (error) {
                    logger.error(`>>> Amqp connection has been closed due to error: ${JSON.stringify(error.message)}`);
                }
            });
        }

        const channel = await clientConnection.createChannel();
        await channel.assertQueue(target.queue, { durable: true });

        // In case of payload serialization, we need to send raw payload, without converting to Buffer
        if (typeof payload !== "string") {
            await channel.sendToQueue(target.queue, payload);
        } else {
            await channel.sendToQueue(target.queue, Buffer.from(payload, 'utf8'));
        }
    }

    /**
     * Get client connection options
     * @param {Object} target
     * @returns {Object}
     */
    async getClientConnectionOptions(target) {
        logger.debug(`>>> Opening amqp connection to target: ${JSON.stringify(target)}`);

        const options = { rejectUnauthorized: false };
        const securityData = await this.getSecurityData(target.security);

        if (target.security) {
            switch (target.security.type) {
                case Constants.SECURITY_CERTIFICATE:
                    Object.assign(options, securityData);
                    break;
                case Constants.SECURITY_CREDENTIALS:
                    Object.assign(options, securityData);
                    target.url = this.generateAmqpUrl(target.url, options);
                    break;
            }
        }

        return options;
    }

    /**
     * Get security data
     * @param {Object} security
     * @returns {Object}
     */
    async getSecurityData(security = {}) {
        if (!security.type) {
            return {};
        }

        switch (security.type) {
            case Constants.SECURITY_CREDENTIALS:
                return SecurityBuilder.getCredentials(security);
            case Constants.SECURITY_CERTIFICATE:
                return SecurityBuilder.getCertificates(security);
            default:
                throw new Error(`${security.type} doesn't supported`);
        }
    }

    /**
     * Generate AMQP URL
     * @param {string} targetUrl
     * @param {Object} options
     * @returns {string}
     */
    generateAmqpUrl(targetUrl, options) {
        logger.debug(">>> Amqp send payload: generating consumer url.");

        const urlObj = new URL(targetUrl);
        const protocol = urlObj.protocol;

        return `${protocol}//${options.username}:${options.password}@${urlObj.host}`;
    }
}

module.exports = AmqpSender;
