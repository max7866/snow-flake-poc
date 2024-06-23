const { Base64 } = require("js-base64");
const logger = require('../common/log');

module.exports = {
    /**
     * Get authorization header for basic auth
     * @param {Object} security
     * @returns {{Authorization: string}}
     */
    getAuthorizationHeader(security) {
        return { Authorization: 'Basic ' + Base64.encode(`${security.username}:${security.password}`) };
    },

    /**
     * Get credentials object
     * @param {Object} security
     * @returns {{username: string, password: string}}
     */
    getCredentials(security) {
        return {
            username: security.username,
            password: security.password
        };
    },

    /**
     * Get certificates for security
     * @param {Object} security
     * @returns {{ca?: string, cert: string, key: string, rejectUnauthorized: boolean}}
     */
    getCertificates(security) {
        const certificates = {
            cert: Base64.decode(security.deviceCertificate),
            key: Base64.decode(security.privateKey),
            rejectUnauthorized: false
        };

        if (security.ca) {
            certificates.ca = Base64.decode(security.ca);
        }

        return certificates;
    },

    /**
     * Get AWS certificates
     * @param {Object} security
     * @returns {{caCert?: Buffer, clientCert: Buffer, privateKey: Buffer}}
     */
    getAwsCertificates(security) {
        const awsCertificates = {
            clientCert: Buffer.from(Base64.decode(security.deviceCertificate)),
            privateKey: Buffer.from(Base64.decode(security.privateKey))
        };

        if (security.ca) {
            awsCertificates.caCert = Buffer.from(Base64.decode(security.ca));
        }

        return awsCertificates;
    },

    /**
     * Get access keys for MQTT
     * @param {Object} security
     * @returns {{accessKeyId: string, secretKey: string}}
     */
    getAccessKeysForMqtt(security) {
        return {
            accessKeyId: security.accessKey,
            secretKey: security.secretKey
        };
    },

    /**
     * Get access keys for REST
     * @param {Object} security
     * @returns {{accessKeyId: string, secretAccessKey: string}}
     */
    getAccessKeysForRest(security) {
        return {
            accessKeyId: security.accessKey,
            secretAccessKey: security.secretKey
        };
    },

    /**
     * Get access keys for Minio
     * @param {Object} security
     * @returns {{accessKey: string, secretKey: string}}
     */
    getAccessKeysForMinio(security) {
        return {
            accessKey: security.accessKey,
            secretKey: security.secretKey
        };
    },

    /**
     * Get security token for MQTT
     * @param {Object} security
     * @returns {{username: string}}
     */
    getSecurityTokenMqtt(security) {
        return { username: security.token };
    },

    /**
     * Get security token for REST
     * @param {Object} security
     * @returns {{token: string}}
     */
    getSecurityTokenRest(security) {
        return { token: security.token };
    }
};
