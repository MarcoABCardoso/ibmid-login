const axios = require('axios')
const { notLoggedInResponse } = require('../responses')
const BaseService = require('./base-service')
const IAMAPI = require('./iam-api')


class AuthenticatedService extends BaseService {

    constructor(sendRequest = axios, iamApi = IAMAPI.default) {
        super(sendRequest)
        this.iamApi = iamApi
    }

    getAuthCookies({ token = null, refreshToken = null, accountID = null, expiresIn = 0 }) {
        return {
            'Set-Cookie': [
                `token=${token}; Max-Age=${expiresIn}; Path=/; HttpOnly`,
                `refresh_token=${refreshToken || null}; Max-Age=${expiresIn * 24}; Path=/; HttpOnly`,
                `account_id=${accountID}; Max-Age=${expiresIn * 24}; Path=/; HttpOnly`,
            ]
        }
    }

    async refreshToken({ refreshToken, accountID }) {
        let data = await this.iamApi.createIAMToken({ refreshToken, accountID })
        if (!data.success) return { statusCode: 401, body: data }
        let headers = this.getAuthCookies({ token: data.token, refreshToken: data.refresh_token, accountID, expiresIn: data.expires_in })
        return { body: data, headers }
    }

    authenticatedFunction(fn) {
        return async function ({ token, refreshToken, accountID, ...fields }) {
            let refreshData = { headers: {}, body: { token: null, refresh_token: null } }
            if (!token) {
                if (!refreshToken) return notLoggedInResponse()
                refreshData = await this.refreshToken({ refreshToken, accountID })
                if (!refreshData.body.success) return notLoggedInResponse()
                token = refreshData.body.token
                refreshToken = refreshData.body.refresh_token
            }
            let fnResult = await fn({ token, refreshToken, accountID, ...fields })
            return { ...fnResult, headers: { ...fnResult.headers, ...refreshData.headers } }
        }.bind(this)
    }

}

AuthenticatedService.default = new AuthenticatedService()

module.exports = AuthenticatedService