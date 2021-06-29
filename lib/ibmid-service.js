const axios = require('axios')
const AuthenticatedService = require('./internal/authenticated-service')
const IAMAPI = require('./internal/iam-api')
const AccountsAPI = require('./internal/accounts-api')
const GlobalCatalogAPI = require('./internal/global-catalog-api')
const ResourceControllerAPI = require('./internal/resource-controller-api')
const { notLoggedInResponse } = require('./responses')
const { RESOURCE_CONTROLLER_URL } = require('./config/constants')

class IBMidService extends AuthenticatedService {

    constructor(sendRequest=axios, iamApi=IAMAPI.default, accountsApi=AccountsAPI.default, globalCatalogApi=GlobalCatalogAPI.default, resourceControllerApi=ResourceControllerAPI.default) {
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

    proxyRequest(targetURL) {
        let self = this
        return function (options) {
            let iamOptions = { ...options }
            delete iamOptions.headers.host
            iamOptions.headers.authorization = `Bearer ${options.cookies.token}`
            if (options.url.includes('daas')) delete iamOptions.headers
            iamOptions.url = `${targetURL}${options.url}`
            return self.sendRequest(iamOptions)
                .then(response => ({ statusCode: response.status, body: response.data, headers: response.headers || {} }))
                .catch(err => ({ statusCode: err.response.status, body: err.response.data, headers: err.response.headers }))
        }
    }

    async getResourceDetails(options, resourceID) {
        if (resourceID.includes('whisk.system')) return { id: decodeURIComponent(resourceID), guid: decodeURIComponent(resourceID), resource_id: 'functions', region_id: resourceID.match(/(.*)functions:(.*):a/)[2], credentials: {} }
        let resourceData = await this.resourceControllerApi.getResource({ token: options.cookies.token, resource_id: resourceID }).catch(() => { })
        if (!resourceData || resourceData.status_code === 404) return null
        let keys = await this.resourceControllerApi.listResourceKeys({ token: options.cookies.token, resource_id: resourceID })
        let managerCreds = keys.resources.find(key => key.role && key.role.includes('Manager'))
        let editorCreds = keys.resources.find(key => key.role && key.role.includes('Writer'))
        let readerCreds = keys.resources.find(key => key.role && key.role.includes('Reader'))
        let bestCreds = managerCreds || editorCreds || readerCreds || {}
        let credentials = bestCreds.credentials || {}
        return { ...resourceData, credentials }
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

    async getProxyURL(resource, options) {
        if (resource.resource_id === 'functions')
            return `https://${resource.region_id}.functions.cloud.ibm.com/api/v1/${options.url.startsWith('/web/') ? 'web' : 'namespaces'}/${resource.guid.match(/(.*):(.*)::/)[2]}${options.url.startsWith('/web/') ? options.url.replace('/web', '') : ''}`
        if (resource.credentials.url)
            return resource.credentials.url
        if (resource.credentials.api_endpoint_url)
            return resource.credentials.api_endpoint_url.replace('https://', `https://${resource.credentials.client_id}:${resource.credentials.client_secret}@`).replace('/daas/', '')
        if (resource.id.includes('conversation'))
            return `https://api.${resource.region_id}.assistant.watson.cloud.ibm.com/instances/${resource.guid}`
        try {
            let endpoints = await this.sendRequest({ url: resource.credentials.endpoints }).then(response => response.data)
            let endpointPath = options.headers['x-endpoint-id'].split(':')
            return 'https://' + endpointPath.reduce((endpoint, step) => endpoint[step], endpoints)
        }
        catch (err) {
            console.log(err)
        }
    }

    async proxy(options) {
        let resource = await this.getResourceDetails(options, options.urlParams.resource_id)
        if (!resource) return { statusCode: 404, body: { message: 'Resource not found' } }
        options.url = options.url.replace(`/api/resources/${encodeURIComponent(options.urlParams.resource_id)}`, '')
        if (['', '/'].includes(options.url) && !options.headers['ibm-service-instance-id'] && options.method === 'GET') return { statusCode: 200, body: resource }
        if (['', '/'].includes(options.url) && !options.headers['ibm-service-instance-id']) return this.proxyRequest(RESOURCE_CONTROLLER_URL)({ ...options, url: `/v2/resource_instances/${options.urlParams.resource_id}` })
        if (['/endpoints'].includes(options.url)) return this.proxyRequest(resource.credentials.endpoints)({ ...options, url: '' })
        let url = await this.getProxyURL(resource, options)
        if (!url) return { statusCode: 400, body: { message: 'No service endpoint provided' } }
        return this.proxyRequest(url)(options)
    }

}

IBMidService.default = new IBMidService()

module.exports = IBMidService