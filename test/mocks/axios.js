const { ACCOUNTS_URL, IAM_URL } = require('../../lib/config/constants')
const { notLoggedInResponse } = require('../../lib/responses')

let openIdConfigSuccessResponse = { status: 200, data: { passcode_endpoint: 'foo_host/identity/passcode' } }
let tokenPasscodeSuccessResponse = passcode => ({ status: 200, data: { access_token: `foo_token_for_passcode_${passcode}`, refresh_token: `foo_token_for_passcode_${passcode}`, expires_in: 1337 } })
let tokenPasscodeFailureResponse = { response: { status: 400, data: { errorMessage: 'Provided passcode is invalid' } } }
let tokenRefreshSuccessResponse = account => ({ status: 200, data: { access_token: `foo_refreshed_token_for_account_${account}`, refresh_token: `foo_refresh_token_for_account_${account}`, expires_in: 1337 } })
let tokenRefreshFailureResponse = { response: { status: 400, data: { errorMessage: 'Provided refresh_token is invalid' } } }
let accountsSuccessResponse = { status: 200, data: { resources: [{ metadata: { guid: 'foo_invalid_account_guid' } }, { metadata: { guid: 'foo_account_guid' } }, { metadata: { guid: 'foo_new_account_guid' } }] } }
let accountsNotAllowedSuccessResponse = { status: 200, data: { resources: [{ metadata: { guid: 'foo_unallowed_account_guid' } }] } }
let accountsFailureResponse = notLoggedInResponse()

const defaultResponseMap = {
    [`${IAM_URL}/identity/.well-known/openid-configuration`]: jest.fn(() => Promise.resolve(openIdConfigSuccessResponse)),
    [`${IAM_URL}/identity/token`]: jest.fn(x =>
        x.params.passcode ?
            x.params.passcode.includes('invalid') ?
                Promise.reject(tokenPasscodeFailureResponse) :
                Promise.resolve(tokenPasscodeSuccessResponse(x.params.passcode)) :
            (x.params.refresh_token.includes('invalid') || (x.params.account && x.params.account.includes('invalid'))) ?
                Promise.reject(tokenRefreshFailureResponse) :
                Promise.resolve(tokenRefreshSuccessResponse(x.params.account))
    ),
    [`${ACCOUNTS_URL}/v1/accounts`]: jest.fn(
        x => x.headers.Authorization.includes('not_allowed') ?
            Promise.resolve(accountsNotAllowedSuccessResponse) :
            x.headers.Authorization.includes('invalid') ?
                Promise.reject(accountsFailureResponse) :
                Promise.resolve(accountsSuccessResponse)
    ),

}

const mockAxios = (responseMap) => options => {
    let route = { ...defaultResponseMap, ...responseMap }[options.url]
    let response = route(options)
    return response
}
module.exports = mockAxios