const axios = require('axios')
const { ALLOWED_ACCOUNTS } = require('../config/constants')
const { notLoggedInResponse } = require('../responses')
const BaseService = require('./base-service')
const IAMAPI = require('./iam-api')


class AuthenticatedService extends BaseService {

    constructor(sendRequest = axios, iamApi = IAMAPI.default) {
        super(sendRequest)
        this.iamApi = iamApi
    }

    getAuthCookies(data, account_id = null) {
        return {
            'Set-Cookie': [
                `token=${data.token || null}; Max-Age=${(data.expires_in || 0)}; Path=/; HttpOnly`,
                `refresh_token=${data.refresh_token || null}; Max-Age=${(data.expires_in || 0) * 24}; Path=/; HttpOnly`,
                `account_id=${account_id}; Max-Age=${(data.expires_in || 0) * 24}; Path=/; HttpOnly`,
            ]
        }
    }

    async refreshToken(options) {
        let account_id = options.params.account_id || options.cookies.account_id
        if (ALLOWED_ACCOUNTS && !ALLOWED_ACCOUNTS.includes(account_id))
            return notLoggedInResponse()
        let data = await this.iamApi.createIAMToken({ refresh_token: options.cookies.refresh_token, account: account_id })
        if (!data.success) return { statusCode: 401, body: data }
        let headers = this.getAuthCookies(data, account_id)
        return { body: data, headers }
    }

    authenticatedFunction(fn) {
        return async function (options) {
            let refreshData = { headers: {}, body: { token: null, refresh_token: null } }
            if (!options.cookies || !options.cookies.token) {
                if (!options.cookies.refresh_token) return notLoggedInResponse()
                refreshData = await this.refreshToken(options)
                options.cookies = { ...options.cookies, token: refreshData.body.token, refresh_token: refreshData.body.refresh_token }
            }
            let fnResult = await fn(options)
            return { ...fnResult, headers: { ...fnResult.headers, ...refreshData.headers } }
        }.bind(this)
    }

}

AuthenticatedService.default = new AuthenticatedService()

module.exports = AuthenticatedService