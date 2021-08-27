
const { default: IBMidService } = require('../lib')
const GlobalCatalogAPI = require('../lib/internal/global-catalog-api')
const ResourceControllerAPI = require('../lib/internal/resource-controller-api')
const AccountsAPI = require('../lib/internal/accounts-api')
const IAMAPI = require('../lib/internal/iam-api')
const { notLoggedInResponse } = require('../lib/responses')
const mockAxios = require('./mocks/axios')
const mockJwksClient = require('./mocks/jwksClient')
const jwt = require('jsonwebtoken')

let iamApi = new IAMAPI(mockAxios, mockJwksClient)
let accountsApi = new AccountsAPI(mockAxios)
let globalCatalogApi = new GlobalCatalogAPI(mockAxios)
let resourceControllerApi = new ResourceControllerAPI(mockAxios)

let ibmidService = IBMidService.default
beforeEach(() => {
    jest.clearAllMocks()
    ibmidService = new IBMidService({
        ALLOWED_ACCOUNTS: ['foo_invalid_account_guid', 'foo_account_guid', 'foo_new_account_guid'],
        ALLOWED_USERS: ['.*@allowed_domain.com$', '.*@other_allowed_domain.com$']
    }, mockAxios, iamApi, accountsApi, globalCatalogApi, resourceControllerApi)
})

