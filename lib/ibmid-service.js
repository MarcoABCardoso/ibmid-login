const axios = require('axios')
const AuthenticatedService = require('./internal/authenticated-service')
const IAMAPI = require('./internal/iam-api')
const AccountsAPI = require('./internal/accounts-api')
const GlobalCatalogAPI = require('./internal/global-catalog-api')
const ResourceControllerAPI = require('./internal/resource-controller-api')
const { notLoggedInResponse } = require('./responses')
const getExpressAdapter = require('./adapters/express')


class IBMidService extends AuthenticatedService {

    constructor(
        sendRequest = axios,
        iamApi = IAMAPI.default,
        accountsApi = AccountsAPI.default,
        globalCatalogApi = GlobalCatalogAPI.default,
        resourceControllerApi = ResourceControllerAPI.default
    ) {
        super(sendRequest, iamApi)
        this.accountsApi = accountsApi
        this.globalCatalogApi = globalCatalogApi
        this.resourceControllerApi = resourceControllerApi
        this.getPasscode = this.getPasscode.bind(this)
        this.login = this.login.bind(this)
        this.logout = this.logout.bind(this)
        this.switchAccount = this.authenticatedFunction(this.switchAccount.bind(this))
        this.getOwnUser = this.authenticatedFunction(this.getOwnUser.bind(this))
        this.listAccounts = this.authenticatedFunction(this.listAccounts.bind(this))
        this.proxy = this.authenticatedFunction(this.proxy.bind(this))
        this.listResources = this.authenticatedFunction(this.listResources.bind(this))
        this.manageResource = this.authenticatedFunction(this.manageResource.bind(this))

        this.expressAdapter = getExpressAdapter(this)
    }

    async getPasscode() {
        return this.iamApi.getOpenIDConfig()
            .then(data => ({ headers: { location: data.passcode_endpoint }, statusCode: 302, body: {} }))
    }

    async login({ apikey, passcode }) {
        let data = await this.iamApi.createIAMToken({ apikey, passcode })
        if (!data.success) return { statusCode: 401, body: data }
        if (apikey) return { statusCode: 200, body: data, headers: this.getAuthCookies({ token: data.token, refreshToken: data.refresh_token, expiresIn: data.expires_in }) }
        let accountData = await this.accountsApi.listAccounts({ token: data.token })
        if (accountData.resources.length === 0) return notLoggedInResponse()
        let account_id, refreshData
        for (let account of accountData.resources) {
            if (refreshData && refreshData.success) continue
            account_id = account.metadata.guid
            refreshData = await this.iamApi.createIAMToken({ refreshToken: data.refresh_token, accountID: account_id })
        }
        let headers = this.getAuthCookies({ token: refreshData.token, refreshToken: refreshData.refresh_token, accountID: account_id, expiresIn: refreshData.expires_in })
        return { statusCode: 200, body: refreshData, headers }
    }

    async logout() {
        let headers = this.getAuthCookies({})
        return { statusCode: 200, body: { success: true }, headers }
    }

    async switchAccount({ refreshToken, accountID }) {
        let refreshTokenResponse = await this.refreshToken({ refreshToken, accountID })
        return { statusCode: 200, ...refreshTokenResponse }
    }

    async getOwnUser({ token }) {
        return this.iamApi.validateToken({ token })
            .then(user => ({ statusCode: 200, body: user }))
            .catch(() => notLoggedInResponse())
    }

    async listAccounts({ token }) {
        return this.accountsApi.listAccounts({ token })
            .then(data => ({ statusCode: 200, body: data }))
            .catch(err => ({ statusCode: err.response.status, body: err.response.data }))
    }

