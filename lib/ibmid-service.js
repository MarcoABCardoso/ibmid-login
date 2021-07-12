const axios = require('axios')
const AuthenticatedService = require('./internal/authenticated-service')
const IAMAPI = require('./internal/iam-api')
const AccountsAPI = require('./internal/accounts-api')
const GlobalCatalogAPI = require('./internal/global-catalog-api')
const ResourceControllerAPI = require('./internal/resource-controller-api')
const { notLoggedInResponse } = require('./responses')


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
        this.proxy = this.authenticatedFunction(this.proxy.bind(this))
        this.listResources = this.authenticatedFunction(this.listResources.bind(this))
        this.manageResource = this.authenticatedFunction(this.manageResource.bind(this))
    }

    async getPasscode() {
        return this.iamApi.getOpenIDConfig()
            .then(data => ({ headers: { location: data.passcode_endpoint }, statusCode: 302, body: {} }))
    }

    async login(options) {
        let data = await this.iamApi.createIAMToken({ passcode: options.data.passcode, apikey: options.data.apikey })
        if (!data.success) return { statusCode: 401, body: data }
        if (options.data.apikey) return { statusCode: 200, body: data, headers: this.getAuthCookies(data) }
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

    async manageResource(options) {
        return this.resourceControllerApi.manageResource(options)
    }

    proxyRequest(targetURL) {
        let self = this
        return function (options) {
            let iamOptions = { ...options }
            delete iamOptions.headers.host
            iamOptions.headers.authorization = `Bearer ${options.cookies.token}`
            if (options.url.includes('daas')) delete iamOptions.headers
            iamOptions.url = `${targetURL}${options.url}`
            return self.sendRequest(iamOptions)
                .then(response => ({ statusCode: response.status, body: response.data, headers: response.headers }))
                .catch(err => ({ statusCode: err.response.status, body: err.response.data, headers: err.response.headers }))
        }
    }

    async listResources(options) {
        let resourceID = null
        if (options.params && options.params.q) {
            let catalogListData = await this.globalCatalogApi.listCatalogEntries({ q: options.params.q })
            let catalogEntry = catalogListData.resources
                .reduce((acc, r) => r.children ? [...acc, ...r.children] : acc, catalogListData.resources)
                .find(r => r.kind === 'service' && r.name === options.params.q)
            if (!catalogEntry) return { statusCode: 404, body: { message: 'Resource not found' } }
            resourceID = catalogEntry.id
        }

        let resourceListData = await this.resourceControllerApi.listAllResources({ token: options.cookies.token, resource_id: resourceID })
        return {
            statusCode: 200,
            body: resourceListData
        }

    }

    async getProxyURL(options) {
        if (options.urlParams.resource_id.includes('whisk.system')) return `https://${options.urlParams.resource_id.match(/(.*)functions:(.*):a/)[2]}.functions.cloud.ibm.com/api/v1/namespaces/${decodeURIComponent(options.urlParams.resource_id).match(/(.*):(.*)::/)[2]}`
        let resourceResponse = await this.manageResource({ ...options, url: '', method: 'GET' })
        if (resourceResponse.statusCode >= 400 || resourceResponse.body.status_code >= 400) return
        let resource = resourceResponse.body
        if (resource.resource_id === 'functions')
            return `https://${resource.region_id}.functions.cloud.ibm.com/api/v1/${options.url.startsWith('/web/') ? 'web' : 'namespaces'}/${resource.guid.match(/(.*):(.*)::/)[2]}${options.url.startsWith('/web/') ? options.url.replace('/web', '') : ''}`
        if (resource.crn && resource.crn.includes('data-science-experience'))
            return 'https://api.dataplatform.cloud.ibm.com'
        if (resource.id.includes('conversation'))
            return `https://api.${resource.region_id}.assistant.watson.cloud.ibm.com/instances/${resource.guid}`
        let keys = await this.manageResource({ ...options, url: '/resource_keys', method: 'GET' }).then(response => response.body)
        let managerCreds = keys.resources.find(key => key.role && key.role.includes('Manager'))
        let editorCreds = keys.resources.find(key => key.role && key.role.includes('Writer'))
        let readerCreds = keys.resources.find(key => key.role && key.role.includes('Reader'))
        let bestCreds = managerCreds || editorCreds || readerCreds || {}
        let credentials = bestCreds.credentials || {}
        if (credentials.url)
            return credentials.url
        if (credentials.api_endpoint_url)
            return credentials.api_endpoint_url.replace('https://', `https://${credentials.client_id}:${credentials.client_secret}@`).replace('/daas/', '')
        if (credentials.endpoints && options.headers['x-endpoint-id']) {
            let endpoints = await this.sendRequest({ url: credentials.endpoints }).then(response => response.data)
            let endpointPath = options.headers['x-endpoint-id'].split(':')
            return 'https://' + endpointPath.reduce((endpoint, step) => endpoint[step], endpoints)
        }
    }

    async proxy(options) {
        let url = await this.getProxyURL(options)
        if (!url) return { statusCode: 404, body: { message: 'Resource not found' } }
        return this.proxyRequest(url)(options)
    }

}

IBMidService.default = new IBMidService()

module.exports = IBMidService