describe('IBMid service', () => {
    describe('default', () => {
        it('Should be a properly constructed instance of IBMidService', () => {
            expect(IBMidService.default.iamApi).toBeInstanceOf(IAMAPI)
            expect(IBMidService.default.accountsApi).toBeInstanceOf(AccountsAPI)
        })
    })
    describe('#getPasscode', () => {
        it('Redirects to passcode endpoint given by well known endpoint', (done) => {
            ibmidService.getPasscode()
                .catch(err => done.fail(err))
                .then(data => {
                    expect(data).toEqual({
                        'body': {},
                        'headers': { 'location': 'foo_host/identity/passcode' },
                        'statusCode': 302,
                    })
                    done()
                })
        })
    })
    describe('#login', () => {
        describe('When login succeeds', () => {
            it('Generates an IAM token, lists accounts and refreshes the token with the first account guid', (done) => {
                ibmidService.login({ passcode: 'foo_passcode' })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual({
                            'body': { 'success': true, 'token': 'foo_refreshed_token_for_account_foo_account_guid', 'expires_in': 1337, 'refresh_token': 'foo_refresh_token_for_account_foo_account_guid' },
                            'headers': {
                                'Set-Cookie': [
                                    'token=foo_refreshed_token_for_account_foo_account_guid; Max-Age=1337; Path=/; HttpOnly',
                                    'refresh_token=foo_refresh_token_for_account_foo_account_guid; Max-Age=32088; Path=/; HttpOnly',
                                    'account_id=foo_account_guid; Max-Age=32088; Path=/; HttpOnly'
                                ]
                            },
                            'statusCode': 200,
                        })
                        done()
                    })
            })
        })
        describe('When apikey is passed', () => {
            it('Generates an IAM token and does not attempt to refresh it', (done) => {
                ibmidService.login({ apikey: 'foo_apikey' })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual({
                            'body': { 'success': true, 'token': 'foo_token_for_apikey_foo_apikey', 'expires_in': 1337, 'refresh_token': 'not_supported' },
                            'headers': {
                                'Set-Cookie': [
                                    'token=foo_token_for_apikey_foo_apikey; Max-Age=1337; Path=/; HttpOnly',
                                    'refresh_token=not_supported; Max-Age=32088; Path=/; HttpOnly',
                                    'account_id=null; Max-Age=32088; Path=/; HttpOnly'
                                ]
                            },
                            'statusCode': 200,
                        })
                        done()
                    })
            })
        })
        describe('When no accounts are allowed', () => {
            it('Returns RC 401', (done) => {
                ibmidService.login({ passcode: 'foo_passcode_not_allowed' })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual(notLoggedInResponse())
                        done()
                    })
            })
        })
        describe('When login fails', () => {
            it('Returns RC 401', (done) => {
                ibmidService.login({ passcode: 'foo_passcode_invalid' })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual({
                            'body': { 'message': 'Provided passcode is invalid', 'success': false },
                            'statusCode': 401,
                        })
                        done()
                    })
            })
        })
    })
    describe('#logout', () => {
        it('Clears login related cookies', (done) => {
            ibmidService.logout()
                .catch(err => done.fail(err))
                .then(data => {
                    expect(data).toEqual({
                        'body': { 'success': true },
                        'headers': { 'Set-Cookie': ['token=null; Max-Age=0; Path=/; HttpOnly', 'refresh_token=null; Max-Age=0; Path=/; HttpOnly', 'account_id=null; Max-Age=0; Path=/; HttpOnly'] },
                        'statusCode': 200,
                    })
                    done()
                })
        })
    })
    describe('#switchAccount', () => {
        describe('When token refresh succeeds', () => {
            it('Generates a new IAM token using new account guid', (done) => {
                ibmidService.switchAccount({ token: 'foo_token', refreshToken: 'foo_refresh_token', accountID: 'foo_new_account_guid' })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual({
                            'body': { 'expires_in': 1337, 'refresh_token': 'foo_refresh_token_for_account_foo_new_account_guid', 'success': true, 'token': 'foo_refreshed_token_for_account_foo_new_account_guid', },
                            'headers': { 'Set-Cookie': ['token=foo_refreshed_token_for_account_foo_new_account_guid; Max-Age=1337; Path=/; HttpOnly', 'refresh_token=foo_refresh_token_for_account_foo_new_account_guid; Max-Age=32088; Path=/; HttpOnly', 'account_id=foo_new_account_guid; Max-Age=32088; Path=/; HttpOnly'] },
                            'statusCode': 200,
                        })
                        done()
                    })
            })
        })
        describe('When account id is not passed', () => {
            it('Refreshes the session', (done) => {
                ibmidService.switchAccount({ token: 'foo_token', refreshToken: 'foo_refresh_token', accountID: 'foo_account_guid' })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual({
                            'body': { 'expires_in': 1337, 'refresh_token': 'foo_refresh_token_for_account_foo_account_guid', 'success': true, 'token': 'foo_refreshed_token_for_account_foo_account_guid', },
                            'headers': { 'Set-Cookie': ['token=foo_refreshed_token_for_account_foo_account_guid; Max-Age=1337; Path=/; HttpOnly', 'refresh_token=foo_refresh_token_for_account_foo_account_guid; Max-Age=32088; Path=/; HttpOnly', 'account_id=foo_account_guid; Max-Age=32088; Path=/; HttpOnly'] },
                            'statusCode': 200,
                        })
                        done()
                    })
            })
        })
        describe('When user tries to switch to a not allowed account', () => {
            it('Returns RC 401', (done) => {
                ibmidService.switchAccount({ token: 'foo_token', refreshToken: 'foo_refresh_token', accountID: 'foo_not_allowed_account_guid' })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual(notLoggedInResponse())
                        done()
                    })
            })
        })
        describe('When token refresh fails', () => {
            it('Returns RC 401', (done) => {
                ibmidService.switchAccount({ refreshToken: 'foo_invalid_refresh_token', accountID: 'foo_new_account_guid' })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual(notLoggedInResponse())
                        done()
                    })
            })
        })
        describe('When token is not present', () => {
            it('Refreshes token and switches account', (done) => {
                ibmidService.switchAccount({ refreshToken: 'foo_refresh_token', accountID: 'foo_new_account_guid' })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual({
                            'body': { 'expires_in': 1337, 'refresh_token': 'foo_refresh_token_for_account_foo_new_account_guid', 'success': true, 'token': 'foo_refreshed_token_for_account_foo_new_account_guid', },
                            'headers': {
                                'Set-Cookie': [
                                    'token=foo_refreshed_token_for_account_foo_new_account_guid; Max-Age=1337; Path=/; HttpOnly',
                                    'refresh_token=foo_refresh_token_for_account_foo_new_account_guid; Max-Age=32088; Path=/; HttpOnly',
                                    'account_id=foo_new_account_guid; Max-Age=32088; Path=/; HttpOnly'
                                ]
                            },
                            'statusCode': 200,
                        })
                        done()
                    })
            })
        })
        describe('When refresh token is not present', () => {
            it('Returns RC 401', (done) => {
                ibmidService.switchAccount({ accountID: 'foo_new_account_guid' })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual(notLoggedInResponse())
                        done()
                    })
            })
        })
    })
    describe('#getOwnUser', () => {
        describe('When token is valid', () => {
            it('Returns the user with their accounts', (done) => {
                ibmidService.getOwnUser({ token: jwt.sign({ 'email': 'foo_user_email@allowed_domain.com', 'account': { 'bss': 'foo_account_guid' } }, mockJwksClient.privateKey, { algorithm: 'RS512' }), refreshToken: 'foo_refresh_token' })
                    .catch(err => done.fail(err))
                    .then(data => {
                        delete data.body.iat
                        expect(data).toEqual({
                            'statusCode': 200,
                            'headers': {},
                            'body': { 'email': 'foo_user_email@allowed_domain.com', 'account': { 'bss': 'foo_account_guid' } },
                        })
                        done()
                    })
            })
        })
        describe('When token is not from an allowed account', () => {
            it('Returns RC 401', (done) => {
                ibmidService.getOwnUser({ token: jwt.sign({ 'email': 'foo_user_email@allowed_domain.com', 'account': { 'bss': 'foo_unallowed_account_guid' } }, mockJwksClient.privateKey, { algorithm: 'RS512' }), refreshToken: 'foo_refresh_token' })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual(notLoggedInResponse())
                        done()
                    })
            })
        })
        describe('When token is not from an allowed user', () => {
            it('Returns RC 401', (done) => {
                ibmidService.getOwnUser({ token: jwt.sign({ 'email': 'foo_user_email@dangerous_domain.com', 'account': { 'bss': 'foo_account_guid' } }, mockJwksClient.privateKey, { algorithm: 'RS512' }), refreshToken: 'foo_refresh_token' })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual(notLoggedInResponse())
                        done()
                    })
            })
        })
        describe('When token is invalid', () => {
            it('Returns RC 401', (done) => {
                ibmidService.getOwnUser({ token: 'eyJraWQiOiIyMDIwMTEyMTE4MzQiLCJhbGciOiJSUzUxMiJ9.eyJmb29fdXNlcl9maWVsZCI6ImZvb191c2VyX3ZhbHVlIiwiZXhwIjowfQ.H50OWcUkfmMD1jISDHLypRImzlUBEAAJ658GOqvBPo2XUSeoqG1am8XXe18LdsHa6j5m40rpXCXriIwiyai7CqOyJ0iRlGIcfoBozv5GR1eDilQjwQdm7JUMJLBtC57qbJ-iG8qh1ViX0GcqLPGaSTNeLOrpXIV1jS2EdnKHWOA', refreshToken: 'foo_refresh_token' })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual(notLoggedInResponse())
                        done()
                    })
            })
        })
    })
    describe('#listAccounts', () => {
        describe('When account listing succeeds (valid token)', () => {
            it('Returns the allowed account list', (done) => {
                ibmidService.listAccounts({ token: 'foo_token', refreshToken: 'foo_refresh_token', accountID: 'foo_account_guid' })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual({
                            'statusCode': 200,
                            'headers': {},
                            'body': { 'resources': [{ 'metadata': { 'guid': 'foo_invalid_account_guid' } }, { 'metadata': { 'guid': 'foo_account_guid' } }, { 'metadata': { 'guid': 'foo_new_account_guid' } }] },
                        })
                        done()
                    })
            })
        })
        describe('When account listing fails (invalid token)', () => {
            it('Returns account listing response as is', (done) => {
                ibmidService.listAccounts({ token: 'foo_failure_token', refreshToken: 'foo_refresh_token', accountID: 'foo_account_guid' })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual({ 'statusCode': 400, 'body': { 'errorMessage': 'Account listing failed for some reason' }, 'headers': {} })
                        done()
                    })
            })
        })
    })
    describe('#manageResource', () => {
        it('Forwards the request to the service URL', (done) => {
            ibmidService.manageResource({ method: 'FOO_METHOD', url: '', resourceID: 'foo_resource_id', token: 'foo_token', refreshToken: 'foo_refresh_token', accountID: 'foo_account_guid' })
                .catch(err => done.fail(err))
                .then(data => {
                    expect(mockAxios.mock.calls[0][0].headers.Authorization).toBe('Bearer foo_token')
                    expect(data).toEqual({
                        'statusCode': 200,
                        'headers': {},
                        'body': { 'id': 'foo_resource_id', 'guid': 'foo_resource_guid' },
                    })
                    done()
                })
        })
        describe('When IBM_APIKEY is passed', () => {
            it('Overrides the token passed onto the API', (done) => {
                ibmidService = new IBMidService({ IBMID_APIKEY: 'foo_apikey' }, mockAxios, iamApi, accountsApi, globalCatalogApi, resourceControllerApi)
                ibmidService.manageResource({ method: 'FOO_METHOD', url: '', resourceID: 'foo_resource_id', token: 'foo_token', refreshToken: 'foo_refresh_token', accountID: 'foo_account_guid' })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(mockAxios.mock.calls[1][0].headers.Authorization).toBe('Bearer foo_token_for_apikey_foo_apikey')
                        expect(data).toEqual({
                            'statusCode': 200,
                            'headers': {},
                            'body': { 'id': 'foo_resource_id', 'guid': 'foo_resource_guid' },
                        })
                        done()
                    })
            })
        })
        describe('When IBM_APIKEY is passed, but is invalid', () => {
            it('Does not override the token passed onto the API, and just uses the normal one', (done) => {
                ibmidService = new IBMidService({ IBMID_APIKEY: 'foo_apikey_invalid' }, mockAxios, iamApi, accountsApi, globalCatalogApi, resourceControllerApi)
                ibmidService.manageResource({ method: 'FOO_METHOD', url: '', resourceID: 'foo_resource_id', token: 'foo_token', refreshToken: 'foo_refresh_token', accountID: 'foo_account_guid' })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(mockAxios.mock.calls[1][0].headers.Authorization).toBe('Bearer foo_token')
                        expect(data).toEqual({
                            'statusCode': 200,
                            'headers': {},
                            'body': { 'id': 'foo_resource_id', 'guid': 'foo_resource_guid' },
                        })
                        done()
                    })
            })
        })
        describe('When the service management fails', () => {
            it('Forwards the error response', (done) => {
                ibmidService.manageResource({ method: 'FOO_METHOD', url: '', resourceID: 'foo_resource_id_error', token: 'foo_token', refreshToken: 'foo_refresh_token', accountID: 'foo_account_guid' })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual({
                            'statusCode': 500,
                            'headers': { 'foo': 'error-headers' },
                            'body': { 'foo': 'error' },
                        })
                        done()
                    })
            })
        })
    })
    describe('#proxy', () => {
        describe('For default services', () => {
            it('Forwards the request to the service URL', (done) => {
                ibmidService.proxy({ method: 'FOO_METHOD', url: '/foo_path', resourceID: 'foo_resource_id', token: 'foo_token', refreshToken: 'foo_refresh_token', accountID: 'foo_account_guid' })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(mockAxios.mock.calls[1][0].headers.Authorization).toBe('Bearer foo_token')
                        expect(data).toEqual({
                            'statusCode': 200,
                            'headers': { 'foo': 'headers' },
                            'body': { 'foo': 'data' },
                        })
                        done()
                    })
            })
            describe('When IBM_APIKEY is passed', () => {
                it('Overrides the token passed onto the API', (done) => {
                    ibmidService = new IBMidService({ IBMID_APIKEY: 'foo_apikey' }, mockAxios, iamApi, accountsApi, globalCatalogApi, resourceControllerApi)
                    ibmidService.proxy({ method: 'FOO_METHOD', url: '/foo_path', resourceID: 'foo_resource_id', token: 'foo_token', refreshToken: 'foo_refresh_token', accountID: 'foo_account_guid' })
                        .catch(err => done.fail(err))
                        .then(data => {
                            expect(mockAxios.mock.calls[1][0].headers.Authorization).toBe('Bearer foo_token_for_apikey_foo_apikey')
                            expect(data).toEqual({
                                'statusCode': 200,
                                'headers': { 'foo': 'headers' },
                                'body': { 'foo': 'data' },
                            })
                            done()
                        })
                })
            })
            describe('When the service has no keys', () => {
                it('Returns RC 404', (done) => {
                    ibmidService.proxy({ method: 'FOO_METHOD', url: '/foo_endpoint', resourceID: 'foo_resource_id_no_keys', token: 'foo_token', refreshToken: 'foo_refresh_token', accountID: 'foo_account_guid' })
                        .catch(err => done.fail(err))
                        .then(data => {
                            expect(data).toEqual({
                                'statusCode': 404,
                                'headers': {},
                                'body': { 'message': 'Resource not found' },
                            })
                            done()
                        })
                })
            })
            describe('When the service has no keys, but is a conversation instance', () => {
                it('Forwards the request to the service URL', (done) => {
                    ibmidService.proxy({ method: 'FOO_METHOD', url: '/foo_endpoint', resourceID: 'foo_resource_id_no_keys_conversation', token: 'foo_token', refreshToken: 'foo_refresh_token', accountID: 'foo_account_guid' })
                        .catch(err => done.fail(err))
                        .then(data => {
                            expect(data).toEqual({
                                'statusCode': 200,
                                'headers': { 'foo': 'headers' },
                                'body': { 'foo': 'data' },
                            })
                            done()
                        })
                })
            })
            describe('When the service has no keys, but is an STT instance', () => {
                it('Forwards the request to the service URL', (done) => {
                    ibmidService.proxy({ method: 'FOO_METHOD', url: '/foo_endpoint', resourceID: 'foo_resource_id_no_keys_speech-to-text', token: 'foo_token', refreshToken: 'foo_refresh_token', accountID: 'foo_account_guid' })
                        .catch(err => done.fail(err))
                        .then(data => {
                            expect(data).toEqual({
                                'statusCode': 200,
                                'headers': { 'foo': 'headers' },
                                'body': { 'foo': 'data' },
                            })
                            done()
                        })
                })
            })
            describe('When service request fails', () => {
                it('Forwards the error response', (done) => {
                    ibmidService.proxy({ method: 'FOO_METHOD', url: '/foo_path_error', resourceID: 'foo_resource_id', token: 'foo_token', refreshToken: 'foo_refresh_token', accountID: 'foo_account_guid' })
                        .catch(err => done.fail(err))
                        .then(data => {
                            expect(data).toEqual({ 'body': { 'foo': 'error' }, 'headers': { 'foo': 'error-headers' }, 'statusCode': 500 })
                            done()
                        })
                })
            })
            describe('When service is not found', () => {
                it('Responds with RC 404', (done) => {
                    ibmidService.proxy({ method: 'FOO_METHOD', url: '/foo_path', resourceID: 'foo_resource_id_missing', token: 'foo_token', refreshToken: 'foo_refresh_token', accountID: 'foo_account_guid' })
                        .catch(err => done.fail(err))
                        .then(data => {
                            expect(data).toEqual({ 'body': { 'message': 'Resource not found' }, 'headers': {}, 'statusCode': 404 })
                            done()
                        })
                })
            })
        })
        describe('For dashboard services', () => {
            it('Does not include authorization headers in request', (done) => {
                ibmidService.proxy({ method: 'FOO_METHOD', url: '/daas/foo_path', resourceID: 'foo_resource_id_dashboards', token: 'foo_token', refreshToken: 'foo_refresh_token', accountID: 'foo_account_guid' })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual({ 'body': { 'foo': 'data' }, 'headers': { 'foo': 'headers' }, 'statusCode': 200 })
                        done()
                    })
            })
        })
        describe('For DSX resources', () => {
            it('Builds URL from resource', (done) => {
                ibmidService.proxy({ method: 'FOO_METHOD', url: '/foo_path', resourceID: 'watson_data', token: 'foo_token', refreshToken: 'foo_refresh_token', accountID: 'foo_account_guid' })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual({ 'body': { 'foo': 'data' }, 'headers': { 'foo': 'headers' }, 'statusCode': 200 })
                        done()
                    })
            })
        })
        describe('For functions services', () => {
            it('Builds URL from resource', (done) => {
                ibmidService.proxy({ method: 'FOO_METHOD', url: '/foo_path', resourceID: 'foo_resource_id_functions', token: 'foo_token', refreshToken: 'foo_refresh_token', accountID: 'foo_account_guid' })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual({ 'body': { 'foo': 'data' }, 'headers': { 'foo': 'headers' }, 'statusCode': 200 })
                        done()
                    })
            })
        })
        describe('For functions web services', () => {
            it('Builds URL from resource', (done) => {
                ibmidService.proxy({ method: 'FOO_METHOD', url: '/web/foo_path', resourceID: 'foo_resource_id_functions', token: 'foo_token', refreshToken: 'foo_refresh_token', accountID: 'foo_account_guid' })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual({ 'body': { 'foo': 'data' }, 'headers': { 'foo': 'headers' }, 'statusCode': 200 })
                        done()
                    })
            })
        })
        describe('For functions system services', () => {
            it('Builds URL from resource', (done) => {
                ibmidService.proxy({ method: 'FOO_METHOD', url: '/foo_path', resourceID: 'crn:v1:bluemix:public:functions:us-south:a/f9aa503dffc94e4cec4f8f104a39ec72:whisk.system::', token: 'foo_token', refreshToken: 'foo_refresh_token', accountID: 'foo_account_guid' })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual({ 'body': { 'foo': 'data' }, 'headers': { 'foo': 'headers' }, 'statusCode': 200 })
                        done()
                    })
            })
        })
        describe('For global services', () => {
            describe('When listing endpoints', () => {
                it('Lists endpoints', (done) => {
                    ibmidService.proxy({ method: 'FOO_METHOD', url: '/endpoints', resourceID: 'foo_resource_id_endpoints', token: 'foo_token', refreshToken: 'foo_refresh_token', accountID: 'foo_account_guid', headers: { 'x-endpoint-id': 'foo:path:to:endpoint' } })
                        .catch(err => done.fail(err))
                        .then(data => {
                            expect(data).toEqual({ 'body': { foo: { path: { to: { endpoint: 'foo_global_resource_url' } } } }, 'headers': {}, 'statusCode': 200 })
                            done()
                        })
                })
            })
            describe('When service endpoint is provided', () => {
                it('Builds URL from endpoints response', (done) => {
                    ibmidService.proxy({ method: 'FOO_METHOD', url: '/foo_path', resourceID: 'foo_resource_id_endpoints', token: 'foo_token', refreshToken: 'foo_refresh_token', accountID: 'foo_account_guid', headers: { 'x-endpoint-id': 'foo:path:to:endpoint' } })
                        .catch(err => done.fail(err))
                        .then(data => {
                            expect(data).toEqual({ 'body': { 'foo': 'data' }, 'headers': { 'foo': 'headers' }, 'statusCode': 200 })
                            done()
                        })
                })
            })
            describe('When no service endpoint is provided', () => {
                it('Returns RC 400', (done) => {
                    ibmidService.proxy({ method: 'FOO_METHOD', url: '/foo_path', resourceID: 'foo_resource_id_endpoints', token: 'foo_token', refreshToken: 'foo_refresh_token', accountID: 'foo_account_guid' })
                        .catch(err => done.fail(err))
                        .then(data => {
                            expect(data).toEqual({ 'body': { 'message': 'Resource not found' }, 'headers': {}, 'statusCode': 404 })
                            done()
                        })
                })
            })
        })
    })
    describe('#listResources', () => {
        describe('When a query for resource type is passed', () => {
            it('Lists resources of that type', (done) => {
                ibmidService.listResources({ token: 'foo_token', refreshToken: 'foo_refresh_token', accountID: 'foo_account_guid', resourceType: 'foo_catalog_name_1' })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual({
                            'statusCode': 200,
                            'headers': {},
                            'body': {
                                next_url: null,
                                rows_count: 4,
                                resources: ['foo_resource_1', 'foo_resource_2', 'foo_resource_3', 'foo_resource_4']
                            },
                        })
                        done()
                    })
            })
        })
        describe('When no catalog entry is found for query', () => {
            it('Returns RC 404', (done) => {
                ibmidService.listResources({ token: 'foo_token', refreshToken: 'foo_refresh_token', accountID: 'foo_account_guid', resourceType: 'foo_catalog_name_4' })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(data).toEqual({
                            'statusCode': 404,
                            'headers': {},
                            'body': {
                                'message': 'Resource not found'
                            },
                        })
                        done()
                    })
            })
        })
        describe('When no query for resource type is passed', () => {
            it('Lists all resources', (done) => {
                ibmidService.listResources({ token: 'foo_token', refreshToken: 'foo_refresh_token', accountID: 'foo_account_guid' })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(mockAxios.mock.calls[1][0].headers.Authorization).toBe('Bearer foo_token')
                        expect(data).toEqual({
                            'statusCode': 200,
                            'headers': {},
                            'body': {
                                next_url: null,
                                rows_count: 4,
                                resources: ['foo_resource_1', 'foo_resource_2', 'foo_resource_3', 'foo_resource_4']
                            },
                        })
                        done()
                    })
            })
        })
        describe('When IBM_APIKEY is passed', () => {
            it('Overrides the token passed onto the API', (done) => {
                ibmidService = new IBMidService({ IBMID_APIKEY: 'foo_apikey' }, mockAxios, iamApi, accountsApi, globalCatalogApi, resourceControllerApi)
                ibmidService.listResources({ token: 'foo_token', refreshToken: 'foo_refresh_token', accountID: 'foo_account_guid' })
                    .catch(err => done.fail(err))
                    .then(data => {
                        expect(mockAxios.mock.calls[1][0].headers.Authorization).toBe('Bearer foo_token_for_apikey_foo_apikey')
                        expect(data).toEqual({
                            'statusCode': 200,
                            'headers': {},
                            'body': {
                                next_url: null,
                                rows_count: 4,
                                resources: ['foo_resource_1', 'foo_resource_2', 'foo_resource_3', 'foo_resource_4']
                            },
                        })
                        done()
                    })
            })
        })
    })
})