const BaseService = require('./base-service')
const { IAM_URL, IAM_OPENID_CONFIG_CACHE_TIMEOUT } = require('../config/constants')
const memoize = require('memoizee')
const axios = require('axios')


class IAMAPI extends BaseService {

    static default = new IAMAPI(axios)

    constructor(sendRequest) {
        super(sendRequest)
        this.getOpenIDConfig = memoize(this.getOpenIDConfig, { maxAge: IAM_OPENID_CONFIG_CACHE_TIMEOUT, normalizer: args => JSON.stringify(args) })
    }

    createIAMToken(options) {
        return this.baseRequest({
            url: `${IAM_URL}/identity/token`,
            method: 'POST',
            params: {
                grant_type: options.passcode ? 'urn:ibm:params:oauth:grant-type:passcode' : 'refresh_token',
                passcode: options.passcode,
                refresh_token: options.refresh_token,
                account: options.account
            },
            headers: { Authorization: `Basic ${Buffer.from('bx:bx').toString('base64')}` }
        })
            .then(response => ({ success: true, token: response.data.access_token, refresh_token: response.data.refresh_token, expires_in: response.data.expires_in }))
            .catch(err => {
                return { success: false, message: err.response.data.errorMessage }
            })
    }
    getOpenIDConfig() {
        return this.baseRequest({
            url: `${IAM_URL}/identity/.well-known/openid-configuration`,
        })
            .then(response => response.data)
    }
}

module.exports = IAMAPI