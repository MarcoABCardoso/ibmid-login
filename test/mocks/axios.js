const { ACCOUNTS_URL, IAM_URL, RESOURCE_CONTROLLER_URL, GLOBAL_CATALOG_URL } = require('../../lib/config/constants')
const { notLoggedInResponse } = require('../../lib/responses')

let openIdConfigSuccessResponse = { status: 200, data: { passcode_endpoint: 'foo_host/identity/passcode' } }
let tokenPasscodeSuccessResponse = passcode => ({ status: 200, data: { access_token: `foo_token_for_passcode_${passcode}`, refresh_token: `foo_token_for_passcode_${passcode}`, expires_in: 1337 } })
let tokenPasscodeFailureResponse = { response: { status: 400, data: { errorMessage: 'Provided passcode is invalid' } } }
let tokenRefreshSuccessResponse = account => ({ status: 200, data: { access_token: `foo_refreshed_token_for_account_${account}`, refresh_token: `foo_refresh_token_for_account_${account}`, expires_in: 1337 } })
let tokenRefreshFailureResponse = { response: { status: 400, data: { errorMessage: 'Provided refresh_token is invalid' } } }
let tokenApikeySuccessResponse = apikey => ({ status: 200, data: { access_token: `foo_token_for_apikey_${apikey}`, refresh_token: 'not_supported', expires_in: 1337 } })
let accountsSuccessResponse = { status: 200, data: { resources: [{ metadata: { guid: 'foo_invalid_account_guid' } }, { metadata: { guid: 'foo_account_guid' } }, { metadata: { guid: 'foo_new_account_guid' } }] } }
let accountsNotAllowedSuccessResponse = { status: 200, data: { resources: [{ metadata: { guid: 'foo_unallowed_account_guid' } }] } }
let accountsFailureResponse = notLoggedInResponse()

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
let resourceMissingSuccessResponse = { status: 200, data: { status_code: 404 } }
let functionsResourceSuccessResponse = { status: 200, data: { guid: '_:foo_resource_guid::', resource_id: 'functions', region_id: 'foo-region' } }
let dashboardsResourceSuccessResponse = { status: 200, data: { id: 'foo_resource_id_dashboards', guid: 'foo_resource_guid_dashboards' } }
let endpointsResourceSuccessResponse = { status: 200, data: { id: 'foo_resource_id_endpoints', guid: 'foo_resource_guid_endpoints' } }
let resourceListSuccessResponsePaged = { status: 200, data: { rows_count: 2, next_url: '/v2/resource_instances?next_docid=foo_docid', resources: ['foo_resource_1', 'foo_resource_2'] } }
let resourceListSuccessResponse = { status: 200, data: { rows_count: 2, resources: ['foo_resource_3', 'foo_resource_4'] } }
let keysSuccessResponse = { status: 200, data: { resources: [{ role: 'Manager', guid: 'foo_account_guid', credentials: { url: 'foo_service_url' } }] } }
let noKeysSuccessResponse = { status: 200, data: { resources: [] } }
let dashboardKeysSuccessResponse = { status: 200, data: { resources: [{ role: 'Manager', guid: 'foo_account_guid', credentials: { api_endpoint_url: 'foo_service_url/daas/' } }] } }
let endpointsKeysSuccessResponse = { status: 200, data: { resources: [{ role: 'Manager', guid: 'foo_account_guid', credentials: { endpoints: 'foo_endpoints_url' } }] } }
let endpointsSuccessResponse = { status: 200, data: { foo: { path: { to: { endpoint: 'foo_global_resource_url' } } } } }
let proxySuccessResponse = { status: 200, data: { foo: 'data' }, headers: { foo: 'headers' } }
let proxyFailureResponse = { response: { status: 500, data: { foo: 'error' }, headers: { foo: 'error-headers' } } }


