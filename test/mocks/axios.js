const { ACCOUNTS_URL, IAM_URL, RESOURCE_CONTROLLER_URL, GLOBAL_CATALOG_URL } = require('../../lib/config/constants')
const { validToken, noAccountsToken, noAccessToken, justAccountsToken } = require('../tokens')

let openIdConfigSuccessResponse = { status: 200, data: { passcode_endpoint: 'foo_host/identity/passcode' } }
let tokenPasscodeSuccessResponse = passcode => ({ status: 200, data: { access_token: passcode.includes('not_allowed') ? noAccessToken : passcode.includes('no_accounts') ? noAccountsToken : passcode.includes('just_accounts') ? justAccountsToken : validToken, refresh_token: `foo_refresh_token_for_passcode_${passcode}`, expires_in: 1337 } })
let tokenPasscodeFailureResponse = { response: { status: 400, data: { errorMessage: 'Provided passcode is invalid' } } }
let tokenRefreshSuccessResponse = (account, refreshToken) => ({ status: 200, data: { access_token: refreshToken.includes('no_accounts') ? noAccountsToken : refreshToken.includes('just_accounts') ? justAccountsToken : validToken, refresh_token: `foo_refresh_token_for_account_${account}`, expires_in: 1337 } })
let tokenRefreshFailureResponse = { response: { status: 400, data: { errorMessage: 'Provided refresh_token is invalid' } } }
let tokenApikeySuccessResponse = apikey => ({ status: 200, data: { access_token: `foo_token_for_apikey_${apikey}`, refresh_token: 'not_supported', expires_in: 1337 } })
let accountsSuccessResponse = { status: 200, data: { resources: [{ metadata: { guid: 'foo_invalid_account_guid' } }, { metadata: { guid: 'foo_account_guid' } }, { metadata: { guid: 'foo_new_account_guid' } }] } }
let accountsNotAllowedSuccessResponse = { status: 200, data: { resources: [{ metadata: { guid: 'foo_unallowed_account_guid' } }] } }
let accountsFailureResponse = { response: { status: 400, data: { errorMessage: 'Account listing failed for some reason' } } }

let catalogSuccessResponse = {
    status: 200,
    data: {
        resources: [
            { id: 'foo_catalog_id_1', name: 'foo_catalog_name_1', kind: 'not_service', children: [{ id: 'foo_catalog_id_3', name: 'foo_catalog_name_1', kind: 'service', children: null }] },
            { id: 'foo_catalog_id_2', name: 'foo_catalog_name_2', kind: 'not_service', children: null }
        ]
    }
}

let resourceSuccessResponse = { status: 200, data: { id: 'foo_resource_id', guid: 'foo_resource_guid' } }
let resourceFailureResponse = { response: { status: 500, data: { foo: 'error' }, headers: { foo: 'error-headers' } } }
let resourceNoKeysSuccessResponse = { status: 200, data: { id: 'foo_resource_id_no_keys', guid: 'foo_resource_guid_no_keys' } }
let resourceNoKeysConversationSuccessResponse = { status: 200, data: { id: 'foo_resource_id_no_keys_conversation', guid: 'foo_resource_guid_no_keys_conversation', region_id: 'foo-region' } }
let resourceNoKeysSTTSuccessResponse = { status: 200, data: { id: 'foo_resource_id_no_keys_speech-to-text', guid: 'foo_resource_guid_no_keys_speech-to-text', region_id: 'foo-region' } }
let resourceCESuccessResponse = { status: 200, data: { id: 'foo_resource_id_codeengine', guid: 'foo_resource_id_codeengine', region_id: 'foo-region', extensions: { virtual_private_endpoints: { dns_domain: 'foo_namespace.appdomain.cloud' } } } }
let resourceMissingSuccessResponse = { status: 200, data: { status_code: 404 } }
let functionsResourceSuccessResponse = { status: 200, data: { guid: '_:foo_resource_guid::', resource_id: 'functions', region_id: 'foo-region' } }
let dashboardsResourceSuccessResponse = { status: 200, data: { id: 'foo_resource_id_dashboards', guid: 'foo_resource_guid_dashboards' } }
let endpointsResourceSuccessResponse = { status: 200, data: { id: 'foo_resource_id_endpoints', guid: 'foo_resource_guid_endpoints' } }
let resourceListSuccessResponsePaged = { status: 200, data: { rows_count: 2, next_url: '/v2/resource_instances?next_docid=foo_docid', resources: ['foo_resource_1', 'foo_resource_2'] } }
let resourceListSuccessResponse = { status: 200, data: { rows_count: 2, resources: ['foo_resource_3', 'foo_resource_4'] } }
let keysSuccessResponse = { status: 200, data: { resources: [{ role: 'Manager', guid: 'foo_account_guid', credentials: { url: 'foo_service_url' } }] } }
let noKeysSuccessResponse = { status: 200, data: { resources: [] } }
let dashboardKeysSuccessResponse = { status: 200, data: { resources: [{ role: 'Manager', guid: 'foo_account_guid', credentials: { api_endpoint_url: 'foo_service_url/daas/' } }] } }
let endpointsKeysSuccessResponse = { status: 200, data: { resources: [{ role: 'Manager', guid: 'foo_account_guid', credentials: { endpoints: 'foo_endpoints_url/endpoints' } }] } }
let endpointsSuccessResponse = { status: 200, data: { foo: { path: { to: { endpoint: 'foo_global_resource_url' } } } } }

