const amqp = require('amqplib');
const logger = require('../common/log');

class AmqpListener {
    /**
     * @param {Array} senders
     */
    constructor(senders) {
        this.senders = senders;
        this.amqpUrl = process.env.RABBITMQ_URL;
    }

    /**
     * @returns {Promise<void>}
     */
    async run() {
        try {
            const connection = await this.connect();

            connection.on("error", (error) => {
                this.processError(error);
                this.reconnect();
            });

            connection.on("close", () => this.reconnect());
        } catch (error) {
            this.processError(error);
            this.reconnect();
        }
    }

    /**
     * @returns {Promise<amqp.Connection>}
     */
    async connect() {
        const connection = await amqp.connect(this.amqpUrl);
        const channel = await connection.createChannel();

        await Promise.all(this.senders.map(sender => sender.init(channel)));

        return connection;
    }

    /**
     * @param {Error} error
     */
    processError(error) {
        logger.error(`>>> An error occurred during connection to amqp broker processing: ${error.message}`);
        logger.error(error);
    }

    /**
     *
     */
    reconnect() {
        logger.debug("Trying to reconnect to amqp broker in 3 seconds.");
        setTimeout(() => this.run(), 3000);
    }
}

module.exports = AmqpListener;
