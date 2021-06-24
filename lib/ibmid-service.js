const axios = require('axios')
const AuthenticatedService = require('./internal/authenticated-service')
const IAMAPI = require('./internal/iam-api')
const AccountsAPI = require('./internal/accounts-api')
const { notLoggedInResponse } = require('./responses')

class IBMidService extends AuthenticatedService {

    constructor(sendRequest, iamApi, accountsApi) {
        super(sendRequest, iamApi)
        this.accountsApi = accountsApi
        this.getPasscode = this.getPasscode.bind(this)
        this.login = this.login.bind(this)
        this.logout = this.logout.bind(this)
        this.switchAccount = this.authenticatedFunction(this.switchAccount.bind(this))
        this.getOwnUser = this.authenticatedFunction(this.getOwnUser.bind(this))
    }

    async getPasscode() {
        return this.iamApi.getOpenIDConfig()
            .then(data => ({ headers: { location: data.passcode_endpoint }, statusCode: 302, body: {} }))
    }

    async login(options) {
        let data = await this.iamApi.createIAMToken({ passcode: options.data.passcode })
        if (!data.success) return { statusCode: 401, body: data }
        let accountData = await this.accountsApi.listAccounts({ token: data.token })
        if (accountData.resources.length === 0) return notLoggedInResponse()
        let account_id, refreshData
        for (let account of accountData.resources) {
            if (refreshData && refreshData.success) continue
            account_id = account.metadata.guid
            refreshData = await this.iamApi.createIAMToken({ refresh_token: data.refresh_token, account: account_id })
        }
        let headers = this.getAuthCookies(refreshData, account_id)
        return { statusCode: 200, body: refreshData, headers }
    }

    async logout() {
        let headers = this.getAuthCookies({})
        return { statusCode: 200, body: { success: true }, headers }
    }

    async switchAccount(options) {
        let refreshTokenResponse = await this.refreshToken(options)
        return { statusCode: 200, ...refreshTokenResponse }
    }

    async getOwnUser(options) {
        let user = JSON.parse(Buffer.from(options.cookies.token.split('.')[1], 'base64').toString())
        return this.accountsApi.listAccounts({ token: options.cookies.token })
            .then(data => {
                user.accounts = data.resources
                user.account = options.cookies.account_id
                return { statusCode: 200, body: user }
            })
            .catch(() => notLoggedInResponse())
    }

}

IBMidService.default = new IBMidService(axios, IAMAPI.default, AccountsAPI.default)

module.exports = IBMidService