let proxySuccessResponse = { status: 200, data: { foo: 'data' }, headers: { foo: 'headers' } }
let proxyFailureResponse = { response: { status: 500, data: { foo: 'error' }, headers: { foo: 'error-headers' } } }

let proxyCESuccessResponse = { status: 200, data: { foo: 'ce-data' }, headers: { foo: 'headers' } }
let proxyCEServiceSuccessResponse = { status: 200, data: { foo: 'ce-service-data' }, headers: { foo: 'headers' } }
let proxyCEApplicationSuccessResponse = { status: 200, data: { foo: 'ce-app-data' }, headers: { foo: 'headers' } }

const responseMap = {
    [`${IAM_URL}/identity/.well-known/openid-configuration`]: () => Promise.resolve(openIdConfigSuccessResponse),
    [`${IAM_URL}/identity/token`]: jest.fn(x =>
        x.params.passcode ?
            x.params.passcode.includes('invalid') ?
                Promise.reject(tokenPasscodeFailureResponse) :
                Promise.resolve(tokenPasscodeSuccessResponse(x.params.passcode)) :
            x.params.refresh_token ?
                (x.params.refresh_token.includes('invalid') || (x.params.account && x.params.account.includes('invalid')) || x.params.refresh_token == 'not_supported') ?
                    Promise.reject(tokenRefreshFailureResponse) :
                    Promise.resolve(tokenRefreshSuccessResponse(x.params.account, x.params.refresh_token)) :
                x.params.apikey.includes('invalid') ?
                    Promise.reject(tokenPasscodeFailureResponse) :
                    Promise.resolve(tokenApikeySuccessResponse(x.params.apikey))

    ),
    [`${ACCOUNTS_URL}/v1/accounts`]: jest.fn(
        x => x.headers.Authorization.includes('failure') ?
            Promise.reject(accountsFailureResponse) :
            x.headers.Authorization === `Bearer ${noAccountsToken}` || x.headers.Authorization === `Bearer ${noAccessToken}` ?
                Promise.resolve(accountsNotAllowedSuccessResponse) :
                x.headers.Authorization === `Bearer ${justAccountsToken}` ?
                    Promise.resolve(accountsSuccessResponse) :
                    Promise.resolve(accountsSuccessResponse)
    ),
    [`${GLOBAL_CATALOG_URL}/api/v1`]: () => Promise.resolve(catalogSuccessResponse),

    [`${RESOURCE_CONTROLLER_URL}/v2/resource_instances`]: () => Promise.resolve(resourceListSuccessResponsePaged),
    [`${RESOURCE_CONTROLLER_URL}/v2/resource_instances?next_docid=foo_docid`]: () => Promise.resolve(resourceListSuccessResponse),
    [`${RESOURCE_CONTROLLER_URL}/v2/resource_instances/foo_resource_id`]: () => Promise.resolve(resourceSuccessResponse),
    [`${RESOURCE_CONTROLLER_URL}/v2/resource_instances/foo_resource_id_error`]: () => Promise.reject(resourceFailureResponse),
    [`${RESOURCE_CONTROLLER_URL}/v2/resource_instances/foo_resource_id_no_keys`]: () => Promise.resolve(resourceNoKeysSuccessResponse),
    [`${RESOURCE_CONTROLLER_URL}/v2/resource_instances/foo_resource_id_no_keys_conversation`]: () => Promise.resolve(resourceNoKeysConversationSuccessResponse),
    [`${RESOURCE_CONTROLLER_URL}/v2/resource_instances/foo_resource_id_no_keys_speech-to-text`]: () => Promise.resolve(resourceNoKeysSTTSuccessResponse),
    [`${RESOURCE_CONTROLLER_URL}/v2/resource_instances/foo_resource_id_codeengine`]: () => Promise.resolve(resourceCESuccessResponse),
    [`${RESOURCE_CONTROLLER_URL}/v2/resource_instances/foo_resource_id_missing`]: () => Promise.resolve(resourceMissingSuccessResponse),
    [`${RESOURCE_CONTROLLER_URL}/v2/resource_instances/foo_resource_id_functions`]: () => Promise.resolve(functionsResourceSuccessResponse),
    [`${RESOURCE_CONTROLLER_URL}/v2/resource_instances/foo_resource_id_dashboards`]: () => Promise.resolve(dashboardsResourceSuccessResponse),
    [`${RESOURCE_CONTROLLER_URL}/v2/resource_instances/foo_resource_id_endpoints`]: () => Promise.resolve(endpointsResourceSuccessResponse),
    'foo_service_url/foo_path': () => Promise.resolve(proxySuccessResponse),
    'foo_service_url/foo_path_error': () => Promise.reject(proxyFailureResponse),
    'foo_service_url/daas/foo_path': () => Promise.resolve(proxySuccessResponse),
    'https://foo-region.functions.cloud.ibm.com/api/v1/namespaces/foo_resource_guid/foo_path': () => Promise.resolve(proxySuccessResponse),
    'https://foo-region.functions.cloud.ibm.com/api/v1/web/foo_resource_guid/foo_path/web/foo_path': () => Promise.resolve(proxySuccessResponse),
    'https://us-south.functions.cloud.ibm.com/api/v1/namespaces/whisk.system/foo_path': () => Promise.resolve(proxySuccessResponse),
    [`${RESOURCE_CONTROLLER_URL}/v2/resource_instances/foo_resource_id/resource_keys`]: () => Promise.resolve(keysSuccessResponse),
    [`${RESOURCE_CONTROLLER_URL}/v2/resource_instances/foo_resource_id_no_keys/resource_keys`]: () => Promise.resolve(noKeysSuccessResponse),
    [`${RESOURCE_CONTROLLER_URL}/v2/resource_instances/foo_resource_id_dashboards/resource_keys`]: () => Promise.resolve(dashboardKeysSuccessResponse),
    [`${RESOURCE_CONTROLLER_URL}/v2/resource_instances/foo_resource_id_endpoints/resource_keys`]: () => Promise.resolve(endpointsKeysSuccessResponse),

    'foo_endpoints_url/endpoints': () => Promise.resolve(endpointsSuccessResponse),
    'https://foo_global_resource_url/foo_path': () => Promise.resolve(proxySuccessResponse),
    'https://api.foo-region.assistant.watson.cloud.ibm.com/instances/foo_resource_guid_no_keys_conversation/foo_endpoint': () => Promise.resolve(proxySuccessResponse),
    'https://api.foo-region.speech-to-text.watson.cloud.ibm.com/instances/foo_resource_guid_no_keys_speech-to-text/foo_endpoint': () => Promise.resolve(proxySuccessResponse),
    'https://api.dataplatform.cloud.ibm.com/foo_path': () => Promise.resolve(proxySuccessResponse),
    'https://accounts.cloud.ibm.com/foo_path': () => Promise.resolve(proxySuccessResponse),
    'https://billing.cloud.ibm.com/foo_path': () => Promise.resolve(proxySuccessResponse),
    'https://resource-controller.cloud.ibm.com/foo_path': () => Promise.resolve(proxySuccessResponse),
    'https://globalcatalog.cloud.ibm.com/foo_path': () => Promise.resolve(proxySuccessResponse),
    'https://api.global-search-tagging.cloud.ibm.com/foo_path': () => Promise.resolve(proxySuccessResponse),
    'https://proxy.foo-region.codeengine.cloud.ibm.com/apis/serving.knative.dev/v1/namespaces/foo_namespace/services/foo_endpoint': () => Promise.resolve(proxyCEServiceSuccessResponse),
    'https://proxy.foo-region.codeengine.cloud.ibm.com/api/v1/namespaces/foo_namespace/foo_endpoint': () => Promise.resolve(proxyCESuccessResponse),
    'https://foo-application.foo_namespace.foo-region.codeengine.appdomain.cloud/foo_endpoint': () => Promise.resolve(proxyCEApplicationSuccessResponse),




}

const mockAxios = jest.fn(options => {
    let route = responseMap[options.url]
    // if (!route) console.log(options)
    let response = route(options)
    return response
})
module.exports = mockAxios