    async listResources({ token, resourceType }) {
        let resourceID = null
        if (resourceType) {
            let catalogListData = await this.globalCatalogApi.listCatalogEntries({ resourceType })
            let catalogEntry = catalogListData.resources
                .reduce((acc, r) => r.children ? [...acc, ...r.children] : acc, catalogListData.resources)
                .find(r => r.kind === 'service' && r.name === resourceType)
            if (!catalogEntry) return { statusCode: 404, body: { message: 'Resource not found' } }
            resourceID = catalogEntry.id
        }

        let resourceListData = await this.resourceControllerApi.listAllResources({ token, resourceID })
        return {
            statusCode: 200,
            body: resourceListData
        }

    }

    async manageResource({ token, resourceID, url, method, params, data }) {
        return this.resourceControllerApi.manageResource({ token, resourceID, url, method, params, data })
    }

    proxyRequest(targetURL) {
        let self = this
        return function ({ token, url, method, headers, params, data }) {
            let iamOptions = { url, method, headers, params, data }
            delete iamOptions.headers.host
            iamOptions.headers.authorization = `Bearer ${token}`
            if (url.includes('daas')) delete iamOptions.headers
            iamOptions.url = `${targetURL}${url}`
            return self.sendRequest(iamOptions)
                .then(response => ({ statusCode: response.status, body: response.data, headers: response.headers }))
                .catch(err => ({ statusCode: err.response.status, body: err.response.data, headers: err.response.headers }))
        }
    }

    async getProxyURL({ token, resourceID, url, headers }) {
        if (resourceID.includes('whisk.system')) return `https://${resourceID.match(/(.*)functions:(.*):a/)[2]}.functions.cloud.ibm.com/api/v1/namespaces/${decodeURIComponent(resourceID).match(/(.*):(.*)::/)[2]}`
        if (resourceID == 'watson_data') return 'https://api.dataplatform.cloud.ibm.com'
        let resourceResponse = await this.manageResource({ token, resourceID, url: '', method: 'GET' })
        if (resourceResponse.statusCode >= 400 || resourceResponse.body.status_code >= 400) return
        let resource = resourceResponse.body
        if (resource.resource_id === 'functions')
            return `https://${resource.region_id}.functions.cloud.ibm.com/api/v1/${url.startsWith('/web/') ? 'web' : 'namespaces'}/${resource.guid.match(/(.*):(.*)::/)[2]}${url.startsWith('/web/') ? url.replace('/web', '') : ''}`
        if (resource.id.includes('conversation'))
            return `https://api.${resource.region_id}.assistant.watson.cloud.ibm.com/instances/${resource.guid}`
        let keys = await this.manageResource({ token, resourceID, url: '/resource_keys', method: 'GET' }).then(response => response.body)
        let managerCreds = keys.resources.find(key => key.role && key.role.includes('Manager'))
        let editorCreds = keys.resources.find(key => key.role && key.role.includes('Writer'))
        let readerCreds = keys.resources.find(key => key.role && key.role.includes('Reader'))
        let bestCreds = managerCreds || editorCreds || readerCreds || {}
        let credentials = bestCreds.credentials || {}
        if (credentials.url)
            return credentials.url
        if (credentials.api_endpoint_url)
            return credentials.api_endpoint_url.replace('https://', `https://${credentials.client_id}:${credentials.client_secret}@`).replace('/daas/', '')
        if (credentials.endpoints) {
            if (url === '/endpoints') return credentials.endpoints.replace('/endpoints', '')
            if (headers['x-endpoint-id']) {
                let endpoints = await this.sendRequest({ url: credentials.endpoints }).then(response => response.data)
                let endpointPath = headers['x-endpoint-id'].split(':')
                return 'https://' + endpointPath.reduce((endpoint, step) => endpoint[step], endpoints)
            }
        }
    }

    async proxy({ token, resourceID, url, method, headers={}, params, data }) {
        let proxyURL = await this.getProxyURL({ token, resourceID, url, headers })
        if (!proxyURL) return { statusCode: 404, body: { message: 'Resource not found' } }
        return this.proxyRequest(proxyURL)({ token, url, method, headers, params, data })
    }

}

IBMidService.default = new IBMidService()

module.exports = IBMidService