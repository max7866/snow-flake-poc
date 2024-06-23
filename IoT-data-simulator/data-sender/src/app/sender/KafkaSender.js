const logger = require('../common/log');
const CommonSender = require('./CommonSender');
const Constants = require('../common/Constants');
const SecurityBuilder = require('../security/SecurityBuilder');
const utils = require('../common/senderUtils');
const entitySerializer = require('../serializer/EntitySerializer');
const kafka = require('kafka-node');

const { Producer, KeyedMessage, KafkaClient } = kafka;

class KafkaSender extends CommonSender {
    constructor() {
        super();
        this.keyFunctions = new Map();
    }

    /**
     * Get the AMQP queue
     * @returns {string}
     */
    getAmqpQueue() {
        return Constants.KAFKA_QUEUE;
    }

    /**
     * Send payload to Kafka target system
     * @param {string} sessionId
     * @param {Object} target
     * @param {string} payload
     * @returns {Promise<void>}
     */
    async sendPayload(sessionId, target, payload) {
        logger.debug(">>> Kafka send payload: processing kafka send payload.");

        const connectionMapKey = JSON.stringify(target);
        let clientConnection = this.clientConnections.get(connectionMapKey);

        if (!clientConnection) {
            clientConnection = await this.getClientConnection(target, connectionMapKey);
            this.clientConnections.set(connectionMapKey, clientConnection);
        }

        logger.debug(`>>> Kafka send payload: sending payload ${payload} for session ${sessionId} to the kafka target system: ${JSON.stringify(target)}.`);
        await this.sendKafkaPayload(target, payload, clientConnection);
    }

    /**
     * Get client connection
     * @param {Object} target
     * @param {string} connectionMapKey
     * @returns {Promise<Producer>}
     */
    async getClientConnection(target, connectionMapKey) {
        logger.debug(`>>> Opening kafka connection to target: ${JSON.stringify(target)}`);

        const client = await this.buildKafkaClient(target);
        const producer = new Producer(client, { requireAcks: 1 });

        return new Promise((resolve, reject) => {
            producer.on("ready", () => {
                logger.debug(`>>> Kafka producer connection has been opened.`);
                resolve(producer);
            });

            producer.on('error', (error) => {
                logger.error(`>>> Kafka producer connection has been failed due to error: ${JSON.stringify(error)}`);
                this.clientConnections.delete(connectionMapKey);
                reject(error);
            });
        });
    }

    /**
     * Build Kafka client
     * @param {Object} target
     * @returns {Promise<KafkaClient>}
     */
    async buildKafkaClient(target) {
        const security = await this.getSecurityData(target.security);
        const clientOptions = {
            kafkaHost: target.url,
            connectTimeout: 5000,
            requestTimeout: 5000,
            sslOptions: security || undefined,
        };

        return new KafkaClient(clientOptions);
    }

    /**
     * Send payload to Kafka
     * @param {Object} target
     * @param {string} payload
     * @param {Producer} clientConnection
     * @returns {Promise}
     */
    async sendKafkaPayload(target, payload, clientConnection) {
        const key = this.getKafkaKey(target, payload);
        const message = await this.buildKafkaMessage(target, payload, key);

        return new Promise((resolve, reject) => {
            clientConnection.send([{ topic: target.topic, messages: message }],
                (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                }
            );
        });
    }

    /**
     * Build Kafka message
     * @param {Object} target
     * @param {string} payload
     * @param {string} key
     * @returns {Promise<KeyedMessage|string>}
     */
    async buildKafkaMessage(target, payload, key) {
        if (key) {
            return await this.buildKeyedMessage(target, payload, key);
        } else {
            return this.buildMessage(target, payload);
        }
    }

    /**
     * Build keyed message for Kafka
     * @param {Object} target
     * @param {string} payload
     * @param {string} key
     * @returns {Promise<KeyedMessage>}
     */
    async buildKeyedMessage(target, payload, key) {
        if (target.keySerializer) {
            return await this.getEncryptedKeyedMessage(target, payload, key);
        } else if (target.messageSerializer || utils.isStringValue(payload)) {
            return new KeyedMessage(key, payload);
        } else {
            return new KeyedMessage(key, JSON.stringify(payload));
        }
    }

    /**
     * Build message for Kafka
     * @param {Object} target
     * @param {string} payload
     * @returns {string}
     */
    buildMessage(target, payload) {
        if (target.messageSerializer || utils.isStringValue(payload)) {
            return payload;
        } else {
            return JSON.stringify(payload);
        }
    }

    /**
     * Get Kafka key
     * @param {Object} target
     * @param {string} payload
     * @returns {string}
     */
    getKafkaKey(target, payload) {
        if (target.keyFunction) {
            let keyFunction = this.keyFunctions.get(target.keyFunction);
            if (!keyFunction) {
                keyFunction = eval(`(${target.keyFunction})`);
                this.keyFunctions.set(target.keyFunction, keyFunction);
            }

            return keyFunction(payload, target.topic);
        }
    }

    /**
     * Get encrypted keyed message
     * @param {Object} target
     * @param {string} payload
     * @param {string} kafkaKey
     * @returns {Promise<KeyedMessage>}
     */
    async getEncryptedKeyedMessage(target, payload, kafkaKey) {
        logger.debug(">>> Getting keyed message using protobuf");
        const encryptedKey = await entitySerializer.serialize(target, Constants.KEY_SERIALIZER, kafkaKey);
        return new KeyedMessage(encryptedKey, payload);
    }

    /**
     * Get security data
     * @param {Object} security
     * @returns {Promise<Object>}
     */
    async getSecurityData(security = {}) {
        return new Promise((resolve, reject) => {
            if (!security.type) {
                return resolve(null);
            }

            switch (security.type) {
                case Constants.SECURITY_CERTIFICATE:
                    resolve(SecurityBuilder.getCertificates(security));
                    break;
                default:
                    reject(new Error(`${security.type} doesn't supported`));
            }
        });
    }

    /**
     * Handle session failure
     * @param {string} sessionId
     * @param {Object} target
     */
    handleSessionFailure(sessionId, target) {
        this.closeConnection(sessionId, target);
    }

    /**
     * Close connection
     * @param {string} sessionId
     * @param {Object} target
     */
    closeConnection(sessionId, target) {
        const connectionMapKey = JSON.stringify(target);
        const clientConnection = this.clientConnections.get(connectionMapKey);

        if (clientConnection) {
            clientConnection.close();
            logger.debug(`>>> Removing client connection for session ${sessionId} from cache.`);
            this.clientConnections.delete(connectionMapKey);
        }
    }
}

module.exports = KafkaSender;
