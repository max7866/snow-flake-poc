const logger = require('../common/log');
const Constants = require('../common/Constants');
const senderUtils = require('../common/senderUtils');
const fsExtra = require("fs-extra");
const entitySerializer = require('../serializer/EntitySerializer');

fsExtra.ensureDirSync(Constants.DATASETS_FOLDER);

class CommonSender {
    constructor() {
        this.instance = this;
        this.channel = null;
        this.clientConnections = new Map();
        this.sessionStates = new Map();
    }

    /**
     * Initialize the sender
     * @param {Object} channel
     * @returns {Promise<void>}
     */
    async init(channel) {
        logger.debug(">>> Common sender initializing.");

        this.channel = channel;
        await this.listenSenderPayloadQueue();
    }

    /**
     * Listen to the sender payload queue
     * @returns {Promise<void>}
     */
    async listenSenderPayloadQueue() {
        const amqpQueue = this.getAmqpQueue();
        logger.debug(`>>> Getting and listening ${amqpQueue} AMQP queue.`);

        await this.channel.assertQueue(amqpQueue, { durable: true });
        this.channel.consume(amqpQueue, (message) => this.consumeMessage(message), { noAck: true });
    }

    /**
     * Consume a message from the queue
     * @param {Object} message
     */
    async consumeMessage(message) {
        const rawData = message.content.toString();
        const data = JSON.parse(rawData);
        logger.debug(`>>> Consuming message ${rawData} from topic: ${this.getAmqpQueue()}`);

        const { sessionId, target, payload, state } = data;
        this.processTargetSystemProtocol(target);

        await this.processMessage(sessionId, target, payload, state);
    }

    /**
     * Process the target system protocol
     * @param {Object} target
     */
    processTargetSystemProtocol(target) {
        const targetSystemProtocol = senderUtils.parseProtocol(target.url);
        if (!targetSystemProtocol && this.deriveTargetSystemProtocolPrefix) {
            const securityType = this.getTargetSystemSecurityType(target);
            const protocolPrefix = this.deriveTargetSystemProtocolPrefix(securityType);
            logger.debug(`>>> Injecting ${protocolPrefix} protocol prefix into target url: ${target.url}.`);
            target.url = protocolPrefix + target.url;
        } else {
            logger.debug(`>>> Skipping protocol deriving for the target system url: ${target.url}`);
        }
    }

    /**
     * Get the security type of the target system
     * @param {Object} target
     * @returns {string}
     */
    getTargetSystemSecurityType(target) {
        return target?.security?.type;
    }

    /**
     * Process a message based on its state
     * @param {string} sessionId
     * @param {Object} target
     * @param {string} payload
     * @param {string} state
     * @returns {Promise<void>}
     */
    async processMessage(sessionId, target, payload, state) {
        try {
            switch (state) {
                case Constants.SESSION_COMPLETED:
                    this.sessionStates.set(sessionId, Constants.SESSION_COMPLETED);
                    await this.processSessionCompletedMessage(sessionId, target);
                    break;
                case Constants.SESSION_FAILED:
                    this.sessionStates.set(sessionId, Constants.SESSION_FAILED);
                    await this.processSessionFailedMessage(sessionId, target);
                    break;
                default:
                    this.sessionStates.set(sessionId, Constants.SESSION_RUNNING);
                    await this.processSessionPayloadMessage(sessionId, target, payload);
            }
        } catch (error) {
            logger.error(`>>> An error '${error.message}' occurred on sending session ${sessionId} payload '${JSON.stringify(payload)}' to the target system '${JSON.stringify(target)}'`);
            if (this.sessionStates.get(sessionId) === Constants.SESSION_RUNNING) {
                await this.sendError(sessionId, error.message);
            }
        }
    }

    /**
     * Process a session completion message
     * @param {string} sessionId
     * @param {Object} target
     * @returns {Promise<void>}
     */
    async processSessionCompletedMessage(sessionId, target) {
        if (this.handleSessionCompletion) {
            logger.debug(`>>> Invoking completion handler for session ${sessionId}`);
            await this.handleSessionCompletion(sessionId, target);
        }
    }

    /**
     * Process a session failure message
     * @param {string} sessionId
     * @param {Object} target
     * @returns {Promise<void>}
     */
    async processSessionFailedMessage(sessionId, target) {
        if (this.handleSessionFailure) {
            logger.debug(`>>> Invoking failure handler for session ${sessionId}`);
            await this.handleSessionFailure(sessionId, target);
        }
    }

    /**
     * Process a session payload message
     * @param {string} sessionId
     * @param {Object} target
     * @param {string} payload
     * @returns {Promise<void>}
     */
    async processSessionPayloadMessage(sessionId, target, payload) {
        logger.debug(`>>> Sending session ${sessionId} payload message ${JSON.stringify(payload)} to target system ${JSON.stringify(target)}.`);

        if (target[Constants.MESSAGE_SERIALIZER]) {
            const serializedPayload = await entitySerializer.serialize(target, Constants.MESSAGE_SERIALIZER, payload);
            await this.sendPayload(sessionId, target, serializedPayload);
        } else {
            await this.sendPayload(sessionId, target, payload);
        }

        logger.debug(`>>> Sending confirmation message for session ${sessionId} and payload ${JSON.stringify(payload)}.`);
        await this.sendConfirmation(sessionId, payload);
    }

    /**
     * Send payload to the target system
     * @param {string} sessionId
     * @param {Object} target
     * @param {string} payload
     */
    sendPayload(sessionId, target, payload) {}

    /**
     * Send confirmation message
     * @param {string} sessionId
     * @param {string} payload
     * @returns {Promise<void>}
     */
    async sendConfirmation(sessionId, payload) {
        const topic = `sessions.${sessionId}.payload`;
        const generatedPayload = this.getConfirmationPayload(sessionId, payload);
        await this.publishMessage(topic, generatedPayload);
    }

    /**
     * Send error message
     * @param {string} sessionId
     * @param {string} error
     * @returns {Promise<void>}
     */
    async sendError(sessionId, error) {
        const topic = `sessions.${sessionId}.errors`;
        const generatedPayload = this.getErrorPayload(sessionId, error);
        await this.publishMessage(topic, generatedPayload);
    }

    /**
     * Get confirmation payload
     * @param {string} sessionId
     * @param {string} payload
     * @returns {string}
     */
    getConfirmationPayload(sessionId, payload) {
        const generatedPayload = {
            type: Constants.CONFIRMATION_TYPE,
            sessionId,
            message: payload,
            timestamp: Date.now()
        };

        const message = JSON.stringify(generatedPayload);
        logger.debug(`>>> Sending session ${sessionId} confirmation payload message ${message}.`);
        return message;
    }

    /**
     * Get error payload
     * @param {string} sessionId
     * @param {string} error
     * @returns {string}
     */
    getErrorPayload(sessionId, error) {
        const generatedPayload = {
            type: Constants.ERROR_TYPE,
            sessionId,
            message: error,
            timestamp: Date.now()
        };

        const errorMessage = JSON.stringify(generatedPayload);
        logger.debug(`>>> Sending session ${sessionId} error payload message ${errorMessage}.`);
        return errorMessage;
    }

    /**
     * Publish a message to a topic
     * @param {string} topic
     * @param {string} payload
     * @returns {Promise<void>}
     */
    async publishMessage(topic, payload) {
        await this.channel.assertExchange(Constants.AMQP_TOPIC_EXCHANGE, "topic", { durable: true });
        this.channel.publish(Constants.AMQP_TOPIC_EXCHANGE, topic, Buffer.from(payload, 'utf8'));
    }
}

module.exports = CommonSender;
