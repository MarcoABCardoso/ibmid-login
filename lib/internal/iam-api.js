const jwksClient = require('jwks-rsa')
const BaseService = require('./base-service')
const { IAM_URL } = require('../config/constants')
const axios = require('axios')
const jwt = require('jsonwebtoken')


class IAMAPI extends BaseService {

    constructor(sendRequest = axios, rsaClient = jwksClient({ jwksUri: `${IAM_URL}/identity/keys` })) {
        super(sendRequest)
        this.rsaClient = rsaClient
    }

    createIAMToken({ passcode, apikey, refreshToken, accountID }) {
        let grantType = passcode ? 'urn:ibm:params:oauth:grant-type:passcode' : apikey ? 'urn:ibm:params:oauth:grant-type:apikey' : 'refresh_token'
        return this.baseRequest({
            url: `${IAM_URL}/identity/token`,
            method: 'POST',
            params: {
                grant_type: grantType,
                passcode: passcode,
                apikey: apikey,
                refresh_token: refreshToken,
                account: accountID
            },
            headers: { Authorization: `Basic ${Buffer.from('bx:bx').toString('base64')}` }
        })
            .then(response => ({ success: true, token: response.data.access_token, refresh_token: response.data.refresh_token, expires_in: response.data.expires_in }))
            .catch(err => ({ success: false, message: err.response.data.errorMessage }))
    }

    getOpenIDConfig() {
        return this.baseRequest({
            url: `${IAM_URL}/identity/.well-known/openid-configuration`,
        })
            .then(response => response.data)
    }

    validateToken({ token }) {
        function getKey(header, callback) {
            this.rsaClient.getSigningKey(header.kid, function (err, key) { callback(err, key && key.publicKey) })
        }
        return new Promise((resolve, reject) => jwt.verify(token, getKey.bind(this), {}, (err, data) => err ? reject(err) : resolve(data)))
    }


}

IAMAPI.default = new IAMAPI()

module.exports = IAMAPI