const defaultResponseMap = {
    [`${IAM_URL}/identity/.well-known/openid-configuration`]: jest.fn(() => Promise.resolve(openIdConfigSuccessResponse)),
    [`${IAM_URL}/identity/token`]: jest.fn(x =>
        x.params.passcode ?
            x.params.passcode.includes('invalid') ?
                Promise.reject(tokenPasscodeFailureResponse) :
                Promise.resolve(tokenPasscodeSuccessResponse(x.params.passcode)) :
            x.params.refresh_token ?
                (x.params.refresh_token.includes('invalid') || (x.params.account && x.params.account.includes('invalid')) || x.params.refresh_token == 'not_supported') ?
                    Promise.reject(tokenRefreshFailureResponse) :
                    Promise.resolve(tokenRefreshSuccessResponse(x.params.account)) :
                Promise.resolve(tokenApikeySuccessResponse(x.params.apikey))

    ),
    [`${ACCOUNTS_URL}/v1/accounts`]: jest.fn(
        x => x.headers.Authorization.includes('not_allowed') ?
            Promise.resolve(accountsNotAllowedSuccessResponse) :
            x.headers.Authorization.includes('invalid') ?
                Promise.reject(accountsFailureResponse) :
                Promise.resolve(accountsSuccessResponse)
    ),
    [`${GLOBAL_CATALOG_URL}/api/v1`]: jest.fn(() => Promise.resolve(catalogSuccessResponse)),

    [`${RESOURCE_CONTROLLER_URL}/v2/resource_instances`]: jest.fn(() => Promise.resolve(resourceListSuccessResponsePaged)),
    [`${RESOURCE_CONTROLLER_URL}/v2/resource_instances?next_docid=foo_docid`]: jest.fn(() => Promise.resolve(resourceListSuccessResponse)),
    [`${RESOURCE_CONTROLLER_URL}/v2/resource_instances/foo_resource_id`]: jest.fn(() => Promise.resolve(resourceSuccessResponse)),
    [`${RESOURCE_CONTROLLER_URL}/v2/resource_instances/foo_resource_id_error`]: jest.fn(() => Promise.reject(resourceFailureResponse)),
    [`${RESOURCE_CONTROLLER_URL}/v2/resource_instances/foo_resource_id_no_keys`]: jest.fn(() => Promise.resolve(resourceNoKeysSuccessResponse)),
    [`${RESOURCE_CONTROLLER_URL}/v2/resource_instances/foo_resource_id_no_keys_conversation`]: jest.fn(() => Promise.resolve(resourceNoKeysConversationSuccessResponse)),
    [`${RESOURCE_CONTROLLER_URL}/v2/resource_instances/foo_resource_id_missing`]: jest.fn(() => Promise.resolve(resourceMissingSuccessResponse)),
    [`${RESOURCE_CONTROLLER_URL}/v2/resource_instances/foo_resource_id_functions`]: jest.fn(() => Promise.resolve(functionsResourceSuccessResponse)),
    [`${RESOURCE_CONTROLLER_URL}/v2/resource_instances/foo_resource_id_dashboards`]: jest.fn(() => Promise.resolve(dashboardsResourceSuccessResponse)),
    [`${RESOURCE_CONTROLLER_URL}/v2/resource_instances/foo_resource_id_endpoints`]: jest.fn(() => Promise.resolve(endpointsResourceSuccessResponse)),
    'foo_service_url/foo_path': jest.fn(() => Promise.resolve(proxySuccessResponse)),
    'foo_service_url/foo_path_error': jest.fn(() => Promise.reject(proxyFailureResponse)),
    'foo_service_url/daas/foo_path': jest.fn(() => Promise.resolve(proxySuccessResponse)),
    'https://foo-region.functions.cloud.ibm.com/api/v1/namespaces/foo_resource_guid/foo_path': jest.fn(() => Promise.resolve(proxySuccessResponse)),
    'https://foo-region.functions.cloud.ibm.com/api/v1/web/foo_resource_guid/foo_path/web/foo_path': jest.fn(() => Promise.resolve(proxySuccessResponse)),
    'https://us-south.functions.cloud.ibm.com/api/v1/namespaces/whisk.system/foo_path': jest.fn(() => Promise.resolve(proxySuccessResponse)),
    [`${RESOURCE_CONTROLLER_URL}/v2/resource_instances/foo_resource_id/resource_keys`]: jest.fn(() => Promise.resolve(keysSuccessResponse)),
    [`${RESOURCE_CONTROLLER_URL}/v2/resource_instances/foo_resource_id_no_keys/resource_keys`]: jest.fn(() => Promise.resolve(noKeysSuccessResponse)),
    [`${RESOURCE_CONTROLLER_URL}/v2/resource_instances/foo_resource_id_dashboards/resource_keys`]: jest.fn(() => Promise.resolve(dashboardKeysSuccessResponse)),
    [`${RESOURCE_CONTROLLER_URL}/v2/resource_instances/foo_resource_id_endpoints/resource_keys`]: jest.fn(() => Promise.resolve(endpointsKeysSuccessResponse)),

    'foo_endpoints_url': jest.fn(() => Promise.resolve(endpointsSuccessResponse)),
    'https://foo_global_resource_url/foo_path': jest.fn(() => Promise.resolve(proxySuccessResponse)),
    'https://api.foo-region.assistant.watson.cloud.ibm.com/instances/foo_resource_guid_no_keys_conversation/foo_endpoint': jest.fn(() => Promise.resolve(proxySuccessResponse)),
    'https://api.dataplatform.cloud.ibm.com/foo_path': jest.fn(() => Promise.resolve(proxySuccessResponse)),

}

const mockAxios = (responseMap) => options => {
    let route = { ...defaultResponseMap, ...responseMap }[options.url]
    let response = route(options)
    return response
}
module.exports = mockAxios